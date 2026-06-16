// UVCI Resto — Service Worker
// Version incrémentée à chaque déploiement pour invalider le cache stale
const CACHE_VERSION = 'uvci-resto-v3';
const STATIC_ASSETS = ['/logo.png', '/favicon.ico', '/manifest.json'];
// ⚠️  NE PAS mettre index.html en cache : il référence les chunks JS par hash.
// Si le SW sert un ancien index.html, le navigateur charge un bundle inexistant
// → ReferenceError silencieux → page blanche.
// index.html doit TOUJOURS être fetché depuis le réseau.

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(STATIC_ASSETS))
  );
  // Prendre le contrôle immédiatement sans attendre la fermeture des onglets
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Toujours réseau pour :
  // - Supabase (API + Auth)
  // - index.html (racine / ou /index.html) pour ne pas servir un ancien bundle
  // - les chunks JS/CSS hashés (déjà mis en cache par le navigateur via Cache-Control)
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    url.pathname.startsWith('/assets/')
  ) {
    return; // laisser le navigateur gérer
  }

  // Cache-first pour les assets statiques (logo, favicon, manifest)
  e.respondWith(
    caches.match(e.request).then(cached => cached ?? fetch(e.request))
  );
});

// ── Notifications push ────────────────────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return;
  let data = {};
  try { data = e.data.json(); } catch { data = { title: 'Resto UVCI', body: e.data.text() }; }
  const { title = 'Resto UVCI', body = '', url = '/' } = data;
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/logo.png',
      badge: '/logo.png',
      data: { url },
      vibrate: [200, 100, 200],
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const targetUrl = e.notification.data?.url ?? '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      const existing = wins.find(w => w.url.includes(self.location.origin));
      if (existing) { existing.focus(); existing.navigate(targetUrl); }
      else clients.openWindow(targetUrl);
    })
  );
});
