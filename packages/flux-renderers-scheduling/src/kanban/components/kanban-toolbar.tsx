import React from 'react';
import { Button, Input } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { Undo2, Redo2, History, X } from 'lucide-react';

export interface KanbanToolbarProps {
  filterText: string;
  onFilterChange: (value: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onToggleActivityLog: () => void;
}

export function KanbanToolbar({
  filterText,
  onFilterChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onToggleActivityLog,
}: KanbanToolbarProps) {
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const clearSearch = (): void => {
    onFilterChange('');
    searchInputRef.current?.focus();
  };
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <Input
        ref={searchInputRef}
        id="kanban-search"
        type="text"
        value={filterText}
        onChange={(e) => onFilterChange(e.target.value)}
        placeholder={t('scheduling.kanban.searchCards')}
        aria-label={t('scheduling.kanban.searchCards')}
        className="px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring w-48"
      />
      {filterText ? (
        // [G4-视角4-01] search clear symmetric with the tag filter's clear
        // control: same link-button pattern + XIcon; reuses its i18n key.
        <Button
          variant="link"
          size="sm"
          data-slot="kanban-search-clear"
          aria-label={t('scheduling.kanban.clearFilter')}
          onClick={clearSearch}
          className="text-muted-foreground hover:text-foreground p-0 h-auto"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </Button>
      ) : null}
      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant="ghost"
          size="sm"
          disabled={!canUndo}
          onClick={onUndo}
          title={t('scheduling.kanban.undo')}
        >
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!canRedo}
          onClick={onRedo}
          title={t('scheduling.kanban.redo')}
        >
          <Redo2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleActivityLog}
          title={t('scheduling.kanban.activityLog')}
        >
          <History className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
