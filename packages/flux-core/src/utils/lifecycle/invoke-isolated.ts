import { cloneDeep } from '../object.js';

export interface InvokeIsolatedOptions {
  onError: (error: unknown) => void;
  cloneArgs?: boolean;
}

// Calls a foreign hook (plugin, host callback) so that neither a synchronous
// throw nor an asynchronous rejection can escape into the owner's control flow,
// and optionally hands it deep-cloned arguments so it cannot write through
// into owner state.
export async function invokeIsolated<Args extends unknown[], Result>(
  fn: (...args: Args) => Result,
  args: Args,
  options: InvokeIsolatedOptions,
): Promise<Awaited<Result> | undefined> {
  const callArgs = options.cloneArgs ? (args.map((arg) => cloneDeep(arg)) as Args) : args;
  try {
    return await fn(...callArgs);
  } catch (error) {
    options.onError(error);
    return undefined;
  }
}
