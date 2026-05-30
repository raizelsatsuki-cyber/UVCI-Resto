import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { orderId, amount, phone } = await req.json();
    if (!orderId || !amount) throw new Error('orderId et amount requis');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const WAVE_API_KEY  = Deno.env.get('WAVE_API_KEY')!;
    const APP_URL       = Deno.env.get('APP_URL') ?? 'https://uvci-resto.vercel.app';

    // Créer la session Wave
    const waveRes = await fetch('https://api.wave.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WAVE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currency: 'XOF',
        amount: String(amount),
        client_reference: orderId,
        success_url: `${APP_URL}/#/commande/succes?order=${orderId}`,
        error_url: `${APP_URL}/#/commande/echec?order=${orderId}`,
      }),
    });

    if (!waveRes.ok) {
      const errText = await waveRes.text();
      throw new Error(`Wave API error: ${errText}`);
    }

    const wave = await waveRes.json() as { id: string; wave_launch_url: string };

    // Sauvegarder le checkout_id dans la commande
    await supabaseAdmin
      .from('orders')
      .update({ wave_checkout_id: wave.id, status: 'pending_payment' })
      .eq('id', orderId);

    return new Response(
      JSON.stringify({ checkoutUrl: wave.wave_launch_url, checkoutId: wave.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
