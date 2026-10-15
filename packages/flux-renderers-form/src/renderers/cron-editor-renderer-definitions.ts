import type { RegisteredRendererDefinition, SchemaFieldRule } from '@nop-chaos/flux-core';
import { formFieldContractRules } from '../field-utils.js';
import { createFieldValidation } from './input.js';
import { validateCronEditorSchema } from './cron-editor-schema-validator.js';
import { CronEditorRenderer } from './cron-editor-renderer.js';

/**
 * cron-editor（cron 轨道 C5/C6，plan 540/541）：定时计划编辑字段。contract
 * 实挂全部七个 prop：v1 四 prop（mode/showPreview/previewCount/clearable）+ C6
 * 区块三 prop（showRepeat/showRange/presets，array shape 契约见 presets 项）。
 * （RM-4 plan 606：原 propContracts 记录逐键吸收进 fields contract。）
 */
const cronFieldRules: SchemaFieldRule[] = [
  {
    key: 'mode',
    kind: 'prop',
    valueType: 'string',
    contract: {
      displayName: 'Mode',
      description: 'Editor mode: visual (segment editor) or text (raw expression).',
      shape: {
        kind: 'union',
        anyOf: [
          { kind: 'literal', value: 'visual' },
          { kind: 'literal', value: 'text' },
        ],
      },
      editorType: 'select',
      defaultValue: 'visual',
    },
  },
  {
    key: 'showPreview',
    kind: 'prop',
    valueType: 'boolean',
    contract: {
      displayName: 'Show Preview',
      description: 'Show the next-fire preview list.',
      shape: { kind: 'boolean' },
      editorType: 'switch',
      defaultValue: true,
    },
  },
  {
    key: 'previewCount',
    kind: 'prop',
    valueType: 'number',
    contract: {
      displayName: 'Preview Count',
      description: 'Number of preview entries (clamped to 1-20, default 5).',
      shape: { kind: 'number' },
      editorType: 'number',
      defaultValue: 5,
    },
  },
  {
    key: 'clearable',
    kind: 'prop',
    valueType: 'boolean',
    contract: {
      displayName: 'Clearable',
      description: 'Show the clear affordance.',
      shape: { kind: 'boolean' },
      editorType: 'switch',
    },
  },
  {
    key: 'showRepeat',
    kind: 'prop',
    valueType: 'boolean',
    contract: {
      displayName: 'Show Repeat',
      description: 'Show the repeat (every N days/weeks + anchor) block.',
      shape: { kind: 'boolean' },
      editorType: 'switch',
      defaultValue: true,
    },
  },
  {
    key: 'showRange',
    kind: 'prop',
    valueType: 'boolean',
    contract: {
      displayName: 'Show Range',
      description: 'Show the range (start/end/count) block.',
      shape: { kind: 'boolean' },
      editorType: 'switch',
      defaultValue: true,
    },
  },
  {
    key: 'presets',
    kind: 'prop',
    contract: {
      displayName: 'Presets',
      description: 'Preset schedule values; overrides the built-in list.',
      shape: {
        kind: 'array',
        item: {
          kind: 'object',
          fields: {
            label: { kind: 'string' },
            value: { kind: 'record', value: { kind: 'unknown' } },
          },
        },
      },
    },
  },
];

export const cronEditorRendererDefinition: RegisteredRendererDefinition = {
  type: 'cron-editor',
  sourcePackage: '@nop-chaos/flux-renderers-form',
  fields: [...formFieldContractRules, ...cronFieldRules],
  validation: createFieldValidation(),
  schemaValidator: validateCronEditorSchema,
  componentCapabilityContracts: [
    {
      handle: 'clear',
      displayName: 'Clear',
      description: 'Clear the schedule value (commit undefined).',
    },
    {
      handle: 'reset',
      displayName: 'Reset',
      description: 'Restore the field value to its current bound value.',
    },
    {
      handle: 'focus',
      displayName: 'Focus',
      description: 'Focus the primary input of the current mode.',
    },
  ],
  wrap: true,
  component: CronEditorRenderer,
};
