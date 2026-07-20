import DiffMatchPatch from 'diff-match-patch';

const dmp = new DiffMatchPatch();

export type InlineTokenType = 'equal' | 'insert' | 'delete';

export interface InlineToken {
  type: InlineTokenType;
  text: string;
}

export function computeInlineDiff(oldText: string, newText: string): InlineToken[] {
  try {
    const diffs = dmp.diff_main(oldText, newText);
    dmp.diff_cleanupSemantic(diffs);
    return diffs.map(([op, text]) => ({
      type: op === 0 ? 'equal' : op === 1 ? 'insert' : 'delete' as InlineTokenType,
      text,
    }));
  } catch {
    return [{ type: 'equal', text: newText }];
  }
}

export function computeInlineTokensForLine(
  oldLine: string,
  newLine: string,
  lineType: 'add' | 'delete',
): InlineToken[] {
  const otherText = lineType === 'add' ? oldLine : newLine;
  const tokens = computeInlineDiff(otherText, lineType === 'add' ? newLine : oldLine);
  if (lineType === 'delete') {
    return tokens.map((t) => ({
      ...t,
      type: t.type === 'insert' ? 'delete' as InlineTokenType : t.type,
    }));
  }
  return tokens.filter((t) => t.type !== 'delete').map((t) => ({
    ...t,
    type: t.type === 'insert' ? 'insert' as InlineTokenType : t.type,
  }));
}
