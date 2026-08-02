import { describe, expect, it } from 'vitest';
import type { RendererDefinition, SchemaInput } from '@nop-chaos/flux-core';
import { createRendererRegistry, createSchemaDiagnosticCollector, createTemplateRegion } from '@nop-chaos/flux-core';
import { createSchemaCompiler } from './schema-compiler.js';
import type { TemplateNode } from '@nop-chaos/flux-core';

const PRESERVE_LITERAL_MARKER = '__nopPreserveLiteral';

/**
 * Phase 2 contract tests: the propContracts.shape pipeline fully takes over
 * region extraction (params/isolate via SchemaFieldRule carrier), literal
 * envelope, and compiledKey semantics — matching the legacy deepFields
 * normalize output exactly (对照语义). The unified pipeline is now the only
 * nested-handling entry point.
 */

function compileFixture(
  definition: RendererDefinition,
  authored: Record<string, unknown>,
  extraRenderers: RendererDefinition[] = [],
): TemplateNode {
  const registry = createRendererRegistry([
    definition,
    {
      type: 'text',
      displayName: 'Text',
      component: () => null,
      fields: [{ key: 'text', kind: 'prop' }],
    },
    {
      type: 'button',
      displayName: 'Button',
      component: () => null,
      fields: [{ key: 'label', kind: 'prop' }],
    },
    {
      type: 'form',
      displayName: 'Form',
      component: () => null,
      fields: [{ key: 'submitAction', kind: 'prop' }],
    },
    ...extraRenderers,
  ]);
  const compiler = createSchemaCompiler({ registry });
  return compiler.compileNode({ type: definition.type, ...authored } as never, {
    path: '$',
    renderer: definition,
  });
}

function compiledPropValue<T>(node: TemplateNode, key: string): T | undefined {
  const propsRuntime = node.propsProgram.node as { kind: string; value?: Record<string, unknown> };
  if (propsRuntime.kind === 'static-node') {
    return propsRuntime.value?.[key] as T | undefined;
  }
  const entries = (propsRuntime as { entries?: Record<string, unknown> }).entries;
  const entry = entries?.[key];
  if (!entry) return undefined;
  if ((entry as { kind?: string }).kind === 'static-node') {
    return (entry as { value?: unknown }).value as T;
  }
  return entry as unknown as T;
}

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

function legacyExtractNestedSchemaRegions(input: {
  candidate: Record<string, unknown>;
  itemRegionPath: string;
  itemRegionKeyPrefix: string;
  rules: Array<{
    key: string;
    regionKeySuffix: string;
    compiledKey: string;
    params?: readonly string[];
  }>;
  regions: Record<string, import('@nop-chaos/flux-core').TemplateRegion>;
  compileSchema: (
    input: SchemaInput,
    options?: import('@nop-chaos/flux-core').CompileSchemaOptions,
    regionMeta?: { params?: readonly string[]; isolate?: boolean },
  ) => TemplateNode | TemplateNode[];
}) {
  const nextValue: Record<string, unknown> = { ...input.candidate };
  let changed = false;
  for (const rule of input.rules) {
    const fieldValue = input.candidate[rule.key];
    if (
      !fieldValue ||
      typeof fieldValue !== 'object' ||
      (Array.isArray(fieldValue) && (fieldValue as unknown[]).length === 0)
    ) {
      continue;
    }
    const regionKey = `${input.itemRegionKeyPrefix}.${rule.regionKeySuffix}`;
    const regionPath = `${input.itemRegionPath}.${rule.regionKeySuffix}`;
    input.regions[regionKey] = createTemplateRegion(
      regionKey,
      fieldValue,
      regionPath,
      (schema, options) => input.compileSchema(schema, options, { params: rule.params }),
      { params: rule.params },
    );
    delete nextValue[rule.key];
    nextValue[rule.compiledKey] = regionKey;
    changed = true;
  }
  return { value: changed ? nextValue : input.candidate, changed };
}

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

