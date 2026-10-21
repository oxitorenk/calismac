import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parentRoute } from '../src/app/navigation.ts';

test('back navigation preserves selection context and returns results home', () => {
  const context = { departmentId: 'tasarim', courseId: 'estetik', examType: 'midterm' };
  assert.deepEqual(parentRoute({ ...context, page: 'wrong' }), { ...context, page: 'results' });
  assert.deepEqual(parentRoute({ ...context, page: 'test' }), { ...context, page: 'count' });
  const course = parentRoute({ ...context, page: 'count' });
  assert.deepEqual(course, { page: 'course', departmentId: 'tasarim', courseId: 'estetik' });
  const courses = parentRoute(course);
  assert.deepEqual(courses, { page: 'courses', departmentId: 'tasarim' });
  assert.deepEqual(parentRoute(courses), { page: 'departments' });
  assert.deepEqual(parentRoute({ ...context, page: 'results' }), { page: 'departments' });
});
