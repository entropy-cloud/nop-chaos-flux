import { describe, expect, it } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import {
  chartRenderer,
  compileNode,
  createCompiler,
  crudRenderer,
  detailFieldRenderer,
  loopRenderer,
  recurseRenderer,
  tableRenderer,
  tabsRenderer,
  treeRenderer,
  variantFieldRenderer,
  noop,
} from './schema-compiler-prop-coverage.test-support.js';

describe('schema property coverage - recurse', () => {
  const compiler = createCompiler(recurseRenderer);

  it('compiles recurse with itemName', () => {
    const root = compileNode(compiler, {
      type: 'recurse',
      items: [],
      itemName: 'child',
      maxDepth: 3,
    });
    expect(root.propsProgram.value.itemName).toBe('child');
  });

  it('compiles recurse with indexName', () => {
    const root = compileNode(compiler, {
      type: 'recurse',
      items: [],
      indexName: 'idx',
      maxDepth: 3,
    });
    expect(root.propsProgram.value.indexName).toBe('idx');
  });

  it('compiles recurse with itemData', () => {
    const root = compileNode(compiler, {
      type: 'recurse',
      items: [],
      itemData: { extra: true },
      maxDepth: 3,
    });
    expect(root.propsProgram.value.itemData).toBeUndefined();
    expect(root.structuralFields?.itemData?.kind).toBe('static');
    expect(root.structuralFields?.itemData && 'value' in root.structuralFields.itemData ? root.structuralFields.itemData.value : undefined).toEqual({ extra: true });
  });

  it('compiles recurse with keyBy', () => {
    const root = compileNode(compiler, {
      type: 'recurse',
      items: [],
      keyBy: 'item.id',
      maxDepth: 3,
    });
    expect(root.propsProgram.value.keyBy).toBe('item.id');
  });

  it('compiles recurse with keyName', () => {
    const root = compileNode(compiler, {
      type: 'recurse',
      items: [],
      keyName: 'nodeId',
      maxDepth: 3,
    });
    expect(root.propsProgram.value.keyName).toBe('nodeId');
  });
});

describe('schema property coverage - table', () => {
  const compiler = createCompiler(tableRenderer);

  it('compiles table with loadingSlot', () => {
    const root = compileNode(compiler, {
      type: 'table',
      loadingSlot: 'Loading...',
    });
    expect(root.propsProgram.value.loadingSlot).toBe('Loading...');
  });

  it('compiles table with onFilterChange event', () => {
    const root = compileNode(compiler, {
      type: 'table',
      onFilterChange: { action: 'ajax', args: { url: '/filter' } },
    });
    expect(root.eventPlans.onFilterChange).toBeDefined();
  });

  it('compiles table with onSelectionChange event', () => {
    const root = compileNode(compiler, {
      type: 'table',
      onSelectionChange: {
        action: 'setValue',
        args: { path: 'selected', value: '${selectedKeys}' },
      },
    });
    expect(root.eventPlans.onSelectionChange).toBeDefined();
  });

  it('compiles table with onSortChange event', () => {
    const root = compileNode(compiler, {
      type: 'table',
      onSortChange: { action: 'ajax', args: { url: '/sort' } },
    });
    expect(root.eventPlans.onSortChange).toBeDefined();
  });
});

describe('schema property coverage - crud', () => {
  const compiler = createCompiler(crudRenderer);

  it('compiles crud with defaultParams', () => {
    const root = compileNode(compiler, {
      type: 'crud',
      defaultParams: { pageSize: 20, status: 'active' },
    });
    expect(root.propsProgram.value.defaultParams).toEqual({ pageSize: 20, status: 'active' });
  });

  it('compiles crud with onQueryReset event', () => {
    const root = compileNode(compiler, {
      type: 'crud',
      onQueryReset: { action: 'setValue', args: { path: 'query', value: {} } },
    });
    expect(root.eventPlans.onQueryReset).toBeDefined();
  });

  it('compiles crud with onRowClick event', () => {
    const root = compileNode(compiler, {
      type: 'crud',
      onRowClick: { action: 'navigate', args: { url: '/detail/${row.id}' } },
    });
    expect(root.eventPlans.onRowClick).toBeDefined();
  });

  it('compiles crud with onSelectionChange event', () => {
    const root = compileNode(compiler, {
      type: 'crud',
      onSelectionChange: {
        action: 'setValue',
        args: { path: 'selected', value: '${selectedKeys}' },
      },
    });
    expect(root.eventPlans.onSelectionChange).toBeDefined();
  });

  it('compiles crud with selection config', () => {
    const root = compileNode(compiler, {
      type: 'crud',
      selection: { mode: 'multiple', rowKey: 'id' },
    });
    expect(root.propsProgram.value.selection.mode).toBe('multiple');
  });

  it('compiles crud with shape (columns, source, rowKey, etc.)', () => {
    const root = compileNode(compiler, {
      type: 'crud',
      source: { formula: '[]' },
      columns: [{ label: 'Name', name: 'name' }],
      rowKey: 'id',
    });
    expect(root.propsProgram.value.columns).toHaveLength(1);
    expect(root.propsProgram.value.rowKey).toBe('id');
  });
});

