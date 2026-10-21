import type { CatalogEntry, ExamType, Question } from '../domain/models';

export interface ContentRepository {
  getCatalog(): Promise<CatalogEntry[]>;
  getQuestionBank(
    departmentId: string,
    courseId: string,
    examType: ExamType,
  ): Promise<Question[]>;
}
