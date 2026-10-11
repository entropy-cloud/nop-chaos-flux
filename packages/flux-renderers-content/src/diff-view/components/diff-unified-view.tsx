import type { DiffFile } from '../model/diff-file.js';
import { useHighlightedHtmlMaps, useInlineTokensMaps } from '../model/use-diff-line-maps.js';
import { DiffHunkComponent } from './diff-hunk.js';

interface DiffUnifiedViewProps {
  file: DiffFile;
  defaultCollapsedLines: number;
  showLineNumbers?: boolean;
  showInlineDiff?: boolean;
  language?: string;
  onLineClick?: (lineNumber: number, side: 'old' | 'new', type: string) => void;
  onHunkExpand?: (hunkIndex: number, expanded: boolean) => void;
}

export function DiffUnifiedView({
  file,
  defaultCollapsedLines,
  showLineNumbers,
  showInlineDiff,
  language,
  onLineClick,
  onHunkExpand,
}: DiffUnifiedViewProps) {
  const inlineTokensMaps = useInlineTokensMaps(file, showInlineDiff);

  const highlightedHtmlMaps = useHighlightedHtmlMaps(file, language);

  return (
    <div data-view="unified" className="nop-diff-unified-view">
      {file.hunks.map((hunk, hunkIdx) => (
        <DiffHunkComponent
          key={hunk.header}
          hunk={hunk}
          hunkIndex={hunkIdx}
          defaultCollapsedLines={defaultCollapsedLines}
          isUnified={true}
          showLineNumbers={showLineNumbers}
          inlineTokensMap={inlineTokensMaps?.get(hunkIdx)}
          highlightedHtmlMap={highlightedHtmlMaps?.get(hunkIdx)}
          onHunkExpand={onHunkExpand}
          onLineClick={onLineClick ? (lineNumber, type) => {
            const side = type === 'add' ? 'new' : 'old';
            onLineClick(lineNumber, side, type);
          } : undefined}
        />
      ))}
    </div>
  );
}
