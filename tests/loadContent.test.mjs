import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contentCache } from '../src/data/contentCache.ts';
import { loadContent } from '../src/data/loadContent.ts';

const parse = csv => {
  if (!csv.startsWith('valid:')) throw new Error('Invalid content');
  return csv.slice(6);
};

test('valid online content is used and cached only after validation', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('valid:new'));
  const read = t.mock.method(contentCache, 'read', () => 'valid:old');
  const write = t.mock.method(contentCache, 'write', () => {});
  assert.equal(await loadContent('https://example.com', 'catalog', parse), 'new');
  assert.equal(read.mock.callCount(), 0);
  assert.deepEqual(write.mock.calls[0].arguments, ['catalog', 'valid:new']);
});

test('invalid online response cannot use or overwrite valid cache', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('broken'));
  const read = t.mock.method(contentCache, 'read', () => 'valid:old');
  const write = t.mock.method(contentCache, 'write', () => {});
  await assert.rejects(loadContent('https://example.com', 'catalog', parse), /Invalid content/);
  assert.equal(read.mock.callCount(), 0);
  assert.equal(write.mock.callCount(), 0);
});

test('offline fallback validates cached content; missing or invalid cache rejects', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('offline'); });
  const read = t.mock.method(contentCache, 'read', () => 'valid:old');
  const write = t.mock.method(contentCache, 'write', () => {});
  assert.equal(await loadContent('https://example.com', 'catalog', parse), 'old');
  read.mock.mockImplementation(() => 'broken');
  await assert.rejects(loadContent('https://example.com', 'catalog', parse), /Invalid content/);
  read.mock.mockImplementation(() => null);
  await assert.rejects(loadContent('https://example.com', 'catalog', parse));
  assert.equal(write.mock.callCount(), 0);
});
