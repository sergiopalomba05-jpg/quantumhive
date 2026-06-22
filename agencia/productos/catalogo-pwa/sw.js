// Service worker — catálogo QuantumHive.
// Shell cache-first (instalable/offline); datos de Supabase network-first (siempre frescos).
const CACHE = "qh-catalogo-v1";
const SHELL = ["./", "./index.html", "./config.js", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (u.hostname.endsWith("supabase.co")) {           // datos: network-first
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));  // shell: cache-first
});
