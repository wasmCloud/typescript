/**
 * HTTP front-end for the style-transfer service.
 *
 *   GET  /*       — static UI assets (HTML, CSS, JS, sample JPEGs)
 *   POST /stylize — accepts JSON with two data-URL JPEGs, forwards them to
 *                   the service over loopback TCP, returns the stylized JPEG
 *
 * The style-transfer service runs as a wasmCloud service workload on the same
 * host. It listens on 127.0.0.1:7878. Both this component and the service
 * share the same in-process loopback network.
 */

import '../../qjs-polyfill.js';
import type { Request, Response } from 'wasi:http/types@0.3.0';

import zod from 'zod';

import { dataUrlMimeType, dataUrlToBytes } from './data-url';
import { readRequestBody, respond, respondJson } from './http';
import { callStylizeService } from './service-client';
import assets from './static/static';

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const Image = zod.object({
    dataUrl: zod.string(),
    height: zod.number(),
    width: zod.number(),
});

const StylizeRequest = zod.object({
    contentImage: Image,
    styleImage: Image,
});

async function stylize(request: Request): Promise<Response> {
    let contentJpeg: Uint8Array;
    let styleJpeg: Uint8Array;
    try {
        const raw = new TextDecoder().decode(await readRequestBody(request));
        const body = StylizeRequest.parse(JSON.parse(raw));
        contentJpeg = dataUrlToBytes(body.contentImage.dataUrl);
        styleJpeg = dataUrlToBytes(body.styleImage.dataUrl);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return respondJson(400, { error: `Bad request: ${msg}` });
    }

    const start = performance.now();
    let stylized: Uint8Array;
    try {
        stylized = await callStylizeService(contentJpeg, styleJpeg);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[component] service call failed:', msg);
        return respondJson(502, { error: `Service error: ${msg}` });
    }
    console.log(`[component] stylize roundtrip: ${((performance.now() - start) / 1000).toFixed(2)}s`);

    return respond(200, 'image/jpeg', stylized);
}

function staticAsset(path: string): Response {
    if (path in assets) {
        const dataUrl = assets[path];
        return respond(200, dataUrlMimeType(dataUrl), dataUrlToBytes(dataUrl));
    }
    return respond(404, 'text/plain', new TextEncoder().encode('404 Not Found'));
}

// ---------------------------------------------------------------------------
// wasi:http/handler export
// ---------------------------------------------------------------------------

export const handler = {
    async handle(request: Request): Promise<Response> {
        const method = request.getMethod().tag;
        const path = (request.getPathWithQuery() ?? '/').split('?')[0];

        if (method === 'post' && path === '/stylize') {
            return stylize(request);
        }
        if (method === 'get') {
            return staticAsset(path);
        }
        return respond(405, 'text/plain', new TextEncoder().encode('405 Method Not Allowed'));
    },
};
