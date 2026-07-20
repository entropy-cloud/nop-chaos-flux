import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, Input, Label, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { useGanttStore } from './gantt-context.js';

interface GanttEditorProps {
  editorRegion?: { render: (opts?: any) => React.ReactNode };
  className?: string;
}

export function GanttEditor({ editorRegion, className }: GanttEditorProps) {
  const store = useGanttStore();
  const [open, setOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | number | null>(null);

  const closeEditor = useCallback(() => {
    setEditingTaskId(null);
    setOpen(false);
  }, []);

  const editingTask = editingTaskId ? store.tasks.get(editingTaskId) : null;

  if (editorRegion && editingTask) {
    return (
      <Dialog open={open} onOpenChange={(o) => { if (!o) closeEditor(); }}>
        <DialogContent className={cn('sm:max-w-md', className)}>
          {editorRegion.render({ bindings: { task: editingTask, onSave: closeEditor, onCancel: closeEditor } })}
        </DialogContent>
      </Dialog>
    );
  }

  if (!editingTask) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) closeEditor(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('scheduling.gantt.editTask')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-3">
          <div>
            <Label htmlFor="edit-text">{t('scheduling.gantt.name')}</Label>
            <Input id="edit-text" defaultValue={editingTask.text} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="edit-start">{t('scheduling.gantt.start')}</Label>
            <Input id="edit-start" type="date" defaultValue={editingTask.start} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="edit-end">{t('scheduling.gantt.end')}</Label>
            <Input id="edit-end" type="date" defaultValue={editingTask.end} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="edit-duration">{t('scheduling.gantt.duration')}</Label>
            <Input id="edit-duration" type="number" defaultValue={editingTask.duration ?? ''} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="edit-progress">{t('scheduling.gantt.progress')}</Label>
            <Input id="edit-progress" type="number" min={0} max={100} defaultValue={editingTask.progress ?? 0} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeEditor}>{t('scheduling.gantt.cancel')}</Button>
          <Button onClick={() => {
            const el = document.getElementById('edit-text') as HTMLInputElement;
            const startEl = document.getElementById('edit-start') as HTMLInputElement;
            const endEl = document.getElementById('edit-end') as HTMLInputElement;
            const durEl = document.getElementById('edit-duration') as HTMLInputElement;
            const progEl = document.getElementById('edit-progress') as HTMLInputElement;
            if (el && editingTaskId) {
              const partial: Record<string, unknown> = { text: el.value };
              if (startEl?.value) partial.start = startEl.value;
              if (endEl?.value) partial.end = endEl.value;
              if (durEl?.value) partial.duration = parseInt(durEl.value, 10);
              if (progEl?.value) partial.progress = parseInt(progEl.value, 10);
              store.updateTask(editingTaskId, partial);
            }
            closeEditor();
          }}>{t('scheduling.gantt.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
