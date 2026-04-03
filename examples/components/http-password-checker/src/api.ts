/**
 * @file Helpers and utility types for dealing with requests
 */

import * as v from 'valibot';
import {passwordStrength} from 'check-password-strength';

/** START wasi generated imports */
// NOTE import paths are aliased in tsconfig.json
import {IncomingRequest} from 'wasi:http/types@0.2.2';
/**  END wasi generated imports */

import {PasswordStrength, PASSWORD_CHECK_RULES} from './passwords.js';
import {readInputStream} from './wasi.js';
import {Response} from './http.js';

/**
 * Represents an API request for checking a password
 *
 * @class
 */
export class PasswordCheckRequest {
  // The value to check directly
  public value: string;

  constructor(value: string) {
    this.value = value;
  }

  /** Schema that can be used to parse an object */
  static schema() {
    return v.object({
      value: v.string(),
    });
  }

  /** Parse a PasswordCheckRequest from a wasi:http `IncomingRequest` */
  static async fromRequest(req: IncomingRequest): Promise<PasswordCheckRequest> {
    try {
      let bytes = readInputStream(req.consume().stream());
      let obj = JSON.parse(new TextDecoder('utf8').decode(bytes));
      const parsed = v.parse(PasswordCheckRequest.schema(), obj);
      return new PasswordCheckRequest(parsed.value);
    } catch (err) {
      throw new Error(
        `failed to parse incoming data as a PasswordCheckRequest: ${err?.toString()}`,
      );
    }
  }
}

/** API response for a check result */
interface CheckResult {
  /** Strength of the password */
  strength: PasswordStrength;
  /** Length of the password */
  length: number;
  /** The types of characters the password contains (e.g. 'lowercase', 'uppercase', 'symbol', etc) */
  contains: string[];
}

/**
 * Perform a strength check for a directly-provided password value
 *
 * @param {PasswordCheckRequest} cr - The Check request to complete
 * @returns {Promise<CheckResult>} A promise that resolves to the HTTP response with the check result
 */
export async function handlePasswordCheck(
  cr: PasswordCheckRequest,
): Promise<Response<CheckResult>> {
  const {value: strength, contains, length} = passwordStrength(cr.value, PASSWORD_CHECK_RULES);

  return Response.ok({
    strength,
    length,
    contains,
  });
}
