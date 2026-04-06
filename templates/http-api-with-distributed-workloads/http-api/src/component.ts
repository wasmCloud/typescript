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

// @ts-expect-error — types generated after running npm run setup:wit
import { request } from 'wasmcloud:messaging/consumer@0.2.0';

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
// Embedded HTML UI (equivalent of http-api/ui.html in the Rust template)
// ---------------------------------------------------------------------------

const UI_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task API</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px;
      margin: 40px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 { color: #333; margin-bottom: 24px; }
    label { display: block; margin-bottom: 6px; font-weight: 500; color: #444; }
    select, textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
      margin-bottom: 16px;
    }
    textarea { min-height: 120px; resize: vertical; }
    button {
      background: #0066cc;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
    }
    button:hover { background: #0052a3; }
    button:disabled { background: #999; cursor: not-allowed; }
    #result {
      margin-top: 24px;
      padding: 16px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      white-space: pre-wrap;
      word-break: break-word;
      display: none;
    }
    #result.error { border-color: #cc0000; background: #fff5f5; color: #cc0000; }
    #result.success { border-color: #00cc66; background: #f5fff5; }
  </style>
</head>
<body>
  <h1>Task API</h1>
  <form id="taskForm">
    <label for="worker">Worker</label>
    <select id="worker" name="worker">
      <option value="task-worker" selected>Leet Speak</option>
    </select>

    <label for="payload">Payload</label>
    <textarea id="payload" name="payload" placeholder="Enter your message here..."></textarea>

    <button type="submit" id="submitBtn">Send Task</button>
  </form>

  <div id="result"></div>

  <script>
    const form = document.getElementById('taskForm');
    const workerSelect = document.getElementById('worker');
    const payloadTextarea = document.getElementById('payload');
    const submitBtn = document.getElementById('submitBtn');
    const resultDiv = document.getElementById('result');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const worker = workerSelect.value;
      const payload = payloadTextarea.value;
      if (!payload.trim()) { showResult('Payload is required', true); return; }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      resultDiv.style.display = 'none';
      try {
        const response = await fetch('/task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload, worker }),
        });
        const text = await response.text();
        showResult(text, !response.ok);
      } catch (err) {
        showResult('Request failed: ' + err.message, true);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Task';
      }
    });

    function showResult(message, isError) {
      resultDiv.textContent = message;
      resultDiv.className = isError ? 'error' : 'success';
      resultDiv.style.display = 'block';
    }
  </script>
</body>
</html>`;

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
