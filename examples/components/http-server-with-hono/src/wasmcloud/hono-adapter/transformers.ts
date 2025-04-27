import type {IncomingRequest} from 'wasi:http/types@0.2.3';
import type {InputStream} from 'wasi:io/streams@0.2.3';

import {ResponseOutparam, Fields, OutgoingBody, OutgoingResponse} from 'wasi:http/types@0.2.3';

import {logging} from './logging';

const WASI_IO_READ_MAX_BYTES = 4096n;

export function createRequest(incoming: IncomingRequest): Request {
  const logger = logging.createLogger('createRequest()');
  const method = incoming.method().tag;
  const path = incoming.pathWithQuery() ?? '/';
  const uri = incoming.authority() ?? 'localhost';
  const scheme = incoming.scheme()?.tag.toLowerCase() ?? 'http';
  const url = `${scheme}://${uri}${path}`;
  logger.log(`Creating ${method.toUpperCase()} request for URL: ${url}`);

  const headers = new Headers();
  for (const [key, value] of incoming.headers().entries()) {
    headers.append(key, new TextDecoder().decode(value));
  }

  if (method === 'head' || method === 'get') {
    return new Request(url, {method, headers});
  }

  const body = createReadableStream(incoming.consume().stream());
  return new Request(url, {method, headers, body});
}

function createReadableStream(input: InputStream): ReadableStream {
  const logger = logging.createLogger('createReadableStream()');
  return new ReadableStream({
    start(controller) {
      let chunk: Uint8Array<ArrayBufferLike> | undefined;
      logger.log('Starting to read from input stream');

      do {
        try {
          chunk = input.blockingRead(WASI_IO_READ_MAX_BYTES);
          if (chunk?.length > 0) controller.enqueue(chunk);
          logger.log('Read chunk: ' + chunk?.length);
        } catch (err) {
          if ((err as any)?.payload?.tag !== 'closed') {
            logger.error('Error reading from input stream: ' + err);
            throw err;
          }
          chunk = new Uint8Array(0);
        }
      } while (chunk?.length !== 0);

      logger.log('Input stream closed');
      controller.close();
    },
  });
}

export async function createResponse(res: Response, param: ResponseOutparam) {
  const logger = logging.createLogger('createResponse()');
  logger.log('Creating response');
  const textEncoder = new TextEncoder();
  const headers = Fields.fromList(
    Array.from(res.headers.entries()).map(([key, value]) => [key, textEncoder.encode(value)]),
  );
  const response = new OutgoingResponse(headers);
  response.setStatusCode(res.status);
  const body = response.body();
  const responseStream = body.write();

  if (res.body) {
    const bodyContent = res.body.getReader();
    try {
      while (true) {
        const {done, value} = await bodyContent.read();
        if (done) break;
        responseStream.blockingWriteAndFlush(value);
      }
    } finally {
      // @ts-ignore: This is required in order to dispose the stream before we return
      responseStream[Symbol.dispose]();
      bodyContent.releaseLock();
    }
  } else {
    const text = await res.text();
    responseStream.blockingWriteAndFlush(textEncoder.encode(text));
  }

  OutgoingBody.finish(body, undefined);
  ResponseOutparam.set(param, {tag: 'ok', val: response});

  logger.log('Response created successfully: ' + res.status);
}
