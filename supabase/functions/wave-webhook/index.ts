import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { hmac } from 'https://esm.sh/jsr/@std/crypto@1';

serve(async (req: Request) => {
  try {
    const WAVE_WEBHOOK_SECRET = Deno.env.get('WAVE_WEBHOOK_SECRET')!;
    const rawBody = await req.text();

    // Vérifier la signature Wave
    const signature = req.headers.get('wave-signature') ?? '';
    const expectedSig = await hmac('SHA-256', WAVE_WEBHOOK_SECRET, rawBody);
    if (signature !== expectedSig) {
      console.error('Signature Wave invalide');
      return new Response('Unauthorized', { status: 401 });
    }

    const event = JSON.parse(rawBody);
    if (event.type !== 'checkout.session.completed') {
      return new Response('OK', { status: 200 });
    }

    const session = event.data;
    const orderId = session.client_reference;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Mettre à jour la commande (service_role → autorisé)
    const { error } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'paid',
        wave_transaction_id: session.transaction_id,
        paid_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('wave_checkout_id', session.id);

    if (error) throw new Error(error.message);

    console.log('Commande payée:', orderId);
    return new Response('OK', { status: 200 });
  } catch (err: any) {
    console.error('Webhook error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
