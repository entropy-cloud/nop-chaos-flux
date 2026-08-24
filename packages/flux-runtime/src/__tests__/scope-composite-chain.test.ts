import { describe, it, expect } from 'vitest';
import { createScopeRef } from '../scope.js';
import { createFormStore } from '../form-store.js';
import { getIn } from '@nop-chaos/flux-core';

describe('form-store-backed page scope + import overlay notification', () => {
  it('child composite subscribers hear writes that go through the custom update path', async () => {
    const store = createFormStore({ suggestionProbe: '' });
    let lastChange: any = { paths: ['*'], sourceScopeId: 'page-root-validation', kind: 'replace', revision: 0 };
    let revision = 0;

    const pageScope = createScopeRef({
      id: 'page-root-validation',
      path: '$page',
      initialData: store.getState().values,
      store: {
        getSnapshot: () => store.getState().values,
        getLastChange: () => lastChange,
        setSnapshot: (next: any, change: any) => {
          revision += 1;
          lastChange = { ...(change ?? { paths: ['*'], sourceScopeId: 'page-root-validation', kind: 'replace' }), revision };
          store.setValues(next);
        },
        subscribe: (listener: any) => {
          let previousValues = store.getState().values;
          return store.subscribe(() => {
            const nextValues = store.getState().values;
            if (nextValues === previousValues) return;
            previousValues = nextValues;
            listener(lastChange);
          });
        },
      },
      update: (path: string, value: unknown) => {
        const currentValues = store.getState().values;
        const oldValue = path ? getIn(currentValues, path) : currentValues;
        if (Object.is(oldValue, value)) return;
        revision += 1;
        lastChange = { paths: [path || '*'], sourceScopeId: 'page-root-validation', kind: 'update', revision };
        store.setValue(path, value);
      },
    });

    const overlay = createScopeRef({
      id: 'page:imports:test',
      path: '$page.imports',
      parent: pageScope,
      initialData: { $ai: { connectors: {} } },
    });

    let childNotified = 0;
    overlay.store?.subscribe(() => {
      childNotified += 1;
    });

    overlay.update('suggestionProbe', 'fired');
    await Promise.resolve();

    expect(childNotified).toBe(1);
    expect(overlay.readVisible?.().suggestionProbe).toBe('fired');
  });
});
