import app from './app';
import {serve} from './wasmcloud/hono-adapter';

export const incomingHandler = {
  handle: serve(app),
};
