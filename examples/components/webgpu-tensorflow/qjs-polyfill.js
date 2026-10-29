// Globals the QuickJS engine (jco componentize --backend qjs) lacks, shared by
// the service and the component.

// TextEncoder/TextDecoder: UTF-8 is all we need.
if (typeof globalThis.TextEncoder === "undefined") {
    globalThis.TextEncoder = class TextEncoder {
        get encoding() {
            return "utf-8";
        }
        encode(str = "") {
            str = String(str);
            // At most 3 bytes per UTF-16 code unit.
            const out = new Uint8Array(str.length * 3);
            let n = 0;
            for (const ch of str) {
                const c = ch.codePointAt(0);
                if (c < 0x80) {
                    out[n++] = c;
                } else if (c < 0x800) {
                    out[n++] = 0xc0 | (c >> 6);
                    out[n++] = 0x80 | (c & 0x3f);
                } else if (c < 0x10000) {
                    out[n++] = 0xe0 | (c >> 12);
                    out[n++] = 0x80 | ((c >> 6) & 0x3f);
                    out[n++] = 0x80 | (c & 0x3f);
                } else {
                    out[n++] = 0xf0 | (c >> 18);
                    out[n++] = 0x80 | ((c >> 12) & 0x3f);
                    out[n++] = 0x80 | ((c >> 6) & 0x3f);
                    out[n++] = 0x80 | (c & 0x3f);
                }
            }
            return out.slice(0, n);
        }
    };
}
if (typeof globalThis.TextDecoder === "undefined") {
    globalThis.TextDecoder = class TextDecoder {
        get encoding() {
            return "utf-8";
        }
        decode(input) {
            if (input == null) {
                return "";
            }
            const bytes = input instanceof Uint8Array
                ? input
                : ArrayBuffer.isView(input)
                    ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
                    : new Uint8Array(input);
            // Collect UTF-16 code units and convert them in chunks; building the
            // string one character at a time is very slow on large inputs.
            const parts = [];
            const units = [];
            for (let i = 0; i < bytes.length;) {
                const b = bytes[i++];
                let c;
                if (b < 0x80) {
                    c = b;
                } else if (b < 0xe0) {
                    c = ((b & 0x1f) << 6) | (bytes[i++] & 0x3f);
                } else if (b < 0xf0) {
                    c = ((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
                } else {
                    c = ((b & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
                }
                if (c >= 0x10000) {
                    c -= 0x10000;
                    units.push(0xd800 | (c >> 10), 0xdc00 | (c & 0x3ff));
                } else {
                    units.push(c);
                }
                if (units.length >= 8192) {
                    parts.push(String.fromCharCode.apply(null, units));
                    units.length = 0;
                }
            }
            parts.push(String.fromCharCode.apply(null, units));
            return parts.join("");
        }
    };
}

// crypto: only getRandomValues, which is all TF.js's seedrandom needs (via
// unenv's node:crypto, which wraps globalThis.crypto). Not cryptographically
// secure: it's built on Math.random.
if (typeof globalThis.crypto === "undefined") {
    globalThis.crypto = {
        getRandomValues(array) {
            for (let i = 0; i < array.length; i++) {
                array[i] = Math.floor(Math.random() * 256);
            }
            return array;
        },
    };
}

// console: write lines to WASI stdout/stderr.
// Each output gets one long-lived stream<u8>, opened on first use, and
// lines are queued so they stay in order.
import { writeViaStream as writeStdout } from "wasi:cli/stdout@0.3.0";
import { writeViaStream as writeStderr } from "wasi:cli/stderr@0.3.0";

if (typeof globalThis.console === "undefined") {
    const format = (args) => args.map((a) => {
        if (typeof a === "string") return a;
        if (a instanceof Error) return a.stack ? `${a.message}\n${a.stack}` : String(a.message);
        try {
            return JSON.stringify(a);
        } catch {
            return String(a);
        }
    }).join(" ");
    // Pass an async iterable rather than a wit.Stream: componentize-qjs then
    // lowers it to the exact stream<u8> type the import expects.
    const makeWriter = (writeViaStream) => {
        let pending = [];
        let wake = null;
        let started = false;
        let drained = [];
        async function* lines() {
            while (true) {
                if (pending.length === 0) {
                    // Every yielded chunk has been pulled by the host by now.
                    drained.splice(0).forEach((resolve) => resolve());
                    await new Promise((resolve) => { wake = resolve; });
                    continue;
                }
                const batch = pending;
                pending = [];
                for (const bytes of batch) yield bytes;
            }
        }
        const write = (...args) => {
            pending.push(new TextEncoder().encode(format(args) + "\n"));
            if (wake) {
                const w = wake;
                wake = null;
                w();
            }
            if (!started) {
                started = true;
                writeViaStream(lines());
            }
        };
        // Idle (never started, or waiting with nothing queued) means drained.
        write.flush = () => (!started || (wake && pending.length === 0)
            ? Promise.resolve()
            : new Promise((resolve) => drained.push(resolve)));
        return write;
    };
    const out = makeWriter(writeStdout);
    const err = makeWriter(writeStderr);
    globalThis.console = {
        log: out, info: out, debug: out, trace: out, warn: err, error: err,
        // Not standard: resolves once queued lines have been handed to the host.
        flush: () => Promise.all([out.flush(), err.flush()]),
    };
}
