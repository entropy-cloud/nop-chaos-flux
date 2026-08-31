import type {
  BaseSchema,
  RendererDefinition,
  RendererSchemaValidationContext,
} from '@nop-chaos/flux-core';
import { parsePath } from '@nop-chaos/flux-core';
import { BatchBarRenderer } from './batch-bar.js';
import type { BatchBarSchema } from './schemas.js';

function escapeJsonPointerSegment(segment: string) {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

function toJsonPointer(path: string, ...segments: Array<string | number>) {
  const parts = parsePath(path)
    .filter((segment) => segment !== '$')
    .concat(segments.map((segment) => String(segment)));

  if (parts.length === 0) {
    return '';
  }

  return `/${parts.map(escapeJsonPointerSegment).join('/')}`;
}

export function validateBatchBarSchema(context: RendererSchemaValidationContext<BaseSchema>) {
  if (context.schema.type !== 'batch-bar') {
    return;
  }

  const schema = context.schema as BatchBarSchema;
  const { path, emit } = context;

  if (schema.selectionPath === undefined) {
    emit({
      code: 'missing-required-field',
      path: toJsonPointer(path, 'selectionPath'),
      message:
        'batch-bar.selectionPath is required: bind the raw scope path of the selection array.',
    });
  } else if (typeof schema.selectionPath !== 'string' || schema.selectionPath.length === 0) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'selectionPath'),
      message: 'batch-bar.selectionPath must be a non-empty raw scope path (no ${}).',
    });
  }

  if (schema.countTemplate !== undefined && typeof schema.countTemplate !== 'string') {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'countTemplate'),
      message: 'batch-bar.countTemplate must be a string when provided.',
    });
  }

  if (schema.clearTarget !== undefined && typeof schema.clearTarget !== 'string') {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'clearTarget'),
      message: 'batch-bar.clearTarget must be a component id string when provided.',
    });
  }

  if (schema.clearLabel !== undefined && typeof schema.clearLabel !== 'string') {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'clearLabel'),
      message: 'batch-bar.clearLabel must be a string when provided.',
    });
  }
}

export const batchBarRendererDefinition: RendererDefinition = {
  type: 'batch-bar',
  displayName: 'Batch Bar',
  category: 'data',
  sourcePackage: '@nop-chaos/flux-renderers-data',
  schemaValidator: validateBatchBarSchema,
  propContracts: {
    selectionPath: {
      shape: { kind: 'string' },
      displayName: 'Selection Path',
      description:
        'Raw scope path (no ${}) of the selection string array. Crud host: "$crud.selectedRowKeys" inside toolbar/listActions/footerToolbar; table host: the table selectionStatePath (e.g. "issueSelection") — the table writes it only under selectionOwnership:"scope" (the default "local" never writes it, so the bar renders nothing with a one-time dev warn).',
      editorType: 'path',
    },
    countTemplate: {
      shape: { kind: 'string' },
      displayName: 'Count Template',
      description:
        "Count label template evaluated against a child scope { count, selectedRowKeys } (e.g. '已选择 ${count} 项'). Defaults to the i18n selected-count message. Evaluation failure falls back to the raw count (dev warn).",
      editorType: 'text',
    },
    clearTarget: {
      shape: { kind: 'string' },
      displayName: 'Clear Target',
      description:
        'Component id of the owning crud/table. Declaring it renders the built-in clear button; resolution prefers the crud clearSelection handle, then the table setSelection handle with an empty set. Missing target = no-op + dev warn.',
      editorType: 'text',
    },
    clearLabel: {
      shape: { kind: 'string' },
      displayName: 'Clear Label',
      description:
        'Label of the built-in clear button (defaults to the i18n clear-selection message).',
      editorType: 'text',
    },
  },
  component: BatchBarRenderer,
  fields: [
    { key: 'selectionPath', kind: 'prop' },
    { key: 'countTemplate', kind: 'prop', lazyEval: true },
    { key: 'clearTarget', kind: 'prop' },
    { key: 'clearLabel', kind: 'prop' },
    { key: 'actions', kind: 'region' },
  ],
};
