import type { RendererDefinition } from '@nop-chaos/flux-core';
import { StepsRenderer } from './steps-renderer.js';
import { TimelineRenderer } from './timeline-renderer.js';

export const stepsRendererDefinition: RendererDefinition = {
  type: 'steps',
  displayName: 'Steps',
  category: 'layout',
  sourcePackage: '@nop-chaos/flux-renderers-layout',
  component: StepsRenderer,
  propContracts: {
    items: {
      shape: { kind: 'array', item: { kind: 'unknown' } },
      displayName: 'Items',
      description:
        'Step item collection (pure value prop, no nested regions). Each item: { value/key, title, description, status, disabled }. status overrides the derived finish/process/wait derivation.',
      editorType: 'object-array',
    },
    value: {
      shape: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'number' }] },
      displayName: 'Value',
      description:
        'Current step key/value, or a numeric index when no key matches. Numeric values are clamped to the valid range.',
      editorType: 'expression',
    },
    defaultValue: {
      shape: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'number' }] },
      displayName: 'Default Value',
      description: 'Initial current step value when `value` is not provided.',
      editorType: 'expression',
    },
    valueOwnership: {
      shape: {
        kind: 'union',
        anyOf: [
          { kind: 'literal', value: 'local' },
          { kind: 'literal', value: 'controlled' },
          { kind: 'literal', value: 'scope' },
        ],
      },
      displayName: 'Value Ownership',
      description:
        'Current-step ownership. scope requires valueStatePath; when scope is set without a path it degrades to local controlled with a dev warning.',
      editorType: 'select',
      defaultValue: 'local',
    },
    valueStatePath: {
      shape: { kind: 'string' },
      displayName: 'Value State Path',
      description: 'Scope path publishing the writable current-step value (scope ownership).',
      editorType: 'expression',
    },
    orientation: {
      shape: {
        kind: 'union',
        anyOf: [
          { kind: 'literal', value: 'horizontal' },
          { kind: 'literal', value: 'vertical' },
        ],
      },
      displayName: 'Orientation',
      editorType: 'select',
      defaultValue: 'horizontal',
    },
  },
  eventContracts: {
    onChange: {
      displayName: 'On Change',
      description:
        'Dispatched when the current step changes via click. Payload: { value, stepIndex, stepKey }. steps is a lightweight progress display — it does NOT own multi-step submit lifecycle (wizard domain).',
      payload: {
        kind: 'object',
        fields: {
          value: { kind: 'unknown' },
          stepIndex: { kind: 'number' },
          stepKey: { kind: 'unknown' },
        },
      },
    },
  },
  fields: [
    { key: 'items', kind: 'prop' },
    { key: 'value', kind: 'prop' },
    { key: 'defaultValue', kind: 'prop' },
    { key: 'valueOwnership', kind: 'prop' },
    { key: 'valueStatePath', kind: 'prop' },
    { key: 'orientation', kind: 'prop' },
    { key: 'onChange', kind: 'event' },
  ],
};

export const timelineRendererDefinition: RendererDefinition = {
  type: 'timeline',
  displayName: 'Timeline',
  category: 'layout',
  sourcePackage: '@nop-chaos/flux-renderers-layout',
  component: TimelineRenderer,
  propContracts: {
    items: {
      shape: { kind: 'array', item: { kind: 'unknown' } },
      displayName: 'Items',
      description:
        'Event item collection (pure value prop, no nested regions). Each item: { time, title, detail, icon, level }. Display-only, no owner state.',
      editorType: 'object-array',
    },
    mode: {
      shape: {
        kind: 'union',
        anyOf: [
          { kind: 'literal', value: 'left' },
          { kind: 'literal', value: 'right' },
          { kind: 'literal', value: 'alternate' },
        ],
      },
      displayName: 'Mode',
      description: 'Content placement relative to the axis (default left).',
      editorType: 'select',
      defaultValue: 'left',
    },
    orientation: {
      shape: {
        kind: 'union',
        anyOf: [
          { kind: 'literal', value: 'horizontal' },
          { kind: 'literal', value: 'vertical' },
        ],
      },
      displayName: 'Orientation',
      editorType: 'select',
      defaultValue: 'vertical',
    },
    reverse: {
      shape: { kind: 'boolean' },
      displayName: 'Reverse',
      description: 'Render items in reverse chronological order.',
      editorType: 'switch',
      defaultValue: false,
    },
  },
  fields: [
    { key: 'items', kind: 'prop' },
    { key: 'mode', kind: 'prop' },
    { key: 'orientation', kind: 'prop' },
    { key: 'reverse', kind: 'prop', valueType: 'boolean' },
  ],
};
