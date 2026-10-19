import type { RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { WheelPickerRenderer } from './wheel-picker.js';
import { WheelDatePickerRenderer } from './wheel-date-picker.js';
import { WheelTimePickerRenderer } from './wheel-time-picker.js';
import { WheelCascaderRenderer } from './wheel-cascader.js';
import { FloatingPanelRenderer } from './floating-panel.js';
import { FloatingBubbleRenderer } from './floating-bubble.js';
import { ActionSheetRenderer } from './action-sheet.js';

/**
 * M7 wheel family + M8 bottom-panel renderer definitions (plan 665/666).
 * Split out of mobile-renderer-definitions.ts to stay under the file-size
 * lint cap; the main file spreads this array into the single registration
 * surface.
 */
export const extendedMobileRendererDefinitions: RegisteredRendererDefinition[] = [
  {
    type: 'wheel-picker',
    displayName: 'Wheel Picker',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-mobile',
    defaultSchema: { type: 'wheel-picker', columns: [] },
    component: WheelPickerRenderer,
    fields: [
      { key: 'label', kind: 'prop' },
      { key: 'name', kind: 'prop' },
      { key: 'columns', kind: 'prop' },
      { key: 'value', kind: 'prop' },
      { key: 'placeholder', kind: 'prop' },
      {
        key: 'disabled',
        kind: 'prop',
        valueType: 'boolean',
        contract: { displayName: 'Disabled', shape: { kind: 'boolean' } },
      },
      {
        key: 'required',
        kind: 'prop',
        valueType: 'boolean',
        contract: { displayName: 'Required', shape: { kind: 'boolean' } },
      },
      {
        key: 'onConfirm',
        kind: 'event',
        contract: {
          displayName: 'On Confirm',
          description: 'Dispatched when the popup confirm button is pressed. Payload: { type: "confirm", value, labels }.',
          payload: {
            kind: 'object',
            fields: {
              type: { kind: 'string' },
              value: { kind: 'unknown' },
              labels: { kind: 'array', item: { kind: 'string' } },
            },
          },
        },
      },
      {
        key: 'onCancel',
        kind: 'event',
        contract: {
          displayName: 'On Cancel',
          description: 'Dispatched when the popup is dismissed without confirming. Payload: { type: "cancel" }.',
          payload: {
            kind: 'object',
            fields: { type: { kind: 'string' } },
          },
        },
      },
    ],
  },
  {
    type: 'wheel-date-picker',
    displayName: 'Wheel Date Picker',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-mobile',
    defaultSchema: { type: 'wheel-date-picker' },
    component: WheelDatePickerRenderer,
    fields: [
      { key: 'label', kind: 'prop' },
      { key: 'name', kind: 'prop' },
      { key: 'min', kind: 'prop' },
      { key: 'max', kind: 'prop' },
      { key: 'value', kind: 'prop' },
      { key: 'placeholder', kind: 'prop' },
      {
        key: 'disabled',
        kind: 'prop',
        valueType: 'boolean',
        contract: { displayName: 'Disabled', shape: { kind: 'boolean' } },
      },
      {
        key: 'required',
        kind: 'prop',
        valueType: 'boolean',
        contract: { displayName: 'Required', shape: { kind: 'boolean' } },
      },
      {
        key: 'onConfirm',
        kind: 'event',
        contract: {
          displayName: 'On Confirm',
          description: 'Dispatched when the popup confirm button is pressed. Payload: { type: "confirm", value, labels }.',
          payload: {
            kind: 'object',
            fields: {
              type: { kind: 'string' },
              value: { kind: 'unknown' },
              labels: { kind: 'array', item: { kind: 'string' } },
            },
          },
        },
      },
      {
        key: 'onCancel',
        kind: 'event',
        contract: {
          displayName: 'On Cancel',
          description: 'Dispatched when the popup is dismissed without confirming. Payload: { type: "cancel" }.',
          payload: {
            kind: 'object',
            fields: { type: { kind: 'string' } },
          },
        },
      },
    ],
  },
  {
    type: 'wheel-time-picker',
    displayName: 'Wheel Time Picker',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-mobile',
    defaultSchema: { type: 'wheel-time-picker' },
    component: WheelTimePickerRenderer,
    fields: [
      { key: 'label', kind: 'prop' },
      { key: 'name', kind: 'prop' },
      { key: 'minuteStep', kind: 'prop' },
      { key: 'value', kind: 'prop' },
      { key: 'placeholder', kind: 'prop' },
      {
        key: 'disabled',
        kind: 'prop',
        valueType: 'boolean',
        contract: { displayName: 'Disabled', shape: { kind: 'boolean' } },
      },
      {
        key: 'required',
        kind: 'prop',
        valueType: 'boolean',
        contract: { displayName: 'Required', shape: { kind: 'boolean' } },
      },
      {
        key: 'onConfirm',
        kind: 'event',
        contract: {
          displayName: 'On Confirm',
          description: 'Dispatched when the popup confirm button is pressed. Payload: { type: "confirm", value, labels }.',
          payload: {
            kind: 'object',
            fields: {
              type: { kind: 'string' },
              value: { kind: 'unknown' },
              labels: { kind: 'array', item: { kind: 'string' } },
            },
          },
        },
      },
      {
        key: 'onCancel',
        kind: 'event',
        contract: {
          displayName: 'On Cancel',
          description: 'Dispatched when the popup is dismissed without confirming. Payload: { type: "cancel" }.',
          payload: {
            kind: 'object',
            fields: { type: { kind: 'string' } },
          },
        },
      },
    ],
  },
  {
    type: 'wheel-cascader',
    displayName: 'Wheel Cascader',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-mobile',
    defaultSchema: { type: 'wheel-cascader', options: [] },
    component: WheelCascaderRenderer,
    fields: [
      { key: 'label', kind: 'prop' },
      { key: 'name', kind: 'prop' },
      { key: 'options', kind: 'prop' },
      { key: 'value', kind: 'prop' },
      { key: 'placeholder', kind: 'prop' },
      {
        key: 'disabled',
        kind: 'prop',
        valueType: 'boolean',
        contract: { displayName: 'Disabled', shape: { kind: 'boolean' } },
      },
      {
        key: 'required',
        kind: 'prop',
        valueType: 'boolean',
        contract: { displayName: 'Required', shape: { kind: 'boolean' } },
      },
      {
        key: 'onConfirm',
        kind: 'event',
        contract: {
          displayName: 'On Confirm',
          description: 'Dispatched when the popup confirm button is pressed. Payload: { type: "confirm", value, labels }.',
          payload: {
            kind: 'object',
            fields: {
              type: { kind: 'string' },
              value: { kind: 'unknown' },
              labels: { kind: 'array', item: { kind: 'string' } },
            },
          },
        },
      },
      {
        key: 'onCancel',
        kind: 'event',
        contract: {
          displayName: 'On Cancel',
          description: 'Dispatched when the popup is dismissed without confirming. Payload: { type: "cancel" }.',
          payload: {
            kind: 'object',
            fields: { type: { kind: 'string' } },
          },
        },
      },
    ],
  },
  {
    type: 'floating-panel',
    displayName: 'Floating Panel',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-mobile',
    defaultSchema: { type: 'floating-panel', anchors: [120, 320], body: [] },
    component: FloatingPanelRenderer,
    fields: [
      { key: 'anchors', kind: 'prop' },
      { key: 'defaultHeight', kind: 'prop' },
      { key: 'body', kind: 'region', regionKey: 'body' },
      {
        key: 'disabled',
        kind: 'prop',
        valueType: 'boolean',
        contract: { displayName: 'Disabled', shape: { kind: 'boolean' } },
      },
      {
        key: 'onChange',
        kind: 'event',
        contract: {
          displayName: 'On Change',
          description: 'Dispatched when the panel settles on an anchor. Payload: { type: "anchor", index, height }.',
          payload: {
            kind: 'object',
            fields: {
              type: { kind: 'string' },
              index: { kind: 'number' },
              height: { kind: 'number' },
            },
          },
        },
      },
    ],
  },
  {
    type: 'floating-bubble',
    displayName: 'Floating Bubble',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-mobile',
    defaultSchema: { type: 'floating-bubble' },
    component: FloatingBubbleRenderer,
    fields: [
      { key: 'initialX', kind: 'prop' },
      { key: 'initialY', kind: 'prop' },
      {
        key: 'magnetic',
        kind: 'prop',
        valueType: 'boolean',
        contract: { displayName: 'Magnetic', shape: { kind: 'boolean' } },
      },
      {
        key: 'disabled',
        kind: 'prop',
        valueType: 'boolean',
        contract: { displayName: 'Disabled', shape: { kind: 'boolean' } },
      },
      {
        key: 'onClick',
        kind: 'event',
        contract: {
          displayName: 'On Click',
          description: 'Dispatched when the bubble is tapped (movement under the 6px threshold). Payload: { type: "click" }.',
          payload: {
            kind: 'object',
            fields: { type: { kind: 'string' } },
          },
        },
      },
    ],
  },
  {
    type: 'action-sheet',
    displayName: 'Action Sheet',
    category: 'content',
    sourcePackage: '@nop-chaos/flux-renderers-mobile',
    defaultSchema: { type: 'action-sheet', items: [] },
    component: ActionSheetRenderer,
    fields: [
      { key: 'triggerText', kind: 'prop' },
      { key: 'title', kind: 'prop' },
      { key: 'items', kind: 'prop' },
      {
        key: 'display',
        kind: 'prop',
        contract: {
          displayName: 'Display',
          shape: {
            kind: 'union',
            anyOf: ['list', 'grid'].map((v) => ({ kind: 'literal', value: v })),
          },
          editorType: 'select',
          defaultValue: 'list',
        },
      },
      { key: 'cancelText', kind: 'prop' },
      {
        key: 'closeOnMask',
        kind: 'prop',
        valueType: 'boolean',
        contract: { displayName: 'Close On Mask', shape: { kind: 'boolean' } },
      },
      {
        key: 'disabled',
        kind: 'prop',
        valueType: 'boolean',
        contract: { displayName: 'Disabled', shape: { kind: 'boolean' } },
      },
      {
        key: 'onSelect',
        kind: 'event',
        contract: {
          displayName: 'On Select',
          description: 'Dispatched when an enabled item is tapped. Payload: { type: "select", index, value, label }.',
          payload: {
            kind: 'object',
            fields: {
              type: { kind: 'string' },
              index: { kind: 'number' },
              value: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'number' }] },
              label: { kind: 'string' },
            },
          },
        },
      },
      {
        key: 'onCancel',
        kind: 'event',
        contract: {
          displayName: 'On Cancel',
          description: 'Dispatched when the sheet is dismissed via cancel button or mask. Payload: { type: "cancel" }.',
          payload: {
            kind: 'object',
            fields: { type: { kind: 'string' } },
          },
        },
      },
    ],
  },
];
