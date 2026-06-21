import { describe, expect, it } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { makeCompiler } from './schema-compiler-shape-validation-test-utils.js';

describe('shape validation action and source diagnostics', () => {
  it('reports invalid root (non-object, non-array)', () => {
    const compiler = makeCompiler();

    expect(compiler.validate?.('string' as any)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'invalid-root' })]),
    );
  });

  it('reports missing type field as invalid root', () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    const compiler = makeCompiler([renderer]);

    expect(compiler.validate?.({ label: 'test' } as any)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'invalid-root' })]),
    );
  });

  it('reports empty type field', () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    const compiler = makeCompiler([renderer]);

    expect(compiler.validate?.({ type: '' })).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'missing-required-field' })]),
    );
  });

  it('reports unknown renderer type', () => {
    const compiler = makeCompiler();

    expect(compiler.validate?.({ type: 'unknown-type' })).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'unknown-renderer-type' })]),
    );
  });

  it('reports invalid region node', () => {
    const renderer: RendererDefinition = {
      type: 'container',
      component: () => null,
      fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
    };
    const compiler = makeCompiler([renderer]);

    expect(compiler.validate?.({ type: 'container', body: 42 })).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'invalid-region-node' })]),
    );
  });

  it('reports invalid action shape', () => {
    const renderer: RendererDefinition = {
      type: 'button',
      component: () => null,
      fields: [{ key: 'onClick', kind: 'event' }],
    };
    const compiler = makeCompiler([renderer]);

    expect(compiler.validate?.({ type: 'button', onClick: 'not-an-object' })).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'invalid-action-shape' })]),
    );
  });

  it('reports action without action field', () => {
    const renderer: RendererDefinition = {
      type: 'button',
      component: () => null,
      fields: [{ key: 'onClick', kind: 'event' }],
    };
    const compiler = makeCompiler([renderer]);

    expect(compiler.validate?.({ type: 'button', onClick: { args: { path: 'x' } } })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          message: 'Action objects require a non-empty action field.',
        }),
      ]),
    );
  });

  it('reports invalid action args', () => {
    const renderer: RendererDefinition = {
      type: 'button',
      component: () => null,
      fields: [{ key: 'onClick', kind: 'event' }],
    };
    const compiler = makeCompiler([renderer]);

    expect(
      compiler.validate?.({
        type: 'button',
        onClick: { action: 'test', args: 'not-object' },
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          message: 'Action args must be an object when provided.',
        }),
      ]),
    );
  });

  it('reports invalid dynamic-renderer loadAction shape through renderer validation', () => {
    const renderer: RendererDefinition = {
      type: 'dynamic-renderer',
      component: () => null,
      fields: [{ key: 'loadAction', kind: 'prop' }],
      schemaValidator({ schema, emit }) {
        const loadAction = schema.loadAction;
        if (!loadAction || typeof loadAction !== 'object' || Array.isArray(loadAction)) {
          emit({
            code: 'invalid-action-shape',
            path: '/loadAction',
            message: 'Action entries must be objects.',
          });
        }
      },
    };
    const compiler = makeCompiler([renderer]);

    expect(
      compiler.validate?.({
        type: 'dynamic-renderer',
        loadAction: 'bad-action',
      } as any),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          path: '/loadAction',
          message: 'Action entries must be objects.',
        }),
      ]),
    );
  });

  it('reports non-array parallel in action', () => {
    const renderer: RendererDefinition = {
      type: 'button',
      component: () => null,
      fields: [{ key: 'onClick', kind: 'event' }],
    };
    const compiler = makeCompiler([renderer]);

    expect(
      compiler.validate?.({
        type: 'button',
        onClick: { action: 'test', parallel: 'not-array' },
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          message: 'Action parallel must be an array when provided.',
        }),
      ]),
    );
  });

  it('reports invalid onSettled action shape', () => {
    const renderer: RendererDefinition = {
      type: 'button',
      component: () => null,
      fields: [{ key: 'onClick', kind: 'event' }],
    };
    const compiler = makeCompiler([renderer]);

    expect(
      compiler.validate?.({
        type: 'button',
        onClick: { action: 'test', onSettled: 'not-an-action' },
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          path: '/onClick/onSettled',
          message: 'Action entries must be objects.',
        }),
      ]),
    );
  });

  it('reports invalid action when shape for when field', () => {
    const renderer: RendererDefinition = {
      type: 'button',
      component: () => null,
      fields: [{ key: 'onClick', kind: 'event' }],
    };
    const compiler = makeCompiler([renderer]);

    expect(
      compiler.validate?.({
        type: 'button',
        onClick: { action: 'test', when: { bad: true } },
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          path: '/onClick/when',
          message: 'Action when must be a boolean or expression string when provided.',
        }),
      ]),
    );
  });

  it('reports invalid preventDefault shape on action', () => {
    const renderer: RendererDefinition = {
      type: 'button',
      component: () => null,
      fields: [{ key: 'onClick', kind: 'event' }],
    };
    const compiler = makeCompiler([renderer]);

    expect(
      compiler.validate?.({
        type: 'button',
        onClick: { action: 'test', preventDefault: { bad: true } },
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          path: '/onClick/preventDefault',
          message:
            'Action preventDefault must be a boolean or expression string when provided.',
        }),
      ]),
    );
  });

  it('reports invalid stopPropagation shape on action', () => {
    const renderer: RendererDefinition = {
      type: 'button',
      component: () => null,
      fields: [{ key: 'onClick', kind: 'event' }],
    };
    const compiler = makeCompiler([renderer]);

    expect(
      compiler.validate?.({
        type: 'button',
        onClick: { action: 'test', stopPropagation: 42 },
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          path: '/onClick/stopPropagation',
          message:
            'Action stopPropagation must be a boolean or expression string when provided.',
        }),
      ]),
    );
  });

  it('accepts valid boolean and expression forms for preventDefault and stopPropagation', () => {
    const renderer: RendererDefinition = {
      type: 'button',
      component: () => null,
      fields: [{ key: 'onClick', kind: 'event' }],
    };
    const compiler = makeCompiler([renderer]);

    const diagnostics = compiler.validate?.({
      type: 'button',
      onClick: {
        action: 'test',
        preventDefault: true,
        stopPropagation: '${shouldStop}',
      },
    });

    const preventionIssues = (diagnostics ?? []).filter(
      (d) =>
        d.code === 'invalid-action-shape' &&
        (d.path === '/onClick/preventDefault' || d.path === '/onClick/stopPropagation'),
    );

    expect(preventionIssues).toEqual([]);
  });

  it('reports invalid source shape', () => {
    const renderer: RendererDefinition = {
      type: 'page',
      component: () => null,
      propSchema: { data: { type: 'object' } },
      fields: [{ key: 'data', kind: 'prop' }],
    };
    const compiler = makeCompiler([renderer]);

    expect(compiler.validate?.({ type: 'page', data: { type: 'source' } })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-source-shape',
          message: 'Source values require formula, action, or args.',
        }),
      ]),
    );
  });

  it('reports invalid source action type', () => {
    const renderer: RendererDefinition = {
      type: 'page',
      component: () => null,
      propSchema: { data: { type: 'object' } },
      fields: [{ key: 'data', kind: 'prop' }],
    };
    const compiler = makeCompiler([renderer]);

    expect(compiler.validate?.({ type: 'page', data: { type: 'source', action: 123 } })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-source-shape',
          message: 'Source action must be a string when provided.',
        }),
      ]),
    );
  });

  it('rejects dynamic structural data-source name and statusPath', () => {
    const renderer: RendererDefinition = {
      type: 'page',
      component: () => null,
      propSchema: { data: { type: 'object' } },
      fields: [{ key: 'data', kind: 'prop' }],
    };
    const compiler = makeCompiler([renderer]);

    const diagnostics = compiler.validate?.({
      type: 'page',
      data: {
        type: 'source',
        formula: 1,
        name: '${targetName}',
        statusPath: 'status.${stage}',
      },
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-source-shape',
          path: '/data/name',
          message:
            'name must be a static structural path string. Dynamic expressions and templates are not supported.',
        }),
        expect.objectContaining({
          code: 'invalid-source-shape',
          path: '/data/statusPath',
          message:
            'statusPath must be a static structural path string. Dynamic expressions and templates are not supported.',
        }),
      ]),
    );
  });

  it('reports invalid dependsOn entries', () => {
    const renderer: RendererDefinition = {
      type: 'page',
      component: () => null,
      fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
    };
    const compiler = makeCompiler([renderer]);

    const diagnostics = compiler.validate?.({
      type: 'page',
      dependsOn: [123, '', 'deep.nested.path'],
    });
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-property-shape',
          message: 'dependsOn entries must be non-empty strings.',
        }),
        expect.objectContaining({
          code: 'invalid-property-shape',
          message: 'dependsOn entries must use lexical root bindings, not deep member paths.',
        }),
      ]),
    );
  });

  it('reports non-array dependsOn', () => {
    const renderer: RendererDefinition = {
      type: 'page',
      component: () => null,
      fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
    };
    const compiler = makeCompiler([renderer]);

    expect(compiler.validate?.({ type: 'page', dependsOn: 'not-array' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-property-shape',
          message: 'dependsOn must be an array of lexical root strings.',
        }),
      ]),
    );
  });

  it('deduplicates diagnostic entries', () => {
    const renderer: RendererDefinition = {
      type: 'text',
      component: () => null,
      propSchema: { text: { type: 'string' } },
    };
    const compiler = makeCompiler([renderer]);

    const diagnostics = compiler.validate?.(
      { type: 'text', typo: 'value1' },
      {
        validation: { unknownBarePropertyPolicy: 'error' },
      },
    );
    expect(diagnostics?.filter((d) => d.code === 'unknown-property')).toHaveLength(1);
  });

  it('respects maxIssues limit', () => {
    const renderer: RendererDefinition = {
      type: 'text',
      component: () => null,
      propSchema: { text: { type: 'string' } },
    };
    const compiler = makeCompiler([renderer]);

    const diagnostics = compiler.validate?.(
      { type: 'text', a: 1, b: 2, c: 3 },
      {
        diagnostics: { maxIssues: 1 },
        validation: { unknownBarePropertyPolicy: 'warn' },
      },
    );
    expect(diagnostics!.length).toBeLessThanOrEqual(1);
  });

  it('reports renderer schemaValidator issues', () => {
    const renderer: RendererDefinition = {
      type: 'validated',
      component: () => null,
      schemaValidator({ emit }) {
        emit({
          code: 'invalid-property-shape',
          message: 'Custom validation failed',
          path: '/custom',
        });
      },
    };
    const compiler = makeCompiler([renderer]);

    expect(compiler.validate?.({ type: 'validated' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-property-shape',
          message: 'Custom validation failed',
          source: 'renderer',
        }),
      ]),
    );
  });
});
