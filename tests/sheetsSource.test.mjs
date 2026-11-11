import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readSheetsConfig } from '../src/data/sheetsConfig.ts';
import { spawnSync } from 'node:child_process';
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


test('sheet configuration requires a published HTTPS URL and explicit numeric catalog GID', () => {
  const env = { VITE_SHEETS_PUBLISHED_URL: 'https://docs.google.com/spreadsheets/d/e/custom-source/pub', VITE_SHEETS_CATALOG_GID: '123' };
  assert.deepEqual(readSheetsConfig(env), { publishedUrl: env.VITE_SHEETS_PUBLISHED_URL, catalogGid: '123' });
  assert.throws(() => readSheetsConfig({}), /VITE_SHEETS_PUBLISHED_URL/);
  for (const value of ['', 'invalid', 'http://docs.google.com/spreadsheets/d/e/test/pub', 'https://example.com/spreadsheets/d/e/test/pub', 'https://docs.google.com/spreadsheets/d/test/edit']) {
    assert.throws(() => readSheetsConfig({ ...env, VITE_SHEETS_PUBLISHED_URL: value }), /VITE_SHEETS_PUBLISHED_URL/);
  }
  for (const value of [undefined, '', '-1', 'catalog']) {
    assert.throws(() => readSheetsConfig({ ...env, VITE_SHEETS_CATALOG_GID: value }), /VITE_SHEETS_CATALOG_GID/);
  }
});

test('content check reads environment configuration in Node without live requests', () => {
  const script = `
    globalThis.fetch = async value => {
      const url = new URL(value);
      if (url.pathname !== '/spreadsheets/d/e/content-check/pub') throw new Error('Wrong source');
      const gid = url.searchParams.get('gid');
      if (!['123', '11', '22'].includes(gid)) throw new Error('Wrong GID');
      return new Response(gid === '123'
        ? 'department_id,department,course_id,course,midterm_gid,final_gid\\na,Department,b,Course,11,22'
        : 'id,question,image_url,option_a,option_b,option_c,option_d,option_e,answer\\n1,Question,,A,B,C,D,E,A');
    };
    await import('./scripts/check-content.mjs');
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
    cwd: new URL('..', import.meta.url), encoding: 'utf8',
    env: { ...process.env, VITE_SHEETS_PUBLISHED_URL: 'https://docs.google.com/spreadsheets/d/e/content-check/pub', VITE_SHEETS_CATALOG_GID: '123' },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Published content validation passed/);
});
