import type { InputSchema } from './schemas.js';

/**
 * Missing-components L2.4 (plan 508): OTP verification-code field on the ui
 * `InputOTP` primitive (registration debt — the primitive predates the type).
 * Value invariant (plan 508 draft review r1 M1): input length < `length` ⇔
 * value `undefined` — a full code commits, any shortening (backspace /
 * delete) falls back to `undefined`; stale codes are never retained.
 */
export interface VerificationCodeSchema extends InputSchema {
  type: 'verification-code';
  /** Number of cells. Defaults to 6; non-positive/non-integer → 6 (no upper bound — lib `maxLength` is unbounded). */
  length?: number;
  /** Render entered slot characters transparent (container Tailwind arbitrary class). */
  masked?: boolean;
}
