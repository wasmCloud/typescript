/**
 * TCP client for the style-transfer service: sends two JPEGs, reads back the
 * stylized JPEG.
 *
 * Wire protocol (binary, big-endian, one request per connection):
 *
 *   Request:  u32 contentLen | content JPEG | u32 styleLen | style JPEG
 *   Response: u8 status (0=ok, 1=err) | u32 payloadLen | payload
 */

import { TcpSocket } from 'wasi:sockets/types@0.3.0';
import type { Ipv4Address } from 'wasi:sockets/types@0.3.0';

import { ByteReader, u32BE } from './streams';
import type { ByteStreamReadable, FutureReadable } from './streams';

const SERVICE_HOST: Ipv4Address = [127, 0, 0, 1];
const SERVICE_PORT = 7878;

export async function callStylizeService(contentJpeg: Uint8Array, styleJpeg: Uint8Array): Promise<Uint8Array> {
    const socket = TcpSocket.create('ipv4');
    try {
        await socket.connect({ tag: 'ipv4', val: { port: SERVICE_PORT, address: SERVICE_HOST } });

        const request = (async function* () {
            yield u32BE(contentJpeg.length);
            yield contentJpeg;
            yield u32BE(styleJpeg.length);
            yield styleJpeg;
        })();
        const sent = socket.send(request as never) as unknown as FutureReadable<unknown>;

        const [data, received] = socket.receive() as unknown as [ByteStreamReadable, FutureReadable<unknown>];
        try {
            const reader = new ByteReader(data);
            const status = (await reader.readExact(1))[0];
            const payloadLen = await reader.readU32BE();
            const payload = await reader.readExact(payloadLen);

            const sendResult = (await sent.read()) as { tag: 'ok' | 'err'; val?: unknown } | undefined;
            if (sendResult?.tag === 'err') throw new Error(`send failed: ${String(sendResult.val)}`);

            if (status !== 0) {
                throw new Error(new TextDecoder().decode(payload));
            }
            return payload;
        } finally {
            data.drop();
            received.drop();
        }
    } finally {
        // tsconfig targets es2022, whose lib has no Symbol.dispose typing.
        const dispose = (Symbol as unknown as { dispose: symbol }).dispose;
        (socket as unknown as Record<symbol, () => void>)[dispose]();
    }
}
