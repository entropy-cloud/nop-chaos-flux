/**
 * Plan 462 (2026-08-23): extracted the inline `propContracts` blocks
 * for `input.tsx` renderers into this sibling module so the parent
 * file stays under the 710-line lint ceiling. The companion
 * `formFieldContracts` shared array (readOnly / required / labelAlign)
 * lives in `field-utils/field-reading.tsx`; the per-input contracts
 * below are input-specific (select, checkbox, radio-group, etc.).
 *
 * Each input renderer's `propContracts` is built as
 * `{ ...formFieldContracts, ...selectSpecificContracts }` so the
 * shared base stays in one place.
 */
import type { RendererPropContract } from '@nop-chaos/flux-core';

export const selectSpecificContracts: Record<string, RendererPropContract> = {
  multiple: { displayName: 'Multiple', shape: { kind: 'boolean' } },
  searchable: { displayName: 'Searchable', shape: { kind: 'boolean' } },
  clearable: { displayName: 'Clearable', shape: { kind: 'boolean' } },
  virtual: { displayName: 'Virtual', shape: { kind: 'boolean' } },
  searchMergeMode: {
    displayName: 'Search Merge Mode',
    shape: {
      kind: 'union',
      anyOf: [{ kind: 'literal', value: 'append' }, { kind: 'literal', value: 'replace' }],
    },
    editorType: 'select',
    defaultValue: 'append',
  },
};

export const checkboxSpecificContracts: Record<string, RendererPropContract> = {
  shape: {
    displayName: 'Shape',
    shape: {
      kind: 'union',
      anyOf: [{ kind: 'literal', value: 'square' }, { kind: 'literal', value: 'circle' }],
    },
    editorType: 'select',
    defaultValue: 'square',
  },
};

export const radioGroupSpecificContracts: Record<string, RendererPropContract> = {
  direction: {
    displayName: 'Direction',
    shape: {
      kind: 'union',
      anyOf: [{ kind: 'literal', value: 'horizontal' }, { kind: 'literal', value: 'vertical' }],
    },
    editorType: 'select',
    defaultValue: 'horizontal',
  },
};

export const checkboxGroupSpecificContracts: Record<string, RendererPropContract> = {
  checkAll: { displayName: 'Check All', shape: { kind: 'boolean' } },
  direction: {
    displayName: 'Direction',
    shape: {
      kind: 'union',
      anyOf: [{ kind: 'literal', value: 'horizontal' }, { kind: 'literal', value: 'vertical' }],
    },
    editorType: 'select',
    defaultValue: 'horizontal',
  },
};

export const buttonGroupSelectSpecificContracts: Record<string, RendererPropContract> = {
  multiple: { displayName: 'Multiple', shape: { kind: 'boolean' } },
  direction: {
    displayName: 'Direction',
    shape: {
      kind: 'union',
      anyOf: [{ kind: 'literal', value: 'horizontal' }, { kind: 'literal', value: 'vertical' }],
    },
    editorType: 'select',
    defaultValue: 'horizontal',
  },
};

export const inputNumberSpecificContracts: Record<string, RendererPropContract> = {
  precisionMode: {
    displayName: 'Precision Mode',
    shape: {
      kind: 'union',
      anyOf: [
        { kind: 'literal', value: 'round' },
        { kind: 'literal', value: 'truncate' },
        { kind: 'literal', value: 'ceil' },
        { kind: 'literal', value: 'floor' },
      ],
    },
    editorType: 'select',
    defaultValue: 'round',
  },
};
