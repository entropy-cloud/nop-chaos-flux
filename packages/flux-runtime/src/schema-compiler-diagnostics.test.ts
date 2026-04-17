import { describe, expect, it } from 'vitest';
import type {
  HostCapabilityProjectionManifest,
  RendererDefinition,
  RendererHostContract
} from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRegistry } from './registry';
import { createSchemaCompiler, validateSchema } from './schema-compiler';
import {
  createHostActionValidationContext,
  isInsideCapableRegion,
  parseNamespacedAction,
  validateHostAction
} from './schema-compiler/host-action-validation';
import { createSchemaCompilerDiagnosticsContext } from './schema-compiler/diagnostics';

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

const automaticHostManifest: HostCapabilityProjectionManifest = {
  family: 'designer',
  version: '1.0',
  projection: { fields: {} },
  capabilities: {
    namespace: 'designer',
    methods: {
      selectNode: {
        args: {
          kind: 'object',
          fields: {
            nodeId: { kind: 'string' }
          }
        }
      }
    }
  }
};

const automaticHostContract: RendererHostContract = {
  family: 'designer',
  defaultVersion: '1.0',
  resolveManifest(versionSelector) {
    if (versionSelector === '1.0' || versionSelector === 'latest') {
      return automaticHostManifest;
    }

    return undefined;
  },
  capabilityPublication: {
    mode: 'region-scoped',
    capableRegions: ['toolbar'],
    transitiveInheritance: true
  }
};

const automaticHostOwnerRenderer: RendererDefinition = {
  type: 'designer-page',
  component: () => null,
  regions: ['toolbar', 'body'],
  hostContract: automaticHostContract
};

