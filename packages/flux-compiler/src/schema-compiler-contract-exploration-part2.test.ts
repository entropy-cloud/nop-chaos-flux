import { describe, expect, it } from 'vitest';
import type {
  RendererDefinition,
  TemplateNode,
} from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import {
  createSchemaCompiler,
  validateSchema,
  schemaPathToJsonPointer,
  appendJsonPointer,
} from './index.js';

function makeCompiler(renderers: RendererDefinition[] = []) {
  return createSchemaCompiler({
    registry: createRendererRegistry(renderers),
    expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
  });
}

const textRenderer: RendererDefinition = {
  type: 'text',
  component: () => null,
  propSchema: { text: { type: 'string' } },
  fields: [{ key: 'text', kind: 'prop' }],
};

const containerRenderer: RendererDefinition = {
  type: 'container',
  component: () => null,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

const buttonRenderer: RendererDefinition = {
  type: 'button',
  component: () => null,
  fields: [
    { key: 'label', kind: 'prop' },
    { key: 'onClick', kind: 'event' },
  ],
};

const multiRegionRenderer: RendererDefinition = {
  type: 'multi-region',
  component: () => null,
  fields: [
    { key: 'header', kind: 'region', regionKey: 'header' },
    { key: 'body', kind: 'region', regionKey: 'body' },
    { key: 'footer', kind: 'region', regionKey: 'footer' },
  ],
};

describe('contract exploration: compilation idempotency', () => {
  it('H35: compiling the same simple schema twice produces identical output', () => {
    const compiler = makeCompiler([textRenderer]);
    const first = compiler.compile({ type: 'text', text: 'hello' });
    const second = compiler.compile({ type: 'text', text: 'hello' });

    const node1 = (Array.isArray(first.root) ? first.root[0] : first.root) as TemplateNode;
    const node2 = (Array.isArray(second.root) ? second.root[0] : second.root) as TemplateNode;

    expect((node1.propsProgram as any).value).toEqual((node2.propsProgram as any).value);
    expect(node1.type).toBe(node2.type);
  });

  it('H36: compiling same schema with regions twice produces same structure', () => {
    const compiler = makeCompiler([containerRenderer, textRenderer]);
    const schema = {
      type: 'container',
      body: { type: 'text', text: 'child' },
    };
    const first = compiler.compile(schema);
    const second = compiler.compile(schema);

    const node1 = (Array.isArray(first.root) ? first.root[0] : first.root) as TemplateNode;
    const node2 = (Array.isArray(second.root) ? second.root[0] : second.root) as TemplateNode;

    expect(node1.type).toBe(node2.type);
    expect(Object.keys(node1.regions)).toEqual(Object.keys(node2.regions));
  });

  it('H37: validateSchema adapter produces same diagnostics as compiler.validate', () => {
    const registry = createRendererRegistry([textRenderer]);
    const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

    const adapterDiags = validateSchema({
      schema: { type: 'text', text: 'hi', bad: 1 },
      registry,
      expressionCompiler,
      options: { validation: { unknownBarePropertyPolicy: 'error' } },
    });

    const compiler = makeCompiler([textRenderer]);
    const compilerDiags = compiler.validate?.(
      { type: 'text', text: 'hi', bad: 1 },
      { validation: { unknownBarePropertyPolicy: 'error' } },
    );

    expect(adapterDiags.map((d) => d.code)).toEqual(compilerDiags?.map((d) => d.code));
  });
});

describe('contract exploration: edge schemas', () => {
  it('H38: null root is flagged as invalid-root', () => {
    const compiler = makeCompiler();
    const diagnostics = compiler.validate?.(null as any);
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid-root' }),
      ]),
    );
  });

  it('H39: numeric root is flagged as invalid-root', () => {
    const compiler = makeCompiler();
    const diagnostics = compiler.validate?.(42 as any);
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid-root' }),
      ]),
    );
  });

  it('H40: deeply nested schema compiles without stack overflow', () => {
    const compiler = makeCompiler([containerRenderer]);
    const schema: any = { type: 'container' };
    const depth = 20;
    let current = schema;
    for (let i = 0; i < depth; i++) {
      current.body = { type: 'container' };
      current = current.body;
    }
    const diagnostics = compiler.validate?.(schema);
    expect(diagnostics).toEqual([]);
  });

  it('H41: schema with data-source missing both formula and action is flagged', () => {
    const dsRenderer: RendererDefinition = {
      type: 'data-source',
      component: () => null,
      fields: [],
    };
    const compiler = makeCompiler([{
      type: 'page',
      component: () => null,
      fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
    }, dsRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'page',
      body: {
        type: 'data-source',
      },
    });
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-source-shape',
          message: 'data-source requires exactly one of formula or action.',
        }),
      ]),
    );
  });

  it('H42: schema with data-source having both formula and action is flagged', () => {
    const dsRenderer: RendererDefinition = {
      type: 'data-source',
      component: () => null,
      fields: [],
    };
    const compiler = makeCompiler([{
      type: 'page',
      component: () => null,
      fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
    }, dsRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'page',
      body: {
        type: 'data-source',
        formula: '1+1',
        action: 'doThing',
      },
    });
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-source-shape',
          message: 'data-source requires exactly one of formula or action.',
        }),
      ]),
    );
  });

  it('H43: schema with reaction validates actions shape', () => {
    const reactionRenderer: RendererDefinition = {
      type: 'reaction',
      component: () => null,
      fields: [],
    };
    const compiler = makeCompiler([{
      type: 'page',
      component: () => null,
      fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
    }, reactionRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'page',
      body: {
        type: 'reaction',
        actions: 'not-valid',
      },
    });
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
        }),
      ]),
    );
  });

  it('H44: empty array schema root is valid', () => {
    const compiler = makeCompiler([textRenderer]);
    const diagnostics = compiler.validate?.([]);
    expect(diagnostics).toEqual([]);
  });

  it('H45: array root with mix of valid and invalid nodes reports unknown renderer', () => {
    const compiler = makeCompiler([textRenderer, containerRenderer]);
    const diagnostics = compiler.validate?.([
      { type: 'text', text: 'ok' },
      { type: 'unknown' },
      { type: 'container', body: { type: 'text', text: 'inner' } },
    ]);
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'unknown-renderer-type' }),
      ]),
    );
  });

  it('H45b: CANDIDATE - validate path may produce duplicate unknown-renderer-type for same node', () => {
    const compiler = makeCompiler([textRenderer]);
    const diagnostics = compiler.validate?.([
      { type: 'unknown' },
    ]);
    const unknowns = diagnostics?.filter((d) => d.code === 'unknown-renderer-type') ?? [];
    expect(unknowns.length).toBeGreaterThanOrEqual(1);
  });

  it('H46: multiple regions each validated independently', () => {
    const compiler = makeCompiler([multiRegionRenderer, buttonRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'multi-region',
      header: { type: 'button', onClick: 'bad' },
      body: { type: 'button', onClick: { action: 'ok' } },
      footer: { type: 'button', onClick: 'bad' },
    });
    const actionIssues = diagnostics?.filter((d) => d.code === 'invalid-action-shape') ?? [];
    expect(actionIssues).toHaveLength(2);
  });

  it('H47: schema with onMount lifecycle key does not produce unknown-property', () => {
    const compiler = makeCompiler([containerRenderer]);
    const diagnostics = compiler.validate?.(
      {
        type: 'container',
        onMount: { action: 'doInit' },
      },
      { validation: { unknownBarePropertyPolicy: 'error' } },
    );
    const unknowns = diagnostics?.filter((d) => d.code === 'unknown-property') ?? [];
    expect(unknowns).toHaveLength(0);
  });

  it('H48: schema with onUnmount lifecycle key does not produce unknown-property', () => {
    const compiler = makeCompiler([containerRenderer]);
    const diagnostics = compiler.validate?.(
      {
        type: 'container',
        onUnmount: { action: 'cleanup' },
      },
      { validation: { unknownBarePropertyPolicy: 'error' } },
    );
    const unknowns = diagnostics?.filter((d) => d.code === 'unknown-property') ?? [];
    expect(unknowns).toHaveLength(0);
  });
});

