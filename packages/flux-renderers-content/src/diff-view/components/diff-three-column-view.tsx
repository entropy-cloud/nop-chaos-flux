import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { Button, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { ThreeWayRowType } from '../model/diff-3way.js';
import { computeThreeWayDiff } from '../model/diff-3way.js';
import { generateConflictMarkerHtml } from '../utils/diff-template.js';
import { escapeHtml } from '../adapters/syntax-highlight.js';

interface DiffThreeColumnViewProps {
  oldContent: string;
  middleContent: string;
  newContent: string;
  language?: string;
  showLineNumbers?: boolean;
}

export function DiffThreeColumnView({
  oldContent,
  middleContent,
  newContent,
  showLineNumbers = true,
}: DiffThreeColumnViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { rows, conflictZones } = useMemo(
    () => computeThreeWayDiff(oldContent, middleContent, newContent),
    [oldContent, middleContent, newContent],
  );

  const [currentDiffIndex, setCurrentDiffIndex] = useState(() => conflictZones.length > 0 ? 0 : -1);

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
    els.forEach((el) => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('nop-diff-line-flash');
      setTimeout(() => el.classList.remove('nop-diff-line-flash'), 500);
    });
  }, [currentDiffIndex, conflictZones]);



  return (
    <div data-view="three-column" className="nop-diff-three-column-view">
      {conflictZones.length > 0 && (
        <div className="nop-diff-three-col-nav flex items-center gap-2 px-2 py-1 border-b bg-gray-50">
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
        className="nop-diff-three-col-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          overflow: 'auto',
          minHeight: 0,
          flex: 1,
        }}
      >
        <div className="nop-diff-three-col-pane nop-diff-three-col-old border-r">
          <div className="nop-diff-pane-header">{t('flux.diff.oldPane')}</div>
          {rows.map((row) => {
            const isConflict = row.type === 'conflict' || row.type === 'conflict-start' || row.type === 'conflict-separator' || row.type === 'conflict-end';
            const isMarker = row.type === 'conflict-start' || row.type === 'conflict-separator' || row.type === 'conflict-end';
            return (
              <div
                key={`old-${row.lineNum}`}
                data-line={row.lineNum}
                data-diff-type={row.type}
                className={cn(
                  'nop-diff-three-col-line',
                  isConflict && 'nop-diff-line-conflict',
                  isMarker && 'nop-diff-line-conflict-marker',
                  row.type === 'change-old' && 'nop-diff-line-change-old',
                )}
              >
                {showLineNumbers && (
                  <span data-slot="diff-gutter" data-diff-gutter="old" className="nop-diff-gutter">
                    {row.oldLineNum ?? ''}
                  </span>
                )}
                <span
                  className="nop-diff-content"
                  dangerouslySetInnerHTML={{
                    __html: isMarker
                      ? generateConflictMarkerHtml(row.type as ThreeWayRowType)
                      : escapeHtml(row.oldContent),
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="nop-diff-three-col-pane nop-diff-three-col-mid border-r">
          <div className="nop-diff-pane-header">{t('flux.diff.midPane')}</div>
          {rows.map((row) => {
            const isConflict = row.type === 'conflict' || row.type === 'conflict-start' || row.type === 'conflict-separator' || row.type === 'conflict-end';
            const isMarker = row.type === 'conflict-start' || row.type === 'conflict-separator' || row.type === 'conflict-end';
            return (
              <div
                key={`mid-${row.lineNum}`}
                data-line={row.lineNum}
                data-diff-type={row.type}
                className={cn(
                  'nop-diff-three-col-line',
                  isConflict && 'nop-diff-line-conflict',
                  isMarker && 'nop-diff-line-conflict-marker',
                )}
              >
                {showLineNumbers && (
                  <span data-slot="diff-gutter" data-diff-gutter="mid" className="nop-diff-gutter">
                    {row.middleLineNum ?? ''}
                  </span>
                )}
                <span
                  className="nop-diff-content"
                  dangerouslySetInnerHTML={{
                    __html: isMarker
                      ? generateConflictMarkerHtml(row.type as ThreeWayRowType)
                      : escapeHtml(row.middleContent),
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="nop-diff-three-col-pane nop-diff-three-col-new">
          <div className="nop-diff-pane-header">{t('flux.diff.newPane')}</div>
          {rows.map((row) => {
            const isConflict = row.type === 'conflict' || row.type === 'conflict-start' || row.type === 'conflict-separator' || row.type === 'conflict-end';
            const isMarker = row.type === 'conflict-start' || row.type === 'conflict-separator' || row.type === 'conflict-end';
            return (
              <div
                key={`new-${row.lineNum}`}
                data-line={row.lineNum}
                data-diff-type={row.type}
                className={cn(
                  'nop-diff-three-col-line',
                  isConflict && 'nop-diff-line-conflict',
                  isMarker && 'nop-diff-line-conflict-marker',
                  row.type === 'change-new' && 'nop-diff-line-change-new',
                )}
              >
                {showLineNumbers && (
                  <span data-slot="diff-gutter" data-diff-gutter="new" className="nop-diff-gutter">
                    {row.newLineNum ?? ''}
                  </span>
                )}
                <span
                  className="nop-diff-content"
                  dangerouslySetInnerHTML={{
                    __html: isMarker
                      ? generateConflictMarkerHtml(row.type as ThreeWayRowType)
                      : escapeHtml(row.newContent),
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
