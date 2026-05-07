globalThis.location = {
    search: "",
};

globalThis.global = globalThis;

// TODO: temporary hack until wizer adds wasi:random in initialization.
globalThis.Math.random = () => 0.5;

// to make webgpu availability checks pass
globalThis.navigator = {
    gpu: {},
};