describe('schema property coverage - tree', () => {
  const compiler = createCompiler(treeRenderer);

  it('compiles tree with childrenKey', () => {
    const root = compileNode(compiler, {
      type: 'tree',
      data: [],
      childrenKey: 'items',
    });
    expect(root.propsProgram.value.childrenKey).toBe('items');
  });

  it('compiles tree with keyField', () => {
    const root = compileNode(compiler, {
      type: 'tree',
      data: [],
      keyField: 'uid',
    });
    expect(root.propsProgram.value.keyField).toBe('uid');
  });

  it('compiles tree with labelField', () => {
    const root = compileNode(compiler, {
      type: 'tree',
      data: [],
      labelField: 'text',
    });
    expect(root.propsProgram.value.labelField).toBe('text');
  });
});

describe('schema property coverage - chart', () => {
  const compiler = createCompiler(chartRenderer);

  it('compiles chart with onClick event', () => {
    const root = compileNode(compiler, {
      type: 'chart',
      onClick: { action: 'showToast', args: { message: 'clicked' } },
    });
    expect(root.eventPlans.onClick).toBeDefined();
  });

  it('compiles chart with onHover event', () => {
    const root = compileNode(compiler, {
      type: 'chart',
      onHover: { action: 'setValue', args: { path: 'hovered', value: true } },
    });
    expect(root.eventPlans.onHover).toBeDefined();
  });
});

describe('schema property coverage - variant-field', () => {
  const compiler = createCompiler(variantFieldRenderer);

  it('accepts transformOutAction as ignored field (no error)', () => {
    expect(() =>
      compileNode(compiler, {
        type: 'variant-field',
        name: 'type',
        transformOutAction: { action: 'ajax', args: { url: '/transform' } },
      }),
    ).not.toThrow();
  });

  it('accepts validateValueAction as ignored field (no error)', () => {
    expect(() =>
      compileNode(compiler, {
        type: 'variant-field',
        name: 'type',
        validateValueAction: { action: 'ajax', args: { url: '/validate' } },
      }),
    ).not.toThrow();
  });
});

describe('schema property coverage - detail-field', () => {
  const textRenderer: RendererDefinition = {
    type: 'text',
    component: noop,
    fields: [{ key: 'text', kind: 'prop' }],
  };
  const compiler = createCompiler(detailFieldRenderer, textRenderer);

  it('compiles detail-field with viewer region', () => {
    const root = compileNode(compiler, {
      type: 'detail-field',
      name: 'detail',
      viewer: { type: 'text', text: 'viewer content' },
    });
    expect(root.regions.viewer).toBeDefined();
    expect(root.propsProgram.value.name).toBe('detail');
  });
});

describe('schema property coverage - detail-view', () => {
  const detailViewRenderer: RendererDefinition = {
    type: 'detail-view',
    component: noop,
    fields: [
      { key: 'name', kind: 'prop' },
      { key: 'viewer', kind: 'region', regionKey: 'viewer' },
      { key: 'content', kind: 'region', regionKey: 'content' },
    ],
  };
  const textRenderer: RendererDefinition = {
    type: 'text',
    component: noop,
    fields: [{ key: 'text', kind: 'prop' }],
  };
  const compiler = createCompiler(detailViewRenderer, textRenderer);

  it('delivers detail-view name through normalized props', () => {
    const root = compileNode(compiler, {
      type: 'detail-view',
      name: 'settings.profile',
      viewer: { type: 'text', text: 'viewer content' },
    });

    expect(root.regions.viewer).toBeDefined();
    expect(root.propsProgram.value.name).toBe('settings.profile');
  });
});

describe('schema property coverage - loop', () => {
  const compiler = createCompiler(loopRenderer);

  it('compiles loop with itemData prop', () => {
    const root = compileNode(compiler, {
      type: 'loop',
      items: [1, 2, 3],
      itemData: { extra: true },
      body: [],
    });
    expect(root.propsProgram.value.itemData).toBeUndefined();
    expect(root.structuralFields?.itemData?.kind).toBe('static');
    expect(root.structuralFields?.itemData && 'value' in root.structuralFields.itemData ? root.structuralFields.itemData.value : undefined).toEqual({ extra: true });
  });
});

describe('schema property coverage - tabs', () => {
  const compiler = createCompiler(tabsRenderer);

  it('compiles tabs with onChange event', () => {
    const root = compileNode(compiler, {
      type: 'tabs',
      items: [{ key: 'a', title: 'A', body: [] }],
      onChange: { action: 'setValue', args: { path: 'tab', value: '${key}' } },
    });
    expect(root.eventPlans.onChange).toBeDefined();
  });
});
