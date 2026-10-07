import type { RendererDefinition, SchemaFieldRule } from '@nop-chaos/flux-core';
import { formFieldContracts, formFieldRules } from '../field-utils.js';
import { createFieldValidation } from './input.js';
import { validateCronEditorSchema } from './cron-editor-schema-validator.js';
import { CronEditorRenderer } from './cron-editor-renderer.js';

/**
 * cron-editor（cron 轨道 C5/C6，plan 540/541）：定时计划编辑字段。propContracts
 * 实挂全部七个 prop：v1 四 prop（mode/showPreview/previewCount/clearable）+ C6
 * 区块三 prop（showRepeat/showRange/presets，array shape 契约见 presets 项）。
 */
const cronFieldRules: SchemaFieldRule[] = [
  { key: 'mode', kind: 'prop', valueType: 'string' },
  { key: 'showPreview', kind: 'prop', valueType: 'boolean' },
  { key: 'previewCount', kind: 'prop', valueType: 'number' },
  { key: 'showRepeat', kind: 'prop', valueType: 'boolean' },
  { key: 'showRange', kind: 'prop', valueType: 'boolean' },
  { key: 'presets', kind: 'prop' },
];

export const cronEditorRendererDefinition: RendererDefinition = {
  type: 'cron-editor',
  sourcePackage: '@nop-chaos/flux-renderers-form',
  propContracts: {
    ...formFieldContracts,
    mode: {
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
    showPreview: {
      displayName: 'Show Preview',
      description: 'Show the next-fire preview list.',
      shape: { kind: 'boolean' },
      editorType: 'switch',
      defaultValue: true,
    },
    previewCount: {
      displayName: 'Preview Count',
      description: 'Number of preview entries (clamped to 1-20, default 5).',
      shape: { kind: 'number' },
      editorType: 'number',
      defaultValue: 5,
    },
    clearable: {
      displayName: 'Clearable',
      description: 'Show the clear affordance.',
      shape: { kind: 'boolean' },
      editorType: 'switch',
    },
    showRepeat: {
      displayName: 'Show Repeat',
      description: 'Show the repeat (every N days/weeks + anchor) block.',
      shape: { kind: 'boolean' },
      editorType: 'switch',
      defaultValue: true,
    },
    showRange: {
      displayName: 'Show Range',
      description: 'Show the range (start/end/count) block.',
      shape: { kind: 'boolean' },
      editorType: 'switch',
      defaultValue: true,
    },
    presets: {
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
  fields: [...formFieldRules, ...cronFieldRules],
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
