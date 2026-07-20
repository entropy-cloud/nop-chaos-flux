import { useState, useMemo, useCallback, useEffect, useRef, type CSSProperties } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { DiffViewSchema } from '../schemas.js';
import { computeDiffFile } from './model/diff-parse.js';
import { computeDiffStats } from './utils/diff-stats.js';
import { DiffHeader } from './components/diff-header.js';
import { DiffSplitView } from './components/diff-split-view.js';
import { DiffUnifiedView } from './components/diff-unified-view.js';

const DEBOUNCE_MS = 150;

export function DiffViewRenderer(props: RendererComponentProps<DiffViewSchema>) {
  const { props: resolved, meta, events } = props;

  const {
    oldContent = '',
    newContent = '',
    language,
    showLineNumbers = true,
    showInlineDiff = true,
    defaultCollapsedLines = 10,
    wrapLines,
  } = resolved;

  const [debouncedOld, setDebouncedOld] = useState(oldContent);
  const [debouncedNew, setDebouncedNew] = useState(newContent);
  const [debouncedLang, setDebouncedLang] = useState(language);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedOld(oldContent);
      setDebouncedNew(newContent);
      setDebouncedLang(language);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [oldContent, newContent, language]);

  const schemaViewType = resolved.viewType || 'split';
  const [viewType, setViewType] = useState<'split' | 'unified'>(schemaViewType as 'split' | 'unified');

  const toggleViewType = useCallback(() => {
    setViewType((prev) => (prev === 'split' ? 'unified' : 'split'));
  }, []);

  const file = useMemo(() => computeDiffFile(debouncedOld, debouncedNew), [debouncedOld, debouncedNew]);

  const stats = useMemo(() => computeDiffStats(file), [file]);

  const handleLineClick = useCallback(
    (lineNumber: number, side: 'old' | 'new', type: string) => {
      events.onLineClick?.({ lineNumber, side, type });
    },
    [events],
  );

  const handleHunkExpand = useCallback(
    (hunkIndex: number, expanded: boolean) => {
      events.onHunkExpand?.({ hunkIndex, expanded });
    },
    [events],
  );

  if (!meta.visible) return null;

  const isEmpty = stats.added === 0 && stats.removed === 0;

  if (isEmpty) {
    return (
      <div data-testid={meta.testid} className={cn('nop-diff-view nop-diff-view-empty', meta.className)} data-view={viewType}>
        <DiffHeader
          stats={stats}
          oldFileName={undefined}
          newFileName={undefined}
          viewType={viewType}
          onToggleView={toggleViewType}
        />
        <div className="nop-diff-empty-state">{t('flux.diff.noChanges')}</div>
      </div>
    );
  }

  const viewTransitionStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: viewType === 'split' ? '1fr 1fr' : '1fr',
    transition: 'grid-template-columns 150ms ease-out',
    overflow: 'hidden',
    minHeight: 0,
    flex: 1,
  };

  return (
    <div
      data-testid={meta.testid}
      className={cn('nop-diff-view', meta.className, wrapLines ? 'nop-diff-wrap' : '')}
      data-view={viewType}
      style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
    >
      <DiffHeader
        stats={stats}
        viewType={viewType}
        onToggleView={toggleViewType}
      />
      <div style={viewTransitionStyle}>
        {viewType === 'split' ? (
          <DiffSplitView
            file={file}
            defaultCollapsedLines={defaultCollapsedLines}
            showLineNumbers={showLineNumbers}
            showInlineDiff={showInlineDiff}
            language={debouncedLang}
            onLineClick={handleLineClick}
            onHunkExpand={handleHunkExpand}
          />
        ) : (
          <DiffUnifiedView
            file={file}
            defaultCollapsedLines={defaultCollapsedLines}
            showLineNumbers={showLineNumbers}
            showInlineDiff={showInlineDiff}
            language={debouncedLang}
            onLineClick={handleLineClick}
            onHunkExpand={handleHunkExpand}
          />
        )}
      </div>
    </div>
  );
}
