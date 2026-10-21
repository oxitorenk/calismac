import type { ContentRepository } from './ContentRepository.ts';
import type { CatalogEntry, ExamType, Question } from '../domain/models.ts';
import { parseCatalog } from './csv/catalogParser.ts';
import { parseQuestionBank } from './csv/questionBankParser.ts';
import { bankCacheKey } from './contentCache.ts';
import { loadContent } from './loadContent.ts';
import { catalogGid, getCsvUrl } from './sheetsSource.ts';

export class GoogleSheetsContentRepository implements ContentRepository {
  private catalog: CatalogEntry[] = [];
  private catalogRequest?: Promise<CatalogEntry[]>;

  async getCatalog(): Promise<CatalogEntry[]> {
    if (!this.catalogRequest) {
      this.catalogRequest = loadContent(getCsvUrl(catalogGid), 'catalog', parseCatalog)
        .then(catalog => { this.catalog = catalog; return catalog; })
        .finally(() => { this.catalogRequest = undefined; });
    }
    return this.catalogRequest;
  }

  async getQuestionBank(departmentId: string, courseId: string, examType: ExamType): Promise<Question[]> {
    const entry = this.catalog.find(entry => entry.departmentId === departmentId && entry.courseId === courseId);
    if (!entry) throw new Error('Course not found in loaded catalog');
    if (examType !== 'midterm' && examType !== 'final') throw new Error('Invalid exam type');
    const gid = examType === 'midterm' ? entry.midtermGid : entry.finalGid;
    return loadContent(getCsvUrl(gid), bankCacheKey(courseId, examType), parseQuestionBank);
  }
}
