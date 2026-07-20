import { memo } from 'react';
import { t } from '@nop-chaos/flux-i18n';
import type { DiffStats } from '../utils/diff-stats.js';

interface DiffHeaderProps {
  stats: DiffStats;
  oldFileName?: string;
  newFileName?: string;
  viewType: 'split' | 'unified';
  onToggleView: () => void;
}

export const DiffHeader = memo(function DiffHeader({
  stats,
  oldFileName,
  newFileName,
  viewType,
  onToggleView,
}: DiffHeaderProps) {
  return (
    <div className="nop-diff-header" data-slot="diff-header">
      <div className="nop-diff-header-files">
        {oldFileName && <span className="nop-diff-file-old">{oldFileName}</span>}
        {newFileName && <span className="nop-diff-file-new">{newFileName}</span>}
      </div>
      <div className="nop-diff-header-stats">
        <span className="nop-diff-stat-added">+{stats.added}</span>
        <span className="nop-diff-stat-removed">-{stats.removed}</span>
      </div>
      <button type="button" className="nop-diff-view-toggle" onClick={onToggleView}>
        {viewType === 'split' ? t('flux.diff.unifiedView') : t('flux.diff.splitView')}
      </button>
    </div>
  );
});
