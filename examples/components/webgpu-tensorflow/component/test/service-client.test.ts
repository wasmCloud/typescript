import { afterEach, describe, expect, test } from 'vitest';
import { callStylizeService } from '../src/service-client';
import { u32BE } from '../src/streams';
import { loopback, sockets } from './fakes/wasi-sockets-types';
import type { Peer } from './fakes/wasi-sockets-types';

const SERVICE = '127.0.0.1:7878';
const bytes = (...values: number[]) => new Uint8Array(values);
const frame = (status: number, payload: Uint8Array) => [
  bytes(status),
  u32BE(payload.length),
  payload,
];

afterEach(() => {
  loopback.clear();
  sockets.length = 0;
});

function serve(peer: Peer) {
  loopback.set(SERVICE, peer);
}

describe('callStylizeService', () => {
  test('sends both JPEGs length-prefixed and returns the payload', async () => {
    const requests: Uint8Array[] = [];
    serve({
      reply(request) {
        requests.push(request);
        return frame(0, bytes(9, 8, 7));
      },
    });

    const result = await callStylizeService(bytes(1, 2, 3), bytes(4, 5));

    expect(result).toEqual(bytes(9, 8, 7));
    expect(requests).toEqual([bytes(0, 0, 0, 3, 1, 2, 3, 0, 0, 0, 2, 4, 5)]);
  });

  test('connects to the service over IPv4 loopback', async () => {
    serve({ reply: () => frame(0, bytes()) });

    await callStylizeService(bytes(1), bytes(2));

    const [socket] = sockets;
    expect(socket.family).toBe('ipv4');
    expect(socket.remote).toEqual({ tag: 'ipv4', val: { port: 7878, address: [127, 0, 0, 1] } });
  });

  test('reads a reply split across many chunks', async () => {
    const payload = new Uint8Array(1000).map((_, i) => i % 251);
    serve({
      reply: () => {
        const whole = new Uint8Array([0, ...u32BE(payload.length), ...payload]);
        const chunks = [];
        for (let i = 0; i < whole.length; i += 7) chunks.push(whole.subarray(i, i + 7));
        return chunks;
      },
    });

    expect(await callStylizeService(bytes(1), bytes(2))).toEqual(payload);
  });

  test('throws the service error message', async () => {
    serve({ reply: () => frame(1, new TextEncoder().encode('stylize failed: out of memory')) });

    await expect(callStylizeService(bytes(1), bytes(2))).rejects.toThrow(
      'stylize failed: out of memory',
    );
  });

  test('throws when the reply is cut short', async () => {
    serve({ reply: () => [bytes(0), u32BE(10), bytes(1, 2, 3)] });

    await expect(callStylizeService(bytes(1), bytes(2))).rejects.toThrow(
      'unexpected EOF after 3/10 bytes',
    );
  });

  test('throws when sending the request failed', async () => {
    serve({ reply: () => frame(0, bytes(1)), sendResult: { tag: 'err', val: 'connection-reset' } });

    await expect(callStylizeService(bytes(1), bytes(2))).rejects.toThrow(
      'send failed: connection-reset',
    );
  });

  test('releases the socket and its streams after a call', async () => {
    serve({ reply: () => frame(1, bytes()) });

    await expect(callStylizeService(bytes(1), bytes(2))).rejects.toThrow();

    const [socket] = sockets;
    expect(socket.data?.dropped).toBe(true);
    expect(socket.received?.dropped).toBe(true);
    expect(socket.disposed).toBe(true);
  });

  test('releases the socket when the service is not listening', async () => {
    await expect(callStylizeService(bytes(1), bytes(2))).rejects.toThrow('connection-refused');

    expect(sockets[0].disposed).toBe(true);
  });
});
