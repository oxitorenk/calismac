import type { ExamType } from '../domain/models.ts';

const prefix = 'calismac:content:v1:';

export function bankCacheKey(courseId: string, examType: ExamType): string {
  return `bank:${courseId}:${examType}`;
}

export const contentCache = {
  read(key: string): string | null {
    try {
      return localStorage.getItem(prefix + key);
    } catch {
      return null;
    }
  },
  write(key: string, csv: string): void {
    try {
      localStorage.setItem(prefix + key, csv);
    } catch {
      // Storage denial or quota must not block valid online content.
    }
  },
};
