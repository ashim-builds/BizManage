const CACHE_NAME = 'bizmanage-offline-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/logo-transparent.png',
  '/transactions/pos',
  '/inventory',
  '/staff',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  // Bypass ServiceWorker cache for Next.js RSC data requests (_rsc=) and API calls (/api/)
  if (url.searchParams.has('_rsc') || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;

        if (event.request.headers.get('accept')?.includes('text/html')) {
          const fallbackHome = await caches.match('/');
          if (fallbackHome) return fallbackHome;
        }

        return new Response(
          JSON.stringify({ success: false, error: 'OFFLINE', message: 'Network request failed' }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
  );
});
