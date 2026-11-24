import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createLogger, logging } from '../../src/wasmcloud/logging/index.js';

let log: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('prefixes each message with its level and context', () => {
  const logger = createLogger('ctx');

  logger.trace('t');
  logger.debug('d');
  logger.info('i');
  logger.log('l');
  logger.warn('w');
  logger.error('e');

  expect(log.mock.calls.map(([line]) => line)).toEqual([
    '[TRACE] ctx: t',
    '[DEBUG] ctx: d',
    '[INFO] ctx: i',
    '[INFO] ctx: l',
    '[WARN] ctx: w',
    '[ERROR] ctx: e',
  ]);
});

test('appends a per-call context', () => {
  createLogger('ctx').info('message', 'extra');

  expect(log).toHaveBeenCalledWith('[INFO] ctx:extra: message');
});

test('nests child loggers under the root context', () => {
  logging.createLogger('child').createLogger('grandchild').warn('careful');

  expect(log).toHaveBeenCalledWith('[WARN] http-server-with-hono:child:grandchild: careful');
});
