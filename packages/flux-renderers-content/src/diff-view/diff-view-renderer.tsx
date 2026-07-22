import { useState, useMemo, useCallback, useEffect, useRef, useImperativeHandle, type CSSProperties, type Ref } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { DiffViewSchema, DiffFileMeta } from '../schemas.js';
import { computeDiffFile } from './model/diff-parse.js';
import { computeDiffStats } from './utils/diff-stats.js';
import { DiffHeader } from './components/diff-header.js';
import { DiffSplitView } from './components/diff-split-view.js';
import { DiffUnifiedView } from './components/diff-unified-view.js';
import { DiffThreeColumnView } from './components/diff-three-column-view.js';
import { DiffFileList } from './components/diff-file-list.js';

const DEBOUNCE_MS = 150;

export interface DiffViewHandle {
  toggleViewType: () => void;
  setViewType: (type: 'split' | 'unified') => void;
  expandAll: () => void;
  collapseAll: () => void;
}

type ExpansionState = 'normal' | 'all-expanded' | 'all-collapsed';

interface SingleFileDiffProps {
  oldContent: string;
  newContent: string;
  middleContent?: string;
  language?: string;
  showLineNumbers: boolean;
  showInlineDiff: boolean;
  defaultCollapsedLines: number;
  wrapLines?: boolean;
  viewType: 'split' | 'unified';
  onToggleView: () => void;
  onLineClick: (lineNumber: number, side: 'old' | 'new', type: string) => void;
  onHunkExpand: (hunkIndex: number, expanded: boolean) => void;
  testid?: string;
  className?: string;
  visible: boolean;
  fileName?: string;
  showNavButtons?: boolean;
  hasPrevFile?: boolean;
  hasNextFile?: boolean;
  onPrevFile?: () => void;
  onNextFile?: () => void;
  expansionState?: ExpansionState;
}

function SingleFileDiff({
  oldContent,
  newContent,
  middleContent,
  language,
  showLineNumbers,
  showInlineDiff,
  defaultCollapsedLines,
  wrapLines,
  viewType,
  onToggleView,
  onLineClick,
  onHunkExpand,
  testid,
  className,
  visible,
  fileName,
  showNavButtons,
  hasPrevFile,
  hasNextFile,
  onPrevFile,
  onNextFile,
  expansionState,
}: SingleFileDiffProps) {
  const [debouncedOld, setDebouncedOld] = useState(oldContent);
  const [debouncedNew, setDebouncedNew] = useState(newContent);
  const [debouncedMid, setDebouncedMid] = useState(middleContent ?? '');
  const [debouncedLang, setDebouncedLang] = useState(language);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedOld(oldContent);
      setDebouncedNew(newContent);
      setDebouncedMid(middleContent ?? '');
      setDebouncedLang(language);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [oldContent, newContent, middleContent, language]);

  const file = useMemo(() => computeDiffFile(debouncedOld, debouncedNew), [debouncedOld, debouncedNew]);
  const stats = useMemo(() => computeDiffStats(file), [file]);
  const hasMiddleContent = middleContent != null && middleContent !== '';
  const effectiveCollapsedLines =
    expansionState === 'all-expanded' ? 0 : expansionState === 'all-collapsed' ? -1 : defaultCollapsedLines;

  if (!visible) return null;

  if (hasMiddleContent && viewType === 'split') {
    return (
      <div
        data-testid={testid}
        className={cn('nop-diff-view nop-diff-view-three-column', className)}
        data-view="three-column"
        style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
      >
        <DiffHeader
          stats={stats}
          viewType="split"
          onToggleView={onToggleView}
          fileName={fileName}
          showNavButtons={showNavButtons}
          hasPrevFile={hasPrevFile}
          hasNextFile={hasNextFile}
          onPrevFile={onPrevFile}
          onNextFile={onNextFile}
        />
        <DiffThreeColumnView
          oldContent={debouncedOld}
          middleContent={debouncedMid}
          newContent={debouncedNew}
          language={debouncedLang}
          showLineNumbers={showLineNumbers}
        />
      </div>
    );
  }

  const isEmpty = stats.added === 0 && stats.removed === 0;

  if (isEmpty) {
    return (
      <div data-testid={testid} className={cn('nop-diff-view nop-diff-view-empty', className)} data-view={viewType}>
        <DiffHeader
          stats={stats}
          oldFileName={undefined}
          newFileName={undefined}
          viewType={viewType}
          onToggleView={onToggleView}
          fileName={fileName}
          showNavButtons={showNavButtons}
          hasPrevFile={hasPrevFile}
          hasNextFile={hasNextFile}
          onPrevFile={onPrevFile}
          onNextFile={onNextFile}
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
      data-testid={testid}
      className={cn('nop-diff-view', className, wrapLines ? 'nop-diff-wrap' : '')}
      data-view={viewType}
      style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
    >
      <DiffHeader
        stats={stats}
        viewType={viewType}
        onToggleView={onToggleView}
        fileName={fileName}
        showNavButtons={showNavButtons}
        hasPrevFile={hasPrevFile}
        hasNextFile={hasNextFile}
        onPrevFile={onPrevFile}
        onNextFile={onNextFile}
      />
      <div style={viewTransitionStyle}>
        {viewType === 'split' ? (
          <DiffSplitView
            file={file}
            defaultCollapsedLines={effectiveCollapsedLines}
            showLineNumbers={showLineNumbers}
            showInlineDiff={showInlineDiff}
            language={debouncedLang}
            onLineClick={onLineClick}
            onHunkExpand={onHunkExpand}
          />
        ) : (
          <DiffUnifiedView
            file={file}
            defaultCollapsedLines={effectiveCollapsedLines}
            showLineNumbers={showLineNumbers}
            showInlineDiff={showInlineDiff}
            language={debouncedLang}
            onLineClick={onLineClick}
            onHunkExpand={onHunkExpand}
          />
        )}
      </div>
    </div>
  );
}

