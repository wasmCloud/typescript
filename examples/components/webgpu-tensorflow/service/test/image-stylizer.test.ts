import jpeg from 'jpeg-js';
import * as tf from '@tensorflow/tfjs';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { Stylizer } from '../src/image-stylizer';
import { requestedDevices } from './fakes/js-webgpu-globals';

// Model loading is replaced with two small fake models (below),
// and the WebGPU backend with one that runs the CPU kernels,
// so the decode, resize, blend and encode steps around the models run for real.
vi.mock('@tensorflow/tfjs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tensorflow/tfjs')>();
  return {
    ...actual,
    getBackend: vi.fn(actual.getBackend),
    loadGraphModel: vi.fn(),
  };
});
vi.mock('@tensorflow/tfjs-backend-webgpu', () => import('./fakes/tfjs-backend-webgpu'));
vi.mock('@wasi-gfx/js-webgpu/globals', () => import('./fakes/js-webgpu-globals'));

interface LoadedModel {
  artifacts: tf.io.ModelArtifacts;
  predictions: tf.Tensor[][];
}
const loaded: LoadedModel[] = [];

// Stands in for the style network: the "style bottleneck" is the image's mean colour.
function styleModel(model: LoadedModel) {
  return {
    predict(image: tf.Tensor) {
      model.predictions.push([tf.keep(image.clone())]);
      return tf.mean(image, [1, 2], true);
    },
  };
}

// Stands in for the transformer network: paints the content image in the bottleneck colour.
function transformerModel(model: LoadedModel) {
  return {
    predict([content, bottleneck]: tf.Tensor[]) {
      model.predictions.push([tf.keep(content.clone()), tf.keep(bottleneck.clone())]);
      return tf.add(tf.mul(content, 0), bottleneck);
    },
  };
}

vi.mocked(tf.loadGraphModel).mockImplementation(async (handler) => {
  const { load } = handler as tf.io.IOHandler;
  if (!load) throw new Error('the model handler cannot load');
  const artifacts = await load();
  const model: LoadedModel = { artifacts, predictions: [] };
  loaded.push(model);
  const isStyle = loaded.length === 1;
  return (isStyle ? styleModel(model) : transformerModel(model)) as unknown as tf.GraphModel;
});

/** Encode a solid-colour JPEG */
function solidJpeg(width: number, height: number, [r, g, b]: number[]): Uint8Array {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set([r, g, b, 255], i * 4);
  return new Uint8Array(jpeg.encode({ data, width, height }, 100).data);
}

/** Decode a JPEG and return its size and the colour of its centre pixel */
function inspect(bytes: Uint8Array) {
  const { width, height, data } = jpeg.decode(bytes, { useTArray: true });
  const i = (Math.floor(height / 2) * width + Math.floor(width / 2)) * 4;
  return { width, height, centre: [data[i], data[i + 1], data[i + 2]] };
}

const RED = [255, 0, 0];
const BLUE = [0, 0, 255];
const PURPLE = [128, 0, 128];

let stylizer: Stylizer;

beforeAll(async () => {
  vi.spyOn(console, 'log').mockReturnValue(undefined);
  stylizer = await Stylizer.initialize();
});

afterEach(() => {
  for (const model of loaded) {
    tf.dispose(model.predictions.flat());
    model.predictions.length = 0;
  }
});

