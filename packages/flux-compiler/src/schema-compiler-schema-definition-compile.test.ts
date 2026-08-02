import { describe, expect, it } from 'vitest';
import type { FluxSchemaDefinitionShape, RendererDefinition } from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createSchemaCompiler } from './schema-compiler.js';
import { classifySchemaDefinitionValue } from './schema-compiler/node-compiler-helpers.js';

const PRESERVE_LITERAL_MARKER = '__nopPreserveLiteral';

/**
 * RED-LINE contract: fully-static dropdown-button items must keep their
 * onClick/action as a compiler-preserved envelope — they must NOT be flattened
 * into props expressions that row-scope evaluation could bake with stale data.
 *
 * This test is written FIRST (red) and turns green once the propContracts.shape
 * schema-definition pipeline lands in compileSingleNode.
 */
const dropdownFixtureDefinition: RendererDefinition = {
  type: 'dropdown-fixture',
  displayName: 'Dropdown Fixture',
  component: () => null,
  propContracts: {
    items: {
      shape: {
        kind: 'array',
        item: {
          kind: 'schema-definition',
          fieldRules: {
            label: 'value',
            disabled: 'value',
            destructive: 'value',
            action: 'event',
            onClick: 'event',
          },
        },
      },
      displayName: 'Items',
      description: 'Menu item collection with action/onClick event fields.',
    },
  },
  fields: [{ key: 'items', kind: 'prop' }],
};

function compileDropdownNode(items: unknown[]) {
  const registry = createRendererRegistry([dropdownFixtureDefinition]);
  const compiler = createSchemaCompiler({ registry });
  return compiler.compileNode(
    { type: 'dropdown-fixture', items } as never,
    { path: '$', renderer: dropdownFixtureDefinition },
  );
}

function compiledItems(node: ReturnType<typeof compileDropdownNode>): Array<Record<string, unknown>> {
  const propsRuntime = node.propsProgram.node as { kind: string; value?: { items?: unknown } };
  expect(propsRuntime.kind).toBe('static-node');
  const items = propsRuntime.value?.items;
  expect(Array.isArray(items)).toBe(true);
  return items as Array<Record<string, unknown>>;
}

describe('schema-definition compile pipeline (red-line)', () => {
  it('fully static items: onClick compiles to envelope (never enters props expression)', () => {
    const node = compileDropdownNode([
      {
        label: 'Edit',
        onClick: {
          action: 'openDialog',
          args: {
            title: 'Edit',
            body: {
              type: 'form',
              submitAction: {
                action: 'ajax',
                args: { url: '/r/update', data: { nickName: '${nickName}' } },
              },
            },
          },
        },
      },
    ]);

    const items = compiledItems(node);
    const onClick = items[0].onClick as Record<string, unknown>;
    expect(onClick[PRESERVE_LITERAL_MARKER]).toBe(true);
    expect((onClick.value as Record<string, unknown>).action).toBe('openDialog');
  });

  it('fully static items: action field is enveloped alongside onClick', () => {
    const node = compileDropdownNode([
      { label: 'Delete', action: { action: 'confirm', args: { message: 'Sure?' } } },
    ]);

    const items = compiledItems(node);
    const action = items[0].action as Record<string, unknown>;
    expect(action[PRESERVE_LITERAL_MARKER]).toBe(true);
    expect((action.value as Record<string, unknown>).action).toBe('confirm');
  });

  it('value fields (label/disabled) remain plain values', () => {
    const node = compileDropdownNode([
      { label: 'Edit', disabled: true, action: { action: 'showToast' } },
    ]);

    const items = compiledItems(node);
    expect(items[0].label).toBe('Edit');
    expect(items[0].disabled).toBe(true);
  });

  it('mixed items: dynamic value fields compile to expressions while event fields stay template-preserved', () => {
    const node = compileDropdownNode([
      { label: '${row.label}', action: { action: 'openDialog', args: { title: '${row.title}' } } },
    ]);

    const propsRuntime = node.propsProgram.node as { kind: string };
    expect(propsRuntime.kind).toBe('object-node');

    const itemsEntry = (node.propsProgram.node as { entries: Record<string, unknown> }).entries.items;
    const itemsNode = itemsEntry as { kind: string; items: unknown[] };
    expect(itemsNode.kind).toBe('array-node');

    const itemNode = itemsNode.items[0] as { kind: string; entries: Record<string, unknown> };
    expect(itemNode.kind).toBe('object-node');

    const labelNode = itemNode.entries.label as { kind: string };
    expect(labelNode.kind).toBe('expression-node');

    // event field: static-node carrying the RAW action template — never
    // expression-evaluated (${row.title} must survive compilation).
    const actionNode = itemNode.entries.action as { kind: 'static-node'; value: Record<string, unknown> };
    expect(actionNode.kind).toBe('static-node');
    expect(actionNode.value.action).toBe('openDialog');
    expect(
      ((actionNode.value.args as Record<string, unknown>).title as string).includes('${row.title}'),
    ).toBe(true);
  });
});

