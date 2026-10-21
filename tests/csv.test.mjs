import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCsv } from '../src/data/csv/parseCsv.ts';
import { normalizeCsv } from '../src/data/csv/normalizeCsv.ts';

test('CSV preserves Turkish, commas, escaped quotes and multiline cells', () => {
  assert.deepEqual(parseCsv('id,question\r\n1,"Türkçe, ""alıntı""\nİkinci satır"\r\n'), [
    ['id', 'question'], ['1', 'Türkçe, "alıntı"\nİkinci satır'],
  ]);
});

test('malformed quotes reject the CSV', () => {
  assert.throws(() => parseCsv('id,question\n1,"unfinished'));
});

test('normalization trims boundaries but preserves internal content', () => {
  assert.deepEqual(normalizeCsv('\uFEFF id , question ,image_url, answer \n 05 ,"  Türkçe,\nİç  boşluk!  ", https://res.cloudinary.com/demo/image/upload/a.png , c '), {
    headers: ['id', 'question', 'image_url', 'answer'],
    rows: [['05', 'Türkçe,\nİç  boşluk!', 'https://res.cloudinary.com/demo/image/upload/a.png', 'C']],
  });
});
