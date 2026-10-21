import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GoogleSheetsContentRepository } from '../src/data/GoogleSheetsContentRepository.ts';
import { contentCache } from '../src/data/contentCache.ts';

const catalog = 'department_id,department,course_id,course,midterm_gid,final_gid\ntasarim,Tasarım,estetik,Estetik,11,22\nsanat,Sanat,estetik,Estetik,11,22';
const bank = 'id,question,image_url,option_a,option_b,option_c,option_d,option_e,answer\n2026-guz-ara-05,Soru?,,A,B,C,D,E,B';

test('repository resolves only requested bank and shares course cache keys', async t => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async url => {
    const gid = new URL(url).searchParams.get('gid');
    requests.push(gid);
    return new Response(gid === '0' ? catalog : bank);
  });
  const write = t.mock.method(contentCache, 'write', () => {});
  const repository = new GoogleSheetsContentRepository();
  await assert.rejects(repository.getQuestionBank('tasarim', 'estetik', 'midterm'));
  assert.deepEqual(requests, []);
  assert.equal((await repository.getCatalog()).length, 2);
  assert.deepEqual(requests, ['0']);
  const questions = await repository.getQuestionBank('tasarim', 'estetik', 'midterm');
  assert.equal(questions[0].options[1].correct, true);
  await repository.getQuestionBank('sanat', 'estetik', 'midterm');
  await repository.getQuestionBank('tasarim', 'estetik', 'final');
  assert.deepEqual(requests, ['0', '11', '11', '22']);
  assert.deepEqual(write.mock.calls.map(call => call.arguments[0]), ['catalog', 'bank:estetik:midterm', 'bank:estetik:midterm', 'bank:estetik:final']);
  await assert.rejects(repository.getQuestionBank('missing', 'estetik', 'midterm'));
  await assert.rejects(repository.getQuestionBank('tasarim', 'estetik', 'other'));
  assert.equal(requests.length, 4);
});

test('concurrent catalog loads share a snapshot and later loads refresh it', async t => {
  let resolve;
  const fetch = t.mock.method(globalThis, 'fetch', () => new Promise(done => { resolve = done; }));
  const write = t.mock.method(contentCache, 'write', () => {});
  const repository = new GoogleSheetsContentRepository();
  const first = repository.getCatalog();
  const second = repository.getCatalog();
  assert.equal(fetch.mock.callCount(), 1);
  resolve(new Response(catalog));
  assert.equal(await first, await second);
  assert.equal(write.mock.callCount(), 1);
  const refresh = repository.getCatalog();
  assert.equal(fetch.mock.callCount(), 2);
  resolve(new Response(catalog.replaceAll('estetik', 'yeni')));
  assert.equal((await refresh)[0].courseId, 'yeni');
  fetch.mock.mockImplementation(async () => new Response(bank));
  assert.equal((await repository.getQuestionBank('tasarim', 'yeni', 'midterm')).length, 1);
});

test('failed shared catalog request can be retried', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response('invalid catalog'));
  const repository = new GoogleSheetsContentRepository();
  await Promise.all([assert.rejects(repository.getCatalog()), assert.rejects(repository.getCatalog())]);
  assert.equal(fetch.mock.callCount(), 1);
  fetch.mock.mockImplementation(async () => new Response(catalog));
  assert.equal((await repository.getCatalog()).length, 2);
  assert.equal(fetch.mock.callCount(), 2);
});

test('offline repository loads a validated catalog snapshot before resolving a bank', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('offline'); });
  t.mock.method(contentCache, 'read', key => key === 'catalog' ? catalog : bank);
  const repository = new GoogleSheetsContentRepository();
  await repository.getCatalog();
  assert.equal((await repository.getQuestionBank('sanat', 'estetik', 'final')).length, 1);
});
