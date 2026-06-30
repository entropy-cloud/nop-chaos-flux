import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderGroup } from './config-test-support.js';
import type { ConditionGroupValue } from './types.js';

// B6.1 CB1 regression lock: `disabled` is a single umbrella switch that fans out to
// EVERY mutation affordance (NOT toggle, if input, AND/OR conjunction, add-condition,
// add-group, group delete, item delete, drag handle). When `disabled: true` no partial
// disable is possible — all affordances are either disabled or not rendered.

function groupWithItemAndNestedGroup(): ConditionGroupValue {
  return {
    id: 'g-root',
    conjunction: 'and',
    not: false,
    children: [
      {
        id: 'i-1',
        left: { type: 'field', field: 'name' },
        op: 'equal',
        right: undefined,
      },
      {
        id: 'g-nested',
        conjunction: 'or',
        not: false,
        children: [
          {
            id: 'i-2',
            left: { type: 'field', field: 'age' },
            op: 'equal',
            right: undefined,
          },
        ],
      },
    ],
  };
}

const umbrellaSchema = {
  builderMode: 'full' as const,
  showAndOr: true,
  showNot: true,
  showIf: true,
  draggable: true,
};

describe('CB1: disabled umbrella fan-out (single switch disables every affordance)', () => {
  it('disables NOT toggle, AND/OR pills, and if input when disabled', () => {
    renderGroup(umbrellaSchema, groupWithItemAndNestedGroup(), vi.fn(), { disabled: true });

    const notButtons = screen.queryAllByText('NOT').map((n) => n.closest('button'));
    const andButtons = screen.queryAllByText('AND').map((n) => n.closest('button'));
    const orButtons = screen.queryAllByText('OR').map((n) => n.closest('button'));

    expect(notButtons.length).toBeGreaterThanOrEqual(1);
    expect(andButtons.length).toBeGreaterThanOrEqual(1);
    expect(orButtons.length).toBeGreaterThanOrEqual(1);

    for (const btn of [...notButtons, ...andButtons, ...orButtons]) {
      expect((btn as HTMLButtonElement | null)?.disabled).toBe(true);
    }

    const ifInputs = screen.queryAllByLabelText('Group if expression');
    expect(ifInputs.length).toBeGreaterThanOrEqual(1);
    for (const input of ifInputs) {
      expect((input as HTMLInputElement).disabled).toBe(true);
    }
  });

  it('disables add-condition and add-group buttons when disabled', () => {
    renderGroup(umbrellaSchema, groupWithItemAndNestedGroup(), vi.fn(), { disabled: true });

    const addConditionButtons = screen
      .queryAllByText('Add condition')
      .map((n) => n.closest('button'));
    const addGroupButtons = screen.queryAllByText('Add group').map((n) => n.closest('button'));

    expect(addConditionButtons.length).toBeGreaterThanOrEqual(1);
    expect(addGroupButtons.length).toBeGreaterThanOrEqual(1);

    for (const btn of [...addConditionButtons, ...addGroupButtons]) {
      expect((btn as HTMLButtonElement | null)?.disabled).toBe(true);
    }
  });

  it('does NOT render item delete buttons when disabled', () => {
    renderGroup(umbrellaSchema, groupWithItemAndNestedGroup(), vi.fn(), { disabled: true });

    // condition-item delete is gated by `!disabled`, so the affordance is absent entirely.
    expect(screen.queryAllByLabelText('Remove condition')).toHaveLength(0);
  });

  it('does NOT render nested-group delete button when disabled', () => {
    renderGroup(umbrellaSchema, groupWithItemAndNestedGroup(), vi.fn(), { disabled: true });

    // group delete is gated by `depth > 0 && onRemove && !disabled`.
    expect(screen.queryAllByTitle('Remove group')).toHaveLength(0);
  });

  it('does NOT render drag handles when disabled (even with draggable: true)', () => {
    const { container } = renderGroup(umbrellaSchema, groupWithItemAndNestedGroup(), vi.fn(), {
      disabled: true,
    });

    // drag handle is gated by `draggable && !disabled`, so listeners/handle are absent.
    expect(container.querySelector('[data-dnd-listeners="true"]')).toBeNull();
    expect(container.querySelector('.cursor-grab')).toBeNull();
    expect(screen.queryAllByLabelText('Reorder condition')).toHaveLength(0);
  });

  it('a disabled click on any affordance does not mutate value (no onChange fired)', () => {
    const onChange = vi.fn();
    renderGroup(umbrellaSchema, groupWithItemAndNestedGroup(), onChange, { disabled: true });

    // Clicking disabled buttons must not produce a value mutation.
    fireEvent.click(screen.queryAllByText('NOT')[0]);
    fireEvent.click(screen.queryAllByText('Add condition')[0]);
    fireEvent.click(screen.queryAllByText('Add group')[0]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('control: the same affordances ARE present/enabled when NOT disabled (proves the test is meaningful)', () => {
    const { container } = renderGroup(umbrellaSchema, groupWithItemAndNestedGroup(), vi.fn(), {
      disabled: false,
    });

    expect(screen.queryAllByText('NOT').length).toBeGreaterThanOrEqual(1);
    const andEnabled = screen
      .queryAllByText('AND')
      .map((n) => n.closest('button'))
      .some((btn) => !(btn as HTMLButtonElement | null)?.disabled);
    expect(andEnabled).toBe(true);

    // delete affordances are present when enabled.
    expect(screen.queryAllByLabelText('Remove condition').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryAllByTitle('Remove group').length).toBeGreaterThanOrEqual(1);
    expect(container.querySelector('[data-dnd-listeners="true"]')).not.toBeNull();
  });
});
