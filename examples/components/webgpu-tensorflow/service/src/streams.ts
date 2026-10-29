import type { TcpSocket } from 'wasi:sockets/types@0.3.0';

// componentize-qjs runtime shapes for WIT streams/futures. The generated
// guest types describe these loosely; at runtime a stream<u8> yields
// Uint8Array chunks and a future is read with `.read()`, not awaited.
export interface ByteStreamReadable extends AsyncIterator<Uint8Array> {
    drop(): void;
}
export interface FutureReadable<T> {
    read(): Promise<T>;
    drop(): void;
}

/**
 * Buffers the chunks of a wasi:sockets stream<u8> so the protocol can read
 * exact byte counts across chunk boundaries.
 */
export class ByteReader {
    private buffered: Uint8Array = new Uint8Array(0);

    constructor(private readonly stream: ByteStreamReadable) {}

    /**
     * Read exactly `len` bytes, pulling chunks as needed. Throws if the
     * stream closes before all bytes arrive.
     */
    async readExact(len: number): Promise<Uint8Array> {
        const out = new Uint8Array(len);
        let filled = 0;
        while (filled < len) {
            if (this.buffered.length === 0) {
                const { done, value } = await this.stream.next();
                if (done) throw new Error(`unexpected EOF after ${filled}/${len} bytes`);
                this.buffered = value;
                continue;
            }
            const take = Math.min(len - filled, this.buffered.length);
            out.set(this.buffered.subarray(0, take), filled);
            this.buffered = this.buffered.subarray(take);
            filled += take;
        }
        return out;
    }

    async readU32BE(): Promise<number> {
        const bytes = await this.readExact(4);
        return ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
    }
}

export function u32BE(value: number): Uint8Array {
    return new Uint8Array([
        (value >>> 24) & 0xff,
        (value >>> 16) & 0xff,
        (value >>> 8) & 0xff,
        value & 0xff,
    ]);
}

/** Send one framed response on `conn` and wait for the host to finish sending it. */
export async function sendStatus(conn: TcpSocket, status: 0 | 1, payload: Uint8Array): Promise<void> {
    const frame = new Uint8Array(5 + payload.length);
    frame[0] = status;
    frame.set(u32BE(payload.length), 1);
    frame.set(payload, 5);

    // An async iterable is lowered to the exact stream<u8> type `send`
    // expects; a wit.Stream of another stream<u8> type is rejected by the host.
    const body = (async function* () { yield frame; })();
    const sent = conn.send(body as never) as unknown as FutureReadable<unknown>;
    // result<_, error-code>: nested results come back as { tag, val }.
    const result = (await sent.read()) as { tag: 'ok' | 'err'; val?: unknown } | undefined;
    if (result?.tag === 'err') throw new Error(`send failed: ${String(result.val)}`);
}
