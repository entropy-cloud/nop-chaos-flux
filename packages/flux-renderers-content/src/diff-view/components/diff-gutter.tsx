import { memo } from 'react';

interface DiffGutterCellProps {
  lineNumber?: number;
  side: 'old' | 'new';
}

/**
 * @deprecated This component is unused internally and will be removed in a future version.
 * Line numbers are rendered inline via gutter spans in diff-line components.
 */
export const DiffGutterCell = memo(function DiffGutterCell({
  lineNumber,
  side,
}: DiffGutterCellProps) {
  return (
    <span data-slot="diff-gutter" data-diff-gutter={side} className="nop-diff-gutter-cell">
      {lineNumber ?? ''}
    </span>
  );
});
