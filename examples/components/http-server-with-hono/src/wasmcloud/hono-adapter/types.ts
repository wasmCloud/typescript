import type {Env} from 'hono';
import type {Logger} from './logging';

export interface WasiEnv extends Env {
  config: Record<string, string>;
  logger: Logger;
}
