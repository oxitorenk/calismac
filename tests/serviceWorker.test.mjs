import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

async function worker() {
  const handlers = {};
  const entries = new Map();
  const cache = {
    addAll: async paths => { for (const path of paths) entries.set(path, new Response(path)); },
    match: async path => entries.get(path)?.clone(),
  };
  const caches = { open: async () => cache };
  const self = { location: { origin: 'https://example.com' }, addEventListener: (name, callback) => { handlers[name] = callback; } };
  const source = (await readFile(new URL('../src/pwa/service-worker.js', import.meta.url), 'utf8'))
    .replace('__SHELL_CACHE__', 'calismac-shell-test')
    .replace('__PRECACHE__', JSON.stringify(['/calismac/index.html', '/calismac/assets/app.js']));
  runInNewContext(source, { self, caches, URL, fetch: async () => { throw new Error('offline'); } });
  let installing;
  handlers.install({ waitUntil: promise => { installing = promise; } });
  await installing;
  return { handlers, entries, caches, self };
}

test('service worker serves cached shell offline without intercepting content or external images', async () => {
  const { handlers } = await worker();
  for (const [path, mode] of [['/calismac/', 'navigate'], ['/calismac/assets/app.js', 'cors']]) {
    let response;
    handlers.fetch({ request: { url: `https://example.com${path}`, method: 'GET', mode }, respondWith: promise => { response = promise; } });
    assert.equal((await response).status, 200);
  }
  for (const url of ['https://docs.google.com/pub?output=csv', 'https://res.cloudinary.com/image.png', 'https://example.com/unrelated']) {
    let intercepted = false;
    handlers.fetch({ request: { url, method: 'GET', mode: 'cors' }, respondWith: () => { intercepted = true; } });
    assert.equal(intercepted, false);
  }
});