describe('schema-definition compile region extraction branch', () => {
  const regionFixtureDefinition: RendererDefinition = {
    type: 'region-fixture',
    displayName: 'Region Fixture',
    component: () => null,
    propContracts: {
      items: {
        shape: {
          kind: 'array',
          item: {
            kind: 'schema-definition',
            fieldRules: {
              label: 'value',
              body: 'region',
              toolbar: 'schema-array',
            },
          },
        },
        displayName: 'Items',
      },
    },
    fields: [{ key: 'items', kind: 'prop' }],
  };

  it('extracts region/schema-array fields into node regions (replaces field with region key)', () => {
    const registry = createRendererRegistry([
      regionFixtureDefinition,
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
    ]);
    const compiler = createSchemaCompiler({ registry });
    const node = compiler.compileNode(
      {
        type: 'region-fixture',
        items: [
          {
            label: 'Tab A',
            body: { type: 'text', text: 'Hello' },
            toolbar: [{ type: 'button', label: 'Refresh' }],
          },
        ],
      } as never,
      { path: '$', renderer: regionFixtureDefinition },
    );

    const items = compiledItems(node);
    const item = items[0];
    expect(item.body).toBe('items.0.body');
    expect(item.toolbar).toBe('items.0.toolbar');

    expect(node.regions['items.0.body']).toBeTruthy();
    expect(node.regions['items.0.body'].node).toBeTruthy();
    expect(node.regions['items.0.toolbar']).toBeTruthy();
  });

  it('keeps non-schema values untouched in region fields (no extraction, no crash)', () => {
    const registry = createRendererRegistry([
      regionFixtureDefinition,
      { type: 'text', displayName: 'Text', component: () => null, fields: [{ key: 'text', kind: 'prop' }] },
    ]);
    const compiler = createSchemaCompiler({ registry });
    const node = compiler.compileNode(
      {
        type: 'region-fixture',
        items: [{ label: 'Tab A', body: { type: 'text', text: 'Schema body' } }],
      } as never,
      { path: '$', renderer: regionFixtureDefinition },
    );

    // body is schema-shaped → extracted to a region, not kept inline.
    const items = compiledItems(node);
    expect(items[0].body).toBe('items.0.body');
    expect(node.regions['items.0.body']).toBeTruthy();
  });
});

describe('schema-definition classifier graceful non-schema field', () => {
  it('leaves non-schema field values untouched when the declared kind is region/schema', () => {
    const shape: FluxSchemaDefinitionShape = {
      kind: 'schema-definition',
      fieldRules: { label: 'value', body: 'region' },
    };

    const classified = classifySchemaDefinitionValue({
      value: [{ label: 'A', body: 'plain string' }],
      match: { shape, keyPath: [] },
      path: '$',
      key: 'items',
      regions: {},
      compileSchema: () => [] as never,
    });

    const items = classified as Array<Record<string, unknown>>;
    expect(items[0].label).toBe('A');
    expect(items[0].body).toBe('plain string');
  });
});