const automaticHostButtonRenderer: RendererDefinition = {
  type: 'toolbar-button',
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
    })).toEqual([
      expect.objectContaining({
        code: 'unknown-property',
        path: '/txt',
        severity: 'error'
      })
    ]);
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
    } as any)).toEqual([
      expect.objectContaining({
        code: 'invalid-namespace-property',
        path: '/xui:imports/0/as',
        source: 'namespace'
      })
    ]);
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
    } as any)).toEqual([
      expect.objectContaining({
        code: 'invalid-namespace-property',
        message: 'xui:version must be a string version selector.',
        source: 'namespace'
      })
    ]);
  });

  it('rejects empty xui:version', () => {
    const compiler = createCompiler(strictTextRenderer);

    expect(compiler.validate?.({
      type: 'strict-text',
      text: 'Hello',
      'xui:version': ''
    } as any)).toEqual([
      expect.objectContaining({
        code: 'invalid-namespace-property',
        message: 'xui:version must be a non-empty version selector string.',
        source: 'namespace'
      })
    ]);
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
    })).toEqual([
      expect.objectContaining({
        code: 'unknown-property',
        path: '/txt'
      })
    ]);
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
              nodeType: { kind: 'string' },
              position: {
                kind: 'object',
                fields: {
                  x: { kind: 'number' },
                  y: { kind: 'number' }
                }
              }
            },
            optional: ['position']
          }
        },
        updateNodeData: {
          args: {
            kind: 'object',
            fields: {
              nodeId: { kind: 'string' },
              data: { kind: 'unknown' }
            }
          }
        },
        deprecatedMethod: {
          deprecated: true
        }
      }
    }
  };

  it('parseNamespacedAction parses valid namespaced actions', () => {
    expect(parseNamespacedAction('designer:addNode')).toEqual({ namespace: 'designer', method: 'addNode' });
    expect(parseNamespacedAction('report-designer:preview')).toEqual({ namespace: 'report-designer', method: 'preview' });
  });

  it('parseNamespacedAction returns undefined for non-namespaced actions', () => {
    expect(parseNamespacedAction('setValue')).toBeUndefined();
    expect(parseNamespacedAction('ajax')).toBeUndefined();
    expect(parseNamespacedAction(':method')).toBeUndefined();
    expect(parseNamespacedAction('namespace:')).toBeUndefined();
  });

  it('isInsideCapableRegion returns true for whole-owner mode', () => {
    const ctx = createHostActionValidationContext({
      family: 'designer',
      version: '1.0.0',
      manifest: designerManifest
    });
    expect(isInsideCapableRegion(ctx)).toBe(true);
    expect(isInsideCapableRegion(ctx, 'toolbar')).toBe(true);
  });

  it('isInsideCapableRegion returns false when no context', () => {
    expect(isInsideCapableRegion(undefined)).toBe(false);
    expect(isInsideCapableRegion(undefined, 'toolbar')).toBe(false);
  });

  it('isInsideCapableRegion handles region-scoped mode', () => {
    const ctx = createHostActionValidationContext({
      family: 'designer',
      version: '1.0.0',
      manifest: designerManifest,
      capabilityPublication: {
        mode: 'region-scoped',
        capableRegions: ['toolbar', 'inspector'],
        transitiveInheritance: true
      }
    });
    expect(isInsideCapableRegion(ctx)).toBe(false);
    expect(isInsideCapableRegion(ctx, 'toolbar')).toBe(true);
    expect(isInsideCapableRegion(ctx, 'dialogs')).toBe(false);
  });

  it('validateHostAction passes for valid host action', () => {
    const ctx = createHostActionValidationContext({
      family: 'designer',
      version: '1.0.0',
      manifest: designerManifest
    });
    const diagnosticsCtx = createSchemaCompilerDiagnosticsContext(
      { diagnostics: { enabled: true } },
      'validate'
    );

    const result = validateHostAction(
      'designer:addNode',
      { nodeType: 'task' },
      '/onClick',
      diagnosticsCtx,
      ctx
    );

    expect(result).toBe(true);
    expect(diagnosticsCtx.diagnostics).toEqual([]);
  });

  it('validateHostAction reports unknown method', () => {
    const ctx = createHostActionValidationContext({
      family: 'designer',
      version: '1.0.0',
      manifest: designerManifest
    });
    const diagnosticsCtx = createSchemaCompilerDiagnosticsContext(
      { diagnostics: { enabled: true } },
      'validate'
    );

    const result = validateHostAction(
      'designer:unknownMethod',
      {},
      '/onClick',
      diagnosticsCtx,
      ctx
    );

    expect(result).toBe(false);
    expect(diagnosticsCtx.diagnostics).toEqual([
      expect.objectContaining({
        code: 'unknown-host-capability-method',
        source: 'host-contract'
      })
    ]);
  });

  it('validateHostAction reports invalid args shape', () => {
    const ctx = createHostActionValidationContext({
      family: 'designer',
      version: '1.0.0',
      manifest: designerManifest
    });
    const diagnosticsCtx = createSchemaCompilerDiagnosticsContext(
      { diagnostics: { enabled: true } },
      'validate'
    );

    const result = validateHostAction(
      'designer:addNode',
      { nodeType: 123 },
      '/onClick',
      diagnosticsCtx,
      ctx
    );

    expect(result).toBe(false);
    expect(diagnosticsCtx.diagnostics).toEqual([
      expect.objectContaining({
        code: 'invalid-host-capability-args',
        source: 'host-contract'
      })
    ]);
  });

  it('validateHostAction warns on deprecated method', () => {
    const ctx = createHostActionValidationContext({
      family: 'designer',
      version: '1.0.0',
      manifest: designerManifest
    });
    const diagnosticsCtx = createSchemaCompilerDiagnosticsContext(
      { diagnostics: { enabled: true } },
      'validate'
    );

    const result = validateHostAction(
      'designer:deprecatedMethod',
      undefined,
      '/onClick',
      diagnosticsCtx,
      ctx
    );

    expect(result).toBe(true);
    expect(diagnosticsCtx.diagnostics).toEqual([
      expect.objectContaining({
        code: 'unknown-host-capability-method',
        severity: 'warning',
        source: 'host-contract'
      })
    ]);
  });

  it('validateHostAction skips validation for non-host namespace', () => {
    const ctx = createHostActionValidationContext({
      family: 'designer',
      version: '1.0.0',
      manifest: designerManifest
    });
    const diagnosticsCtx = createSchemaCompilerDiagnosticsContext(
      { diagnostics: { enabled: true } },
      'validate'
    );

    const result = validateHostAction(
      'other:method',
      {},
      '/onClick',
      diagnosticsCtx,
      ctx
    );

    expect(result).toBe(true);
    expect(diagnosticsCtx.diagnostics).toEqual([]);
  });

  it('validateHostAction skips validation for built-in actions', () => {
    const ctx = createHostActionValidationContext({
      family: 'designer',
      version: '1.0.0',
      manifest: designerManifest
    });
    const diagnosticsCtx = createSchemaCompilerDiagnosticsContext(
      { diagnostics: { enabled: true } },
      'validate'
    );

    const result = validateHostAction(
      'setValue',
      {},
      '/onClick',
      diagnosticsCtx,
      ctx
    );

    expect(result).toBe(true);
    expect(diagnosticsCtx.diagnostics).toEqual([]);
  });
});

