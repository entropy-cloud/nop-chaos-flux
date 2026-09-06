import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import { cn } from '@nop-chaos/ui';
import React from 'react';
import { PRINT_ELEMENT_TYPES, type PrintElementType } from '@nop-chaos/flux-print-core';
import type { PrintEditorController } from './editor/use-print-editor.js';

export const PRINT_ELEMENT_MIME = 'application/x-print-element';

export interface PrintPaletteProps {
  controller: PrintEditorController;
  className?: string;
}

/** 元素类型 → i18n key（字面量映射，供 check-i18n-keys 静态识别）。 */
export const ELEMENT_LABEL_KEYS: Record<PrintElementType, string> = {
  text: 'flux.print.element.text',
  image: 'flux.print.element.image',
  table: 'flux.print.element.table',
  barcode: 'flux.print.element.barcode',
  qrcode: 'flux.print.element.qrcode',
  line: 'flux.print.element.line',
  rect: 'flux.print.element.rect',
  pageNumber: 'flux.print.element.pageNumber',
  printDate: 'flux.print.element.printDate',
};

export function PrintPalette({ controller, className }: PrintPaletteProps) {
  const { t } = useFluxTranslation();

  const handleDropIntoCanvas = (event: React.DragEvent, type: PrintElementType) => {
    event.dataTransfer.setData(PRINT_ELEMENT_MIME, type);
    event.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className={cn('nop-print-palette', className)} data-testid="print-palette">
      <div className="text-sm font-medium text-foreground px-2 py-1">{t('flux.print.palette.title')}</div>
      <div className="grid grid-cols-2 gap-1 p-1">
        {PRINT_ELEMENT_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className="nop-print-palette-item flex flex-col items-center gap-1 rounded-md border border-border px-2 py-3 text-xs text-foreground hover:bg-accent"
            draggable
            onDragStart={(event) => handleDropIntoCanvas(event, type)}
            onClick={() => controller.addElement(type)}
            data-palette-type={type}
          >
            <span>{t(ELEMENT_LABEL_KEYS[type])}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
