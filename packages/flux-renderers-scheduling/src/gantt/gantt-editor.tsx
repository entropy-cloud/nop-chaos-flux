import React, { useId, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, Input, Label, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { RenderRegionHandle } from '@nop-chaos/flux-react';
import { useGanttStore } from './gantt-context.js';

interface GanttEditorProps {
  editorRegion?: RenderRegionHandle;
  className?: string;
  editingTaskId?: string | number | null;
  onClose?: () => void;
  onBarDoubleClick?: (taskId: string | number) => void;
}

export function GanttEditor({ editorRegion, className, editingTaskId, onClose }: GanttEditorProps) {
  const store = useGanttStore();
  const instanceId = useId();

  const textRef = useRef<HTMLInputElement>(null);
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  const durationRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<HTMLInputElement>(null);

  const closeEditor = () => {
    onClose?.();
  };

  const editingTask = editingTaskId ? store.tasks.get(editingTaskId) : null;

  const handleSave = () => {
    if (!editingTaskId || !textRef.current) return;
    const partial: Record<string, unknown> = { text: textRef.current.value };
    if (startRef.current?.value) partial.start = startRef.current.value;
    if (endRef.current?.value) partial.end = endRef.current.value;
    if (durationRef.current?.value) partial.duration = parseInt(durationRef.current.value, 10);
    if (progressRef.current?.value) partial.progress = parseInt(progressRef.current.value, 10);
    store.updateTask(editingTaskId, partial);
    closeEditor();
  };

  const open = editingTaskId != null;

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
            <Label htmlFor={`${instanceId}-edit-text`}>{t('scheduling.gantt.name')}</Label>
            <Input ref={textRef} id={`${instanceId}-edit-text`} defaultValue={editingTask.text} className="mt-1" />
          </div>
          <div>
            <Label htmlFor={`${instanceId}-edit-start`}>{t('scheduling.gantt.start')}</Label>
            <Input ref={startRef} id={`${instanceId}-edit-start`} type="date" defaultValue={editingTask.start} className="mt-1" />
          </div>
          <div>
            <Label htmlFor={`${instanceId}-edit-end`}>{t('scheduling.gantt.end')}</Label>
            <Input ref={endRef} id={`${instanceId}-edit-end`} type="date" defaultValue={editingTask.end} className="mt-1" />
          </div>
          <div>
            <Label htmlFor={`${instanceId}-edit-duration`}>{t('scheduling.gantt.duration')}</Label>
            <Input ref={durationRef} id={`${instanceId}-edit-duration`} type="number" defaultValue={editingTask.duration ?? ''} className="mt-1" />
          </div>
          <div>
            <Label htmlFor={`${instanceId}-edit-progress`}>{t('scheduling.gantt.progress')}</Label>
            <Input ref={progressRef} id={`${instanceId}-edit-progress`} type="number" min={0} max={100} defaultValue={editingTask.progress ?? 0} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeEditor}>{t('scheduling.gantt.cancel')}</Button>
          <Button onClick={handleSave}>{t('scheduling.gantt.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
