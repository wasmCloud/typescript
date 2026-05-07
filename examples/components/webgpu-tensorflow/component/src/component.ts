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
 *
 * Wire protocol (binary, big-endian, one request per connection):
 *
 *   Request:  u32 contentLen | content JPEG | u32 styleLen | style JPEG
 *   Response: u8 status (0=ok, 1=err) | u32 payloadLen | payload
 */

import { instanceNetwork } from 'wasi:sockets/instance-network@0.2.3';
import { createTcpSocket } from 'wasi:sockets/tcp-create-socket@0.2.3';
import type { InputStream, OutputStream } from 'wasi:io/streams@0.2.3';
import type { Ipv4Address } from 'wasi:sockets/network@0.2.3';

import { Hono } from 'hono';
import {
    fire,
    incomingHandler,
} from '@bytecodealliance/jco-std/wasi/0.2.3/http/adapters/hono/server';
import zod from 'zod';

import assets from './static/static';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SERVICE_HOST: Ipv4Address = [127, 0, 0, 1];
const SERVICE_PORT = 7878;

// wasi:io/streams.blocking-write-and-flush is capped at 4096 bytes per call,
// so JPEG payloads have to be sent as chunks.
const WRITE_CHUNK = 4096;

// ---------------------------------------------------------------------------
// Stream helpers
// ---------------------------------------------------------------------------

function writeAll(stream: OutputStream, bytes: Uint8Array): void {
    for (let off = 0; off < bytes.length; off += WRITE_CHUNK) {
        stream.blockingWriteAndFlush(bytes.subarray(off, Math.min(off + WRITE_CHUNK, bytes.length)));
    }
}

function readExact(stream: InputStream, len: number): Uint8Array {
    const out = new Uint8Array(len);
    let filled = 0;
    while (filled < len) {
        const chunk = stream.blockingRead(BigInt(len - filled));
        if (chunk.length === 0) throw new Error(`unexpected EOF after ${filled}/${len} bytes`);
        out.set(chunk, filled);
        filled += chunk.length;
    }
    return out;
}

function readU32BE(stream: InputStream): number {
    const b = readExact(stream, 4);
    return ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
}

function u32BE(value: number): Uint8Array {
    return new Uint8Array([
        (value >>> 24) & 0xff,
        (value >>> 16) & 0xff,
        (value >>> 8) & 0xff,
        value & 0xff,
    ]);
}

// ---------------------------------------------------------------------------
// TCP client: send JPEGs to the service, read back the stylized JPEG
// ---------------------------------------------------------------------------

function callStylizeService(contentJpeg: Uint8Array, styleJpeg: Uint8Array): Uint8Array {
    const network = instanceNetwork();
    const socket = createTcpSocket('ipv4');

    socket.startConnect(network, {
        tag: 'ipv4',
        val: { port: SERVICE_PORT, address: SERVICE_HOST },
    });
    socket.subscribe().block();
    const [inputStream, outputStream] = socket.finishConnect();

    writeAll(outputStream, u32BE(contentJpeg.length));
    writeAll(outputStream, contentJpeg);
    writeAll(outputStream, u32BE(styleJpeg.length));
    writeAll(outputStream, styleJpeg);

    const status = readExact(inputStream, 1)[0];
    const payloadLen = readU32BE(inputStream);
    const payload = readExact(inputStream, payloadLen);

    if (status !== 0) {
        throw new Error(new TextDecoder().decode(payload));
    }
    return payload;
}

// ---------------------------------------------------------------------------
// Data-URL helpers
// ---------------------------------------------------------------------------

function dataUrlToBytes(dataUrl: string): Uint8Array {
    if (!dataUrl.startsWith('data:')) throw new Error('Invalid data URL');
    const comma = dataUrl.indexOf(',');
    if (comma === -1) throw new Error('Invalid data URL');
    const header = dataUrl.slice(0, comma);
    const body = dataUrl.slice(comma + 1);
    if (!header.includes('base64')) throw new Error('Only base64 data URLs are supported');

    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function dataUrlToBlob(dataUrl: string): Blob {
    if (!dataUrl.startsWith('data:')) throw new Error('Invalid data URL');
    const comma = dataUrl.indexOf(',');
    const header = dataUrl.slice(0, comma);
    const mime = (header.match(/^data:([^;]+)/)?.[1] ?? 'application/octet-stream').trim();
    return new Blob([dataUrlToBytes(dataUrl) as BlobPart], { type: mime });
}

// ---------------------------------------------------------------------------
// Hono app
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

const app = new Hono();

app.post('/stylize', async (c) => {
    const body = StylizeRequest.parse(await c.req.json());

    const contentJpeg = dataUrlToBytes(body.contentImage.dataUrl);
    const styleJpeg = dataUrlToBytes(body.styleImage.dataUrl);

    const start = performance.now();
    let stylized: Uint8Array;
    try {
        stylized = callStylizeService(contentJpeg, styleJpeg);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[component] service call failed:', msg);
        return c.json({ error: `Service error: ${msg}` }, 502);
    }
    console.log(`[component] stylize roundtrip: ${((performance.now() - start) / 1000).toFixed(2)}s`);

    return c.body(new Uint8Array(stylized).buffer, 200, {
        'Content-Type': 'image/jpeg',
    });
});

app.get('*', async (c) => {
    const path = c.req.path;
    if (path in assets) {
        const blob = dataUrlToBlob(assets[path]);
        return c.body(await blob.arrayBuffer(), 200, { 'Content-Type': blob.type });
    }
    return c.notFound();
});

// ---------------------------------------------------------------------------
// wasi:http/incoming-handler export
// ---------------------------------------------------------------------------

fire(app);
export { incomingHandler };
