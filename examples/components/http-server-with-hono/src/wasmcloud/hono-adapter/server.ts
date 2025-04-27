import type {Env, Hono, Schema} from 'hono';
import type {IncomingRequest, ResponseOutparam} from 'wasi:http/types@0.2.3';
import type {BlankSchema} from 'hono/types';

import {getAll as getConfig} from 'wasi:config/runtime@0.2.0-draft';

import {logging} from './logging';
import {createRequest, createResponse} from './transformers';
import {handleError} from './errorHandling';

const logger = logging.createLogger('serve');

function serve<E extends Env = Env, S extends Schema = BlankSchema, BasePath extends string = '/'>(
  app: Hono<E, S, BasePath>,
): (request: IncomingRequest, response: ResponseOutparam) => Promise<void> {
  return async (request, response) => {
    logger.info(`Received request: ${request.pathWithQuery()}`);
    app.onError(handleError);

    const env = Object.fromEntries(getConfig());
    const res = await app.fetch(createRequest(request), env);
    await createResponse(res, response);
  };
}

export {serve};
