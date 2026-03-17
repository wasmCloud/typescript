import { declareGlobals } from '@wasi-gfx/js-webgpu/globals';
import '../polyfil.js';

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

interface Image {
    blob: Blob;
    height: number;
    width: number;
}

interface StylizeConfig {
    contentImage: Image;
    styleImage: Image;
    styleRatio: number;
}

export async function stylizeImage(config: StylizeConfig): Promise<Blob> {
    const state = await getState();

    const stylizedImage = await state.stylize(config);

    console.log("memory", JSON.stringify(tf.memory()));

    return stylizedImage;
}

let state: State | undefined = undefined;

// get state singleton
async function getState(): Promise<State> {
    if (state !== undefined) return state;
    state = await State.initialize();
    return state;
}

class State {
    private styleModel: tf.GraphModel;
    private transformerModel: tf.GraphModel;

    private constructor(styleModel: tf.GraphModel, transformerModel: tf.GraphModel) {
        this.styleModel = styleModel;
        this.transformerModel = transformerModel;
    }

    public static async initialize(): Promise<State> {
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
                    weightData: [
                        dataUrlToArrayBuffer(model_style_group1_shard1of9_bin),
                        dataUrlToArrayBuffer(model_style_group1_shard2of9_bin),
                        dataUrlToArrayBuffer(model_style_group1_shard3of9_bin),
                        dataUrlToArrayBuffer(model_style_group1_shard4of9_bin),
                        dataUrlToArrayBuffer(model_style_group1_shard5of9_bin),
                        dataUrlToArrayBuffer(model_style_group1_shard6of9_bin),
                        dataUrlToArrayBuffer(model_style_group1_shard7of9_bin),
                        dataUrlToArrayBuffer(model_style_group1_shard8of9_bin),
                        dataUrlToArrayBuffer(model_style_group1_shard9of9_bin),
                    ],
                })
            ),
            tf.loadGraphModel(
                tf.io.fromMemory({
                    modelTopology: model_transformer_model_json.modelTopology,
                    weightSpecs: model_transformer_model_json.weightsManifest.flatMap((g: any) => g.weights),
                    weightData: [
                        dataUrlToArrayBuffer(model_transformer_group1_shard1of2_bin),
                        dataUrlToArrayBuffer(model_transformer_group1_shard2of2_bin),
                    ],
                })
            ),
        ]);
        return new State(styleModel, transformerModel);
    }

    async stylize(config: StylizeConfig): Promise<Blob> {
        const quality = 90;

        // Decode images to tensors
        const contentTensor = await decodeImageToTensor(config.contentImage); 
        const styleTensor = await decodeImageToTensor(config.styleImage);
    
        // Perform style transfer
        const stylizedTensor = await tf.tidy(() => {
            // Get style representation
            const styleBottleneck = this.styleModel.predict(styleTensor) as tf.Tensor;

            let finalBottleneck;
            if (config.styleRatio < 1.0) {
                // Blend with content style for adjustable strength
                const contentBottleneck = this.styleModel.predict(contentTensor) as tf.Tensor;
    
                finalBottleneck = tf.add(
                    tf.mul(styleBottleneck, config.styleRatio),
                    tf.mul(contentBottleneck, 1.0 - config.styleRatio),
                );
            } else {
                finalBottleneck = styleBottleneck;
            }
    
            // Apply style transfer
            const stylized = this.transformerModel.predict([
                contentTensor,
                finalBottleneck,
            ]) as tf.Tensor;
    
            // Remove batch dimension
            return stylized.squeeze();
        });
    
        // Clean up input tensors
        contentTensor.dispose();
        styleTensor.dispose();

        const result = await encodeTensorToJpeg(
            stylizedTensor,
            quality,
        );

        // Clean up
        stylizedTensor.dispose();
    
        return result;
    }
}

async function decodeImageToTensor(image: Image): Promise<tf.Tensor> {
    if (image.blob.type !== "image/jpeg") {
        throw new Error("Only JPEG images are supported.");
    }
    const jpegBytes = await image.blob.bytes();
    return tf.tidy(() => {
        // Decode JPEG to raw RGBA pixels
        const decoded = jpeg.decode(jpegBytes, { useTArray: true });

        // Create tensor from raw pixels [height, width, 4]
        let tensor = tf.tensor3d(
            decoded.data,
            [decoded.height, decoded.width, 4],
            "int32",
        );

        // Take only RGB channels (drop alpha)
        tensor = tensor.slice([0, 0, 0], [-1, -1, 3]);

        // Convert to float32 and normalize to [0, 1]
        tensor = tf.cast(tensor, "float32").div(255.0);

        // Resize to target size using bilinear interpolation
        tensor = tf.image.resizeBilinear(tensor, [image.height, image.width]);

        // Add batch dimension [1, height, width, 3]
        return tensor.expandDims(0);
    });
}

async function encodeTensorToJpeg(tensor: tf.Tensor, quality = 90): Promise<Blob> {
    // Denormalize from [0, 1] to [0, 255]
    const denormalized = tf.tidy(() =>
        tf.cast(
            tf.clipByValue(tf.mul(tensor, 255), 0, 255),
            "int32",
        )
    );

    // Get dimensions and data
    const [height, width, channels] = denormalized.shape;
    const data = await denormalized.data();
    denormalized.dispose();

    // Convert RGB to RGBA (jpeg-js expects RGBA)
    const rgbaData = new Uint8Array(height * width * 4);

    for (let i = 0; i < height * width; i++) {
        const rgbaIdx = i * 4;
        const rgbIdx = i * 3;

        rgbaData[rgbaIdx] = data[rgbIdx]; // R
        rgbaData[rgbaIdx + 1] = data[rgbIdx + 1]; // G
        rgbaData[rgbaIdx + 2] = data[rgbIdx + 2]; // B
        rgbaData[rgbaIdx + 3] = 255; // A
    }

    // Encode to JPEG
    const encodedBuffer = jpeg.encode({
        data: rgbaData,
        width: width,
        height: height,
    }, quality);
    const encodedArrayBuffer: ArrayBuffer = encodedBuffer.data.buffer as ArrayBuffer;
    const encodedBlob = new Blob([encodedArrayBuffer], { type: "image/jpeg" });

    return encodedBlob;
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
export function setWashOverrides() {
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
    }
}
