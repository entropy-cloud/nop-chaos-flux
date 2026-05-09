import { describe, expect, it } from 'vitest';
import {
  createHostActionValidationContext,
  createSchemaCompilerDiagnosticsContext,
  parseNamespacedAction,
  validateHostAction,
  isInsideCapableRegion,
} from './index.js';
import { createCompiler, designerManifest, openRenderer, strictTextRenderer } from './schema-compiler-diagnostics.test-support.js';

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

  describe('xui:actions validation', () => {
    it('rejects non-object xui:actions', () => {
      const compiler = createCompiler(strictTextRenderer);

      expect(
        compiler.validate?.({
          type: 'strict-text',
          text: 'Hello',
          'xui:actions': 'bad',
        }),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'invalid-namespace-property',
            message: 'xui:actions must be a non-null object mapping names to ActionSchema.',
            source: 'namespace',
          }),
        ]),
      );
    });

    it('rejects array xui:actions', () => {
      const compiler = createCompiler(strictTextRenderer);

      expect(
        compiler.validate?.({
          type: 'strict-text',
          text: 'Hello',
          'xui:actions': [{ action: 'ajax' }],
        }),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'invalid-namespace-property',
            message: 'xui:actions must be a non-null object mapping names to ActionSchema.',
            source: 'namespace',
          }),
        ]),
      );
    });

    it('rejects null xui:actions', () => {
      const compiler = createCompiler(strictTextRenderer);

      expect(
        compiler.validate?.({
          type: 'strict-text',
          text: 'Hello',
          'xui:actions': null,
        }),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'invalid-namespace-property',
            message: 'xui:actions must be a non-null object mapping names to ActionSchema.',
            source: 'namespace',
          }),
        ]),
      );
    });

    it('errors on name containing colon', () => {
      const compiler = createCompiler(strictTextRenderer);

      expect(
        compiler.validate?.({
          type: 'strict-text',
          text: 'Hello',
          'xui:actions': {
            'ns:method': { action: 'ajax' },
          },
        }),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'invalid-namespace-property',
            message: expect.stringContaining('must not contain a colon'),
            severity: 'error',
            source: 'namespace',
          }),
        ]),
      );
    });

    it('warns on name conflicting with built-in action', () => {
      const compiler = createCompiler(strictTextRenderer);

      expect(
        compiler.validate?.({
          type: 'strict-text',
          text: 'Hello',
          'xui:actions': {
            ajax: { action: 'showToast' },
          },
        }),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'invalid-namespace-property',
            message: expect.stringContaining('conflicts with a built-in action'),
            severity: 'warning',
            source: 'namespace',
          }),
        ]),
      );
    });

    it('errors on non-object action entry', () => {
      const compiler = createCompiler(strictTextRenderer);

      expect(
        compiler.validate?.({
          type: 'strict-text',
          text: 'Hello',
          'xui:actions': {
            bad: 'string-value',
          },
        }),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'invalid-namespace-property',
            message: expect.stringContaining('must be an ActionSchema object'),
            source: 'namespace',
          }),
        ]),
      );
    });

    it('warns on direct self-reference', () => {
      const compiler = createCompiler(strictTextRenderer);

      expect(
        compiler.validate?.({
          type: 'strict-text',
          text: 'Hello',
          'xui:actions': {
            loop: { action: 'loop' },
          },
        }),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'invalid-namespace-property',
            message: expect.stringContaining('directly references itself'),
            severity: 'warning',
            source: 'namespace',
          }),
        ]),
      );
    });

    it('accepts valid xui:actions', () => {
      const compiler = createCompiler(strictTextRenderer);

      expect(
        compiler.validate?.({
          type: 'strict-text',
          text: 'Hello',
          'xui:actions': {
            save: { action: 'ajax', args: { url: '/save' } },
            reset: { action: 'setValue', args: { path: 'x', value: 0 } },
          },
        }),
      ).toEqual([]);
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
          path: '$[1]',
          message: 'Renderer not found for type: missing-renderer',
        }),
      ]),
    );
  });
});
