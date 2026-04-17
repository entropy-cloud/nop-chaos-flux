import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createSchemaRenderer } from '../index';
import {
  buttonRenderer,
  componentHandleProviderRenderer,
  createDispatchCaptureRenderer,
  env,
  formRenderer,
  namespaceProviderRenderer,
  pageRenderer,
  pollingSourceRenderer,
  probeFormSchema,
  probeInputRenderer,
  scopedHostRenderer,
  sharedFormulaCompiler,
  textRenderer,
} from '../test-support';

describe('createSchemaRenderer dialog and provider behavior', () => {
  it('reopens dialog with fresh child providers and falls back after close', async () => {
    const capturedDispatches: Array<(input: any) => Promise<any>> = [];
    const dispatchCaptureRenderer = createDispatchCaptureRenderer((dispatch) => capturedDispatches.push(dispatch));
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer, scopedHostRenderer, namespaceProviderRenderer, componentHandleProviderRenderer, dispatchCaptureRenderer]);
    render(<SchemaRenderer schema={{ type: 'page', body: [{ type: 'namespace-provider', namespace: 'demo', label: 'outer-ns' }, { type: 'component-handle-provider', componentName: 'shared', label: 'outer-handle' }, { type: 'button', label: 'Open provider dialog', onClick: { action: 'dialog', dialog: { title: 'Provider dialog', body: [{ type: 'scoped-host', body: [{ type: 'namespace-provider', namespace: 'demo', label: 'dialog-ns' }, { type: 'component-handle-provider', componentName: 'shared', label: 'dialog-handle' }, { type: 'dispatch-capture' }, { type: 'text', text: 'Dialog provider content' }] }] } } }] }} env={env} formulaCompiler={sharedFormulaCompiler} />);
    fireEvent.click(screen.getByText('Open provider dialog'));
    expect(await screen.findByText('Dialog provider content')).toBeTruthy();
    await waitFor(() => expect(capturedDispatches.length).toBe(1));
    fireEvent.click(document.querySelector('[data-slot="dialog-close"]')!);
    await waitFor(() => expect(screen.queryByText('Dialog provider content')).toBeNull());
  });

  it('renders dialog content after dispatching a dialog action', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);
    render(<SchemaRenderer schema={{ type: 'page', body: [{ type: 'button', label: 'Open dialog', onClick: { action: 'dialog', dialog: { title: 'Inspect record', body: [{ type: 'text', text: 'Dialog hello' }] } } }] }} env={env} formulaCompiler={sharedFormulaCompiler} />);
    fireEvent.click(screen.getByText('Open dialog'));
    expect(await screen.findByText('Inspect record')).toBeTruthy();
  });

  it('preserves dialog form state across host rerenders and page data updates', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer, formRenderer, probeInputRenderer]);
    function Host() {
      const [tick, setTick] = React.useState(0);
      const [name, setName] = React.useState('Architect');
      return <div><button type="button" onClick={() => setTick((current) => current + 1)}>Rerender host {tick}</button><button type="button" onClick={() => setName('Operator')}>Rename user</button><SchemaRenderer schema={{ type: 'page', body: [{ type: 'button', label: 'Open dialog', onClick: { action: 'dialog', dialog: { title: { type: 'text', text: 'Dialog ${currentUser.name}' }, body: [{ type: 'text', text: 'Dialog user ${currentUser.name}' }, probeFormSchema] } } }] }} data={{ currentUser: { name } }} env={env} formulaCompiler={sharedFormulaCompiler} /></div>;
    }
    const view = render(<Host />);
    const canvas = within(view.container);
    fireEvent.click(canvas.getByText('Open dialog'));
    await screen.findByText('Dialog Architect');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alice@example.com' } });
    fireEvent.click(canvas.getByText('Rerender host 0'));
    fireEvent.click(canvas.getByText('Rename user'));
    expect(await screen.findByText('Dialog Architect')).toBeTruthy();
    expect(screen.getByText('Dialog user Architect')).toBeTruthy();
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('alice@example.com');
  });

  it('stops dialog-scoped polling data sources after closing the dialog', async () => {
    const fetcherSpy = vi.fn(async () => ({ ok: true, status: 200, data: { value: 'polled' } }));
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer, pollingSourceRenderer]);
    render(<SchemaRenderer schema={{ type: 'page', body: [{ type: 'button', label: 'Open polling dialog', onClick: { action: 'dialog', dialog: { title: 'Polling dialog', body: [{ type: 'polling-source', id: 'dialog-poller', api: { url: '/api/dialog-poll' }, dataPath: 'payload', interval: 50 }, { type: 'text', text: '${payload?.value}' }] } } }] }} env={{ ...env, fetcher: fetcherSpy as any }} formulaCompiler={sharedFormulaCompiler} />);
    fireEvent.click(screen.getByText('Open polling dialog'));
    await waitFor(() => expect(fetcherSpy).toHaveBeenCalledTimes(1));
    fireEvent.click(document.querySelector('[data-slot="dialog-close"]')!);
    await waitFor(() => expect(screen.queryByText('Polling dialog')).toBeNull());
  });
});
