import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchCsv, NetworkError } from '../src/data/fetchCsv.ts';

test('fetch returns raw content, leaving validation to the parser', async t => {
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.equal(options.cache, 'no-store');
    return new Response('invalid CSV is still a response');
  });
  assert.equal(await fetchCsv('https://example.com'), 'invalid CSV is still a response');
});

test('failed network and HTTP responses are network errors', async t => {
  const mocked = t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('offline'); });
  await assert.rejects(fetchCsv('https://example.com'), NetworkError);
  mocked.mock.mockImplementation(async () => new Response('', { status: 503 }));
  await assert.rejects(fetchCsv('https://example.com'), NetworkError);
});

test('requests abort after ten seconds and retry creates a new signal', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const signals = [];
  t.mock.method(globalThis, 'fetch', (_url, { signal }) => {
    signals.push(signal);
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
  });
  const first = assert.rejects(fetchCsv('https://example.com'), NetworkError);
  t.mock.timers.tick(9999);
  assert.equal(signals[0].aborted, false);
  t.mock.timers.tick(1);
  await first;
  const second = assert.rejects(fetchCsv('https://example.com'), NetworkError);
  assert.notEqual(signals[0], signals[1]);
  assert.equal(signals[1].aborted, false);
  t.mock.timers.tick(10000);
  await second;
});
