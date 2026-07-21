import { memo } from 'react';
import { generateLineContentHtml } from '../utils/diff-template.js';
import type { DiffLine } from '../model/diff-file.js';
import type { InlineToken } from '../model/diff-inline.js';

interface DiffLineProps {
  line: DiffLine;
  inlineTokens?: InlineToken[];
  showLineNumbers?: boolean;
  oldLineNum?: number;
  newLineNum?: number;
  isUnified?: boolean;
  highlightedHtml?: string;
  onLineClick?: (lineNumber: number, type: string) => void;
}

export function DiffLineComponent({
  line,
  inlineTokens,
  oldLineNum,
  newLineNum,
  isUnified,
  highlightedHtml,
  onLineClick,
}: DiffLineProps) {
  // Safety: contentHtml is produced by generateLineContentHtml which escapes
  // all user-supplied diff content via escapeHtml() before any HTML rendering.
  // Both the highlighted (syntax-highlighted) and non-highlighted code paths
  // call escapeHtml() on raw line content, so dangerouslySetInnerHTML is safe here.
  const contentHtml = highlightedHtml || generateLineContentHtml(line.content, line.type, inlineTokens);
  const lineNumber = oldLineNum ?? newLineNum ?? 0;

  const lineContent = (
    <>
      <span
        data-slot="diff-gutter"
        data-diff-gutter="old"
        className="nop-diff-gutter"
      >
        {oldLineNum ?? ''}
      </span>
      {isUnified && (
        <span
          data-slot="diff-gutter"
          data-diff-gutter="new"
          className="nop-diff-gutter nop-diff-gutter-new"
        >
          {newLineNum ?? ''}
        </span>
      )}
      <span
        className="nop-diff-content"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </>
  );

  if (onLineClick) {
    const handleClick = () => onLineClick(lineNumber, line.type);
    return (
      <div
        data-diff-type={line.type}
        className={`nop-diff-line nop-diff-line-${line.type} nop-diff-line-clickable`}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {lineContent}
      </div>
    );
  }

  return (
    <div
      data-diff-type={line.type}
      className={`nop-diff-line nop-diff-line-${line.type}`}
    >
      {lineContent}
    </div>
  );
}

interface DiffGutterProps {
  oldLineNum?: number;
  newLineNum?: number;
  isUnified?: boolean;
}

export const DiffGutter = memo(function DiffGutter({
  oldLineNum,
  newLineNum,
  isUnified,
}: DiffGutterProps) {
  return (
    <div data-slot="diff-gutter" className="nop-diff-gutter">
      {isUnified ? (
        <>
          <span data-diff-gutter="old">{oldLineNum ?? ''}</span>
          <span data-diff-gutter="new">{newLineNum ?? ''}</span>
        </>
      ) : (
        <span data-diff-gutter={oldLineNum !== undefined ? 'old' : 'new'}>
          {oldLineNum ?? newLineNum ?? ''}
        </span>
      )}
    </div>
  );
});
