import type { RegisteredRendererDefinition, SchemaFieldRule } from '@nop-chaos/flux-core';
import { formFieldContractRules } from '../../field-utils.js';
import { createFieldValidation, validateInputFieldSchema } from '../input.js';
import { orgSelectSpecificContracts } from '../input-contracts.js';
import { UserSelectRenderer } from './user-select-renderer.js';
import { DepartmentSelectRenderer } from './department-select-renderer.js';
import { InputCityRenderer } from './region-renderer.js';

/**
 * Missing-components L2.1 (plan 505): user-select / department-select —
 * the org-family pickers consuming `docs/architecture/org-data-source-protocol.md`.
 * Sibling definitions module (form-atoms precedent) so `renderers/input.tsx`
 * stays under the 700-line ceiling.
 */
const orgFieldRules: SchemaFieldRule[] = [
  { key: 'options', kind: 'prop' },
  { key: 'sourceChildren', kind: 'prop', contract: orgSelectSpecificContracts.sourceChildren },
  { key: 'sourceSearch', kind: 'prop', contract: orgSelectSpecificContracts.sourceSearch },
  { key: 'sourceResolve', kind: 'prop', contract: orgSelectSpecificContracts.sourceResolve },
  { key: 'multiple', kind: 'prop', valueType: 'boolean', contract: orgSelectSpecificContracts.multiple },
  { key: 'searchable', kind: 'prop', valueType: 'boolean', contract: orgSelectSpecificContracts.searchable },
  { key: 'clearable', kind: 'prop', valueType: 'boolean' },
  { key: 'searchMergeMode', kind: 'prop', contract: orgSelectSpecificContracts.searchMergeMode },
  { key: 'selectableTypes', kind: 'prop', contract: orgSelectSpecificContracts.selectableTypes },
  { key: 'pageSize', kind: 'prop', valueType: 'number', contract: orgSelectSpecificContracts.pageSize },
  { key: 'extraParams', kind: 'prop', contract: orgSelectSpecificContracts.extraParams },
];

// input-city (plan 506 closure r2 Major-2): the accepted-schema-keys face
// must match the narrowed type — the four OrgSelect-only keys are dropped so
// leftover props (e.g. after switching type from user-select) get unknown-
// property diagnostics instead of silently no-oping.
const inputCityFieldRules: SchemaFieldRule[] = orgFieldRules.filter(
  (rule) => rule.key != null && !['sourceSearch', 'multiple', 'searchable', 'searchMergeMode'].includes(rule.key),
);

const orgSelectCapabilityContracts = [
  {
    handle: 'clear',
    displayName: 'Clear',
    description: 'Clear the selection (single-select to undefined, multi-select to []).',
  },
  {
    handle: 'reset',
    displayName: 'Reset',
    description: 'Restore the picker value to its current bound value.',
  },
  {
    handle: 'focus',
    displayName: 'Focus',
    description: 'Focus the org picker trigger element.',
  },
  {
    handle: 'open',
    displayName: 'Open',
    description: 'Open the org picker panel.',
  },
] as const;

export const orgSelectRendererDefinitions: RegisteredRendererDefinition[] = [
  {
    type: 'user-select',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: [...formFieldContractRules, ...orgFieldRules],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: orgSelectCapabilityContracts,
    wrap: true,
    component: UserSelectRenderer,
  },
  {
    type: 'department-select',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: [...formFieldContractRules, ...orgFieldRules],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: orgSelectCapabilityContracts,
    wrap: true,
    component: DepartmentSelectRenderer,
  },
];

/**
 * Missing-components L2.2 (plan 506): input-city — region cascade picker on
 * the shared org data surface (protocol §3: every level selectable by
 * default; orgDepth = province 0 / city 1 / district 2).
 */
export const inputCityRendererDefinition: RegisteredRendererDefinition = {
  type: 'input-city',
  sourcePackage: '@nop-chaos/flux-renderers-form',
  validation: createFieldValidation(),
  schemaValidator: validateInputFieldSchema,
  componentCapabilityContracts: orgSelectCapabilityContracts,
  fields: [...formFieldContractRules, ...inputCityFieldRules],
  wrap: true,
  component: InputCityRenderer,
};
