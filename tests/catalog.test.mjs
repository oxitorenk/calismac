import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCatalog } from '../src/data/csv/catalogParser.ts';

const header = 'department_id,department,course_id,course,midterm_gid,final_gid';
const row = 'tasarim,Tasarım,gorsel-estetik,Görsel Estetik,714582708,1671082491';

test('catalog returns explicit stable identities and bank GIDs', () => {
  assert.deepEqual(parseCatalog(`${header}\n${row}`), [{
    departmentId: 'tasarim', department: 'Tasarım', courseId: 'gorsel-estetik',
    course: 'Görsel Estetik', midtermGid: '714582708', finalGid: '1671082491',
  }]);
});

test('empty, malformed or partially invalid catalog is rejected as a whole', () => {
  for (const csv of ['', header, `${header}\n${row}\ninvalid`, `${header}\n${row.replace('Tasarım,', ',')}`, `${header}\n${row.replace('tasarim,', 'TASARIM,')}`, `${header}\n${row.replace('714582708', 'bank')}`, `${header},extra\n${row},x`]) {
    assert.throws(() => parseCatalog(csv));
  }
});

test('a logical course may be shared across departments', () => {
  const shared = row.replace('tasarim,Tasarım', 'sanat,Sanat');
  assert.equal(parseCatalog(`${header}\n${row}\n${shared}`).length, 2);
});

test('duplicate pairs and inconsistent names or GIDs are rejected', () => {
  const shared = row.replace('tasarim,Tasarım', 'sanat,Sanat');
  for (const conflict of [row, row.replace('gorsel-estetik', 'baska-ders').replace('Tasarım', 'Başka bölüm'), shared.replace('Görsel Estetik', 'Başka ders'), shared.replace('714582708', '1'), shared.replace('1671082491', '2')]) {
    assert.throws(() => parseCatalog(`${header}\n${row}\n${conflict}`));
  }
});

test('every required catalog field and exact header are validated', () => {
  const fields = row.split(',');
  for (let index = 0; index < fields.length; index++) {
    const invalid = [...fields];
    invalid[index] = '';
    assert.throws(() => parseCatalog(`${header}\n${invalid.join(',')}`));
    const headers = header.split(',');
    headers[index] = 'unexpected';
    assert.throws(() => parseCatalog(`${headers.join(',')}\n${row}`));
  }
  const renamed = row.replace('tasarim,Tasarım', 'sanat,Tasarım').replace('gorsel-estetik,', 'baska-estetik,');
  assert.equal(parseCatalog(`${header}\n${row}\n${renamed}`).length, 2);
});
