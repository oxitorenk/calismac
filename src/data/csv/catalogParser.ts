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
  const pairs = new Set<string>();
  const departments = new Map<string, string>();
  const courses = new Map<string, CatalogEntry>();
  return rows.map(row => {
    if (row.length !== catalogHeaders.length || row.some(value => !value)) {
      throw new Error('Invalid catalog row');
    }
    const [departmentId, department, courseId, course, midtermGid, finalGid] = row;
    if (!slug.test(departmentId) || !slug.test(courseId) || !/^\d+$/.test(midtermGid) || !/^\d+$/.test(finalGid)) {
      throw new Error('Invalid catalog identifiers');
    }
    const pair = `${departmentId}/${courseId}`;
    const existingCourse = courses.get(courseId);
    if (pairs.has(pair) || (departments.has(departmentId) && departments.get(departmentId) !== department)) {
      throw new Error('Conflicting catalog mapping');
    }
    if (existingCourse && (existingCourse.course !== course || existingCourse.midtermGid !== midtermGid || existingCourse.finalGid !== finalGid)) {
      throw new Error('Conflicting course mapping');
    }
    const entry = { departmentId, department, courseId, course, midtermGid, finalGid };
    pairs.add(pair);
    departments.set(departmentId, department);
    courses.set(courseId, entry);
    return entry;
  });
}
