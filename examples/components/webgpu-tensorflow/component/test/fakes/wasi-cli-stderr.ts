// Backs the QuickJS console polyfill, which Node doesn't need,
// so this only records what would have been written to stderr.

export const written: Uint8Array[] = [];

export async function writeViaStream(data: AsyncIterable<Uint8Array>): Promise<void> {
  for await (const chunk of data) {
    written.push(chunk);
  }
}
