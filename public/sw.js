const VERSION = 'hmr-v5'
const SHELL_CACHE = `${VERSION}-shell`
const RUNTIME_CACHE = `${VERSION}-runtime`
const APP_ASSETS = [] /* __APP_ASSETS__ */
const SHELL = ['/', '/index.html', '/offline.html', '/offline.css', '/privacy/', '/terms/', '/legal.css', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/assets/blueprint-desk.webp', '/assets/blueprint-desk.jpg', ...APP_ASSETS]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => ![SHELL_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key)))),
    caches.open(RUNTIME_CACHE).then(async (cache) => {
      const requests = await cache.keys()
      await Promise.all(requests.filter((request) => new URL(request.url).searchParams.has('license')).map((request) => cache.delete(request)))
    }),
    self.clients.claim(),
  ]))
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then((response) => {
      // License callbacks are intentionally captured into local storage and
      // removed from the address bar. Never retain their token in CacheStorage.
      if (!url.searchParams.has('license')) {
        const copy = response.clone()
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, copy))
      }
      return response
    }).catch(async () => (await caches.match(event.request, { ignoreVary: true })) || (await caches.match('/index.html')) || (await caches.match('/offline.html'))))
    return
  }

  event.respondWith(caches.match(event.request, { ignoreVary: true }).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok) caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, response.clone()))
    return response
  })))
})