describe('Stylizer.initialize', () => {
  test('runs on the WebGPU backend', () => {
    expect(tf.getBackend()).toBe('webgpu');
  });

  test('loads the style and transformer models from the embedded weights', () => {
    const [style, transformer] = loaded;
    const shards = (model: LoadedModel) =>
      (model.artifacts.weightData as ArrayBuffer[]).map((b) => new TextDecoder().decode(b));

    expect(shards(style)).toEqual(
      Array.from({ length: 9 }, (_, i) => `group1-shard${i + 1}of9.bin`),
    );
    expect(shards(transformer)).toEqual(['group1-shard1of2.bin', 'group1-shard2of2.bin']);
    for (const model of loaded) {
      expect(model.artifacts.modelTopology).toBeDefined();
      expect(model.artifacts.weightSpecs?.length).toBeGreaterThan(0);
    }
  });

  test('passes requested GPU features to the adapter as strings', async () => {
    const adapter = new (
      globalThis as unknown as { GPUAdapter: new () => GPUAdapter }
    ).GPUAdapter();
    // TensorFlow.js names a feature with an array, which wasi-gfx doesn't accept.
    const feature = ['timestamp-query'] as unknown as GPUFeatureName;

    await adapter.requestDevice({ requiredFeatures: [feature], label: 'tf' });
    await adapter.requestDevice({});

    expect(requestedDevices).toEqual([
      { requiredFeatures: ['timestamp-query'], label: 'tf' },
      { requiredFeatures: undefined },
    ]);
  });

  test('fails when the WebGPU backend could not be selected', async () => {
    // Checked once, then read again for the message.
    vi.mocked(tf.getBackend).mockReturnValueOnce('cpu').mockReturnValueOnce('cpu');

    await expect(Stylizer.initialize()).rejects.toThrow(
      'Backend mismatch. expected = webgpu, actual = cpu',
    );
  });
});

describe('Stylizer.stylize', () => {
  test('paints the content image in the style', async () => {
    const result = await stylizer.stylize({
      contentJpeg: solidJpeg(32, 32, BLUE),
      styleJpeg: solidJpeg(16, 16, RED),
      styleRatio: 1.0,
    });

    const { width, height, centre } = inspect(result);
    expect([width, height]).toEqual([256, 256]);
    centre.forEach((c, i) => expect(Math.abs(c - RED[i])).toBeLessThan(8));
  });

  test('resizes style images to 256x256 and normalises pixels to [0, 1]', async () => {
    await stylizer.stylize({
      contentJpeg: solidJpeg(8, 8, BLUE),
      styleJpeg: solidJpeg(40, 10, RED),
      styleRatio: 1.0,
    });

    const [[style]] = loaded[0].predictions;
    expect(style.shape).toEqual([1, 256, 256, 3]);
    expect(style.max().dataSync()[0]).toBeCloseTo(1, 1);
    expect(style.min().dataSync()[0]).toBeGreaterThanOrEqual(0);
  });

  test.each([
    ['wide', 64, 16, [64, 256]],
    ['tall', 16, 64, [256, 64]],
    ['square', 20, 20, [256, 256]],
  ])('keeps the aspect ratio of a %s content image', async (_, width, height, [h, w]) => {
    const result = await stylizer.stylize({
      contentJpeg: solidJpeg(width, height, BLUE),
      styleJpeg: solidJpeg(8, 8, RED),
      styleRatio: 1.0,
    });

    const [content] = loaded[1].predictions[0];
    expect(content.shape).toEqual([1, h, w, 3]);
    expect(inspect(result)).toMatchObject({ width: w, height: h });
  });

  test('blends the content into the style below a ratio of 1', async () => {
    const result = await stylizer.stylize({
      contentJpeg: solidJpeg(16, 16, BLUE),
      styleJpeg: solidJpeg(16, 16, RED),
      styleRatio: 0.5,
    });

    expect(loaded[0].predictions).toHaveLength(2);
    inspect(result).centre.forEach((c, i) => expect(Math.abs(c - PURPLE[i])).toBeLessThan(8));
  });

  test('rejects bytes that are not a JPEG', async () => {
    await expect(
      stylizer.stylize({
        contentJpeg: new TextEncoder().encode('not a jpeg'),
        styleJpeg: solidJpeg(8, 8, RED),
        styleRatio: 1.0,
      }),
    ).rejects.toThrow();
  });

  // squeeze() drops every dimension of size 1, not only the batch one.
  // A content image over about 170 times wider than it is tall
  // is resized to a single row, which squeezes down to rank 2 and can't be encoded.
  test('rejects a content image that resizes to a single row', async () => {
    await expect(
      stylizer.stylize({
        contentJpeg: solidJpeg(1000, 1, BLUE),
        styleJpeg: solidJpeg(8, 8, RED),
        styleRatio: 1.0,
      }),
    ).rejects.toThrow('expected rank-3 [H, W, C] tensor, got shape 256,3');
  });
});
