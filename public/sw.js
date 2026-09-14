const CACHE_NAME = "spt-v3";
const STATIC_ASSETS = [
  "/",
  "/torneos",
  "/rankings",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache assets individually to prevent a single failure from blocking install
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch {
          // Ignore individual fetch/SSO errors during installation
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Bypass cross-origin, Vercel SSO, API routes, Admin panel, and Next.js internal bundles
  if (url.origin !== self.location.origin) return;
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/_vercel/")
  ) {
    return;
  }

  // Network-first strategy with cache fallback (no synthetic 503 responses)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200 && response.type === "basic") {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned)).catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // Do not return 503 synthetic response; rethrow or fail naturally
        throw new Error("Network unavailable and resource not in cache");
      })
  );
});