describe('schema-definition actionValue compile branch', () => {
  const actionValueFixtureDefinition: RendererDefinition = {
    type: 'action-value-fixture',
    displayName: 'Action Value Fixture',
    component: () => null,
    propContracts: {
      searchSource: {
        shape: {
          kind: 'schema-definition',
          fieldRules: {},
          actionValue: true,
        },
        displayName: 'Search Source',
      },
      validate: {
        shape: {
          kind: 'object',
          fields: {
            action: {
              kind: 'schema-definition',
              fieldRules: {},
              actionValue: true,
            },
            debounce: { kind: 'number' },
            message: { kind: 'string' },
          },
          optional: ['debounce', 'message'],
        },
        displayName: 'Validate',
      },
    },
    fields: [
      { key: 'searchSource', kind: 'prop' },
      { key: 'validate', kind: 'prop' },
    ],
  };

  it('wraps whole actionValue prop in a preserve-literal envelope', () => {
    const registry = createRendererRegistry([actionValueFixtureDefinition]);
    const compiler = createSchemaCompiler({ registry });
    const node = compiler.compileNode(
      {
        type: 'action-value-fixture',
        searchSource: { action: 'ajax', args: { url: '/r/search?q=${searchQuery}' } },
      } as never,
      { path: '$', renderer: actionValueFixtureDefinition },
    );

    const propsRuntime = node.propsProgram.node as { kind: string; value?: { searchSource?: unknown } };
    const searchSource = propsRuntime.value?.searchSource as Record<string, unknown>;
    // Fully-static path: the envelope keeps the whole action as a raw template —
    // ${searchQuery} must NOT be evaluated at compile/render time.
    expect(searchSource.action).toBe('ajax');
    expect(
      ((searchSource.args as Record<string, unknown>).url as string).includes('${searchQuery}'),
    ).toBe(true);
  });

  it('applies object.fields container traversal (validate.action wrapped, sibling fields untouched)', () => {
    const registry = createRendererRegistry([actionValueFixtureDefinition]);
    const compiler = createSchemaCompiler({ registry });
    const node = compiler.compileNode(
      {
        type: 'action-value-fixture',
        validate: {
          action: { action: 'ajax', args: { url: '/r/validate' } },
          debounce: 300,
        },
      } as never,
      { path: '$', renderer: actionValueFixtureDefinition },
    );

    const propsRuntime = node.propsProgram.node as { kind: string; value?: { validate?: unknown } };
    // All-static object: the raw value keeps the envelope in place (nested
    // positions are not auto-unwrapped) — renderers unwrap via unwrapPreservedLiteral.
    const validate = propsRuntime.value?.validate as Record<string, unknown>;
    const action = validate.action as Record<string, unknown>;
    expect(action.__nopPreserveLiteral).toBe(true);
    expect((action.value as Record<string, unknown>).action).toBe('ajax');
    expect(validate.debounce).toBe(300);
  });
});

describe('P0 action-value props are never props-expression polluted', () => {
  function makeActionValueRenderer(type: string, propKey: string): RendererDefinition {
    return {
      type,
      displayName: type,
      component: () => null,
      propContracts: {
        [propKey]: {
          shape: { kind: 'schema-definition', fieldRules: {}, actionValue: true },
          displayName: propKey,
        },
      },
      fields: [{ key: propKey, kind: 'prop' }],
    };
  }

  const cases: Array<{ label: string; type: string; propKey: string; authored: Record<string, unknown> }> = [
    {
      label: 'select searchSource',
      type: 'select',
      propKey: 'searchSource',
      authored: { action: 'ajax', args: { url: '/r/search?q=${searchQuery}' } },
    },
    {
      label: 'crud quickSaveAction',
      type: 'crud',
      propKey: 'quickSaveAction',
      authored: { action: 'ajax', args: { url: '/r/quick-save', data: { name: '${row.name}' } } },
    },
    {
      label: 'picker loadAction',
      type: 'picker',
      propKey: 'loadAction',
      authored: { action: 'ajax', args: { url: '/r/options?q=${query}' } },
    },
    {
      label: 'input-file uploadAction',
      type: 'input-file',
      propKey: 'uploadAction',
      authored: { action: 'ajax', args: { url: '/r/upload?name=${file.name}' } },
    },
  ];

  for (const { label, type, propKey, authored } of cases) {
    it(`keeps ${label} as a raw template (${'${expr}'} survives compilation)`, () => {
      const definition = makeActionValueRenderer(type, propKey);
      const registry = createRendererRegistry([definition]);
      const compiler = createSchemaCompiler({ registry });
      const node = compiler.compileNode(
        { type, [propKey]: authored } as never,
        { path: '$', renderer: definition },
      );

      const propsRuntime = node.propsProgram.node as { kind: string; value?: Record<string, unknown> };
      const compiled = propsRuntime.value?.[propKey] as Record<string, unknown> | undefined;

      // Whole-value template preservation: the authored action object survives
      // compilation verbatim — no expression in it was evaluated or removed.
      expect(compiled).toEqual(authored);
    });
  }
});
