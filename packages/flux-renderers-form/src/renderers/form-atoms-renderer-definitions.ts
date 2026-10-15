import type { RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import {
  SCALAR_INPUT_CAPABILITY_CONTRACTS,
} from './input-shared.js';
import { validateInputFieldSchema, createFieldValidation } from './input.js';
import {
  formFieldContractRules,
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
export const formAtomsRendererDefinitions: RegisteredRendererDefinition[] = [
  {
    type: 'slider',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: [
      ...formFieldContractRules,
      { key: 'min', kind: 'prop', contract: sliderSpecificContracts.min },
      { key: 'max', kind: 'prop', contract: sliderSpecificContracts.max },
      { key: 'step', kind: 'prop', contract: sliderSpecificContracts.step },
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
    fields: [
      ...formFieldContractRules,
      { key: 'count', kind: 'prop', contract: ratingSpecificContracts.count },
      { key: 'allowHalf', kind: 'prop', valueType: 'boolean', contract: ratingSpecificContracts.allowHalf },
      { key: 'allowClear', kind: 'prop', valueType: 'boolean', contract: ratingSpecificContracts.allowClear },
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
    fields: [
      ...formFieldContractRules,
      { key: 'valueFormat', kind: 'prop', contract: inputColorSpecificContracts.valueFormat },
      { key: 'presetColors', kind: 'prop', contract: inputColorSpecificContracts.presetColors },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: SCALAR_INPUT_CAPABILITY_CONTRACTS,
    wrap: true,
    component: InputColorRenderer,
  },
];
