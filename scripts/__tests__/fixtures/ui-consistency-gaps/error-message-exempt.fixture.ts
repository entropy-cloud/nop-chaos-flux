export function errorMessageExempt(error: unknown) {
  reportError(error instanceof Error ? error.message : String(error));
}
