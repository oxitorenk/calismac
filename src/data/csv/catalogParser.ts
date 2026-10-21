import type { CatalogEntry } from '../../domain/models.ts';
import { normalizeCsv } from './normalizeCsv.ts';

const catalogHeaders = ['department_id', 'department', 'course_id', 'course', 'midterm_gid', 'final_gid'];
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseCatalog(csv: string): CatalogEntry[] {
  const { headers, rows } = normalizeCsv(csv);
  if (headers.length !== catalogHeaders.length || headers.some((header, index) => header !== catalogHeaders[index])) {
    throw new Error('Invalid catalog headers');
  }
  if (!rows.length) throw new Error('Empty catalog');
  return rows.map(row => {
    if (row.length !== catalogHeaders.length || row.some(value => !value)) {
      throw new Error('Invalid catalog row');
    }
    const [departmentId, department, courseId, course, midtermGid, finalGid] = row;
    if (!slug.test(departmentId) || !slug.test(courseId) || !/^\d+$/.test(midtermGid) || !/^\d+$/.test(finalGid)) {
      throw new Error('Invalid catalog identifiers');
    }
    return { departmentId, department, courseId, course, midtermGid, finalGid };
  });
}
