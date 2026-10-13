import type { ScopeChange, ScopeRef } from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { createScopeRef } from './scope.js';

type ScopeSubscriptionVerdict = 'skip' | 'emit' | 'wildcard-replace-emit';

interface StoreBackedScopeAdapterInput<TSignal> {
  id: string;
  path: string;
  parent?: ScopeRef;
  initialData?: Record<string, any>;
  getLastChange: () => ScopeChange;
  setLastChange: (change: ScopeChange) => void;
  getSnapshot: () => Record<string, any>;
  commitSnapshot: (next: Record<string, any>) => void;
  subscribeStore: (listener: () => void) => () => void;
  readSignal: () => TSignal;
  subscriptionGate: (next: TSignal, previous: TSignal) => ScopeSubscriptionVerdict;
  applyUpdate: (path: string, value: unknown) => void;
}

export function createStoreBackedScopeAdapter<TSignal>(
  input: StoreBackedScopeAdapterInput<TSignal>,
): ScopeRef {
  return createScopeRef({
    id: input.id,
    path: input.path,
    ...(input.parent !== undefined ? { parent: input.parent } : {}),
    ...(input.initialData !== undefined ? { initialData: input.initialData } : {}),
    store: {
      getSnapshot: input.getSnapshot,
      getLastChange: input.getLastChange,
      setSnapshot: (next, change) => {
        input.setLastChange(
          change ?? {
            paths: ['*'],
            sourceScopeId: input.id,
            kind: 'replace',
          },
        );
        input.commitSnapshot(next);
      },
      subscribe: (listener) => {
        let previous = input.readSignal();

        return input.subscribeStore(() => {
          const next = input.readSignal();
          const verdict = input.subscriptionGate(next, previous);

          if (verdict === 'skip') {
            return;
          }

          previous = next;
          if (verdict === 'wildcard-replace-emit') {
            input.setLastChange({
              paths: ['*'],
              sourceScopeId: input.id,
              kind: 'replace',
            });
          }
          listener(input.getLastChange());
        });
      },
    },
    update: (path, value) => {
      const current = input.getSnapshot();
      const oldValue = path ? getIn(current, path) : current;
      if (Object.is(oldValue, value)) {
        return;
      }
      input.setLastChange({
        paths: [path || '*'],
        sourceScopeId: input.id,
        kind: 'update',
      });
      input.applyUpdate(path, value);
    },
  });
}
