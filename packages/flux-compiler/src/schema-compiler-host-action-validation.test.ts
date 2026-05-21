import { describe, expect, it } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import {
  createHostActionValidationContext,
  createSchemaCompilerDiagnosticsContext,
  parseNamespacedAction,
  validateHostAction,
  isInsideCapableRegion,
} from './index.js';
import { createCompiler, designerManifest, openRenderer, strictTextRenderer } from './schema-compiler-diagnostics.test-support.js';
import { createBaseCompileSymbolTable } from './compile-symbol-table.js';

const eventRenderer: RendererDefinition = {
  type: 'event-text',
  component: () => null,
  propSchema: { text: { type: 'string' } },
  fields: [
    { key: 'text', kind: 'prop' },
    { key: 'onClick', kind: 'event' },
  ],
};

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

    it('rejects unresolved plain action names in validation mode', () => {
      const compiler = createCompiler(eventRenderer);

      expect(
        compiler.validate?.({
          type: 'event-text',
          text: 'Hello',
          onClick: { action: 'save' },
        }),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'unresolved-action-selector',
            path: '/onClick/action',
            source: 'core',
          }),
        ]),
      );
    });

    it('accepts lexically visible plain action names from xui:actions', () => {
      const compiler = createCompiler(eventRenderer);

      expect(
        compiler.validate?.({
          type: 'event-text',
          text: 'Hello',
          'xui:actions': {
            save: { action: 'ajax', args: { url: '/save' } },
          },
          onClick: { action: 'save' },
        }),
      ).toEqual([]);
    });

    it('keeps built-in precedence over conflicting xui:actions names', () => {
      const compiler = createCompiler(eventRenderer);

      expect(
        compiler.validate?.({
          type: 'event-text',
          text: 'Hello',
          'xui:actions': {
            submitForm: { action: 'ajax', args: { url: '/save' } },
          },
          onClick: { action: 'submit' },
        }),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'builtin-action-alias',
            path: '/onClick/action',
          }),
          expect.objectContaining({
            code: 'invalid-namespace-property',
            path: '/xui:actions/submitForm',
          }),
        ]),
      );
    });

    it('uses child xui:actions shadowing before unresolved diagnostics', () => {
      const containerRenderer: RendererDefinition = {
        type: 'container',
        component: () => null,
        fields: [{ key: 'body', kind: 'region' as const }],
      };
      const buttonRenderer: RendererDefinition = {
        type: 'button',
        component: () => null,
        fields: [{ key: 'onClick', kind: 'event' as const }],
      };
      const compiler = createCompiler(containerRenderer, buttonRenderer);

      expect(
        compiler.validate?.({
          type: 'container',
          'xui:actions': {
            save: { action: 'ajax', args: { url: '/parent' } },
          },
          body: {
            type: 'button',
            'xui:actions': {
              save: { action: 'ajax', args: { url: '/child' } },
            },
            onClick: { action: 'save' },
          },
        }),
      ).toEqual([]);
    });

    it('diagnoses compatibility alias usage for built-in actions', () => {
      const compiler = createCompiler(eventRenderer);

      expect(
        compiler.validate?.({
          type: 'event-text',
          text: 'Hello',
          onClick: { action: 'submit' },
        }),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'builtin-action-alias',
            path: '/onClick/action',
            severity: 'warning',
          }),
        ]),
      );
    });

    it('diagnoses component selectors when target typing metadata is unavailable', () => {
      const compiler = createCompiler(eventRenderer);

      expect(
        compiler.validate?.({
          type: 'event-text',
          text: 'Hello',
          onClick: { action: 'component:submit', componentId: 'my-form' },
        }),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'unvalidated-component-target',
            path: '/onClick/action',
          }),
        ]),
      );
    });

    it('validates import namespace methods when namespaceMethods metadata is present', () => {
      const compiler = createCompiler(eventRenderer);

      expect(
        compiler.validate?.(
          {
            type: 'event-text',
            text: 'Hello',
            'xui:imports': [{ from: 'demo-lib', as: 'demo' }],
            onClick: { action: 'demo:missing' },
          },
          {
            schemaUrl: 'test://schema.json',
            symbolTable: createBaseCompileSymbolTable(),
            preparedImports: new Map([
              [
                JSON.stringify({
                  schemaUrl: 'test://schema.json',
                  from: 'demo-lib',
                  as: 'demo',
                  options: null,
                }),
                {
                  schemaUrl: 'test://schema.json',
                  spec: { from: 'demo-lib', as: 'demo' },
                  resolvedSpec: { from: 'demo-lib', as: 'demo' },
                  staticMeta: { namespaceMethods: ['invoke'] },
                },
              ],
            ]),
          },
        ),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'unknown-import-member',
            path: '/onClick/action',
          }),
        ]),
      );
    });

    it('emits explicit skipped-validation diagnostics when import namespace metadata is absent', () => {
      const compiler = createCompiler(eventRenderer);

      expect(
        compiler.validate?.(
          {
            type: 'event-text',
            text: 'Hello',
            'xui:imports': [{ from: 'demo-lib', as: 'demo' }],
            onClick: { action: 'demo:invoke' },
          },
          {
            schemaUrl: 'test://schema.json',
            symbolTable: createBaseCompileSymbolTable(),
            preparedImports: new Map([
              [
                JSON.stringify({
                  schemaUrl: 'test://schema.json',
                  from: 'demo-lib',
                  as: 'demo',
                  options: null,
                }),
                {
                  schemaUrl: 'test://schema.json',
                  spec: { from: 'demo-lib', as: 'demo' },
                  resolvedSpec: { from: 'demo-lib', as: 'demo' },
                  staticMeta: {},
                },
              ],
            ]),
          },
        ),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'missing-import-static-meta',
            path: '/onClick/action',
          }),
        ]),
      );
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
