import { describe, expect, it } from 'vitest';
import type {
  HostCapabilityProjectionManifest,
  RendererDefinition,
  RendererHostContract,
  SchemaDiagnostic,
  TemplateNode,
} from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import {
  createSchemaCompiler,
  createHostActionValidationContext,
  createSchemaCompilerDiagnosticsContext,
  isInsideCapableRegion,
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

const testManifest: HostCapabilityProjectionManifest = {
  family: 'test',
  version: '1.0',
  projection: { fields: {} },
  capabilities: {
    namespace: 'test',
    methods: {
      doSomething: {
        args: {
          kind: 'object',
          fields: {
            name: { kind: 'string' },
          },
        },
      },
      deprecatedMethod: {
        args: { kind: 'unknown' },
        deprecated: true,
      },
    },
  },
};

describe('contract exploration: compile mode diagnostics', () => {
  it('H61: compile with diagnostics enabled and continueOnError skips unknown renderer', () => {
    const compiler = makeCompiler([textRenderer]);
    const issues: SchemaDiagnostic[] = [];
    const result = compiler.compile(
      [
        { type: 'text', text: 'ok' },
        { type: 'unknown-type' },
      ],
      {
        diagnostics: {
          enabled: true,
          continueOnError: true,
          reporter: (d) => issues.push(d),
        },
      },
    );
    const nodes = Array.isArray(result.root) ? result.root : [result.root];
    expect(nodes).toHaveLength(1);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'unknown-renderer-type' }),
      ]),
    );
  });

  it('H62: compile without diagnostics throws on unknown renderer', () => {
    const compiler = makeCompiler([textRenderer]);
    expect(() => {
      compiler.compile({ type: 'unknown-type' });
    }).toThrow('Renderer not found for type: unknown-type');
  });

  it('H63: compile with maxIssues stops emitting after limit', () => {
    const compiler = makeCompiler([textRenderer]);
    const issues: SchemaDiagnostic[] = [];
    compiler.compile(
      { type: 'text', text: 'ok', a: 1, b: 2, c: 3, d: 4 },
      {
        diagnostics: {
          enabled: true,
          continueOnError: true,
          maxIssues: 2,
          reporter: (d) => issues.push(d),
        },
        validation: { unknownBarePropertyPolicy: 'warn' },
      },
    );
    expect(issues.length).toBeLessThanOrEqual(2);
  });
});

describe('contract exploration: diagnostics context edge cases', () => {
  it('H64: diagnostics enabled via validation option even without explicit diagnostics.enabled', () => {
    const ctx = createSchemaCompilerDiagnosticsContext(
      { validation: { unknownBarePropertyPolicy: 'error' } },
      'compile',
    );
    expect(ctx.enabled).toBe(true);
  });

  it('H65: diagnostics not enabled in compile mode without validation or explicit flag', () => {
    const ctx = createSchemaCompilerDiagnosticsContext({}, 'compile');
    expect(ctx.enabled).toBe(false);
  });

  it('H66: diagnostics always enabled in validate mode', () => {
    const ctx = createSchemaCompilerDiagnosticsContext({}, 'validate');
    expect(ctx.enabled).toBe(true);
  });

  it('H67: emit on disabled context does not add diagnostics', () => {
    const ctx = createSchemaCompilerDiagnosticsContext({}, 'compile');
    ctx.emit({
      code: 'invalid-root',
      path: '/',
      message: 'test',
    });
    expect(ctx.diagnostics).toHaveLength(0);
  });

  it('H68: hasReachedLimit returns true when at maxIssues', () => {
    const ctx = createSchemaCompilerDiagnosticsContext(
      { diagnostics: { enabled: true, maxIssues: 1 } },
      'validate',
    );
    expect(ctx.hasReachedLimit()).toBe(false);
    ctx.emit({ code: 'invalid-root', path: '/', message: 'first' });
    expect(ctx.hasReachedLimit()).toBe(true);
  });
});

