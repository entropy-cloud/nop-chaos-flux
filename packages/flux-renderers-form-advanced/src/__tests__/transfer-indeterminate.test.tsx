import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formAdvancedRendererDefinitions } from '../index.js';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { env, formulaCompiler } from '../test-support.js';
import { installFormAdvancedTestHooks } from '../test-support.js';

installFormAdvancedTestHooks();

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

/**
 * G2-视角3-01 (V12b plan 485 Phase 2, proof-first): the toggle-all checkbox
 * emits `data-indeterminate` as a presence-selector signal (the package's
 * styles key off `[data-indeterminate]`). A bare boolean renders BOTH true and
 * false as a present attribute ("true"/"false"), making the selector always
 * match. The attribute must be the string 'true' or absent.
 */
function renderTransfer(optionCount: number) {
  const SchemaRenderer = createSchemaRenderer([
    ...formRendererDefinitions,
    ...formAdvancedRendererDefinitions,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://transfer-indeterminate"
      schema={
        {
          type: 'form',
          id: 'f',
          data: { roles: [] },
          body: [
            {
              type: 'transfer',
              name: 'roles',
              label: 'Roles',
              options: Array.from({ length: optionCount }, (_, i) => ({
                label: `Opt ${i + 1}`,
                value: `v${i + 1}`,
              })),
            },
          ],
        } as never
      }
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function toggleAll() {
  return document.querySelector('[data-slot="transfer-toggle-all"]') as HTMLElement;
}

function candidateChecks() {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>('[data-slot="transfer-option-candidate"]'),
  );
}

describe('transfer toggle-all data-indeterminate (G2-视角3-01)', () => {
  it('has NO data-indeterminate attribute when nothing is checked', async () => {
    renderTransfer(3);
    await waitFor(() => expect(candidateChecks()).toHaveLength(3));
    expect(toggleAll().hasAttribute('data-indeterminate')).toBe(false);
  });

  it('data-indeterminate="true" when SOME (not all) candidates are checked', async () => {
    renderTransfer(3);
    await waitFor(() => expect(candidateChecks()).toHaveLength(3));
    fireEvent.click(candidateChecks()[0]!);
    await waitFor(() => {
      expect(toggleAll().getAttribute('data-indeterminate')).toBe('true');
    });
  });

  it('has NO data-indeterminate attribute when ALL candidates are checked', async () => {
    renderTransfer(3);
    await waitFor(() => expect(candidateChecks()).toHaveLength(3));
    fireEvent.click(toggleAll());
    await waitFor(() => {
      expect(candidateChecks().every((c) => c.hasAttribute('data-checked')) || candidateChecks().length > 0).toBe(true);
    });
    expect(toggleAll().hasAttribute('data-indeterminate')).toBe(false);
  });
});
