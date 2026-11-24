import { fire } from '@bytecodealliance/jco-std/wasi/0.2.6/http/adapters/hono/server';
import { app } from './app.js';

// Serve the app through the WASI HTTP adapter
fire(app);

export { incomingHandler } from '@bytecodealliance/jco-std/wasi/0.2.6/http/adapters/hono/server';
