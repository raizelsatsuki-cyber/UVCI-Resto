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

/**
 * navigator.serviceWorker.ready ne se résout que si un SW est actif.
 * Avec l'enregistrement au démarrage (index.tsx) c'est normalement rapide,
 * mais on garde un timeout de secours pour ne jamais bloquer l'UI
 * (ex: bouton "Activer les notifications" qui resterait en chargement infini).
 */
async function getReadyRegistration(timeoutMs = 5000): Promise<ServiceWorkerRegistration> {
  const reg = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Service Worker non disponible (timeout)')), timeoutMs)
    ),
  ]);
  return reg;
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

export function getPushPermission(): NotificationPermission {
  return Notification.permission;
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) return false;
  if (!VAPID_PUBLIC_KEY) {
    console.warn('VITE_VAPID_PUBLIC_KEY non définie — notifications push désactivées');
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const reg      = await getReadyRegistration();
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
  const reg = await getReadyRegistration();
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await (supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint) as any);
    await sub.unsubscribe();
  }
}

/**
 * FIX : navigator.serviceWorker.ready ne se résout JAMAIS si aucun SW
 * n'est actif — il fallait l'enregistrer dans index.tsx (fait), mais
 * en plus on sécurise ici avec getRegistration() (résout immédiatement
 * avec undefined si aucun SW, contrairement à .ready) + un timeout
 * de secours pour ne JAMAIS bloquer l'appelant (Promise.all dans
 * ProfilePage attend ce résultat).
 */
export async function isSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await Promise.race([
      navigator.serviceWorker.getRegistration(),
      new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 1000)),
    ]);
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch (err) {
    console.warn('isSubscribed error:', err);
    return false;
  }
}
