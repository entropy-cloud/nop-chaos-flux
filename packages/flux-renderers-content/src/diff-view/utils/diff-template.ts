import type { InlineToken as InlineTokenType } from '../model/diff-inline.js';
import { escapeHtml } from '../adapters/syntax-highlight.js';
import type { ThreeWayRowType } from '../model/diff-3way.js';

function buildInlineHtml(content: string, tokens: InlineTokenType[]): string {
  if (!content) return '';
  let result = '';
  for (const token of tokens) {
    const escaped = escapeHtml(token.text);
    if (token.type === 'equal') {
      result += escaped;
    } else {
      result += `<span data-diff-inline="${token.type}">${escaped}</span>`;
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
  return buildInlineHtml(escaped, inlineTokens);
}

export function generateConflictMarkerHtml(rowType: ThreeWayRowType): string {
  if (rowType === 'conflict-start') return '<<<<<<<';
  if (rowType === 'conflict-separator') return '=======';
  if (rowType === 'conflict-end') return '>>>>>>>';
  return '';
}
