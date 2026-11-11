import { readSheetsConfig } from './sheetsConfig.ts';

// Node content checks and tests use process.env; Vite supplies import.meta.env.
const config = readSheetsConfig(import.meta.env ?? process.env);
export const catalogGid = config.catalogGid;

export function getCsvUrl(gid: string): string {
  if (!/^\d+$/.test(gid)) throw new Error('Invalid sheet GID');
  const url = new URL(config.publishedUrl);
  url.searchParams.set('output', 'csv');
  url.searchParams.set('gid', gid);
  url.searchParams.set('single', 'true');
  return url.href;
}
