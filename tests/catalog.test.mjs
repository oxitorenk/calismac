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