export function DiffViewRenderer(allProps: RendererComponentProps<DiffViewSchema> & { ref?: Ref<DiffViewHandle> }) {
  const { ref, props: resolved, meta, events } = allProps;

  const {
    files,
    oldContent = '',
    newContent = '',
    middleContent,
    language,
    showLineNumbers = true,
    showInlineDiff = true,
    defaultCollapsedLines = 10,
    wrapLines,
  } = resolved;

  const isCrossFile = files != null && files.length > 0;

  const schemaViewType = (resolved.viewType || 'split') as 'split' | 'unified';
  const [singleViewType, setSingleViewType] = useState<'split' | 'unified'>(schemaViewType);
  const [expansionState, setExpansionState] = useState<ExpansionState>('normal');
  const [remountKey, setRemountKey] = useState(0);

  const toggleViewType = useCallback(() => {
    setSingleViewType((prev) => (prev === 'split' ? 'unified' : 'split'));
  }, []);

  const handleExpandAll = useCallback(() => {
    setExpansionState('all-expanded');
    setRemountKey((k) => k + 1);
  }, []);

  const handleCollapseAll = useCallback(() => {
    setExpansionState('all-collapsed');
    setRemountKey((k) => k + 1);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      toggleViewType,
      setViewType: setSingleViewType,
      expandAll: handleExpandAll,
      collapseAll: handleCollapseAll,
    }),
    [toggleViewType, setSingleViewType, handleExpandAll, handleCollapseAll],
  );

  if (!meta.visible) return null;

  if (isCrossFile) {
    if (oldContent || newContent) {
      console.warn('[diff-view] `files` and `oldContent/newContent` are mutually exclusive. `files` takes precedence.');
    }
    return (
      <CrossFileDiffView
        key={remountKey}
        files={files ?? []}
        activeFileIndex={resolved.activeFileIndex ?? 0}
        language={language}
        showLineNumbers={showLineNumbers}
        showInlineDiff={showInlineDiff}
        defaultCollapsedLines={defaultCollapsedLines}
        wrapLines={wrapLines}
        schemaViewType={schemaViewType}
        viewType={singleViewType}
        onToggleView={toggleViewType}
        expansionState={expansionState}
        testid={meta.testid}
        className={meta.className}
        onLineClick={(lineNumber, side, type) => events.onLineClick?.({ lineNumber, side, type })}
        onHunkExpand={(hunkIndex, expanded) => events.onHunkExpand?.({ hunkIndex, expanded })}
      />
    );
  }

  return (
    <SingleFileDiff
      key={remountKey}
      oldContent={oldContent}
      newContent={newContent}
      middleContent={middleContent}
      language={language}
      showLineNumbers={showLineNumbers}
      showInlineDiff={showInlineDiff}
      defaultCollapsedLines={defaultCollapsedLines}
      wrapLines={wrapLines}
      viewType={singleViewType}
      onToggleView={toggleViewType}
      visible={meta.visible}
      testid={meta.testid}
      className={meta.className}
      expansionState={expansionState}
      onLineClick={(lineNumber, side, type) => events.onLineClick?.({ lineNumber, side, type })}
      onHunkExpand={(hunkIndex, expanded) => events.onHunkExpand?.({ hunkIndex, expanded })}
    />
  );
}

