import {logging as rootLogger} from '../logging';

export const logging = rootLogger.createLogger('hono-adapter');
export type Logger = typeof logging;
