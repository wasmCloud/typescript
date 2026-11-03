// componentize-qjs runtime shapes for WIT streams/futures. The generated
// guest types describe these loosely; at runtime a stream<u8> yields
// Uint8Array chunks and a future is read with `.read()`, not awaited.
// Outgoing stream<u8> values are passed as async iterables so they are
// lowered to the exact stream type each function expects.
export interface ByteStreamReadable extends AsyncIterator<Uint8Array> {
    drop(): void;
}
export interface FutureReadable<T> {
    read(): Promise<T>;
    drop(): void;
}

/**
 * Buffers the chunks of a stream<u8> so the protocol can read exact byte
 * counts across chunk boundaries.
 */
export class ByteReader {
    private buffered: Uint8Array = new Uint8Array(0);

    constructor(private readonly stream: ByteStreamReadable) {}

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
        const b = await this.readExact(4);
        return ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
    }

    /** Read until the stream ends. */
    async readAll(): Promise<Uint8Array> {
        const chunks: Uint8Array[] = [this.buffered];
        let total = this.buffered.length;
        while (true) {
            const { done, value } = await this.stream.next();
            if (done) break;
            chunks.push(value);
            total += value.length;
        }
        const out = new Uint8Array(total);
        let off = 0;
        for (const c of chunks) {
            out.set(c, off);
            off += c.length;
        }
        this.buffered = new Uint8Array(0);
        return out;
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
