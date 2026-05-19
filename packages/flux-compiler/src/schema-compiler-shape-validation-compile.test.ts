import { describe, expect, it } from 'vitest';
import type {
  HostCapabilityProjectionManifest,
  RendererDefinition,
  RendererPlugin,
} from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaCompiler, validateSchema } from './index.js';
import { makeCompiler } from './schema-compiler-shape-validation-test-utils.js';

describe('compile and validate integration', () => {
  it('handles plugins with beforeCompile and afterCompile', () => {
    const textRenderer: RendererDefinition = { type: 'text', component: () => null };
    const plugin: RendererPlugin = {
      name: 'uppercase-plugin',
      beforeCompile(schema) {
        if (schema && typeof schema === 'object' && !Array.isArray(schema) && 'text' in schema) {
          return { ...schema, text: String(schema.text ?? '').toUpperCase() };
        }
        return schema;
      },
      afterCompile(template) {
        return template;
      },
    };
    const compilerWithPlugins = createSchemaCompiler({
      registry: createRendererRegistry([textRenderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
      plugins: [plugin],
    });

    const compiled = compilerWithPlugins.compile({ type: 'text', text: 'hello' });
    const root = compiled.root;
    const node = Array.isArray(root) ? root[0] : root;
    expect(node.propsProgram.value.text).toBe('HELLO');
  });

  it('runs beforeCompile once during validate, matching compile semantics', () => {
    const textRenderer: RendererDefinition = { type: 'text', component: () => null };
    let beforeCompileCalls = 0;
    const plugin: RendererPlugin = {
      name: 'count-before-compile',
      beforeCompile(schema) {
        beforeCompileCalls += 1;
        return schema;
      },
    };

    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([textRenderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
      plugins: [plugin],
    });

    const diagnostics = compiler.validate?.({ type: 'text', text: 'hello' }) ?? [];

    expect(diagnostics).toEqual([]);
    expect(beforeCompileCalls).toBe(1);
  });

  it('reports host contract family mismatch', () => {
    const renderer: RendererDefinition = {
      type: 'host-mismatch',
      component: () => null,
      hostContract: {
        family: 'designer',
        defaultVersion: '1.0',
        resolveManifest() {
          return {
            family: 'other-family',
            version: '1.0',
            projection: { fields: {} },
            capabilities: { namespace: 'designer', methods: {} },
          };
        },
        capabilityPublication: { mode: 'whole-owner' },
      },
    };

    expect(
      validateSchema({
        schema: { type: 'host-mismatch' },
        registry: createRendererRegistry([renderer]),
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'unknown-host-contract-family', source: 'host-contract' }),
      ]),
    );
  });

  it('reports host contract version mismatch', () => {
    const manifest: HostCapabilityProjectionManifest = {
      family: 'designer',
      version: '1.0',
      projection: { fields: {} },
      capabilities: { namespace: 'designer', methods: {} },
    };
    const renderer: RendererDefinition = {
      type: 'designer-host',
      component: () => null,
      fields: [{ key: 'toolbar', kind: 'region', regionKey: 'toolbar' }],
      hostContract: {
        family: 'designer',
        defaultVersion: '1.0',
        resolveManifest(s) {
          return s === '1.0' ? manifest : undefined;
        },
        capabilityPublication: { mode: 'whole-owner' },
      },
    };
    const childRenderer: RendererDefinition = {
      type: 'child-host',
      component: () => null,
      fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
      hostContract: {
        family: 'designer',
        defaultVersion: '2.0',
        resolveManifest(s) {
          return s === '2.0' ? { ...manifest, version: '2.0' } : undefined;
        },
        capabilityPublication: { mode: 'whole-owner' },
      },
    };

    expect(
      validateSchema({
        schema: {
          type: 'designer-host',
          toolbar: { type: 'child-host', body: { type: 'child-host' } },
        },
        registry: createRendererRegistry([renderer, childRenderer]),
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'host-contract-version-mismatch',
          severity: 'warning',
          source: 'host-contract',
        }),
      ]),
    );
  });

  it('throws on invalid schema root during compile', () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    const compiler = makeCompiler([renderer]);

    expect(() => compiler.compile('not-a-schema' as any)).toThrow('Invalid schema root');
  });

  it('throws on maximum nesting depth exceeded', () => {
    const renderer: RendererDefinition = {
      type: 'container',
      component: () => null,
      fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
    };
    const compiler = makeCompiler([renderer]);

    let schema: any = { type: 'container', body: null };
    for (let i = 0; i < 70; i++) {
      schema = { type: 'container', body: schema };
    }

    expect(() => compiler.compile(schema)).toThrow('maximum nesting depth');
  });

  it('reports invalid data-source with both formula and action', () => {
    const renderer: RendererDefinition = { type: 'data-source', component: () => null };
    const compiler = makeCompiler([renderer]);

    expect(
      compiler.validate?.({ type: 'data-source', formula: '${data}', action: 'ajax' }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-source-shape',
          message: 'data-source requires exactly one of formula or action.',
        }),
      ]),
    );
  });

  it('reports invalid data-source with neither formula nor action', () => {
    const renderer: RendererDefinition = { type: 'data-source', component: () => null };
    const compiler = makeCompiler([renderer]);

    expect(compiler.validate?.({ type: 'data-source' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-source-shape',
          message: 'data-source requires exactly one of formula or action.',
        }),
      ]),
    );
  });

  it('validates reaction actions', () => {
    const renderer: RendererDefinition = { type: 'reaction', component: () => null };
    const compiler = makeCompiler([renderer]);

    expect(
      compiler.validate?.({
        type: 'reaction',
        watch: '${status}',
        actions: 'not-an-object',
      }),
    ).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'invalid-action-shape' })]));
  });

  it('reports unknown xui namespace properties', () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    const compiler = makeCompiler([renderer]);

    expect(
      compiler.validate?.(
        { type: 'text', text: 'hello', 'xui:unknownProp': 'value' },
        {
          validation: { namespacedPropertyPolicy: 'error' },
        },
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-namespace-property',
          message: 'Unknown built-in namespace property "xui:unknownProp".',
        }),
      ]),
    );
  });

  it('reports invalid xui:imports entries that are not objects', () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    const compiler = makeCompiler([renderer]);

    expect(
      compiler.validate?.({ type: 'text', 'xui:imports': [null, 'string', 123] } as any),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-namespace-property',
          message: 'Each xui:imports entry must be an object.',
        }),
      ]),
    );
  });

  it('reports xui:imports with non-object options', () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    const compiler = makeCompiler([renderer]);

    expect(
      compiler.validate?.({
        type: 'text',
        'xui:imports': [{ from: 'lib', as: 'demo', options: 'not-object' }],
      } as any),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-namespace-property',
          message: 'xui:imports options must be an object when provided.',
        }),
      ]),
    );
  });

  it('validates data-source with action args containing api', () => {
    const renderer: RendererDefinition = {
      type: 'data-source',
      component: () => null,
      propSchema: { action: { type: 'string' }, args: { type: 'object' } },
      fields: [
        { key: 'action', kind: 'prop' },
        { key: 'args', kind: 'prop' },
      ],
    };
    const compiler = makeCompiler([renderer]);

    expect(compiler.validate?.({ type: 'data-source', action: 'ajax', args: { url: '' } })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-source-shape',
          message: 'api.url must be a non-empty string.',
        }),
      ]),
    );
  });

  it('compileNode compiles a single node', () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    const compiler = makeCompiler([renderer]);

    const node = compiler.compileNode?.({ type: 'text', text: 'Hello' }, { path: '$', renderer });
    expect(node).toBeDefined();
    expect(node.type).toBe('text');
  });

  it('prepare resolves import URLs', async () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    const compiler = makeCompiler([renderer]);

    const result = await compiler.prepare?.(
      { type: 'text', text: 'Hello', 'xui:imports': [{ from: './lib', as: 'demo' }] } as any,
      {
        schemaUrl: 'test://schema.json',
        resolveImportUrl: (su: string, from: string) => `${su}/../${from}`,
      } as any,
    );

    expect(result!.preparedImports.size).toBe(1);
  });

  it('prepare returns empty imports when no xui:imports', async () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    const compiler = makeCompiler([renderer]);

    const result = await compiler.prepare?.({ type: 'text', text: 'Hello' });
    expect(result!.preparedImports.size).toBe(0);
  });
});
