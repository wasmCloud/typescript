// In-memory wasmcloud:messaging/consumer.
// Records every request and publish, and answers requests
// with whatever reply the test configured.

export interface BrokerMessage {
  subject: string;
  body: Uint8Array;
  replyTo?: string;
}

export interface SentRequest {
  subject: string;
  body: Uint8Array;
  timeoutMs: number;
}

type Responder = (subject: string, body: Uint8Array) => BrokerMessage;

export const requests: SentRequest[] = [];
export const published: BrokerMessage[] = [];

let responder: Responder = (subject) => {
  throw new Error(`no subscriber for ${subject}`);
};

/** Answer subsequent requests with `fn`, or throw from it to fail them. */
export function respondWith(fn: Responder): void {
  responder = fn;
}

export function reset(): void {
  requests.length = 0;
  published.length = 0;
  responder = (subject) => {
    throw new Error(`no subscriber for ${subject}`);
  };
}

export function request(subject: string, body: Uint8Array, timeoutMs: number): BrokerMessage {
  requests.push({ subject, body, timeoutMs });
  return responder(subject, body);
}

export function publish(msg: BrokerMessage): void {
  published.push(msg);
}
