import { useMemo, useCallback, useState, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Button, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { ThreeWayRow, ThreeWayRowType } from '../model/diff-3way.js';
import { computeThreeWayDiff } from '../model/diff-3way.js';
import { generateConflictMarkerHtml } from '../utils.js';
import { highlight } from '../adapters/syntax-highlight.js';

interface DiffThreeColumnViewProps {
  oldContent: string;
  middleContent: string;
  newContent: string;
  language?: string;
  showLineNumbers?: boolean;
  onLineClick?: (lineNumber: number, side: 'old' | 'middle' | 'new', type: string) => void;
}

function paneRowLineNumber(row: ThreeWayRow, side: 'old' | 'middle' | 'new'): number {
  return side === 'old'
    ? row.oldLineNum ?? 0
    : side === 'middle'
      ? row.middleLineNum ?? 0
      : row.newLineNum ?? 0;
}

function paneRowHandlers(
  row: ThreeWayRow,
  side: 'old' | 'middle' | 'new',
  onLineClick?: (lineNumber: number, side: 'old' | 'middle' | 'new', type: string) => void,
) {
  if (!onLineClick) return {};
  const handleClick = () => onLineClick(paneRowLineNumber(row, side), side, row.type);
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: handleClick,
    onKeyDown: (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
  };
}

function isConflictRow(row: ThreeWayRow): boolean {
  return row.type === 'conflict' || row.type === 'conflict-start' || row.type === 'conflict-separator' || row.type === 'conflict-end';
}

function isMarkerRow(row: ThreeWayRow): boolean {
  return row.type === 'conflict-start' || row.type === 'conflict-separator' || row.type === 'conflict-end';
}

// WA-content-003 (plan 567): the three panes were three verbatim copies of the
// same rows.map JSX (~70 lines, born in cdab2db0f, resynced by aa5155530).
// One parameterized pane renderer; the real per-pane differences (key prefix,
// gutter tag, line-number/content fields, change-old/new class) live in the
// spec, and the row predicates are computed once per row instead of 3×.
interface ThreeColPaneSpec {
  key: 'old' | 'mid' | 'new';
  handlerSide: 'old' | 'middle' | 'new';
  headerKey: 'flux.diff.oldPane' | 'flux.diff.midPane' | 'flux.diff.newPane';
  paneClass: string;
  lineNum: (row: ThreeWayRow) => number | string;
  content: (row: ThreeWayRow) => string;
  changeClass?: (row: ThreeWayRow) => string | false;
}

const THREE_COL_PANES: ThreeColPaneSpec[] = [
  {
    key: 'old',
    handlerSide: 'old',
    headerKey: 'flux.diff.oldPane',
    paneClass: 'nop-diff-three-col-pane nop-diff-three-col-old border-r',
    lineNum: (row) => row.oldLineNum ?? '',
    content: (row) => row.oldContent,
    changeClass: (row) => row.type === 'change-old' && 'nop-diff-line-change-old',
  },
  {
    key: 'mid',
    handlerSide: 'middle',
    headerKey: 'flux.diff.midPane',
    paneClass: 'nop-diff-three-col-pane nop-diff-three-col-mid border-r',
    lineNum: (row) => row.middleLineNum ?? '',
    content: (row) => row.middleContent,
  },
  {
    key: 'new',
    handlerSide: 'new',
    headerKey: 'flux.diff.newPane',
    paneClass: 'nop-diff-three-col-pane nop-diff-three-col-new',
    lineNum: (row) => row.newLineNum ?? '',
    content: (row) => row.newContent,
    changeClass: (row) => row.type === 'change-new' && 'nop-diff-line-change-new',
  },
];

function ThreeColPaneRow(props: {
  row: ThreeWayRow;
  flags: { conflict: boolean; marker: boolean };
  spec: ThreeColPaneSpec;
  showLineNumbers: boolean | undefined;
  language: string | undefined;
  onLineClick?: (lineNumber: number, side: 'old' | 'middle' | 'new', type: string) => void;
}) {
  const { row, flags, spec, showLineNumbers, language, onLineClick } = props;
  return (
    <div
      key={`${spec.key}-${row.lineNum}`}
      data-line={row.lineNum}
      data-diff-type={row.type}
      className={cn(
        'nop-diff-three-col-line',
        flags.conflict && 'nop-diff-line-conflict',
        flags.marker && 'nop-diff-line-conflict-marker',
        spec.changeClass?.(row),
      )}
      {...paneRowHandlers(row, spec.handlerSide, onLineClick)}
    >
      {showLineNumbers && (
        <span data-slot="diff-gutter" data-diff-gutter={spec.key} className="nop-diff-gutter">
          {spec.lineNum(row)}
        </span>
      )}
      <span
        className="nop-diff-content"
        dangerouslySetInnerHTML={{
          __html: flags.marker
            ? generateConflictMarkerHtml(row.type as ThreeWayRowType)
            : highlight(spec.content(row), language || 'plaintext'),
        }}
      />
    </div>
  );
}

export function DiffThreeColumnView({
  oldContent,
  middleContent,
  newContent,
  language,
  showLineNumbers,
  onLineClick,
}: DiffThreeColumnViewProps) {
  const { rows, conflictZones } = useMemo(
    () => computeThreeWayDiff(oldContent, middleContent, newContent),
    [oldContent, middleContent, newContent],
  );

  const rowFlags = rows.map((row) => ({ conflict: isConflictRow(row), marker: isMarkerRow(row) }));

  const [currentDiffIndex, setCurrentDiffIndex] = useState(() => conflictZones.length > 0 ? 0 : -1);
  const containerRef = useRef<HTMLDivElement>(null);

  const goToPrevDiff = useCallback(() => {
    setCurrentDiffIndex((prev) => {
      if (conflictZones.length === 0) return -1;
      return prev <= 0 ? conflictZones.length - 1 : prev - 1;
    });
  }, [conflictZones]);

  const goToNextDiff = useCallback(() => {
    setCurrentDiffIndex((prev) => {
      if (conflictZones.length === 0) return -1;
      return prev >= conflictZones.length - 1 ? 0 : prev + 1;
    });
  }, [conflictZones]);

  useEffect(() => {
    if (currentDiffIndex < 0 || currentDiffIndex >= conflictZones.length) return;
    const zone = conflictZones[currentDiffIndex];
    const targetLine = zone.startLine;
    const container = containerRef.current;
    if (!container) return;
    const els = container.querySelectorAll(`[data-line="${targetLine}"]`);
    const flashTimers: ReturnType<typeof setTimeout>[] = [];
    els.forEach((el) => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('nop-diff-line-flash');
      flashTimers.push(setTimeout(() => el.classList.remove('nop-diff-line-flash'), 500));
    });
    return () => flashTimers.forEach((timer) => clearTimeout(timer));
  }, [currentDiffIndex, conflictZones]);



  return (
    <div data-view="three-column" className="nop-diff-three-column-view">
      {conflictZones.length > 0 && (
        <div className="nop-diff-three-col-nav flex items-center gap-2 px-2 py-1 border-b">
          <Button
            size="sm"
            variant="outline"
            disabled={conflictZones.length === 0}
            onClick={goToPrevDiff}
          >
            {t('flux.diff.prevDiff')}
          </Button>
          <span className="text-xs text-muted-foreground">
            {currentDiffIndex >= 0
              ? `${currentDiffIndex + 1} / ${conflictZones.length}`
              : '0 / 0'}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={conflictZones.length === 0}
            onClick={goToNextDiff}
          >
            {t('flux.diff.nextDiff')}
          </Button>
        </div>
      )}
      <div
        ref={containerRef}
        className="nop-diff-three-col-grid grid grid-cols-3 overflow-auto min-h-0 flex-1"
      >
        {THREE_COL_PANES.map((spec) => (
          <div key={spec.key} className={spec.paneClass}>
            <div className="nop-diff-pane-header">{t(spec.headerKey)}</div>
            {rows.map((row, rowIndex) => (
              <ThreeColPaneRow
                key={`${spec.key}-${row.lineNum}`}
                row={row}
                flags={rowFlags[rowIndex]}
                spec={spec}
                showLineNumbers={showLineNumbers}
                language={language}
                onLineClick={onLineClick}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
