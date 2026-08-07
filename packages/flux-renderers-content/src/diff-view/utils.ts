import type { DiffFile } from './model/diff-file.js';
import type { InlineToken as InlineTokenType } from './model/diff-inline.js';
import { escapeHtml } from './adapters/syntax-highlight.js';
import type { ThreeWayRowType } from './model/diff-3way.js';

export interface DiffStats {
  added: number;
  removed: number;
  total: number;
}

export function computeDiffStats(file: DiffFile): DiffStats {
  let added = 0;
  let removed = 0;
  let total = 0;

  for (const hunk of file.hunks) {
    for (const line of hunk.lines) {
      total++;
      if (line.type === 'add') added++;
      else if (line.type === 'delete') removed++;
    }
  }

  return { added, removed, total };
}

function buildInlineHtml(tokens: InlineTokenType[]): string {
  let result = '';
  for (const token of tokens) {
    const escaped = escapeHtml(token.text);
    if (token.type === 'equal') {
      result += escaped;
    } else {
      // design.md §10 marker contract: data-diff-inline="add"/"delete".
      // The internal token vocabulary uses diff-match-patch 'insert'/'delete';
      // the DOM contract value for insertions is 'add'.
      const marker = token.type === 'insert' ? 'add' : token.type;
      result += `<span data-diff-inline="${marker}">${escaped}</span>`;
    }
  }
  return result;
}

export function generateLineContentHtml(
  content: string,
  type: string,
  inlineTokens?: InlineTokenType[],
): string {
  const escaped = escapeHtml(content);
  if (!inlineTokens || inlineTokens.length === 0 || type === 'context' || type === 'hunk') {
    return escaped;
  }
  return buildInlineHtml(inlineTokens);
}

export function generateConflictMarkerHtml(rowType: ThreeWayRowType): string {
  if (rowType === 'conflict-start') return '<<<<<<<';
  if (rowType === 'conflict-separator') return '=======';
  if (rowType === 'conflict-end') return '>>>>>>>';
  return '';
}
