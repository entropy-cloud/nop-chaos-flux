import { useMemo } from 'react';
import type { DiffFile } from './diff-file.js';
import type { InlineToken } from './diff-inline.js';
import { computeInlineTokensForLine } from './diff-inline.js';
import { highlight } from '../adapters/syntax-highlight.js';

// WA-content-001 (plan 567): the split and unified views each hand-rolled the
// same two precompute pipelines (inline word-diff tokens per changed line,
// highlighted HTML per line). Shared here so the split/unified pair cannot
// drift; the three-column view consumes the split-style maps through its own
// pane rendering.

function computeInlineTokensMaps(
  file: DiffFile,
  showInlineDiff: boolean | undefined,
): Map<number, Map<number, InlineToken[]>> | undefined {
  if (!showInlineDiff) return undefined;
  const maps: Map<number, Map<number, InlineToken[]>> = new Map();
  for (let hunkIdx = 0; hunkIdx < file.hunks.length; hunkIdx++) {
    const hunk = file.hunks[hunkIdx];
    const lineMap = new Map<number, InlineToken[]>();
    for (let lineIdx = 0; lineIdx < hunk.lines.length; lineIdx++) {
      const line = hunk.lines[lineIdx];
      if (line.type === 'add' || line.type === 'delete') {
        const prevLine = lineIdx > 0 ? hunk.lines[lineIdx - 1] : null;
        if (prevLine && (prevLine.type !== line.type)) {
          const oldText = line.type === 'add' ? prevLine.content : line.content;
          const newText = line.type === 'add' ? line.content : prevLine.content;
          lineMap.set(lineIdx, computeInlineTokensForLine(oldText, newText, line.type));
        }
      }
    }
    maps.set(hunkIdx, lineMap);
  }
  return maps;
}

function computeHighlightedHtmlMaps(
  file: DiffFile,
  language: string | undefined,
): Map<number, Map<number, string>> | undefined {
  if (!language || language === 'plaintext') return undefined;
  const maps: Map<number, Map<number, string>> = new Map();
  for (let hunkIdx = 0; hunkIdx < file.hunks.length; hunkIdx++) {
    const hunk = file.hunks[hunkIdx];
    const lineMap = new Map<number, string>();
    for (let lineIdx = 0; lineIdx < hunk.lines.length; lineIdx++) {
      const line = hunk.lines[lineIdx];
      lineMap.set(lineIdx, highlight(line.content, language));
    }
    maps.set(hunkIdx, lineMap);
  }
  return maps;
}

export function useInlineTokensMaps(
  file: DiffFile,
  showInlineDiff: boolean | undefined,
): Map<number, Map<number, InlineToken[]>> | undefined {
  return useMemo(() => computeInlineTokensMaps(file, showInlineDiff), [file, showInlineDiff]);
}

export function useHighlightedHtmlMaps(
  file: DiffFile,
  language: string | undefined,
): Map<number, Map<number, string>> | undefined {
  return useMemo(() => computeHighlightedHtmlMaps(file, language), [file, language]);
}
