import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contentCache } from '../src/data/contentCache.ts';
import { loadContent } from '../src/data/loadContent.ts';
import { parseCatalog } from '../src/data/csv/catalogParser.ts';
import { parseQuestionBank } from '../src/data/csv/questionBankParser.ts';

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

test('cached catalog and banks use the real normalization and validation pipeline', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('offline'); });
  const catalog = '\uFEFF department_id ,department,course_id,course,midterm_gid,final_gid\ntasarim,Tasarım,estetik,Estetik,1,2';
  const bank = 'id,question,image_url,option_a,option_b,option_c,option_d,option_e,answer\n2026-guz-ara-05,"Türkçe,\nçok satır",,A,B,C,D,E, c ';
  const read = t.mock.method(contentCache, 'read', key => key === 'catalog' ? catalog : bank);
  const cachedCatalog = await loadContent('https://example.com', 'catalog', parseCatalog);
  const cachedBank = await loadContent('https://example.com', 'bank', parseQuestionBank);
  assert.deepEqual(cachedCatalog, parseCatalog(catalog));
  assert.deepEqual(cachedBank, parseQuestionBank(bank));
  assert.equal(cachedBank[0].options[2].correct, true);
  for (const invalid of ['', 'wrong,headers\nx,y', bank.replace(', c ', ',F'), `${bank}\n${bank.substring(bank.indexOf('\n') + 1)}`]) {
    read.mock.mockImplementation(() => invalid);
    await assert.rejects(loadContent('https://example.com', 'bank', parseQuestionBank));
  }
  read.mock.mockImplementation(() => catalog.replace('tasarim,', 'TASARIM,'));
  await assert.rejects(loadContent('https://example.com', 'catalog', parseCatalog));
});

test('ten-second timeout falls back, then a fresh retry updates the cache', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let requests = 0;
  t.mock.method(globalThis, 'fetch', (_url, { signal }) => {
    requests++;
    if (requests === 1) return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
    return Promise.resolve(new Response('valid:new'));
  });
  t.mock.method(contentCache, 'read', () => 'valid:cached');
  const write = t.mock.method(contentCache, 'write', () => {});
  const pending = loadContent('https://example.com', 'catalog', parse);
  t.mock.timers.tick(10000);
  assert.equal(await pending, 'cached');
  assert.equal(write.mock.callCount(), 0);
  assert.equal(await loadContent('https://example.com', 'catalog', parse), 'new');
  assert.equal(requests, 2);
  assert.deepEqual(write.mock.calls[0].arguments, ['catalog', 'valid:new']);
});

test('invalid online response can be retried successfully without replacing cache prematurely', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response('broken'));
  const write = t.mock.method(contentCache, 'write', () => {});
  t.mock.method(contentCache, 'read', () => { throw new Error('Must not read cache'); });
  await assert.rejects(loadContent('https://example.com', 'catalog', parse), /Invalid content/);
  assert.equal(write.mock.callCount(), 0);
  fetch.mock.mockImplementation(async () => new Response('valid:repaired'));
  assert.equal(await loadContent('https://example.com', 'catalog', parse), 'repaired');
  assert.equal(write.mock.callCount(), 1);
});
