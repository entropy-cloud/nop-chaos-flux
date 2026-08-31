import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RuntimeContext, ScopeContext } from '@nop-chaos/flux-react';
import { BatchBarRenderer } from '../batch-bar.js';

afterEach(cleanup);

function makeScope() {
  return {
    id: 'scope-root',
    path: '$root',
    store: undefined,
    get: () => undefined,
    has: () => false,
    update: () => undefined,
    merge: () => undefined,
    readOwn: () => ({}),
    readVisible: () => ({}),
    materializeVisible: () => ({}),
  } as never;
}

function renderBatchBar(slotProps: Record<string, unknown>) {
  const rendererProps = {
    props: slotProps,
    meta: { className: undefined, testid: 'bar-no-path', cid: undefined },
    events: {},
    regions: {},
    helpers: {
      createScope: vi.fn(),
      disposeScope: vi.fn(),
      evaluateCompiled: vi.fn(),
    },
    templateNode: { structuralFields: {} },
  } as never;
  return render(
    <RuntimeContext.Provider value={{ env: { notify: vi.fn() } } as never}>
      <ScopeContext.Provider value={makeScope()}>
        <BatchBarRenderer {...(rendererProps as any)} />
      </ScopeContext.Provider>
    </RuntimeContext.Provider>,
  );
}

describe('batch-bar without selectionPath (05-02)', () => {
  it('renders nothing and never throws when selectionPath is not configured', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderBatchBar({ clearTarget: 'some-crud' })).not.toThrow();
    expect(document.querySelector('[data-slot="batch-bar"]')).toBeNull();
    errorSpy.mockRestore();
  });
});
