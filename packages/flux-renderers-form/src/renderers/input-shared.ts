/**
 * Plan 462 (2026-08-23): extracted the inline capability-contract arrays
 * + the shared `validate` / `searchSource` propContracts for `input.tsx`
 * into this sibling module so the parent file stays under the 710-line
 * lint ceiling. Imports from `./input-contracts.js` (per-renderer
 * specific contracts) compose with `formFieldContracts` (shared base)
 * in the parent.
 */
import type { RendererPropContract } from '@nop-chaos/flux-core';

export const SCALAR_INPUT_CAPABILITY_CONTRACTS = [
  {
    handle: 'clear',
    displayName: 'Clear',
    description: 'Clear the field value to its empty representation (empty string).',
  },
  {
    handle: 'reset',
    displayName: 'Reset',
    description: 'Restore the field to its initial value captured at mount.',
  },
  {
    handle: 'focus',
    displayName: 'Focus',
    description: 'Focus the underlying input element.',
  },
] as const;

export const FOCUS_ONLY_CAPABILITY_CONTRACTS = [
  {
    handle: 'focus',
    displayName: 'Focus',
    description: 'Focus the control.',
  },
] as const;

export const SELECT_CAPABILITY_CONTRACTS = [
  {
    handle: 'clear',
    displayName: 'Clear',
    description: 'Clear the selection (single-select to undefined, multi-select to []).',
  },
  {
    handle: 'focus',
    displayName: 'Focus',
    description: 'Focus the select trigger element.',
  },
  {
    handle: 'open',
    displayName: 'Open',
    description: 'Open the select dropdown menu.',
  },
] as const;

/**
 * Async validation configuration contract: `validate.action` is an action
 * value (whole-value template preservation via schema-definition actionValue).
 */
export const validatePropContract: RendererPropContract = {
  shape: {
    kind: 'object',
    fields: {
      action: { kind: 'schema-definition', fieldRules: {}, actionValue: true },
      debounce: { kind: 'number' },
      message: { kind: 'string' },
    },
    optional: ['action', 'debounce', 'message'],
  },
  displayName: 'Validate',
  description:
    'Async validation configuration: { action, debounce, message }. action is preserved as a template (not row-scope evaluated).',
};

/**
 * Remote search action contract: the whole `searchSource` value is an
 * ActionSchema preserved as a template (actionValue).
 */
export const searchSourcePropContract: RendererPropContract = {
  shape: { kind: 'schema-definition', fieldRules: {}, actionValue: true },
  displayName: 'Search Source',
  description:
    'On-demand remote search action (ActionSchema). Preserved as a template; ${searchQuery} is evaluated at dispatch time.',
};
