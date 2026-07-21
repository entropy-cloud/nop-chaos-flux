import React from 'react';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';

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
    <div className={cn('nop-kanban-tag-filter flex items-center gap-1.5 flex-wrap px-4 py-2', className)}>
      <span className="text-xs text-gray-500 mr-1">{t('scheduling.kanban.filterLabel')}</span>
      {tags.map((tag) => {
        const selected = selectedTagIds.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onToggleTag(tag.id)}
            className={cn(
              'inline-flex items-center px-2 py-0.5 text-xs rounded-full border transition-colors',
              selected
                ? 'border-transparent text-white font-medium'
                : 'border-gray-300 text-gray-600 hover:bg-gray-100',
            )}
            style={selected ? { backgroundColor: tag.color } : undefined}
          >
            {tag.text}
          </button>
        );
      })}
      {selectedTagIds.length > 0 && (
        <button
          type="button"
          onClick={() => selectedTagIds.forEach((id) => onToggleTag(id))}
          className="text-xs text-gray-400 hover:text-gray-600 ml-1"
        >
          {t('scheduling.kanban.clearFilter')}
        </button>
      )}
    </div>
  );
}
