/**
 * Style-transfer TCP service.
 *
 * A wasmCloud v2 service that exports wasi:cli/run. The runtime calls run()
 * once on startup and expects it to block indefinitely — the server loop runs
 * here, with the loaded TF/WebGPU models held in memory between connections.
 *
 * Binary protocol (one request per connection, big-endian):
 *
 *   Request:
 *     u32          contentJpegLen
 *     [N1] bytes   content JPEG
 *     u32          styleJpegLen
 *     [N2] bytes   style JPEG
 *
 *   Response:
 *     u8           status   (0 = ok, 1 = error)
 *     u32          payloadLen
 *     [N3] bytes   payload  (JPEG bytes when ok, UTF-8 message when error)
 *
 * The service binds to 0.0.0.0:7878. The wasmCloud runtime rewrites
 * unspecified-address binds to 127.0.0.1 (loopback only — services are not
 * reachable from outside the host).
 */

import { instanceNetwork } from 'wasi:sockets/instance-network@0.2.3';
import { createTcpSocket } from 'wasi:sockets/tcp-create-socket@0.2.3';
import type { TcpSocket } from 'wasi:sockets/tcp@0.2.3';
import type { InputStream, OutputStream } from 'wasi:io/streams@0.2.3';
import type { Ipv4Address } from 'wasi:sockets/network@0.2.3';

import { Stylizer } from './image-stylizer';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PORT = 7878;
// 0.0.0.0 — runtime rewrites to 127.0.0.1 for service workloads (loopback only)
const BIND_ADDR: Ipv4Address = [0, 0, 0, 0];

// Cap incoming JPEGs to a sane size so a malformed length prefix can't make us
// spin forever. The frontend resizes content to ~256px and style to 256x256
// before sending, so a few MB is more than enough headroom.
const MAX_JPEG_BYTES = 16 * 1024 * 1024;

// wasi:io/streams.blocking-write-and-flush is capped at 4096 bytes per call,
// so JPEG payloads have to be sent as chunks.
const WRITE_CHUNK = 4096;

// ---------------------------------------------------------------------------
// Stream helpers
// ---------------------------------------------------------------------------

/**
 * Read exactly `len` bytes from `stream`, looping as needed. Throws if the
 * stream closes before all bytes arrive.
 */
function readExact(stream: InputStream, len: number): Uint8Array {
    const out = new Uint8Array(len);
    let filled = 0;
    while (filled < len) {
        const remaining = len - filled;
        const chunk = stream.blockingRead(BigInt(remaining));
        if (chunk.length === 0) throw new Error(`unexpected EOF after ${filled}/${len} bytes`);
        out.set(chunk, filled);
        filled += chunk.length;
    }
    return out;
}

function readU32BE(stream: InputStream): number {
    const bytes = readExact(stream, 4);
    return ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
}

function writeAll(stream: OutputStream, bytes: Uint8Array): void {
    for (let off = 0; off < bytes.length; off += WRITE_CHUNK) {
        stream.blockingWriteAndFlush(bytes.subarray(off, Math.min(off + WRITE_CHUNK, bytes.length)));
    }
}

function u32BE(value: number): Uint8Array {
    return new Uint8Array([
        (value >>> 24) & 0xff,
        (value >>> 16) & 0xff,
        (value >>> 8) & 0xff,
        value & 0xff,
    ]);
}

function writeStatus(stream: OutputStream, status: 0 | 1, payload: Uint8Array): void {
    writeAll(stream, new Uint8Array([status]));
    writeAll(stream, u32BE(payload.length));
    writeAll(stream, payload);
}

// ---------------------------------------------------------------------------
// Connection handler
// ---------------------------------------------------------------------------

async function handleConnection(
    stylizer: Stylizer,
    inputStream: InputStream,
    outputStream: OutputStream,
): Promise<void> {
    let contentJpeg: Uint8Array;
    let styleJpeg: Uint8Array;

    try {
        const contentLen = readU32BE(inputStream);
        if (contentLen === 0 || contentLen > MAX_JPEG_BYTES) {
            throw new Error(`invalid content length: ${contentLen}`);
        }
        contentJpeg = readExact(inputStream, contentLen);

        const styleLen = readU32BE(inputStream);
        if (styleLen === 0 || styleLen > MAX_JPEG_BYTES) {
            throw new Error(`invalid style length: ${styleLen}`);
        }
        styleJpeg = readExact(inputStream, styleLen);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        try {
            writeStatus(outputStream, 1, new TextEncoder().encode(`bad request: ${msg}`));
        } catch { /* peer gone */ }
        return;
    }

    try {
        const result = await stylizer.stylize({ contentJpeg, styleJpeg, styleRatio: 1.0 });
        writeStatus(outputStream, 0, result);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[stylize-service] inference failed:', msg);
        try {
            writeStatus(outputStream, 1, new TextEncoder().encode(`stylize failed: ${msg}`));
        } catch { /* peer gone */ }
    }
}

// ---------------------------------------------------------------------------
// wasi:cli/run export
// ---------------------------------------------------------------------------

export const run = {
    async run(): Promise<void> {
        // Initialize TF/WebGPU and load model weights once. Keeps the GPU
        // context warm and avoids per-request model load (~seconds).
        console.log('[stylize-service] initializing TensorFlow + WebGPU…');
        const tInit = performance.now();
        const stylizer = await Stylizer.initialize();
        console.log(`[stylize-service] ready in ${(performance.now() - tInit).toFixed(0)}ms`);

        const network = instanceNetwork();
        const socket = createTcpSocket('ipv4');

        socket.startBind(network, { tag: 'ipv4', val: { port: PORT, address: BIND_ADDR } });
        socket.subscribe().block();
        socket.finishBind();

        socket.startListen();
        socket.subscribe().block();
        socket.finishListen();

        console.log(`[stylize-service] listening on port ${PORT}`);

        while (true) {
            socket.subscribe().block();
            let conn: TcpSocket, inputStream: InputStream, outputStream: OutputStream;
            try {
                [conn, inputStream, outputStream] = socket.accept();
            } catch {
                break;
            }
            void conn;

            // Connections are handled one at a time. SpiderMonkey is single-
            // threaded, and inference saturates the GPU anyway.
            await handleConnection(stylizer, inputStream, outputStream);
        }
    },
};
