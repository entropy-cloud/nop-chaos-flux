import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { baseEnv, createPageSchemaRenderer, formulaCompiler } from './test-support';

describe('detail-view renderer basic behavior', () => {
  it('renders the trigger button when not readOnly', async () => {
    cleanup();
    const SchemaRenderer = createPageSchemaRenderer();

    render(
      <SchemaRenderer
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

  it('does not render trigger button when readOnly', async () => {
    cleanup();
    const SchemaRenderer = createPageSchemaRenderer();

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'detail-view',
              readOnly: true,
              triggerLabel: 'Edit Settings',
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

  it('opens dialog with static data pre-populated', async () => {
    cleanup();
    const SchemaRenderer = createPageSchemaRenderer();

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
    expect(document.querySelector('[data-slot="detail-view-draft-error"]')?.textContent).toContain('Please fix validation errors before confirming.');
  });
});
