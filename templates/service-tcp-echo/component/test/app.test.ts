import { beforeEach, describe, expect, test } from 'vitest';
import { app } from '../src/app.js';
import { network } from './fakes/wasi-sockets-instance-network.js';
import * as tcp from './fakes/wasi-sockets-tcp-create-socket.js';

beforeEach(() => {
  tcp.reset();
});

async function count(body: string): Promise<Response> {
  return app.request('/count', { method: 'POST', body });
}

describe('GET /', () => {
  test('describes the service', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      service: 'service-tcp-echo',
      endpoints: { 'POST /count': expect.any(String) },
    });
  });
});

describe('POST /count', () => {
  test('returns the word count from the service', async () => {
    const res = await count('hello wasm world');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: 'hello wasm world', count: 3 });
  });

  test('connects to the service over loopback IPv4', async () => {
    await count('hi');
    expect(tcp.sockets).toHaveLength(1);
    const [socket] = tcp.sockets;
    expect(socket.family).toBe('ipv4');
    expect(socket.network).toBe(network);
    expect(socket.remote).toEqual({ tag: 'ipv4', val: { port: 7878, address: [127, 0, 0, 1] } });
    // The client waits for the connection before finishing it.
    expect(socket.blocks).toBe(1);
  });

  test('sends the body as a single line', async () => {
    const res = await count('one\ntwo\r\nthree  \n');
    expect(tcp.sockets[0].sent).toBe('one two three\n');
    expect((await res.json()).count).toBe(3);
  });

  test('rejects an empty body without connecting', async () => {
    const res = await count('');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Request body must not be empty' });
    expect(tcp.sockets).toHaveLength(0);
  });

  test('rejects a whitespace-only body', async () => {
    const res = await count(' \n\t ');
    expect(res.status).toBe(400);
    expect(tcp.sockets).toHaveLength(0);
  });

  test('reports a refused connection as 502', async () => {
    tcp.refuseConnections();
    const res = await count('hi');
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'Service error: connection-refused' });
  });

  test('reports a reply that is not a number as 502', async () => {
    tcp.setPeer(() => 'nope\n');
    const res = await count('hi');
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      error: 'Service error: Unexpected reply from word-count service: "nope"',
    });
  });

  test('reports the service closing without a reply as 502', async () => {
    tcp.setPeer(() => '');
    const res = await count('hi');
    expect(res.status).toBe(502);
    // The stream error is a plain `{ tag: 'closed' }` object, not an Error,
    // so String() is all the message gets.
    expect(await res.json()).toEqual({ error: 'Service error: [object Object]' });
  });

  test('reads only the first chunk of the reply', async () => {
    // The reply is read with a single blockingRead(64), so anything past
    // 64 bytes, or arriving in a later chunk, is never seen.
    tcp.setPeer(() => `${'1'.repeat(70)}\n`);
    const res = await count('hi');
    expect((await res.json()).count).toBe(Number('1'.repeat(64)));
  });
});
