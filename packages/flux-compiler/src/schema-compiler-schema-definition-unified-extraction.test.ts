import { describe, expect, it } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import {
  PRESERVE_LITERAL_MARKER,
  compileFixture,
  compiledPropValue,
} from './schema-compiler-schema-definition-unified-test-support.js';

describe('unified fieldRules region extraction (compiledKey semantics)', () => {
  const tabsFixture: RendererDefinition = {
    type: 'tabs-fixture',
    displayName: 'Tabs Fixture',
    component: () => null,
    propContracts: {
      items: {
        shape: {
          kind: 'array',
          item: {
            kind: 'schema-definition',
            fieldRules: {
              title: {
                kind: 'value-or-region',
                regionKey: 'titleRegionKey',
                params: ['item', 'index', 'key'],
              },
              body: {
                kind: 'region',
                regionKey: 'bodyRegionKey',
                params: ['item', 'index', 'key'],
              },
              toolbar: {
                kind: 'region',
                regionKey: 'toolbarRegionKey',
                params: ['item', 'index', 'key'],
              },
              disabled: 'literal',
            },
          },
        },
        displayName: 'Items',
      },
    },
    fields: [{ key: 'items', kind: 'prop' }],
  };

  it('extracts schema fields into regions and writes compiled keys (old normalize shape)', () => {
    const node = compileFixture(tabsFixture, {
      items: [
        {
          title: { type: 'text', text: 'Tab A' },
          body: { type: 'text', text: 'Body A' },
          toolbar: [{ type: 'button', label: 'Refresh' }],
          disabled: true,
        },
      ],
    });

    const items = compiledPropValue<Array<Record<string, unknown>>>(node, 'items');
    expect(items).toBeTruthy();
    const item = items![0];

    // legacy normalize shape: field replaced by compiled key → region key string
    expect(item.title).toBeUndefined();
    expect(item.titleRegionKey).toBe('items.0.title');
    expect(item.bodyRegionKey).toBe('items.0.body');
    expect(item.toolbarRegionKey).toBe('items.0.toolbar');

    // regions carry params
    expect(node.regions['items.0.title']).toBeTruthy();
    expect(node.regions['items.0.title'].params).toEqual(['item', 'index', 'key']);
    expect(node.regions['items.0.body'].params).toEqual(['item', 'index', 'key']);
    expect(node.regions['items.0.toolbar'].params).toEqual(['item', 'index', 'key']);
    expect(node.regions['items.0.body'].node).toBeTruthy();
  });

  it('keeps scalar value-or-region fields inline (no region, no compiled key)', () => {
    const node = compileFixture(tabsFixture, {
      items: [{ title: 'Plain Title', body: { type: 'text', text: 'B' } }],
    });

    const items = compiledPropValue<Array<Record<string, unknown>>>(node, 'items');
    expect(items![0].title).toBe('Plain Title');
    expect(items![0].titleRegionKey).toBeUndefined();
    expect(items![0].bodyRegionKey).toBe('items.0.body');
  });

  it('wraps literal fields in preserve-literal envelope (raw value preserved)', () => {
    const node = compileFixture(tabsFixture, {
      items: [{ title: 'A', disabled: true }],
    });

    const items = compiledPropValue<Array<Record<string, unknown>>>(node, 'items');
    const disabled = items![0].disabled as Record<string, unknown>;
    expect(disabled[PRESERVE_LITERAL_MARKER]).toBe(true);
    expect(disabled.value).toBe(true);
  });
});

