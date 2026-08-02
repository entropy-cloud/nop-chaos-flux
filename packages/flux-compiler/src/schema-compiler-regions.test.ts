import { describe, expect, it } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { createRendererRegistry, validateRegionParams } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaCompiler } from './index.js';

describe('schema-compiler regions', () => {
  it('rejects any $-prefixed region param name', () => {
    expect(() => validateRegionParams(['$record'], '$.body')).toThrow(
      'Names starting with "$" are reserved for slot-frame metadata.',
    );
  });

  it('rejects any $-prefixed nested fieldRules region param name through the unified pipeline', () => {
    const tabsFixture: RendererDefinition = {
      type: 'tabs-fixture',
      component: () => null,
      propContracts: {
        items: {
          shape: {
            kind: 'array',
            item: {
              kind: 'schema-definition',
              fieldRules: {
                title: {
                  kind: 'value-or-region',
                  regionKey: 'titleRegionKey',
                  params: ['$item'],
                },
              },
            },
          },
          displayName: 'Items',
        },
      },
      fields: [{ key: 'items', kind: 'prop' }],
    };
    const textRenderer: RendererDefinition = {
      type: 'text',
      component: () => null,
    };
    const registry = createRendererRegistry([tabsFixture, textRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    expect(() =>
      compiler.compile({
        type: 'tabs-fixture',
        items: [{ title: { type: 'text', text: 'Hello' } }],
      }),
    ).toThrow('Names starting with "$" are reserved for slot-frame metadata.');
  });
});
