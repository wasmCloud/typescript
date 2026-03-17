// temporary polyfill for node:util/types
// waiting for https://github.com/unjs/unenv/pull/540

export const isExternal = (_obj) =>
  false;

export const isDate = (
  val,
) => val instanceof Date;

export const isArgumentsObject = (
  val,
) =>
  Object.prototype.toString.call(val) === "[object Arguments]";

export const isBigIntObject = (
  val,
) => val instanceof BigInt;

export const isBooleanObject = (
  val,
) => val instanceof Boolean;

export const isNumberObject = (
  val,
) => val instanceof Number;

export const isStringObject = (
  val,
) => val instanceof String;

export const isSymbolObject = (
  val,
) => val instanceof Symbol;

export const isNativeError = (
  val,
) => val instanceof Error;

export const isRegExp = (
  val,
) => val instanceof RegExp;

export const isAsyncFunction = (
  val,
) => {
  return typeof val === "function" &&
    Object.prototype.toString.call(val) === "[object AsyncFunction]";
};

export const isGeneratorFunction = (
  val,
) => {
  return typeof val === "function" &&
    Object.prototype.toString.call(val) === "[object GeneratorFunction]";
};

export const isGeneratorObject = (
  val,
) =>
  Object.prototype.toString.call(val) === "[object Generator]";

export const isPromise = (
  val,
) => val instanceof Promise;

export const isMap = (
  val,
) => {
  return val instanceof Map;
};

export const isSet = (
  val,
) => {
  return val instanceof Set;
};

export const isMapIterator = (
  val,
) => Object.prototype.toString.call(val) === "[object Map Iterator]";

export const isSetIterator = (
  val,
) => Object.prototype.toString.call(val) === "[object Set Iterator]";

export const isWeakMap = (
  val,
) => val instanceof WeakSet;

export const isArrayBuffer = (
  val,
) => val instanceof ArrayBuffer;

export const isDataView = (
  val,
) => val instanceof DataView;

export const isSharedArrayBuffer = (
  val,
) =>
  "SharedArrayBuffer" in globalThis && val instanceof SharedArrayBuffer;

export const isProxy = (val) => {
  throw new Error("Not implemented");
};

export const isModuleNamespaceObject = (val) => {
  throw new Error("Not implemented");
};

export const isAnyArrayBuffer = (
  val,
) =>
  val instanceof ArrayBuffer ||
  ("SharedArrayBuffer" in globalThis && val instanceof SharedArrayBuffer);

export const isBoxedPrimitive = (
  val,
) => {
  return val instanceof String ||
    val instanceof Number ||
    val instanceof BigInt ||
    val instanceof Boolean ||
    val instanceof Symbol;
};

export const isArrayBufferView = (
  val,
) => {
  return ArrayBuffer.isView(val);
};

export const isTypedArray = (
  val,
) => {
  return val instanceof Int8Array ||
    val instanceof Uint8Array ||
    val instanceof Uint8ClampedArray ||
    val instanceof Int16Array ||
    val instanceof Uint16Array ||
    val instanceof Int32Array ||
    val instanceof Uint32Array ||
    ("Float16Array" in globalThis && val instanceof Float16Array) ||
    val instanceof Float32Array ||
    val instanceof Float64Array ||
    val instanceof BigInt64Array ||
    val instanceof BigUint64Array;
};

export const isUint8Array = (
  val,
) => val instanceof Uint8Array;

export const isUint8ClampedArray = (
  val,
) => val instanceof Uint8ClampedArray;

export const isUint16Array = (
  val,
) => val instanceof Uint16Array;

export const isUint32Array = (
  val,
) => val instanceof Uint32Array;

export const isInt8Array = (
  val,
) => val instanceof Int8Array;

export const isInt16Array = (
  val,
) => val instanceof Int16Array;

export const isInt32Array = (
  val,
) => val instanceof Int32Array;

export const isFloat32Array = (
  val,
) => val instanceof Float32Array;

export const isFloat64Array = (
  val,
) => val instanceof Float64Array;

export const isBigInt64Array = (
  val,
) => val instanceof BigInt64Array;

export const isBigUint64Array = (
  val,
) => val instanceof BigUint64Array;

export const isKeyObject = (val) => {
  throw new Error("Not implemented");
};

export default {
  isExternal,
  isDate,
  isArgumentsObject,
  isBigIntObject,
  isBooleanObject,
  isNumberObject,
  isStringObject,
  isSymbolObject,
  isNativeError,
  isRegExp,
  isAsyncFunction,
  isGeneratorFunction,
  isGeneratorObject,
  isPromise,
  isMap,
  isSet,
  isMapIterator,
  isSetIterator,
  isWeakMap,
  isArrayBuffer,
  isDataView,
  isSharedArrayBuffer,
  isProxy,
  isModuleNamespaceObject,
  isAnyArrayBuffer,
  isBoxedPrimitive,
  isArrayBufferView,
  isTypedArray,
  isUint8Array,
  isUint8ClampedArray,
  isUint16Array,
  isUint32Array,
  isInt8Array,
  isInt16Array,
  isInt32Array,
  isFloat32Array,
  isFloat64Array,
  isBigInt64Array,
  isBigUint64Array,
  isKeyObject,
};
