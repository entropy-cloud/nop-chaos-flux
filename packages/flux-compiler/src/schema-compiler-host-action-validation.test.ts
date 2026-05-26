import { describe, expect, it } from 'vitest';
import {
  createHostActionValidationContext,
  createSchemaCompilerDiagnosticsContext,
  parseNamespacedAction,
  validateHostAction,
  isInsideCapableRegion,
} from './index.js';
import { openRenderer } from './schema-compiler-diagnostics.test-support.js';
import { createCompiler, designerManifest } from './schema-compiler-host-action-validation.test-support.js';

describe('host action validation', () => {
  it('parses namespaced actions', () => {
    expect(parseNamespacedAction('designer:addNode')).toEqual({
      namespace: 'designer',
      method: 'addNode',
    });
    expect(parseNamespacedAction('plainAction')).toBeUndefined();
  });

  it('tracks whether nodes are inside capable regions', () => {
    const context = createHostActionValidationContext({
      family: 'designer',
      version: '1.0.0',
      manifest: designerManifest,
      capabilityPublication: {
        mode: 'region-scoped',
        capableRegions: ['toolbar'],
        transitiveInheritance: true,
      },
    });

    expect(isInsideCapableRegion(context, 'toolbar')).toBe(true);
    expect(isInsideCapableRegion(context, 'body')).toBe(false);
  });

  it('validates host actions against a host contract context', () => {
    const context = createHostActionValidationContext({
      family: 'designer',
      version: '1.0.0',
      manifest: designerManifest,
      capabilityPublication: {
        mode: 'whole-owner',
        transitiveInheritance: true,
      },
    });
    const diagnostics = createSchemaCompilerDiagnosticsContext(
      { diagnostics: { enabled: true } },
      'validate',
    );

    validateHostAction('designer:unknownMethod', undefined, '/onClick', diagnostics, context);

    expect(diagnostics.diagnostics).toEqual([
      expect.objectContaining({
        code: 'unknown-host-capability-method',
        source: 'host-contract',
      }),
    ]);
  });

  it('rejects missing args when the manifest declares required args', () => {
    const context = createHostActionValidationContext({
      family: 'designer',
      version: '1.0.0',
      manifest: designerManifest,
      capabilityPublication: {
        mode: 'whole-owner',
        transitiveInheritance: true,
      },
    });
    const diagnostics = createSchemaCompilerDiagnosticsContext(
      { diagnostics: { enabled: true } },
      'validate',
    );

    validateHostAction('designer:addNode', undefined, '/onClick', diagnostics, context);

    expect(diagnostics.diagnostics).toEqual([
      expect.objectContaining({
        code: 'invalid-host-capability-args',
        path: '/onClick/args',
        source: 'host-contract',
      }),
    ]);
  });

  it('rejects args for host methods that publish no args contract', () => {
    const noArgsManifest = {
      ...designerManifest,
      capabilities: {
        ...designerManifest.capabilities,
        methods: {
          ...designerManifest.capabilities.methods,
          clearSelection: {
            description: 'Clear selection',
          },
        },
      },
    };
    const context = createHostActionValidationContext({
      family: 'designer',
      version: '1.0.0',
      manifest: noArgsManifest,
      capabilityPublication: {
        mode: 'whole-owner',
        transitiveInheritance: true,
      },
    });
    const diagnostics = createSchemaCompilerDiagnosticsContext(
      { diagnostics: { enabled: true } },
      'validate',
    );

    validateHostAction('designer:clearSelection', {}, '/onClick', diagnostics, context);

    expect(diagnostics.diagnostics).toEqual([
      expect.objectContaining({
        code: 'invalid-host-capability-args',
        path: '/onClick/args',
        source: 'host-contract',
      }),
    ]);
  });

  it('propagates schemaUrl as sourceLocation.file on emitted diagnostics', () => {
    const diagnostics = createSchemaCompilerDiagnosticsContext(
      { diagnostics: { enabled: true } },
      'validate',
      'my-schema.json',
    );

    diagnostics.emit({
      code: 'expected-object',
      path: '/body/0',
      message: 'Schema nodes must be objects.',
    });

    expect(diagnostics.diagnostics).toHaveLength(1);
    expect(diagnostics.diagnostics[0].sourceLocation).toEqual({ file: 'my-schema.json' });
  });

  it('does not add sourceLocation when no schemaUrl is provided', () => {
    const diagnostics = createSchemaCompilerDiagnosticsContext(
      { diagnostics: { enabled: true } },
      'validate',
    );

    diagnostics.emit({
      code: 'expected-object',
      path: '/body/0',
      message: 'Schema nodes must be objects.',
    });

    expect(diagnostics.diagnostics).toHaveLength(1);
    expect(diagnostics.diagnostics[0].sourceLocation).toBeUndefined();
  });

  it('allows explicit sourceLocation override', () => {
    const diagnostics = createSchemaCompilerDiagnosticsContext(
      { diagnostics: { enabled: true } },
      'validate',
      'default.json',
    );

    diagnostics.emit({
      code: 'invalid-action-shape',
      path: '/onClick',
      message: 'Bad action',
      sourceLocation: { file: 'override.xview', line: 42, column: 10 },
    });

    expect(diagnostics.diagnostics).toHaveLength(1);
    expect(diagnostics.diagnostics[0].sourceLocation).toEqual({
      file: 'override.xview',
      line: 42,
      column: 10,
    });
  });

  it('continues compile diagnostics for unknown renderers when continueOnError is enabled', () => {
    const compiler = createCompiler(openRenderer);
    const diagnostics: Array<{ code: string; message: string; path: string }> = [];

    const compiled = compiler.compile(
      [
        { type: 'open-renderer', label: 'Known' },
        { type: 'missing-renderer' },
      ],
      {
        diagnostics: {
          enabled: true,
          continueOnError: true,
          reporter: (issue) => diagnostics.push(issue),
        },
      },
    );

    expect(Array.isArray(compiled.root) ? compiled.root : [compiled.root]).toHaveLength(1);
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-renderer-type',
          message: 'Renderer not found for type: missing-renderer',
        }),
      ]),
    );
  });
});
