import type { RendererDefinition, SchemaFieldRule } from '@nop-chaos/flux-core';
import { formFieldContracts, formFieldRules } from '../../field-utils.js';
import { createFieldValidation, validateInputFieldSchema } from '../input.js';
import { orgSelectSpecificContracts } from '../input-contracts.js';
import { UserSelectRenderer } from './user-select-renderer.js';
import { DepartmentSelectRenderer } from './department-select-renderer.js';

/**
 * Missing-components L2.1 (plan 505): user-select / department-select —
 * the org-family pickers consuming `docs/architecture/org-data-source-protocol.md`.
 * Sibling definitions module (form-atoms precedent) so `renderers/input.tsx`
 * stays under the 700-line ceiling.
 */
const orgFieldRules: SchemaFieldRule[] = [
  { key: 'options', kind: 'prop' },
  { key: 'sourceChildren', kind: 'prop' },
  { key: 'sourceSearch', kind: 'prop' },
  { key: 'sourceResolve', kind: 'prop' },
  { key: 'multiple', kind: 'prop', valueType: 'boolean' },
  { key: 'searchable', kind: 'prop', valueType: 'boolean' },
  { key: 'searchMergeMode', kind: 'prop' },
  { key: 'selectableTypes', kind: 'prop' },
  { key: 'pageSize', kind: 'prop', valueType: 'number' },
  { key: 'extraParams', kind: 'prop' },
];

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

export const orgSelectRendererDefinitions: RendererDefinition[] = [
  {
    type: 'user-select',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    propContracts: {
      ...formFieldContracts,
      ...orgSelectSpecificContracts,
    },
    fields: [...formFieldRules, ...orgFieldRules],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: orgSelectCapabilityContracts,
    wrap: true,
    component: UserSelectRenderer,
  },
  {
    type: 'department-select',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    propContracts: {
      ...formFieldContracts,
      ...orgSelectSpecificContracts,
    },
    fields: [...formFieldRules, ...orgFieldRules],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: orgSelectCapabilityContracts,
    wrap: true,
    component: DepartmentSelectRenderer,
  },
];
