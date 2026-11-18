export type FluxTestErrorCode =
  | 'cdp-launch-failed'
  | 'cdp-connect-timeout'
  | 'cdp-timeout'
  | 'cdp-request-failed'
  | 'cdp-closed'
  | 'page-load-timeout'
  | 'spec-timeout'
  | 'kernel-not-attached'
  | 'gateway-peer-lost'
  | 'gateway-no-peer'
  | 'browser-not-found'
  | 'not-implemented-in-e1';

export class FluxTestError extends Error {
  readonly code: FluxTestErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: FluxTestErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(`${code}: ${message}`);
    this.name = 'FluxTestError';
    this.code = code;
    this.details = details;
  }

  toJSON(): { code: FluxTestErrorCode; message: string; details: Record<string, unknown> } {
    return { code: this.code, message: this.message, details: this.details };
  }
}

export function isFluxTestError(value: unknown): value is FluxTestError {
  return value instanceof FluxTestError;
}
