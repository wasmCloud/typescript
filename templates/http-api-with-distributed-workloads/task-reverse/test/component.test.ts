import { beforeEach, describe, expect, test } from 'vitest';
import { handler } from '../src/component.js';
import * as config from './fakes/wasi-config-store.js';
import * as messaging from './fakes/wasmcloud-messaging-consumer.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

beforeEach(() => {
  config.reset();
  messaging.reset();
});

/** Deliver `payload` to the handler and return the text it replied with. */
function deliver(payload: string): string {
  handler.handleMessage({
    subject: 'tasks.reverse',
    body: encoder.encode(payload),
    replyTo: '_INBOX.reply',
  });
  expect(messaging.published).toHaveLength(1);
  expect(messaging.published[0].subject).toBe('_INBOX.reply');
  return decoder.decode(messaging.published[0].body);
}

describe('chars mode', () => {
  test('reverses the characters by default', () => {
    expect(deliver('Hello World')).toBe('dlroW olleH');
  });

  test('keeps astral characters intact', () => {
    expect(deliver('a😀b')).toBe('b😀a');
  });

  test('is used for an unknown mode', () => {
    config.configure({ 'reverse.mode': 'lines' });
    expect(deliver('abc')).toBe('cba');
  });
});

describe('words mode', () => {
  test('reverses the word order and collapses whitespace', () => {
    config.configure({ 'reverse.mode': 'words' });
    expect(deliver('  one two\t three  ')).toBe('three two one');
  });

  test('returns an empty reply for blank input', () => {
    config.configure({ 'reverse.mode': 'words' });
    expect(deliver('   ')).toBe('');
  });
});

describe('prefix', () => {
  test('is prepended to the reply', () => {
    config.configure({ 'reverse.prefix': '>> ' });
    expect(deliver('ab')).toBe('>> ba');
  });
});

describe('config errors', () => {
  test('fall back to the defaults', () => {
    config.failWith({ tag: 'upstream', val: 'unreachable' });
    expect(deliver('ab')).toBe('ba');
  });
});

describe('reply-to', () => {
  test('a message without one is rejected and nothing is published', () => {
    expect(() =>
      handler.handleMessage({ subject: 'tasks.reverse', body: encoder.encode('hi') }),
    ).toThrow('missing reply_to');
    expect(messaging.published).toHaveLength(0);
  });
});
