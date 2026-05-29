import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();

    // Le webhook Supabase envoie { type, table, record, old_record }
    const record    = body.record;
    const oldRecord = body.old_record;

    // Ne déclencher que quand le statut passe à 'ready'
    if (!record || record.status !== 'ready' || oldRecord?.status === 'ready') {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Client admin pour lire auth.users
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Récupérer l'email du client via user_id
    let clientEmail: string | null = null;
    if (record.user_id) {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(record.user_id);
      clientEmail = user?.email ?? null;
    }

    if (!clientEmail) {
      console.log('Pas d\'email trouvé pour la commande', record.id);
      return new Response(JSON.stringify({ skipped: true, reason: 'no email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Récupérer les détails de la commande
    const { data: orderItems } = await supabaseAdmin
      .from('order_items')
      .select('quantity, price_at_order, menu_items(name)')
      .eq('order_id', record.id);

    const itemsList = (orderItems ?? [])
      .map((i: any) => `• ${i.quantity}× ${i.menu_items?.name ?? 'Plat'} — ${(i.price_at_order * i.quantity).toLocaleString('fr-FR')} FCFA`)
      .join('\n');

    const orderId   = record.id.slice(0, 8).toUpperCase();
    const totalFmt  = (record.total_price ?? 0).toLocaleString('fr-FR');
    const payment   = record.payment_method === 'wave' ? 'Wave Mobile Money' : 'Espèces';

    // Envoi via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY manquant dans les secrets Supabase');

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Resto UVCI <noreply@uvci.edu.ci>',
        to:   [clientEmail],
        subject: `🍽️ Votre commande #${orderId} est prête !`,
        html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #7C3AED, #16a34a); padding: 32px 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 900;">🍽️ Resto UVCI</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Votre repas vous attend !</p>
    </div>

    <!-- Notification principale -->
    <div style="padding: 32px 24px; text-align: center; border-bottom: 1px solid #f0f0f0;">
      <div style="width: 70px; height: 70px; background: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 36px;">✅</div>
      <h2 style="color: #1f2937; font-size: 22px; font-weight: 800; margin: 0 0 8px;">Commande prête !</h2>
      <p style="color: #6b7280; margin: 0; font-size: 15px; line-height: 1.5;">
        Votre commande <strong style="color: #7C3AED;">#${orderId}</strong> est prête.<br>
        Rendez-vous au comptoir pour récupérer votre repas.
      </p>
    </div>

    <!-- Détails commande -->
    <div style="padding: 24px;">
      <h3 style="color: #374151; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px;">Récapitulatif</h3>
      <div style="background: #f9fafb; border-radius: 12px; padding: 16px; font-size: 14px; color: #374151; line-height: 2;">
        ${(orderItems ?? []).map((i: any) =>
          `<div style="display: flex; justify-content: space-between;">
            <span>${i.quantity}× ${i.menu_items?.name ?? 'Plat'}</span>
            <span style="font-weight: 600;">${(i.price_at_order * i.quantity).toLocaleString('fr-FR')} F</span>
          </div>`
        ).join('')}
        <div style="border-top: 1px solid #e5e7eb; margin-top: 10px; padding-top: 10px; display: flex; justify-content: space-between; font-weight: 800; color: #7C3AED; font-size: 16px;">
          <span>Total</span>
          <span>${totalFmt} FCFA</span>
        </div>
        <div style="margin-top: 8px; font-size: 12px; color: #9ca3af;">
          Paiement : ${payment}
        </div>
      </div>
    </div>

    <!-- Alerte retrait -->
    <div style="margin: 0 24px 24px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px 16px; font-size: 13px; color: #92400e;">
      ⚠️ <strong>Venez récupérer votre commande rapidement</strong> — les plats chauds ne peuvent pas être conservés plus de 20 minutes.
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 20px 24px; text-align: center; border-top: 1px solid #f0f0f0;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        Resto UVCI • Campus de l'UVCI<br>
        Ce mail est automatique, ne pas répondre.
      </p>
    </div>
  </div>
</body>
</html>`,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      throw new Error(`Resend error: ${err}`);
    }

    const result = await emailRes.json();
    console.log('Email envoyé:', result.id, '→', clientEmail);

    return new Response(
      JSON.stringify({ success: true, emailId: result.id, to: clientEmail }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('Edge Function error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
