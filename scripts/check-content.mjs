import assert from 'node:assert/strict';
import { parseCatalog } from '../src/data/csv/catalogParser.ts';
import { parseQuestionBank } from '../src/data/csv/questionBankParser.ts';
import { catalogGid, getCsvUrl } from '../src/data/sheetsSource.ts';

async function readCsv(gid) {
  const response = await fetch(getCsvUrl(gid), { cache: 'no-store', signal: AbortSignal.timeout(10000) });
  assert.ok(response.ok, `Sheet ${gid}: HTTP ${response.status}`);
  return response.text();
}

const catalog = parseCatalog(await readCsv(catalogGid));
for (const entry of catalog) {
  for (const [exam, gid] of [['midterm', entry.midtermGid], ['final', entry.finalGid]]) {
    const questions = parseQuestionBank(await readCsv(gid));
    const images = questions.filter(question => question.imageUrl);
    for (const question of images) {
      const response = await fetch(question.imageUrl, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
      assert.ok(response.ok && response.headers.get('content-type')?.startsWith('image/'), `Unavailable image: ${question.id}`);
    }
    console.log(`${entry.courseId} ${exam}: ${questions.length} questions, ${images.length} images`);
  }
}
console.log('Published content validation passed.');
