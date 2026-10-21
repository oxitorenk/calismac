const SHELL_CACHE = '__SHELL_CACHE__';
const PRECACHE = __PRECACHE__;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(PRECACHE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('calismac-shell-') && key !== SHELL_CACHE).map(key => caches.delete(key)),
  )));
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const path = event.request.mode === 'navigate' ? '/calismac/index.html' : url.pathname;
  if (!PRECACHE.includes(path)) return;
  event.respondWith(caches.open(SHELL_CACHE).then(async cache => {
    if (event.request.mode === 'navigate') {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      try {
        const response = await fetch(event.request, { signal: controller.signal });
        if (response.ok) return response;
      } catch {
        // Offline launches use the complete, previously installed shell.
      } finally {
        clearTimeout(timeout);
      }
      return await cache.match(path) ?? Response.error();
    }
    return await cache.match(path) ?? fetch(event.request);
  }));
});
