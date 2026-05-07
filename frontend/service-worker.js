/**
 * TransitBDG — service-worker.js
 * PWA Service Worker: cache-first strategy untuk aset statis,
 * fallback ke /offline.html saat offline dan tidak ada cache.
 * Requirements: 16.2, 16.3, 16.4
 */

const CACHE_NAME = 'transitbdg-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/routes.html',
  '/route-detail.html',
  '/report.html',
  '/track.html',
  '/feed.html',
  '/offline.html',
  '/css/app.css',
  '/js/api.js',
  '/js/app.js',
  '/js/routes.js',
  '/js/route-detail.js',
  '/js/report.js',
  '/js/track.js',
  '/js/feed.js',
  '/manifest.json',
];

/* ── Install: cache semua aset statis ─────────────────────── */

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: bersihkan cache lama ──────────────────────── */

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ── Fetch: cache-first, fallback ke /offline.html ───────── */

self.addEventListener('fetch', (event) => {
  // Hanya tangani request GET
  if (event.request.method !== 'GET') return;

  // Jangan intercept request ke API backend
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Cache hit — kembalikan dari cache
      if (cachedResponse) {
        return cachedResponse;
      }

      // Cache miss — fetch dari network
      return fetch(event.request)
        .then((networkResponse) => {
          // Simpan respons ke cache untuk request berikutnya
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline dan tidak ada cache — tampilkan halaman offline
          return caches.match('/offline.html');
        });
    })
  );
});
