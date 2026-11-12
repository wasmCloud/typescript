import { describe, expect, test } from 'vitest';
import { ByteReader, sendStatus, u32BE } from '../src/streams';
import { FakeByteStream } from './fakes/streams';
import { Connection } from './fakes/wasi-sockets-types';

const bytes = (...values: number[]) => new Uint8Array(values);
// The socket type sendStatus takes, without importing the WASI interface types.
type TcpSocket = Parameters<typeof sendStatus>[0];
const asSocket = (conn: Connection) => conn as unknown as TcpSocket;

describe('ByteReader', () => {
  test('reads exact byte counts across chunk boundaries', async () => {
    const reader = new ByteReader(new FakeByteStream([bytes(1, 2), bytes(3), bytes(4, 5, 6)]));

    expect(await reader.readExact(3)).toEqual(bytes(1, 2, 3));
    expect(await reader.readExact(3)).toEqual(bytes(4, 5, 6));
  });

  test('skips empty chunks', async () => {
    const reader = new ByteReader(new FakeByteStream([bytes(), bytes(7), bytes(), bytes(8)]));

    expect(await reader.readExact(2)).toEqual(bytes(7, 8));
  });

  test('reports how far it got when the stream ends early', async () => {
    const reader = new ByteReader(new FakeByteStream([bytes(1), bytes(2, 3)]));

    await expect(reader.readExact(4)).rejects.toThrow('unexpected EOF after 3/4 bytes');
  });

  test('reads big-endian u32 values as unsigned', async () => {
    const reader = new ByteReader(new FakeByteStream([bytes(0, 0, 1), bytes(0, 0x80, 0, 0, 1)]));

    expect(await reader.readU32BE()).toBe(256);
    expect(await reader.readU32BE()).toBe(0x80000001);
  });
});

describe('u32BE', () => {
  test.each([
    [0, [0, 0, 0, 0]],
    [0x0a0b0c0d, [10, 11, 12, 13]],
    [0xffffffff, [255, 255, 255, 255]],
  ])('encodes %i', (value, encoded) => {
    expect(u32BE(value)).toEqual(new Uint8Array(encoded));
  });
});

describe('sendStatus', () => {
  test('sends one frame of status, payload length and payload', async () => {
    const conn = new Connection([]);

    await sendStatus(asSocket(conn), 0, bytes(9, 8, 7));

    expect(await conn.frames()).toEqual([bytes(0, 0, 0, 0, 3, 9, 8, 7)]);
  });

  test('sends an error frame with an empty payload', async () => {
    const conn = new Connection([]);

    await sendStatus(asSocket(conn), 1, bytes());

    expect(await conn.frames()).toEqual([bytes(1, 0, 0, 0, 0)]);
  });

  test('throws when the host fails to send the frame', async () => {
    const conn = new Connection([], [{ tag: 'err', val: 'connection-reset' }]);

    await expect(sendStatus(asSocket(conn), 0, bytes(1))).rejects.toThrow(
      'send failed: connection-reset',
    );
  });
});
