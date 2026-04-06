/// <reference path="./wasmcloud-messaging-types.d.ts" />
declare module 'wasmcloud:messaging/handler@0.2.0' {
  /**
   * Callback handled to invoke a function when a message is received from a subscription
   */
  export function handleMessage(msg: BrokerMessage): void;
  export type BrokerMessage = import('wasmcloud:messaging/types@0.2.0').BrokerMessage;
}
