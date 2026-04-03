type Level = 'trace' | 'debug' | 'info' | 'warn' | 'error';

const combineContexts = (defaultCtx: string, ctx?: string) =>
  ctx ? `${defaultCtx}:${ctx}` : defaultCtx;

const getLogger = (defaultCtx: string) => {
  return (level: Level, message: string, context?: string): void => {
    const ctx = combineContexts(defaultCtx, context);
    console.log(`[${level.toUpperCase()}] ${ctx}: ${message}`);
  };
};

const createLogger = (defaultContext: string) => {
  const log = getLogger(defaultContext);
  const error = (message: string, context?: string) => log('error', message, context);
  const warn = (message: string, context?: string) => log('warn', message, context);
  const info = (message: string, context?: string) => log('info', message, context);
  const debug = (message: string, context?: string) => log('debug', message, context);
  const trace = (message: string, context?: string) => log('trace', message, context);

  return {
    log: info,
    error,
    warn,
    info,
    debug,
    trace,
    createLogger: (ctx: string) => createLogger(`${defaultContext}:${ctx}`),
  };
};

const logging = createLogger('http-server-with-hono');

export {logging, createLogger};
