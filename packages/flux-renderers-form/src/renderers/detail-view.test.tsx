import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index';

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}

if (typeof PointerEvent === 'undefined') {
  class PointerEvent extends MouseEvent {
    constructor(type: string, props: MouseEventInit & { pointerId?: number; pressure?: number } = {}) {
      super(type, props);
    }
  }
  globalThis.PointerEvent = PointerEvent as any;
}

const env: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: () => undefined
};

const formulaCompiler = createFormulaCompiler();

describe('detail-view renderer', () => {
  it('renders the trigger button when not readOnly', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'detail-view',
              scopePath: 'settings',
              triggerLabel: 'Edit Settings',
              surface: { mode: 'dialog', title: 'Edit Settings' },
              content: [
                { type: 'input-text', name: 'theme', label: 'Theme' }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Edit Settings')).toBeTruthy();
    });
  });

  it('does not render trigger button when readOnly', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'detail-view',
              readOnly: true,
              triggerLabel: 'Edit Settings',
              content: [{ type: 'input-text', name: 'theme', label: 'Theme' }]
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.queryByText('Edit Settings')).toBeNull());
  });

  it('opens dialog with static data pre-populated', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'detail-view',
              data: { theme: 'dark', locale: 'en-US' },
              triggerLabel: 'Edit Config',
              surface: { mode: 'dialog', title: 'Edit Config' },
              content: [
                { type: 'input-text', name: 'theme', label: 'Theme' },
                { type: 'input-text', name: 'locale', label: 'Locale' }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Edit Config')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Config'));

    await waitFor(() => expect(screen.getByLabelText('Theme')).toBeTruthy());

    expect((screen.getByLabelText('Theme') as HTMLInputElement).value).toBe('dark');
    expect((screen.getByLabelText('Locale') as HTMLInputElement).value).toBe('en-US');
  });

  it('cancel closes dialog without applying changes', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'detail-view',
              data: { theme: 'dark' },
              triggerLabel: 'Edit Config',
              surface: { mode: 'dialog', title: 'Edit Config' },
              content: [
                { type: 'input-text', name: 'theme', label: 'Theme' }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Edit Config')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Config'));
    await waitFor(() => expect(screen.getByLabelText('Theme')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'light' } });
    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => expect(screen.queryByLabelText('Theme')).toBeNull());

    fireEvent.click(screen.getByText('Edit Config'));
    await waitFor(() => expect(screen.getByLabelText('Theme')).toBeTruthy());

    expect((screen.getByLabelText('Theme') as HTMLInputElement).value).toBe('dark');
  });

  it('blocks confirm when draft has validation errors', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'detail-view',
              data: { name: '' },
              triggerLabel: 'Edit',
              surface: { mode: 'dialog', title: 'Edit' },
              content: [
                { type: 'input-text', name: 'name', label: 'Name', required: true }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Edit')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByLabelText('Name', { exact: false })).toBeTruthy());

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(screen.getByText('Please fix validation errors before confirming.')).toBeTruthy();
    });

    expect(screen.getByLabelText('Name', { exact: false })).toBeTruthy();
  });

  it('confirm with data projection applies changes via confirm flow', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'detail-view',
              data: { theme: 'dark', locale: 'en-US' },
              triggerLabel: 'Edit Config',
              surface: { mode: 'dialog', title: 'Edit Config' },
              content: [
                { type: 'input-text', name: 'theme', label: 'Theme' },
                { type: 'input-text', name: 'locale', label: 'Locale' }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Edit Config')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Config'));
    await waitFor(() => expect(screen.getByLabelText('Theme')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'light' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(screen.queryByLabelText('Theme')).toBeNull());

    fireEvent.click(screen.getByText('Edit Config'));
    await waitFor(() => expect(screen.getByLabelText('Theme')).toBeTruthy());
  });
});
