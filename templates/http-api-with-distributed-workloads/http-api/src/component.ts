/**
 * HTTP API component for the messaging template.
 *
 * Routes:
 *   GET  /       — serves the HTML task-submission UI
 *   POST /task   — accepts JSON { worker?: string, payload: string },
 *                  dispatches a request to tasks.{worker} via
 *                  wasmcloud:messaging/consumer, and streams the response
 *                  back to the caller.
 *
 * The component communicates with the task-worker component through the
 * wasmcloud:messaging interface. The request() call blocks until a reply
 * arrives (up to REQUEST_TIMEOUT_MS milliseconds).
 *
 * wasmcloud:messaging usage:
 *   import { request } from 'wasmcloud:messaging/consumer@0.2.0';
 *   const reply = request(subject, body, timeoutMs);
 */

import { request } from 'wasmcloud:messaging/consumer@0.2.0';
import UI_HTML from './index.html?raw';

import { Hono } from 'hono';
import {
  fire,
  incomingHandler,
} from '@bytecodealliance/jco-std/wasi/0.2.x/http/adapters/hono/server';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Timeout for messaging request-reply, in milliseconds. */
const REQUEST_TIMEOUT_MS = 5000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();


// ---------------------------------------------------------------------------
// Request / response types
// ---------------------------------------------------------------------------

interface TaskRequest {
  worker?: string;
  payload: string;
}

// ---------------------------------------------------------------------------
// Hono app
// ---------------------------------------------------------------------------

const app = new Hono();

/** Serve the HTML task-submission UI. */
app.get('/', (c) => {
  return c.html(UI_HTML);
});

/**
 * POST /task
 *
 * Body: { "worker": "task-worker", "payload": "Hello World" }
 *
 * Publishes a request to "tasks.{worker}" via wasmcloud:messaging and
 * returns the worker's reply as plain text.
 */
app.post('/task', async (c) => {
  let body: TaskRequest;
  try {
    body = await c.req.json<TaskRequest>();
  } catch {
    return c.text('Invalid JSON body', 400);
  }

  if (!body.payload) {
    return c.text('Missing required field: payload', 400);
  }

  const subject = `tasks.${body.worker ?? 'default'}`;
  const msgBody = encoder.encode(body.payload);

  try {
    const reply = request(subject, msgBody, REQUEST_TIMEOUT_MS);
    return c.text(decoder.decode(reply.body));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.text(`Messaging error: ${message}`, 502);
  }
});

app.notFound((c) => c.text(`Not found: ${c.req.path}`, 404));

// ---------------------------------------------------------------------------
// wasi:http/incoming-handler export
// ---------------------------------------------------------------------------

fire(app);
export { incomingHandler };
