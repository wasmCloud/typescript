import { describe, expect, test } from 'vitest';
import { dataUrlMimeType, dataUrlToBytes } from '../src/data-url';

describe('dataUrlToBytes', () => {
  test('decodes a base64 data URL', () => {
    expect(dataUrlToBytes('data:text/plain;base64,aGk=')).toEqual(new Uint8Array([104, 105]));
  });

  test('decodes bytes outside the ASCII range', () => {
    expect(dataUrlToBytes('data:application/octet-stream;base64,/wCA')).toEqual(
      new Uint8Array([255, 0, 128]),
    );
  });

  test('decodes an empty payload', () => {
    expect(dataUrlToBytes('data:image/jpeg;base64,')).toEqual(new Uint8Array());
  });

  test('rejects a string that is not a data URL', () => {
    expect(() => dataUrlToBytes('https://example.com/a.jpg')).toThrow('Invalid data URL');
  });

  test('rejects a data URL without a comma', () => {
    expect(() => dataUrlToBytes('data:image/jpeg;base64')).toThrow('Invalid data URL');
  });

  test('rejects a data URL that is not base64', () => {
    expect(() => dataUrlToBytes('data:text/plain,hello')).toThrow(
      'Only base64 data URLs are supported',
    );
  });

  test('rejects a malformed base64 payload', () => {
    expect(() => dataUrlToBytes('data:text/plain;base64,!!!')).toThrow();
  });
});

describe('dataUrlMimeType', () => {
  test.each([
    ['data:image/jpeg;base64,AAAA', 'image/jpeg'],
    ['data:text/html;charset=utf-8;base64,AAAA', 'text/html'],
    ['data:text/css,body{}', 'text/css'],
    ['data:;base64,AAAA', 'application/octet-stream'],
    ['data:,hello', 'application/octet-stream'],
  ])('reads the MIME type of %s', (dataUrl, mime) => {
    expect(dataUrlMimeType(dataUrl)).toBe(mime);
  });
});
