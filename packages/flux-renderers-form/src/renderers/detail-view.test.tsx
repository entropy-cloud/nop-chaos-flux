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

  it('viewer updates after first confirm when using name as scopePath', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              name: 'testForm',
              data: { summary: { title: 'Original Title', author: 'Alice' } },
              body: [
                {
                  type: 'detail-view',
                  name: 'summary',
                  label: 'Summary',
                  triggerLabel: 'Edit',
                  surface: { mode: 'dialog', title: 'Edit Summary' },
                  viewer: [
                    { type: 'text', text: '${summary.title}', testid: 'viewer-title' }
                  ],
                  content: [
                    { type: 'input-text', name: 'title', label: 'Title' },
                    { type: 'input-text', name: 'author', label: 'Author' }
                  ]
                }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByTestId('viewer-title')).toBeTruthy());
    expect(screen.getByTestId('viewer-title').textContent).toBe('Original Title');

    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByLabelText('Title')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'First Edit' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(screen.queryByLabelText('Title')).toBeNull());
    await waitFor(() => expect(screen.getByTestId('viewer-title').textContent).toBe('First Edit'));
  });

  it('viewer updates after second confirm when using name as scopePath', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              name: 'testForm',
              data: { summary: { title: 'Original Title', author: 'Alice' } },
              body: [
                {
                  type: 'detail-view',
                  name: 'summary',
                  label: 'Summary',
                  triggerLabel: 'Edit',
                  surface: { mode: 'dialog', title: 'Edit Summary' },
                  viewer: [
                    { type: 'text', text: '${summary.title}', testid: 'viewer-title' }
                  ],
                  content: [
                    { type: 'input-text', name: 'title', label: 'Title' },
                    { type: 'input-text', name: 'author', label: 'Author' }
                  ]
                }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByTestId('viewer-title')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByLabelText('Title')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'First Edit' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(screen.queryByLabelText('Title')).toBeNull());
    await waitFor(() => expect(screen.getByTestId('viewer-title').textContent).toBe('First Edit'));

    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByLabelText('Title')).toBeTruthy());
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('First Edit');
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Second Edit' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(screen.queryByLabelText('Title')).toBeNull());
    await waitFor(() => expect(screen.getByTestId('viewer-title').textContent).toBe('Second Edit'));
  });

  it('second edit dialog is pre-populated with values from first confirm', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              name: 'testForm',
              data: { summary: { title: 'Original Title', author: 'Alice' } },
              body: [
                {
                  type: 'detail-view',
                  name: 'summary',
                  label: 'Summary',
                  triggerLabel: 'Edit',
                  surface: { mode: 'dialog', title: 'Edit Summary' },
                  content: [
                    { type: 'input-text', name: 'title', label: 'Title' },
                    { type: 'input-text', name: 'author', label: 'Author' }
                  ]
                }
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
    await waitFor(() => expect(screen.getByLabelText('Title')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'First Edit' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(screen.queryByLabelText('Title')).toBeNull());

    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByLabelText('Title')).toBeTruthy());

    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('First Edit');
    expect((screen.getByLabelText('Author') as HTMLInputElement).value).toBe('Alice');
  });

  it('applyCommitResult handles updates dict shape', async () => {
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
              data: { updates: { theme: 'dark' } },
              triggerLabel: 'Edit Settings',
              surface: { mode: 'dialog', title: 'Edit Settings' },
              content: [
                {
                  type: 'object-field',
                  name: 'updates',
                  label: 'Updates',
                  body: [
                    { type: 'input-text', name: 'theme', label: 'Theme' }
                  ]
                }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Edit Settings')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Settings'));
    await waitFor(() => expect(screen.getByLabelText('Theme')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'solarized' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(screen.queryByLabelText('Theme')).toBeNull());
  });

  it('applyCommitResult handles patch array shape', async () => {
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
              data: { patch: [{ path: 'locale', value: 'en-US' }] },
              triggerLabel: 'Edit Settings',
              surface: { mode: 'dialog', title: 'Edit Settings' },
              content: [
                { type: 'input-text', name: 'locale', label: 'Locale' }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    await waitFor(() => expect(screen.getByText('Edit Settings')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Settings'));
    await waitFor(() => expect(screen.getByLabelText('Locale')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Locale'), { target: { value: 'fr-FR' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(screen.queryByLabelText('Locale')).toBeNull());
  });
});
