import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

async function worker(network = async () => { throw new Error('offline'); }) {
  const handlers = {};
  const entries = new Map();
  const cache = {
    addAll: async paths => { for (const path of paths) entries.set(path, new Response(path)); },
    match: async path => entries.get(path)?.clone(),
  };
  const names = new Set(['calismac-shell-old', 'calismac-shell-test', 'calismac-content-v1', 'other-app']);
  const caches = { open: async () => cache, keys: async () => [...names], delete: async name => names.delete(name) };
  const self = { location: { origin: 'https://example.com' }, skipWaiting: async () => {}, addEventListener: (name, callback) => { handlers[name] = callback; } };
  const source = (await readFile(new URL('../src/pwa/service-worker.js', import.meta.url), 'utf8'))
    .replace('__SHELL_CACHE__', 'calismac-shell-test')
    .replace('__PRECACHE__', JSON.stringify(['/calismac/index.html', '/calismac/assets/app.js']));
  runInNewContext(source, { self, caches, URL, Response, AbortController, setTimeout, clearTimeout, fetch: network });
  let installing;
  handlers.install({ waitUntil: promise => { installing = promise; } });
  await installing;
  return { handlers, entries, caches, self, names };
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

test('stalled navigation aborts and serves the installed shell', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let signal;
  const { handlers } = await worker((_request, options) => new Promise((_resolve, reject) => {
    signal = options.signal;
    signal.addEventListener('abort', () => reject(new Error('timeout')));
  }));
  let response;
  handlers.fetch({ request: { url: 'https://example.com/calismac/', method: 'GET', mode: 'navigate' }, respondWith: promise => { response = promise; } });
  await Promise.resolve();
  t.mock.timers.tick(3000);
  assert.equal(await (await response).text(), '/calismac/index.html');
  assert.equal(signal.aborted, true);
});

test('new shell activation deletes only older app-shell caches', async () => {
  const { handlers, names } = await worker();
  let activation;
  handlers.activate({ waitUntil: promise => { activation = promise; } });
  await activation;
  assert.deepEqual([...names].sort(), ['calismac-content-v1', 'calismac-shell-test', 'other-app']);
});

test('online launch receives fresh HTML while offline launch keeps the installed shell', async () => {
  const { handlers, entries } = await worker(async () => new Response('new deployment'));
  let response;
  handlers.fetch({ request: { url: 'https://example.com/calismac/', method: 'GET', mode: 'navigate' }, respondWith: promise => { response = promise; } });
  assert.equal(await (await response).text(), 'new deployment');
  assert.equal(await entries.get('/calismac/index.html').text(), '/calismac/index.html');
});
