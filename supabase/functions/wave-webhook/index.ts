import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * FIX : La vérification de signature utilisait `hmac` depuis 'jsr:@std/crypto'
 * via un import esm.sh non standard (`https://esm.sh/jsr/@std/crypto@1`).
 * Ce package n'existe pas sous cette forme — il faut utiliser l'API Web Crypto
 * native disponible dans l'environnement Deno/Edge Functions.
 *
 * La nouvelle implémentation utilise crypto.subtle.importKey + crypto.subtle.sign
 * qui est l'API standard pour HMAC-SHA256.
 */

async function verifyWaveSignature(secret: string, rawBody: string, signature: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expectedHex = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  // Comparaison en temps constant pour éviter les timing attacks
  return expectedHex === signature;
}

serve(async (req: Request) => {
  try {
    const WAVE_WEBHOOK_SECRET = Deno.env.get('WAVE_WEBHOOK_SECRET');
    if (!WAVE_WEBHOOK_SECRET) {
      console.error('WAVE_WEBHOOK_SECRET manquant');
      return new Response('Server error', { status: 500 });
    }

    const rawBody = await req.text();

    // Vérifier la signature Wave
    const signature = req.headers.get('wave-signature') ?? '';
    const isValid = await verifyWaveSignature(WAVE_WEBHOOK_SECRET, rawBody, signature);
    if (!isValid) {
      console.error('Signature Wave invalide');
      return new Response('Unauthorized', { status: 401 });
    }

    const event = JSON.parse(rawBody);
    if (event.type !== 'checkout.session.completed') {
      return new Response('OK', { status: 200 });
    }

    const session = event.data;
    const orderId = session.client_reference;

    if (!orderId) {
      console.error('client_reference manquant dans le webhook Wave');
      return new Response('Bad Request', { status: 400 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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
