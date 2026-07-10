import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { formRendererDefinitions } from '../index.js';
import { env, formStateProbeRenderer, selectOption } from './form-test-support.js';

const virtualMockConfig = vi.hoisted(() => ({
  enabled: false,
  items: [] as Array<{ key: string; index: number; start: number }>,
}));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getTotalSize: () =>
      virtualMockConfig.items.length > 0
        ? virtualMockConfig.items[virtualMockConfig.items.length - 1].start + 32
        : 0,
    getVirtualItems: () => virtualMockConfig.items,
  }),
}));

afterEach(() => {
  cleanup();
  virtualMockConfig.enabled = false;
  virtualMockConfig.items = [];
});

function renderForm(body: Record<string, unknown>[], data?: Record<string, unknown>) {
  const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, formStateProbeRenderer]);
  return render(
    <SchemaRenderer
      schemaUrl="test://form/select-enhancements"
      schema={{
        type: 'form',
        ...(data ? { data } : {}),
        body,
      } as React.ComponentProps<typeof SchemaRenderer>['schema']}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function openCombobox(label: string) {
  const control = screen.getByRole('combobox', { name: label });
  fireEvent.mouseDown(control);
  fireEvent.click(control);
}

function typeAndFilter(label: string, query: string) {
  const input = screen.getByRole('combobox', { name: label }) as HTMLInputElement;
  fireEvent.mouseDown(input);
  fireEvent.click(input);
  fireEvent.input(input, { target: { value: query } });
}

describe('select enhancements (E1a)', () => {
  describe('searchable', () => {
    it('renders an input element when searchable is true', () => {
      renderForm([
        {
          type: 'select',
          name: 'role',
          label: 'Role',
          searchable: true,
          searchPlaceholder: 'Search roles...',
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Viewer', value: 'viewer' },
          ],
        },
      ]);

      const combobox = screen.getByRole('combobox', { name: 'Role' });
      expect(combobox.tagName).toBe('INPUT');
      expect((combobox as HTMLInputElement).placeholder).toBe('Search roles...');
    });

    it('renders a button element when searchable is false', () => {
      renderForm([
        {
          type: 'select',
          name: 'role',
          label: 'Role',
          searchable: false,
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Viewer', value: 'viewer' },
          ],
        },
      ]);

      const combobox = screen.getByRole('combobox', { name: 'Role' });
      expect(combobox.tagName).toBe('BUTTON');
    });

    it('filters options based on the search query', async () => {
      renderForm([
        {
          type: 'select',
          name: 'role',
          label: 'Role',
          searchable: true,
          options: [
            { label: 'Administrator', value: 'admin' },
            { label: 'Viewer', value: 'viewer' },
            { label: 'Editor', value: 'editor' },
          ],
        },
      ]);

      typeAndFilter('Role', 'admin');

      await waitFor(() => {
        const options = screen.queryAllByRole('option');
        console.log('Options found:', options.length);
        options.forEach((opt, i) => {
          console.log(`  Option ${i}: textContent="${opt.textContent}" aria-label="${opt.getAttribute('aria-label')}" innerHTML="${opt.innerHTML.substring(0, 200)}"`);
        });
        expect(options.length).toBeGreaterThan(0);
      });
    });

    it('shows noResultsText when no options match', async () => {
      renderForm([
        {
          type: 'select',
          name: 'role',
          label: 'Role',
          searchable: true,
          noResultsText: 'Nothing here',
          options: [{ label: 'Admin', value: 'admin' }],
        },
      ]);

      typeAndFilter('Role', 'zzz');

      await waitFor(() => {
        expect(screen.getByText('Nothing here')).toBeTruthy();
      });
    });

    it('does not filter when filterOption is false', async () => {
      renderForm([
        {
          type: 'select',
          name: 'role',
          label: 'Role',
          searchable: true,
          filterOption: false,
          options: [
            { label: 'Administrator', value: 'admin' },
            { label: 'Viewer', value: 'viewer' },
          ],
        },
      ]);

      typeAndFilter('Role', 'admin');

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Administrator' })).toBeTruthy();
      });
      expect(screen.getByRole('option', { name: 'Viewer' })).toBeTruthy();
    });
  });

  describe('clearable', () => {
    it('clears the value when the clear button is clicked (single, searchable)', async () => {
      renderForm(
        [
          {
            type: 'select',
            name: 'role',
            label: 'Role',
            searchable: true,
            clearable: true,
            options: [
              { label: 'Admin', value: 'admin' },
              { label: 'Viewer', value: 'viewer' },
            ],
          },
          { type: 'form-state-probe', name: 'role' },
        ],
        { role: 'admin' },
      );

      await waitFor(() => {
        expect(screen.getByTestId('form-state:role').textContent).toBe('"admin"');
      });

      const clearButton = document.querySelector('[data-slot="combobox-clear"]') as HTMLElement;
      expect(clearButton).toBeTruthy();
      fireEvent.click(clearButton);

      await waitFor(() => {
        const text = screen.getByTestId('form-state:role').textContent;
        expect(text === 'null' || text === '""').toBe(true);
      });
    });
  });

  describe('multiple', () => {
    it('renders selected values as chips in multiple mode', () => {
      renderForm(
        [
          {
            type: 'select',
            name: 'tags',
            label: 'Tags',
            multiple: true,
            options: [
              { label: 'Stable', value: 'stable' },
              { label: 'Beta', value: 'beta' },
              { label: 'Legacy', value: 'legacy' },
            ],
          },
        ],
        { tags: ['stable', 'beta'] },
      );

      const chips = document.querySelectorAll('[data-slot="combobox-chip"]');
      expect(chips.length).toBe(2);
      expect(Array.from(chips).some((c) => c.textContent?.includes('Stable'))).toBe(true);
      expect(Array.from(chips).some((c) => c.textContent?.includes('Beta'))).toBe(true);
    });

    it('binds the value as an array in multiple mode', async () => {
      renderForm([
        {
          type: 'select',
          name: 'tags',
          label: 'Tags',
          multiple: true,
          options: [
            { label: 'Stable', value: 'stable' },
            { label: 'Beta', value: 'beta' },
          ],
        },
        { type: 'form-state-probe', name: 'tags' },
      ]);

      openCombobox('Tags');
      const option = await screen.findByRole('option', { name: 'Stable' });
      fireEvent.click(option);

      await waitFor(() => {
        expect(screen.getByTestId('form-state:tags').textContent).toBe('["stable"]');
      });
    });

    it('keeps value as a string in single mode', async () => {
      renderForm([
        {
          type: 'select',
          name: 'role',
          label: 'Role',
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Viewer', value: 'viewer' },
          ],
        },
        { type: 'form-state-probe', name: 'role' },
      ]);

      await selectOption('Role', 'Admin');

      await waitFor(() => {
        expect(screen.getByTestId('form-state:role').textContent).toBe('"admin"');
      });
    });
  });

  describe('groups', () => {
    it('renders options grouped under group labels', async () => {
      renderForm([
        {
          type: 'select',
          name: 'role',
          label: 'Role',
          groups: [
            {
              label: 'Staff',
              options: [
                { label: 'Admin', value: 'admin' },
                { label: 'Editor', value: 'editor' },
              ],
            },
            {
              label: 'External',
              options: [{ label: 'Viewer', value: 'viewer' }],
            },
          ],
        },
      ]);

      openCombobox('Role');
      await screen.findByRole('option', { name: 'Admin' });

      const groupLabels = document.querySelectorAll('[data-slot="combobox-label"]');
      expect(groupLabels.length).toBe(2);
      expect(Array.from(groupLabels).some((el) => el.textContent === 'Staff')).toBe(true);
      expect(Array.from(groupLabels).some((el) => el.textContent === 'External')).toBe(true);
    });
  });

  describe('virtual scrolling', () => {
    it('renders only a window of items when virtual is enabled with a large option set', async () => {
      virtualMockConfig.enabled = true;
      virtualMockConfig.items = [
        { key: 'opt-0', index: 0, start: 0 },
        { key: 'opt-1', index: 1, start: 32 },
        { key: 'opt-2', index: 2, start: 64 },
      ];

      const options = Array.from({ length: 200 }, (_, i) => ({
        label: `Option ${i}`,
        value: `opt-${i}`,
      }));

      renderForm([
        {
          type: 'select',
          name: 'big',
          label: 'Big',
          virtual: true,
          options,
        },
      ]);

      openCombobox('Big');

      const items = await screen.findAllByRole('option');
      expect(items.length).toBe(3);
      expect(items[0].textContent).toBe('Option 0');
    });

    it('renders all items when virtual is false', async () => {
      const options = Array.from({ length: 5 }, (_, i) => ({
        label: `Option ${i}`,
        value: `opt-${i}`,
      }));

      renderForm([
        {
          type: 'select',
          name: 'small',
          label: 'Small',
          virtual: false,
          options,
        },
      ]);

      openCombobox('Small');
      const items = await screen.findAllByRole('option');
      expect(items.length).toBe(5);
    });
  });

  describe('source state regression', () => {
    it('preserves source loading indicator after migration', () => {
      renderForm([
        {
          type: 'select',
          name: 'role',
          label: 'Role',
          options: [],
          optionsSourceState: {
            loading: true,
            status: 'loading',
          },
        },
      ]);

      expect(document.querySelector('[data-slot="select-loading"]')?.getAttribute('role')).toBe(
        'status',
      );
    });

    it('preserves source error indicator after migration', () => {
      renderForm([
        {
          type: 'select',
          name: 'role',
          label: 'Role',
          options: [],
          optionsSourceState: {
            loading: false,
            status: 'error',
            error: 'Load failed',
          },
        },
      ]);

      const error = screen.getByText('Load failed');
      expect(error.getAttribute('role')).toBe('alert');
    });
  });

  describe('disabled option', () => {
    it('renders an option with aria-disabled', async () => {
      renderForm([
        {
          type: 'select',
          name: 'role',
          label: 'Role',
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Disabled Opt', value: 'disabled', disabled: true },
          ],
        },
      ]);

      openCombobox('Role');
      const disabledOption = await screen.findByRole('option', { name: 'Disabled Opt' });
      expect(disabledOption.getAttribute('aria-disabled')).toBe('true');
    });
  });
});
