import { describe, expect, it } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createSchemaCompiler } from './index';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';

function createCompiler(...definitions: RendererDefinition[]) {
  return createSchemaCompiler({
    registry: createRendererRegistry(definitions),
    expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
  });
}

const noop = () => null;

const dialogRenderer: RendererDefinition = {
  type: 'dialog',
  component: noop,
  regions: ['body', 'actions'],
  fields: [
    { key: 'title', kind: 'value-or-region', regionKey: 'title' },
    { key: 'onOpen', kind: 'event' },
    { key: 'onClose', kind: 'event' },
    { key: 'container', kind: 'prop' },
    { key: 'showMask', kind: 'prop' },
  ],
};

const drawerRenderer: RendererDefinition = {
  type: 'drawer',
  component: noop,
  regions: ['body', 'actions'],
  fields: [
    { key: 'title', kind: 'value-or-region', regionKey: 'title' },
    { key: 'onOpen', kind: 'event' },
    { key: 'onClose', kind: 'event' },
    { key: 'container', kind: 'prop' },
    { key: 'showMask', kind: 'prop' },
  ],
};

const buttonRenderer: RendererDefinition = {
  type: 'button',
  component: noop,
  propContracts: {
    label: { shape: { kind: 'string' }, displayName: 'Label' },
    variant: {
      shape: { kind: 'union', anyOf: [{ kind: 'literal', value: 'default' }] },
      displayName: 'Variant',
    },
    size: {
      shape: { kind: 'union', anyOf: [{ kind: 'literal', value: 'default' }] },
      displayName: 'Size',
    },
    disabled: { shape: { kind: 'boolean' }, displayName: 'Disabled' },
  },
  fields: [{ key: 'onClick', kind: 'event' }],
};

const loopRenderer: RendererDefinition = {
  type: 'loop',
  component: noop,
  defaultSchema: { type: 'loop', body: [] },
  regions: ['empty'],
  fields: [
    { key: 'items', kind: 'prop' },
    { key: 'itemName', kind: 'prop' },
    { key: 'indexName', kind: 'prop' },
    { key: 'keyName', kind: 'prop' },
    { key: 'itemData', kind: 'prop' },
    { key: 'keyBy', kind: 'prop' },
    { key: 'body', kind: 'region', params: ['item', 'index'] },
  ],
};

const recurseRenderer: RendererDefinition = {
  type: 'recurse',
  component: noop,
  fields: [
    { key: 'items', kind: 'prop' },
    { key: 'itemName', kind: 'prop' },
    { key: 'indexName', kind: 'prop' },
    { key: 'keyName', kind: 'prop' },
    { key: 'itemData', kind: 'prop' },
    { key: 'keyBy', kind: 'prop' },
    { key: 'maxDepth', kind: 'prop' },
  ],
};

const tabsRenderer: RendererDefinition = {
  type: 'tabs',
  component: noop,
  regions: ['toolbar'],
  fields: [
    { key: 'onChange', kind: 'event' },
    { key: 'items', kind: 'prop' },
  ],
};

const formRenderer: RendererDefinition = {
  type: 'form',
  component: noop,
  defaultSchema: { type: 'form', body: [], actions: [] },
  regions: ['body', 'actions'],
  propContracts: {
    data: { shape: { kind: 'object', fields: {} }, displayName: 'Data' },
    statusPath: { shape: { kind: 'string' }, displayName: 'Status Path' },
    valuesPath: { shape: { kind: 'string' }, displayName: 'Values Path' },
    hiddenFieldPolicy: {
      shape: {
        kind: 'union',
        anyOf: [
          { kind: 'literal', value: 'validate' },
          { kind: 'literal', value: 'ignore' },
          {
            kind: 'object',
            fields: {
              validateWhenHidden: { kind: 'boolean' },
              clearValueWhenHidden: { kind: 'boolean' },
            },
            optional: ['validateWhenHidden', 'clearValueWhenHidden'],
          },
        ],
      },
      displayName: 'Hidden Field Policy',
    },
  },
  fields: [
    { key: 'initAction', kind: 'event' },
    { key: 'submitAction', kind: 'event' },
    { key: 'onSubmitSuccess', kind: 'event' },
    { key: 'onSubmitError', kind: 'event' },
    { key: 'onValidateError', kind: 'event' },
    { key: 'statusPath', kind: 'prop' },
    { key: 'valuesPath', kind: 'prop' },
    { key: 'mode', kind: 'prop' },
    { key: 'labelAlign', kind: 'prop' },
    { key: 'labelWidth', kind: 'prop' },
  ],
};

