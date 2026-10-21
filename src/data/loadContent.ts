import { contentCache } from './contentCache.ts';
import { fetchCsv, NetworkError } from './fetchCsv.ts';

export async function loadContent<T>(url: string, key: string, parse: (csv: string) => T): Promise<T> {
  let csv: string;
  try {
    csv = await fetchCsv(url);
  } catch (error) {
    if (!(error instanceof NetworkError)) throw error;
    const cached = contentCache.read(key);
    if (cached === null) throw error;
    return parse(cached);
  }
  const content = parse(csv);
  contentCache.write(key, csv);
  return content;
}
