import type { RendererDefinition } from '@nop-chaos/flux-core';
import {
  SCALAR_INPUT_CAPABILITY_CONTRACTS,
} from './input-shared.js';
import { validateInputFieldSchema, createFieldValidation } from './input.js';
import {
  formFieldContracts,
  formFieldRules,
} from '../field-utils.js';
import {
  inputColorSpecificContracts,
  ratingSpecificContracts,
  sliderSpecificContracts,
} from './input-contracts.js';
import { SliderRenderer } from './slider-renderer.js';
import { RatingRenderer } from './rating-renderer.js';
import { InputColorRenderer } from './input-color-renderer.js';

/**
 * Missing-components L1 form atoms (plan 503): slider / rating / input-color.
 * Registered as a sibling definitions module (date-renderer-definitions
 * precedent) so `renderers/input.tsx` stays under the 700-line check ceiling.
 */
export const formAtomsRendererDefinitions: RendererDefinition[] = [
  {
    type: 'slider',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    propContracts: {
      ...formFieldContracts,
      ...sliderSpecificContracts,
    },
    fields: [
      ...formFieldRules,
      { key: 'min', kind: 'prop' },
      { key: 'max', kind: 'prop' },
      { key: 'step', kind: 'prop' },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: [
      {
        handle: 'clear',
        displayName: 'Clear',
        description: 'Clear the slider value to undefined.',
      },
      {
        handle: 'reset',
        displayName: 'Reset',
        description: 'Restore the slider value to its current bound value.',
      },
      {
        handle: 'focus',
        displayName: 'Focus',
        description: 'Focus the slider thumb element.',
      },
    ],
    wrap: true,
    component: SliderRenderer,
  },
  {
    type: 'rating',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    propContracts: {
      ...formFieldContracts,
      ...ratingSpecificContracts,
    },
    fields: [
      ...formFieldRules,
      { key: 'count', kind: 'prop' },
      { key: 'allowHalf', kind: 'prop', valueType: 'boolean' },
      { key: 'allowClear', kind: 'prop', valueType: 'boolean' },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: SCALAR_INPUT_CAPABILITY_CONTRACTS,
    wrap: true,
    component: RatingRenderer,
  },
  {
    type: 'input-color',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    propContracts: {
      ...formFieldContracts,
      ...inputColorSpecificContracts,
    },
    fields: [
      ...formFieldRules,
      { key: 'valueFormat', kind: 'prop' },
      { key: 'presetColors', kind: 'prop' },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: SCALAR_INPUT_CAPABILITY_CONTRACTS,
    wrap: true,
    component: InputColorRenderer,
  },
];