const tableRenderer: RendererDefinition = {
  type: 'table',
  component: noop,
  fields: [
    { key: 'onRowClick', kind: 'event' },
    { key: 'onSortChange', kind: 'event' },
    { key: 'onFilterChange', kind: 'event' },
    { key: 'onPageChange', kind: 'event' },
    { key: 'onSelectionChange', kind: 'event' },
    { key: 'onRefresh', kind: 'event' },
    { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
    { key: 'loadingSlot', kind: 'value-or-region', regionKey: 'loadingSlot' },
  ],
};

const treeRenderer: RendererDefinition = {
  type: 'tree',
  component: noop,
  fields: [
    { key: 'data', kind: 'prop' },
    { key: 'childrenKey', kind: 'prop' },
    { key: 'labelField', kind: 'prop' },
    { key: 'keyField', kind: 'prop' },
    { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
    { key: 'initiallyExpanded', kind: 'prop' },
    { key: 'expandOnClickNode', kind: 'prop' },
    { key: 'statusPath', kind: 'prop' },
    {
      key: 'node',
      kind: 'region',
      params: ['node', 'index', 'depth', 'key', 'parentNode'],
      isolate: false,
    },
  ],
};

const chartRenderer: RendererDefinition = {
  type: 'chart',
  component: noop,
  fields: [
    { key: 'onClick', kind: 'event' },
    { key: 'onHover', kind: 'event' },
    { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
    { key: 'componentId', kind: 'prop' },
  ],
};

const crudRenderer: RendererDefinition = {
  type: 'crud',
  component: noop,
  propContracts: {
    statusPath: { shape: { kind: 'string' }, displayName: 'Status Path' },
    source: { shape: { kind: 'union', anyOf: [] }, displayName: 'Source' },
    queryForm: { shape: { kind: 'object', fields: {} }, displayName: 'Query Form' },
    columns: {
      shape: { kind: 'array', item: { kind: 'object', fields: {} } },
      displayName: 'Columns',
    },
    rowKey: { shape: { kind: 'string' }, displayName: 'Row Key' },
    pageField: { shape: { kind: 'string' }, displayName: 'Page Field' },
    pageSizeField: { shape: { kind: 'string' }, displayName: 'Page Size Field' },
    defaultParams: { shape: { kind: 'object', fields: {} }, displayName: 'Default Params' },
    toolbar: { shape: { kind: 'unknown' }, displayName: 'Toolbar' },
    listActions: { shape: { kind: 'unknown' }, displayName: 'List Actions' },
    footerToolbar: { shape: { kind: 'unknown' }, displayName: 'Footer Toolbar' },
    toolbarLayout: { shape: { kind: 'object', fields: {} }, displayName: 'Toolbar Layout' },
    selection: { shape: { kind: 'object', fields: {} }, displayName: 'Selection' },
    selectionStatePath: { shape: { kind: 'string' }, displayName: 'Selection Path' },
    selectionOwnership: { shape: { kind: 'string' }, displayName: 'Selection Ownership' },
    paginationOwnership: { shape: { kind: 'string' }, displayName: 'Pagination Ownership' },
    paginationStatePath: { shape: { kind: 'string' }, displayName: 'Pagination Path' },
    sortOwnership: { shape: { kind: 'string' }, displayName: 'Sort Ownership' },
    sortStatePath: { shape: { kind: 'string' }, displayName: 'Sort Path' },
    filterOwnership: { shape: { kind: 'string' }, displayName: 'Filter Ownership' },
    filterStatePath: { shape: { kind: 'string' }, displayName: 'Filter Path' },
    columnSettings: { shape: { kind: 'object', fields: {} }, displayName: 'Column Settings' },
  },
  fields: [
    { key: 'name', kind: 'prop' },
    { key: 'queryForm', kind: 'prop' },
    { key: 'toolbar', kind: 'region' },
    { key: 'listActions', kind: 'region' },
    { key: 'footerToolbar', kind: 'region' },
    { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
    { key: 'onQuerySubmit', kind: 'event' },
    { key: 'onQueryReset', kind: 'event' },
    { key: 'onRowClick', kind: 'event' },
    { key: 'onSelectionChange', kind: 'event' },
    { key: 'onRefresh', kind: 'event' },
  ],
};

const variantFieldRenderer: RendererDefinition = {
  type: 'variant-field',
  component: noop,
  regions: ['content'],
  fields: [
    { key: 'label', kind: 'value-or-region', regionKey: 'label' },
    { key: 'variants', kind: 'ignored' },
    { key: 'selector', kind: 'ignored' },
    { key: 'selectorMode', kind: 'ignored' },
    { key: 'defaultVariant', kind: 'ignored' },
    { key: 'detectVariantAction', kind: 'ignored' },
    { key: 'transformInAction', kind: 'ignored' },
    { key: 'transformOutAction', kind: 'ignored' },
    { key: 'validateValueAction', kind: 'ignored' },
  ],
};

const detailFieldRenderer: RendererDefinition = {
  type: 'detail-field',
  component: noop,
  wrap: true,
  regions: ['viewer', 'content'],
  fields: [
    { key: 'label', kind: 'value-or-region', regionKey: 'label' },
    { key: 'triggerLabel', kind: 'prop' },
    { key: 'readOnly', kind: 'prop' },
    { key: 'surface', kind: 'ignored' },
    { key: 'transformInAction', kind: 'ignored' },
    { key: 'validateValueAction', kind: 'ignored' },
    { key: 'transformOutAction', kind: 'ignored' },
  ],
};

function compileNode(
  compiler: ReturnType<typeof createSchemaCompiler>,
  schema: Record<string, unknown>,
) {
  const compiled = compiler.compile(schema as any);
  return Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;
}

describe('schema property coverage — dialog', () => {
  const textRenderer: RendererDefinition = {
    type: 'text',
    component: noop,
    fields: [{ key: 'text', kind: 'prop' }],
  };
  const compiler = createCompiler(dialogRenderer, textRenderer);

  it('compiles dialog with actions region', () => {
    const root = compileNode(compiler, {
      type: 'dialog',
      title: 'My Dialog',
      actions: [{ type: 'text', text: 'OK' }],
    });
    expect(root.regions.actions).toBeDefined();
  });

  it('compiles dialog with container prop', () => {
    const root = compileNode(compiler, {
      type: 'dialog',
      title: 'Dialog',
      container: 'body',
    });
    expect(root.propsProgram.value.container).toBe('body');
  });

  it('compiles dialog with onClose event', () => {
    const root = compileNode(compiler, {
      type: 'dialog',
      title: 'Dialog',
      onClose: { action: 'closeDialog' },
    });
    expect(root.eventPlans.onClose).toBeDefined();
  });

  it('compiles dialog with onOpen event', () => {
    const root = compileNode(compiler, {
      type: 'dialog',
      title: 'Dialog',
      onOpen: { action: 'showToast', args: { message: 'opened' } },
    });
    expect(root.eventPlans.onOpen).toBeDefined();
  });

  it('compiles dialog with showMask prop', () => {
    const root = compileNode(compiler, {
      type: 'dialog',
      title: 'Dialog',
      showMask: false,
    });
    expect(root.propsProgram.value.showMask).toBe(false);
  });
});

describe('schema property coverage — drawer', () => {
  const textRenderer: RendererDefinition = {
    type: 'text',
    component: noop,
    fields: [{ key: 'text', kind: 'prop' }],
  };
  const compiler = createCompiler(drawerRenderer, textRenderer);

  it('compiles drawer with actions region', () => {
    const root = compileNode(compiler, {
      type: 'drawer',
      title: 'Drawer',
      actions: [{ type: 'text', text: 'Close' }],
    });
    expect(root.regions.actions).toBeDefined();
  });

  it('compiles drawer with container prop', () => {
    const root = compileNode(compiler, {
      type: 'drawer',
      title: 'Drawer',
      container: 'body',
    });
    expect(root.propsProgram.value.container).toBe('body');
  });

  it('compiles drawer with onClose event', () => {
    const root = compileNode(compiler, {
      type: 'drawer',
      title: 'Drawer',
      onClose: { action: 'closeDrawer' },
    });
    expect(root.eventPlans.onClose).toBeDefined();
  });

  it('compiles drawer with onOpen event', () => {
    const root = compileNode(compiler, {
      type: 'drawer',
      title: 'Drawer',
      onOpen: { action: 'showToast', args: { message: 'opened' } },
    });
    expect(root.eventPlans.onOpen).toBeDefined();
  });

  it('compiles drawer with showMask prop', () => {
    const root = compileNode(compiler, {
      type: 'drawer',
      title: 'Drawer',
      showMask: true,
    });
    expect(root.propsProgram.value.showMask).toBe(true);
  });
});

describe('schema property coverage — recurse', () => {
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
    expect(root.propsProgram.value.itemData).toEqual({ extra: true });
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

describe('schema property coverage — form', () => {
  const compiler = createCompiler(formRenderer);

  it('compiles form with labelWidth', () => {
    const root = compileNode(compiler, {
      type: 'form',
      body: [],
      labelWidth: 120,
    });
    expect(root.propsProgram.value.labelWidth).toBe(120);
  });

  it('compiles form with shape (mode, labelAlign as layout props)', () => {
    const root = compileNode(compiler, {
      type: 'form',
      body: [],
      mode: 'horizontal',
      labelAlign: 'left',
    });
    expect(root.propsProgram.value.mode).toBe('horizontal');
    expect(root.propsProgram.value.labelAlign).toBe('left');
  });

  it('compiles form with statusPath', () => {
    const root = compileNode(compiler, {
      type: 'form',
      body: [],
      statusPath: 'formStatus',
    });
    expect(root.propsProgram.value.statusPath).toBe('formStatus');
  });
});

describe('schema property coverage — table', () => {
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

describe('schema property coverage — crud', () => {
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

describe('schema property coverage — tree', () => {
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

describe('schema property coverage — chart', () => {
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

describe('schema property coverage — variant-field', () => {
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

describe('schema property coverage — button', () => {
  const compiler = createCompiler(buttonRenderer);

  it('compiles button with size prop', () => {
    const root = compileNode(compiler, {
      type: 'button',
      label: 'Click',
      size: 'sm',
    });
    expect(root.propsProgram.value.size).toBe('sm');
  });
});

describe('schema property coverage — detail-field', () => {
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
  });
});

describe('schema property coverage — loop', () => {
  const compiler = createCompiler(loopRenderer);

  it('compiles loop with itemData prop', () => {
    const root = compileNode(compiler, {
      type: 'loop',
      items: [1, 2, 3],
      itemData: { extra: true },
      body: [],
    });
    expect(root.propsProgram.value.itemData).toEqual({ extra: true });
  });
});

describe('schema property coverage — tabs', () => {
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
