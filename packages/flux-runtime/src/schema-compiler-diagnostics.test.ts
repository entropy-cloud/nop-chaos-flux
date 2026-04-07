import { describe, expect, it } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRegistry } from './registry';
import { createSchemaCompiler, validateSchema } from './schema-compiler';

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
    const node = compiler.compile({
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

    expect(node.props.value).toEqual({ type: 'strict-text', text: 'Hello' });
  });

  it('preserves namespaced extensions outside normal props when namespaced passthrough is enabled', () => {
    const compiler = createCompiler(strictTextRenderer);
    const node = compiler.compile({
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

    expect(node.props.value).toEqual({ type: 'strict-text', text: 'Hello' });
    expect(node.extensions).toEqual({
      'acme:layout': {
        density: 'compact'
      }
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