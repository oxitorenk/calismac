import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bankCacheKey, contentCache } from '../src/data/contentCache.ts';

test('content cache uses an independent version and shares courses across departments', t => {
  const stored = new Map();
  t.after(() => { delete globalThis.localStorage; });
  globalThis.localStorage = {
    getItem: key => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
  };
  const key = bankCacheKey('estetik', 'midterm');
  assert.notEqual(key, bankCacheKey('estetik', 'final'));
  assert.equal(contentCache.read(key), null);
  contentCache.write(key, 'raw CSV');
  assert.equal(contentCache.read(key), 'raw CSV');
  assert.equal(stored.get('calismac:content:v1:bank:estetik:midterm'), 'raw CSV');
});

test('unavailable storage does not prevent online use', t => {
  t.after(() => { delete globalThis.localStorage; });
  globalThis.localStorage = {
    getItem() { throw new Error('denied'); },
    setItem() { throw new Error('quota'); },
  };
  assert.equal(contentCache.read('catalog'), null);
  assert.doesNotThrow(() => contentCache.write('catalog', 'CSV'));
});

