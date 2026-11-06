// In-memory descriptors for wasi:filesystem/types.
// Only the calls the component makes are supported.
// Failures throw errors carrying a wasi:filesystem error code as `payload`,
// like jco's generated bindings do.

type Node =
  { kind: 'file'; bytes: Uint8Array } | { kind: 'directory'; children: Map<string, Node> };

interface OpenFlags {
  create?: boolean;
  directory?: boolean;
  exclusive?: boolean;
  truncate?: boolean;
}

interface DescriptorFlags {
  read?: boolean;
  write?: boolean;
}

/** The most bytes one `write` call takes; tests lower it to simulate short writes. */
export const limits = { maxWrite: Infinity };

function fsError(code: string): Error {
  return Object.assign(new Error(code), { payload: code });
}

function makeDescriptor(node: Node, flags: DescriptorFlags = { read: true, write: true }) {
  function asFile() {
    if (node.kind !== 'file') {
      throw fsError('is-directory');
    }
    return node;
  }

  function asDirectory() {
    if (node.kind !== 'directory') {
      throw fsError('not-directory');
    }
    return node;
  }

  return {
    readDirectory() {
      const entries = [...asDirectory().children].map(([name, child]) => ({
        name,
        type: child.kind === 'file' ? 'regular-file' : 'directory',
      }));
      return {
        readDirectoryEntry() {
          return entries.shift();
        },
      };
    },

    openAt(
      _pathFlags: { symlinkFollow?: boolean },
      path: string,
      openFlags: OpenFlags,
      descriptorFlags: DescriptorFlags,
    ) {
      const { children } = asDirectory();
      if (path === '' || path.includes('/') || path === '.' || path === '..') {
        throw fsError('not-permitted');
      }
      let child = children.get(path);
      if (child && openFlags.create && openFlags.exclusive) {
        throw fsError('exist');
      }
      if (!child) {
        if (!openFlags.create) {
          throw fsError('no-entry');
        }
        child = openFlags.directory
          ? { kind: 'directory', children: new Map() }
          : { kind: 'file', bytes: new Uint8Array() };
        children.set(path, child);
      }
      if (openFlags.truncate && child.kind === 'file') {
        child.bytes = new Uint8Array();
      }
      return makeDescriptor(child, descriptorFlags);
    },

    read(length: bigint, offset: bigint): [Uint8Array, boolean] {
      if (!flags.read) {
        throw fsError('bad-descriptor');
      }
      const { bytes } = asFile();
      const start = Number(offset);
      const end = Math.min(bytes.length, start + Number(length));
      return [bytes.slice(start, end), end >= bytes.length];
    },

    write(buffer: Uint8Array, offset: bigint): bigint {
      if (!flags.write) {
        throw fsError('bad-descriptor');
      }
      const file = asFile();
      buffer = buffer.subarray(0, Math.min(buffer.length, limits.maxWrite));
      const start = Number(offset);
      const next = new Uint8Array(Math.max(file.bytes.length, start + buffer.length));
      next.set(file.bytes);
      next.set(buffer, start);
      file.bytes = next;
      return BigInt(buffer.length);
    },
  };
}

export type Descriptor = ReturnType<typeof makeDescriptor>;

/** A new, empty directory descriptor. */
export function makeDirectory(): Descriptor {
  return makeDescriptor({ kind: 'directory', children: new Map() });
}