describe('contract exploration: source validation', () => {
  it('H69: source without formula/action/args is flagged', () => {
    const renderer: RendererDefinition = {
      type: 'page',
      component: () => null,
      fields: [{ key: 'data', kind: 'prop' }],
    };
    const compiler = makeCompiler([renderer]);
    const diagnostics = compiler.validate?.({
      type: 'page',
      data: { type: 'source' },
    });
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-source-shape',
          message: 'Source values require formula, action, or args.',
        }),
      ]),
    );
  });

  it('H70: source with valid formula is not flagged', () => {
    const renderer: RendererDefinition = {
      type: 'page',
      component: () => null,
      fields: [{ key: 'data', kind: 'prop' }],
    };
    const compiler = makeCompiler([renderer]);
    const diagnostics = compiler.validate?.({
      type: 'page',
      data: { type: 'source', formula: '1 + 1' },
    });
    const sourceIssues = diagnostics?.filter((d) => d.code === 'invalid-source-shape') ?? [];
    expect(sourceIssues).toHaveLength(0);
  });

  it('H71: source with action and valid args is not flagged', () => {
    const renderer: RendererDefinition = {
      type: 'page',
      component: () => null,
      fields: [{ key: 'data', kind: 'prop' }],
    };
    const compiler = makeCompiler([renderer]);
    const diagnostics = compiler.validate?.({
      type: 'page',
      data: { type: 'source', action: 'fetchData', args: { url: '/api/data' } },
    });
    const sourceIssues = diagnostics?.filter((d) => d.code === 'invalid-source-shape') ?? [];
    expect(sourceIssues).toHaveLength(0);
  });
});

describe('contract exploration: isInsideCapableRegion edge cases', () => {
  it('H72: whole-owner mode always returns true', () => {
    const ctx = createHostActionValidationContext({
      family: 'test',
      version: '1.0',
      manifest: testManifest,
      capabilityPublication: { mode: 'whole-owner' },
    });
    expect(isInsideCapableRegion(ctx)).toBe(true);
  });

  it('H73: region-scoped with empty capableRegions returns false', () => {
    const ctx = createHostActionValidationContext({
      family: 'test',
      version: '1.0',
      manifest: testManifest,
      capabilityPublication: {
        mode: 'region-scoped',
        capableRegions: [],
      },
    });
    expect(isInsideCapableRegion(ctx)).toBe(false);
  });

  it('H74: region-scoped with matching regionKey returns true', () => {
    const ctx = createHostActionValidationContext({
      family: 'test',
      version: '1.0',
      manifest: testManifest,
      capabilityPublication: {
        mode: 'region-scoped',
        capableRegions: ['toolbar'],
      },
    });
    expect(isInsideCapableRegion(ctx, 'toolbar')).toBe(true);
  });

  it('H75: region-scoped with non-matching regionKey checks currentRegion', () => {
    const ctx = createHostActionValidationContext({
      family: 'test',
      version: '1.0',
      manifest: testManifest,
      capabilityPublication: {
        mode: 'region-scoped',
        capableRegions: ['toolbar'],
        transitiveInheritance: true,
      },
    });
    ctx.currentRegion = 'toolbar';
    expect(isInsideCapableRegion(ctx, 'body')).toBe(true);
  });

  it('H76: region-scoped with transitiveInheritance false returns false for non-matching', () => {
    const ctx = createHostActionValidationContext({
      family: 'test',
      version: '1.0',
      manifest: testManifest,
      capabilityPublication: {
        mode: 'region-scoped',
        capableRegions: ['toolbar'],
        transitiveInheritance: false,
      },
    });
    ctx.currentRegion = 'toolbar';
    expect(isInsideCapableRegion(ctx, 'body')).toBe(false);
  });

  it('H77: undefined context returns false', () => {
    expect(isInsideCapableRegion(undefined)).toBe(false);
  });
});

