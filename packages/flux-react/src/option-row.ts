/**
 * Option-row interaction-state contract (D1 G-F primitive).
 *
 * Shared state→marker mapping for row-like renderers. The schema-facing field
 * family is `optionRow` (see `docs/references/renderer-interfaces.md`
 * §Option-Row Interaction-State Contract). This module is pure logic: no CSS,
 * no React, no scope writes.
 */

export interface OptionRowStateInput {
  selected?: boolean;
  disabled?: boolean;
}

export interface OptionRowStateAttributes {
  'data-state': string | undefined;
  'data-selected': 'true' | undefined;
  'aria-selected': 'true' | 'false';
  'aria-disabled': 'true' | undefined;
}

function optionRowStateTokens(state: OptionRowStateInput): string[] {
  const tokens: string[] = [];
  if (state.selected) tokens.push('selected');
  if (state.disabled) tokens.push('disabled');
  return tokens;
}

/** Space-joined `data-state` token set, or undefined when no state is active. */
export function getOptionRowStateTokens(state: OptionRowStateInput): string | undefined {
  const tokens = optionRowStateTokens(state);
  return tokens.length > 0 ? tokens.join(' ') : undefined;
}

/** Full standard marker set for an option-row element (row carriers only). */
export function getOptionRowStateAttributes(state: OptionRowStateInput): OptionRowStateAttributes {
  return {
    'data-state': getOptionRowStateTokens(state),
    'data-selected': state.selected ? 'true' : undefined,
    'aria-selected': state.selected ? 'true' : 'false',
    'aria-disabled': state.disabled ? 'true' : undefined,
  };
}

/**
 * Whether an item value matches the resolved optionRow.value binding.
 * Empty/missing bindings never match (opt-row-value-invalid fallback); array
 * bindings use any-match semantics; comparison is string-coerced.
 */
export function optionRowValueMatches(itemValue: unknown, binding: unknown): boolean {
  if (binding === undefined || binding === null || binding === '') return false;
  if (itemValue === undefined || itemValue === null) return false;
  if (Array.isArray(binding)) {
    return binding.some(
      (entry) => entry !== undefined && entry !== null && entry !== '' && String(entry) === String(itemValue),
    );
  }
  return String(binding) === String(itemValue);
}

/** Equality for memo comparators over resolved optionRow.value bindings. */
export function optionRowBindingEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((entry, index) => entry === b[index]);
  }
  return false;
}
