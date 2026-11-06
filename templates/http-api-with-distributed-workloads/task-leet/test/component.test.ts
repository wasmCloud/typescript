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
    subject: 'tasks.leet',
    body: encoder.encode(payload),
    replyTo: '_INBOX.reply',
  });
  expect(messaging.published).toHaveLength(1);
  expect(messaging.published[0].subject).toBe('_INBOX.reply');
  return decoder.decode(messaging.published[0].body);
}

describe('basic mode', () => {
  test('substitutes vowels and s, preserving other characters', () => {
    expect(deliver('Hello World, this is leet')).toBe('H3ll0 W0rld, th15 15 l33t');
  });

  test('maps upper-case letters too', () => {
    expect(deliver('AEIOUS')).toBe('4310U5');
  });

  test('is the default for an unknown mode', () => {
    config.configure({ 'leet.mode': 'extreme' });
    expect(deliver('total')).toBe('t0t4l');
  });
});

describe('aggressive mode', () => {
  test('also maps t and l', () => {
    config.configure({ 'leet.mode': 'aggressive' });
    expect(deliver('Hello total')).toBe('H3110 70741');
  });
});

describe('prefix', () => {
  test('is prepended to the reply', () => {
    config.configure({ 'leet.prefix': '[leet] ' });
    expect(deliver('hi')).toBe('[leet] h1');
  });
});

describe('config errors', () => {
  test('fall back to the defaults', () => {
    config.failWith({ tag: 'io', val: 'store unavailable' });
    expect(deliver('test')).toBe('t35t');
  });
});

describe('reply-to', () => {
  test('a message without one is rejected and nothing is published', () => {
    expect(() =>
      handler.handleMessage({ subject: 'tasks.leet', body: encoder.encode('hi') }),
    ).toThrow('missing reply_to');
    expect(messaging.published).toHaveLength(0);
  });
});
