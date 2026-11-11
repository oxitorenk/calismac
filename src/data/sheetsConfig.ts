export function readSheetsConfig(env: Record<string, string | undefined>) {
  const publishedUrl = env.VITE_SHEETS_PUBLISHED_URL?.trim();
  if (!publishedUrl) throw new Error('Set VITE_SHEETS_PUBLISHED_URL in .env.local or the build environment');
  let url: URL;
  try {
    url = new URL(publishedUrl);
  } catch {
    throw new Error('VITE_SHEETS_PUBLISHED_URL must be a published Google Sheets HTTPS URL');
  }
  if (url.origin !== 'https://docs.google.com' || !/^\/spreadsheets\/d\/e\/[^/]+\/pub$/.test(url.pathname) || url.username || url.password) {
    throw new Error('VITE_SHEETS_PUBLISHED_URL must be a published Google Sheets HTTPS URL');
  }
  const catalogGid = env.VITE_SHEETS_CATALOG_GID?.trim();
  if (!catalogGid || !/^\d+$/.test(catalogGid)) throw new Error('VITE_SHEETS_CATALOG_GID must be a numeric sheet GID');
  return { publishedUrl: url.href, catalogGid };
}
