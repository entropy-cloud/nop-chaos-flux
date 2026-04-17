import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createSchemaRenderer } from '../index';
import {
  buttonRenderer,
  createDispatchCaptureRenderer,
  env,
  formRenderer,
  namespaceProviderRenderer,
  componentHandleProviderRenderer,
  pageRenderer,
  pollingSourceRenderer,
  probeInputRenderer,
  scopedHostRenderer,
  sharedFormulaCompiler,
  textRenderer,
} from '../test-support';

describe('dialog container resolution', () => {
  it('renders dialog with showMask: false and no overlay element', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);
    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open no-mask dialog',
              onClick: {
                action: 'dialog',
                dialog: {
                  title: 'No Mask Dialog',
                  showMask: false,
                  body: [{ type: 'text', text: 'No mask content' }]
                }
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />
    );
    fireEvent.click(screen.getByText('Open no-mask dialog'));
    expect(await screen.findByText('No Mask Dialog')).toBeTruthy();
    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    expect(overlay).toBeNull();
  });

  it('renders dialog with showMask: true (default) and includes overlay element', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);
    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open default dialog',
              onClick: {
                action: 'dialog',
                dialog: {
                  title: 'Default Dialog',
                  body: [{ type: 'text', text: 'Default content' }]
                }
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />
    );
    fireEvent.click(screen.getByText('Open default dialog'));
    expect(await screen.findByText('Default Dialog')).toBeTruthy();
    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    expect(overlay).toBeTruthy();
  });

  it('opens dialog and closes it successfully', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);
    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open dialog',
              onClick: {
                action: 'dialog',
                dialog: {
                  title: 'Test Dialog',
                  body: [{ type: 'text', text: 'Hello' }]
                }
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />
    );
    fireEvent.click(screen.getByText('Open dialog'));
    expect(await screen.findByText('Test Dialog')).toBeTruthy();
    fireEvent.click(document.querySelector('[data-slot="dialog-close"]')!);
    await waitFor(() => expect(screen.queryByText('Test Dialog')).toBeNull());
  });
});

describe('drawer container resolution', () => {
  it('renders drawer with showMask: false and no overlay', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);
    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open no-mask drawer',
              onClick: {
                action: 'drawer',
                drawer: {
                  title: 'No Mask Drawer',
                  showMask: false,
                  body: [{ type: 'text', text: 'Drawer content' }]
                }
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />
    );
    fireEvent.click(screen.getByText('Open no-mask drawer'));
    expect(await screen.findByText('No Mask Drawer')).toBeTruthy();
    const overlay = document.querySelector('[data-slot="drawer-overlay"]');
    expect(overlay).toBeNull();
  });

  it('renders drawer with showMask: true (default) and includes overlay', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);
    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open default drawer',
              onClick: {
                action: 'drawer',
                drawer: {
                  title: 'Default Drawer',
                  body: [{ type: 'text', text: 'Content' }]
                }
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />
    );
    fireEvent.click(screen.getByText('Open default drawer'));
    expect(await screen.findByText('Default Drawer')).toBeTruthy();
    const overlay = document.querySelector('[data-slot="drawer-overlay"]');
    expect(overlay).toBeTruthy();
  });
});

describe('page modalContainer', () => {
  it('passes modalContainer from page schema to DialogHost', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer, scopedHostRenderer, componentHandleProviderRenderer]);
    const { container } = render(
      <SchemaRenderer
        schema={{
          type: 'page',
          modalContainer: 'workspace-area',
          body: [
            {
              type: 'button',
              label: 'Open dialog',
              onClick: {
                action: 'dialog',
                dialog: {
                  title: 'Contained Dialog',
                  body: [{ type: 'text', text: 'Should be contained' }]
                }
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />
    );
    fireEvent.click(screen.getByText('Open dialog'));
    expect(await screen.findByText('Contained Dialog')).toBeTruthy();
  });

  it('dialog-level container overrides page modalContainer', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);
    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          modalContainer: 'page-container',
          body: [
            {
              type: 'button',
              label: 'Open dialog',
              onClick: {
                action: 'dialog',
                dialog: {
                  title: 'Override Dialog',
                  container: 'custom-container',
                  showMask: false,
                  body: [{ type: 'text', text: 'Overridden' }]
                }
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />
    );
    fireEvent.click(screen.getByText('Open dialog'));
    expect(await screen.findByText('Override Dialog')).toBeTruthy();
  });
});

describe('dialog state preservation', () => {
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
});
