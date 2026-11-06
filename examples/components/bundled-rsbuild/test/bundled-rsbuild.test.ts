import { describe, expect, test } from 'vitest';
import type { InputData } from 'wasmcloud:hello/data-utils';
import { dataUtils } from '../src/bundled-rsbuild.js';

const { calculateScore } = dataUtils;

describe('calculateScore', () => {
  test('sums the score column of CSV input', async () => {
    const val = 'title,score\nHello,3\nWorld,4\nAgain,10';

    await expect(calculateScore({ tag: 'csv', val })).resolves.toBe(17);
  });

  test('returns zero for CSV without a score column', async () => {
    const val = 'title,points\nHello,3';

    await expect(calculateScore({ tag: 'csv', val })).resolves.toBe(0);
  });

  test('sums the score of every JSON item', async () => {
    const val = JSON.stringify([
      { title: 'Hello', score: 3 },
      { title: 'World', score: '4' },
      { title: 'Unscored' },
    ]);

    await expect(calculateScore({ tag: 'json', val })).resolves.toBe(7);
  });

  test('truncates fractional scores', async () => {
    const val = JSON.stringify([{ score: 2.9 }, { score: '1.5' }]);

    await expect(calculateScore({ tag: 'json', val })).resolves.toBe(3);
  });

  test('returns zero for an empty JSON array', async () => {
    await expect(calculateScore({ tag: 'json', val: '[]' })).resolves.toBe(0);
  });

  // A non-numeric score isn't skipped, so it turns the whole total into NaN.
  test('returns NaN when a score is not a number', async () => {
    const val = JSON.stringify([{ score: 1 }, { score: 'lots' }]);

    await expect(calculateScore({ tag: 'json', val })).resolves.toBeNaN();
  });

  test('rejects malformed JSON', async () => {
    await expect(calculateScore({ tag: 'json', val: '[' })).rejects.toThrow(SyntaxError);
  });

  // The WIT variant only has csv and json cases,
  // but an unknown tag leaves nothing to query, so the sum rejects.
  test('rejects an unknown input tag', async () => {
    const data = { tag: 'xml', val: '<score>1</score>' } as unknown as InputData;

    await expect(calculateScore(data)).rejects.toThrow(TypeError);
  });
});