function getContentForFile(files: DiffFileMeta[], index: number) {
  const file = files[index];
  if (!file) return { oldContent: '', newContent: '', language: undefined as string | undefined };
  return {
    oldContent: file.oldContent ?? '',
    newContent: file.newContent ?? '',
    language: file.language,
  };
}

interface CrossFileDiffViewProps {
  files: DiffFileMeta[];
  activeFileIndex: number;
  language?: string;
  showLineNumbers: boolean;
  showInlineDiff: boolean;
  defaultCollapsedLines: number;
  wrapLines?: boolean;
  schemaViewType: 'split' | 'unified';
  viewType: 'split' | 'unified';
  onToggleView: () => void;
  expansionState?: ExpansionState;
  testid?: string;
  className?: string;
  onLineClick?: (lineNumber: number, side: 'old' | 'new', type: string) => void;
  onHunkExpand?: (hunkIndex: number, expanded: boolean) => void;
}

function CrossFileDiffView({
  files,
  activeFileIndex: initialIndex,
  language,
  showLineNumbers,
  showInlineDiff,
  defaultCollapsedLines,
  wrapLines,
  viewType,
  onToggleView,
  expansionState,
  testid,
  className,
  onLineClick: onLineClickProp,
  onHunkExpand: onHunkExpandProp,
}: CrossFileDiffViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clampedIndex = Math.min(initialIndex, files.length - 1);
  const [activeIndex, setActiveIndex] = useState(clampedIndex);

  const handleFileSelect = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const handlePrevFile = useCallback(() => {
    setActiveIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNextFile = useCallback(() => {
    setActiveIndex((prev) => Math.min(files.length - 1, prev + 1));
  }, [files.length]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const el = containerRef.current;
      if (!el || !el.contains(e.target as Node)) return;
      if (e.ctrlKey && e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrevFile();
      } else if (e.ctrlKey && e.key === 'ArrowDown') {
        e.preventDefault();
        handleNextFile();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevFile, handleNextFile]);

  const activeFile = files[activeIndex];
  const content = getContentForFile(files, activeIndex);

  const handleLineClick = useCallback(
    (lineNumber: number, side: 'old' | 'new', type: string) => {
      onLineClickProp?.(lineNumber, side, type);
    },
    [onLineClickProp],
  );

  const handleHunkExpand = useCallback(
    (hunkIndex: number, expanded: boolean) => {
      onHunkExpandProp?.(hunkIndex, expanded);
    },
    [onHunkExpandProp],
  );

  return (
    <div
      ref={containerRef}
      data-testid={testid}
      data-shortcuts="diff-view"
      className={cn('nop-diff-view nop-diff-view-cross-file', className)}
      style={{ display: 'flex', flexDirection: 'row', minHeight: 0, overflow: 'hidden', height: '100%' }}
    >
      <DiffFileList
        files={files}
        activeIndex={activeIndex}
        onFileSelect={handleFileSelect}
      />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        <SingleFileDiff
          oldContent={content.oldContent}
          newContent={content.newContent}
          middleContent={undefined}
          language={content.language ?? language}
          showLineNumbers={showLineNumbers}
          showInlineDiff={showInlineDiff}
          defaultCollapsedLines={defaultCollapsedLines}
          wrapLines={wrapLines}
          viewType={viewType}
          onToggleView={onToggleView}
          expansionState={expansionState}
          onLineClick={handleLineClick}
          onHunkExpand={handleHunkExpand}
          visible={true}
          fileName={activeFile?.fileName}
          showNavButtons={true}
          hasPrevFile={activeIndex > 0}
          hasNextFile={activeIndex < files.length - 1}
          onPrevFile={handlePrevFile}
          onNextFile={handleNextFile}
        />
      </div>
    </div>
  );
}
