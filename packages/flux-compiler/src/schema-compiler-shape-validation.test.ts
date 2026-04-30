import { describe, expect, it } from 'vitest';
import type {
  HostCapabilityProjectionManifest,
  RendererDefinition,
  RendererPlugin
} from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaCompiler, validateSchema } from './index';
import { isNamespacedSchemaKey, applyWrapComponentPlugins } from './schema-compiler/shape-validation';

describe('isNamespacedSchemaKey', () => {
  it('returns true for namespaced keys', () => {
    expect(isNamespacedSchemaKey('xui:imports')).toBe(true);
    expect(isNamespacedSchemaKey('acme:layout')).toBe(true);
  });

  it('returns false for plain keys', () => {
    expect(isNamespacedSchemaKey('type')).toBe(false);
    expect(isNamespacedSchemaKey('label')).toBe(false);
  });

  it('returns false for key starting with colon', () => {
    expect(isNamespacedSchemaKey(':foo')).toBe(false);
  });
});

describe('applyWrapComponentPlugins', () => {
  it('returns renderer unchanged when no plugins', () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    expect(applyWrapComponentPlugins(renderer, undefined)).toBe(renderer);
  });

  it('returns renderer unchanged when plugins is empty', () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    expect(applyWrapComponentPlugins(renderer, [])).toBe(renderer);
  });

  it('applies wrapComponent from plugins', () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    const plugin: RendererPlugin = {
      name: 'test-plugin',
      wrapComponent(def) {
        return { ...def, staticCapable: true };
      }
    };

    const result = applyWrapComponentPlugins(renderer, [plugin]);
    expect(result.staticCapable).toBe(true);
  });

  it('chains multiple plugins', () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    const plugin1: RendererPlugin = {
      name: 'p1',
      wrapComponent(def) { return { ...def, staticCapable: true }; }
    };
    const plugin2: RendererPlugin = {
      name: 'p2',
      wrapComponent(def) { return { ...def, displayName: 'Wrapped' }; }
    };

    const result = applyWrapComponentPlugins(renderer, [plugin1, plugin2]);
    expect(result.staticCapable).toBe(true);
    expect(result.displayName).toBe('Wrapped');
  });

  it('skips plugins without wrapComponent', () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    const plugin: RendererPlugin = {
      name: 'noop',
      beforeCompile(schema) { return schema; }
    };

    expect(applyWrapComponentPlugins(renderer, [plugin])).toBe(renderer);
  });
});

