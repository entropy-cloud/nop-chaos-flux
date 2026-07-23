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
        <div className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-blue-400 rounded-lg bg-blue-50">
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
            placeholder="Column title"
            className="flex-1 text-sm px-2 py-1"
            aria-label="Column title"
          />
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={onConfirm}
            className="text-xs text-blue-600 hover:text-blue-800 px-1"
          >
            {t('flux.common.confirm')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={onCancel}
            className="text-xs text-gray-500 hover:text-gray-700 px-1"
          >
            {t('flux.common.cancel')}
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={onStartAdd}
          className="w-full flex items-center gap-1 px-3 py-2 text-sm text-gray-400 rounded-lg border-2 border-dashed border-gray-300 justify-center hover:text-gray-600 hover:border-gray-400"
        >
          {t('scheduling.kanban.addColumn')}
        </Button>
      )}
    </div>
  );
}
