import { Hono } from "hono";
import { stylizeImage } from "./image-stylizer";
import assets from "./static/static";
import zod from "zod";

const Image = zod.object({
    dataUrl: zod.string(),
    height: zod.number(),
    width: zod.number(),
});

const StylizeRequest = zod.object({
    contentImage: Image,
    styleImage: Image,
});

export function setupRoutes(app: Hono) {
    app.get("/", (c) => {
        return c.json({ msg: "Hello World!" });
    });

    app.post("/stylize", async (c) => {
        const requestBody = await c.req.json();
        const stylizeRequest = StylizeRequest.parse(requestBody);

        const contentImage = dataUrlToBlob(stylizeRequest.contentImage.dataUrl);
        const styleImage = dataUrlToBlob(stylizeRequest.styleImage.dataUrl);

        const start = performance.now();
        const stylizedImage = await stylizeImage({
            contentImage: {
                blob: contentImage,
                height: requestBody.contentImage.height,
                width: requestBody.contentImage.width,
            },
            styleImage: {
                blob: styleImage,
                height: requestBody.styleImage.height,
                width: requestBody.styleImage.width,
            },
            styleRatio: 1.0,
        });
        const timeTaken = performance.now() - start;
        console.log("seconds taken", (timeTaken / 1000));
        if (!stylizedImage) {
            return c.json({ error: "Failed to stylize image" }, 500);
        }

        return c.body(
            await stylizedImage.arrayBuffer(),
            200,
            { 'Content-Type': stylizedImage.type }
        );
    });

    // static assets
    app.get("*", async (c) => {
        const path = c.req.path;
        if(path in assets) {
            const blob = dataUrlToBlob(assets[path]);
            return c.body(
                await blob.arrayBuffer(),
                200,
                { 'Content-Type': blob.type }
            );
        }
        return c.notFound();
    });
}

function dataUrlToBlob(dataUrl: string): Blob {
    if (!dataUrl.startsWith('data:')) {
        throw new Error('Invalid data URL');
    }
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex === -1) {
        throw new Error('Invalid data URL');
    }
    const header = dataUrl.slice(0, commaIndex);
    const data = dataUrl.slice(commaIndex + 1);
    if (!data) {
        throw new Error('Invalid data URL');
    }

    const mimeMatch = header.match(/^data:([^;]+)/);
    const mimeType = mimeMatch ? mimeMatch[1].trim() : 'application/octet-stream';
    const isBase64 = header.includes('base64');
  
    if (isBase64) {
        let binaryString: string;
        try {
            binaryString = atob(data);
        } catch {
            throw new Error('Invalid base64 data in data URL');
        }
    
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return new Blob([bytes], { type: mimeType });
    } else {
        let decodedData: string;
        try {
            decodedData = decodeURIComponent(data);
        } catch {
            throw new Error('Invalid URI-encoded data in data URL');
        }
        return new Blob([decodedData], { type: mimeType });
    }
}