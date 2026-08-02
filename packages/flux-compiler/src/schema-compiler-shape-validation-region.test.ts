import { describe, expect, it } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { makeCompiler } from './schema-compiler-shape-validation-test-utils.js';

describe('shape validation region traversal diagnostics', () => {
  it('traverses value-or-region fields during validation', () => {
    const cardRenderer: RendererDefinition = {
      type: 'card',
      component: () => null,
      propSchema: { title: { type: 'string' } },
      fields: [{ key: 'title', kind: 'value-or-region', regionKey: 'title' }],
    };
    const textRenderer: RendererDefinition = {
      type: 'text',
      component: () => null,
      propSchema: { text: { type: 'string' } },
    };
    const compiler = makeCompiler([cardRenderer, textRenderer]);

    expect(
      compiler.validate?.({ type: 'card', title: { type: 'text', unknownProp: 'val' } } as any, {
        validation: { unknownBarePropertyPolicy: 'warn' },
      }),
    ).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'unknown-property' })]));
  });

  it('does not traverse source carriers on allowSource value-or-region fields', () => {
    const renderer: RendererDefinition = {
      type: 'card',
      component: () => null,
      fields: [{ key: 'title', kind: 'value-or-region', regionKey: 'title', allowSource: true }],
    };
    const compiler = makeCompiler([renderer]);

    expect(
      compiler.validate?.({ type: 'card', title: { type: 'source', action: 'loadTitle' } } as any, {
        validation: { unknownBarePropertyPolicy: 'warn' },
      }),
    ).toEqual([]);
  });

  it('rejects any $-prefixed param names on direct regions during validation', () => {
    const renderer: RendererDefinition = {
      type: 'card',
      component: () => null,
      fields: [{ key: 'body', kind: 'region', regionKey: 'body', params: ['$record'] }],
    };
    const compiler = makeCompiler([renderer, { type: 'text', component: () => null }]);

    expect(compiler.validate?.({ type: 'card', body: { type: 'text' } })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unhandled-compilation-error',
          message: expect.stringContaining(
            'Names starting with "$" are reserved for slot-frame metadata.',
          ),
        }),
      ]),
    );
  });

  it('preserves compile failure cause on owner-facing validation diagnostics', () => {
    const renderer: RendererDefinition = {
      type: 'text',
      component: () => null,
      propSchema: { text: { type: 'string' } },
    };
    const compiler = makeCompiler([renderer]);

    const diagnostics = compiler.validate?.({ type: 'text', text: '${foo + }' });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unhandled-compilation-error',
          path: '$.text',
          message: expect.stringContaining('Expression compilation failed:'),
          cause: expect.any(Error),
        }),
      ]),
    );
    expect(
      diagnostics?.find((issue) => issue.code === 'unhandled-compilation-error')?.cause,
    ).toBeInstanceOf(Error);
  });

  it('traverses deep extracted table regions during validation', () => {
    const tableRenderer: RendererDefinition = {
      type: 'table',
      component: () => null,
      propContracts: {
        columns: {
          shape: {
            kind: 'array',
            item: {
              kind: 'schema-definition',
              fieldRules: {
                label: { kind: 'value-or-region', regionKey: 'labelRegionKey' },
                buttons: {
                  kind: 'region',
                  regionKey: 'buttonsRegionKey',
                  params: ['record', 'index'],
                  isolate: true,
                },
                cell: {
                  kind: 'region',
                  regionKey: 'cellRegionKey',
                  params: ['record', 'index'],
                  isolate: true,
                },
                body: {
                  kind: 'region',
                  regionKey: 'quickEditBodyRegionKey',
                  regionKeySuffix: 'quickEditBody',
                },
              },
            },
          },
          displayName: 'Columns',
        },
      },
    };
    const textRenderer: RendererDefinition = {
      type: 'text',
      component: () => null,
      propSchema: { text: { type: 'string' } },
    };
    const compiler = makeCompiler([tableRenderer, textRenderer]);

    const diagnostics = compiler.validate?.(
      {
        type: 'table',
        columns: [
          {
            name: 'name',
            cell: { type: 'text', unknownProp: 'value', text: 'User ${$slot.record.name}' },
          },
        ],
      } as any,
      {
        validation: { unknownBarePropertyPolicy: 'warn' },
      },
    );

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-property',
          path: '/columns/0/cell/unknownProp',
        }),
      ]),
    );
  });
});