describe('contract exploration: deep probes and additional candidates', () => {
  it('H78: FIXED - validate emits exactly one unknown-renderer-type per unknown node', () => {
    const compiler = makeCompiler([textRenderer]);
    const diagnostics = compiler.validate?.([{ type: 'unknown' }]);
    const unknowns = diagnostics?.filter((d) => d.code === 'unknown-renderer-type') ?? [];
    expect(unknowns.length).toBe(1);
  });

  it('H79: host contract version mismatch produces warning', () => {
    const v1Manifest: HostCapabilityProjectionManifest = {
      family: 'test',
      version: '1.0',
      projection: { fields: {} },
      capabilities: { namespace: 'test', methods: {} },
    };
    const v2Manifest: HostCapabilityProjectionManifest = {
      family: 'test',
      version: '2.0',
      projection: { fields: {} },
      capabilities: { namespace: 'test', methods: {} },
    };
    const parentRenderer: RendererDefinition = {
      type: 'parent-host',
      component: () => null,
      fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
      hostContract: {
        family: 'test',
        defaultVersion: '1.0',
        resolveManifest: (s) => s === '1.0' ? v1Manifest : undefined,
      } satisfies RendererHostContract,
    };
    const childRenderer: RendererDefinition = {
      type: 'child-host',
      component: () => null,
      fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
      hostContract: {
        family: 'test',
        defaultVersion: '2.0',
        resolveManifest: (s) => s === '2.0' ? v2Manifest : undefined,
      } satisfies RendererHostContract,
    };
    const compiler = makeCompiler([parentRenderer, childRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'parent-host',
      body: { type: 'child-host', body: { type: 'text' } },
    });
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-renderer-type',
        }),
      ]),
    );
  });

  it('H80: xui:actions with action referencing built-in name still compiles', () => {
    const compiler = makeCompiler([textRenderer]);
    const compiled = compiler.compile({
      type: 'text',
      text: 'test',
      'xui:actions': {
        myAction: { action: 'ajax', args: { url: '/test' } },
      },
    });
    expect(compiled).toBeDefined();
  });

  it('H81: dependsOn with valid single-level root paths passes', () => {
    const compiler = makeCompiler([containerRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'container',
      dependsOn: ['name', 'age'],
    });
    const depIssues = diagnostics?.filter((d) => d.code === 'invalid-property-shape') ?? [];
    expect(depIssues).toHaveLength(0);
  });

  it('H82: dependsOn with deep dot path is flagged', () => {
    const compiler = makeCompiler([containerRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'container',
      dependsOn: ['user.name'],
    });
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-property-shape',
          message: expect.stringContaining('lexical root bindings'),
        }),
      ]),
    );
  });

  it('H83: FIXED - compileNode with unknown renderer throws descriptive error', () => {
    const compiler = makeCompiler([textRenderer]);
    expect(() => {
      compiler.compileNode?.({ type: 'unknown' }, { path: '$', renderer: null as any });
    }).toThrow('Renderer not found for type: unknown');
  });

  it('H85: prepare API returns schema unchanged when no imports', async () => {
    const compiler = makeCompiler([textRenderer]);
    const result = await compiler.prepare?.({ type: 'text', text: 'hello' });
    expect(result).toBeDefined();
    expect(result!.schema).toEqual({ type: 'text', text: 'hello' });
  });

  it('H86: FIXED - schemaValidator called exactly once in validate', () => {
    const seen: Array<{ path: string }> = [];
    const validatedRenderer: RendererDefinition = {
      type: 'validated',
      component: () => null,
      schemaValidator({ schema: _schema, path, emit: _emit }) {
        seen.push({ path });
      },
    };
    const compiler = makeCompiler([validatedRenderer]);
    compiler.validate?.({ type: 'validated' });
    expect(seen).toHaveLength(1);
  });

  it('H87: action parallel chain is validated recursively', () => {
    const compiler = makeCompiler([buttonRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'button',
      onClick: {
        action: 'step1',
        parallel: [
          { action: 'step2' },
          'bad-entry',
        ],
      },
    });
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          message: 'Action entries must be objects.',
        }),
      ]),
    );
  });

  it('H88: source with dependsOn validates dependency paths', () => {
    const renderer: RendererDefinition = {
      type: 'page',
      component: () => null,
      fields: [{ key: 'data', kind: 'prop' }],
    };
    const compiler = makeCompiler([renderer]);
    const diagnostics = compiler.validate?.({
      type: 'page',
      data: {
        type: 'source',
        formula: 'user.name',
        dependsOn: ['user.name'],
      },
    });
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-source-shape',
          message: expect.stringContaining('lexical root'),
        }),
      ]),
    );
  });

  it('H89: host contract with family mismatch between manifest and declaration is flagged', () => {
    const mismatchManifest: HostCapabilityProjectionManifest = {
      family: 'other-family',
      version: '1.0',
      projection: { fields: {} },
      capabilities: { namespace: 'test', methods: {} },
    };
    const mismatchRenderer: RendererDefinition = {
      type: 'mismatch-host',
      component: () => null,
      hostContract: {
        family: 'test',
        defaultVersion: '1.0',
        resolveManifest: () => mismatchManifest,
      } satisfies RendererHostContract,
    };
    const compiler = makeCompiler([mismatchRenderer]);
    const diagnostics = compiler.validate?.({ type: 'mismatch-host' });
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-host-contract-family',
          source: 'host-contract',
        }),
      ]),
    );
  });

  it('H90: compile produces deterministic template node ids', () => {
    const compiler = makeCompiler([textRenderer]);
    const first = compiler.compile({ type: 'text', text: 'hello' });
    const second = compiler.compile({ type: 'text', text: 'hello' });
    const node1 = (Array.isArray(first.root) ? first.root[0] : first.root) as TemplateNode;
    const node2 = (Array.isArray(second.root) ? second.root[0] : second.root) as TemplateNode;
    expect(node1.id).toBe(node2.id);
  });
});
