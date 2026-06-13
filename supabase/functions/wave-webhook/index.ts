import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Vérification HMAC-SHA256 (Bug 4 fix) ────────────────────────────────────
// Ancienne implémentation : utilisait crypto.subtle.sign() pour RE-signer
// puis comparait les deux hex en temps linéaire (timing attack).
// Nouvelle : crypto.subtle.verify() en temps constant + support préfixe "sha256="
async function verifyWaveSignature(
  secret: string,
  rawBody: string,
  signature: string,
): Promise<boolean> {
  try {
    // Wave peut envoyer "sha256=<hex>" ou directement "<hex>"
    const sigHex = signature.replace(/^sha256=/, '').trim();
    if (!sigHex) return false;

    // Convertir le hex en Uint8Array
    if (sigHex.length % 2 !== 0) return false;
    const sigBytes = new Uint8Array(
      sigHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)),
    );

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],   // ← verify, pas sign
    );

    // crypto.subtle.verify() est en temps constant — pas de timing attack
    return await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(rawBody),
    );
  } catch (e) {
    console.error('verifyWaveSignature error:', e);
    return false;
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  // Wave n'envoie que des POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const WAVE_WEBHOOK_SECRET = Deno.env.get('WAVE_WEBHOOK_SECRET');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    const rawBody = await req.text();

    // ── 1. Vérification signature (seulement si secret configuré) ──
    if (WAVE_WEBHOOK_SECRET) {
      const signature = req.headers.get('wave-signature')
        ?? req.headers.get('x-wave-signature')
        ?? '';

      const isValid = await verifyWaveSignature(
        WAVE_WEBHOOK_SECRET,
        rawBody,
        signature,
      );

      if (!isValid) {
        console.error('Signature Wave invalide — rejetée');
        return new Response('Unauthorized', { status: 401 });
      }
    } else {
      console.warn('WAVE_WEBHOOK_SECRET non configuré — vérification désactivée');
    }

    const event = JSON.parse(rawBody);
    console.log('Wave webhook type:', event.type);

    // ── 2. Seul l'événement de complétion nous intéresse ──
    const isSuccess =
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.completed'         ||
      event.type === 'payment.succeeded';

    const isFailure =
      event.type === 'payment.failed'    ||
      event.type === 'checkout.expired';

    const isCancelled =
      event.type === 'payment.cancelled' ||
      event.type === 'checkout.cancelled';

    if (!isSuccess && !isFailure && !isCancelled) {
      console.log('Événement ignoré:', event.type);
      return new Response('OK', { status: 200 });
    }

    const session = event.data ?? event;
    // Wave peut utiliser client_reference ou client_ref selon la version API
    const orderId = session.client_reference ?? session.client_ref ?? null;

    if (!orderId) {
      console.error('client_reference manquant dans le webhook Wave');
      return new Response('Bad Request', { status: 400 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── 3. Anti double-validation ──
    const { data: existing } = await supabaseAdmin
      .from('orders')
      .select('id, payment_status, wave_checkout_id')
      .eq('id', orderId)
      .single();

    if (!existing) {
      console.error('Commande introuvable:', orderId);
      return new Response('OK', { status: 200 }); // 200 pour éviter les retries Wave
    }

    if ((existing as any).payment_status === 'paid') {
      console.log('Commande déjà payée, doublon ignoré:', orderId);
      return new Response('OK', { status: 200 });
    }

    // ── 4. Vérification optionnelle du checkout_id (anti-fraude) ──
    const incomingCheckoutId = session.id ?? session.checkout_id ?? null;
    if (
      incomingCheckoutId &&
      (existing as any).wave_checkout_id &&
      incomingCheckoutId !== (existing as any).wave_checkout_id
    ) {
      console.error(
        `Checkout ID mismatch pour ${orderId}: attendu ${(existing as any).wave_checkout_id}, reçu ${incomingCheckoutId}`,
      );
      return new Response('Bad Request', { status: 400 });
    }

    // ── 5. Mise à jour selon le résultat ──
    let updatePayload: Record<string, unknown>;

    if (isSuccess) {
      updatePayload = {
        status:               'paid',
        payment_status:       'paid',
        wave_transaction_id:  session.transaction_id ?? session.payment_id ?? null,
        paid_at:              session.when_completed ?? new Date().toISOString(),
      };
    } else if (isFailure) {
      // 'payment_failed' n'existe pas dans orders_status_check (CHECK constraint) :
      // valeurs autorisées = pending_payment|pending|paid|preparing|ready|completed|delivered|cancelled
      // On garde status='pending_payment' (commande retentable) et on marque
      // payment_status='failed' — /payment/page.tsx ne lit que payment_status.
      updatePayload = {
        status:         'pending_payment',
        payment_status: 'failed',
      };
    } else {
      // cancelled
      updatePayload = {
        status:         'cancelled',
        payment_status: 'cancelled',
      };
    }

    const { error } = await supabaseAdmin
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId);

    if (error) throw new Error(`Supabase update error: ${error.message}`);

    console.log(`Commande ${orderId} mise à jour:`, updatePayload.payment_status);
    return new Response('OK', { status: 200 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Webhook error:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});
