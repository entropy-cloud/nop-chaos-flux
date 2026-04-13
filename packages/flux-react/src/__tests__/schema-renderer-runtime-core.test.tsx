import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { createSchemaRenderer, NodeMetaContext, RenderNodes, RuntimeContext, ScopeContext } from '../index';
import {
  cidProbeRenderer,
  createExpressionCompiler,
  createFormulaCompiler,
  createRendererRegistry,
  createRendererRuntime,
  env,
  formRenderer,
  nodeIdentityProbeRenderer,
  probeFormSchema,
  probeInputRenderer,
  scopedHostRenderer,
  selectorRenderer,
  sharedFormulaCompiler,
  textRenderer,
  wrapProbeRenderer,
} from '../test-support';

describe('createSchemaRenderer runtime core behavior', () => {
  it('compiles runtime boundary flags for form, scope, provider, and class alias changes', () => {
    const runtime = createRendererRuntime({ registry: createRendererRegistry([formRenderer, scopedHostRenderer, textRenderer]), env, expressionCompiler: createExpressionCompiler(sharedFormulaCompiler) });
    const compiled = runtime.compile({ type: 'form', classAliases: { local: 'stack-2' }, 'xui:imports': [{ from: 'demo-lib', as: 'demo' }], body: [{ type: 'scoped-host', body: [{ type: 'text', text: 'child' }] }] } as any);
    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;
    expect(root.scopePlan.kind).toBe('form');
    const scopedHost = Array.isArray(root.regions.body.node) ? root.regions.body.node[0] : root.regions.body.node;
    expect(scopedHost!.component.actionScopePolicy).toBe('new');
  });

  it('renders compiled schema in React', () => {
    const SchemaRenderer = createSchemaRenderer([textRenderer]);
    render(<SchemaRenderer schema={{ type: 'text', text: 'Hello renderer' }} env={env} formulaCompiler={createFormulaCompiler()} />);
    expect(screen.getByText('Hello renderer')).toBeTruthy();
  });

  it('renders precompiled nodes passed through helpers.render', () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({ registry, env, expressionCompiler: createExpressionCompiler(createFormulaCompiler()) });
    const compiledNode = runtime.compile({ type: 'text', text: 'Compiled hello' });
    const hostRenderer = { type: 'host', component: (props: any) => <section>{props.helpers.render(compiledNode as any)}</section> };
    const SchemaRenderer = createSchemaRenderer([hostRenderer, textRenderer]);
    render(<SchemaRenderer schema={{ type: 'host' }} env={env} formulaCompiler={createFormulaCompiler()} />);
    expect(screen.getByText('Compiled hello')).toBeTruthy();
  });

  it('derives inline fragment paths from the current node instance when no compiled owner context exists', () => {
    const pathProbeRenderer = { type: 'path-probe', component: (props: any) => <span data-testid="path-probe">{props.path}</span> };
    const runtime = createRendererRuntime({ registry: createRendererRegistry([pathProbeRenderer]), env, expressionCompiler: createExpressionCompiler(createFormulaCompiler()) });
    const page = runtime.createPageRuntime({});
    const ownerNodeInstance = { cid: 1, instancePath: [{ repeatedTemplateId: 'rows', instanceKey: 'row-1' }], templateNode: { templateNodeId: 1, id: 'inline-owner', type: 'host', schema: { type: 'host' }, templatePath: 'host.root', rendererType: 'host', propsProgram: { kind: 'static', value: {} }, metaProgram: {}, eventPlans: {}, regions: {}, scopePlan: { kind: 'inherit' }, sourcePropKeys: [], sourceStatePropKeys: {} }, scope: page.scope, state: { metaState: {}, mounted: true } } as any;
    render(<RuntimeContext.Provider value={runtime}><ScopeContext.Provider value={page.scope}><NodeMetaContext.Provider value={{ id: ownerNodeInstance.templateNode.id, path: ownerNodeInstance.templateNode.templatePath, type: ownerNodeInstance.templateNode.rendererType, cid: ownerNodeInstance.cid, templateNode: ownerNodeInstance.templateNode, node: ownerNodeInstance }}><RenderNodes input={{ type: 'path-probe' }} options={{ pathSuffix: 'inline' }} /></NodeMetaContext.Provider></ScopeContext.Provider></RuntimeContext.Provider>);
    expect(screen.getByTestId('path-probe').textContent).toBe('host.root.inline');
  });

  it('exposes template nodes through renderer props and current-node meta hooks', () => {
    const SchemaRenderer = createSchemaRenderer([nodeIdentityProbeRenderer]);
    render(<SchemaRenderer schema={{ type: 'node-identity-probe', id: 'identity-node' }} env={env} formulaCompiler={createFormulaCompiler()} />);
    expect(screen.getByTestId('props-template-path').textContent).toBe('$');
  });

  it('supports useScopeSelector with parent scopes that do not expose a store', () => {
    const SchemaRenderer = createSchemaRenderer([selectorRenderer]);
    const { rerender } = render(<SchemaRenderer schema={{ type: 'selector-text' }} env={env} formulaCompiler={createFormulaCompiler()} parentScope={{ id: 'root', path: '$', get: (path: string) => (path === 'message' ? 'Scoped hello' : undefined), has: (path: string) => path === 'message', readOwn: () => ({ message: 'Scoped hello' }), value: { message: 'Scoped hello' }, read: () => ({ message: 'Scoped hello' }), update: () => undefined, merge: () => {} }} />);
    expect(screen.getByText('Scoped hello')).toBeTruthy();
    rerender(<SchemaRenderer schema={{ type: 'selector-text' }} env={env} formulaCompiler={createFormulaCompiler()} parentScope={{ id: 'root', path: '$', get: (path: string) => (path === 'message' ? 'Scoped update' : undefined), has: (path: string) => path === 'message', readOwn: () => ({ message: 'Scoped update' }), value: { message: 'Scoped update' }, read: () => ({ message: 'Scoped update' }), update: () => undefined, merge: () => {} }} />);
    expect(screen.getByText('Scoped update')).toBeTruthy();
  });

  it('preserves field state across unrelated host rerenders', () => {
    const SchemaRenderer = createSchemaRenderer([formRenderer, probeInputRenderer]);
    function Host() {
      const [tick, setTick] = React.useState(0);
      return <div><button type="button" onClick={() => setTick((current) => current + 1)}>Rerender host {tick}</button><SchemaRenderer schema={probeFormSchema} data={{ currentUser: { name: 'Architect' } }} env={env} formulaCompiler={sharedFormulaCompiler} /></div>;
    }
    const view = render(<Host />);
    const canvas = within(view.container);
    fireEvent.change(canvas.getByLabelText('Email'), { target: { value: 'a' } });
    fireEvent.click(canvas.getByText('Rerender host 0'));
    expect((canvas.getByLabelText('Email') as HTMLInputElement).value).toBe('a');
  });

  it('skips FieldFrame when frameWrap is false', () => {
    const SchemaRenderer = createSchemaRenderer([wrapProbeRenderer]);
    const { container } = render(<SchemaRenderer schema={{ type: 'wrap-probe', label: 'Standalone editor', frameWrap: false }} env={env} formulaCompiler={createFormulaCompiler()} />);
    expect(container.querySelector('label.nop-field')).toBeNull();
  });

  it('uses group layout when frameWrap is group', () => {
    const SchemaRenderer = createSchemaRenderer([wrapProbeRenderer]);
    const { container } = render(<SchemaRenderer schema={{ type: 'wrap-probe', label: 'Grouped editor', frameWrap: 'group' }} env={env} formulaCompiler={createFormulaCompiler()} />);
    expect(container.querySelector('fieldset.nop-field')).toBeTruthy();
  });

  it('does not fabricate a cid for createNodeInstance when none is provided', async () => {
    const { createNodeInstance } = await import('../node-instance');
    const templateNode = { templateNodeId: 99, id: 'probe', type: 'text', schema: { type: 'text' }, templatePath: '$', rendererType: 'text', component: {} as any, propsProgram: { kind: 'static', value: {} }, metaProgram: {}, eventPlans: {}, regions: {}, scopePlan: { kind: 'inherit' }, sourcePropKeys: [], sourceStatePropKeys: {} } as any;
    const nodeInstance = createNodeInstance({ templateNode, scope: { id: 'scope', path: '$', readOwn: () => ({}), read: () => ({}), get: () => undefined, has: () => false, update: () => undefined, merge: () => undefined } as any, state: { meta: {}, props: undefined }, cid: undefined, mounted: false });
    expect(nodeInstance.cid).toBeUndefined();
  });

  it('does not insert an extra wrapper for non-wrap nodes with cid', () => {
    const SchemaRenderer = createSchemaRenderer([cidProbeRenderer]);
    render(<SchemaRenderer schema={{ type: 'cid-probe', text: 'CID probe' }} env={env} formulaCompiler={createFormulaCompiler()} />);
    const root = screen.getByTestId('cid-root');
    const cid = root.getAttribute('data-cid');
    expect(document.querySelectorAll(`[data-cid="${cid}"]`)).toHaveLength(1);
  });
});
