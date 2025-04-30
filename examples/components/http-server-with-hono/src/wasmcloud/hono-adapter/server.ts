/// <reference lib="WebWorker" />
// The ServiceWorker scope isn't currently exported from the TS lib; only the "WebWorker" scope. StarlingMonkey executes
// in a ServiceWorker context, so we need to override the type of `self` to be ServiceWorkerGlobalScope.
// See https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/1498
declare const self: ServiceWorkerGlobalScope;

import type {Env, Hono, Schema} from 'hono';
import type {BlankSchema} from 'hono/types';

import {getAll as getConfig} from 'wasi:config/runtime@0.2.0-draft';

import {handleError} from './errorHandling';
import {createLogger} from '../logging';

function serve<E extends Env = Env, S extends Schema = BlankSchema, BasePath extends string = '/'>(
  app: Hono<E, S, BasePath>,
): void {
  const logger = createLogger('serve()');
  app.onError(handleError);
  self.addEventListener('fetch', (event): void => {
    logger.debug('Request:', event.request.url);

    const env = Object.fromEntries(getConfig());
    event.respondWith(app.fetch(event.request, env));
  });
}

export {serve};
