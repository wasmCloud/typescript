import "../qjs-polyfill.js";

globalThis.location = {
    search: "",
};

globalThis.global = globalThis;

// to make webgpu availability checks pass
globalThis.navigator = {
    gpu: {},
};
