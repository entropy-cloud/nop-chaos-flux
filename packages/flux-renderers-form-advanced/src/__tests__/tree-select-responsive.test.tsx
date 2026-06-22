import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index.js';
import { env, formStateProbeRenderer } from '../test-support.js';

const mobileState = vi.hoisted(() => ({ isMobile: false }));

vi.mock('@nop-chaos/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/ui')>();
  return {
    ...actual,
    useIsMobile: () => mobileState.isMobile,
  };
});

beforeEach(() => {
  mobileState.isMobile = false;
});

afterEach(() => {
  cleanup();
  mobileState.isMobile = false;
});

function renderForm(body: Record<string, unknown>[], data?: Record<string, unknown>) {
  const SchemaRenderer = createSchemaRenderer([
    ...basicRendererDefinitions,
    ...formRendererDefinitions,
    ...formAdvancedRendererDefinitions,
    formStateProbeRenderer,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://flux-renderers-form-advanced/__tests__/tree-select-responsive.test.tsx"
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

describe('tree-select renderer — responsive (M1a)', () => {
  it('renders the desktop popover trigger when not mobile', () => {
    mobileState.isMobile = false;
    renderForm([
      {
        type: 'tree-select',
        name: 'department',
        label: 'Department',
        options: [
          { label: 'Platform', value: 'platform', children: [{ label: 'Infra', value: 'infra' }] },
        ],
      },
    ]);

    expect(document.querySelector('[data-slot="tree-select-control"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="tree-select-mobile-sheet"]')).toBeNull();
  });

  it('renders the mobile bottom-sheet trigger and opens a sheet when mobile', async () => {
    mobileState.isMobile = true;
    renderForm([
      {
        type: 'tree-select',
        name: 'department',
        label: 'Department',
        options: [
          { label: 'Platform', value: 'platform', children: [{ label: 'Infra', value: 'infra' }] },
        ],
      },
    ]);

    const trigger = screen.getByRole('button', { name: /Department/ });
    expect(trigger.getAttribute('data-slot')).toBe('tree-select-mobile-trigger');
    fireEvent.click(trigger);

    await waitFor(() => {
      const sheet = document.querySelector('[data-testid="tree-select-mobile-sheet"]');
      expect(sheet).toBeTruthy();
    });
    expect(
      document.querySelector('[data-slot="sheet-content"][data-side="bottom"]'),
    ).toBeTruthy();
  });

  it('selects a value via the mobile sheet tree option list', async () => {
    mobileState.isMobile = true;
    renderForm([
      {
        type: 'tree-select',
        name: 'department',
        label: 'Department',
        options: [{ label: 'Platform', value: 'platform' }],
      },
      { type: 'form-state-probe', name: 'department' },
    ]);

    const trigger = screen.getByRole('button', { name: /Department/ });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(
        document.querySelector('[data-testid="tree-select-mobile-sheet"]'),
      ).toBeTruthy();
    });

    const option = await screen.findByText('Platform');
    fireEvent.click(option);

    await waitFor(() => {
      expect(screen.getByTestId('form-state:department').textContent).toContain('platform');
    });
  });
});
