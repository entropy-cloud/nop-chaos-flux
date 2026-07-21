import { useState, useMemo, useCallback, type ReactNode } from 'react';
import { t } from '@nop-chaos/flux-i18n';
import type { DiffFileMeta } from '../../schemas.js';
import { computeDiffFile } from '../model/diff-parse.js';
import { computeDiffStats } from '../utils/diff-stats.js';

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
    { key: 'all', label: `All (${statusCounts.all})` },
    { key: 'added', label: `Added (${statusCounts.added})` },
    { key: 'modified', label: `Modified (${statusCounts.modified})` },
    { key: 'deleted', label: `Deleted (${statusCounts.deleted})` },
  ];

  return (
    <div className="nop-diff-file-list" data-slot="diff-file-list" style={{ width: 240, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--nop-border)', overflow: 'hidden' }}>
      <div style={{ padding: '8px', borderBottom: '1px solid var(--nop-border)' }}>
        <input
          type="text"
          placeholder="Search files..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: '100%', padding: '4px 8px', border: '1px solid var(--nop-border)', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--nop-border)', fontSize: 12 }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatusTab(tab.key)}
            data-active={statusTab === tab.key ? 'true' : undefined}
            style={{
              flex: 1,
              padding: '6px 4px',
              border: 'none',
              background: statusTab === tab.key ? 'var(--nop-bg-active, #e5f0ff)' : 'transparent',
              cursor: 'pointer',
              fontWeight: statusTab === tab.key ? 600 : 400,
              fontSize: 12,
              color: statusTab === tab.key ? 'var(--nop-accent, #1677ff)' : 'var(--nop-text, #333)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {filteredEntries.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', fontSize: 13, color: '#999' }}>{t('flux.diff.noFilesMatch')}</div>
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

const STATUS_LABELS: Record<string, string> = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
};

function FileListItem({ entry, isActive, onSelect }: FileListItemProps) {
  const bg = isActive ? 'var(--nop-bg-active, #e5f0ff)' : 'transparent';
  const hoverBg = 'var(--nop-bg-hover, #f5f5f5)';

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
      {!entry.visited && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1677ff', flexShrink: 0 }} />}
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
        color: entry.status === 'added' ? '#16a34a' : entry.status === 'deleted' ? '#dc2626' : '#ca8a04',
        background: entry.status === 'added' ? '#dcfce7' : entry.status === 'deleted' ? '#fef2f2' : '#fefce8',
      }}>
        {STATUS_LABELS[entry.status]}
      </span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {entry.fileName}
      </span>
      <span style={{ fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
        <span style={{ color: '#16a34a' }}>+{entry.added}</span>
        <span style={{ color: '#dc2626', marginLeft: 4 }}>-{entry.removed}</span>
      </span>
    </div>
  );
}

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
