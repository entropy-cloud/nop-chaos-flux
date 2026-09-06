import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import { Button, Input } from '@nop-chaos/ui';
import type { PrintTemplateSchema } from '@nop-chaos/flux-print-core';
import React, { useRef, useState } from 'react';
import { PrintDesignerCanvas } from './print-designer-canvas.js';
import { PrintInspector } from './print-inspector.js';
import { PrintPalette } from './print-palette.js';
import { PrintPreview } from './print-preview.js';
import { createPrintEditorController, usePrintEditorSnapshot, type PrintEditorController } from './editor/use-print-editor.js';

export interface PrintDesignerProps {
  template: PrintTemplateSchema;
  onTemplateChange?: (template: PrintTemplateSchema, serialized: string) => void;
  className?: string;
}

/**
 * 打印设计器壳（P2.4）：工具栏 + 组件面板 + 画布 + 属性面板 + 预览组合。
 * 受控入口：template 初值 + onTemplateChange（commit 后回调 working 与序列化产物）。
 */
export function PrintDesigner({ template, onTemplateChange, className }: PrintDesignerProps) {
  const { t } = useFluxTranslation();
  // StrictMode 双挂载会触发 effect 清理——editor-core dispose 不可恢复，故不在卸载时 dispose
  //（controller 随组件引用释放由 GC 回收；dispose 仅供测试显式调用）
  const [controller] = useState<PrintEditorController>(() =>
    createPrintEditorController({ template, onTemplateChange }),
  );

  const { state, zoom } = usePrintEditorSnapshot(controller);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const shellRef = useRef<HTMLDivElement | null>(null);

  const isTypingTarget = (target: EventTarget | null): boolean => {
    const element = target as HTMLElement | null;
    if (!element) return false;
    const tag = element.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable;
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (isTypingTarget(event.target)) return;
    const meta = event.ctrlKey || event.metaKey;
    const key = event.key;
    if (meta && key.toLowerCase() === 'z' && !event.shiftKey) {
      event.preventDefault();
      controller.undo();
      return;
    }
    if (meta && (key.toLowerCase() === 'y' || (key.toLowerCase() === 'z' && event.shiftKey))) {
      event.preventDefault();
      controller.redo();
      return;
    }
    if (meta && key.toLowerCase() === 'c') {
      controller.copy();
      return;
    }
    if (meta && key.toLowerCase() === 'v') {
      controller.paste();
      return;
    }
    if (meta && key.toLowerCase() === 'd') {
      event.preventDefault();
      controller.copy();
      controller.paste();
      return;
    }
    if (key === 'Delete' || key === 'Backspace') {
      event.preventDefault();
      controller.deleteSelected();
      return;
    }
    const step = event.shiftKey ? 0.1 : 1;
    const nudges: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const nudge = nudges[key];
    if (nudge) {
      event.preventDefault();
      controller.nudge(nudge[0], nudge[1]);
    }
  };

  const handleValidate = () => {
    setErrorCount(controller.validate().filter((diagnostic) => diagnostic.level === 'error').length);
  };

  return (
    <div
      ref={shellRef}
      className={className}
      data-testid="print-designer"
      role="application"
      aria-roledescription="print designer"
      aria-label={t('flux.print.designer')}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="nop-print-toolbar flex items-center gap-1 border-b border-border px-2 py-1" data-testid="print-toolbar">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={t('flux.print.toolbar.undo')}
          disabled={!state.canUndo}
          onClick={() => controller.undo()}
        >
          {t('flux.print.toolbar.undo')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={t('flux.print.toolbar.redo')}
          disabled={!state.canRedo}
          onClick={() => controller.redo()}
        >
          {t('flux.print.toolbar.redo')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={t('flux.print.toolbar.zoomOut')}
          onClick={() => controller.setZoom(zoom - 0.1)}
        >
          −
        </Button>
        <Input
          aria-label="zoom"
          readOnly
          className="h-6 w-14 text-center text-xs"
          value={`${Math.round(zoom * 100)}%`}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={t('flux.print.toolbar.zoomIn')}
          onClick={() => controller.setZoom(zoom + 0.1)}
        >
          +
        </Button>
        <div className="flex-1" />
        <Button
          type="button"
          variant={errorCount > 0 ? 'destructive' : 'outline'}
          size="sm"
          aria-label={t('flux.print.toolbar.validate')}
          onClick={handleValidate}
          data-testid="print-validate"
        >
          {errorCount > 0
            ? t('flux.print.toolbar.invalidCount').replace('{{count}}', String(errorCount))
            : t('flux.print.toolbar.validate')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={t('flux.print.toolbar.preview')}
          onClick={() => setPreviewOpen(true)}
        >
          {t('flux.print.toolbar.preview')}
        </Button>
      </div>
      <div className="flex" style={{ minHeight: 320 }}>
        <PrintPalette controller={controller} className="w-32 shrink-0 border-r border-border" />
        <div
          className="flex-1 overflow-auto bg-muted/40 p-6"
          role="region"
          aria-label={t('flux.print.canvasRegion')}
        >
          <PrintDesignerCanvas controller={controller} />
        </div>
        <PrintInspector controller={controller} className="w-64 shrink-0 border-l border-border" />
      </div>
      <PrintPreview controller={controller} open={previewOpen} onOpenChange={setPreviewOpen} />
    </div>
  );
}
