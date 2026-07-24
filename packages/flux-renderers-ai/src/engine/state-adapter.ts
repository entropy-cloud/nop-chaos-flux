import type {
  AiConnector,
  ChatMessage,
  InternalMessageState,
  MessageStateAdapter,
  MessageStateListener,
  MessageStateSubscribe,
  MessageUpdateKind,
  PublicMessageState,
} from './types.js';

/**
 * Shared subscribe/notify implementation used by both the native and React
 * adapters. Keeps a `Set<listener>` per kind plus a wildcard `Set` for full
 * subscriptions, so a single `mutate(kind, recipe)` fans out only to the
 * relevant channels (avoids re-render storms for high-frequency streaming).
 *
 * Framework-agnostic: no `react`/DOM references.
 */
export abstract class BaseMessageStateAdapter implements MessageStateAdapter {
  protected state!: InternalMessageState;

  private readonly kindListeners = new Map<MessageUpdateKind, Set<MessageStateListener>>();
  private readonly fullListeners = new Set<MessageStateListener>();

  initialize(initialState: InternalMessageState): void {
    this.state = initialState;
  }

  getState(): PublicMessageState {
    const { messages, requestState, processingState, isProcessing, lastError } = this.state;
    return { messages, requestState, processingState, isProcessing, lastError };
  }

  getConnector(): AiConnector | null {
    return this.state.connector;
  }

  getAbortController(): AbortController | null {
    return this.state.abortController;
  }

  createMessage<T extends ChatMessage>(message: T): T {
    return message;
  }

  mutate(kind: MessageUpdateKind, recipe: (draft: InternalMessageState) => void): void {
    recipe(this.state);
    this.notify(kind);
  }

  subscribe: MessageStateSubscribe = ((...args: unknown[]) => {
    if (args.length >= 2) {
      const kind = args[0] as MessageUpdateKind;
      const listener = args[1] as MessageStateListener;
      let set = this.kindListeners.get(kind);
      if (!set) {
        set = new Set();
        this.kindListeners.set(kind, set);
      }
      set.add(listener);
      return () => {
        set!.delete(listener);
      };
    }
    const listener = args[0] as MessageStateListener;
    this.fullListeners.add(listener);
    return () => {
      this.fullListeners.delete(listener);
    };
  }) as MessageStateSubscribe;

  /**
   * Subclasses override to publish a fresh snapshot reference for React's
   * `useSyncExternalStore` (reference identity matters). Default just calls.
   */
  protected publish(kind: MessageUpdateKind, snapshot: PublicMessageState): void {
    const kindSet = this.kindListeners.get(kind);
    if (kindSet) {
      for (const listener of kindSet) listener(snapshot);
    }
    for (const listener of this.fullListeners) listener(snapshot);
  }

  protected notify(kind: MessageUpdateKind): void {
    this.publish(kind, this.getState());
  }
}
