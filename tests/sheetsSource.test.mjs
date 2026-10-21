import assert from 'node:assert/strict';
import { test } from 'node:test';
import { catalogGid, getCsvUrl } from '../src/data/sheetsSource.ts';

test('published CSV uses stable GIDs for catalog and banks', () => {
  for (const gid of [catalogGid, '714582708', '1671082491']) {
    const url = new URL(getCsvUrl(gid));
    assert.equal(url.protocol, 'https:');
    assert.equal(url.searchParams.get('gid'), gid);
    assert.equal(url.searchParams.get('output'), 'csv');
    assert.equal(url.searchParams.get('single'), 'true');
  }
  assert.throws(() => getCsvUrl('Görsel Estetik - Vize'));
  assert.throws(() => getCsvUrl(''));
});
