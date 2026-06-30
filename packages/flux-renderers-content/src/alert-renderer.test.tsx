import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import React from 'react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { contentRendererDefinitions } from './content-renderer-definitions.js';

const env: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: () => undefined,
};

const pageRenderer: RendererDefinition = {
  type: 'page',
  component: (props) => <section>{props.regions.body?.render() as React.ReactNode}</section>,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

const textRenderer: RendererDefinition = {
  type: 'text',
  component: (props) => <span>{String(props.props.text ?? '')}</span>,
};

const buttonRenderer: RendererDefinition = {
  type: 'button',
  component: (props) => (
    <button type="button" data-testid={props.meta.testid ?? undefined} onClick={() => void props.events.onClick?.()}>
      {String(props.props.label ?? 'Button')}
    </button>
  ),
  fields: [{ key: 'onClick', kind: 'event' }],
};

function createContentSchemaRenderer() {
  return createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer, ...contentRendererDefinitions]);
}

const formulaCompiler = createFormulaCompiler();

describe('AlertRenderer (W2a — content package inline feedback)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders title/body value-or-region and an actions region', () => {
    const SchemaRenderer = createContentSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://content/alert-basic"
        schema={{
          type: 'page',
          body: [
            {
              type: 'alert',
              testid: 'demo-alert',
              level: 'info',
              title: 'Heads up',
              body: 'This is the alert body.',
              actions: [{ type: 'button', testid: 'alert-action', label: 'Dismiss' }],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const alert = screen.getByTestId('demo-alert');
    expect(alert.getAttribute('data-slot')).toBe('alert');
    expect(alert.getAttribute('data-level')).toBe('info');
    expect(alert.querySelector('[data-slot="alert-title"]')?.textContent).toBe('Heads up');
    expect(alert.querySelector('[data-slot="alert-description"]')?.textContent).toBe(
      'This is the alert body.',
    );
    expect(alert.querySelector('[data-slot="alert-actions"]')).toBeTruthy();
    expect(screen.getByTestId('alert-action')).toBeTruthy();
  });

  it('maps level to visual variant via data-level attribute', () => {
    const SchemaRenderer = createContentSchemaRenderer();
    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://content/alert-level-success"
        schema={{
          type: 'page',
          body: [{ type: 'alert', testid: 'demo-alert', level: 'success', title: 'Done' }],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByTestId('demo-alert').getAttribute('data-level')).toBe('success');
    // C-13: success/warning levels route through theme tokens (not hardcoded
    // emerald/amber palette). DOM className assertion of the token utility.
    expect(screen.getByTestId('demo-alert').className).toContain('bg-success-bg');
    expect(screen.getByTestId('demo-alert').className).not.toMatch(/emerald/);

    rerender(
      <SchemaRenderer
        schemaUrl="test://content/alert-level-warning"
        schema={{
          type: 'page',
          body: [{ type: 'alert', testid: 'demo-alert', level: 'warning', title: 'Careful' }],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(screen.getByTestId('demo-alert').getAttribute('data-level')).toBe('warning');
    expect(screen.getByTestId('demo-alert').className).toContain('bg-warning-bg');
    expect(screen.getByTestId('demo-alert').className).not.toMatch(/amber/);
  });

  it('hides and dispatches onClose when the close button is clicked (closable=true)', () => {
    const SchemaRenderer = createContentSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://content/alert-close"
        schema={{
          type: 'page',
          body: [
            {
              type: 'alert',
              testid: 'demo-alert',
              level: 'warning',
              title: 'Closable',
              closable: true,
              onClose: {
                action: 'setValue',
                args: { path: 'closedReported', value: true },
              },
            },
            {
              type: 'text',
              text: 'closed:${closedReported ? "yes" : "no"}',
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('closed:no')).toBeTruthy();
    const closeBtn = screen.getByTestId('alert-close');
    fireEvent.click(closeBtn);

    expect(screen.queryByTestId('demo-alert')).toBeNull();
    expect(screen.getByText('closed:yes')).toBeTruthy();
  });

  it('does not render a close button when closable is false (default)', () => {
    const SchemaRenderer = createContentSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://content/alert-no-close"
        schema={{
          type: 'page',
          body: [{ type: 'alert', testid: 'demo-alert', title: 'Persistent' }],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.queryByTestId('alert-close')).toBeNull();
    expect(screen.getByTestId('demo-alert')).toBeTruthy();
  });

  it('falls back to info level when level is omitted or invalid', () => {
    const SchemaRenderer = createContentSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://content/alert-default-level"
        schema={{
          type: 'page',
          body: [{ type: 'alert', testid: 'demo-alert', title: 'Default' }],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByTestId('demo-alert').getAttribute('data-level')).toBe('info');
  });
});
