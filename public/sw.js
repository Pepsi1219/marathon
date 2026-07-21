const CACHE_NAME = "pace-planner-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icon.svg"];
// Next.js content-hashes its static asset filenames per build, so every deploy adds new,
// never-again-requested URLs to the runtime cache. Nothing else ever removes those orphaned
// entries (the cache is only fully cleared when CACHE_NAME itself changes), so without a cap
// the cache grows without bound across deploys. Trim oldest entries past this count instead.
const MAX_RUNTIME_ENTRIES = 80;

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const excess = keys.length - maxEntries;
  if (excess <= 0) return;
  await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Network-first for navigations (so the plan stays fresh online), falling back to the
// cached shell when offline mid-race. Cache-first for static assets.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, clone))
            .then(() => trimCache(CACHE_NAME, MAX_RUNTIME_ENTRIES));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/"))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME)
          .then((cache) => cache.put(request, clone))
          .then(() => trimCache(CACHE_NAME, MAX_RUNTIME_ENTRIES));
        return response;
      });
    }),
  );
});
