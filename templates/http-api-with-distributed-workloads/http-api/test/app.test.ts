import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, test } from 'vitest';
import { app } from '../src/app.js';
import * as messaging from './fakes/wasmcloud-messaging-consumer.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

beforeEach(() => {
  messaging.reset();
});

async function postTask(body: string): Promise<Response> {
  return app.request('/task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

describe('GET /', () => {
  test('serves the task-submission UI', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');
    const html = readFileSync(new URL('../src/index.html', import.meta.url), 'utf8');
    expect(await res.text()).toBe(html);
  });
});

describe('POST /task', () => {
  test('sends the payload to the named worker and returns its reply', async () => {
    messaging.respondWith((subject, body) => ({
      subject,
      body: encoder.encode(decoder.decode(body).split('').reverse().join('')),
    }));

    const res = await postTask(JSON.stringify({ worker: 'reverse', payload: 'abc' }));

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('cba');
    expect(messaging.requests).toHaveLength(1);
    const [sent] = messaging.requests;
    expect(sent.subject).toBe('tasks.reverse');
    expect(decoder.decode(sent.body)).toBe('abc');
    expect(sent.timeoutMs).toBe(5000);
  });

  test('defaults to the leet worker', async () => {
    messaging.respondWith((subject) => ({ subject, body: encoder.encode('h3ll0') }));

    const res = await postTask(JSON.stringify({ payload: 'hello' }));

    expect(await res.text()).toBe('h3ll0');
    expect(messaging.requests[0].subject).toBe('tasks.leet');
  });

  test('rejects a body that is not JSON', async () => {
    const res = await postTask('not json');
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Invalid JSON body');
    expect(messaging.requests).toHaveLength(0);
  });

  test('rejects a missing payload', async () => {
    const res = await postTask(JSON.stringify({ worker: 'leet' }));
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Missing required field: payload');
    expect(messaging.requests).toHaveLength(0);
  });

  test('rejects an empty payload', async () => {
    const res = await postTask(JSON.stringify({ payload: '' }));
    expect(res.status).toBe(400);
  });

  test('reports a messaging error as 502', async () => {
    // The default responder fails, as if no worker is subscribed.
    const res = await postTask(JSON.stringify({ worker: 'missing', payload: 'x' }));
    expect(res.status).toBe(502);
    expect(await res.text()).toBe('Messaging error: no subscriber for tasks.missing');
  });

  test('reports a non-Error failure as 502', async () => {
    messaging.respondWith(() => {
      throw 'timed out';
    });
    const res = await postTask(JSON.stringify({ payload: 'x' }));
    expect(res.status).toBe(502);
    expect(await res.text()).toBe('Messaging error: timed out');
  });
});

describe('not found', () => {
  test('unknown paths return a text 404', async () => {
    const res = await app.request('/nope');
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('Not found: /nope');
  });
});