describe('unified fieldRules nested source region extraction', () => {
  const tableFixture: RendererDefinition = {
    type: 'table-fixture',
    displayName: 'Table Fixture',
    component: () => null,
    propContracts: {
      columns: {
        shape: {
          kind: 'array',
          item: {
            kind: 'schema-definition',
            fieldRules: {
              label: {
                kind: 'value-or-region',
                regionKey: 'labelRegionKey',
              },
              body: {
                kind: 'region',
                regionKey: 'quickEditBodyRegionKey',
                regionKeySuffix: 'quickEditBody',
              },
              quickEdit: {
                kind: 'region',
                sourceKey: 'body',
                regionKey: 'quickEditBodyRegionKey',
                regionKeySuffix: 'quickEditBody',
              },
              popOver: {
                kind: 'region',
                sourceKey: 'content',
                regionKey: 'popOver.contentRegionKey',
                regionKeySuffix: 'popOver.content',
                params: ['record', 'index'],
                isolate: true,
              },
            },
          },
        },
        displayName: 'Columns',
      },
      expandable: {
        shape: {
          kind: 'schema-definition',
          fieldRules: {
            expandedRow: {
              kind: 'region',
              regionKey: 'expandedRowRegionKey',
              params: ['record', 'index'],
              isolate: true,
            },
          },
        },
        displayName: 'Expandable',
      },
    },
    fields: [
      { key: 'columns', kind: 'prop' },
      { key: 'expandable', kind: 'prop' },
    ],
  };

  it('extracts quickEdit.body (nested sourceKey) to the shared quickEditBodyRegionKey', () => {
    const node = compileFixture(tableFixture, {
      columns: [
        {
          name: 'name',
          quickEdit: { mode: 'dialog', body: { type: 'form', submitAction: { action: 'ajax' } } },
        },
      ],
    });

    const columns = compiledPropValue<Array<Record<string, unknown>>>(node, 'columns');
    const column = columns![0];
    expect(column.quickEditBodyRegionKey).toBe('columns.0.quickEditBody');
    expect(column.quickEdit).toEqual({ mode: 'dialog' });
    expect(node.regions['columns.0.quickEditBody']).toBeTruthy();
  });

  it('extracts direct column.body (authored dual form) to the same quickEditBodyRegionKey', () => {
    const node = compileFixture(tableFixture, {
      columns: [{ name: 'name', body: { type: 'form', submitAction: { action: 'ajax' } } }],
    });

    const columns = compiledPropValue<Array<Record<string, unknown>>>(node, 'columns');
    const column = columns![0];
    expect(column.quickEditBodyRegionKey).toBe('columns.0.quickEditBody');
    expect(column.body).toBeUndefined();
    expect(node.regions['columns.0.quickEditBody']).toBeTruthy();
  });

  it('extracts popOver.content into a dotted region key with params/isolate + nested compiled key', () => {
    const node = compileFixture(tableFixture, {
      columns: [
        {
          name: 'name',
          popOver: { trigger: 'click', placement: 'top', content: { type: 'text', text: 'Detail' } },
        },
      ],
    });

    const columns = compiledPropValue<Array<Record<string, unknown>>>(node, 'columns');
    const column = columns![0];
    expect(column.popOver).toEqual({
      trigger: 'click',
      placement: 'top',
      contentRegionKey: 'columns.0.popOver.content',
    });
    const region = node.regions['columns.0.popOver.content'];
    expect(region).toBeTruthy();
    expect(region.params).toEqual(['record', 'index']);
    expect(region.isolate).toBe(true);
  });

  it('extracts expandable.expandedRow (single-object container) with params/isolate', () => {
    const node = compileFixture(tableFixture, {
      expandable: { expandedRow: { type: 'text', text: 'Expanded' } },
    });

    const expandable = compiledPropValue<Record<string, unknown>>(node, 'expandable');
    expect(expandable).toBeTruthy();
    expect(expandable!.expandedRowRegionKey).toBe('expandable.expandedRow');
    expect(expandable!.expandedRow).toBeUndefined();
    const region = node.regions['expandable.expandedRow'];
    expect(region).toBeTruthy();
    expect(region.params).toEqual(['record', 'index']);
    expect(region.isolate).toBe(true);
  });

  it('does not mutate the authored schema object (copy-on-write)', () => {
    const authoredPopOver = { trigger: 'click', content: { type: 'text', text: 'Detail' } };
    const node = compileFixture(tableFixture, {
      columns: [{ name: 'name', popOver: authoredPopOver }],
    });

    expect(authoredPopOver).toEqual({
      trigger: 'click',
      content: { type: 'text', text: 'Detail' },
    });

    const columns = compiledPropValue<Array<Record<string, unknown>>>(node, 'columns');
    expect(columns![0].popOver).toEqual({
      trigger: 'click',
      contentRegionKey: 'columns.0.popOver.content',
    });
  });
});