describe('对照: unified pipeline vs legacy manual normalize (语义一致)', () => {
  const authored = {
    items: [
      {
        title: { type: 'text', text: 'Step 1' },
        body: { type: 'text', text: 'Body' },
        disabled: true,
      },
    ],
  };

  function legacyNormalizeItems(input: {
    value: unknown;
    path: string;
    regions: Record<string, import('@nop-chaos/flux-core').TemplateRegion>;
    compileSchema: (
      input: SchemaInput,
      options?: import('@nop-chaos/flux-core').CompileSchemaOptions,
      regionMeta?: { params?: readonly string[]; isolate?: boolean },
    ) => TemplateNode | TemplateNode[];
  }): unknown {
    if (!Array.isArray(input.value)) return input.value;
    return input.value.map((item, index) => {
      if (!item || typeof item !== 'object') return item;
      const normalized = legacyExtractNestedSchemaRegions({
        candidate: item as Record<string, unknown>,
        itemRegionPath: `${input.path}.items[${index}]`,
        itemRegionKeyPrefix: `items.${index}`,
        rules: [
          {
            key: 'title',
            regionKeySuffix: 'title',
            compiledKey: 'titleRegionKey',
            params: ['item', 'index', 'key'],
          },
          {
            key: 'body',
            regionKeySuffix: 'body',
            compiledKey: 'bodyRegionKey',
            params: ['item', 'index', 'key'],
          },
        ],
        regions: input.regions,
        compileSchema: input.compileSchema,
      }).value as Record<string, unknown>;
      if (normalized.disabled !== undefined) {
        normalized.disabled = {
          __nopPreserveLiteral: true,
          value: normalized.disabled === true,
        };
      }
      return normalized;
    });
  }

  function legacyDefinition(): RendererDefinition {
    return {
      type: 'legacy-fixture',
      displayName: 'Legacy Fixture',
      component: () => null,
      fields: [{ key: 'items', kind: 'prop' }],
    };
  }

  function compileLegacyFixture(authored: Record<string, unknown>): TemplateNode {
    // Emulate the legacy deepFields pipeline directly (reference semantics),
    // then compile the normalized value through the ordinary prop pipeline.
    const definition = legacyDefinition();
    const registry = createRendererRegistry([
      definition,
      { type: 'text', displayName: 'Text', component: () => null, fields: [{ key: 'text', kind: 'prop' }] },
      { type: 'button', displayName: 'Button', component: () => null, fields: [{ key: 'label', kind: 'prop' }] },
    ]);
    const compiler = createSchemaCompiler({ registry });
    const regions: Record<string, import('@nop-chaos/flux-core').TemplateRegion> = {};
    const normalized = legacyNormalizeItems({
      value: authored.items,
      path: '$.items',
      regions,
      compileSchema: (_schemaInput, _options, _regionMeta) =>
        compiler.compileNode(
          { type: 'text', text: 'nested' } as never,
          { path: '$.nested', renderer: definition },
        ),
    });
    const node = compiler.compileNode(
      { type: 'legacy-fixture', items: normalized } as never,
      { path: '$', renderer: definition },
    );
    // Attach the emulated legacy regions (the real deepFields normalize wrote
    // them into the compiled node's regions during compileSingleNode).
    for (const [key, region] of Object.entries(regions)) {
      (node.regions as Record<string, import('@nop-chaos/flux-core').TemplateRegion>)[key] =
        region;
    }
    return node;
  }

  function unifiedDefinition(): RendererDefinition {
    return {
      type: 'unified-fixture',
      displayName: 'Unified Fixture',
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
                disabled: 'literal',
              },
            },
          },
          displayName: 'Items',
        },
      },
      fields: [{ key: 'items', kind: 'prop' }],
    };
  }

  it('produces identical item shapes, region keys, and region meta', () => {
    const legacyNode = compileLegacyFixture(authored);
    const unifiedNode = compileFixture(unifiedDefinition(), authored);

    const legacyItems = compiledPropValue<Array<Record<string, unknown>>>(legacyNode, 'items');
    const unifiedItems = compiledPropValue<Array<Record<string, unknown>>>(unifiedNode, 'items');

    expect(unifiedItems).toEqual(legacyItems);
    expect(Object.keys(unifiedNode.regions).sort()).toEqual(
      Object.keys(legacyNode.regions).sort(),
    );

    for (const key of Object.keys(legacyNode.regions)) {
      const legacyRegion = legacyNode.regions[key];
      const unifiedRegion = unifiedNode.regions[key];
      expect(unifiedRegion.key).toBe(legacyRegion.key);
      expect(unifiedRegion.params).toEqual(legacyRegion.params);
      expect(Boolean(unifiedRegion.node)).toBe(Boolean(legacyRegion.node));
    }
  });
});

