import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createActionScope } from '@nop-chaos/flux-runtime';
import * as fluxCore from '@nop-chaos/flux-core';
import { NodeMetaContext, RuntimeContext, ScopeContext } from '../contexts.js';
import { createSchemaRenderer } from '../schema-renderer.js';
import { RenderNodes } from '../helpers.js';
import { NodeRenderer } from '../node-renderer.js';
import {
  createExpressionCompiler,
  createFormulaCompiler,
  createRendererRegistry,
  createRendererRuntime,
  env,
  formRenderer,
  scopedHostRenderer,
  sharedFormulaCompiler,
  textRenderer,
} from '../test-support.js';

describe('createSchemaRenderer compilation and boundary flags', () => {
  it('compiles runtime boundary flags for form, scope, provider, and class alias changes', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([formRenderer, scopedHostRenderer, textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(sharedFormulaCompiler),
    });
    const compiled = runtime.compile({
      type: 'form',
      classAliases: { local: 'stack-2' },
      'xui:imports': [{ from: 'demo-lib', as: 'demo' }],
      body: [{ type: 'scoped-host', body: [{ type: 'text', text: 'child' }] }],
    } as any);
    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;
    expect(root.scopePlan.kind).toBe('form');
    const scopedHost = Array.isArray(root.regions.body.node)
      ? root.regions.body.node[0]
      : root.regions.body.node;
    expect(scopedHost!.component.actionScopePolicy).toBe('new');
    expect(root.providerPlan?.actionScope).toBe(false);
  });

  it('renders compiled schema in React', () => {
    const SchemaRenderer = createSchemaRenderer([textRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'text', text: 'Hello renderer' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    expect(screen.getByText('Hello renderer')).toBeTruthy();
  });

  it('keeps the no-import path off the import boundary setup fast path', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});
    const compiled = runtime.compile({ type: 'text', text: 'No imports' });
    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;
    const installPreparedSpy = vi.spyOn(runtime.importStack, 'installPrepared');
    const currentBindingsSpy = vi.spyOn(runtime.importStack, 'currentBindings');
    const createChildScopeSpy = vi.spyOn(runtime, 'createChildScope');

    render(
      <RuntimeContext.Provider value={runtime}>
        <ScopeContext.Provider value={page.scope}>
          <NodeRenderer node={root} scope={page.scope} />
        </ScopeContext.Provider>
      </RuntimeContext.Provider>,
    );

    expect(screen.getByText('No imports')).toBeTruthy();
    expect(installPreparedSpy).not.toHaveBeenCalled();
    expect(currentBindingsSpy).not.toHaveBeenCalled();
    expect(createChildScopeSpy).not.toHaveBeenCalled();
  });

  it('does not install prepared imports when render aborts before commit', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        importLoader: {
          load: vi.fn(async () => ({
            createNamespace: () => ({
              kind: 'import' as const,
              invoke: async () => ({ ok: true }),
            }),
            createExpressionHelpers: () => ({
              formatName(first: string, last: string) {
                return `${first} ${last}`;
              },
            }),
          })),
        },
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});
    const compiled = runtime.compile({
      type: 'text',
      'xui:imports': [{ from: 'demo-lib', as: 'demo' }],
      text: 'Imported ${$demo.formatName(user.firstName, user.lastName)}',
    } as any);
    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;
    const installPreparedSpy = vi.spyOn(runtime.importStack, 'installPrepared');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    function CrashOnRender(): React.ReactNode {
      throw new Error('abort render');
    }

    expect(() =>
      render(
        <RuntimeContext.Provider value={runtime}>
          <ScopeContext.Provider value={page.scope}>
            <>
              <NodeRenderer node={root} scope={page.scope} />
              <CrashOnRender />
            </>
          </ScopeContext.Provider>
        </RuntimeContext.Provider>,
      ),
    ).toThrow('abort render');

    expect(installPreparedSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('keeps the no-class-alias path off alias merge and resolution work', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});
    const compiled = runtime.compile({ type: 'text', text: 'No aliases' });
    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;
    const mergeClassAliasesSpy = vi.spyOn(fluxCore, 'mergeClassAliases');
    const resolveClassAliasesSpy = vi.spyOn(fluxCore, 'resolveClassAliases');

    render(
      <RuntimeContext.Provider value={runtime}>
        <ScopeContext.Provider value={page.scope}>
          <NodeRenderer node={root} scope={page.scope} />
        </ScopeContext.Provider>
      </RuntimeContext.Provider>,
    );

    expect(screen.getByText('No aliases')).toBeTruthy();
    expect(mergeClassAliasesSpy).not.toHaveBeenCalled();
    expect(resolveClassAliasesSpy).not.toHaveBeenCalled();
  });

  it('releases root-level imported namespaces when the schema changes', async () => {
    const dispose = vi.fn();
    const SchemaRenderer = createSchemaRenderer([textRenderer]);
    const actionScope = createActionScope({ id: 'root-import-scope' });
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          dispose,
          invoke: async () => ({ ok: true }),
        }),
      })),
    };

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={
          { type: 'text', text: 'A', 'xui:imports': [{ from: 'demo-lib', as: 'demo' }] } as any
        }
        env={{ ...env, importLoader }}
        formulaCompiler={createFormulaCompiler()}
        actionScope={actionScope}
      />,
    );

    await waitFor(() => {
      expect(importLoader.load).toHaveBeenCalledTimes(1);
    });

    rerender(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'text', text: 'B' } as any}
        env={{ ...env, importLoader }}
        formulaCompiler={createFormulaCompiler()}
        actionScope={actionScope}
      />,
    );

    await waitFor(() => {
      expect(dispose).toHaveBeenCalledTimes(1);
    });
  });

  it('compiles the root schema before passing it to RenderNodes', async () => {
    const capturedInputs: unknown[] = [];

    vi.resetModules();
    const actualHelpers = await vi.importActual<typeof import('../helpers.js')>('../helpers');
    vi.doMock('../helpers', () => ({
      ...actualHelpers,
      RenderNodes(props: Parameters<typeof actualHelpers.RenderNodes>[0]) {
        capturedInputs.push(props.input);
        return actualHelpers.RenderNodes(props);
      },
    }));

    try {
      const { createSchemaRenderer: createSchemaRendererWithMock } =
        await import('../schema-renderer.js');
      const SchemaRenderer = createSchemaRendererWithMock([textRenderer]);

      render(
        <SchemaRenderer
          schemaUrl="test://schema.json"
          schema={{ type: 'text', text: 'Compiled at boundary' }}
          env={env}
          formulaCompiler={createFormulaCompiler()}
        />,
      );

      expect(screen.getByText('Compiled at boundary')).toBeTruthy();
      expect(capturedInputs).toHaveLength(1);
      expect(capturedInputs[0]).toMatchObject({
        root: expect.objectContaining({
          type: 'text',
          rendererType: 'text',
          schema: { type: 'text', text: 'Compiled at boundary' },
        }),
      });
    } finally {
      vi.doUnmock('../helpers');
      vi.resetModules();
    }
  });

  it('renders precompiled nodes passed through helpers.render', () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const compiledNode = runtime.compile({ type: 'text', text: 'Compiled hello' });
    const hostRenderer = {
      type: 'host',
      component: (props: any) => <section>{props.helpers.render(compiledNode as any)}</section>,
    };
    const SchemaRenderer = createSchemaRenderer([hostRenderer, textRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'host' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    expect(screen.getByText('Compiled hello')).toBeTruthy();
  });

  it('derives inline fragment paths from the current node instance when no compiled owner context exists', () => {
    const pathProbeRenderer = {
      type: 'path-probe',
      component: (props: any) => <span data-testid="path-probe">{props.path}</span>,
    };
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([pathProbeRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});
    const ownerNodeInstance = {
      cid: 1,
      instancePath: [{ repeatedTemplateId: 'rows', instanceKey: 'row-1' }],
      templateNode: {
        templateNodeId: 1,
        id: 'inline-owner',
        type: 'host',
        schema: { type: 'host' },
        templatePath: 'host.root',
        rendererType: 'host',
        propsProgram: { kind: 'static', value: {} },
        metaProgram: {},
        eventPlans: {},
        regions: {},
        scopePlan: { kind: 'inherit' },
        sourcePropKeys: [],
        sourceStatePropKeys: {},
      },
      scope: page.scope,
      state: { metaState: {}, mounted: true },
    } as any;
    render(
      <RuntimeContext.Provider value={runtime}>
        <ScopeContext.Provider value={page.scope}>
          <NodeMetaContext.Provider
            value={{
              id: ownerNodeInstance.templateNode.id,
              path: ownerNodeInstance.templateNode.templatePath,
              type: ownerNodeInstance.templateNode.rendererType,
              cid: ownerNodeInstance.cid,
              templateNode: ownerNodeInstance.templateNode,
              node: ownerNodeInstance,
            }}
          >
            <RenderNodes input={{ type: 'path-probe' }} options={{ pathSuffix: 'inline' }} />
          </NodeMetaContext.Provider>
        </ScopeContext.Provider>
      </RuntimeContext.Provider>,
    );
    expect(screen.getByTestId('path-probe').textContent).toBe('host.root.inline');
  });
});