describe('analyzeSchemaInput validation', () => {
  it('reports invalid root (non-object, non-array)', () => {
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    expect(compiler.validate?.('string' as any)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid-root' })
    ]));
  });

  it('reports missing type field as invalid root', () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    expect(compiler.validate?.({ label: 'test' } as any)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid-root' })
    ]));
  });

  it('reports empty type field', () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    expect(compiler.validate?.({ type: '' } as any)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'missing-required-field' })
    ]));
  });

  it('reports unknown renderer type', () => {
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    expect(compiler.validate?.({ type: 'unknown-type' })).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'unknown-renderer-type' })
    ]));
  });

  it('reports invalid region node', () => {
    const renderer: RendererDefinition = {
      type: 'container', component: () => null, regions: ['body']
    };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    expect(compiler.validate?.({ type: 'container', body: 42 } as any)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid-region-node' })
    ]));
  });

  it('reports invalid action shape', () => {
    const renderer: RendererDefinition = {
      type: 'button', component: () => null, fields: [{ key: 'onClick', kind: 'event' }]
    };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    expect(compiler.validate?.({ type: 'button', onClick: 'not-an-object' } as any)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'invalid-action-shape' })])
    );
  });

  it('reports action without action field', () => {
    const renderer: RendererDefinition = {
      type: 'button', component: () => null, fields: [{ key: 'onClick', kind: 'event' }]
    };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    expect(compiler.validate?.({ type: 'button', onClick: { args: { path: 'x' } } } as any)).toEqual(
      expect.arrayContaining([expect.objectContaining({
        code: 'invalid-action-shape', message: 'Action objects require a non-empty action field.'
      })])
    );
  });

  it('reports invalid action args', () => {
    const renderer: RendererDefinition = {
      type: 'button', component: () => null, fields: [{ key: 'onClick', kind: 'event' }]
    };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    expect(compiler.validate?.({ type: 'button', onClick: { action: 'test', args: 'not-object' } } as any)).toEqual(
      expect.arrayContaining([expect.objectContaining({
        code: 'invalid-action-shape', message: 'Action args must be an object when provided.'
      })])
    );
  });

  it('reports non-array parallel in action', () => {
    const renderer: RendererDefinition = {
      type: 'button', component: () => null, fields: [{ key: 'onClick', kind: 'event' }]
    };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    expect(compiler.validate?.({ type: 'button', onClick: { action: 'test', parallel: 'not-array' } } as any)).toEqual(
      expect.arrayContaining([expect.objectContaining({
        code: 'invalid-action-shape', message: 'Action parallel must be an array when provided.'
      })])
    );
  });

  it('reports invalid source shape', () => {
    const renderer: RendererDefinition = {
      type: 'page', component: () => null, regions: ['body'],
      propSchema: { data: { type: 'object' } }, fields: [{ key: 'data', kind: 'prop' }]
    };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    expect(compiler.validate?.({ type: 'page', data: { type: 'source' } } as any)).toEqual(
      expect.arrayContaining([expect.objectContaining({
        code: 'invalid-source-shape', message: 'Source values require formula, action, or api.'
      })])
    );
  });

  it('reports invalid source action type', () => {
    const renderer: RendererDefinition = {
      type: 'page', component: () => null, regions: ['body'],
      propSchema: { data: { type: 'object' } }, fields: [{ key: 'data', kind: 'prop' }]
    };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    expect(compiler.validate?.({ type: 'page', data: { type: 'source', action: 123 } } as any)).toEqual(
      expect.arrayContaining([expect.objectContaining({
        code: 'invalid-source-shape', message: 'Source action must be a string when provided.'
      })])
    );
  });

  it('reports invalid dependsOn entries', () => {
    const renderer: RendererDefinition = { type: 'page', component: () => null, regions: ['body'] };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const diagnostics = compiler.validate?.({ type: 'page', dependsOn: [123, '', 'deep.nested.path'] } as any);
    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid-property-shape', message: 'dependsOn entries must be non-empty strings.' }),
      expect.objectContaining({ code: 'invalid-property-shape', message: 'dependsOn entries must use lexical root bindings, not deep member paths.' })
    ]));
  });

  it('reports non-array dependsOn', () => {
    const renderer: RendererDefinition = { type: 'page', component: () => null, regions: ['body'] };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    expect(compiler.validate?.({ type: 'page', dependsOn: 'not-array' } as any)).toEqual(
      expect.arrayContaining([expect.objectContaining({
        code: 'invalid-property-shape', message: 'dependsOn must be an array of lexical root strings.'
      })])
    );
  });

  it('reports invalid data-source with both formula and action', () => {
    const renderer: RendererDefinition = { type: 'data-source', component: () => null };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    expect(compiler.validate?.({ type: 'data-source', formula: '${data}', action: 'ajax' } as any)).toEqual(
      expect.arrayContaining([expect.objectContaining({
        code: 'invalid-source-shape', message: 'data-source requires exactly one of formula or action.'
      })])
    );
  });

  it('reports invalid data-source with neither formula nor action', () => {
    const renderer: RendererDefinition = { type: 'data-source', component: () => null };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    expect(compiler.validate?.({ type: 'data-source' } as any)).toEqual(
      expect.arrayContaining([expect.objectContaining({
        code: 'invalid-source-shape', message: 'data-source requires exactly one of formula or action.'
      })])
    );
  });

  it('validates reaction actions', () => {
    const renderer: RendererDefinition = { type: 'reaction', component: () => null };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    expect(compiler.validate?.({ type: 'reaction', watch: '${status}', actions: 'not-an-object' } as any)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'invalid-action-shape' })])
    );
  });

  it('reports unknown xui namespace properties', () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    expect(compiler.validate?.({ type: 'text', text: 'hello', 'xui:unknownProp': 'value' } as any, {
      validation: { namespacedPropertyPolicy: 'error' }
    })).toEqual(expect.arrayContaining([expect.objectContaining({
      code: 'invalid-namespace-property', message: 'Unknown built-in namespace property "xui:unknownProp".'
    })]));
  });

  it('reports invalid xui:imports entries that are not objects', () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    expect(compiler.validate?.({ type: 'text', 'xui:imports': [null, 'string', 123] } as any)).toEqual(
      expect.arrayContaining([expect.objectContaining({
        code: 'invalid-namespace-property', message: 'Each xui:imports entry must be an object.'
      })])
    );
  });

  it('reports xui:imports with non-object options', () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    expect(compiler.validate?.({ type: 'text', 'xui:imports': [{ from: 'lib', as: 'demo', options: 'not-object' }] } as any)).toEqual(
      expect.arrayContaining([expect.objectContaining({
        code: 'invalid-namespace-property', message: 'xui:imports options must be an object when provided.'
      })])
    );
  });

  it('traverses value-or-region fields during validation', () => {
    const cardRenderer: RendererDefinition = {
      type: 'card', component: () => null,
      propSchema: { title: { type: 'string' } },
      fields: [{ key: 'title', kind: 'value-or-region', regionKey: 'title' }]
    };
    const textRenderer: RendererDefinition = {
      type: 'text', component: () => null, propSchema: { text: { type: 'string' } }
    };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([cardRenderer, textRenderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    expect(compiler.validate?.({ type: 'card', title: { type: 'text', unknownProp: 'val' } } as any, {
      validation: { unknownBarePropertyPolicy: 'warn' }
    })).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'unknown-property' })]));
  });

  it('deduplicates diagnostic entries', () => {
    const renderer: RendererDefinition = {
      type: 'text', component: () => null, propSchema: { text: { type: 'string' } }
    };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const diagnostics = compiler.validate?.({ type: 'text', typo: 'value1' }, {
      validation: { unknownBarePropertyPolicy: 'error' }
    });
    expect(diagnostics?.filter(d => d.code === 'unknown-property')).toHaveLength(1);
  });

  it('respects maxIssues limit', () => {
    const renderer: RendererDefinition = {
      type: 'text', component: () => null, propSchema: { text: { type: 'string' } }
    };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const diagnostics = compiler.validate?.({ type: 'text', a: 1, b: 2, c: 3 }, {
      diagnostics: { maxIssues: 1 },
      validation: { unknownBarePropertyPolicy: 'warn' }
    });
    expect(diagnostics!.length).toBeLessThanOrEqual(1);
  });

  it('reports renderer schemaValidator issues', () => {
    const renderer: RendererDefinition = {
      type: 'validated', component: () => null,
      schemaValidator({ emit }) {
        emit({ code: 'invalid-property-shape', message: 'Custom validation failed', path: '/custom' });
      }
    };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    expect(compiler.validate?.({ type: 'validated' })).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid-property-shape', message: 'Custom validation failed', source: 'renderer' })
    ]));
  });

  it('handles plugins with beforeCompile and afterCompile', () => {
    const textRenderer: RendererDefinition = { type: 'text', component: () => null };
    const plugin: RendererPlugin = {
      name: 'uppercase-plugin',
      beforeCompile(schema) {
        if (schema && typeof schema === 'object' && 'text' in schema) {
          return { ...schema, text: (schema as any).text?.toUpperCase() };
        }
        return schema;
      },
      afterCompile(template) { return template; }
    };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([textRenderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
      plugins: [plugin]
    });

    const compiled = compiler.compile({ type: 'text', text: 'hello' });
    expect((compiled.root as any).propsProgram.value.text).toBe('HELLO');
  });

  it('reports host contract family mismatch', () => {
    const renderer: RendererDefinition = {
      type: 'host-mismatch', component: () => null,
      hostContract: {
        family: 'designer', defaultVersion: '1.0',
        resolveManifest() {
          return {
            family: 'other-family', version: '1.0',
            projection: { fields: {} }, capabilities: { namespace: 'designer', methods: {} }
          };
        },
        capabilityPublication: { mode: 'whole-owner' }
      }
    };

    expect(validateSchema({
      schema: { type: 'host-mismatch' },
      registry: createRendererRegistry([renderer])
    })).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'unknown-host-contract-family', source: 'host-contract' })
    ]));
  });

  it('reports host contract version mismatch', () => {
    const manifest: HostCapabilityProjectionManifest = {
      family: 'designer', version: '1.0',
      projection: { fields: {} }, capabilities: { namespace: 'designer', methods: {} }
    };
    const renderer: RendererDefinition = {
      type: 'designer-host', component: () => null, regions: ['toolbar'],
      hostContract: {
        family: 'designer', defaultVersion: '1.0',
        resolveManifest(s) { return s === '1.0' ? manifest : undefined; },
        capabilityPublication: { mode: 'whole-owner' }
      }
    };
    const childRenderer: RendererDefinition = {
      type: 'child-host', component: () => null, regions: ['body'],
      hostContract: {
        family: 'designer', defaultVersion: '2.0',
        resolveManifest(s) { return s === '2.0' ? { ...manifest, version: '2.0' } : undefined; },
        capabilityPublication: { mode: 'whole-owner' }
      }
    };

    expect(validateSchema({
      schema: { type: 'designer-host', toolbar: { type: 'child-host', body: { type: 'child-host' } } } as any,
      registry: createRendererRegistry([renderer, childRenderer])
    })).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'host-contract-version-mismatch', severity: 'warning', source: 'host-contract' })
    ]));
  });

  it('throws on invalid schema root during compile', () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    expect(() => compiler.compile('not-a-schema' as any)).toThrow('Invalid schema root');
  });

  it('throws on maximum nesting depth exceeded', () => {
    const renderer: RendererDefinition = { type: 'container', component: () => null, regions: ['body'] };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    let schema: any = { type: 'container', body: null };
    for (let i = 0; i < 70; i++) {
      schema = { type: 'container', body: schema };
    }

    expect(() => compiler.compile(schema)).toThrow('maximum nesting depth');
  });

  it('validates data-source with action args containing api', () => {
    const renderer: RendererDefinition = {
      type: 'data-source', component: () => null,
      propSchema: { action: { type: 'string' }, args: { type: 'object' } },
      fields: [{ key: 'action', kind: 'prop' }, { key: 'args', kind: 'prop' }]
    };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    expect(compiler.validate?.({ type: 'data-source', action: 'ajax', args: { url: '' } } as any)).toEqual(
      expect.arrayContaining([expect.objectContaining({
        code: 'invalid-source-shape', message: 'api.url must be a non-empty string.'
      })])
    );
  });

  it('compileNode compiles a single node', () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const node = compiler.compileNode?.({ type: 'text', text: 'Hello' }, { path: '$', renderer });
    expect(node).toBeDefined();
    expect(node.type).toBe('text');
  });

  it('prepare resolves import URLs', async () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const result = await compiler.prepare?.(
      { type: 'text', text: 'Hello', 'xui:imports': [{ from: './lib', as: 'demo' }] } as any,
      { schemaUrl: 'test://schema.json', resolveImportUrl: (su: string, from: string) => `${su}/../${from}` } as any
    );

    expect(result!.preparedImports.size).toBe(1);
  });

  it('prepare returns empty imports when no xui:imports', async () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const result = await compiler.prepare?.({ type: 'text', text: 'Hello' });
    expect(result!.preparedImports.size).toBe(0);
  });
});
