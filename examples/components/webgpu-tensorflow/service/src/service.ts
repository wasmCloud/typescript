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
 * The service binds to 127.0.0.1:7878 (loopback only — services are not
 * reachable from outside the host).
 */

import { TcpSocket } from 'wasi:sockets/types@0.3.0';
import type { Ipv4Address } from 'wasi:sockets/types@0.3.0';

import { Stylizer } from './image-stylizer';
import { ByteReader, sendStatus } from './streams';
import type { ByteStreamReadable, FutureReadable } from './streams';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PORT = 7878;
// Loopback only. Under wasi:sockets@0.3 the host denies binding 0.0.0.0
// (access-denied), so bind 127.0.0.1 explicitly.
const BIND_ADDR: Ipv4Address = [127, 0, 0, 1];

// Cap incoming JPEGs to a sane size so a malformed length prefix can't make us
// spin forever. The frontend resizes content to ~256px and style to 256x256
// before sending, so a few MB is more than enough headroom.
const MAX_JPEG_BYTES = 16 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Connection handler
// ---------------------------------------------------------------------------

async function handleConnection(stylizer: Stylizer, conn: TcpSocket): Promise<void> {
    const [data, received] = conn.receive() as unknown as [ByteStreamReadable, FutureReadable<unknown>];
    const reader = new ByteReader(data);
    let contentJpeg: Uint8Array;
    let styleJpeg: Uint8Array;

    try {
        try {
            const contentLen = await reader.readU32BE();
            if (contentLen === 0 || contentLen > MAX_JPEG_BYTES) {
                throw new Error(`invalid content length: ${contentLen}`);
            }
            contentJpeg = await reader.readExact(contentLen);

            const styleLen = await reader.readU32BE();
            if (styleLen === 0 || styleLen > MAX_JPEG_BYTES) {
                throw new Error(`invalid style length: ${styleLen}`);
            }
            styleJpeg = await reader.readExact(styleLen);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            try {
                await sendStatus(conn, 1, new TextEncoder().encode(`bad request: ${msg}`));
            } catch { /* peer gone */ }
            return;
        }

        try {
            const result = await stylizer.stylize({ contentJpeg, styleJpeg, styleRatio: 1.0 });
            await sendStatus(conn, 0, result);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('[stylize-service] inference failed:', msg);
            try {
                await sendStatus(conn, 1, new TextEncoder().encode(`stylize failed: ${msg}`));
            } catch { /* peer gone */ }
        }
    } finally {
        data.drop();
        received.drop();
        // tsconfig targets es2022, whose lib has no Symbol.dispose typing.
        const dispose = (Symbol as unknown as { dispose: symbol }).dispose;
        (conn as unknown as Record<symbol, () => void>)[dispose]();
    }
}

// ---------------------------------------------------------------------------
// wasi:cli/run export
// ---------------------------------------------------------------------------

async function serve(): Promise<void> {
    // Initialize TF/WebGPU and load model weights once. Keeps the GPU
    // context warm and avoids per-request model load (~seconds).
    console.log('[stylize-service] initializing TensorFlow + WebGPU…');
    const tInit = performance.now();
    const stylizer = await Stylizer.initialize();
    console.log(`[stylize-service] ready in ${(performance.now() - tInit).toFixed(0)}ms`);

    const socket = TcpSocket.create('ipv4');
    socket.bind({ tag: 'ipv4', val: { port: PORT, address: BIND_ADDR } });
    const connections = socket.listen();

    console.log(`[stylize-service] listening on port ${PORT}`);

    // Connections are handled one at a time. QuickJS is single-threaded,
    // and inference saturates the GPU anyway.
    for await (const conn of connections) {
        await handleConnection(stylizer, conn);
    }
}

export const run = {
    async run(): Promise<void> {
        try {
            await serve();
        } catch (err) {
            const payload = (err as { payload?: unknown })?.payload;
            console.error('[stylize-service] fatal:', err instanceof Error ? err.message : String(err), payload === undefined ? '' : JSON.stringify(payload));
            // console is asynchronous on QuickJS; let the message reach the host before exiting.
            await (console as unknown as { flush?: () => Promise<void> }).flush?.();
            throw err;
        }
    },
};
