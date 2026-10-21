import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shuffle } from '../src/utils/shuffle.ts';

test('Fisher–Yates preserves input and can reach every three-item permutation', t => {
  const source = Object.freeze(['A', 'B', 'C']);
  const random = t.mock.method(Math, 'random');
  const permutations = new Set();
  for (let first = 0; first < 3; first++) {
    for (let second = 0; second < 2; second++) {
      const values = [(first + 0.5) / 3, (second + 0.5) / 2];
      random.mock.mockImplementation(() => values.shift());
      const result = shuffle(source);
      assert.deepEqual([...result].sort(), source);
      permutations.add(result.join(''));
    }
  }
  assert.equal(permutations.size, 6);
  assert.deepEqual(source, ['A', 'B', 'C']);
  assert.deepEqual(shuffle([]), []);
  assert.deepEqual(shuffle(['A']), ['A']);
});
