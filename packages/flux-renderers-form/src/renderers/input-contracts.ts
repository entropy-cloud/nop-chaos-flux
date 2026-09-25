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
  precision: {
    displayName: 'Precision',
    shape: { kind: 'number' },
    description: 'Number of decimal places to display.',
    editorType: 'number',
  },
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

export const sliderSpecificContracts: Record<string, RendererPropContract> = {
  min: {
    displayName: 'Min',
    shape: { kind: 'number' },
    editorType: 'number',
    defaultValue: 0,
  },
  max: {
    displayName: 'Max',
    shape: { kind: 'number' },
    editorType: 'number',
    defaultValue: 100,
  },
  step: {
    displayName: 'Step',
    shape: { kind: 'number' },
    description: 'Drag increment; must be > 0 (falls back to 1).',
    editorType: 'number',
    defaultValue: 1,
  },
};

export const ratingSpecificContracts: Record<string, RendererPropContract> = {
  count: {
    displayName: 'Count',
    shape: { kind: 'number' },
    description: 'Star count (clamped to >= 1).',
    editorType: 'number',
    defaultValue: 5,
  },
  allowHalf: { displayName: 'Allow Half', shape: { kind: 'boolean' } },
  allowClear: { displayName: 'Allow Clear', shape: { kind: 'boolean' } },
};

export const inputColorSpecificContracts: Record<string, RendererPropContract> = {
  valueFormat: {
    displayName: 'Value Format',
    shape: {
      kind: 'union',
      anyOf: [{ kind: 'literal', value: 'hex' }, { kind: 'literal', value: 'rgba' }],
    },
    description: 'Commit format: hex (alpha dropped) or alpha-preserving string.',
    editorType: 'select',
    defaultValue: 'hex',
  },
  presetColors: {
    displayName: 'Preset Colors',
    shape: { kind: 'array', item: { kind: 'string' } },
    description: 'Preset swatches (hex/rgba strings) shown above the input.',
  },
};

const orgSourceContract = (displayName: string, description: string): RendererPropContract => ({
  shape: { kind: 'schema-definition', fieldRules: {}, actionValue: true },
  displayName,
  description,
});

export const orgSelectSpecificContracts: Record<string, RendererPropContract> = {
  multiple: { displayName: 'Multiple', shape: { kind: 'boolean' } },
  searchable: { displayName: 'Searchable', shape: { kind: 'boolean' } },
  searchMergeMode: {
    displayName: 'Search Merge Mode',
    shape: {
      kind: 'union',
      anyOf: [{ kind: 'literal', value: 'append' }, { kind: 'literal', value: 'replace' }],
    },
    editorType: 'select',
    defaultValue: 'append',
  },
  selectableTypes: {
    displayName: 'Selectable Types',
    shape: { kind: 'array', item: { kind: 'string' } },
    description: 'Node types that can be selected; untyped nodes are selectable. Others stay navigable only.',
  },
  pageSize: {
    displayName: 'Page Size',
    shape: { kind: 'number' },
    editorType: 'number',
    defaultValue: 50,
  },
  sourceChildren: orgSourceContract(
    'Children Source',
    'Lazy-loads one level of children (ActionSchema). Scope vars: orgNodeId (root "")/orgDepth/orgPage/orgPageSize.',
  ),
  sourceSearch: orgSourceContract(
    'Search Source',
    'Flat keyword search (ActionSchema). Scope vars: searchQuery/orgPage/orgPageSize. NOTE: distinct from select `searchSource`.',
  ),
  sourceResolve: orgSourceContract(
    'Resolve Source',
    'Echo resolution (ActionSchema). Scope var: orgValues (array of ids). Returns full nodes for display.',
  ),
  extraParams: {
    displayName: 'Extra Params',
    shape: { kind: 'object', fields: {} },
    description: 'Injected into every request scope; string values are form-scope expressions. Keys override protocol vars.',
  },
};

/**
 * input-city (plan 506) narrows the org family contract: search / multiple /
 * searchable / searchMergeMode do not exist on the type (Omit in
 * `InputCitySchema`) — the authored-props contract face must exclude them
 * too, or designers could author no-op fields.
 */
const {
  multiple: _multiple,
  searchable: _searchable,
  searchMergeMode: _searchMergeMode,
  sourceSearch: _sourceSearch,
  ...inputCityNarrowed
} = orgSelectSpecificContracts;

export const inputCitySpecificContracts: Record<string, RendererPropContract> = inputCityNarrowed;

