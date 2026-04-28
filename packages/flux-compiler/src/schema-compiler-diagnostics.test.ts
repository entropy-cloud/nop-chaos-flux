import { describe, expect, it } from 'vitest';
import type {
  HostCapabilityProjectionManifest,
  RendererDefinition,
} from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import {
  createBaseCompileSymbolTable,
  createHostActionValidationContext,
  createSchemaCompiler,
  createSchemaCompilerDiagnosticsContext,
  isInsideCapableRegion,
  parseNamespacedAction,
  validateHostAction,
  validateSchema
} from './index';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';

const strictTextRenderer: RendererDefinition = {
  type: 'strict-text',
  component: () => null,
  propSchema: {
    text: { type: 'string' }
  },
  fields: [{ key: 'text', kind: 'prop' }]
};

const actionHostRenderer: RendererDefinition = {
  type: 'action-host',
  component: () => null,
  fields: [{ key: 'onClick', kind: 'event' }]
};

function createCompiler(...definitions: RendererDefinition[]) {
  return createSchemaCompiler({
    registry: createRendererRegistry(definitions),
    expressionCompiler: createExpressionCompiler(createFormulaCompiler())
  });
}

describe('schema compiler diagnostics', () => {
  it('reports unknown bare properties for closed prop models during validate', () => {
    const compiler = createCompiler(strictTextRenderer);

    expect(compiler.validate?.({
      type: 'strict-text',
      text: 'Hello',
      txt: 'typo'
    }, {
      validation: {
        unknownBarePropertyPolicy: 'error'
      }
    })).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'unknown-property',
        path: '/txt',
        severity: 'error'
      })
    ]));
  });

  it('keeps unknown bare properties out of compiled props when strict policy is error', () => {
    const compiler = createCompiler(strictTextRenderer);
    const compiled = compiler.compile({
      type: 'strict-text',
      text: 'Hello',
      txt: 'typo'
    }, {
      diagnostics: {
        enabled: true,
        continueOnError: true
      },
      validation: {
        unknownBarePropertyPolicy: 'error'
      }
    }) as any;
    const node = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;

    expect(node.propsProgram.value).toEqual({ type: 'strict-text', text: 'Hello' });
  });

  it('preserves namespaced extensions outside normal props when namespaced passthrough is enabled', () => {
    const compiler = createCompiler(strictTextRenderer);
    const compiled = compiler.compile({
      type: 'strict-text',
      text: 'Hello',
      'acme:layout': {
        density: 'compact'
      }
    }, {
      diagnostics: {
        enabled: true,
        continueOnError: true
      },
      validation: {
        namespacedPropertyPolicy: 'delegate-or-ignore',
        extensionPassthroughPolicy: 'namespaced-only'
      }
    }) as any;
    const node = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;

    expect(node.propsProgram.value).toEqual({ type: 'strict-text', text: 'Hello' });
    expect(node.schema?.['acme:layout']).toEqual({
      density: 'compact'
    });
  });

  it('validates built-in xui:imports through the namespace validator', () => {
    const compiler = createCompiler(strictTextRenderer);

    expect(compiler.validate?.({
      type: 'strict-text',
      text: 'Hello',
      'xui:imports': [
        {
          from: 'demo-lib'
        }
      ]
    } as any)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'invalid-namespace-property',
        path: '/xui:imports/0/as',
        source: 'namespace'
      })
    ]));
  });

  it('validates xui:version as a string version selector', () => {
    const compiler = createCompiler(strictTextRenderer);

    expect(compiler.validate?.({
      type: 'strict-text',
      text: 'Hello',
      'xui:version': '1.x'
    } as any)).toEqual([]);
  });

  it('rejects non-string xui:version', () => {
    const compiler = createCompiler(strictTextRenderer);

    expect(compiler.validate?.({
      type: 'strict-text',
      text: 'Hello',
      'xui:version': 123
    } as any)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'invalid-namespace-property',
        message: 'xui:version must be a string version selector.',
        source: 'namespace'
      })
    ]));
  });

  it('rejects empty xui:version', () => {
    const compiler = createCompiler(strictTextRenderer);

    expect(compiler.validate?.({
      type: 'strict-text',
      text: 'Hello',
      'xui:version': ''
    } as any)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'invalid-namespace-property',
        message: 'xui:version must be a non-empty version selector string.',
        source: 'namespace'
      })
    ]));
  });

  it('accepts namespaced action payload fields when args is omitted', () => {
    const compiler = createCompiler(actionHostRenderer);

    expect(compiler.validate?.({
      type: 'action-host',
      onClick: {
        action: 'designer:addNode',
        nodeType: 'task'
      }
    })).toEqual([]);
  });

  it('reports imported helper member and arg-shape issues from prepared import meta', () => {
    const compiler = createCompiler(strictTextRenderer);

    const diagnostics = compiler.validate?.({
      type: 'strict-text',
      text: '${$demo.missing(user.name)} ${$demo.formatName(user.first)}'
    }, {
      schemaUrl: 'test://schema.json',
      symbolTable: createBaseCompileSymbolTable().push({
        id: 'prepared-imports',
        kind: 'imports',
        symbols: {
          '$demo': {
            name: '$demo',
            kind: 'import-alias',
            members: ['formatName'],
            memberDefinitions: {
              formatName: {
                kind: 'function',
                params: [
                  { name: 'first' },
                  { name: 'last' }
                ]
              }
            }
          }
        }
      }),
      preparedImports: new Map([
        [
          JSON.stringify({ schemaUrl: 'test://schema.json', from: 'demo-lib', as: 'demo', options: null }),
          {
            schemaUrl: 'test://schema.json',
            spec: { from: 'demo-lib', as: 'demo' },
            resolvedSpec: { from: 'demo-lib', as: 'demo' },
            staticMeta: {
              helpers: {
                formatName: {
                  kind: 'function',
                  params: [
                    { name: 'first' },
                    { name: 'last' }
                  ]
                }
              }
            }
          }
        ]
      ])
    }) ?? [];

    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'unknown-import-member'
      }),
      expect.objectContaining({
        code: 'invalid-import-function-args'
      })
    ]));
  });

  it('exposes a validateSchema adapter over compiler-owned analysis', () => {
    const registry = createRendererRegistry([strictTextRenderer]);

    expect(validateSchema({
      schema: {
        type: 'strict-text',
        txt: 'typo'
      },
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
      options: {
        validation: {
          unknownBarePropertyPolicy: 'error'
        }
      }
    })).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'unknown-property',
        path: '/txt'
      })
    ]));
  });
});

