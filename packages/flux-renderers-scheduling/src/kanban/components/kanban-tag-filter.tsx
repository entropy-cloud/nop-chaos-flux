import React from 'react';
import { Button, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { kanbanTagChipNeedsWhiteText } from '../utils/kanban-tag-contrast.js';

export interface KanbanFilterTag {
  id: string;
  text: string;
  color: string;
}

export interface KanbanTagFilterProps {
  tags: KanbanFilterTag[];
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
  className?: string;
}

export function KanbanTagFilter({
  tags,
  selectedTagIds,
  onToggleTag,
  className,
}: KanbanTagFilterProps) {
  if (tags.length === 0) return null;

  return (
    <div
      className={cn(
        'nop-kanban-tag-filter flex items-center gap-1.5 flex-wrap px-4 py-2',
        className,
      )}
    >
      <span className="text-xs text-muted-foreground mr-1">
        {t('scheduling.kanban.filterLabel')}
      </span>
      {tags.map((tag) => {
        const selected = selectedTagIds.includes(tag.id);
        return (
          <Button
            key={tag.id}
            variant="ghost"
            size="sm"
            aria-pressed={selected}
            onClick={() => onToggleTag(tag.id)}
            className={cn(
              'px-2 py-0.5 text-xs rounded-full border transition-colors',
              selected
                ? [
                    'border-transparent font-medium',
                    kanbanTagChipNeedsWhiteText(tag.color) ? 'text-white' : 'text-black',
                  ]
                : 'border-border text-foreground/70 hover:bg-muted',
            )}
            style={selected ? { backgroundColor: tag.color } : undefined}
          >
            {tag.text}
          </Button>
        );
      })}
      {selectedTagIds.length > 0 && (
        <Button
          variant="link"
          size="sm"
          onClick={() => selectedTagIds.forEach((id) => onToggleTag(id))}
          className="text-xs text-muted-foreground hover:text-foreground/70 ml-1 p-0 h-auto"
        >
          {t('scheduling.kanban.clearFilter')}
        </Button>
      )}
    </div>
  );
}