describe('typed item semantics (explicit type → registry definition)', () => {
  const childCardDefinition: RendererDefinition = {
    type: 'child-card',
    displayName: 'Child Card',
    component: () => null,
    fields: [
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
      { key: 'body', kind: 'region', regionKey: 'body' },
      { key: 'onClick', kind: 'event' },
    ],
  };

  const typedContainerDefinition: RendererDefinition = {
    type: 'typed-container',
    displayName: 'Typed Container',
    component: () => null,
    propContracts: {
      items: {
        shape: {
          kind: 'array',
          item: {
            kind: 'schema-definition',
            fieldRules: {
              label: {
                kind: 'value-or-region',
                regionKey: 'labelRegionKey',
              },
            },
          },
        },
        displayName: 'Items',
      },
    },
    fields: [{ key: 'items', kind: 'prop' }],
  };

  function compileTypedFixture(
    authored: Record<string, unknown>,
    definitions: RendererDefinition[] = [typedContainerDefinition, childCardDefinition],
  ): TemplateNode {
    const registry = createRendererRegistry([
      ...definitions,
      { type: 'text', displayName: 'Text', component: () => null, fields: [{ key: 'text', kind: 'prop' }] },
    ]);
    const compiler = createSchemaCompiler({ registry });
    return compiler.compileNode(
      { type: 'typed-container', ...authored } as never,
      { path: '$', renderer: typedContainerDefinition },
    );
  }

  it('classifies typed items per the child registry definition (region + event semantics)', () => {
    const node = compileTypedFixture({
      items: [
        {
          type: 'child-card',
          title: { type: 'text', text: 'T' },
          body: { type: 'text', text: 'B' },
          onClick: { action: 'openDialog', args: { title: '${item.title}' } },
        },
      ],
    });

    const items = compiledPropValue<Array<Record<string, unknown>>>(node, 'items');
    const item = items![0];

    // region-kind fields per the child definition are extracted item-scoped
    expect(item.type).toBe('child-card');
    expect(item.body).toBe('items.0.body');
    expect(node.regions['items.0.body']).toBeTruthy();
    // value-or-region field with schema input per the child definition → region
    expect(item.title).toBe('items.0.title');
    expect(node.regions['items.0.title']).toBeTruthy();

    // event-kind field per the child definition stays a preserve-literal envelope
    const onClick = item.onClick as Record<string, unknown>;
    expect(onClick[PRESERVE_LITERAL_MARKER]).toBe(true);
    expect((onClick.value as Record<string, unknown>).action).toBe('openDialog');
  });

  it('keeps plain prop fields of typed items as-is (value semantics)', () => {
    const node = compileTypedFixture({
      items: [{ type: 'child-card', title: 'Static Title' }],
    });

    const items = compiledPropValue<Array<Record<string, unknown>>>(node, 'items');
    expect(items![0].title).toBe('Static Title');
  });

  it('falls back to inline fieldRules when the item type is not registered', () => {
    const node = compileTypedFixture({
      items: [{ type: 'operation', label: { type: 'text', text: 'Op' } }],
    });

    const items = compiledPropValue<Array<Record<string, unknown>>>(node, 'items');
    const item = items![0];
    // Not a registered renderer → inline fieldRules apply (label → region)
    expect(item.type).toBe('operation');
    expect(item.label).toBeUndefined();
    expect(item.labelRegionKey).toBe('items.0.label');
  });

  it('emits conflicting-field-definition when parent fieldRules coexist with an explicit type', () => {
    const registry = createRendererRegistry([
      typedContainerDefinition,
      childCardDefinition,
      { type: 'text', displayName: 'Text', component: () => null, fields: [{ key: 'text', kind: 'prop' }] },
    ]);
    const compiler = createSchemaCompiler({ registry });
    const { collector, diagnostics } = createSchemaDiagnosticCollector();

    compiler.compile(
      {
        type: 'typed-container',
        items: [{ type: 'child-card', title: 'T', body: { type: 'text', text: 'B' } }],
      } as never,
      {
        diagnostics: { enabled: true, collector },
        validation: { unknownBarePropertyPolicy: 'ignore' },
      },
    );

    const conflict = diagnostics.find((d) => d.code === 'conflicting-field-definition');
    expect(conflict).toBeTruthy();
    expect(conflict!.severity).toBe('warning');
    expect(conflict!.message).toContain('child-card');
  });

  it('validates typed item region fields per the child definition (validation side)', () => {
    const closedText: RendererDefinition = {
      type: 'text',
      displayName: 'Text',
      component: () => null,
      propSchema: { text: { type: 'string' } },
      fields: [{ key: 'text', kind: 'prop' }],
    };
    const registry = createRendererRegistry([
      typedContainerDefinition,
      childCardDefinition,
      closedText,
    ]);
    const compiler = createSchemaCompiler({ registry });

    const diagnostics = compiler.validate?.(
      {
        type: 'typed-container',
        items: [
          {
            type: 'child-card',
            body: { type: 'text', unknownProp: 'boom' },
          },
        ],
      } as never,
      {
        validation: { unknownBarePropertyPolicy: 'warn' },
      },
    );

    expect(diagnostics ?? []).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'unknown-property' })]),
    );
  });
});
