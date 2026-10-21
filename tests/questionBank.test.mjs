import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseQuestionBank, parseQuestionRows } from '../src/data/csv/questionBankParser.ts';

const header = 'id,question,image_url,option_a,option_b,option_c,option_d,option_e,answer';
const row = '2026-guz-ara-05,Soru?,,Bir,İki,Üç,Dört,Beş,C';

test('banks allow one question, gaps in source IDs and mixed years', () => {
  assert.equal(parseQuestionRows(`${header}\n${row}`).length, 1);
  const rows = parseQuestionRows(`${header}\n${row}\n${row.replace('2026-guz-ara-05', '2025-guz-ara-18')}`);
  assert.equal(rows[1][0], '2025-guz-ara-18');
});

test('invalid header, row, answer, duplicate ID or image rejects the whole bank', () => {
  for (const csv of ['', header, `${header}\n${row}\n${row}`, `${header}\n${row}\npartial`, `${header}\n${row.replace(',C', ',F')}`, `${header}\n${row.replace('Soru?', '')}`, `${header}\n${row.replace(',,', ',http://example.com/a.png,')}`, `${header}\n${row.replace(',,', ',bad-url,')}`, `${header},extra\n${row},x`]) {
    assert.throws(() => parseQuestionRows(csv));
  }
});

test('optional HTTPS images and lowercase answers are accepted', () => {
  const imageRow = row.replace(',,', ',https://res.cloudinary.com/demo/image/upload/a.png,').replace(',C', ', c ');
  const [parsed] = parseQuestionRows(`${header}\n${imageRow}`);
  assert.equal(parsed[8], 'C');
  assert.ok(parsed[2].startsWith('https://'));
});

test('each source answer becomes exactly one correct option object', () => {
  for (const answer of 'ABCDE') {
    const [question] = parseQuestionBank(`${header}\n${row.replace(',C', `,${answer}`)}`);
    assert.equal(question.options.length, 5);
    assert.equal(question.options.filter(option => option.correct).length, 1);
    const correct = question.options['ABCDE'.indexOf(answer)];
    assert.equal(correct.correct, true);
    question.options.reverse();
    assert.equal(question.options.find(option => option.correct), correct);
    assert.equal(question.imageUrl, undefined);
  }
  const [question] = parseQuestionBank(`${header}\n${row.replace(',,', ',https://res.cloudinary.com/demo/image/upload/a.png,')}`);
  assert.equal(question.imageUrl, 'https://res.cloudinary.com/demo/image/upload/a.png');
});
