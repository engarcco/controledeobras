const CACHE_NAME = "arcco-hub-v2";
// Lista de arquivos para funcionar offline
const ASSETS = [
  "/",
  "/index.html",
  "https://cdn.tailwindcss.com",
  // Adicione aqui outros links de CSS/JS externos que seu app usa
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// Estratégia: Tenta a rede, se falhar, usa o Cache
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
