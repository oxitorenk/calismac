import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCsv } from '../src/data/csv/parseCsv.ts';

test('CSV preserves Turkish, commas, escaped quotes and multiline cells', () => {
  assert.deepEqual(parseCsv('id,question\r\n1,"Türkçe, ""alıntı""\nİkinci satır"\r\n'), [
    ['id', 'question'], ['1', 'Türkçe, "alıntı"\nİkinci satır'],
  ]);
});

test('malformed quotes reject the CSV', () => {
  assert.throws(() => parseCsv('id,question\n1,"unfinished'));
});
