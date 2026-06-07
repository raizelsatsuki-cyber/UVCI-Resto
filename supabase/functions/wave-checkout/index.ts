import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const WAVE_API_KEY              = Deno.env.get('WAVE_API_KEY') ?? '';
  const APP_URL                   = Deno.env.get('APP_URL') ?? 'https://uvci-resto.vercel.app';

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // ── Bug 3 fix : Authentifier l'utilisateur via JWT ──────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return new Response(JSON.stringify({ error: 'Token manquant' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Lire le body ────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const { orderId, amount, phone } = body as { orderId?: string; amount?: number; phone?: string };

    if (!orderId || !amount) {
      return new Response(JSON.stringify({ error: 'orderId et amount requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Vérifier que la commande appartient à l'utilisateur ─────────────────
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, total_price, user_id, payment_status, wave_checkout_id, wave_client_ref')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: 'Commande introuvable' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Vérification propriété
    if ((order as any).user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Accès refusé' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Anti double-paiement
    if ((order as any).payment_status === 'paid') {
      return new Response(JSON.stringify({ error: 'Commande déjà payée' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Référence client unique (idempotente : réutiliser si elle existe déjà)
    const clientRef: string = (order as any).wave_client_ref ?? crypto.randomUUID();

    // ── Mode simulation (pas de clé Wave configurée) ─────────────────────────
    if (!WAVE_API_KEY) {
      const simulatedId = `sim_${crypto.randomUUID()}`;
      const waveUrl = `https://pay.wave.com/m/M_ci_Io7SNCTiP_hn/c/ci/?amount=${Math.round(amount)}&client_reference=${clientRef}`;

      await supabaseAdmin.from('orders').update({
        status:           'pending_payment',
        payment_status:   'pending',
        wave_checkout_id: simulatedId,
        wave_client_ref:  clientRef,
      }).eq('id', orderId);

      return new Response(JSON.stringify({
        checkoutUrl: waveUrl,
        checkoutId:  simulatedId,
        mode:        'simulation',
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Appel API Wave ────────────────────────────────────────────────────────
    const waveRes = await fetch('https://api.wave.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization':  `Bearer ${WAVE_API_KEY}`,
        'Content-Type':   'application/json',
        'Idempotency-Key': clientRef,
      },
      body: JSON.stringify({
        currency:         'XOF',
        amount:           String(Math.round(amount)),
        client_reference: clientRef,
        success_url:      `${APP_URL}/#/payment/success?ref=${clientRef}`,
        error_url:        `${APP_URL}/#/payment/failed?ref=${clientRef}`,
      }),
    });

    if (!waveRes.ok) {
      const errText = await waveRes.text();
      throw new Error(`Wave API ${waveRes.status}: ${errText}`);
    }

    const wave = await waveRes.json() as { id: string; wave_launch_url: string };

    // Persister l'ID checkout Wave + payment_status pending
    await supabaseAdmin.from('orders').update({
      status:           'pending_payment',
      payment_status:   'pending',
      wave_checkout_id: wave.id,
      wave_client_ref:  clientRef,
    }).eq('id', orderId);

    return new Response(JSON.stringify({
      checkoutUrl: wave.wave_launch_url,
      checkoutId:  wave.id,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('wave-checkout error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
