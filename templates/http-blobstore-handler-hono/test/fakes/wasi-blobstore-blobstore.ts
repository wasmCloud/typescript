// An in-memory wasi:blobstore/blobstore.
// Each container is a map of object names to their bytes.
import type { FakeIncomingValue, FakeOutgoingValue } from './wasi-blobstore-types.js';

const containers = new Map<string, Map<string, Uint8Array>>();

function makeContainer(name: string, objects: Map<string, Uint8Array>) {
  function get(object: string): Uint8Array {
    const bytes = objects.get(object);
    if (!bytes) {
      throw new Error(`object '${object}' does not exist in container '${name}'`);
    }
    return bytes;
  }

  return {
    name(): string {
      return name;
    },
    hasObject(object: string): boolean {
      return objects.has(object);
    },
    objectInfo(object: string) {
      return { name: object, container: name, size: BigInt(get(object).length), createdAt: 0n };
    },
    // `end` is inclusive, as in wasi:blobstore.
    getData(object: string, start: bigint, end: bigint): FakeIncomingValue {
      return { bytes: get(object).slice(Number(start), Number(end) + 1) };
    },
    writeData(object: string, data: FakeOutgoingValue): void {
      data.commit = (bytes) => objects.set(object, bytes);
    },
    deleteObject(object: string): void {
      objects.delete(object);
    },
    /** Lists names in pages of at most `len`, flagging the last page as done. */
    listObjects() {
      const names = [...objects.keys()];
      return {
        readStreamObjectNames(len: bigint): [string[], boolean] {
          const batch = names.splice(0, Number(len));
          return [batch, names.length === 0];
        },
      };
    },
  };
}

export function containerExists(name: string): boolean {
  return containers.has(name);
}

export function createContainer(name: string) {
  if (containers.has(name)) {
    throw new Error(`container '${name}' already exists`);
  }
  containers.set(name, new Map());
  return getContainer(name);
}

export function getContainer(name: string) {
  const objects = containers.get(name);
  if (!objects) {
    throw new Error(`container '${name}' does not exist`);
  }
  return makeContainer(name, objects);
}
