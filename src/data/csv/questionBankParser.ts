import { normalizeCsv } from './normalizeCsv.ts';
import type { Question } from '../../domain/models.ts';

const bankHeaders = ['id', 'question', 'image_url', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'answer'];

export function parseQuestionRows(csv: string): string[][] {
  const { headers, rows } = normalizeCsv(csv);
  if (headers.length !== bankHeaders.length || headers.some((header, index) => header !== bankHeaders[index])) {
    throw new Error('Invalid question bank headers');
  }
  if (!rows.length) throw new Error('Empty question bank');
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.length !== bankHeaders.length || row.some((value, index) => index !== 2 && !value) || !/^[A-E]$/.test(row[8])) {
      throw new Error('Invalid question row');
    }
    if (ids.has(row[0])) throw new Error('Duplicate question ID');
    ids.add(row[0]);
    if (row[2]) {
      const url = new URL(row[2]);
      if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
        throw new Error('Invalid question image URL');
      }
    }
  }
  return rows;
}

export function parseQuestionBank(csv: string): Question[] {
  return parseQuestionRows(csv).map(([id, text, imageUrl, ...fields]) => ({
    id,
    text,
    ...(imageUrl ? { imageUrl } : {}),
    options: fields.slice(0, 5).map((text, index) => ({
      text,
      correct: fields[5] === 'ABCDE'[index],
    })),
  }));
}
