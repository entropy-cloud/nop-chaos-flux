import type { MessageStateSubscribe, MessageUpdateKind, PublicMessageState } from '../engine/types.js';
import { BaseMessageStateAdapter } from '../engine/state-adapter.js';
import type { InternalMessageState, MessageStateListener } from '../engine/types.js';

/**
 * React-optimized state adapter.
 *
 * The key difference from `createNativeMessageAdapter`: it keeps a **cached
 * snapshot** rebuilt (new reference) only when a mutation is committed. This
 * lets React's `useSyncExternalStore(subscribe, getSnapshot)` see a stable
 * reference between notifications (avoiding render loops) while still reacting
 * to every chunk during streaming.
 *
 * The adapter itself has no `react` import — it only needs to honour the
 * snapshot-identity contract that `useSyncExternalStore` requires. The React
 * binding lives in `use-message.ts`.
 */
export function createReactMessageAdapter() {
  return new ReactMessageAdapter();
}

class ReactMessageAdapter extends BaseMessageStateAdapter {
  private cached: PublicMessageState | null = null;

  override getState(): PublicMessageState {
    if (this.cached === null) {
      this.cached = this.buildSnapshot();
    }
    return this.cached;
  }

  /**
   * Replace the cached snapshot with a fresh reference, then fan out to the
   * matching kind channel + full subscribers.
   */
  protected override notify(kind: MessageUpdateKind): void {
    this.cached = this.buildSnapshot();
    this.publish(kind, this.cached);
  }

  /** Replace the whole internal state and publish a fresh snapshot. */
  replaceState(next: InternalMessageState): void {
    this.state = next;
    this.cached = this.buildSnapshot();
    this.publish('full', this.cached);
  }

  private buildSnapshot(): PublicMessageState {
    return {
      messages: this.state.messages,
      requestState: this.state.requestState,
      processingState: this.state.processingState,
      isProcessing: this.state.isProcessing,
      lastError: this.state.lastError,
    };
  }
}

export type { MessageStateSubscribe, MessageStateListener };
