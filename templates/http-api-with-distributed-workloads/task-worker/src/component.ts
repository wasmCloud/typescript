/**
 * Leet-speak task worker component.
 *
 * Implements wasmcloud:messaging/handler by processing messages published to
 * "tasks.task-worker". On receipt:
 *   1. Decodes the message body as UTF-8.
 *   2. Applies a leet-speak character substitution.
 *   3. Publishes the result back to the reply-to subject via
 *      wasmcloud:messaging/consumer.
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

// @ts-expect-error — types generated after running npm run setup:wit
import { publish } from 'wasmcloud:messaging/consumer@0.2.0';

// ---------------------------------------------------------------------------
// Types (inlined; generated types may appear after npm run setup:wit)
// ---------------------------------------------------------------------------

interface BrokerMessage {
  subject: string;
  body: Uint8Array;
  replyTo?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// ---------------------------------------------------------------------------
// Leet-speak transformation (mirrors the Rust task-leet component)
// ---------------------------------------------------------------------------

/**
 * Convert a string to leet speak by substituting select characters.
 *
 * Mapping: a→4, e→3, i→1, o→0, s→5, t→7, l→1
 * Case is preserved for all other characters.
 */
function toLeetSpeak(input: string): string {
  return input
    .split('')
    .map((ch) => {
      switch (ch.toLowerCase()) {
        case 'a': return '4';
        case 'e': return '3';
        case 'i': return '1';
        case 'o': return '0';
        case 's': return '5';
        case 't': return '7';
        case 'l': return '1';
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
 * componentize-js maps `export wasmcloud:messaging/handler@0.2.0` to a
 * named export object `handler` with a `handleMessage` method.
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
    const result = toLeetSpeak(payload);

    const reply: BrokerMessage = {
      subject: msg.replyTo,
      body: encoder.encode(result),
    };

    publish(reply);
  },
};
