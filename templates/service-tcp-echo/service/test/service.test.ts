import { beforeEach, describe, expect, test, vi } from 'vitest';
import { run } from '../src/service.js';
import { network } from './fakes/wasi-sockets-instance-network.js';
import * as tcp from './fakes/wasi-sockets-tcp-create-socket.js';

beforeEach(() => {
  tcp.reset();
  vi.spyOn(console, 'log').mockReturnValue(undefined);
});

describe('startup', () => {
  test('binds and listens on 0.0.0.0:7878 over IPv4', () => {
    run.run();

    expect(tcp.listeners).toHaveLength(1);
    const [listener] = tcp.listeners;
    expect(listener.family).toBe('ipv4');
    expect(listener.network).toBe(network);
    expect(listener.local).toEqual({ tag: 'ipv4', val: { port: 7878, address: [0, 0, 0, 0] } });
    expect(listener.steps).toEqual(['startBind', 'finishBind', 'startListen', 'finishListen']);
    // It waits for the bind, the listen, and then for a connection.
    expect(listener.blocks).toBe(3);
    expect(console.log).toHaveBeenCalledWith(
      '[tcp-service] word-count server listening on port 7878',
    );
  });

  test('returns once accept fails', () => {
    // No clients are queued, so the first accept fails and run() ends.
    expect(() => run.run()).not.toThrow();
  });
});

describe('connections', () => {
  test('answers each line with its word count', () => {
    const client = tcp.connect(['hello world\n', 'one two three\n']);
    run.run();
    expect(client.received).toBe('2\n3\n');
  });

  test('handles several lines in one chunk', () => {
    const client = tcp.connect(['a b\nc\n\n']);
    run.run();
    expect(client.received).toBe('2\n1\n0\n');
  });

  test('joins a line split across chunks', () => {
    const client = tcp.connect(['hel', 'lo wor', 'ld\n']);
    run.run();
    expect(client.received).toBe('2\n');
  });

  test('counts words separated by any whitespace', () => {
    const client = tcp.connect(['  spaced\tout   words  \n']);
    run.run();
    expect(client.received).toBe('3\n');
  });

  test('does not answer a final line without a newline', () => {
    const client = tcp.connect(['counted\n', 'never answered']);
    run.run();
    expect(client.received).toBe('1\n');
  });

  test('serves clients one after another', () => {
    const first = tcp.connect(['first client\n']);
    const second = tcp.connect(['second\n']);
    run.run();
    expect(first.received).toBe('2\n');
    expect(second.received).toBe('1\n');
  });

  test('drops a client whose writes fail and serves the next', () => {
    const gone = tcp.connect(['one\ntwo\nthree\n'], { failWritesAfter: 1 });
    const next = tcp.connect(['still here\n']);
    run.run();
    expect(gone.received).toBe('1\n');
    expect(next.received).toBe('2\n');
  });
});
