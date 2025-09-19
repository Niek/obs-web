/* eslint-env serviceworker */
const CACHE_NAME = 'offline'

// Customize this with a different URL if needed.
const cacheFiles = ['/']

const shouldHandle = (request) => {
  if (request.method !== 'GET') return false

  if (request.mode === 'navigate') return true

  const cacheableDestinations = ['style', 'script']
  return cacheableDestinations.includes(request.destination)
}

const networkFirst = async (event) => {
  const { request } = event
  const cache = await caches.open(CACHE_NAME)

  const preloadResponse = await event.preloadResponse
  if (preloadResponse) {
    cache.put(request, preloadResponse.clone())
    return preloadResponse
  }

  try {
    const networkResponse = await fetch(request)
    cache.put(request, networkResponse.clone())
    return networkResponse
  } catch (error) {
    const cachedResponse = await cache.match(request)
    if (cachedResponse) return cachedResponse

    if (request.mode === 'navigate') {
      const fallback = await cache.match('/')
      if (fallback) return fallback
    }

    throw error
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      // Setting {cache: 'reload'} in the new request will ensure that the
      // response isn't fulfilled from the HTTP cache; i.e., it will be from
      // the network.
      // await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));

      await cache.addAll(cacheFiles)
    })()
  )
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Enable navigation preload if it's supported.
      // See https://developers.google.com/web/updates/2017/02/navigation-preload
      if ('navigationPreload' in self.registration) {
        await self.registration.navigationPreload.enable()
      }
    })()
  )

  // Tell the active service worker to take control of the page immediately.
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (!shouldHandle(event.request)) return

  event.respondWith(networkFirst(event))
})
