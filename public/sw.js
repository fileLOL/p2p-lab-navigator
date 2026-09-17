// Service worker mínimo de P2P Lab.
// No cachea datos de usuario ni respuestas de la API: solo el shell estático.
const CACHE = "p2plab-shell-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  // Nunca interceptar autenticación, API ni server functions.
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/_serverFn") || url.pathname.startsWith("/~oauth")) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      return cached ?? caches.match("/");
    }),
  );
});
