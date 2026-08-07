import { useState, useMemo, useCallback, type ReactNode } from 'react';
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
    <div className="nop-diff-file-list" data-slot="diff-file-list" style={{ width: 240, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--nop-border)', overflow: 'hidden' }}>
      <div style={{ padding: '8px', borderBottom: '1px solid var(--nop-border)' }}>
        <Input
          type="search"
          aria-label={t('flux.diff.searchFiles')}
          placeholder={t('flux.diff.searchFiles')}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="h-8 w-full text-xs"
        />
      </div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--nop-border)', fontSize: 12 }}>
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant="ghost"
            onClick={() => setStatusTab(tab.key)}
            data-active={statusTab === tab.key ? 'true' : undefined}
            style={{
              flex: 1,
              padding: '6px 4px',
              border: 'none',
              background: statusTab === tab.key ? 'var(--nop-diff-active-bg)' : 'transparent',
              cursor: 'pointer',
              fontWeight: statusTab === tab.key ? 600 : 400,
              fontSize: 12,
              color: statusTab === tab.key ? 'var(--nop-diff-accent)' : 'var(--nop-diff-muted-text)',
            }}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {filteredEntries.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', fontSize: 13, color: 'var(--nop-diff-muted-text)' }}>{t('flux.diff.noFilesMatch')}</div>
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
  const bg = isActive ? 'var(--nop-diff-active-bg)' : 'transparent';
  const hoverBg = 'var(--nop-diff-hover-bg)';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        cursor: 'pointer',
        background: bg,
        transition: 'background 0.1s',
        fontSize: 13,
        userSelect: 'none',
      }}
      onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = hoverBg; }}
      onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {!entry.visited && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--nop-diff-accent)', flexShrink: 0 }} />}
      {entry.visited && <span style={{ width: 6, height: 6, flexShrink: 0 }} />}
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 20,
        height: 20,
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        flexShrink: 0,
        color:
          entry.status === 'added'
            ? 'var(--nop-diff-stat-added-text)'
            : entry.status === 'deleted'
              ? 'var(--nop-diff-stat-removed-text)'
              : 'var(--nop-diff-stat-modified-text)',
        background:
          entry.status === 'added'
            ? 'var(--nop-diff-stat-added-bg)'
            : entry.status === 'deleted'
              ? 'var(--nop-diff-stat-removed-bg)'
              : 'var(--nop-diff-stat-modified-bg)',
      }}>
        {statusLetter(entry.status)}
      </span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {entry.fileName}
      </span>
      <span style={{ fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
        <span style={{ color: 'var(--nop-diff-stat-added-text)' }}>+{entry.added}</span>
        <span style={{ color: 'var(--nop-diff-stat-removed-text)', marginLeft: 4 }}>-{entry.removed}</span>
      </span>
    </div>
  );
}

/**
 * @deprecated Use `<DiffFileList>` directly instead. This function wrapper
 * will be removed in a future version.
 */
export function renderFileListSidebar(
  files: DiffFileMeta[],
  activeIndex: number,
  onFileSelect: (index: number) => void,
): ReactNode {
  return (
    <DiffFileList
      files={files}
      activeIndex={activeIndex}
      onFileSelect={onFileSelect}
    />
  );
}
