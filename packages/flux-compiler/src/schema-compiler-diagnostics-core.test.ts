import { describe, expect, it } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createBaseCompileSymbolTable, validateSchema } from './index.js';
import { createCompiler, strictTextRenderer, actionHostRenderer } from './schema-compiler-diagnostics.test-support.js';

describe('schema compiler diagnostics', () => {
  it('reports unknown bare properties for closed prop models during validate', () => {
    const compiler = createCompiler(strictTextRenderer);

    expect(
      compiler.validate?.(
        {
          type: 'strict-text',
          text: 'Hello',
          txt: 'typo',
        },
        {
          validation: {
            unknownBarePropertyPolicy: 'error',
          },
        },
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-property',
          path: '/txt',
          severity: 'error',
        }),
      ]),
    );
  });

  it('keeps unknown bare properties out of compiled props when strict policy is error', () => {
    const compiler = createCompiler(strictTextRenderer);
    const compiled = compiler.compile(
      {
        type: 'strict-text',
        text: 'Hello',
        txt: 'typo',
      },
      {
        diagnostics: {
          enabled: true,
          continueOnError: true,
        },
        validation: {
          unknownBarePropertyPolicy: 'error',
        },
      },
    );
    const root = compiled.root;
    const node = Array.isArray(root) ? root[0] : root;

    expect(node.propsProgram.value).toEqual({ type: 'strict-text', text: 'Hello' });
  });

  it('preserves namespaced extensions outside normal props when namespaced passthrough is enabled', () => {
    const compiler = createCompiler(strictTextRenderer);
    const compiled = compiler.compile(
      {
        type: 'strict-text',
        text: 'Hello',
        'acme:layout': {
          density: 'compact',
        },
      },
      {
        diagnostics: {
          enabled: true,
          continueOnError: true,
        },
        validation: {
          namespacedPropertyPolicy: 'delegate-or-ignore',
          extensionPassthroughPolicy: 'namespaced-only',
        },
      },
    );
    const root = compiled.root;
    const node = Array.isArray(root) ? root[0] : root;

    expect(node.propsProgram.value).toEqual({ type: 'strict-text', text: 'Hello' });
    expect(node.schema?.['acme:layout']).toEqual({
      density: 'compact',
    });
  });

  it('validates built-in xui:imports through the namespace validator', () => {
    const compiler = createCompiler(strictTextRenderer);

    expect(
      compiler.validate?.({
        type: 'strict-text',
        text: 'Hello',
        'xui:imports': [
          {
            from: 'demo-lib',
          },
        ],
      } as any),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-namespace-property',
          path: '/xui:imports/0/as',
          source: 'namespace',
        }),
      ]),
    );
  });

  it('validates xui:version as a string version selector', () => {
    const compiler = createCompiler(strictTextRenderer);

    expect(
      compiler.validate?.({
        type: 'strict-text',
        text: 'Hello',
        'xui:version': '1.x',
      }),
    ).toEqual([]);
  });

  it('rejects non-string xui:version', () => {
    const compiler = createCompiler(strictTextRenderer);

    expect(
      compiler.validate?.({
        type: 'strict-text',
        text: 'Hello',
        'xui:version': 123,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-namespace-property',
          message: 'xui:version must be a string version selector.',
          source: 'namespace',
        }),
      ]),
    );
  });

  it('rejects empty xui:version', () => {
    const compiler = createCompiler(strictTextRenderer);

    expect(
      compiler.validate?.({
        type: 'strict-text',
        text: 'Hello',
        'xui:version': '',
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-namespace-property',
          message: 'xui:version must be a non-empty version selector string.',
          source: 'namespace',
        }),
      ]),
    );
  });

  it('accepts namespaced action payload fields when args is omitted', () => {
    const compiler = createCompiler(actionHostRenderer);

    expect(
      compiler.validate?.({
        type: 'action-host',
        onClick: {
          action: 'designer:addNode',
          nodeType: 'task',
        },
      }),
    ).toEqual([]);
  });

  it('reports imported helper member and arg-shape issues from prepared import meta', () => {
    const compiler = createCompiler(strictTextRenderer);

    const diagnostics =
      compiler.validate?.(
        {
          type: 'strict-text',
          text: '${$demo.missing(user.name)} ${$demo.formatName(user.first)}',
        },
        {
          schemaUrl: 'test://schema.json',
          symbolTable: createBaseCompileSymbolTable().push({
            id: 'prepared-imports',
            kind: 'imports',
            symbols: {
              $demo: {
                name: '$demo',
                kind: 'import-alias',
                members: ['formatName'],
                memberDefinitions: {
                  formatName: {
                    kind: 'function',
                    params: [{ name: 'first' }, { name: 'last' }],
                  },
                },
              },
            },
          }),
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
                staticMeta: {
                  helpers: {
                    formatName: {
                      kind: 'function',
                      params: [{ name: 'first' }, { name: 'last' }],
                    },
                  },
                },
              },
            ],
          ]),
        },
      ) ?? [];

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-import-member',
        }),
        expect.objectContaining({
          code: 'invalid-import-function-args',
        }),
      ]),
    );
  });

  it('exposes a validateSchema adapter over compiler-owned analysis', () => {
    const registry = createRendererRegistry([strictTextRenderer]);

    expect(
      validateSchema({
        schema: {
          type: 'strict-text',
          txt: 'typo',
        },
        registry,
        expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
        options: {
          validation: {
            unknownBarePropertyPolicy: 'error',
          },
        },
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-property',
          path: '/txt',
        }),
      ]),
    );
  });
});
