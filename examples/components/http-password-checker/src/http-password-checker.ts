/**
 * @file Implementation of the WIT interface defined by this component
 */

import * as v from 'valibot';

/** START wasi generated imports (see tsconfig.json for aliases) */
import { IncomingRequest, ResponseOutparam } from 'wasi:http/types@0.2.2';
/**  END wasi generated imports */

import { sendResponseJSON } from './wasi.js';
import { ErrorCode, Response } from './http.js';
import { PasswordCheckRequest, handlePasswordCheck } from './api.js';

/**
 * Implementation of the `wasi:http/incoming-handler` interface that is exported by the component
 */
export const incomingHandler = {
  /** Implementation of the `handle` function inside the interface */
  async handle(req: IncomingRequest, resp: ResponseOutparam) {
    // Only allow GET requests
    if (req.method().tag != 'post') {
      await sendResponseJSON(resp, 400, {
        status: 'error',
        message: 'invalid request, must be POST',
      });
      return;
    }

    // Parse out the request path
    const [path] = (req.pathWithQuery() ?? '').split('?');

    // Handle request
    switch (path) {
      case '/api/v1/check': {
        // Parse the check request from the body
        let cr: PasswordCheckRequest;
        try {
          cr = await PasswordCheckRequest.fromRequest(req);
        } catch (err) {
          const msg = describeParseError(err);
          return await sendResponseJSON(resp, 400, {
            status: 'error',
            message: `invalid request body: ${msg}`,
          });
        }

        // Perform the check
        try {
          const result = await handlePasswordCheck(cr);
          return await sendResponseJSON(resp, 200, result);
        } catch (err) {
          return await sendResponseJSON(
            resp,
            500,
            Response.error(
              ErrorCode.UnexpectedError,
              `failed to check password: ${err?.toString()}`,
            ),
          );
        }

        break;
      }

      default:
        await sendResponseJSON(
          resp,
          400,
          Response.error(ErrorCode.InvalidRequest, 'invalid API request (unknown endpoint)'),
        );
    }
  },
};

/** A readable message for an error thrown while parsing a request. */
function describeParseError(err: unknown): string {
  if (v.isValiError(err)) {
    return `[${err.issues.map((issue) => issue.message).join(', ')}]`;
  }
  const payload = (err as { payload?: unknown } | null | undefined)?.payload;
  if (typeof payload === 'string') {
    return payload;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'unexpected error while parsing request';
}
