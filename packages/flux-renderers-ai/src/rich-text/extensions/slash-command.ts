// ============================================
// Slash command extension (P6 Phase 3)
// ============================================
//
// Detects `/` typed at the caret and shows a filtered command menu. On
// selection: if `insertText` is set, inserts it into the editor; otherwise
// invokes `action`. Uses `@nop-chaos/ui` `Button` for popup items.

import type { Editor } from '@tiptap/react';
import type { TiptapSlashCommandItem } from '../types.js';

export const SLASH_TRIGGER = '/';

/** Extract the active `/query` at the current selection, or null if absent. */
export function detectSlashQuery(editor: Editor | null): { query: string; from: number; to: number } | null {
  if (!editor) return null;
  const { selection } = editor.state;
  const textBefore = editor.state.doc.textBetween(Math.max(0, selection.from - 50), selection.from, '\n', '\0');
  // Match the last `/` that starts a fresh word (preceded by start/space/newline).
  const match = textBefore.match(new RegExp(`(?:^|\\s|\\n)${SLASH_TRIGGER}([\\w-]*)$`));
  if (!match) return null;
  // `from` points at the `/` itself (account for the leading boundary char).
  const leadingBoundary = match[0].length - (SLASH_TRIGGER + (match[1] ?? '')).length;
  const from = selection.from - match[0].length + leadingBoundary;
  const to = selection.from;
  return { query: match[1] ?? '', from, to };
}

/** Filter the slash-command data source by query (label substring, case-insensitive). */
export function filterSlashCommands(items: TiptapSlashCommandItem[], query: string): TiptapSlashCommandItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((it) => it.label.toLowerCase().includes(q));
}

/**
 * Execute a slash command: if `insertText` is set, replace the `/query` range
 * with it; otherwise, delete the `/query` range and invoke `action`.
 */
export function runSlashCommand(
  editor: Editor,
  item: TiptapSlashCommandItem,
  range: { from: number; to: number },
): void {
  editor.chain().focus().deleteRange({ from: range.from, to: range.to }).run();
  if (typeof item.insertText === 'string') {
    editor.chain().focus().insertContent(item.insertText).run();
  } else if (typeof item.action === 'function') {
    item.action();
  }
}
