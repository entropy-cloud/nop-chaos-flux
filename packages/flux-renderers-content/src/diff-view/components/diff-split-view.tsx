import type { DiffFile } from '../model/diff-file.js';
import { t } from '@nop-chaos/flux-i18n';
import { useHighlightedHtmlMaps, useInlineTokensMaps } from '../model/use-diff-line-maps.js';
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
  onLineClick,
  onHunkExpand,
}: DiffSplitViewProps) {
  const inlineTokensMaps = useInlineTokensMaps(file, showInlineDiff);

  const highlightedHtmlMaps = useHighlightedHtmlMaps(file, language);

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
            onLineClick={onLineClick ? (lineNumber, type) => onLineClick(lineNumber, 'old', type) : undefined}
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
            onLineClick={onLineClick ? (lineNumber, type) => onLineClick(lineNumber, 'new', type) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
