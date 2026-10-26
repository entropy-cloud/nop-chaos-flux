// Runs `body` and then every reset exactly once, in reverse registration
// order, on every exit path (return, throw, abort). The body's own result or
// error is preserved; a reset that throws is attached as `cause` instead of
// masking the body error.
export async function runWithExitResets<T>(
  body: () => Promise<T> | T,
  resets: ReadonlyArray<() => void>,
): Promise<T> {
  let bodyError: unknown;
  let hasBodyError = false;
  let result: T | undefined;
  try {
    result = await body();
  } catch (error) {
    bodyError = error;
    hasBodyError = true;
  }

  let resetError: unknown;
  let hasResetError = false;
  for (let index = resets.length - 1; index >= 0; index -= 1) {
    try {
      resets[index]();
    } catch (error) {
      if (!hasResetError) {
        resetError = error;
        hasResetError = true;
      }
    }
  }

  if (hasBodyError) {
    if (hasResetError && bodyError instanceof Error && bodyError.cause === undefined) {
      bodyError.cause = resetError;
    }
    throw bodyError;
  }
  if (hasResetError) throw resetError;
  return result as T;
}
