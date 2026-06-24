import type { RendererDefinition, SchemaFieldRule } from '@nop-chaos/flux-core';
import { InputDateRenderer } from './input-date-renderer.js';
import { InputDatetimeRenderer } from './input-datetime-renderer.js';
import { InputTimeRenderer } from './input-time-renderer.js';
import { DateRangeRenderer } from './date-range-renderer.js';
import { PeriodRenderer } from './period-renderers.js';
import { formFieldRules } from '../field-utils.js';
import { createFieldValidation } from './input.js';
import { validateInputFieldSchema } from './input.js';

export const dateFieldRules: SchemaFieldRule[] = [
  { key: 'valueFormat', kind: 'prop' },
  { key: 'displayFormat', kind: 'prop' },
  { key: 'utc', kind: 'prop', valueType: 'boolean' },
  { key: 'clearable', kind: 'prop', valueType: 'boolean' },
  { key: 'placeholder', kind: 'prop' },
  { key: 'minDate', kind: 'prop' },
  { key: 'maxDate', kind: 'prop' },
];

export const periodFieldRules: SchemaFieldRule[] = [
  { key: 'selectionMode', kind: 'prop' },
  { key: 'valueFormat', kind: 'prop' },
  { key: 'displayFormat', kind: 'prop' },
  { key: 'delimiter', kind: 'prop' },
  { key: 'clearable', kind: 'prop', valueType: 'boolean' },
  { key: 'placeholder', kind: 'prop' },
  { key: 'minDate', kind: 'prop' },
  { key: 'maxDate', kind: 'prop' },
  { key: 'shortcuts', kind: 'prop' },
];

const FOCUS_CAPABILITY_CONTRACTS = [
  {
    handle: 'clear',
    displayName: 'Clear',
    description: 'Clear the date value to undefined.',
  },
  {
    handle: 'focus',
    displayName: 'Focus',
    description: 'Focus the date picker trigger.',
  },
] as const;

export const dateRendererDefinitions: RendererDefinition[] = [
  {
    type: 'input-date',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: [...formFieldRules, ...dateFieldRules],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: FOCUS_CAPABILITY_CONTRACTS,
    wrap: true,
    component: InputDateRenderer,
  },
  {
    type: 'input-datetime',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: [
      ...formFieldRules,
      { key: 'valueFormat', kind: 'prop' },
      { key: 'displayFormat', kind: 'prop' },
      { key: 'timeFormat', kind: 'prop' },
      { key: 'utc', kind: 'prop', valueType: 'boolean' },
      { key: 'clearable', kind: 'prop', valueType: 'boolean' },
      { key: 'placeholder', kind: 'prop' },
      { key: 'minDate', kind: 'prop' },
      { key: 'maxDate', kind: 'prop' },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: FOCUS_CAPABILITY_CONTRACTS,
    wrap: true,
    component: InputDatetimeRenderer,
  },
  {
    type: 'input-time',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: [
      ...formFieldRules,
      { key: 'valueFormat', kind: 'prop' },
      { key: 'displayFormat', kind: 'prop' },
      { key: 'clearable', kind: 'prop', valueType: 'boolean' },
      { key: 'placeholder', kind: 'prop' },
      { key: 'minTime', kind: 'prop' },
      { key: 'maxTime', kind: 'prop' },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: FOCUS_CAPABILITY_CONTRACTS,
    wrap: true,
    component: InputTimeRenderer,
  },
  {
    type: 'date-range',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: [
      ...formFieldRules,
      { key: 'rangeKind', kind: 'prop' },
      { key: 'valueFormat', kind: 'prop' },
      { key: 'displayFormat', kind: 'prop' },
      { key: 'delimiter', kind: 'prop' },
      { key: 'utc', kind: 'prop', valueType: 'boolean' },
      { key: 'clearable', kind: 'prop', valueType: 'boolean' },
      { key: 'placeholder', kind: 'prop' },
      { key: 'minDate', kind: 'prop' },
      { key: 'maxDate', kind: 'prop' },
      { key: 'shortcuts', kind: 'prop' },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: FOCUS_CAPABILITY_CONTRACTS,
    wrap: true,
    component: DateRangeRenderer,
  },
  {
    type: 'input-month',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: [...formFieldRules, ...periodFieldRules],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: FOCUS_CAPABILITY_CONTRACTS,
    wrap: true,
    component: PeriodRenderer,
  },
  {
    type: 'input-quarter',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: [...formFieldRules, ...periodFieldRules],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: FOCUS_CAPABILITY_CONTRACTS,
    wrap: true,
    component: PeriodRenderer,
  },
  {
    type: 'input-year',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: [...formFieldRules, ...periodFieldRules],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: FOCUS_CAPABILITY_CONTRACTS,
    wrap: true,
    component: PeriodRenderer,
  },
];
