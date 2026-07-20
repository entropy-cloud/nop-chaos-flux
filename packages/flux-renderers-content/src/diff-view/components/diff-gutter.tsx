import { memo } from 'react';

interface DiffGutterCellProps {
  lineNumber?: number;
  side: 'old' | 'new';
}

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
