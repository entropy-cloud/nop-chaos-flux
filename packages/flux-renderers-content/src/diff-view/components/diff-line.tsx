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
}

export const DiffLineComponent = memo(function DiffLineComponent({
  line,
  inlineTokens,
  oldLineNum,
  newLineNum,
  isUnified,
  highlightedHtml,
}: DiffLineProps) {
  const contentHtml = highlightedHtml || generateLineContentHtml(line.content, line.type, inlineTokens);
  return (
    <div
      data-diff-type={line.type}
      className={`nop-diff-line nop-diff-line-${line.type}`}
    >
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
    </div>
  );
}, areDiffLinePropsEqual);

function areDiffLinePropsEqual(prev: DiffLineProps, next: DiffLineProps): boolean {
  return (
    prev.line.type === next.line.type &&
    prev.line.content === next.line.content &&
    prev.oldLineNum === next.oldLineNum &&
    prev.newLineNum === next.newLineNum &&
    prev.showLineNumbers === next.showLineNumbers &&
    prev.isUnified === next.isUnified &&
    prev.inlineTokens === next.inlineTokens &&
    prev.highlightedHtml === next.highlightedHtml
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
