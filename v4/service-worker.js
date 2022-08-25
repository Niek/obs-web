// Incrementing VERSION will kick off the install event and force
// previously cached resources to be updated from the network.
const VERSION = 2;
const CACHE_NAME = 'offline';

// Customize this with a different URL if needed.
const cacheFiles = [
  '/',
  'service-worker.js',
  '/icon/icon-192x192.png',
  '/icon/icon-256x256.png',
  '/icon/icon-384x384.png',
  '/icon/icon-512x512.png',
];


self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Setting {cache: 'reload'} in the new request will ensure that the
      // response isn't fulfilled from the HTTP cache; i.e., it will be from
      // the network.
      // await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));

      await cache.addAll(cacheFiles);
    })()
  );
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Enable navigation preload if it's supported.
      // See https://developers.google.com/web/updates/2017/02/navigation-preload
      if ('navigationPreload' in self.registration) {
        await self.registration.navigationPreload.enable();
      }
    })()
  );

  // Tell the active service worker to take control of the page immediately.
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // We only want to call event.respondWith() if this is a navigation request
  // for an HTML page.
  event.respondWith(
    (async () => {
      // Respond from the cache if we can
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(event.request);

      if (cachedResponse) {
        return cachedResponse;
      }

      // Else, use the preloaded response, if it's there
      const response = await event.preloadResponse;

      if (response) {
        return response;
      }

      // Else try the network.
      return fetch(event.request).then((response) => {
        cache.put(event.request, response.clone());
        return response;
      });
    })()
  );
});
