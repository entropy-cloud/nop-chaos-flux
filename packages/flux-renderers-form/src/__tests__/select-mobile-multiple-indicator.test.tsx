import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';

const mobileState = vi.hoisted(() => ({ isMobile: false }));

vi.mock('@nop-chaos/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/ui')>();
  return {
    ...actual,
    useIsMobile: () => mobileState.isMobile,
  };
});

const { formRendererDefinitions } = await import('../index.js');
const { env } = await import('./form-test-support.js');

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  mobileState.isMobile = true;
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
  mobileState.isMobile = false;
});

function renderSelect(multiple: boolean) {
  const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);
  return render(
    <SchemaRenderer
      schemaUrl="test://select-mobile-multiple-indicator"
      schema={{
        type: 'form',
        body: [
          {
            type: 'select',
            name: 'tags',
            label: 'Tags',
            multiple,
            options: [
              { label: 'Stable', value: 'stable' },
              { label: 'Beta', value: 'beta' },
            ],
          },
        ],
      } as React.ComponentProps<typeof SchemaRenderer>['schema']}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function indicatorOf(row: Element): HTMLElement {
  const indicator = row.querySelector('span[aria-hidden="true"]');
  if (!indicator) throw new Error('option row indicator not found');
  return indicator as HTMLElement;
}

/**
 * V12f Phase 3 — [G2-R2-视角4-01] the mobile bottom-sheet option rows used the
 * single-select circular indicator regardless of `multiple`. Multi-select must
 * speak the square-checkbox language of the tree-select mobile sheet.
 */
describe('[G2-R2-视角4-01] select mobile sheet selection indicator shape', () => {
  it('renders square indicators for multi-select option rows', async () => {
    renderSelect(true);

    fireEvent.click(document.querySelector('[data-slot="select-mobile-trigger"]') as HTMLElement);

    const rows = await screen.findAllByRole('option');
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const indicator = indicatorOf(row);
      expect(indicator.getAttribute('data-shape')).toBe('square');
      expect(indicator.className).toContain('rounded-[4px]');
      expect(indicator.className).not.toContain('rounded-full');
    }
  });

  it('keeps the circular indicator for single-select option rows', async () => {
    renderSelect(false);

    fireEvent.click(document.querySelector('[data-slot="select-mobile-trigger"]') as HTMLElement);

    await waitFor(() => {
      expect(document.querySelector('[data-slot="select-mobile-option"]')).toBeTruthy();
    });
    const rows = document.querySelectorAll('[data-slot="select-mobile-option"]');
    for (const row of rows) {
      const indicator = indicatorOf(row);
      expect(indicator.getAttribute('data-shape')).toBe('circle');
      expect(indicator.className).toContain('rounded-full');
      expect(indicator.className).not.toContain('rounded-[4px]');
    }
  });
});
