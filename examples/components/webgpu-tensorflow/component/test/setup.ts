import { wit } from './fakes/wit.js';

// componentize-qjs defines `wit` as a global for the component's code.
Object.assign(globalThis, { wit });
