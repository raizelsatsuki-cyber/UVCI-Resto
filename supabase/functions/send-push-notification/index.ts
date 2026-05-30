import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { userId, title, body, url } = await req.json();
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: subs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no subscriptions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const VAPID_EMAIL       = Deno.env.get('VAPID_EMAIL') ?? 'mailto:admin@uvci.edu.ci';

    const payload = JSON.stringify({ title, body, url: url ?? '/' });
    const results = [];

    for (const sub of subs) {
      try {
        // Utiliser l'API web-push via fetch (bibliothèque Deno-native)
        const pushRes = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'TTL': '86400',
            'Authorization': `vapid t=${await generateVapidToken(sub.endpoint, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL)},k=${VAPID_PUBLIC_KEY}`,
          },
          body: payload,
        });
        results.push({ endpoint: sub.endpoint.slice(-20), status: pushRes.status });
        if (pushRes.status === 410) {
          // Subscription expirée — la supprimer
          await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      } catch (e: any) {
        results.push({ endpoint: sub.endpoint.slice(-20), error: e.message });
      }
    }

    return new Response(JSON.stringify({ sent: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateVapidToken(
  endpoint: string, publicKey: string, privateKey: string, email: string
): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).replace(/=/g, '');
  const payload = btoa(JSON.stringify({ aud: audience, exp: now + 86400, sub: email })).replace(/=/g, '');
  return `${header}.${payload}`;
}
