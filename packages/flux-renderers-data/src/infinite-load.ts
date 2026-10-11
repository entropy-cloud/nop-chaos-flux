/**
 * Infinite-load result consumption shared by use-infinite-scroll, the crud
 * infinite scroll area and the list renderer (WA-data-001).
 *
 * The action dispatcher folds failures into a resolved `{ ok: false, error }`
 * ActionResult rather than a rejected promise, so consumers must interpret the
 * settled value to make the error UI reachable (G5).
 */

/** Return the load error carried by a settled ActionResult, or undefined. */
export function interpretActionResultError(value: unknown): unknown | undefined {
  if (value && typeof value === 'object') {
    const ok = (value as { ok?: boolean }).ok;
    if (ok === false) {
      return (value as { error?: unknown }).error ?? new Error('Load failed');
    }
  }
  return undefined;
}

/**
 * Retry pipeline shared by the crud infinite scroll area and the list renderer:
 * thenable results settle through error interpretation; non-thenables no-op.
 */
export function consumeLoadResult(
  result: unknown,
  handlers: { setError: (err: unknown) => void; setLoading: (next: boolean) => void },
): void {
  if (!result || typeof (result as Promise<unknown>).then !== 'function') {
    return;
  }
  handlers.setLoading(true);
  void Promise.resolve(result)
    .then((value) => {
      const error = interpretActionResultError(value);
      if (error !== undefined) {
        handlers.setError(error);
      }
    })
    .catch((err: unknown) => {
      handlers.setError(err);
    })
    .finally(() => {
      handlers.setLoading(false);
    });
}
