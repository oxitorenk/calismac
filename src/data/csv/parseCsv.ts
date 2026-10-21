import Papa from 'papaparse';

export function parseCsv(csv: string): string[][] {
  const result = Papa.parse<string[]>(csv, { skipEmptyLines: 'greedy' });
  if (result.errors.length) throw new Error('Invalid CSV');
  return result.data;
}
