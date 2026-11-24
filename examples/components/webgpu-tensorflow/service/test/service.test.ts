import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { run } from '../src/service';
import { Stylizer } from '../src/image-stylizer';
import { u32BE } from '../src/streams';
import { SocketError, TcpSocket, connect, pending, sockets } from './fakes/wasi-sockets-types';

vi.mock('../src/image-stylizer', () => ({
  Stylizer: { initialize: vi.fn() },
}));

const encode = (s: string) => new TextEncoder().encode(s);
const decode = (b: Uint8Array) => new TextDecoder().decode(b);
const request = (content: Uint8Array, style: Uint8Array) => [
  u32BE(content.length),
  content,
  u32BE(style.length),
  style,
];

/** Split a frame into its status and payload */
function parseFrame(frame: Uint8Array) {
  const length = new DataView(frame.buffer, frame.byteOffset).getUint32(1);
  expect(frame.length).toBe(5 + length);
  return { status: frame[0], payload: frame.subarray(5) };
}

const stylize =
  vi.fn<
    (req: {
      contentJpeg: Uint8Array;
      styleJpeg: Uint8Array;
      styleRatio: number;
    }) => Promise<Uint8Array>
  >();
let log: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.mocked(Stylizer.initialize).mockResolvedValue({ stylize } as unknown as Stylizer);
  stylize.mockImplementation(async ({ contentJpeg, styleJpeg }) =>
    encode(`${decode(contentJpeg)}+${decode(styleJpeg)}`),
  );
  log = vi.spyOn(console, 'log').mockReturnValue(undefined);
  error = vi.spyOn(console, 'error').mockReturnValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  pending.length = 0;
  sockets.length = 0;
  TcpSocket.bindError = undefined;
});