describe('contract exploration: namespace validation', () => {
  it('H49: unknown namespace key is handled by delegate-or-ignore policy', () => {
    const compiler = makeCompiler([textRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'text',
      text: 'ok',
      'custom:prop': 'value',
    });
    expect(diagnostics).toEqual([]);
  });

  it('H50: unknown namespace key is flagged with error policy', () => {
    const compiler = makeCompiler([textRenderer]);
    const diagnostics = compiler.validate?.(
      {
        type: 'text',
        text: 'ok',
        'custom:prop': 'value',
      },
      { validation: { namespacedPropertyPolicy: 'error' } },
    );
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-namespace-property',
          message: expect.stringContaining('Unknown namespaced property'),
        }),
      ]),
    );
  });

  it('H51: xui:imports with non-array is flagged', () => {
    const compiler = makeCompiler([textRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'text',
      text: 'ok',
      'xui:imports': 'not-array',
    } as any);
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-namespace-property',
          message: 'xui:imports must be an array of import specs.',
        }),
      ]),
    );
  });

  it('H52: xui:imports entry without from field is flagged', () => {
    const compiler = makeCompiler([textRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'text',
      text: 'ok',
      'xui:imports': [{ as: 'demo' }],
    } as any);
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-namespace-property',
          message: 'xui:imports entries require a non-empty from field.',
        }),
      ]),
    );
  });

  it('H53: xui:imports entry with options as non-object is flagged', () => {
    const compiler = makeCompiler([textRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'text',
      text: 'ok',
      'xui:imports': [{ from: 'lib', as: 'demo', options: 'bad' }],
    } as any);
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-namespace-property',
          message: 'xui:imports options must be an object when provided.',
        }),
      ]),
    );
  });

  it('H54: valid xui:imports entry produces no diagnostics', () => {
    const compiler = makeCompiler([textRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'text',
      text: 'ok',
      'xui:imports': [{ from: 'demo-lib', as: 'demo' }],
    });
    const nsIssues = diagnostics?.filter((d) => d.code === 'invalid-namespace-property') ?? [];
    expect(nsIssues).toHaveLength(0);
  });
});

describe('contract exploration: JSON pointer utilities', () => {
  it('H55: schemaPathToJsonPointer converts dollar root to empty string', () => {
    expect(schemaPathToJsonPointer('$')).toBe('');
  });

  it('H56: schemaPathToJsonPointer converts nested path', () => {
    expect(schemaPathToJsonPointer('$.body.items')).toBe('/body/items');
  });

  it('H57: schemaPathToJsonPointer escapes tilde and slash', () => {
    const result = schemaPathToJsonPointer('$.a~b/c');
    expect(result).toBe('/a~0b~1c');
  });

  it('H58: appendJsonPointer builds from empty path', () => {
    expect(appendJsonPointer('', 'key')).toBe('/key');
  });

  it('H59: appendJsonPointer appends to existing path', () => {
    expect(appendJsonPointer('/body', 'items')).toBe('/body/items');
  });

  it('H60: appendJsonPointer escapes segments', () => {
    expect(appendJsonPointer('', 'a/b')).toBe('/a~1b');
  });
});
