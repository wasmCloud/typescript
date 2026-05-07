import { declareGlobals } from '@wasi-gfx/js-webgpu/globals';
import '../polyfill.js';

import jpeg from "jpeg-js";
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgpu';

import model_style_model_json from "../models/style/model.json";
import model_style_group1_shard1of9_bin from "../models/style/group1-shard1of9.bin";
import model_style_group1_shard2of9_bin from "../models/style/group1-shard2of9.bin";
import model_style_group1_shard3of9_bin from "../models/style/group1-shard3of9.bin";
import model_style_group1_shard4of9_bin from "../models/style/group1-shard4of9.bin";
import model_style_group1_shard5of9_bin from "../models/style/group1-shard5of9.bin";
import model_style_group1_shard6of9_bin from "../models/style/group1-shard6of9.bin";
import model_style_group1_shard7of9_bin from "../models/style/group1-shard7of9.bin";
import model_style_group1_shard8of9_bin from "../models/style/group1-shard8of9.bin";
import model_style_group1_shard9of9_bin from "../models/style/group1-shard9of9.bin";
import model_transformer_model_json from "../models/transformer/model.json";
import model_transformer_group1_shard1of2_bin from "../models/transformer/group1-shard1of2.bin";
import model_transformer_group1_shard2of2_bin from "../models/transformer/group1-shard2of2.bin";

const BACKEND = "webgpu";

// Decode the embedded base64 weight data URLs once at module load. These
// ArrayBuffers are large (the bulk of the wasm payload) and decoding them
// inside Stylizer.initialize() costs ~seconds on every realm reset.
const STYLE_WEIGHT_DATA: ArrayBuffer[] = [
    dataUrlToArrayBuffer(model_style_group1_shard1of9_bin),
    dataUrlToArrayBuffer(model_style_group1_shard2of9_bin),
    dataUrlToArrayBuffer(model_style_group1_shard3of9_bin),
    dataUrlToArrayBuffer(model_style_group1_shard4of9_bin),
    dataUrlToArrayBuffer(model_style_group1_shard5of9_bin),
    dataUrlToArrayBuffer(model_style_group1_shard6of9_bin),
    dataUrlToArrayBuffer(model_style_group1_shard7of9_bin),
    dataUrlToArrayBuffer(model_style_group1_shard8of9_bin),
    dataUrlToArrayBuffer(model_style_group1_shard9of9_bin),
];
const TRANSFORMER_WEIGHT_DATA: ArrayBuffer[] = [
    dataUrlToArrayBuffer(model_transformer_group1_shard1of2_bin),
    dataUrlToArrayBuffer(model_transformer_group1_shard2of2_bin),
];

interface StylizeRequest {
    contentJpeg: Uint8Array;
    styleJpeg: Uint8Array;
    styleRatio: number;
}

export class Stylizer {
    private styleModel: tf.GraphModel;
    private transformerModel: tf.GraphModel;

    private constructor(styleModel: tf.GraphModel, transformerModel: tf.GraphModel) {
        this.styleModel = styleModel;
        this.transformerModel = transformerModel;
    }

    public static async initialize(): Promise<Stylizer> {
        declareGlobals();
        setWashOverrides();

        await tf.setBackend(BACKEND);
        await tf.ready();
        if (tf.getBackend() !== BACKEND) {
            throw new Error("Backend mismatch. expected = " + BACKEND + ", actual = " + tf.getBackend());
        }
        const [styleModel, transformerModel] = await Promise.all([
            tf.loadGraphModel(
                tf.io.fromMemory({
                    modelTopology: model_style_model_json.modelTopology,
                    weightSpecs: model_style_model_json.weightsManifest.flatMap((g: any) => g.weights),
                    weightData: STYLE_WEIGHT_DATA,
                })
            ),
            tf.loadGraphModel(
                tf.io.fromMemory({
                    modelTopology: model_transformer_model_json.modelTopology,
                    weightSpecs: model_transformer_model_json.weightsManifest.flatMap((g: any) => g.weights),
                    weightData: TRANSFORMER_WEIGHT_DATA,
                })
            ),
        ]);

        // Warm up the WebGPU backend: the first predict() call compiles all
        // WGSL shaders and JIT-caches kernels (~17s on a typical desktop GPU).
        // Running a dummy inference here pays that cost at startup so user
        // requests don't.
        const tWarm = performance.now();
        const dummyStyle = tf.zeros([1, STYLE_SIDE, STYLE_SIDE, 3], "float32");
        const dummyContent = tf.zeros([1, CONTENT_MAX_SIDE, CONTENT_MAX_SIDE, 3], "float32");
        const warmOut = tf.tidy(() => {
            const bottleneck = styleModel.predict(dummyStyle) as tf.Tensor;
            return (transformerModel.predict([dummyContent, bottleneck]) as tf.Tensor).squeeze();
        });
        await warmOut.data();
        warmOut.dispose();
        dummyStyle.dispose();
        dummyContent.dispose();
        console.log(`[timing] GPU warmup: ${(performance.now() - tWarm).toFixed(0)}ms`);

        return new Stylizer(styleModel, transformerModel);
    }

