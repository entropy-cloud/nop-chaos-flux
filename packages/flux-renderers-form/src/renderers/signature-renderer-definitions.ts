import type { RegisteredRendererDefinition, SchemaFieldRule } from '@nop-chaos/flux-core';
import { formFieldContractRules } from '../field-utils.js';
import { createFieldValidation, validateInputFieldSchema } from './input.js';
import { signatureSpecificContracts } from './input-contracts.js';
import { InputSignatureRenderer } from './signature-renderer.js';

/**
 * Missing-components L2.3 (plan 507): input-signature — handwritten signature
 * canvas. Value = PNG data URL; zero strokes ⇔ undefined (值语义不变式).
 */
const signatureFieldRules: SchemaFieldRule[] = [
  { key: 'penColor', kind: 'prop', contract: signatureSpecificContracts.penColor },
  { key: 'penWidth', kind: 'prop', valueType: 'number', contract: signatureSpecificContracts.penWidth },
  { key: 'height', kind: 'prop', valueType: 'number', contract: signatureSpecificContracts.height },
  { key: 'backgroundColor', kind: 'prop', contract: signatureSpecificContracts.backgroundColor },
  { key: 'clearable', kind: 'prop', valueType: 'boolean', contract: signatureSpecificContracts.clearable },
];

export const inputSignatureRendererDefinition: RegisteredRendererDefinition = {
  type: 'input-signature',
  sourcePackage: '@nop-chaos/flux-renderers-form',
  fields: [...formFieldContractRules, ...signatureFieldRules],
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
    // P1-MA9.2-001 (plan 748): align declarations with SIGNATURE_METHODS.
    {
      handle: 'undo',
      displayName: 'Undo',
      description: 'Undo the last stroke.',
    },
    {
      handle: 'export',
      displayName: 'Export',
      description: 'Export the current signature as a PNG data URL.',
    },
  ],
  wrap: true,
  component: InputSignatureRenderer,
};
