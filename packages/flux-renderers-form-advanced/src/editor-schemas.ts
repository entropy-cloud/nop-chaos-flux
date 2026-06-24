import type { BoundFieldSchemaBase, SchemaFieldRule } from '@nop-chaos/flux-core';

export interface EditorSchema extends BoundFieldSchemaBase {
  type: 'editor';
  placeholder?: string;
  /**
   * Toolbar configuration. `false` hides the toolbar; an array whitelists the
   * named buttons to show; omitted/`true` shows the default toolbar.
   * Button ids: bold, italic, strike, h1, h2, bulletList, orderedList, code,
   * blockquote, link, undo, redo.
   */
  toolbar?: boolean | string[];
  /** Serialized output shape. `html` (default) or `json` (TipTap JSON). */
  outputFormat?: 'html' | 'json';
}

export const editorFieldRules: SchemaFieldRule[] = [
  { key: 'placeholder', kind: 'prop' },
  { key: 'toolbar', kind: 'prop' },
  { key: 'outputFormat', kind: 'prop' },
];

export type EditorToolbarButton =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'h1'
  | 'h2'
  | 'bulletList'
  | 'orderedList'
  | 'code'
  | 'blockquote'
  | 'link'
  | 'undo'
  | 'redo';

export const DEFAULT_EDITOR_TOOLBAR: EditorToolbarButton[] = [
  'bold',
  'italic',
  'strike',
  'h1',
  'h2',
  'bulletList',
  'orderedList',
  'code',
  'blockquote',
  'link',
  'undo',
  'redo',
];

export function resolveToolbarButtons(toolbar: unknown): EditorToolbarButton[] | null {
  if (toolbar === false) {
    return null;
  }
  if (Array.isArray(toolbar)) {
    return DEFAULT_EDITOR_TOOLBAR.filter((button) =>
      (toolbar as unknown[]).includes(button),
    );
  }
  return DEFAULT_EDITOR_TOOLBAR;
}
