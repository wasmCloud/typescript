import {MiddlewareHandler} from 'hono';
import {logging} from './logging';

function wasiLog(): MiddlewareHandler {
  const logger = logging.createLogger('middleware');

  return async (c, next) => {
    const {method, path} = c.req;
    const request = `${method} ${path}`;

    const startTime = Date.now();
    logger.info(`<-- ${request}`);

    await next();

    const time = Date.now() - startTime;
    logger.info(`--> ${request} ${c.res.status} ${time}ms`);
  };
}

export {wasiLog};
