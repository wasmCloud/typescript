// wasi:http@0.3.0 helpers for reading request bodies and building responses.

import { Fields, Request, Response } from 'wasi:http/types@0.3.0';

import { ByteReader } from './streams';
import type { ByteStreamReadable, FutureReadable } from './streams';

declare const wit: {
    Future: {
        from(value: unknown, type: unknown): { readable: unknown };
        RESULT_OPTION_OTHER_ERROR_CODE: unknown;
        RESULT_VOID_WASI_HTTP_TYPES_0_3_0_ERROR_CODE: unknown;
    };
};

export async function readRequestBody(request: Request): Promise<Uint8Array> {
    // Tell the host we consumed the body successfully once we're done reading.
    const done = wit.Future.from({ tag: 'ok' }, wit.Future.RESULT_VOID_WASI_HTTP_TYPES_0_3_0_ERROR_CODE);
    const [body, trailers] = Request.consumeBody(request, done.readable as never) as unknown as [
        ByteStreamReadable,
        FutureReadable<unknown>,
    ];
    try {
        return await new ByteReader(body).readAll();
    } finally {
        body.drop();
        trailers.drop();
    }
}

export function respond(status: number, contentType: string, body: Uint8Array): Response {
    const headers = Fields.fromList([['content-type', new TextEncoder().encode(contentType)]]);
    const contents = (async function* () { yield body; })();
    const trailers = wit.Future.from({ tag: 'ok', val: null }, wit.Future.RESULT_OPTION_OTHER_ERROR_CODE);
    const [response] = Response.new(headers, contents as never, trailers.readable as never);
    response.setStatusCode(status);
    return response;
}

export function respondJson(status: number, value: unknown): Response {
    return respond(status, 'application/json', new TextEncoder().encode(JSON.stringify(value)));
}
