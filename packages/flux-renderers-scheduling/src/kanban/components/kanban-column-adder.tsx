import React, { useRef, useEffect } from 'react';
import { Button, Input } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';

export interface KanbanColumnAdderProps {
  adding: boolean;
  title: string;
  onTitleChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onStartAdd: () => void;
}

export function KanbanColumnAdder({
  adding,
  title,
  onTitleChange,
  onConfirm,
  onCancel,
  onStartAdd,
}: KanbanColumnAdderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  return (
    <div className="nop-kanban-adder shrink-0 self-start mt-2 min-w-[280px]">
      {adding ? (
        <div className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-primary/60 rounded-lg bg-primary/10">
          <Input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onConfirm();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
              }
            }}
            placeholder={t('scheduling.kanban.columnTitlePlaceholder')}
            className="flex-1 text-sm px-2 py-1"
            aria-label={t('scheduling.kanban.columnTitlePlaceholder')}
          />
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={onCancel}
            className="text-xs text-muted-foreground hover:text-foreground px-1"
          >
            {t('flux.common.cancel')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={onConfirm}
            className="text-xs text-primary hover:text-primary/80 px-1"
          >
            {t('flux.common.confirm')}
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={onStartAdd}
          className="w-full flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground rounded-lg border-2 border-dashed border-border justify-center hover:text-foreground hover:border-muted-foreground"
        >
          {t('scheduling.kanban.addColumn')}
        </Button>
      )}
    </div>
  );
}
