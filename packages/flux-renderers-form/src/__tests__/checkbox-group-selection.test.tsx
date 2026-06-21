import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { formRendererDefinitions } from '../index.js';
import { env, formStateProbeRenderer } from './form-test-support.js';

afterEach(() => {
  cleanup();
});

function checkboxFor(label: string): HTMLElement {
  return screen.getByRole('checkbox', { name: new RegExp(label) });
}

function isChecked(el: HTMLElement): boolean {
  return el.hasAttribute('data-checked');
}

function isDisabled(el: HTMLElement): boolean {
  return el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';
}

function readState(testId: string): unknown {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null');
}

interface RenderOptions {
  data?: Record<string, unknown>;
  fieldProps?: Record<string, unknown>;
}

function renderCheckboxGroup(options: RenderOptions = {}) {
  const { data, fieldProps = {} } = options;
  const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, formStateProbeRenderer]);
  return render(
    <SchemaRenderer
      schemaUrl="test://form/checkbox-group-selection"
      schema={{
        type: 'form',
        ...(data ? { data } : {}),
        body: [
          {
            type: 'checkbox-group',
            name: 'tags',
            label: 'Tags',
            ...fieldProps,
          },
          {
            type: 'form-state-probe',
            name: 'tags',
          },
        ],
      } as React.ComponentProps<typeof SchemaRenderer>['schema']}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

const TAG_OPTIONS = [
  { label: 'Stable', value: 'stable' },
  { label: 'Beta', value: 'beta' },
  { label: 'Archived', value: 'archived' },
];

describe('checkbox-group per-option disabled + disabledTip (E2c Phase 2)', () => {
  it('disables a single option via option.disabled and blocks toggling it on', async () => {
    renderCheckboxGroup({
      fieldProps: {
        options: [
          { label: 'Stable', value: 'stable' },
          { label: 'Beta', value: 'beta', disabled: true },
          { label: 'Archived', value: 'archived' },
        ],
      },
    });

    const beta = checkboxFor('Beta');
    expect(isDisabled(beta)).toBe(true);

    fireEvent.click(beta);
    await waitFor(() => {
      expect(readState('form-state:tags')).toEqual(null);
    });
  });

  it('keeps a disabled option out of the value array when clicked', async () => {
    renderCheckboxGroup({
      data: { tags: ['stable'] },
      fieldProps: {
        options: [
          { label: 'Stable', value: 'stable' },
          { label: 'Beta', value: 'beta', disabled: true },
        ],
      },
    });

    fireEvent.click(checkboxFor('Beta'));
    await waitFor(() => {
      expect(readState('form-state:tags')).toEqual(['stable']);
    });
  });

  it('leaves enabled options interactive while only the disabled option is locked', async () => {
    renderCheckboxGroup({
      fieldProps: {
        options: [
          { label: 'Stable', value: 'stable' },
          { label: 'Beta', value: 'beta', disabled: true },
          { label: 'Archived', value: 'archived' },
        ],
      },
    });

    expect(isDisabled(checkboxFor('Stable'))).toBe(false);
    expect(isDisabled(checkboxFor('Archived'))).toBe(false);

    fireEvent.click(checkboxFor('Archived'));
    await waitFor(() => {
      expect(readState('form-state:tags')).toEqual(['archived']);
    });
  });

  it('renders the disabledTip text for a disabled option', () => {
    renderCheckboxGroup({
      fieldProps: {
        options: [
          { label: 'Stable', value: 'stable' },
          { label: 'Beta', value: 'beta', disabled: true, disabledTip: 'Beta channel locked' },
        ],
      },
    });

    const beta = checkboxFor('Beta');
    const item = beta.closest('[data-slot="checkbox-group-item"]') as HTMLElement;
    expect(item.getAttribute('title')).toBe('Beta channel locked');
    expect(item.getAttribute('data-disabled-tip')).toBe('Beta channel locked');
  });

  it('does not attach a disabledTip to options without one', () => {
    renderCheckboxGroup({
      fieldProps: {
        options: [
          { label: 'Stable', value: 'stable' },
          { label: 'Beta', value: 'beta', disabled: true },
        ],
      },
    });

    const stableItem = checkboxFor('Stable').closest('[data-slot="checkbox-group-item"]') as HTMLElement;
    const betaItem = checkboxFor('Beta').closest('[data-slot="checkbox-group-item"]') as HTMLElement;
    expect(stableItem.getAttribute('title')).toBeNull();
    expect(betaItem.getAttribute('title')).toBeNull();
  });

  it('disables every option (including a disabled one) when the group is disabled', () => {
    renderCheckboxGroup({
      fieldProps: {
        disabled: true,
        options: [
          { label: 'Stable', value: 'stable' },
          { label: 'Beta', value: 'beta', disabled: true, disabledTip: 'locked' },
        ],
      },
    });

    expect(isDisabled(checkboxFor('Stable'))).toBe(true);
    expect(isDisabled(checkboxFor('Beta'))).toBe(true);
  });

  it('still reflects selected state on a disabled option (pre-selected value)', () => {
    renderCheckboxGroup({
      data: { tags: ['beta'] },
      fieldProps: {
        options: [{ label: 'Stable', value: 'stable' }, { label: 'Beta', value: 'beta', disabled: true }],
      },
    });

    expect(isChecked(checkboxFor('Beta'))).toBe(true);
  });
});

describe('checkbox-group maxSelected / minSelected constraints (E2c Phase 3)', () => {
  it('disables remaining unselected options once maxSelected is reached', () => {
    renderCheckboxGroup({
      fieldProps: {
        maxSelected: 2,
        options: TAG_OPTIONS,
      },
    });

    fireEvent.click(checkboxFor('Stable'));
    fireEvent.click(checkboxFor('Beta'));

    expect(isChecked(checkboxFor('Stable'))).toBe(true);
    expect(isChecked(checkboxFor('Beta'))).toBe(true);
    expect(isDisabled(checkboxFor('Archived'))).toBe(true);
  });

  it('keeps already-selected options cancellable so a quota can be freed', async () => {
    renderCheckboxGroup({
      fieldProps: {
        maxSelected: 2,
        options: TAG_OPTIONS,
      },
    });

    fireEvent.click(checkboxFor('Stable'));
    fireEvent.click(checkboxFor('Beta'));

    expect(isDisabled(checkboxFor('Stable'))).toBe(false);
    expect(isDisabled(checkboxFor('Beta'))).toBe(false);

    fireEvent.click(checkboxFor('Stable'));
    await waitFor(() => {
      expect(isDisabled(checkboxFor('Archived'))).toBe(false);
    });
  });

  it('does not count an option.disabled item against the selectable base', () => {
    renderCheckboxGroup({
      fieldProps: {
        maxSelected: 2,
        options: [
          { label: 'Stable', value: 'stable' },
          { label: 'Beta', value: 'beta' },
          { label: 'Archived', value: 'archived', disabled: true },
        ],
      },
    });

    fireEvent.click(checkboxFor('Stable'));
    fireEvent.click(checkboxFor('Beta'));

    expect(isChecked(checkboxFor('Stable'))).toBe(true);
    expect(isChecked(checkboxFor('Beta'))).toBe(true);
    expect(isDisabled(checkboxFor('Stable'))).toBe(false);
    expect(isDisabled(checkboxFor('Beta'))).toBe(false);
  });

  it('blocks unchecking an option when minSelected is reached', async () => {
    renderCheckboxGroup({
      data: { tags: ['stable', 'beta'] },
      fieldProps: {
        minSelected: 2,
        options: TAG_OPTIONS,
      },
    });

    const stable = checkboxFor('Stable');
    expect(isChecked(stable)).toBe(true);

    fireEvent.click(stable);
    await waitFor(() => {
      expect(isChecked(stable)).toBe(true);
    });
    expect(readState('form-state:tags')).toEqual(['stable', 'beta']);
  });

  it('allows unchecking when above the minSelected floor', async () => {
    renderCheckboxGroup({
      data: { tags: ['stable', 'beta', 'archived'] },
      fieldProps: {
        minSelected: 2,
        options: TAG_OPTIONS,
      },
    });

    fireEvent.click(checkboxFor('Archived'));
    await waitFor(() => {
      expect(readState('form-state:tags')).toEqual(['stable', 'beta']);
    });
  });

  it('keeps constraints inert while the group is loading', () => {
    renderCheckboxGroup({
      fieldProps: {
        maxSelected: 1,
        options: [],
        optionsSourceState: { loading: true, status: 'loading' },
      },
    });

    expect(document.querySelector('[data-slot="checkbox-group-loading"]')).toBeTruthy();
  });
});

describe('checkbox-group checkAll + indeterminate (E2c Phase 4)', () => {
  function checkAllCheckbox(): HTMLElement {
    return screen.getByRole('checkbox', { name: /Select All/ });
  }

  it('renders a Select All control when checkAll is enabled', () => {
    renderCheckboxGroup({
      fieldProps: { checkAll: true, options: TAG_OPTIONS },
    });

    expect(checkAllCheckbox()).toBeTruthy();
    expect(checkAllCheckbox().getAttribute('data-slot')).toBe('checkbox-group-checkall');
  });

  it('does not render a Select All control when checkAll is omitted', () => {
    renderCheckboxGroup({
      fieldProps: { options: TAG_OPTIONS },
    });

    expect(screen.queryByRole('checkbox', { name: 'Select All' })).toBeNull();
  });

  it('marks Select All checked when every selectable option is selected', () => {
    renderCheckboxGroup({
      data: { tags: ['stable', 'beta', 'archived'] },
      fieldProps: { checkAll: true, options: TAG_OPTIONS },
    });

    expect(isChecked(checkAllCheckbox())).toBe(true);
  });

  it('shows Select All indeterminate when only some selectable options are selected', () => {
    renderCheckboxGroup({
      data: { tags: ['stable'] },
      fieldProps: { checkAll: true, options: TAG_OPTIONS },
    });

    const all = checkAllCheckbox();
    expect(all.hasAttribute('data-indeterminate')).toBe(true);
    expect(isChecked(all)).toBe(false);
  });

  it('shows Select All unchecked when nothing is selected', () => {
    renderCheckboxGroup({
      fieldProps: { checkAll: true, options: TAG_OPTIONS },
    });

    const all = checkAllCheckbox();
    expect(isChecked(all)).toBe(false);
    expect(all.hasAttribute('data-indeterminate')).toBe(false);
  });

  it('selects every selectable option when clicking Select All from indeterminate/unchecked', async () => {
    renderCheckboxGroup({
      fieldProps: { checkAll: true, options: TAG_OPTIONS },
    });

    fireEvent.click(checkAllCheckbox());

    await waitFor(() => {
      expect(readState('form-state:tags')).toEqual(['stable', 'beta', 'archived']);
    });
    expect(isChecked(checkAllCheckbox())).toBe(true);
  });

  it('clears every selectable option when clicking Select All from checked', async () => {
    renderCheckboxGroup({
      data: { tags: ['stable', 'beta', 'archived'] },
      fieldProps: { checkAll: true, options: TAG_OPTIONS },
    });

    fireEvent.click(checkAllCheckbox());

    await waitFor(() => {
      expect(readState('form-state:tags')).toEqual([]);
    });
    expect(isChecked(checkAllCheckbox())).toBe(false);
  });

  it('excludes disabled options from Select All and from the checked derivation', async () => {
    renderCheckboxGroup({
      fieldProps: {
        checkAll: true,
        options: [
          { label: 'Stable', value: 'stable' },
          { label: 'Beta', value: 'beta' },
          { label: 'Archived', value: 'archived', disabled: true },
        ],
      },
    });

    expect(isDisabled(checkboxFor('Archived'))).toBe(true);

    fireEvent.click(checkAllCheckbox());
    await waitFor(() => {
      expect(readState('form-state:tags')).toEqual(['stable', 'beta']);
    });
    expect(isChecked(checkboxFor('Archived'))).toBe(false);
    expect(isChecked(checkAllCheckbox())).toBe(true);
  });

  it('keeps Select All disabled while the group is loading', () => {
    renderCheckboxGroup({
      fieldProps: {
        checkAll: true,
        options: [],
        optionsSourceState: { loading: true, status: 'loading' },
      },
    });

    expect(isDisabled(checkAllCheckbox())).toBe(true);
  });

  it('keeps Select All disabled when the group is disabled', () => {
    renderCheckboxGroup({
      fieldProps: {
        checkAll: true,
        disabled: true,
        options: TAG_OPTIONS,
      },
    });

    expect(isDisabled(checkAllCheckbox())).toBe(true);
  });

  it('clamps Select All to maxSelected when more selectable options exist than the cap', async () => {
    renderCheckboxGroup({
      fieldProps: { checkAll: true, maxSelected: 2, options: TAG_OPTIONS },
    });

    fireEvent.click(checkAllCheckbox());

    await waitFor(() => {
      expect(readState('form-state:tags')).toEqual(['stable', 'beta']);
    });

    const all = checkAllCheckbox();
    expect(all.hasAttribute('data-indeterminate')).toBe(true);
    expect(isChecked(all)).toBe(false);
  });
});

describe('checkbox-group schema property coverage (E2c)', () => {
  it('renders with checkAll, maxSelected, and minSelected declared together on the schema', () => {
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, formStateProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://form/checkbox-group-coverage"
        schema={{
          type: 'form',
          body: [
            {
              type: 'checkbox-group',
              name: 'tags',
              label: 'Tags',
              checkAll: true,
              maxSelected: 2,
              minSelected: 1,
              options: TAG_OPTIONS,
            },
            { type: 'form-state-probe', name: 'tags' },
          ],
        } as React.ComponentProps<typeof SchemaRenderer>['schema']}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(
      screen.getByRole('checkbox', { name: /Select All/ }).getAttribute('data-slot'),
    ).toBe('checkbox-group-checkall');
  });
});
