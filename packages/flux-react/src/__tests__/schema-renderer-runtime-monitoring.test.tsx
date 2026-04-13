import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '../index';
import { compositeProbeRenderer, createFormulaCompiler, env, formRenderer, pageRenderer, textRenderer, toggleHostRenderer } from '../test-support';

describe('createSchemaRenderer lifecycle and monitoring behavior', () => {
  it('dispatches lifecycle actions on mount and unmount', async () => {
    const onActionStart = vi.fn();
    const SchemaRenderer = createSchemaRenderer([pageRenderer, toggleHostRenderer, textRenderer]);
    render(<SchemaRenderer schema={{ type: 'page', body: [{ type: 'toggle-host', body: [{ type: 'text', text: 'Lifecycle child', onMount: { action: 'probe:lifecycle', args: { stage: 'mounted' } }, onUnmount: { action: 'probe:lifecycle', args: { stage: 'unmounted' } } }] }] } as any} env={{ ...env, monitor: { onActionStart } }} formulaCompiler={createFormulaCompiler()} />);
    await waitFor(() => expect(onActionStart).toHaveBeenCalled());
    fireEvent.click(screen.getByText('Hide child boundary'));
    await waitFor(() => expect(onActionStart.mock.calls.length).toBeGreaterThan(1));
  });

  it('supports wrapComponent plugins in the renderer pipeline', () => {
    const wrapped = vi.fn();
    const plugin = { name: 'wrap-text', wrapComponent(definition: any) { if (definition.type !== 'text') return definition; return { ...definition, component: (props: any) => { wrapped(props.props.label ?? props.props.text); return <div><span data-testid="wrapped-prefix">Wrapped</span><definition.component {...props} /></div>; } }; } };
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer]);
    render(<SchemaRenderer schema={{ type: 'page', body: [{ type: 'text', text: 'Wrapped hello' }] }} env={env} formulaCompiler={createFormulaCompiler()} plugins={[plugin]} />);
    expect(screen.getByTestId('wrapped-prefix')).toBeTruthy();
    expect(wrapped).toHaveBeenCalledWith('Wrapped hello');
  });

  it('emits render monitor callbacks for rendered nodes', async () => {
    const onRenderStart = vi.fn();
    const onRenderEnd = vi.fn();
    const SchemaRenderer = createSchemaRenderer([textRenderer]);
    const monitoredEnv = { ...env, monitor: { onRenderStart, onRenderEnd } };
    const view = render(<SchemaRenderer schema={{ type: 'text', text: 'Monitored render' }} env={monitoredEnv} formulaCompiler={createFormulaCompiler()} />);
    await waitFor(() => expect(onRenderStart).toHaveBeenCalled());
    view.unmount();
    await waitFor(() => expect(onRenderEnd).toHaveBeenCalled());
  });

  it('projects form errors by owner path and source kind', async () => {
    const SchemaRenderer = createSchemaRenderer([formRenderer, compositeProbeRenderer]);
    render(<SchemaRenderer schema={{ type: 'form', body: [{ type: 'composite-probe' }] }} env={env} formulaCompiler={createFormulaCompiler()} />);
    fireEvent.click(screen.getByText('Validate root'));
    fireEvent.click(screen.getByText('Validate child'));
    await waitFor(() => expect(screen.getByTestId('owned-count').textContent).toBe('2'));
  });
});
