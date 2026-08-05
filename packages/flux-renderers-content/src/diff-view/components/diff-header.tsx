import { memo } from 'react';
import { Button } from '@nop-chaos/ui';
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
          <Button
            variant="ghost"
            className="nop-diff-nav-prev"
            disabled={!hasPrevFile}
            onClick={onPrevFile}
            aria-label={t('flux.diff.prevFile')}
            title={t('flux.diff.prevFile')}
          >
            ↑
          </Button>
          <Button
            variant="ghost"
            className="nop-diff-nav-next"
            disabled={!hasNextFile}
            onClick={onNextFile}
            aria-label={t('flux.diff.nextFile')}
            title={t('flux.diff.nextFile')}
          >
            ↓
          </Button>
        </div>
      )}
      <Button variant="ghost" className="nop-diff-view-toggle" onClick={onToggleView}>
        {viewType === 'split' ? t('flux.diff.unifiedView') : t('flux.diff.splitView')}
      </Button>
    </div>
  );
});
