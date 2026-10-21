import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { build } from 'vite';

test('Pages build references valid scoped assets and precaches the entire shell', async () => {
  const result = await build({ logLevel: 'silent', build: { write: false } });
  const output = result.output;
  const files = new Map(output.map(file => [file.fileName, file.type === 'asset' ? String(file.source) : file.code]));
  const html = files.get('index.html');
  const sw = files.get('sw.js');
  assert.ok(html && sw);
  assert.match(html, /<html lang="tr">/);
  const precache = JSON.parse(sw.match(/const PRECACHE = (.*);/)[1]);
  for (const path of precache) {
    assert.ok(path.startsWith('/calismac/'), path);
    const name = path.slice('/calismac/'.length);
    assert.ok(files.has(name) || existsSync(new URL(`../public/${name}`, import.meta.url)), path);
  }
  for (const [, path] of html.matchAll(/(?:src|href)="(\/calismac\/[^" ]+)"/g)) {
    assert.ok(precache.includes(path), path);
  }
  assert.match(sw, /calismac-shell-[a-f0-9]{12}/);
  assert.ok(precache.includes('/calismac/index.html'));
});
