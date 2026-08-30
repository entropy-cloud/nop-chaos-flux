import type React from 'react';
import { getIn } from '@nop-chaos/flux-core';
import {
  getOptionRowStateAttributes,
  optionRowBindingEquals,
  optionRowValueMatches,
  type OptionRowStateAttributes,
} from '@nop-chaos/flux-react';
import type { OptionRowConfig, TableSchema } from '../schemas.js';

/**
 * Whether a row click landed on an interactive control and therefore must NOT
 * trigger selection toggle. Mirrors amis `isClickOnInput`.
 */
export function isClickOnInput(event: React.MouseEvent): boolean {
  const target = event.target as HTMLElement | null;
  if (!target) return false;
  const tag = target.tagName;
  if (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    tag === 'BUTTON' ||
    tag === 'A'
  ) {
    return true;
  }
  // Checkbox/Switch/Radio rendered as role-based widgets.
  const role = target.getAttribute('role');
  if (role === 'checkbox' || role === 'switch' || role === 'radio') {
    return true;
  }
  // Closest interactive ancestor covers icon spans nested inside buttons.
  if (target.closest('button, a, input, textarea, select, [role="checkbox"], [role="switch"], [role="radio"]')) {
    return true;
  }
  return false;
}


export interface TableRowOptionState {
  /** Contract declared on the schema — gates every marker output (opt-row-compat). */
  active: boolean;
  selected: boolean;
  selectedClass?: string;
  /** Standard attribute set (data-state/data-selected/aria-selected/aria-disabled). */
  state: OptionRowStateAttributes | undefined;
}

/**
 * D1 option-row marker driver for table rows: explicit `optionRow.value`
 * binding > internal selection. Without the contract nothing emits.
 */
export function resolveTableRowOptionState(input: {
  schemaProps: TableSchema;
  record: unknown;
  isSelected: boolean;
  ownerDisabled: boolean;
}): TableRowOptionState {
  const { schemaProps, record, isSelected, ownerDisabled } = input;
  const optionRow = schemaProps.optionRow;
  if (optionRow === null || typeof optionRow !== 'object') {
    return { active: false, selected: false, state: undefined };
  }
  const binding = optionRow.value;
  const hasBinding = binding !== undefined && binding !== null && binding !== '';
  const valueField =
    typeof optionRow.valueField === 'string' && optionRow.valueField
      ? optionRow.valueField
      : (schemaProps.rowKey ?? 'id');
  const selected = hasBinding
    ? optionRowValueMatches(getIn(record as Record<string, unknown>, valueField), binding)
    : isSelected;
  return {
    active: true,
    selected,
    selectedClass: typeof optionRow.selectedClass === 'string' ? optionRow.selectedClass : undefined,
    state: getOptionRowStateAttributes({ selected, disabled: ownerDisabled }),
  };
}

/** Spread-ready option-row attributes for a TableRow element. */
export function tableRowOptionRowProps(state: TableRowOptionState): Record<string, string | undefined> {
  if (!state.active) {
    return {};
  }
  return {
    'data-option-row': 'true',
    'data-state': state.state?.['data-state'],
    'data-selected': state.state?.['data-selected'],
    'aria-selected': state.state?.['aria-selected'],
    'aria-disabled': state.state?.['aria-disabled'],
  };
}

/** Memo-comparator equality over the optionRow config slice. */
export function optionRowConfigEquals(
  a: OptionRowConfig | undefined,
  b: OptionRowConfig | undefined,
): boolean {
  if (a === b) {
    return true;
  }
  return (
    a != null &&
    b != null &&
    optionRowBindingEquals(a.value, b.value) &&
    a.valueField === b.valueField &&
    a.selectedClass === b.selectedClass
  );
}
