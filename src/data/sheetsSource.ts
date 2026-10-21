const publishedUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9Fvo0UaWQDSsYANf93d7uimiEjEkEf0ozYu5GKSxb8e16FkRP_nZYjzRcOvSptwv7gbpVl6rb5rIX/pub';

export const catalogGid = '0';

export function getCsvUrl(gid: string): string {
  if (!/^\d+$/.test(gid)) throw new Error('Invalid sheet GID');
  const url = new URL(publishedUrl);
  url.searchParams.set('output', 'csv');
  url.searchParams.set('gid', gid);
  url.searchParams.set('single', 'true');
  return url.href;
}
