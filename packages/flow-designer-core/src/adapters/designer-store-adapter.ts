import type { DesignerSnapshot } from '../types.js';
import type { DesignerCore } from '../designer-core-types.js';

export interface DesignerStoreAdapter {
  getState(): DesignerSnapshot;
  subscribe(listener: () => void): () => void;
  getSnapshot(): DesignerSnapshot;
}

export function createDesignerStoreAdapter(core: DesignerCore): DesignerStoreAdapter {
  let cached: DesignerSnapshot = core.getSnapshot();

  function getState(): DesignerSnapshot {
    return cached;
  }

  function getSnapshot(): DesignerSnapshot {
    return cached;
  }

  function subscribe(listener: () => void): () => void {
    const dispose = core.subscribe(() => {
      cached = core.getSnapshot();
      listener();
    });
    return dispose;
  }

  return { getState, subscribe, getSnapshot };
}
