const CACHE = 'ledger-cache-v1.11.1';
const ICON_ASSETS = [
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ICON_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Only handle same-origin GET requests; let Firebase/Google/Drive requests pass straight through untouched.
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  const isIcon = ICON_ASSETS.some((a) => url.pathname.endsWith(a.replace('./', '/')));

  if (isIcon) {
    // Icons rarely change — cache-first is fine and keeps things fast.
    e.respondWith(
      caches.match(e.request).then((cached) => cached || fetch(e.request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return res;
      }))
    );
    return;
  }

  // App shell (index.html, manifest.json, etc.) — network-first, so you always get
  // the latest version when online. Falls back to the last-seen copy only if offline.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
