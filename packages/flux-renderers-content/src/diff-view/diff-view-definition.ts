import { defineRendererFamily } from '@nop-chaos/flux-core';
import { DiffViewRenderer } from './diff-view-renderer.js';

/**
 * RM-5 (plan 607) sibling-extraction precedent (wizard-renderer-definition /
 * list-renderer-definition): the diff-view definition's absorbed event
 * contracts pushed `content-renderer-definitions.ts` past the 700-line cap.
 */
const defineDiffViewRenderer = defineRendererFamily({
  sourcePackage: '@nop-chaos/flux-renderers-content',
  defaultSchema: (type) => ({ type }),
});

export const diffViewRendererDefinition = defineDiffViewRenderer({
  type: 'diff-view',
  displayName: 'Diff View',
  category: 'content',
  defaultSchema: { type: 'diff-view', viewType: 'split', showLineNumbers: true },
  component: DiffViewRenderer,
  fields: [
    { key: 'oldContent', kind: 'prop' },
    { key: 'newContent', kind: 'prop' },
    { key: 'middleContent', kind: 'prop' },
    { key: 'files', kind: 'prop' },
    { key: 'activeFileIndex', kind: 'prop' },
    { key: 'language', kind: 'prop' },
    {
      key: 'viewType',
      kind: 'prop',
      contract: {
        displayName: 'View Type',
        shape: {
          kind: 'union',
          anyOf: ['split', 'unified'].map((v) => ({ kind: 'literal', value: v })),
        },
        editorType: 'select',
        defaultValue: 'split',
      },
    },
    {
      key: 'showLineNumbers',
      kind: 'prop',
      valueType: 'boolean',
      contract: { displayName: 'Show Line Numbers', shape: { kind: 'boolean' } }
    },
    {
      key: 'showInlineDiff',
      kind: 'prop',
      valueType: 'boolean',
      contract: { displayName: 'Show Inline Diff', shape: { kind: 'boolean' } }
    },
    { key: 'defaultCollapsedLines', kind: 'prop' },
    { key: 'wrapLines', kind: 'prop', valueType: 'boolean' },
    {
      key: 'onLineClick',
      kind: 'event',
      contract: {
        displayName: 'On Line Click',
        description:
          'Dispatched when a diff line is clicked (split/unified/three-column panes). Payload: { lineNumber, side, type } — side is old|new (split/unified) or old|middle|new (three-column); type is the row diff type (add|delete|context, or the three-way row types in three-column mode).',
        payload: {
          kind: 'object',
          fields: {
            lineNumber: { kind: 'number' },
            side: { kind: 'string' },
            type: { kind: 'string' },
          },
        },
      },
    },
    {
      key: 'onHunkExpand',
      kind: 'event',
      contract: {
        displayName: 'On Hunk Expand',
        description:
          'Dispatched when a folded hunk is expanded or an expanded hunk is collapsed. Payload: { hunkIndex, expanded }.',
        payload: {
          kind: 'object',
          fields: {
            hunkIndex: { kind: 'number' },
            expanded: { kind: 'boolean' },
          },
        },
      },
    },
    { key: 'toggleViewType', kind: 'reaction' },
    { key: 'setViewType', kind: 'reaction' },
    { key: 'expandAll', kind: 'reaction' },
    { key: 'collapseAll', kind: 'reaction' },
  ],
});
