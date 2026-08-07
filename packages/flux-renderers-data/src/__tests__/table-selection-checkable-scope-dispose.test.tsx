import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTableSelection } from '../table-renderer/use-table-selection.js';
import { buildTableRowEntries } from '../table-renderer/table-data.js';

vi.mock('@nop-chaos/flux-react', () => ({
  useRenderScope: () => ({ update: vi.fn() }),
  useScopeSelector: () => undefined,
}));

function createSpyHelpers() {
  const created: string[] = [];
  const disposed: string[] = [];
  let scopeCounter = 0;
  const helpers = {
    createScope: vi.fn((patch: Record<string, unknown>) => {
      const id = `checkable-scope-${scopeCounter++}`;
      created.push(id);
      return {
        id,
        get(key: string) {
          return (patch as Record<string, unknown>)[key];
        },
        has(key: string) {
          return key in patch;
        },
      };
    }),
    disposeScope: vi.fn((id: string) => {
      disposed.push(id);
    }),
    evaluate: vi.fn((target: unknown, scope: { get: (key: string) => unknown }) => {
      const wrapped = String(target);
      const inner = wrapped.startsWith('${') ? wrapped.slice(2, -1).trim() : wrapped;
      return scope.get(inner);
    }),
  };
  return { created, disposed, helpers };
}

function SelectionProbe(props: {
  schemaProps: any;
  source: Array<Record<string, any>>;
  helpers?: any;
  onReady: (value: any) => void;
}) {
  const rows = buildTableRowEntries(props.source, props.schemaProps.rowKey);
  const api = useTableSelection(
    props.schemaProps,
    rows,
    undefined,
    props.helpers,
  );
  React.useEffect(() => {
    props.onReady(api);
  });
  return null;
}

afterEach(() => {
  cleanup();
});

describe('useTableSelection checkableWhen — one-shot scope pairing', () => {
  it('creates and disposes one scope per row while evaluating checkableWhen (09-01)', () => {
    const { created, disposed, helpers } = createSpyHelpers();
    let api: any;

    render(
      <SelectionProbe
        schemaProps={{
          rowSelection: {
            type: 'checkbox',
            checkableWhen: 'enabled',
          },
        }}
        source={[
          { id: 'r1', enabled: true },
          { id: 'r2', enabled: false },
        ]}
        helpers={helpers as any}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(api.isRowCheckable('r1')).toBe(true);
    expect(api.isRowCheckable('r2')).toBe(false);
    expect(api.isRowCheckable('missing')).toBe(false);

    expect(created.length).toBe(2);
    expect(disposed).toEqual(created);
  });

  it('does not create any scope when checkableWhen is absent', () => {
    const { created, helpers } = createSpyHelpers();
    let api: any;

    render(
      <SelectionProbe
        schemaProps={{
          rowSelection: { type: 'checkbox' },
        }}
        source={[{ id: 'r1' }]}
        helpers={helpers as any}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(api.isRowCheckable('r1')).toBe(true);
    expect(created.length).toBe(0);
  });
});
