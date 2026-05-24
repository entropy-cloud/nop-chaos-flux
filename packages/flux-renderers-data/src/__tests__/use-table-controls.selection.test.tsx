import React from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createHelpers,
  SelectionProbe,
  renderScopeUpdate,
  resetTableControlTestState,
  mockScopeState,
} from './use-table-controls.test-support.js';

describe('useTableSelection', () => {
  beforeEach(() => {
    resetTableControlTestState();
  });

  it('manages local selection, select-all, and external selection updates', () => {
    const helpers = createHelpers();
    const onSelectionChange = vi.fn();
    const source = [{ id: 1 }, { id: 2 }];
    let api: any;

    render(
      <SelectionProbe
        schemaProps={{ rowSelection: { selectedRowKeys: [] } }}
        source={source}
        onSelectionChange={onSelectionChange}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(Array.from(api.selectedRowKeys)).toEqual([]);
    expect(api.allSelected).toBe(false);

    act(() => {
      api.handleSelectRow('1', true);
    });
    expect(Array.from(api.selectedRowKeys)).toEqual(['1']);

    act(() => {
      api.handleSelectAll(true);
    });
    expect(Array.from(api.selectedRowKeys)).toEqual(['1', '2']);
    expect(api.allSelected).toBe(true);

    act(() => {
      api.setSelectionExternal(new Set(['2']));
    });
    expect(Array.from(api.selectedRowKeys)).toEqual(['2']);
    expect(onSelectionChange).toHaveBeenCalled();
    expect(onSelectionChange).toHaveBeenLastCalledWith(null, {
      event: {
        type: 'table:selection-change',
        selectedRowKeys: ['2'],
        selection: { selectedRowKeys: ['2'] },
      },
      scope: {
        value: {
          type: 'table:selection-change',
          selectedRowKeys: ['2'],
          selection: { selectedRowKeys: ['2'] },
        },
        options: { scopeKey: 'selection', pathSuffix: 'selection' },
      },
      evaluationBindings: {
        type: 'table:selection-change',
        selectedRowKeys: ['2'],
        selection: { selectedRowKeys: ['2'] },
      },
    });
  });

  it('uses controlled and scope-backed selection ownership', () => {
    const helpers = createHelpers();
    let api: any;

    const controlled = render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'controlled',
          rowSelection: { selectedRowKeys: ['r2'] },
        }}
        source={[{ id: 'r1' }, { id: 'r2' }]}
        onSelectionChange={vi.fn()}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(Array.from(api.selectedRowKeys)).toEqual(['r2']);

    act(() => {
      api.handleSelectRow('r1', true);
    });
    expect(Array.from(api.selectedRowKeys)).toEqual(['r2']);

    controlled.unmount();

    mockScopeState.data = { tableState: { selected: ['r3'] } };
    render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'scope',
          selectionStatePath: 'tableState.selected',
          rowSelection: { selectedRowKeys: [] },
        }}
        source={[{ id: 'r3' }]}
        onSelectionChange={vi.fn()}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(Array.from(api.selectedRowKeys)).toEqual(['r3']);

    act(() => {
      api.handleSelectRow('r3', false);
    });
    expect(renderScopeUpdate).toHaveBeenCalledWith('tableState.selected', []);
  });

  it('uses normalized rowKey values for select-all state', () => {
    const helpers = createHelpers();
    let api: any;

    render(
      <SelectionProbe
        schemaProps={{
          rowKey: 'meta.key',
          rowSelection: { selectedRowKeys: ['user-1', 'user-2'], type: 'checkbox' },
          selectionOwnership: 'controlled',
        }}
        source={[{ id: '1', meta: { key: 'user-1' } }, { id: '2', meta: { key: 'user-2' } }]}
        onSelectionChange={vi.fn()}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(api.allSelected).toBe(true);
  });

  it('select-all only targets the current processed rows after filter/sort/pagination', () => {
    const helpers = createHelpers();
    let api: any;

    render(
      <SelectionProbe
        schemaProps={{
          rowSelection: { selectedRowKeys: [], type: 'checkbox' },
          selectionOwnership: 'local',
        }}
        source={[
          { id: 'visible-2', name: 'Bob' },
          { id: 'visible-1', name: 'Alice' },
        ]}
        onSelectionChange={vi.fn()}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => {
      api.handleSelectAll(true);
    });

    expect(Array.from(api.selectedRowKeys)).toEqual(['visible-2', 'visible-1']);
    expect(api.allSelected).toBe(true);
  });

  it('accumulates checkbox selections in scope ownership mode', () => {
    const helpers = createHelpers();
    const onSelectionChange = vi.fn();
    const source = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    let api: any;

    mockScopeState.data = { sel: [] };
    renderScopeUpdate.mockImplementation((_path: string, value: string[]) => {
      mockScopeState.data = { sel: value };
    });

    const { rerender } = render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'scope',
          selectionStatePath: 'sel',
          rowSelection: { selectedRowKeys: [], type: 'checkbox' },
        }}
        source={source}
        onSelectionChange={onSelectionChange}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => {
      api.handleSelectRow('a', true);
    });
    expect(renderScopeUpdate).toHaveBeenLastCalledWith('sel', ['a']);
    mockScopeState.data = { sel: ['a'] };

    rerender(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'scope',
          selectionStatePath: 'sel',
          rowSelection: { selectedRowKeys: [], type: 'checkbox' },
        }}
        source={source}
        onSelectionChange={onSelectionChange}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => {
      api.handleSelectRow('b', true);
    });
    expect(renderScopeUpdate).toHaveBeenLastCalledWith('sel', ['a', 'b']);
    mockScopeState.data = { sel: ['a', 'b'] };

    rerender(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'scope',
          selectionStatePath: 'sel',
          rowSelection: { selectedRowKeys: [], type: 'checkbox' },
        }}
        source={source}
        onSelectionChange={onSelectionChange}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => {
      api.handleSelectRow('a', false);
    });
    expect(renderScopeUpdate).toHaveBeenLastCalledWith('sel', ['b']);
  });

  it('replaces selection in radio mode (scope ownership)', () => {
    const helpers = createHelpers();
    const onSelectionChange = vi.fn();
    const source = [{ id: 'x' }, { id: 'y' }];
    let api: any;

    mockScopeState.data = { sel: [] };
    renderScopeUpdate.mockImplementation((_path: string, value: string[]) => {
      mockScopeState.data = { sel: value };
    });

    const { rerender } = render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'scope',
          selectionStatePath: 'sel',
          rowSelection: { selectedRowKeys: [], type: 'radio' },
        }}
        source={source}
        onSelectionChange={onSelectionChange}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => {
      api.handleSelectRow('x', true);
    });
    expect(renderScopeUpdate).toHaveBeenLastCalledWith('sel', ['x']);

    mockScopeState.data = { sel: ['x'] };
    rerender(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'scope',
          selectionStatePath: 'sel',
          rowSelection: { selectedRowKeys: [], type: 'radio' },
        }}
        source={source}
        onSelectionChange={onSelectionChange}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => {
      api.handleSelectRow('y', true);
    });
    expect(renderScopeUpdate).toHaveBeenLastCalledWith('sel', ['y']);

    mockScopeState.data = { sel: ['y'] };
    rerender(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'scope',
          selectionStatePath: 'sel',
          rowSelection: { selectedRowKeys: [], type: 'radio' },
        }}
        source={source}
        onSelectionChange={onSelectionChange}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => {
      api.handleSelectRow('y', false);
    });
    expect(renderScopeUpdate).toHaveBeenLastCalledWith('sel', []);
  });

  it('accumulates local checkbox selections across multiple clicks', () => {
    const helpers = createHelpers();
    const onSelectionChange = vi.fn();
    const source = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    let api: any;

    render(
      <SelectionProbe
        schemaProps={{ rowSelection: { selectedRowKeys: [], type: 'checkbox' } }}
        source={source}
        onSelectionChange={onSelectionChange}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => {
      api.handleSelectRow('a', true);
    });
    expect(Array.from(api.selectedRowKeys)).toEqual(['a']);

    act(() => {
      api.handleSelectRow('b', true);
    });
    expect(Array.from(api.selectedRowKeys)).toEqual(['a', 'b']);

    act(() => {
      api.handleSelectRow('c', true);
    });
    expect(Array.from(api.selectedRowKeys)).toEqual(['a', 'b', 'c']);

    act(() => {
      api.handleSelectRow('a', false);
    });
    expect(Array.from(api.selectedRowKeys)).toEqual(['b', 'c']);
  });

  it('replaces local selection in radio mode', () => {
    const helpers = createHelpers();
    const onSelectionChange = vi.fn();
    const source = [{ id: 'x' }, { id: 'y' }];
    let api: any;

    render(
      <SelectionProbe
        schemaProps={{ rowSelection: { selectedRowKeys: [], type: 'radio' } }}
        source={source}
        onSelectionChange={onSelectionChange}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => {
      api.handleSelectRow('x', true);
    });
    expect(Array.from(api.selectedRowKeys)).toEqual(['x']);

    act(() => {
      api.handleSelectRow('y', true);
    });
    expect(Array.from(api.selectedRowKeys)).toEqual(['y']);

    act(() => {
      api.handleSelectRow('y', false);
    });
    expect(Array.from(api.selectedRowKeys)).toEqual([]);
  });
});
