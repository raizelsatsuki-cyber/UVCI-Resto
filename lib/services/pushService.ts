import { supabase } from '../supabaseClient';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const arr     = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer as ArrayBuffer; // FIX: retourne ArrayBuffer, pas ArrayBufferLike
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

export function getPushPermission(): NotificationPermission {
  return Notification.permission;
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) throw new Error('Push non supporté sur ce navigateur');
  if (!VAPID_PUBLIC_KEY)  throw new Error('Clé VAPID manquante (VITE_VAPID_PUBLIC_KEY)');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const reg      = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) await existing.unsubscribe();

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY), // FIX: ArrayBuffer OK
  });

  const subJson = sub.toJSON() as any;
  const { error } = await (supabase.from('push_subscriptions').upsert({
    user_id:  userId,
    endpoint: sub.endpoint,
    p256dh:   subJson.keys?.p256dh ?? '',
    auth_key: subJson.keys?.auth   ?? '',
  }, { onConflict: 'endpoint' }) as any); // FIX: as any pour l'upsert

  if (error) throw new Error((error as any).message);
  return true;
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await (supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint) as any);
    await sub.unsubscribe();
  }
}

export async function isSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}
