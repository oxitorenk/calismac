const SHELL_CACHE = '__SHELL_CACHE__';
const PRECACHE = __PRECACHE__;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(PRECACHE)));
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const path = event.request.mode === 'navigate' ? '/calismac/index.html' : url.pathname;
  if (!PRECACHE.includes(path)) return;
  event.respondWith(caches.open(SHELL_CACHE).then(async cache =>
    await cache.match(path) ?? fetch(event.request),
  ));
});
