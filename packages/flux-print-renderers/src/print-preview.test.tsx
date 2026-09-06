// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createEmptyPrintTemplate, type PrintElementSchema } from '@nop-chaos/flux-print-core';
import React from 'react';
import { createPrintEditorController, type PrintEditorController } from './editor/use-print-editor.js';
import { PrintPreview } from './print-preview.js';

function makeController(elements: PrintElementSchema[]): PrintEditorController {
  return createPrintEditorController({ template: { ...createEmptyPrintTemplate(), elements } });
}

afterEach(() => cleanup());

describe('D22-02 (P2): preview diagnostics must not duplicate bind codes', () => {
  it('red: missing-binding code appears exactly once in the diagnostics panel', () => {
    const controller = makeController([
      { type: 'text', id: 'a', region: 'body', left: 0, top: 0, width: 40, height: 8, style: {}, text: '${missing.path}' } as PrintElementSchema,
    ]);
    render(<PrintPreview controller={controller} open onOpenChange={() => {}} />);
    const panel = screen.getByTestId('print-preview-diagnostics');
    const matches = panel.textContent?.match(/PRINT_BIND_PATH_MISSING/g) ?? [];
    // 当前实现：独立 bind 调用 + layout 内部 bind 各产一份 → 重复必红
    expect(matches.length).toBe(1);
  });
});