describe('host action validation', () => {
  const designerManifest: HostCapabilityProjectionManifest = {
    family: 'designer',
    version: '1.0.0',
    projection: {
      fields: {
        doc: { schema: { kind: 'object', fields: {} } },
        activeNode: { schema: { kind: 'union', anyOf: [{ kind: 'null' }, { kind: 'object', fields: {} }] } }
      }
    },
    capabilities: {
      namespace: 'designer',
      methods: {
        addNode: {
          args: {
            kind: 'object',
            fields: {
              nodeType: { kind: 'string' }
            }
          }
        }
      }
    }
  };

  it('parses namespaced actions', () => {
    expect(parseNamespacedAction('designer:addNode')).toEqual({ namespace: 'designer', method: 'addNode' });
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
        transitiveInheritance: true
      }
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
        transitiveInheritance: true
      }
    });
    const diagnostics = createSchemaCompilerDiagnosticsContext({ diagnostics: { enabled: true } }, 'validate');

    validateHostAction('designer:unknownMethod', undefined, '/onClick', diagnostics, context);

    expect(diagnostics.diagnostics).toEqual([
      expect.objectContaining({
        code: 'unknown-host-capability-method',
        source: 'host-contract'
      })
    ]);
  });

  it('propagates schemaUrl as sourceLocation.file on emitted diagnostics', () => {
    const diagnostics = createSchemaCompilerDiagnosticsContext(
      { diagnostics: { enabled: true } },
      'validate',
      'my-schema.json'
    );

    diagnostics.emit({
      code: 'expected-object',
      path: '/body/0',
      message: 'Schema nodes must be objects.'
    });

    expect(diagnostics.diagnostics).toHaveLength(1);
    expect(diagnostics.diagnostics[0].sourceLocation).toEqual({ file: 'my-schema.json' });
  });

  it('does not add sourceLocation when no schemaUrl is provided', () => {
    const diagnostics = createSchemaCompilerDiagnosticsContext(
      { diagnostics: { enabled: true } },
      'validate'
    );

    diagnostics.emit({
      code: 'expected-object',
      path: '/body/0',
      message: 'Schema nodes must be objects.'
    });

    expect(diagnostics.diagnostics).toHaveLength(1);
    expect(diagnostics.diagnostics[0].sourceLocation).toBeUndefined();
  });

  it('allows explicit sourceLocation override', () => {
    const diagnostics = createSchemaCompilerDiagnosticsContext(
      { diagnostics: { enabled: true } },
      'validate',
      'default.json'
    );

    diagnostics.emit({
      code: 'invalid-action-shape',
      path: '/onClick',
      message: 'Bad action',
      sourceLocation: { file: 'override.xview', line: 42, column: 10 }
    });

    expect(diagnostics.diagnostics).toHaveLength(1);
    expect(diagnostics.diagnostics[0].sourceLocation).toEqual({ file: 'override.xview', line: 42, column: 10 });
  });

  describe('xui:actions validation', () => {
    it('rejects non-object xui:actions', () => {
      const compiler = createCompiler(strictTextRenderer);

      expect(compiler.validate?.({
        type: 'strict-text',
        text: 'Hello',
        'xui:actions': 'bad'
      } as any)).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-namespace-property',
          message: 'xui:actions must be a non-null object mapping names to ActionSchema.',
          source: 'namespace'
        })
      ]));
    });

    it('rejects array xui:actions', () => {
      const compiler = createCompiler(strictTextRenderer);

      expect(compiler.validate?.({
        type: 'strict-text',
        text: 'Hello',
        'xui:actions': [{ action: 'ajax' }]
      } as any)).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-namespace-property',
          message: 'xui:actions must be a non-null object mapping names to ActionSchema.',
          source: 'namespace'
        })
      ]));
    });

    it('rejects null xui:actions', () => {
      const compiler = createCompiler(strictTextRenderer);

      expect(compiler.validate?.({
        type: 'strict-text',
        text: 'Hello',
        'xui:actions': null
      } as any)).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-namespace-property',
          message: 'xui:actions must be a non-null object mapping names to ActionSchema.',
          source: 'namespace'
        })
      ]));
    });

    it('errors on name containing colon', () => {
      const compiler = createCompiler(strictTextRenderer);

      expect(compiler.validate?.({
        type: 'strict-text',
        text: 'Hello',
        'xui:actions': {
          'ns:method': { action: 'ajax' }
        }
      } as any)).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-namespace-property',
          message: expect.stringContaining('must not contain a colon'),
          severity: 'error',
          source: 'namespace'
        })
      ]));
    });

    it('warns on name conflicting with built-in action', () => {
      const compiler = createCompiler(strictTextRenderer);

      expect(compiler.validate?.({
        type: 'strict-text',
        text: 'Hello',
        'xui:actions': {
          ajax: { action: 'showToast' }
        }
      } as any)).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-namespace-property',
          message: expect.stringContaining('conflicts with a built-in action'),
          severity: 'warning',
          source: 'namespace'
        })
      ]));
    });

    it('errors on non-object action entry', () => {
      const compiler = createCompiler(strictTextRenderer);

      expect(compiler.validate?.({
        type: 'strict-text',
        text: 'Hello',
        'xui:actions': {
          bad: 'string-value'
        }
      } as any)).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-namespace-property',
          message: expect.stringContaining('must be an ActionSchema object'),
          source: 'namespace'
        })
      ]));
    });

    it('warns on direct self-reference', () => {
      const compiler = createCompiler(strictTextRenderer);

      expect(compiler.validate?.({
        type: 'strict-text',
        text: 'Hello',
        'xui:actions': {
          loop: { action: 'loop' }
        }
      } as any)).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-namespace-property',
          message: expect.stringContaining('directly references itself'),
          severity: 'warning',
          source: 'namespace'
        })
      ]));
    });

    it('accepts valid xui:actions', () => {
      const compiler = createCompiler(strictTextRenderer);

      expect(compiler.validate?.({
        type: 'strict-text',
        text: 'Hello',
        'xui:actions': {
          save: { action: 'ajax', args: { url: '/save' } },
          reset: { action: 'setValue', args: { path: 'x', value: 0 } }
        }
      } as any)).toEqual([]);
    });
  });
});
