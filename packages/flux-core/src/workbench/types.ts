export interface DomainBridge<TSnapshot, TCommand, TResult> {
  getSnapshot(): TSnapshot;
  subscribe(listener: () => void): () => void;
  dispatch(command: TCommand): Promise<TResult>;
}

export type BusyActionPhase = 'idle' | 'running' | 'done' | 'error';

export interface BusyActionState {
  phase: BusyActionPhase;
  error?: unknown;
}

export interface WorkbenchSessionState {
  dirty: boolean;
  busy: boolean;
  canUndo: boolean;
  canRedo: boolean;
  leaveGuardActive: boolean;
}

export interface ResourceBrowserInteractionPolicy {
  primaryAction: 'select' | 'insert';
  supportsKeyboard: boolean;
  supportsDragAndDrop: boolean;
  secondaryActions: Array<'edit' | 'delete' | 'more'>;
}
