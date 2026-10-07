import type { RendererDefinition, SchemaFieldRule } from '@nop-chaos/flux-core';
import { formFieldContracts, formFieldRules } from '../field-utils.js';
import { createFieldValidation } from './input.js';
import { validateCronEditorSchema } from './cron-editor-schema-validator.js';
import { CronEditorRenderer } from './cron-editor-renderer.js';

/**
 * cron-editor（cron 轨道 C5，plan 540）：定时计划编辑字段。propContracts 仅挂 v1
 * 实际消费的四 prop；showRepeat/showRange/presets 按 design §4 声明进 schema、
 * C6 区块落地时再挂契约（v1 最小锚点测试钉「声明存在、效果缺省」）。
 */
const cronFieldRules: SchemaFieldRule[] = [
  { key: 'mode', kind: 'prop', valueType: 'string' },
  { key: 'showPreview', kind: 'prop', valueType: 'boolean' },
  { key: 'previewCount', kind: 'prop', valueType: 'number' },
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
