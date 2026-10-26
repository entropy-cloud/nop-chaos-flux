import { useState, useMemo, useCallback } from 'react';
import { Button, Input } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { DiffFileMeta } from '../../schemas.js';
import { computeDiffFile } from '../model/diff-parse.js';
import { computeDiffStats } from '../utils.js';

interface FileEntryData {
  index: number;
  fileName: string;
  status: 'added' | 'modified' | 'deleted';
  added: number;
  removed: number;
  visited: boolean;
}

interface DiffFileListProps {
  files: DiffFileMeta[];
  activeIndex: number;
  onFileSelect: (index: number) => void;
}

type StatusTab = 'all' | 'added' | 'modified' | 'deleted';

export function DiffFileList({ files, activeIndex, onFileSelect }: DiffFileListProps) {
  'use no memo';
  const [searchText, setSearchText] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [visitedSet, setVisitedSet] = useState<Set<number>>(() => new Set());

  const entries = useMemo<FileEntryData[]>(() => {
    return files.map((file, index) => {
      const diffFile = computeDiffFile(file.oldContent ?? '', file.newContent ?? '');
      const stats = computeDiffStats(diffFile);
      return {
        index,
        fileName: file.fileName,
        status: file.status,
        added: stats.added,
        removed: stats.removed,
        visited: visitedSet.has(index),
      };
    });
  }, [files, visitedSet]);

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (searchText) {
      const lower = searchText.toLowerCase();
      result = result.filter((e) => e.fileName.toLowerCase().includes(lower));
    }
    if (statusTab !== 'all') {
      result = result.filter((e) => e.status === statusTab);
    }
    return result;
  }, [entries, searchText, statusTab]);

  const handleSelect = useCallback(
    (index: number) => {
      setVisitedSet((prev) => {
        const next = new Set(prev);
        next.add(index);
        return next;
      });
      onFileSelect(index);
    },
    [onFileSelect],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: files.length, added: 0, modified: 0, deleted: 0 };
    for (const f of files) {
      if (counts[f.status] !== undefined) counts[f.status]++;
    }
    return counts;
  }, [files]);

  const tabs: { key: StatusTab; label: string }[] = [
    { key: 'all', label: t('flux.diff.all', { count: statusCounts.all }) },
    { key: 'added', label: t('flux.diff.added', { count: statusCounts.added }) },
    { key: 'modified', label: t('flux.diff.modified', { count: statusCounts.modified }) },
    { key: 'deleted', label: t('flux.diff.deleted', { count: statusCounts.deleted }) },
  ];

  return (
    // [G1-R2-视角8-02] the sidebar width is owned by `.nop-diff-file-list`
    // (container-relative clamp) instead of a fixed inline 240px.
    <div
      className="nop-diff-file-list flex flex-col overflow-hidden border-r border-[var(--nop-border)]"
      data-slot="diff-file-list"
    >
      <div className="p-2 border-b border-[var(--nop-border)]">
        <Input
          type="search"
          aria-label={t('flux.diff.searchFiles')}
          placeholder={t('flux.diff.searchFiles')}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="h-8 w-full text-xs"
        />
      </div>
      <div className="flex border-b border-[var(--nop-border)] text-xs">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant="ghost"
            onClick={() => setStatusTab(tab.key)}
            aria-pressed={statusTab === tab.key}
            data-active={statusTab === tab.key ? 'true' : undefined}
            className="flex-1 py-1.5 px-1 border-0 bg-transparent cursor-pointer text-xs text-[var(--nop-diff-muted-text)] data-[active=true]:bg-[var(--nop-diff-active-bg)] data-[active=true]:font-semibold data-[active=true]:text-[var(--nop-diff-accent)]"
          >
            {tab.label}
          </Button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {filteredEntries.length === 0 ? (
          <div className="p-4 text-center text-[13px] text-[var(--nop-diff-muted-text)]">{t('flux.diff.noFilesMatch')}</div>
        ) : (
          filteredEntries.map((entry) => (
            <FileListItem
              key={entry.index}
              entry={entry}
              isActive={entry.index === activeIndex}
              onSelect={() => handleSelect(entry.index)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface FileListItemProps {
  entry: FileEntryData;
  isActive: boolean;
  onSelect: () => void;
}

function statusLetter(status: string): string {
  switch (status) {
    case 'added':
      return t('flux.diff.statusAdded');
    case 'modified':
      return t('flux.diff.statusModified');
    case 'deleted':
      return t('flux.diff.statusDeleted');
    default:
      return 'A';
  }
}

function FileListItem({ entry, isActive, onSelect }: FileListItemProps) {
  const statusColorClass =
    entry.status === 'added'
      ? 'text-[var(--nop-diff-stat-added-text)]'
      : entry.status === 'deleted'
        ? 'text-[var(--nop-diff-stat-removed-text)]'
        : 'text-[var(--nop-diff-stat-modified-text)]';
  const statusBgClass =
    entry.status === 'added'
      ? 'bg-[var(--nop-diff-stat-added-bg)]'
      : entry.status === 'deleted'
        ? 'bg-[var(--nop-diff-stat-removed-bg)]'
        : 'bg-[var(--nop-diff-stat-modified-bg)]';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={isActive ? 'true' : undefined}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
      className={[
        'flex items-center gap-2 px-3 py-2 cursor-pointer text-[13px] select-none',
        'transition-colors duration-100',
        isActive ? 'bg-[var(--nop-diff-active-bg)]' : 'bg-transparent hover:bg-[var(--nop-diff-hover-bg)]',
      ].join(' ')}
    >
      {!entry.visited && <span className="w-1.5 h-1.5 rounded-full bg-[var(--nop-diff-accent)] shrink-0" />}
      {entry.visited && <span className="w-1.5 h-1.5 shrink-0" />}
      <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[11px] font-semibold shrink-0 ${statusColorClass} ${statusBgClass}`}>
        {statusLetter(entry.status)}
      </span>
      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
        {entry.fileName}
      </span>
      <span className="text-xs whitespace-nowrap shrink-0">
        <span className="text-[var(--nop-diff-stat-added-text)]">+{entry.added}</span>
        <span className="text-[var(--nop-diff-stat-removed-text)] ml-1">-{entry.removed}</span>
      </span>
    </div>
  );
}

