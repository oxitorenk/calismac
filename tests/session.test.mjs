import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTestSession } from '../src/domain/createTestSession.ts';

const bank = Array.from({ length: 3 }, (_, i) => ({
  id: String(i), text: `Soru ${i}`, imageUrl: 'https://res.cloudinary.com/demo/a.png',
  options: ['A', 'B', 'C', 'D', 'E'].map(text => ({ text, correct: text === 'C' })),
}));

test('session selects N distinct questions and shuffles options once without changing bank', t => {
  const original = structuredClone(bank);
  const random = t.mock.method(Math, 'random', () => 0);
  const session = createTestSession(bank, 2, 'tasarim', 'estetik', 'final');
  assert.equal(session.questions.length, 2);
  assert.equal(new Set(session.questions.map(q => q.id)).size, 2);
  assert.deepEqual(session.answers, [null, null]);
  assert.equal(session.currentQuestionIndex, 0);
  const calls = random.mock.callCount();
  for (const question of session.questions) {
    assert.equal(question.options.find(option => option.correct).text, 'C');
    assert.equal(question.imageUrl, bank[0].imageUrl);
    assert.notDeepEqual(question.options, bank[0].options);
  }
  assert.equal(random.mock.callCount(), calls);
  assert.deepEqual(bank, original);
});

test('session rejects invalid counts and supports a single question', () => {
  for (const count of [0, -1, 4, 1.5, NaN]) assert.throws(() => createTestSession(bank, count, 'a', 'b', 'midterm'));
  assert.equal(createTestSession(bank.slice(0, 1), 1, 'a', 'b', 'midterm').questions.length, 1);
});