describe('unified fieldRules literal sourceKey (variant match.when)', () => {
  const variantFixture: RendererDefinition = {
    type: 'variant-fixture',
    displayName: 'Variant Fixture',
    component: () => null,
    propContracts: {
      variants: {
        shape: {
          kind: 'array',
          item: {
            kind: 'schema-definition',
            fieldRules: {
              match: { kind: 'literal', sourceKey: 'when' },
            },
          },
        },
        displayName: 'Variants',
      },
    },
    fields: [{ key: 'variants', kind: 'prop' }],
  };

  it('preserves expression match.when via envelope without coercing the raw source', () => {
    const node = compileFixture(variantFixture, {
      variants: [{ key: 'a', match: { kind: 'expression', when: '${value == 1}' } }],
    });

    const variants = compiledPropValue<Array<Record<string, unknown>>>(node, 'variants');
    const match = variants![0].match as Record<string, unknown>;
    expect(match.kind).toBe('expression');
    const when = match.when as Record<string, unknown>;
    expect(when[PRESERVE_LITERAL_MARKER]).toBe(true);
    expect(when.value).toBe('${value == 1}');
  });

  it('leaves non-expression matches untouched', () => {
    const node = compileFixture(variantFixture, {
      variants: [{ key: 'b', match: { kind: 'typeof', value: 'string' } }],
    });

    const variants = compiledPropValue<Array<Record<string, unknown>>>(node, 'variants');
    expect(variants![0].match).toEqual({ kind: 'typeof', value: 'string' });
  });
});

describe('unified fieldRules value-or-region (crud columns[].searchable)', () => {
  const searchableFixture: RendererDefinition = {
    type: 'searchable-fixture',
    displayName: 'Searchable Fixture',
    component: () => null,
    propContracts: {
      columns: {
        shape: {
          kind: 'array',
          item: {
            kind: 'schema-definition',
            fieldRules: {
              searchable: {
                kind: 'value-or-region',
                regionKey: 'searchableRegionKey',
              },
            },
          },
        },
        displayName: 'Columns',
      },
    },
    fields: [{ key: 'columns', kind: 'prop' }],
  };

  it('keeps boolean searchable inline (value form)', () => {
    const node = compileFixture(searchableFixture, {
      columns: [{ name: 'name', searchable: true }],
    });

    const columns = compiledPropValue<Array<Record<string, unknown>>>(node, 'columns');
    expect(columns![0].searchable).toBe(true);
    expect(columns![0].searchableRegionKey).toBeUndefined();
  });

  it('keeps plain config objects (placeholder form) inline as values', () => {
    const node = compileFixture(searchableFixture, {
      columns: [{ name: 'name', searchable: { placeholder: 'Search...' } }],
    });

    const columns = compiledPropValue<Array<Record<string, unknown>>>(node, 'columns');
    expect(columns![0].searchable).toEqual({ placeholder: 'Search...' });
    expect(columns![0].searchableRegionKey).toBeUndefined();
  });

  it('extracts SchemaInput searchable into a region (region semantics)', () => {
    const node = compileFixture(searchableFixture, {
      columns: [{ name: 'name', searchable: { type: 'text', text: 'Search UI' } }],
    });

    const columns = compiledPropValue<Array<Record<string, unknown>>>(node, 'columns');
    expect(columns![0].searchable).toBeUndefined();
    expect(columns![0].searchableRegionKey).toBe('columns.0.searchable');
    expect(node.regions['columns.0.searchable']).toBeTruthy();
  });
});
