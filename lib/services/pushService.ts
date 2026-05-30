import { supabase } from '../supabaseClient';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

/** Vérifie si les notifications push sont supportées */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/** Vérifie si la permission est déjà accordée */
export function getPushPermission(): NotificationPermission {
  return Notification.permission;
}

/** Demande la permission et s'abonne aux push */
export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) throw new Error('Push non supporté sur ce navigateur');
  if (!VAPID_PUBLIC_KEY) throw new Error('Clé VAPID manquante (VITE_VAPID_PUBLIC_KEY)');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) await existing.unsubscribe();

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  const subJson = sub.toJSON() as any;
  const { error } = await (supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: sub.endpoint,
    p256dh: subJson.keys?.p256dh ?? '',
    auth_key: subJson.keys?.auth ?? '',
  }, { onConflict: 'endpoint' }) as any);

  if (error) throw new Error(error.message);
  return true;
}

/** Désabonne l'utilisateur */
export async function unsubscribeFromPush(userId: string): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await (supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint) as any);
    await sub.unsubscribe();
  }
}

/** Vérifie si l'utilisateur est abonné */
export async function isSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}
