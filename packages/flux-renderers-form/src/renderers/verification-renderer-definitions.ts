import type { RegisteredRendererDefinition, SchemaFieldRule } from '@nop-chaos/flux-core';
import { formFieldContractRules } from '../field-utils.js';
import { createFieldValidation, validateInputFieldSchema } from './input.js';
import { VerificationCodeRenderer } from './verification-code-renderer.js';

/**
 * Missing-components L2.4 (plan 508): verification-code — OTP code field on
 * the ui InputOTP primitive (registration debt). Value invariant: input
 * length < `length` ⇔ `undefined`.
 */
const verificationFieldRules: SchemaFieldRule[] = [
  {
    key: 'length',
    kind: 'prop',
    valueType: 'number',
    contract: {
      displayName: 'Length',
      shape: { kind: 'number' },
      description: 'Cell count (defaults to 6; non-positive/non-integer falls back to 6).',
      editorType: 'number',
      defaultValue: 6,
    },
  },
  { key: 'masked', kind: 'prop', valueType: 'boolean', contract: { displayName: 'Masked', shape: { kind: 'boolean' } } },
];

export const inputVerificationRendererDefinition: RegisteredRendererDefinition = {
  type: 'verification-code',
  sourcePackage: '@nop-chaos/flux-renderers-form',
  fields: [...formFieldContractRules, ...verificationFieldRules],
  validation: createFieldValidation(),
  schemaValidator: validateInputFieldSchema,
  componentCapabilityContracts: [
    {
      handle: 'clear',
      displayName: 'Clear',
      description: 'Clear the code and commit undefined.',
    },
    {
      handle: 'reset',
      displayName: 'Reset',
      description: 'Restore the field value to its current bound value.',
    },
    {
      handle: 'focus',
      displayName: 'Focus',
      description: 'Focus the first code cell.',
    },
  ],
  wrap: true,
  component: VerificationCodeRenderer,
};
