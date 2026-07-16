const CACHE_NAME = "macro-tracker-v5";
const APP_SHELL = [
  "./macro-tracker.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if(req.method !== "GET") return;

  const url = new URL(req.url);
  if(url.origin !== self.location.origin){
    return; // let cross-origin requests (fonts, USDA API) hit the network normally
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        event.waitUntil(
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone))
        );
        return res;
      })
      .catch(() => caches.match(req))
  );
});
