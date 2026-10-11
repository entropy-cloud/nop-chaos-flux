import { memo, useState, type CSSProperties } from 'react';
import { Button } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { DiffHunk as DiffHunkType } from '../model/diff-file.js';
import { DiffLineComponent } from './diff-line.js';
import type { InlineToken } from '../model/diff-inline.js';

interface DiffHunkProps {
  hunk: DiffHunkType;
  hunkIndex: number;
  defaultCollapsedLines: number;
  isUnified?: boolean;
  showLineNumbers?: boolean;
  inlineTokensMap?: Map<number, InlineToken[]>;
  highlightedHtmlMap?: Map<number, string>;
  onHunkExpand?: (hunkIndex: number, expanded: boolean) => void;
  onLineClick?: (lineNumber: number, type: string) => void;
}

function computeDefaultHidden(defaultCollapsedLines: number, contextLines: number): boolean {
  if (defaultCollapsedLines < 0) return true;
  if (defaultCollapsedLines === 0) return false;
  return contextLines > defaultCollapsedLines;
}

export const DiffHunkComponent = memo(function DiffHunkComponent({
  hunk,
  hunkIndex,
  defaultCollapsedLines,
  isUnified,
  showLineNumbers,
  inlineTokensMap,
  highlightedHtmlMap,
  onHunkExpand,
  onLineClick,
}: DiffHunkProps) {
  const contextLines = hunk.lines.filter((l) => l.type === 'context').length;

  // WA-content-004 (plan 567): expansion commands (expandAll/collapseAll) flow
  // down as a changed `defaultCollapsedLines` (derived from expansionState).
  // The mount-time capture ignored those changes, which is why the renderer
  // used to force a full remount (remountKey) — discarding cross-file
  // selection along the way. Derived at render time instead: a user toggle is
  // recorded together with the default it was made against, so it wins until
  // the next command arrives (a changed default invalidates the override).
  const [userOverride, setUserOverride] = useState<{ from: number; hidden: boolean } | null>(null);
  const isHidden =
    userOverride && userOverride.from === defaultCollapsedLines
      ? userOverride.hidden
      : computeDefaultHidden(defaultCollapsedLines, contextLines);

  const toggleExpand = () => {
    setUserOverride({ from: defaultCollapsedLines, hidden: !isHidden });
    onHunkExpand?.(hunkIndex, isHidden);
  };

  const contentStyle: CSSProperties = {
    maxHeight: isHidden ? '0' : '9999px',
    opacity: isHidden ? 0 : 1,
    overflow: 'hidden',
    transition: 'max-height 200ms ease-in-out, opacity 200ms ease-in-out',
  };

  if (isHidden) {
    const contextCount = hunk.lines.filter((l) => l.type === 'context').length;
    return (
      <div data-slot="diff-hunk-header" data-diff-type="hunk" data-expanded="false" className="nop-diff-hunk nop-diff-hunk-collapsed">
        <Button
          variant="ghost"
          className="nop-diff-hunk-expand-btn"
          onClick={toggleExpand}
        >
          {t('flux.diff.collapsedLines', { count: contextCount })}
        </Button>
      </div>
    );
  }

  return (
    <div data-slot="diff-hunk-header" data-diff-type="hunk" data-expanded="true" className="nop-diff-hunk nop-diff-hunk-expanded">
      <div className="nop-diff-hunk-header-row">
        <span className="nop-diff-hunk-header-text">{hunk.header}</span>
        <Button variant="ghost" className="nop-diff-hunk-collapse-btn" onClick={toggleExpand}>
          {t('flux.diff.collapse')}
        </Button>
      </div>
      <div style={contentStyle}>
      {hunk.lines.map((line, lineIndex) => {
        const lineKey = line.oldLineNum !== undefined ? `o${line.oldLineNum}` : line.newLineNum !== undefined ? `n${line.newLineNum}` : `x${lineIndex}`;
        return (
          <DiffLineComponent
            key={lineKey}
            line={line}
            inlineTokens={inlineTokensMap?.get(lineIndex)}
            highlightedHtml={highlightedHtmlMap?.get(lineIndex)}
            oldLineNum={line.oldLineNum}
            newLineNum={line.newLineNum}
            showLineNumbers={showLineNumbers}
            isUnified={isUnified}
            onLineClick={onLineClick}
          />
        );
      })}
      </div>
    </div>
  );
}, areHunkPropsEqual);

function areHunkPropsEqual(prev: DiffHunkProps, next: DiffHunkProps): boolean {
  return (
    prev.hunkIndex === next.hunkIndex &&
    prev.defaultCollapsedLines === next.defaultCollapsedLines &&
    prev.isUnified === next.isUnified &&
    prev.showLineNumbers === next.showLineNumbers &&
    prev.hunk === next.hunk &&
    prev.inlineTokensMap === next.inlineTokensMap &&
    prev.highlightedHtmlMap === next.highlightedHtmlMap &&
    prev.onLineClick === next.onLineClick &&
    prev.onHunkExpand === next.onHunkExpand
  );
}
