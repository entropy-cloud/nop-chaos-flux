import { useMemo } from 'react';
import type { DiffFile } from '../model/diff-file.js';
import type { InlineToken } from '../model/diff-inline.js';
import { computeInlineTokensForLine } from '../model/diff-inline.js';
import { t } from '@nop-chaos/flux-i18n';
import { highlight } from '../adapters/syntax-highlight.js';
import { DiffHunkComponent } from './diff-hunk.js';

interface DiffSplitViewProps {
  file: DiffFile;
  defaultCollapsedLines: number;
  showLineNumbers?: boolean;
  showInlineDiff?: boolean;
  language?: string;
  onLineClick?: (lineNumber: number, side: 'old' | 'new', type: string) => void;
  onHunkExpand?: (hunkIndex: number, expanded: boolean) => void;
}

export function DiffSplitView({
  file,
  defaultCollapsedLines,
  showLineNumbers,
  showInlineDiff,
  language,
  onLineClick: _onLineClick,
  onHunkExpand,
}: DiffSplitViewProps) {
  const inlineTokensMaps = useMemo(() => {
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
  }, [file, showInlineDiff]);

  const highlightedHtmlMaps = useMemo(() => {
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
  }, [file, language]);

  return (
    <div data-view="split" className="nop-diff-split-view">
      <div className="nop-diff-split-pane nop-diff-split-old">
        <div className="nop-diff-pane-header">{t('flux.diff.oldPane')}</div>
        {file.hunks.map((hunk, hunkIdx) => (
          <DiffHunkComponent
            key={hunk.header}
            hunk={hunk}
            hunkIndex={hunkIdx}
            defaultCollapsedLines={defaultCollapsedLines}
            isUnified={false}
            showLineNumbers={showLineNumbers}
            inlineTokensMap={inlineTokensMaps?.get(hunkIdx)}
            highlightedHtmlMap={highlightedHtmlMaps?.get(hunkIdx)}
            onHunkExpand={onHunkExpand}
          />
        ))}
      </div>
      <div className="nop-diff-split-pane nop-diff-split-new">
        <div className="nop-diff-pane-header">{t('flux.diff.newPane')}</div>
        {file.hunks.map((hunk, hunkIdx) => (
          <DiffHunkComponent
            key={hunk.header}
            hunk={hunk}
            hunkIndex={hunkIdx}
            defaultCollapsedLines={defaultCollapsedLines}
            isUnified={false}
            showLineNumbers={showLineNumbers}
            inlineTokensMap={inlineTokensMaps?.get(hunkIdx)}
            highlightedHtmlMap={highlightedHtmlMaps?.get(hunkIdx)}
            onHunkExpand={onHunkExpand}
          />
        ))}
      </div>
    </div>
  );
}
