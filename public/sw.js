/*
 * Minimal service worker for Hisab.
 * - Static assets (/_next/static, icons): cache-first (they are content-hashed).
 * - Pages: always go to the network (money data must be fresh); if offline,
 *   show the last cached copy of that page, or a tiny offline notice.
 */
const CACHE = "hisab-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then(
            (hit) =>
              hit ||
              new Response(
                '<meta name="viewport" content="width=device-width"><body style="font-family:sans-serif;background:#f2eee5;color:#2e2b25;padding:2rem">Offline · ইন্টারনেট সংযোগ নেই</body>',
                { headers: { "Content-Type": "text/html; charset=utf-8" } },
              ),
          ),
        ),
    );
  }
});