    async stylize(req: StylizeRequest): Promise<Uint8Array> {
        const quality = 90;

        // Style model is fixed at its trained 256x256; transformer is fully-convolutional
        // so we cap content size to bound inference cost (scales with H*W).
        const tDecode = performance.now();
        const contentTensor = await decodeJpegToTensor(req.contentJpeg, "content");
        const styleTensor = await decodeJpegToTensor(req.styleJpeg, "style");
        console.log(`[timing] decode JPEGs and upload to GPU: ${(performance.now() - tDecode).toFixed(0)}ms`);

        const tInfer = performance.now();
        const stylizedTensor = await tf.tidy(() => {
            const styleBottleneck = this.styleModel.predict(styleTensor) as tf.Tensor;

            let finalBottleneck;
            if (req.styleRatio < 1.0) {
                const contentBottleneck = this.styleModel.predict(contentTensor) as tf.Tensor;
                finalBottleneck = tf.add(
                    tf.mul(styleBottleneck, req.styleRatio),
                    tf.mul(contentBottleneck, 1.0 - req.styleRatio),
                );
            } else {
                finalBottleneck = styleBottleneck;
            }

            const stylized = this.transformerModel.predict([
                contentTensor,
                finalBottleneck,
            ]) as tf.Tensor;

            return stylized.squeeze();
        });
        // Force GPU sync so the timer reflects actual inference, not just queue submission.
        await stylizedTensor.data();
        console.log(`[timing] run inference: ${(performance.now() - tInfer).toFixed(0)}ms`);

        contentTensor.dispose();
        styleTensor.dispose();

        const tEncode = performance.now();
        const result = await encodeTensorToJpeg(stylizedTensor, quality);
        console.log(`[timing] encode output to JPEG: ${(performance.now() - tEncode).toFixed(0)}ms`);

        stylizedTensor.dispose();
        return result;
    }
}

// Cap the content image's longest side so inference stays cheap while preserving
// the user's aspect ratio. Style is always 256x256 (the model's trained size).
const CONTENT_MAX_SIDE = 256;
const STYLE_SIDE = 256;

function targetSize(width: number, height: number, kind: "content" | "style"): [number, number] {
    if (kind === "style") return [STYLE_SIDE, STYLE_SIDE];
    if (height >= width) {
        return [CONTENT_MAX_SIDE, Math.max(1, Math.round(width * CONTENT_MAX_SIDE / height))];
    }
    return [Math.max(1, Math.round(height * CONTENT_MAX_SIDE / width)), CONTENT_MAX_SIDE];
}

async function decodeJpegToTensor(jpegBytes: Uint8Array, kind: "content" | "style"): Promise<tf.Tensor> {
    return tf.tidy(() => {
        const decoded = jpeg.decode(jpegBytes, { useTArray: true });
        let tensor = tf.tensor3d(
            decoded.data,
            [decoded.height, decoded.width, 4],
            "int32",
        );
        // Drop alpha → RGB
        tensor = tensor.slice([0, 0, 0], [-1, -1, 3]);
        // Normalize to [0, 1]
        tensor = tf.cast(tensor, "float32").div(255.0);
        // Resize
        tensor = tf.image.resizeBilinear(tensor, targetSize(decoded.width, decoded.height, kind));
        // Add batch dimension
        return tensor.expandDims(0);
    });
}

async function encodeTensorToJpeg(tensor: tf.Tensor, quality = 90): Promise<Uint8Array> {
    const denormalized = tf.tidy(() =>
        tf.cast(tf.clipByValue(tf.mul(tensor, 255), 0, 255), "int32")
    );

    if (denormalized.shape.length !== 3) {
        throw new Error(`expected rank-3 [H, W, C] tensor, got shape ${denormalized.shape}`);
    }
    const [height, width] = denormalized.shape;
    const data = await denormalized.data();
    denormalized.dispose();

    // jpeg-js expects RGBA
    const rgbaData = new Uint8Array(height * width * 4);
    for (let i = 0; i < height * width; i++) {
        const rgbaIdx = i * 4;
        const rgbIdx = i * 3;
        rgbaData[rgbaIdx] = data[rgbIdx];
        rgbaData[rgbaIdx + 1] = data[rgbIdx + 1];
        rgbaData[rgbaIdx + 2] = data[rgbIdx + 2];
        rgbaData[rgbaIdx + 3] = 255;
    }

    const encoded = jpeg.encode({ data: rgbaData, width, height }, quality);
    return new Uint8Array(encoded.data);
}

function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
    const base64 = dataUrl.split(",")[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

// TODO: remove this!
// stringify requiredFeatures items since tfjs uses an array as a feature name.
// https://github.com/tensorflow/tfjs/pull/8639
function setWashOverrides() {
    const requestDeviceOriginal = GPUAdapter.prototype.requestDevice;
    GPUAdapter.prototype.requestDevice = async function(descriptor: GPUDeviceDescriptor): Promise<GPUDevice> {
        let requiredFeatures: GPUFeatureName[] | undefined;
        if (descriptor.requiredFeatures) {
            requiredFeatures = Array.from(descriptor.requiredFeatures).map(feature => feature.toString() as GPUFeatureName);
        }
        return await requestDeviceOriginal.call(this, {
            ...descriptor,
            requiredFeatures,
        });
    };
}
