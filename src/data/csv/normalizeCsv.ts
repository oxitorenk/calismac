import { parseCsv } from './parseCsv.ts';

export function normalizeCsv(csv: string) {
  const [rawHeaders = [], ...rawRows] = parseCsv(csv);
  const headers = rawHeaders.map(header => header.replace(/^\uFEFF/, '').trim());
  const answerIndex = headers.indexOf('answer');
  const rows = rawRows.map(row => row.map((value, index) =>
    index === answerIndex ? value.trim().toUpperCase() : value.trim(),
  ));
  return { headers, rows };
}
