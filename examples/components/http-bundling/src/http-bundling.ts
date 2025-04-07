import {
  IncomingRequest,
  ResponseOutparam,
  OutgoingBody,
  OutgoingResponse,
  Fields,
} from 'wasi:http/types@0.2.3';
import csv from "csvtojson";
import jsonpath from "jsonpath";
import * as R from "remeda";

const DATA = "title,score\nHello,5\nWorld,10"

// Implementation of wasi-http incoming-handler
//
// NOTE: To understand the types involved, take a look at wit/deps/http/types.wit
async function handle(req: IncomingRequest, resp: ResponseOutparam) {
  // Start building an outgoing response
  const outgoingResponse = new OutgoingResponse(new Fields());

  // Access the outgoing response body
  let outgoingBody = outgoingResponse.body();
  {
    // Create a stream for the response body
    let outputStream = outgoingBody.write();

    // Bit of a contrived example to use typescript dependencies
    const json = await csv().fromString(DATA);
    const scoresData: string[] = jsonpath.query(json, '$[*].score')
    const total = R.piped(
      R.map((x: unknown) => parseInt(x as string)),
      R.reduce((acc, x: number) => acc + x, 0)
    )(scoresData)

    // Write total to the response stream
    outputStream.blockingWriteAndFlush(
      new Uint8Array(new TextEncoder().encode(total.toString()))
    );
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
