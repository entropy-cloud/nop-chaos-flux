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
        'Event item collection (pure value prop, no nested regions). Each item: { value, time, title, detail, icon, level }. Display-only unless v2 controlled current-event fields are declared.',
      editorType: 'object-array',
    },
    value: {
      shape: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'number' }] },
      displayName: 'Value',
      description:
        'Current event key/value, or a numeric index when no key matches (clamped). Drives the active highlight; unmatched values do NOT fall back to the first item (see render-layer adjudication).',
      editorType: 'expression',
    },
    defaultValue: {
      shape: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'number' }] },
      displayName: 'Default Value',
      description:
        'Fallback current-event value when `value` does not match any item key (participates in the resolve chain every render, not seed-only).',
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
        'Current-event ownership. scope requires valueStatePath; when scope is set without a path it degrades to local controlled with a dev warning.',
      editorType: 'select',
      defaultValue: 'local',
    },
    valueStatePath: {
      shape: { kind: 'string' },
      displayName: 'Value State Path',
      description: 'Scope path publishing the writable current-event value (scope ownership).',
      editorType: 'expression',
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
  eventContracts: {
    onChange: {
      displayName: 'On Change',
      description:
        'Dispatched when an event item is clicked (seek). Items are clickable only when onChange is declared. Payload: { value, index, item } — value is the item key (or index when no key), index is the logical-order index, item is the full event item data. timeline does NOT own playback — the host drives value for play/pause.',
      payload: {
        kind: 'object',
        fields: {
          value: { kind: 'unknown' },
          index: { kind: 'number' },
          item: { kind: 'unknown' },
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
    { key: 'mode', kind: 'prop' },
    { key: 'orientation', kind: 'prop' },
    { key: 'reverse', kind: 'prop', valueType: 'boolean' },
    { key: 'onChange', kind: 'event' },
  ],
};
