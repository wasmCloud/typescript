/**
 * Reverse task worker component.
 *
 * Implements wasmcloud:messaging/handler by processing messages published to
 * "tasks.reverse". On receipt:
 *   1. Decodes the message body as UTF-8.
 *   2. Reverses the text (by character or by word).
 *   3. Publishes the result back to the reply-to subject via
 *      wasmcloud:messaging/consumer.
 *
 * Behavior is driven by per-component config read from wasi:config/store —
 * workload-level defaults overridden by this worker's `dev.components` entry
 * (see .wash/config.yaml). Mirrors the Rust `task-reverse` component.
 *
 * wasmcloud:messaging usage:
 *   import { publish } from 'wasmcloud:messaging/consumer@0.2.0';
 *   publish({ subject, body });
 *
 * Handler export:
 *   export const handler = { handleMessage(msg): void { ... } };
 *   componentize-js maps `export wasmcloud:messaging/handler@0.2.0` to
 *   a named export object `handler` with a `handleMessage` method.
 */

import { publish } from 'wasmcloud:messaging/consumer@0.2.0';
import { get } from 'wasi:config/store@0.2.0-rc.1';
import type { BrokerMessage } from 'wasmcloud:messaging/types@0.2.0';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// ---------------------------------------------------------------------------
// Per-component configuration (wasi:config/store)
// ---------------------------------------------------------------------------

/**
 * Per-worker behavior read from wasi:config/store. Values come from the
 * workload-level `config:` block, with this component's `dev.components`
 * entry overriding on a per-key basis (see .wash/config.yaml).
 */
interface Settings {
  /** `chars` reverses the characters; `words` reverses the word order. */
  byWords: boolean;
  /** Prepended to every reply. Empty by default. */
  prefix: string;
}

function loadSettings(): Settings {
  // `get` returns the value or undefined when unset; fall back to the
  // character-reversal, unprefixed defaults.
  return {
    byWords: get('reverse.mode') === 'words',
    prefix: get('reverse.prefix') ?? '',
  };
}

// ---------------------------------------------------------------------------
// Reverse transformation (mirrors the Rust task-reverse component)
// ---------------------------------------------------------------------------

/** Reverse the characters, or the word order when `byWords` is set. */
function reverse(input: string, settings: Settings): string {
  if (settings.byWords) {
    return input.split(/\s+/).filter(Boolean).reverse().join(' ');
  }
  return input.split('').reverse().join('');
}

// ---------------------------------------------------------------------------
// wasmcloud:messaging/handler export
// ---------------------------------------------------------------------------

/**
 * wasmcloud:messaging/handler interface export.
 *
 * The wasmCloud runtime calls handleMessage() for each message delivered
 * to a subscribed subject.
 */
export const handler = {
  handleMessage(msg: BrokerMessage): void {
    if (!msg.replyTo) {
      throw new Error('missing reply_to — cannot send response');
    }

    const payload = decoder.decode(msg.body);
    const settings = loadSettings();
    const result = `${settings.prefix}${reverse(payload, settings)}`;

    const reply: BrokerMessage = {
      subject: msg.replyTo,
      body: encoder.encode(result),
    };

    publish(reply);
  },
};
