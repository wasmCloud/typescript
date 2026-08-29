/**
 * Leet-speak task worker component.
 *
 * Implements wasmcloud:messaging/handler by processing messages published to
 * "tasks.leet". On receipt:
 *   1. Decodes the message body as UTF-8.
 *   2. Applies a leet-speak character substitution.
 *   3. Publishes the result back to the reply-to subject via
 *      wasmcloud:messaging/consumer.
 *
 * Behavior is driven by per-component config read from wasi:config/store —
 * workload-level defaults overridden by this worker's `dev.components` entry
 * (see .wash/config.yaml). Mirrors the Rust `task-leet` component.
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
  /** `basic` substitutes vowels and `s`; `aggressive` also maps `l`/`t`. */
  aggressive: boolean;
  /** Prepended to every reply. Empty by default. */
  prefix: string;
}

function loadSettings(): Settings {
  // `get` returns the value or undefined when unset; fall back to the basic,
  // unprefixed defaults.
  return {
    aggressive: get('leet.mode') === 'aggressive',
    prefix: get('leet.prefix') ?? '',
  };
}

// ---------------------------------------------------------------------------
// Leet-speak transformation (mirrors the Rust task-leet component)
// ---------------------------------------------------------------------------

/**
 * Convert a string to leet speak by substituting select characters.
 *
 * Always maps a→4, e→3, i→1, o→0, s→5. In `aggressive` mode also maps
 * t→7 and l→1. Case is preserved for all other characters.
 */
function toLeetSpeak(input: string, settings: Settings): string {
  return input
    .split('')
    .map((ch) => {
      switch (ch.toLowerCase()) {
        case 'a': return '4';
        case 'e': return '3';
        case 'i': return '1';
        case 'o': return '0';
        case 's': return '5';
        case 't': return settings.aggressive ? '7' : ch;
        case 'l': return settings.aggressive ? '1' : ch;
        default: return ch;
      }
    })
    .join('');
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
    const result = `${settings.prefix}${toLeetSpeak(payload, settings)}`;

    const reply: BrokerMessage = {
      subject: msg.replyTo,
      body: encoder.encode(result),
    };

    publish(reply);
  },
};
