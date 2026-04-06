declare module 'wasmcloud:messaging/types@0.2.0' {
  /**
   * A message sent to or received from a broker
   */
  export interface BrokerMessage {
    subject: string,
    body: Uint8Array,
    replyTo?: string,
  }
}
