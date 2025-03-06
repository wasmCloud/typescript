/**
 * This component showcases how to do performant HTTP streaming with the HTTP and I/O
 * interfaces provided by the WebAssembly System Interface (WASI), in WASI P2.
 *
 * For more information on the interfaces and how to use them:
 * - https://github.com/WebAssembly/WASI/tree/main/wasip2
 * - https://github.com/WebAssembly/wasi-http
 * - https://github.com/WebAssembly/wasi-io
 */

import {
  IncomingRequest,
  ResponseOutparam,
  OutgoingBody,
  OutgoingResponse,
  Fields,
} from "wasi:http/types@0.2.3";

import { getRandomBytes } from "wasi:random/random@0.2.3";

/**
 * Generate random data to send over the write as our streaming workload
 */
function generateData(n: bigint): string {
  return btoa(getRandomBytes(n).toString());
}

/**
 * Implementation of wasi-http incoming-handler
 *
 * To understand the types involved, peruse the following files:
 *   - wit/world.wit
 *   - wit/deps/http/types.wit
 *
 */
function handle(req: IncomingRequest, resp: ResponseOutparam) {
  // Start building an outgoing response
  const outgoingResponse = new OutgoingResponse(new Fields());

  // Access the outgoing response body
  let outgoingBody = outgoingResponse.body();
  let outputStream = outgoingBody.write();

  // Generate data to send out
  //
  // The amount to send is arbitrarily chosen, but over 4096 to make
  // things more interesting than using `wasi:io/streams.blocking-write-and-flush`
  let text = generateData(8192n);
  let data = new Uint8Array(new TextEncoder().encode(text));

  // Retrieve a Preview 2 I/O pollable to coordinate writing to the output stream
  let pollable = outputStream.subscribe();
  let written = 0n;
  let remaining = BigInt(data.length);
  while (remaining > 0) {
    // Wait for the stream to become writable
    pollable.block();

    // Get the amount of bytes that we're allowed to write
    let writableByteCount = outputStream.checkWrite();
    if (remaining <= writableByteCount) {
      writableByteCount = BigInt(remaining);
    }

    // If we are not allowed to write any more, but there are still bytes
    // remaining then flush and try again
    if (writableByteCount === 0n && remaining !== 0n) {
      outputStream.flush();
      continue;
    }

    outputStream.write(
      new Uint8Array(
        data.buffer,
        Number(written),
        Number((written += writableByteCount)) // NOTE: written is updated
      )
    );
    remaining -= written;

    // While we can track *when* to flush separately and implement our own logic,
    // the simplest way is to flush the written chunk immediately
    outputStream.flush();
  }

  // We must clean up the resources we've created to facilitate polling
  // @ts-ignore: While TS does not *know* that the dispose symbols are registered, they are.
  pollable[Symbol.dispose]();
  // @ts-ignore: While TS does not *know* that the dispose symbols are registered, they are.
  outputStream[Symbol.dispose]();

  outgoingResponse.setStatusCode(200);
  OutgoingBody.finish(outgoingBody, undefined);
  ResponseOutparam.set(resp, { tag: "ok", val: outgoingResponse });
}

export const incomingHandler = {
  handle,
};
