/// <reference path="./wasmcloud-messaging-types.d.ts" />
declare module 'wasmcloud:messaging/consumer@0.2.0' {
  /**
   * Perform a request operation on a subject
   */
  export function request(subject: string, body: Uint8Array, timeoutMs: number): BrokerMessage;
  /**
   * Publish a message to a subject without awaiting a response
   */
  export function publish(msg: BrokerMessage): void;
  export type BrokerMessage = import('wasmcloud:messaging/types@0.2.0').BrokerMessage;
}
