import type { RendererDefinition, SchemaFieldRule } from '@nop-chaos/flux-core';
import { formFieldContracts, formFieldRules } from '../field-utils.js';
import { createFieldValidation, validateInputFieldSchema } from './input.js';
import { VerificationCodeRenderer } from './verification-code-renderer.js';

/**
 * Missing-components L2.4 (plan 508): verification-code — OTP code field on
 * the ui InputOTP primitive (registration debt). Value invariant: input
 * length < `length` ⇔ `undefined`.
 */
const verificationFieldRules: SchemaFieldRule[] = [
  { key: 'length', kind: 'prop', valueType: 'number' },
  { key: 'masked', kind: 'prop', valueType: 'boolean' },
];

export const inputVerificationRendererDefinition: RendererDefinition = {
  type: 'verification-code',
  sourcePackage: '@nop-chaos/flux-renderers-form',
  propContracts: {
    ...formFieldContracts,
    length: {
      displayName: 'Length',
      shape: { kind: 'number' },
      description: 'Cell count (defaults to 6; non-positive/non-integer falls back to 6).',
      editorType: 'number',
      defaultValue: 6,
    },
    masked: { displayName: 'Masked', shape: { kind: 'boolean' } },
  },
  fields: [...formFieldRules, ...verificationFieldRules],
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
