import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { formAdvancedRendererDefinitions } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { env, formStateProbeRenderer, formulaCompiler } from '../test-support.js';
import { installFormAdvancedTestHooks } from '../test-support.js';

// plan 2026-09-28-5 Phase 3: roving keyboard navigation on both transfer
// panes — a user must be able to complete a full shuttle without a mouse.
installFormAdvancedTestHooks();

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

function renderSchema(schema: object) {
  const SchemaRenderer = createSchemaRenderer([
    ...basicRendererDefinitions,
    ...allFormDefs,
    formStateProbeRenderer,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://transfer-keyboard"
      schema={schema as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function resolveFormState(testId: string): unknown {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null') ?? null;
}

function candidateList() {
  return document.querySelector('[data-slot="transfer-pane-candidate"] ul') as HTMLElement;
}

function selectedList() {
  return document.querySelector('[data-slot="transfer-pane-selected"] ul') as HTMLElement;
}

describe('transfer keyboard navigation (plan 2026-09-28-5 Phase 3)', () => {
  it('exposes keyboard-navigable panes without the composite listbox role (20-05 contract)', () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { roles: [] },
      body: [
        {
          type: 'transfer',
          id: 'tr',
          name: 'roles',
          label: 'Roles',
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Editor', value: 'editor' },
          ],
        },
      ],
    });

    const list = candidateList();
    // No composite listbox (adjudicated 20-05): selection lives in checkboxes.
    expect(list.getAttribute('role')).toBeNull();
    expect(list.getAttribute('aria-multiselectable')).toBeNull();
    // Roving keyboard surface present.
    expect(list.getAttribute('tabindex')).toBe('0');
    expect(list.getAttribute('aria-label')).toBe('Candidates');
  });

  it('moves the active marker with ArrowDown/ArrowUp and clamps at edges', () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { roles: [] },
      body: [
        {
          type: 'transfer',
          id: 'tr',
          name: 'roles',
          label: 'Roles',
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Editor', value: 'editor' },
            { label: 'Viewer', value: 'viewer' },
          ],
        },
      ],
    });

    const list = candidateList();
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(list.querySelector('[data-active="true"]')?.textContent).toContain('Admin');
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(list.querySelector('[data-active="true"]')?.textContent).toContain('Viewer');
    // clamped: ArrowDown at the last item stays on it
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(list.querySelector('[data-active="true"]')?.textContent).toContain('Viewer');
    fireEvent.keyDown(list, { key: 'ArrowUp' });
    expect(list.querySelector('[data-active="true"]')?.textContent).toContain('Editor');
    // Home/End jump
    fireEvent.keyDown(list, { key: 'Home' });
    expect(list.querySelector('[data-active="true"]')?.textContent).toContain('Admin');
    fireEvent.keyDown(list, { key: 'End' });
    expect(list.querySelector('[data-active="true"]')?.textContent).toContain('Viewer');
  });

  it('toggles the active option with Space (checkbox state flips without a mouse)', () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { roles: [] },
      body: [
        {
          type: 'transfer',
          id: 'tr',
          name: 'roles',
          label: 'Roles',
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Editor', value: 'editor' },
          ],
        },
      ],
    });

    const list = candidateList();
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: ' ' });
    const adminInput = Array.from(
      document.querySelectorAll('[data-slot="transfer-option-candidate"]'),
    ).find((el) => (el as HTMLInputElement).getAttribute('aria-label') === 'Admin') as HTMLElement;
    expect(adminInput?.getAttribute('aria-checked')).toBe('true');
  });

  it('supports a full mouse-free shuttle (navigate → Space → Enter on shuttle → deselect)', () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { roles: [] },
      body: [
        {
          type: 'transfer',
          id: 'tr',
          name: 'roles',
          label: 'Roles',
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Editor', value: 'editor' },
          ],
        },
        { type: 'form-state-probe', name: 'roles' },
      ],
    });

    // keyboard: activate second option, Space to check it
    const candidate = candidateList();
    fireEvent.keyDown(candidate, { key: 'End' });
    fireEvent.keyDown(candidate, { key: ' ' });
    // keyboard: Enter on the shuttle button (simulated as its activation click)
    const selectButton = document.querySelector('[data-slot="transfer-select"]') as HTMLButtonElement;
    fireEvent.click(selectButton);
    expect(resolveFormState('form-state:roles')).toEqual(['editor']);

    // keyboard on the selected pane: activate + Space to uncheck, then shuttle back
    const selected = selectedList();
    fireEvent.keyDown(selected, { key: 'ArrowDown' });
    fireEvent.keyDown(selected, { key: ' ' });
    const deselectButton = document.querySelector('[data-slot="transfer-deselect"]') as HTMLButtonElement;
    fireEvent.click(deselectButton);
    expect(resolveFormState('form-state:roles')).toEqual([]);
  });
});
