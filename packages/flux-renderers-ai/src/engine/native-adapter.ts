import type { InternalMessageState, MessageStateAdapter } from './types.js';
import { BaseMessageStateAdapter } from './state-adapter.js';

/**
 * Pure-TS state adapter: holds state in a closure, no view-layer coupling.
 * Used for engine unit tests and any non-React host. Notifications are
 * synchronous (the recipe runs, then listeners fire).
 *
 * Framework-agnostic: no `react`/DOM references (INV-1).
 */
export function createNativeMessageAdapter(
  initial?: Partial<InternalMessageState>,
): MessageStateAdapter & { replaceState(next: InternalMessageState): void } {
  const adapter = new BaseNativeAdapter();

  const fallback: InternalMessageState = {
    messages: [],
    requestState: 'idle',
    isProcessing: false,
    abortController: null,
    connector: null,
    ...initial,
  };

  adapter.initialize(fallback);
  return adapter;
}

class BaseNativeAdapter extends BaseMessageStateAdapter {
  replaceState(next: InternalMessageState): void {
    this.state = next;
    this.notify('full');
  }
}
