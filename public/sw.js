/*
 * Minimal offline shell for BackGuard.
 *
 * Precaches nothing on install. Instead it uses a runtime cache:
 *  - navigations fall back to the cached shell when offline
 *  - static assets are cached as they are requested, since Vite hashes filenames
 *
 * Deliberately NOT caching:
 *  - /model/* — the pose model is ~3 MB and only needed during a session. It is
 *    fetched on demand and left to the browser's own HTTP cache.
 *  - Anything not same-origin, so there is no cross-origin surface here at all.
 */

const CACHE = 'backguard-v1';
const BASE = self.registration.scope;

self.addEventListener('install', () => {
  // Take over as soon as the new worker activates.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith(`${BASE}model/`)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cached = await caches.match(`${BASE}index.html`);
          return cached ?? Response.error();
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') {
          const cache = await caches.open(CACHE);
          void cache.put(request, response.clone());
        }
        return response;
      } catch {
        return cached ?? Response.error();
      }
    })(),
  );
});