// Stands in for `@wasi-gfx/js-webgpu/globals`,
// which defines the WebGPU classes on top of wasi:webgpu.
// Only GPUAdapter is needed: the stylizer patches its requestDevice.

export const requestedDevices: GPUDeviceDescriptor[] = [];

class FakeGPUAdapter {
  async requestDevice(
    descriptor: GPUDeviceDescriptor,
  ): Promise<{ descriptor: GPUDeviceDescriptor }> {
    requestedDevices.push(descriptor);
    return { descriptor };
  }
}

export function declareGlobals(): void {
  Object.assign(globalThis, { GPUAdapter: FakeGPUAdapter });
}
