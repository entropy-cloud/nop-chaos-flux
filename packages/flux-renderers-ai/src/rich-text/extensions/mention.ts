// ============================================
// @mention extension (P6 Phase 3)
// ============================================
//
// Detects `@` typed at the caret and shows a filtered popup of mention
// candidates. On selection, inserts `@label ` as plain text into the editor
// (the engine contract only accepts plain strings, so we serialize mentions as
// `@label`). Uses `@nop-chaos/ui` `Button` for popup items.

import type { Editor } from '@tiptap/react';
import type { TiptapMentionItem } from '../types.js';

export interface MentionPopupState {
  open: boolean;
  query: string;
  range: { from: number; to: number } | null;
}

export const MENTION_TRIGGER = '@';

/** Extract the active `@query` at the current selection, or null if absent. */
export function detectMentionQuery(editor: Editor | null): { query: string; from: number; to: number } | null {
  if (!editor) return null;
  const { selection } = editor.state;
  const textBefore = editor.state.doc.textBetween(Math.max(0, selection.from - 50), selection.from, '\n', '\0');
  // Match the last `@` that is followed only by word characters (no whitespace).
  // P2 (N-4): the previous `[\\w\\s.-]*` class included `\\s`, contradicting
  // the adjacent comment and letting the candidate popup stay open across
  // spaces. Drop `\\s` so typing a space closes the popup (兑现 no-whitespace 注释).
  const match = textBefore.match(new RegExp(`${MENTION_TRIGGER}([\\w.-]*)$`));
  if (!match) return null;
  const from = selection.from - match[0].length;
  const to = selection.from;
  return { query: match[1] ?? '', from, to };
}

/** Filter the mention data source by query (label substring, case-insensitive). */
export function filterMentions(items: TiptapMentionItem[], query: string): TiptapMentionItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((it) => it.label.toLowerCase().includes(q));
}

/**
 * Insert a mention into the editor at the detected range. Replaces
 * `@query` with `@label ` (trailing space so the user can keep typing).
 */
export function insertMention(editor: Editor, item: TiptapMentionItem, range: { from: number; to: number }): void {
  const insert = `${MENTION_TRIGGER}${item.label} `;
  editor
    .chain()
    .focus()
    .deleteRange({ from: range.from, to: range.to })
    .insertContent(insert)
    .run();
}
