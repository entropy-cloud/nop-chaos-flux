import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { formAdvancedRendererDefinitions } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { env, formulaCompiler } from '../test-support.js';

afterEach(() => {
  cleanup();
});

describe('20-05 transfer listbox role removal (WCAG 4.1.2 / 1.3.1)', () => {
  it('does not expose role="listbox" / aria-multiselectable and keeps checkbox selection semantics', async () => {
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
      ...formAdvancedRendererDefinitions,
    ]);
    render(
      <SchemaRenderer
        schemaUrl="test://transfer-a11y"
        schema={{
          type: 'form',
          id: 'f',
          data: { roles: [] },
          body: [
            {
              type: 'transfer',
              id: 'tr',
              name: 'roles',
              label: 'Roles',
              multiple: true,
              options: [
                { value: 'admin', label: 'Admin' },
                { value: 'editor', label: 'Editor' },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Admin')).toBeTruthy());

    // No composite listbox role (the list is plain <ul>; selection lives in the
    // checkbox controls).
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(document.querySelector('[aria-multiselectable]')).toBeNull();

    // Checkbox semantics preserved: each option remains a labeled checkbox.
    const candidates = document.querySelectorAll('[data-slot="transfer-option-candidate"]');
    expect(candidates.length).toBe(2);
    for (const candidate of Array.from(candidates)) {
      expect(candidate.getAttribute('aria-label')).toBeTruthy();
    }
  });
});
