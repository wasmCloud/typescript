import { fire } from '@bytecodealliance/jco-std/wasi/0.2.x/http/adapters/hono/server';
import { app } from './app.js';

// Serve the app through the WASI HTTP adapter
fire(app);

// Export the incoming handler for jco
export { incomingHandler } from '@bytecodealliance/jco-std/wasi/0.2.x/http/adapters/hono/server';
