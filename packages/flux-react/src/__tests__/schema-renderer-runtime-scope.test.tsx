import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { useScopeSelector } from '../hooks';
import { createSchemaRenderer } from '../schema-renderer';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createRendererRuntime } from '@nop-chaos/flux-runtime';
import {
  countingTextRenderer,
  env,
  formRenderer,
  ownScopeValueProbeRenderer,
  pageRenderer,
  pageValueProbeRenderer,
  pageWithProbeFormSchema,
  probeInputRenderer,
  scopeLayerProbeRenderer,
  sharedFormulaCompiler,
} from '../test-support-core';
import {
  fragmentRenderHostRenderer,
  fragmentScopeProbeHostRenderer,
  renderWithRuntimeProviders,
} from '../test-support-runtime';

function FormStatusProbeRenderer() {
  const formStatus = useScopeSelector((scope) => scope.$form, Object.is) as { id?: string; valid: boolean; invalid: boolean } | undefined;
  return <div data-testid="form-status-probe">{JSON.stringify(formStatus)}</div>;
}

const formStatusProbeRendererDefinition: RendererDefinition = {
  type: 'form-status-probe',
  component: FormStatusProbeRenderer,
};

describe('createSchemaRenderer scope behavior', () => {
  it('does not recompute unrelated NodeRenderer props and meta on unrelated path changes', async () => {
    const runtime = createRendererRuntime({ registry: createRendererRegistry([pageRenderer, countingTextRenderer]), env, expressionCompiler: createExpressionCompiler(sharedFormulaCompiler) });
    const page = runtime.createPageRuntime({ user: { name: 'Alice' }, title: 'Architect' });
    const originalResolveNodeMeta = runtime.resolveNodeMeta;
    const originalResolveNodeProps = runtime.resolveNodeProps;
    const metaCalls: string[] = [];
    const propCalls: string[] = [];
    runtime.resolveNodeMeta = ((node, scope, state) => { metaCalls.push(node.id); return originalResolveNodeMeta(node, scope, state); }) as typeof runtime.resolveNodeMeta;
    runtime.resolveNodeProps = ((node, scope, state) => { propCalls.push(node.id); return originalResolveNodeProps(node, scope, state); }) as typeof runtime.resolveNodeProps;
    renderWithRuntimeProviders({ runtime, page, schema: { type: 'page', body: [{ id: 'user-node', type: 'counting-text', text: 'User ${user.name}', visible: '${user.name !== ""}' }, { id: 'title-node', type: 'counting-text', text: 'Title ${title}', visible: '${title !== ""}' }] } });
    await waitFor(() => expect(screen.getByText('User Alice')).toBeTruthy());
    metaCalls.length = 0;
    propCalls.length = 0;
    page.scope.update('user.name', 'Bob');
    await waitFor(() => expect(screen.getByText('User Bob')).toBeTruthy());
    expect(propCalls.filter((id) => id.includes('title-node')).length).toBe(0);
    expect(metaCalls.filter((id) => id.includes('title-node')).length).toBe(0);
  });

  it('uses lexical scope data by default and isolates own-scope subscriptions when requested', async () => {
    const pageStore = createRendererRuntime({ registry: createRendererRegistry([]), env, expressionCompiler: createExpressionCompiler(sharedFormulaCompiler) }).createPageRuntime({ shared: 'parent-a' }).store;
    const SchemaRenderer = createSchemaRenderer([fragmentScopeProbeHostRenderer, scopeLayerProbeRenderer, ownScopeValueProbeRenderer]);
    render(<SchemaRenderer schemaUrl="test://schema.json" schema={{ type: 'fragment-scope-probe-host', body: [{ type: 'scope-layer-probe' }, { type: 'own-scope-value-probe' }] } as any} data={{ shared: 'parent-a' }} env={env} formulaCompiler={sharedFormulaCompiler} pageStore={pageStore} />);
    expect(screen.getByTestId('lexical-value').textContent).toBe('parent-a');
    pageStore.updateData('shared', 'parent-b');
    await waitFor(() => expect(screen.getByTestId('lexical-value').textContent).toBe('parent-b'));
    fireEvent.click(screen.getByText('Refresh fragment 0'));
    await waitFor(() => expect(screen.getByTestId('own-child-value').textContent).toBe('child-b'));
  });

  it('updates page scope data without recreating the form runtime', () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, formRenderer, probeInputRenderer, pageValueProbeRenderer]);
    function Host() {
      const [name, setName] = React.useState('Architect');
      return <div><button type="button" onClick={() => setName('Operator')}>Rename user</button><SchemaRenderer schemaUrl="test://schema.json" schema={pageWithProbeFormSchema} data={{ currentUser: { name } }} env={env} formulaCompiler={sharedFormulaCompiler} /></div>;
    }
    const view = render(<Host />);
    const canvas = within(view.container);
    fireEvent.change(canvas.getByLabelText('Email'), { target: { value: 'a' } });
    fireEvent.click(canvas.getByText('Rename user'));
    expect(canvas.getByTestId('page-value').textContent).toBe('Operator');
    expect((canvas.getByLabelText('Email') as HTMLInputElement).value).toBe('a');
  });

  it('preserves form state when fragment render data is recreated on host rerender', () => {
    const SchemaRenderer = createSchemaRenderer([fragmentRenderHostRenderer, formRenderer, probeInputRenderer]);
    const view = render(<SchemaRenderer schemaUrl="test://schema.json" schema={{ type: 'fragment-render-host' }} env={env} formulaCompiler={sharedFormulaCompiler} />);
    const canvas = within(view.container);
    fireEvent.change(canvas.getByLabelText('Email'), { target: { value: 'a' } });
    fireEvent.click(canvas.getByText('Refresh fragment 0'));
    expect((canvas.getByLabelText('Email') as HTMLInputElement).value).toBe('a');
  });

  it('publishes $form through useScopeSelector on the form scope', async () => {
    const SchemaRenderer = createSchemaRenderer([formRenderer, probeInputRenderer, pageRenderer, formStatusProbeRendererDefinition]);

    render(
      <SchemaRenderer schemaUrl="test://schema.json" schema={{
          type: 'form',
          id: 'profile-form',
          body: [
            { type: 'probe-input' },
            { type: 'form-status-probe' }
          ]
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('form-status-probe').textContent).toContain('"id":"profile-form"');
      expect(screen.getByTestId('form-status-probe').textContent).toContain('"valid":true');
    });
  });
});
