import { describe, expect, test } from 'vitest';
import type { InputData } from 'wasmcloud:hello/data-utils';
import { dataUtils } from '../src/bundled-esbuild.js';

const { calculateScore } = dataUtils;

describe('calculateScore', () => {
  test('sums the scores of JSON items titled Hello', async () => {
    const val = JSON.stringify([
      { title: 'Hello', score: 3 },
      { title: 'Goodbye', score: 100 },
      { title: 'Hello', score: 4 },
    ]);

    await expect(calculateScore({ tag: 'json', val })).resolves.toBe(7);
  });

  test('converts string scores to numbers', async () => {
    const val = JSON.stringify([
      { title: 'Hello', score: '10' },
      { title: 'Hello', score: '5' },
    ]);

    await expect(calculateScore({ tag: 'json', val })).resolves.toBe(15);
  });

  test('returns zero when no JSON item is titled Hello', async () => {
    const val = JSON.stringify([{ title: 'hello', score: 1 }]);

    await expect(calculateScore({ tag: 'json', val })).resolves.toBe(0);
  });

  test('returns zero for an empty JSON array', async () => {
    await expect(calculateScore({ tag: 'json', val: '[]' })).resolves.toBe(0);
  });

  test('rejects malformed JSON', async () => {
    await expect(calculateScore({ tag: 'json', val: '{' })).rejects.toThrow(SyntaxError);
  });

  test('sums the scores of XML items titled Hello', async () => {
    const val = `<?xml version="1.0"?>
<item><title>Hello</title><score>2</score></item>
<item id="ignored"><title>World</title><score>40</score></item>
<item><title>Hello</title><score>5</score></item>`;

    await expect(calculateScore({ tag: 'xml', val })).resolves.toBe(7);
  });

  test('ignores XML attributes when matching titles', async () => {
    const val = `<item><title lang="en">Hello</title><score>9</score></item>
<item><title>Hello</title><score>1</score></item>`;

    await expect(calculateScore({ tag: 'xml', val })).resolves.toBe(10);
  });

  test('scores XML with a single item', async () => {
    const val = '<item><title>Hello</title><score>2</score></item>';

    await expect(calculateScore({ tag: 'xml', val })).resolves.toBe(2);
  });

  test('scores XML without any item as 0', async () => {
    await expect(calculateScore({ tag: 'xml', val: '<other/>' })).resolves.toBe(0);
  });

  // The WIT variant only has json and xml cases,
  // but an unknown tag falls through to an empty list.
  test('returns zero for an unknown input tag', async () => {
    const data = { tag: 'yaml', val: 'title: Hello' } as unknown as InputData;

    await expect(calculateScore(data)).resolves.toBe(0);
  });
});
