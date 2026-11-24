import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

/** Request IDs accepted from clients: short tokens, safe to echo in headers and logs. */
const REQUEST_ID = /^[\w.-]{1,128}$/;

/** The client's `X-Request-Id` if it's a valid token, or a new random one. */
export function requestIdFrom(header: string | undefined): string {
  return header && REQUEST_ID.test(header) ? header : crypto.randomUUID();
}

/** Parse the request body as JSON, rejecting a malformed body with 400. */
export async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  }
}

/**
 * Parse an integer query parameter between `min` and `max`,
 * returning `fallback` when it's absent and rejecting anything else with 400.
 */
export function parseIntParam(
  value: string | undefined,
  name: string,
  { fallback, min, max }: { fallback: number; min: number; max: number },
): number {
  if (value === undefined || value === '') {
    return fallback;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new HTTPException(400, {
      message: `'${name}' must be an integer from ${min} to ${max}`,
    });
  }
  return n;
}