describe('standalone validation with hostContractContext', () => {
  const testManifest: import('@nop-chaos/flux-core').HostCapabilityProjectionManifest = {
    family: 'designer',
    version: '1.0',
    projection: { fields: {} },
    capabilities: {
      namespace: 'designer',
      methods: {
        selectNode: {
          args: { kind: 'object', fields: { nodeId: { kind: 'string' } } }
        },
        undo: {}
      }
    }
  };

  const buttonRenderer: RendererDefinition = {
    type: 'button',
    component: () => null,
    propSchema: { label: { type: 'string' } },
    fields: [{ key: 'onClick', kind: 'event' }]
  };

  it('validates host actions in event handlers when hostContractContext is provided', () => {
    const diagnostics = validateSchema({
      schema: {
        type: 'button',
        label: 'Test',
        onClick: { action: 'designer:unknownMethod' }
      },
      registry: createRendererRegistry([buttonRenderer]),
      options: {
        validation: {
          hostContractContext: {
            family: 'designer',
            version: '1.0',
            manifest: testManifest
          }
        }
      }
    });

    const hostDiagnostics = diagnostics.filter(d => d.source === 'host-contract');
    expect(hostDiagnostics).toHaveLength(1);
    expect(hostDiagnostics[0].code).toBe('unknown-host-capability-method');
    expect(hostDiagnostics[0].message).toContain('unknownMethod');
  });

  it('validates host action args shape when hostContractContext is provided', () => {
    const diagnostics = validateSchema({
      schema: {
        type: 'button',
        label: 'Test',
        onClick: { action: 'designer:selectNode', args: { nodeId: 123 } }
      },
      registry: createRendererRegistry([buttonRenderer]),
      options: {
        validation: {
          hostContractContext: {
            family: 'designer',
            version: '1.0',
            manifest: testManifest
          }
        }
      }
    });

    const hostDiagnostics = diagnostics.filter(d => d.source === 'host-contract');
    expect(hostDiagnostics).toHaveLength(1);
    expect(hostDiagnostics[0].code).toBe('invalid-host-capability-args');
  });

  it('passes validation for valid host actions when hostContractContext is provided', () => {
    const diagnostics = validateSchema({
      schema: {
        type: 'button',
        label: 'Test',
        onClick: { action: 'designer:selectNode', args: { nodeId: 'node-1' } }
      },
      registry: createRendererRegistry([buttonRenderer]),
      options: {
        validation: {
          hostContractContext: {
            family: 'designer',
            version: '1.0',
            manifest: testManifest
          }
        }
      }
    });

    const hostDiagnostics = diagnostics.filter(d => d.source === 'host-contract');
    expect(hostDiagnostics).toHaveLength(0);
  });

  it('skips host action validation when hostContractContext is not provided', () => {
    const diagnostics = validateSchema({
      schema: {
        type: 'button',
        label: 'Test',
        onClick: { action: 'designer:unknownMethod' }
      },
      registry: createRendererRegistry([buttonRenderer])
    });

    const hostDiagnostics = diagnostics.filter(d => d.source === 'host-contract');
    expect(hostDiagnostics).toHaveLength(0);
  });
});

describe('automatic host contract validation from renderer definitions', () => {
  it('validates host actions inside a capable region without explicit hostContractContext', () => {
    const diagnostics = validateSchema({
      schema: {
        type: 'designer-page',
        toolbar: {
          type: 'toolbar-button',
          onClick: { action: 'designer:unknownMethod' }
        }
      },
      registry: createRendererRegistry([automaticHostOwnerRenderer, automaticHostButtonRenderer])
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'unknown-host-capability-method',
        path: '/toolbar/onClick/action',
        source: 'host-contract'
      })
    ]);
  });

  it('skips host action diagnostics outside capable regions', () => {
    const diagnostics = validateSchema({
      schema: {
        type: 'designer-page',
        body: {
          type: 'toolbar-button',
          onClick: { action: 'designer:unknownMethod' }
        }
      },
      registry: createRendererRegistry([automaticHostOwnerRenderer, automaticHostButtonRenderer])
    });

    expect(diagnostics.filter((issue) => issue.source === 'host-contract')).toEqual([]);
  });

  it('reports unsupported xui:version selectors on host owners', () => {
    const diagnostics = validateSchema({
      schema: {
        type: 'designer-page',
        'xui:version': '2.x',
        toolbar: {
          type: 'toolbar-button',
          onClick: { action: 'designer:selectNode', args: { nodeId: 'node-1' } }
        }
      },
      registry: createRendererRegistry([automaticHostOwnerRenderer, automaticHostButtonRenderer])
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'unsupported-host-contract-version',
        path: '',
        source: 'host-contract'
      })
    ]);
  });
});
