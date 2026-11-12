// Stands in for `@tensorflow/tfjs-backend-webgpu`, which needs a GPU.
// Importing it registers a backend under the same name,
// but that backend is TensorFlow.js's CPU backend running the CPU kernels,
// so tensor maths behaves as it would on the GPU, only slower.

import * as tf from '@tensorflow/tfjs';

const cpu = tf.findBackendFactory('cpu');
if (!cpu) {
  throw new Error('the TensorFlow.js CPU backend is not registered');
}
tf.registerBackend('webgpu', cpu);
for (const kernel of tf.getKernelsForBackend('cpu')) {
  tf.registerKernel({ ...kernel, backendName: 'webgpu' });
}
