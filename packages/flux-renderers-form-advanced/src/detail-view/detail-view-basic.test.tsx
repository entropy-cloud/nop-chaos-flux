import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { baseEnv, createPageSchemaRenderer, formulaCompiler } from '../test-support.js';

describe('detail-view renderer basic behavior', () => {
  it('renders the trigger button when not readOnly', async () => {
    cleanup();
    const SchemaRenderer = createPageSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-basic.test.tsx#1"
        schema={{
          type: 'page',
          body: [
            {
              type: 'detail-view',
              className: 'border',
              scopePath: 'settings',
              triggerLabel: 'Edit Settings',
              surface: { mode: 'dialog', title: 'Edit Settings' },
              content: [{ type: 'input-text', name: 'theme', label: 'Theme' }],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Edit Settings')).toBeTruthy();
    });

    const root = screen.getByText('Edit Settings').closest('.nop-detail-view');
    expect(root).toBeTruthy();
    expect(root?.className).toContain('border');
    expect(root?.querySelector('[data-slot="field-label"]')).toBeNull();
    expect(root?.querySelector('[data-slot="detail-view-viewer"]')).toBeTruthy();
    expect(root?.querySelector('[data-slot="detail-view-draft-body"]')).toBeNull();
  });

  it('allows opening in readOnly mode without confirm action', async () => {
    cleanup();
    const SchemaRenderer = createPageSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-basic.test.tsx#2"
        schema={{
          type: 'page',
          body: [
            {
              type: 'detail-view',
              readOnly: true,
              triggerLabel: 'Edit Settings',
              data: { theme: 'dark' },
              surface: { mode: 'dialog', title: 'Settings' },
              content: [{ type: 'input-text', name: 'theme', label: 'Theme' }],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Edit Settings')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Settings'));

    await waitFor(() => expect(screen.getByLabelText('Theme')).toBeTruthy());

    expect(screen.queryByText('Confirm')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Close' }).length).toBeGreaterThanOrEqual(1);
  });

  it('opens dialog with static data pre-populated', async () => {
    cleanup();
    const SchemaRenderer = createPageSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-basic.test.tsx#3"
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
                { type: 'input-text', name: 'locale', label: 'Locale' },
              ],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Edit Config')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Config'));

    await waitFor(() => expect(screen.getByLabelText('Theme')).toBeTruthy());

    expect((screen.getByLabelText('Theme') as HTMLInputElement).value).toBe('dark');
    expect((screen.getByLabelText('Locale') as HTMLInputElement).value).toBe('en-US');
    expect(document.querySelector('[data-slot="detail-view-draft-body"]')).toBeTruthy();
  });

  it('cancel closes dialog without applying changes', async () => {
    cleanup();
    const SchemaRenderer = createPageSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-basic.test.tsx#4"
        schema={{
          type: 'page',
          body: [
            {
              type: 'detail-view',
              data: { theme: 'dark' },
              triggerLabel: 'Edit Config',
              surface: { mode: 'dialog', title: 'Edit Config' },
              content: [{ type: 'input-text', name: 'theme', label: 'Theme' }],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
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
    const SchemaRenderer = createPageSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-basic.test.tsx#5"
        schema={{
          type: 'page',
          body: [
            {
              type: 'detail-view',
              data: { name: '' },
              triggerLabel: 'Edit',
              surface: { mode: 'dialog', title: 'Edit' },
              content: [{ type: 'input-text', name: 'name', label: 'Name', required: true }],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Edit')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByLabelText('Name', { exact: false })).toBeTruthy());

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(screen.getByText('Please fix validation errors before confirming.')).toBeTruthy();
    });

    expect(screen.getByLabelText('Name', { exact: false })).toBeTruthy();
    expect(document.querySelector('[data-slot="detail-view-draft-error"]')?.textContent).toContain(
      'Please fix validation errors before confirming.',
    );
    expect(document.querySelector('[data-slot="detail-view-draft-error"]')?.getAttribute('role')).toBe(
      'status',
    );
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeTruthy();
  });

  it('uses a descriptive default trigger aria label when triggerLabel is omitted', async () => {
    cleanup();
    const SchemaRenderer = createPageSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-basic.test.tsx#default-trigger-label"
        schema={{
          type: 'page',
          body: [
            {
              type: 'detail-view',
              data: { theme: 'dark' },
              label: 'Settings',
              content: [{ type: 'input-text', name: 'theme', label: 'Theme' }],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit Settings' })).toBeTruthy());
  });

  it('shows trigger pending feedback while opening async detail-view content', async () => {
    cleanup();
    let resolveOpen: (() => void) | undefined;
    const SchemaRenderer = createPageSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-basic.test.tsx#open-pending"
        schema={{
          type: 'page',
          body: [
            {
              type: 'detail-view',
              data: { theme: 'dark' },
              triggerLabel: 'Edit Config',
              transformInAction: { action: 'probe:open' },
              surface: { mode: 'dialog', title: 'Edit Config' },
              content: [{ type: 'input-text', name: 'theme', label: 'Theme' }],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          actionScope?.registerNamespace('probe', {
            kind: 'host',
            invoke(method: string) {
              if (method === 'open') {
                return new Promise((resolve) => {
                  resolveOpen = () => resolve({ ok: true, data: { theme: 'dark' } });
                });
              }

              return { ok: false, error: new Error(`Unsupported method: ${method}`) };
            },
          });
        }}
      />,
    );

    const trigger = await screen.findByRole('button', { name: 'Edit Config' });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit Config' }).getAttribute('aria-busy')).toBe('true');
    });

    resolveOpen?.();

    await waitFor(() => expect(screen.getByLabelText('Theme')).toBeTruthy());
  });

  it('shows confirming pending feedback while confirm is in flight', async () => {
    cleanup();
    let resolveConfirm: (() => void) | undefined;
    const SchemaRenderer = createPageSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-basic.test.tsx#confirm-pending"
        schema={{
          type: 'page',
          body: [
            {
              type: 'detail-view',
              data: { theme: 'dark' },
              triggerLabel: 'Edit Config',
              transformOutAction: { action: 'probe:confirm' },
              surface: { mode: 'dialog', title: 'Edit Config' },
              content: [{ type: 'input-text', name: 'theme', label: 'Theme' }],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          actionScope?.registerNamespace('probe', {
            kind: 'host',
            invoke(method: string) {
              if (method === 'confirm') {
                return new Promise((resolve) => {
                  resolveConfirm = () => resolve({ ok: true, data: { theme: 'light' } });
                });
              }

              return { ok: true, data: { theme: 'dark' } };
            },
          });
        }}
      />,
    );

    fireEvent.click(await screen.findByText('Edit Config'));
    await waitFor(() => expect(screen.getByLabelText('Theme')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirming...' })).toBeTruthy();
    });

    resolveConfirm?.();

    await waitFor(() => expect(screen.queryByLabelText('Theme')).toBeNull());
  });

  it('applies confirmed updates for data-only detail-view on page scope', async () => {
    cleanup();
    const SchemaRenderer = createPageSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-basic.test.tsx#6"
        schema={{
          type: 'page',
          data: { theme: 'dark' },
          body: [
            {
              type: 'detail-view',
              data: { theme: '${theme}' },
              triggerLabel: 'Edit Config',
              surface: { mode: 'dialog', title: 'Edit Config' },
              content: [{ type: 'input-text', name: 'theme', label: 'Theme' }],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Edit Config')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Config'));
    await waitFor(() => expect(screen.getByLabelText('Theme')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'light' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(screen.queryByLabelText('Theme')).toBeNull());

    fireEvent.click(screen.getByText('Edit Config'));
    await waitFor(() => expect(screen.getByLabelText('Theme')).toBeTruthy());
    expect((screen.getByLabelText('Theme') as HTMLInputElement).value).toBe('light');
  });

  it('does not render trigger button when disabled', async () => {
    cleanup();
    const SchemaRenderer = createPageSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-basic.test.tsx#7"
        schema={{
          type: 'page',
          body: [
            {
              type: 'detail-view',
              disabled: true,
              triggerLabel: 'Edit Settings',
              data: { theme: 'dark' },
              content: [{ type: 'input-text', name: 'theme', label: 'Theme' }],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.queryByText('Edit Settings')).toBeNull());
  });

});
