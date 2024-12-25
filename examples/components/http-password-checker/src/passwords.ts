import type {
  Options as PasswordCheckOptions,
  FirstOption as PasswordChecKFirstOption,
} from "check-password-strength";

/** Basic descriptions of password strength */
export enum PasswordStrength {
  VeryWeak = "very-weak",
  Weak = "weak",
  Medium = "medium",
  Strong = "strong",
}

/**
 * Default rules to use for password checking
 *
 * See: https://www.npmjs.com/package/check-password-strength
 */
export const PASSWORD_CHECK_RULES: PasswordCheckOptions<PasswordStrength> = [
  {
    id: 0,
    value: PasswordStrength.VeryWeak,
    minDiversity: 0,
    minLength: 0,
  },
  {
    id: 1,
    value: PasswordStrength.Weak,
    minDiversity: 2,
    minLength: 6,
  },
  {
    id: 2,
    value: PasswordStrength.Medium,
    minDiversity: 4,
    minLength: 8,
  },
  {
    id: 3,
    value: PasswordStrength.Strong,
    minDiversity: 4,
    minLength: 10,
  },
];
