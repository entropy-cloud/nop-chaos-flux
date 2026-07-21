import { memo } from 'react';
import { t } from '@nop-chaos/flux-i18n';
import type { DiffStats } from '../utils/diff-stats.js';

interface DiffHeaderProps {
  stats: DiffStats;
  oldFileName?: string;
  newFileName?: string;
  viewType: 'split' | 'unified';
  onToggleView: () => void;
  fileName?: string;
  showNavButtons?: boolean;
  hasPrevFile?: boolean;
  hasNextFile?: boolean;
  onPrevFile?: () => void;
  onNextFile?: () => void;
}

export const DiffHeader = memo(function DiffHeader({
  stats,
  oldFileName,
  newFileName,
  viewType,
  onToggleView,
  fileName,
  showNavButtons,
  hasPrevFile,
  hasNextFile,
  onPrevFile,
  onNextFile,
}: DiffHeaderProps) {
  return (
    <div className="nop-diff-header" data-slot="diff-header">
      <div className="nop-diff-header-files">
        {fileName && <span className="nop-diff-file-name">{fileName}</span>}
        {!fileName && oldFileName && <span className="nop-diff-file-old">{oldFileName}</span>}
        {!fileName && newFileName && <span className="nop-diff-file-new">{newFileName}</span>}
      </div>
      <div className="nop-diff-header-stats">
        <span className="nop-diff-stat-added">+{stats.added}</span>
        <span className="nop-diff-stat-removed">-{stats.removed}</span>
      </div>
      {showNavButtons && (
        <div className="nop-diff-header-nav">
          <button
            type="button"
            className="nop-diff-nav-prev"
            disabled={!hasPrevFile}
            onClick={onPrevFile}
            title={t('flux.diff.prevFile')}
          >
            ↑
          </button>
          <button
            type="button"
            className="nop-diff-nav-next"
            disabled={!hasNextFile}
            onClick={onNextFile}
            title={t('flux.diff.nextFile')}
          >
            ↓
          </button>
        </div>
      )}
      <button type="button" className="nop-diff-view-toggle" onClick={onToggleView}>
        {viewType === 'split' ? t('flux.diff.unifiedView') : t('flux.diff.splitView')}
      </button>
    </div>
  );
});
