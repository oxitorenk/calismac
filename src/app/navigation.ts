import type { ExamType } from '../domain/models.ts';

export type Route =
  | { page: 'departments' }
  | { page: 'courses'; departmentId: string }
  | { page: 'study'; departmentId: string; courseIds: string[] }
  | { page: 'course'; departmentId: string; courseId: string }
  | { page: 'count' | 'test' | 'results' | 'wrong'; departmentId: string; courseId: string; examType: ExamType };

export function parentRoute(route: Route): Route {
  switch (route.page) {
    case 'departments':
    case 'courses': return { page: 'departments' };
    case 'study': return { page: 'courses', departmentId: route.departmentId };
    case 'course': return { page: 'courses', departmentId: route.departmentId };
    case 'count': return { page: 'course', departmentId: route.departmentId, courseId: route.courseId };
    case 'test': return { ...route, page: 'count' };
    case 'results': return { page: 'departments' };
    case 'wrong': return { ...route, page: 'results' };
  }
}
