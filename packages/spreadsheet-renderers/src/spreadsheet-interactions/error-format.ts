export function isAbortLike(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === 'AbortError') ||
    ((error as { name?: string } | null | undefined)?.name === 'AbortError')
  );
}

export function formatFailureMessage(prefix: string, error: unknown): string {
  return error instanceof Error && error.message ? `${prefix}: ${error.message}` : prefix;
}

/** Inverted-sense variant reserved for command-result reporting: prefers the
 * raw error message and falls back to `${label} failed`. Kept separate from
 * formatFailureMessage on purpose — merging the two would change call-site
 * output. */
export function formatCommandFailure(label: string, error: unknown): string {
  return error instanceof Error && error.message ? error.message : `${label} failed`;
}