describe('run', () => {
  test('listens on IPv4 loopback port 7878 once the stylizer is ready', async () => {
    await run.run();

    const [socket] = sockets;
    expect(Stylizer.initialize).toHaveBeenCalledOnce();
    expect(socket.family).toBe('ipv4');
    expect(socket.bound).toEqual({ tag: 'ipv4', val: { port: 7878, address: [127, 0, 0, 1] } });
    expect(socket.listening).toBe(true);
    expect(log).toHaveBeenCalledWith('[stylize-service] listening on port 7878');
  });

  test('stylizes the two JPEGs of a request and replies with the result', async () => {
    const conn = connect(request(encode('content'), encode('style')));

    await run.run();

    expect(stylize).toHaveBeenCalledWith({
      contentJpeg: encode('content'),
      styleJpeg: encode('style'),
      styleRatio: 1.0,
    });
    const [frame] = await conn.frames();
    const { status, payload } = parseFrame(frame);
    expect(status).toBe(0);
    expect(decode(payload)).toBe('content+style');
  });

  test('reads a request split across arbitrary chunks', async () => {
    const whole = new Uint8Array(request(encode('abcdef'), encode('xyz')).flatMap((c) => [...c]));
    const chunks = Array.from(whole, (b) => new Uint8Array([b]));
    const conn = connect(chunks);

    await run.run();

    expect(decode(parseFrame((await conn.frames())[0]).payload)).toBe('abcdef+xyz');
  });

  test('handles connections one after another', async () => {
    const first = connect(request(encode('a'), encode('b')));
    const second = connect(request(encode('c'), encode('d')));

    await run.run();

    expect(decode(parseFrame((await first.frames())[0]).payload)).toBe('a+b');
    expect(decode(parseFrame((await second.frames())[0]).payload)).toBe('c+d');
  });

  test('releases each connection and its streams', async () => {
    const ok = connect(request(encode('a'), encode('b')));
    const bad = connect([u32BE(0)]);

    await run.run();

    for (const conn of [ok, bad]) {
      expect(conn.data.dropped).toBe(true);
      expect(conn.received.dropped).toBe(true);
      expect(conn.disposed).toBe(true);
    }
  });

  test.each([
    ['an empty content image', [u32BE(0)], 'bad request: invalid content length: 0'],
    [
      'a content image over 16 MiB',
      [u32BE(16 * 1024 * 1024 + 1)],
      'bad request: invalid content length: 16777217',
    ],
    [
      'an empty style image',
      [u32BE(1), encode('c'), u32BE(0)],
      'bad request: invalid style length: 0',
    ],
    [
      'a style image over 16 MiB',
      [u32BE(1), encode('c'), u32BE(0xffffffff)],
      'bad request: invalid style length: 4294967295',
    ],
    [
      'a request cut short',
      [u32BE(10), encode('short')],
      'bad request: unexpected EOF after 5/10 bytes',
    ],
    ['an empty request', [], 'bad request: unexpected EOF after 0/4 bytes'],
  ])('rejects %s without stylizing it', async (_, chunks, message) => {
    const conn = connect(chunks);

    await run.run();

    expect(stylize).not.toHaveBeenCalled();
    const { status, payload } = parseFrame((await conn.frames())[0]);
    expect(status).toBe(1);
    expect(decode(payload)).toBe(message);
  });

  test('accepts images of exactly 16 MiB', async () => {
    const big = new Uint8Array(16 * 1024 * 1024);
    connect(request(big, encode('s')));
    stylize.mockResolvedValueOnce(encode('ok'));

    await run.run();

    expect(stylize.mock.calls[0][0].contentJpeg).toHaveLength(big.length);
  });

  test('reports a failed stylize to the client and keeps serving', async () => {
    stylize.mockRejectedValueOnce(new Error('out of GPU memory'));
    const failed = connect(request(encode('a'), encode('b')));
    const next = connect(request(encode('c'), encode('d')));

    await run.run();

    const { status, payload } = parseFrame((await failed.frames())[0]);
    expect(status).toBe(1);
    expect(decode(payload)).toBe('stylize failed: out of GPU memory');
    expect(error).toHaveBeenCalledWith('[stylize-service] inference failed:', 'out of GPU memory');
    expect(parseFrame((await next.frames())[0]).status).toBe(0);
  });

  test('reports a stylize failure that is not an Error', async () => {
    stylize.mockRejectedValueOnce('bad jpeg');
    const conn = connect(request(encode('a'), encode('b')));

    await run.run();

    expect(decode(parseFrame((await conn.frames())[0]).payload)).toBe('stylize failed: bad jpeg');
  });

  test('logs a failed reply without sending a second frame', async () => {
    const conn = connect(request(encode('a'), encode('b')), [
      { tag: 'err', val: 'connection-reset' },
    ]);
    const next = connect(request(encode('c'), encode('d')));

    await run.run();

    expect(await conn.frames()).toHaveLength(1);
    expect(conn.disposed).toBe(true);
    expect(error).toHaveBeenCalledWith(
      '[stylize-service] reply failed:',
      'send failed: connection-reset',
    );
    expect(parseFrame((await next.frames())[0]).status).toBe(0);
  });

  test('carries on when the client is gone before a bad-request reply', async () => {
    const gone = connect([u32BE(0)], [{ tag: 'err', val: 'connection-reset' }]);
    const next = connect(request(encode('c'), encode('d')));

    await run.run();

    expect(gone.disposed).toBe(true);
    expect(parseFrame((await next.frames())[0]).status).toBe(0);
  });

  test('carries on when the client is gone before a stylize-failed reply', async () => {
    stylize.mockRejectedValueOnce(new Error('boom'));
    const gone = connect(request(encode('a'), encode('b')), [
      { tag: 'err', val: 'connection-reset' },
    ]);
    const next = connect(request(encode('c'), encode('d')));

    await run.run();

    expect(gone.disposed).toBe(true);
    expect(parseFrame((await next.frames())[0]).status).toBe(0);
  });

  test('rethrows a failure to initialize the stylizer', async () => {
    const failure = new Error('no GPU adapter');
    vi.mocked(Stylizer.initialize).mockRejectedValueOnce(failure);

    await expect(run.run()).rejects.toBe(failure);

    expect(error).toHaveBeenCalledWith('[stylize-service] fatal:', 'no GPU adapter', '');
    expect(sockets).toHaveLength(0);
  });

  test('logs the payload of a socket error before rethrowing it', async () => {
    TcpSocket.bindError = new SocketError({ tag: 'access-denied' });

    await expect(run.run()).rejects.toBe(TcpSocket.bindError);

    expect(error).toHaveBeenCalledWith(
      '[stylize-service] fatal:',
      'socket error: access-denied',
      '{"tag":"access-denied"}',
    );
  });

  test('logs a failure that is not an Error', async () => {
    vi.mocked(Stylizer.initialize).mockRejectedValueOnce('wedged');

    await expect(run.run()).rejects.toBe('wedged');

    expect(error).toHaveBeenCalledWith('[stylize-service] fatal:', 'wedged', '');
  });

  test('flushes the console before rethrowing', async () => {
    const flush = vi.fn(() => Promise.resolve());
    Object.assign(console, { flush });
    vi.mocked(Stylizer.initialize).mockRejectedValueOnce(new Error('boom'));

    try {
      await expect(run.run()).rejects.toThrow('boom');
      expect(flush).toHaveBeenCalledOnce();
    } finally {
      delete (console as { flush?: unknown }).flush;
    }
  });
});
