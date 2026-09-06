import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import { Button, Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@nop-chaos/ui';
import {
  layoutPrintTemplate,
  renderPrintTemplateToHtml,
  type PrintDiagnostic,
} from '@nop-chaos/flux-print-core';
import React from 'react';
import { usePrintEditorSnapshot, type PrintEditorController } from './editor/use-print-editor.js';

export interface PrintPreviewProps {
  controller: PrintEditorController;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 分页同源预览（P3 升级，design.md §8）：renderPrintTemplateToHtml 产物写入 iframe srcdoc，
 * 与浏览器打印/PDF 输出共享同一渲染真理源；诊断面板合并 bind 与 layout 诊断。
 */
export function PrintPreview({ controller, open, onOpenChange }: PrintPreviewProps) {
  const { t } = useFluxTranslation();
  const { state } = usePrintEditorSnapshot(controller);
  const template = state.working;
  if (!open) return null;

  // layout 内置 bind（其 diagnostics 已含 bind 诊断）——预览不重复绑定（review D22-02）
  const layout = layoutPrintTemplate(template, template.testData ?? {});
  const html = renderPrintTemplateToHtml(template, template.testData ?? {});
  const diagnostics: PrintDiagnostic[] = layout.diagnostics;
  const pageCount = layout.pages.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" data-testid="print-preview">
        <DialogHeader>
          <DialogTitle>
            {t('flux.print.preview.title')}
            <span className="ml-2 text-sm text-muted-foreground" data-testid="print-preview-page-count">
              {pageCount}
            </span>
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <iframe
            title="print-preview"
            data-testid="print-preview-frame"
            className="w-full rounded border border-border bg-white"
            style={{ height: 420 }}
            srcDoc={html}
          />
          {diagnostics.length > 0 ? (
            <div className="mt-3 rounded border border-border p-2" data-testid="print-preview-diagnostics">
              <div className="text-xs font-semibold text-muted-foreground">{t('flux.print.preview.diagnostics')}</div>
              <ul className="mt-1 space-y-0.5">
                {diagnostics.map((diagnostic, index) => (
                  <li
                    // eslint-disable-next-line react/no-array-index-key -- 诊断无稳定 id，列表仅展示不重排
                    key={index}
                    className={
                      diagnostic.level === 'error' ? 'text-xs text-destructive' : 'text-xs text-amber-600'
                    }
                  >
                    [{diagnostic.code}] {diagnostic.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-3 flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {t('flux.print.preview.close')}
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
