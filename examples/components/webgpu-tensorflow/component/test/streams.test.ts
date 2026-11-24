import { describe, expect, test } from 'vitest';
import { ByteReader, u32BE } from '../src/streams';
import { FakeByteStream } from './fakes/streams';

const bytes = (...values: number[]) => new Uint8Array(values);

describe('ByteReader', () => {
  test('reads exact byte counts across chunk boundaries', async () => {
    const reader = new ByteReader(new FakeByteStream([bytes(1, 2), bytes(3), bytes(4, 5, 6)]));

    expect(await reader.readExact(3)).toEqual(bytes(1, 2, 3));
    expect(await reader.readExact(2)).toEqual(bytes(4, 5));
    expect(await reader.readExact(1)).toEqual(bytes(6));
  });

  test('skips empty chunks', async () => {
    const reader = new ByteReader(new FakeByteStream([bytes(), bytes(7), bytes(), bytes(8)]));

    expect(await reader.readExact(2)).toEqual(bytes(7, 8));
  });

  test('reads zero bytes without touching the stream', async () => {
    const stream = new FakeByteStream([]);
    stream.drop();

    expect(await new ByteReader(stream).readExact(0)).toEqual(bytes());
  });

  test('reports how far it got when the stream ends early', async () => {
    const reader = new ByteReader(new FakeByteStream([bytes(1, 2)]));

    await expect(reader.readExact(5)).rejects.toThrow('unexpected EOF after 2/5 bytes');
  });

  test('reads a big-endian u32', async () => {
    const reader = new ByteReader(new FakeByteStream([bytes(0x12, 0x34), bytes(0x56, 0x78)]));

    expect(await reader.readU32BE()).toBe(0x12345678);
  });

  test('reads u32 values with the top bit set as unsigned', async () => {
    const reader = new ByteReader(new FakeByteStream([bytes(0xff, 0xff, 0xff, 0xfe)]));

    expect(await reader.readU32BE()).toBe(0xfffffffe);
  });

  test('readAll returns buffered bytes followed by the rest of the stream', async () => {
    const reader = new ByteReader(new FakeByteStream([bytes(1, 2, 3), bytes(4), bytes(5, 6)]));

    expect(await reader.readExact(1)).toEqual(bytes(1));
    expect(await reader.readAll()).toEqual(bytes(2, 3, 4, 5, 6));
    expect(await reader.readAll()).toEqual(bytes());
  });

  test('readAll returns nothing for an empty stream', async () => {
    expect(await new ByteReader(new FakeByteStream([])).readAll()).toEqual(bytes());
  });
});

describe('u32BE', () => {
  test.each([
    [0, [0, 0, 0, 0]],
    [1, [0, 0, 0, 1]],
    [0x01020304, [1, 2, 3, 4]],
    [0xffffffff, [255, 255, 255, 255]],
  ])('encodes %i', (value, encoded) => {
    expect(u32BE(value)).toEqual(new Uint8Array(encoded));
  });

  test('round-trips through ByteReader', async () => {
    const reader = new ByteReader(new FakeByteStream([u32BE(3_000_000_000)]));

    expect(await reader.readU32BE()).toBe(3_000_000_000);
  });
});
