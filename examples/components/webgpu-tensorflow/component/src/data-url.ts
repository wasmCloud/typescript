export function dataUrlToBytes(dataUrl: string): Uint8Array {
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

export function dataUrlMimeType(dataUrl: string): string {
    const header = dataUrl.slice(0, dataUrl.indexOf(','));
    return (header.match(/^data:([^;]+)/)?.[1] ?? 'application/octet-stream').trim();
}
