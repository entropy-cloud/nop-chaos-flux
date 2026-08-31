export function errorMessageHit(error: unknown) {
  setLoadError(error instanceof Error ? error.message : 'Load failed');
}
