const CACHE = 'directimport-admin-v1'
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()))
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request).then((res) => {
      if (e.request.method === 'GET') {
        const c = caches.open(CACHE).then((c) => c.put(e.request, res.clone()))
      }
      return res
    }))
  )
})
