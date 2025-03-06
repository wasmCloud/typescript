import {
  IncomingRequest,
  ResponseOutparam,
  OutgoingBody,
  OutgoingResponse,
  Fields,
} from 'wasi:http/types@0.2.3';

import {
 getRandomBytes
} from 'wasi:random/random@0.2.3';

function generateData(n: bigint): string {
  return btoa(getRandomBytes(n).toString())
}

// Implementation of wasi-http incoming-handler
//
// NOTE: To understand the types involved, take a look at wit/deps/http/types.wit
function handle(req: IncomingRequest, resp: ResponseOutparam) {
  // Start building an outgoing response
  const outgoingResponse = new OutgoingResponse(new Fields());

  // Access the outgoing response body
  let outgoingBody = outgoingResponse.body();
  {
    let outputStream = outgoingBody.write();

    // generate text
    let text = generateData(8n);
    let data = new Uint8Array(new TextEncoder().encode(text));

    let pollable = outputStream.subscribe();
    let written = 0n;
    while (written < data.length) {
        // Wait for the stream to become writable
        pollable.block();
        let n = outputStream.checkWrite();
        let sub = new Uint8Array(data, Number(written), Number(written + n));
        outputStream.write(sub);
    }
    outputStream.flush();
    pollable.block();

    // TODO: blockingWriteAndFlush just works:
    // outputStream.blockingWriteAndFlush(data);

    // @ts-ignore: This is required in order to dispose the stream before we return
    outputStream[Symbol.dispose]();
  }

  // Set the status code for the response
  outgoingResponse.setStatusCode(200);
  // Finish the response body
  OutgoingBody.finish(outgoingBody, undefined);
  // Set the created response
  ResponseOutparam.set(resp, { tag: 'ok', val: outgoingResponse });
}

export const incomingHandler = {
  handle,
};
