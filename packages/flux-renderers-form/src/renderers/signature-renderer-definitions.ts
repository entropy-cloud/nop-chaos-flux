import type { RendererDefinition, SchemaFieldRule } from '@nop-chaos/flux-core';
import { formFieldContracts, formFieldRules } from '../field-utils.js';
import { createFieldValidation, validateInputFieldSchema } from './input.js';
import { signatureSpecificContracts } from './input-contracts.js';
import { InputSignatureRenderer } from './signature-renderer.js';

/**
 * Missing-components L2.3 (plan 507): input-signature — handwritten signature
 * canvas. Value = PNG data URL; zero strokes ⇔ undefined (值语义不变式).
 */
const signatureFieldRules: SchemaFieldRule[] = [
  { key: 'penColor', kind: 'prop' },
  { key: 'penWidth', kind: 'prop', valueType: 'number' },
  { key: 'height', kind: 'prop', valueType: 'number' },
  { key: 'backgroundColor', kind: 'prop' },
  { key: 'clearable', kind: 'prop', valueType: 'boolean' },
];

export const inputSignatureRendererDefinition: RendererDefinition = {
  type: 'input-signature',
  sourcePackage: '@nop-chaos/flux-renderers-form',
  propContracts: {
    ...formFieldContracts,
    ...signatureSpecificContracts,
  },
  fields: [...formFieldRules, ...signatureFieldRules],
  validation: createFieldValidation(),
  schemaValidator: validateInputFieldSchema,
  componentCapabilityContracts: [
    {
      handle: 'clear',
      displayName: 'Clear',
      description: 'Clear all strokes and commit undefined.',
    },
    {
      handle: 'reset',
      displayName: 'Reset',
      description: 'Restore the field value to its current bound value.',
    },
  ],
  wrap: true,
  component: InputSignatureRenderer,
};
