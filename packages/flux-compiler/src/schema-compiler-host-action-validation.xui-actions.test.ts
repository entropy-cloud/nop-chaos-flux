import { describe, expect, it } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { createBaseCompileSymbolTable } from './compile-symbol-table.js';
import { eventRenderer, pageRenderer, createCompiler } from './schema-compiler-host-action-validation.test-support.js';

describe('host action validation xui:actions validation', () => {
  it('rejects non-object xui:actions', () => {
    const compiler = createCompiler({
      type: 'strict-text',
      component: () => null,
      propSchema: { text: { type: 'string' } },
      fields: [{ key: 'text', kind: 'prop' }],
    });

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
    const compiler = createCompiler({
      type: 'strict-text',
      component: () => null,
      propSchema: { text: { type: 'string' } },
      fields: [{ key: 'text', kind: 'prop' }],
    });

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
    const compiler = createCompiler({
      type: 'strict-text',
      component: () => null,
      propSchema: { text: { type: 'string' } },
      fields: [{ key: 'text', kind: 'prop' }],
    });

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
    const compiler = createCompiler({
      type: 'strict-text',
      component: () => null,
      propSchema: { text: { type: 'string' } },
      fields: [{ key: 'text', kind: 'prop' }],
    });

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
    const compiler = createCompiler({
      type: 'strict-text',
      component: () => null,
      propSchema: { text: { type: 'string' } },
      fields: [{ key: 'text', kind: 'prop' }],
    });

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
    const compiler = createCompiler({
      type: 'strict-text',
      component: () => null,
      propSchema: { text: { type: 'string' } },
      fields: [{ key: 'text', kind: 'prop' }],
    });

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
    const compiler = createCompiler({
      type: 'strict-text',
      component: () => null,
      propSchema: { text: { type: 'string' } },
      fields: [{ key: 'text', kind: 'prop' }],
    });

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
    const compiler = createCompiler({
      type: 'strict-text',
      component: () => null,
      propSchema: { text: { type: 'string' } },
      fields: [{ key: 'text', kind: 'prop' }],
    });

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

  it('validates component selector args when a unique componentId resolves to a published renderer contract', () => {
    const formRendererWithContracts: RendererDefinition = {
      type: 'form',
      component: () => null,
      componentCapabilityContracts: [
        {
          handle: 'validate',
          displayName: 'Validate',
        },
        {
          handle: 'setValue',
          displayName: 'Set Value',
          args: {
            kind: 'object',
            fields: {
              name: { kind: 'string' },
              value: { kind: 'unknown' },
            },
          },
        },
      ],
    };
    const compiler = createCompiler(pageRenderer, eventRenderer, formRendererWithContracts);

    expect(
      compiler.validate?.({
        type: 'page',
        body: [
          { type: 'form', id: 'my-form' },
          {
            type: 'event-text',
            text: 'Hello',
            onClick: { action: 'component:setValue', componentId: 'my-form', args: { name: 123 } },
          },
        ],
      } as any),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-host-capability-args',
          path: '/body/1/onClick/args/name',
        }),
      ]),
    );
  });

  it('rejects component submit args when the published capability does not accept a payload', () => {
    const formRendererWithContracts: RendererDefinition = {
      type: 'form',
      component: () => null,
      componentCapabilityContracts: [
        {
          handle: 'submit',
          displayName: 'Submit',
        },
      ],
    };
    const compiler = createCompiler(pageRenderer, eventRenderer, formRendererWithContracts);

    expect(
      compiler.validate?.({
        type: 'page',
        body: [
          { type: 'form', id: 'my-form' },
          {
            type: 'event-text',
            text: 'Hello',
            onClick: {
              action: 'component:submit',
              componentId: 'my-form',
              args: { method: 'post', url: '/api/save' },
            },
          },
        ],
      } as any),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-host-capability-args',
          path: '/body/1/onClick/args',
        }),
      ]),
    );
  });

  it('keeps component selectors warning-only when componentId is duplicate or componentName-based', () => {
    const formRendererWithContracts: RendererDefinition = {
      type: 'form',
      component: () => null,
      componentCapabilityContracts: [
        {
          handle: 'setValue',
          displayName: 'Set Value',
          args: {
            kind: 'object',
            fields: {
              name: { kind: 'string' },
              value: { kind: 'unknown' },
            },
          },
        },
      ],
    };
    const compiler = createCompiler(pageRenderer, eventRenderer, formRendererWithContracts);

    expect(
      compiler.validate?.({
        type: 'page',
        body: [
          { type: 'form', id: 'dup-form' },
          { type: 'form', id: 'dup-form' },
          {
            type: 'event-text',
            text: 'Hello',
            onClick: { action: 'component:setValue', componentId: 'dup-form', args: { name: 123 } },
          },
        ],
      } as any),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unvalidated-component-target',
          path: '/body/2/onClick/action',
        }),
      ]),
    );

    expect(
      compiler.validate?.({
        type: 'page',
        body: [
          { type: 'form', id: 'my-form', name: 'userForm' },
          {
            type: 'event-text',
            text: 'Hello',
            onClick: { action: 'component:setValue', componentName: 'userForm', args: { name: 123 } },
          },
        ],
      } as any),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unvalidated-component-target',
          path: '/body/1/onClick/action',
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
