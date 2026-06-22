import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';

const mobileState = vi.hoisted(() => ({ isMobile: false }));

vi.mock('@nop-chaos/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/ui')>();
  return {
    ...actual,
    useIsMobile: () => mobileState.isMobile,
  };
});

const { formRendererDefinitions } = await import('../index.js');
const { env, formStateProbeRenderer } = await import('./form-test-support.js');

beforeEach(() => {
  mobileState.isMobile = false;
});

afterEach(() => {
  cleanup();
  mobileState.isMobile = false;
});

function renderForm(body: Record<string, unknown>[], data?: Record<string, unknown>) {
  const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, formStateProbeRenderer]);
  return render(
    <SchemaRenderer
      schemaUrl="test://form/select-responsive"
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

describe('select renderer — responsive (M1a)', () => {
  it('renders the desktop Combobox popover trigger when not mobile', () => {
    mobileState.isMobile = false;
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
    ]);

    expect(document.querySelector('[data-slot="select-mobile-trigger"]')).toBeNull();
    expect(document.querySelector('[data-slot="select-wrapper"]')).toBeTruthy();
  });

  it('renders the mobile bottom-sheet trigger instead of Combobox popover when mobile', async () => {
    mobileState.isMobile = true;
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
    ]);

    const trigger = document.querySelector('[data-slot="select-mobile-trigger"]') as HTMLElement;
    expect(trigger).toBeTruthy();
    expect(trigger.getAttribute('aria-label')).toBe('Role');

    fireEvent.click(trigger);

    await waitFor(() => {
      const sheetContent = document.querySelector(
        '[data-slot="sheet-content"][data-side="bottom"]',
      );
      expect(sheetContent).toBeTruthy();
    });
    expect(document.querySelector('[data-slot="select-mobile-option"]')).toBeTruthy();
  });

  it('selects a value from the mobile bottom-sheet and closes the sheet (single mode)', async () => {
    mobileState.isMobile = true;
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

    const trigger = document.querySelector('[data-slot="select-mobile-trigger"]') as HTMLElement;
    fireEvent.click(trigger);

    const adminOption = await screen.findByRole('option', { name: /Admin/ });
    fireEvent.click(adminOption);

    await waitFor(() => {
      expect(screen.getByTestId('form-state:role').textContent).toBe('"admin"');
    });

    await waitFor(() => {
      expect(
        document.querySelector('[data-slot="sheet-content"][data-side="bottom"]'),
      ).toBeNull();
    });
  });

  it('keeps the mobile bottom-sheet open when toggling options in multiple mode', async () => {
    mobileState.isMobile = true;
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

    const trigger = document.querySelector('[data-slot="select-mobile-trigger"]') as HTMLElement;
    fireEvent.click(trigger);

    const stableOption = await screen.findByRole('option', { name: /Stable/ });
    fireEvent.click(stableOption);

    await waitFor(() => {
      expect(screen.getByTestId('form-state:tags').textContent).toBe('["stable"]');
    });

    expect(
      document.querySelector('[data-slot="sheet-content"][data-side="bottom"]'),
    ).toBeTruthy();
  });

  it('filters options in the mobile sheet when searchable is true', async () => {
    mobileState.isMobile = true;
    renderForm([
      {
        type: 'select',
        name: 'role',
        label: 'Role',
        searchable: true,
        searchPlaceholder: 'Search roles',
        options: [
          { label: 'Administrator', value: 'admin' },
          { label: 'Viewer', value: 'viewer' },
        ],
      },
    ]);

    const trigger = document.querySelector('[data-slot="select-mobile-trigger"]') as HTMLElement;
    fireEvent.click(trigger);

    const search = await screen.findByPlaceholderText('Search roles');
    fireEvent.change(search, { target: { value: 'admin' } });

    await waitFor(() => {
      const optionRows = document.querySelectorAll('[data-slot="select-mobile-option"]');
      expect(Array.from(optionRows).some((row) => row.textContent?.includes('Administrator'))).toBe(true);
      expect(Array.from(optionRows).some((row) => row.textContent?.includes('Viewer'))).toBe(false);
    });
  });

  it('clears the value via the mobile clear button when clearable is true', async () => {
    mobileState.isMobile = true;
    renderForm(
      [
        {
          type: 'select',
          name: 'role',
          label: 'Role',
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

    const clearButton = document.querySelector('[data-slot="select-mobile-clear"]') as HTMLElement;
    expect(clearButton).toBeTruthy();
    fireEvent.click(clearButton);

    await waitFor(() => {
      const text = screen.getByTestId('form-state:role').textContent;
      expect(text === 'null' || text === '""').toBe(true);
    });
  });
});
