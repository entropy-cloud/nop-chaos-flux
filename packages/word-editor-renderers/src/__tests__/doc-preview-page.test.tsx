import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { DocPreviewPage } from '../preview/doc-preview-page.js';
import '../styles.css';

const bridgeState = {
  mountedDocs: [] as string[],
  wordCountResolvers: [] as Array<(value: number) => void>,
};

vi.mock('@nop-chaos/word-editor-core', async () => {
  class CanvasEditorBridge {
    mount(_container: HTMLDivElement, editorData: { main: Array<{ value?: string }> }) {
      bridgeState.mountedDocs.push(String(editorData.main[0]?.value ?? ''));
    }

    applyPaperSettings() {}

    getWordCount() {
      return new Promise<number>((resolve) => {
        bridgeState.wordCountResolvers.push(resolve);
      });
    }

    unmount() {}
  }

  return {
    CanvasEditorBridge,
    DEFAULT_PAPER_SETTINGS: { width: 794, height: 1123 },
  };
});

describe('DocPreviewPage', () => {
  it('ignores stale word-count results after switching documents', async () => {
    resetFluxI18n();
    initFluxI18n();
    await changeLanguage('zh-CN');
    bridgeState.mountedDocs.length = 0;
    bridgeState.wordCountResolvers.length = 0;

    const { rerender } = render(
      <DocPreviewPage
        documentData={{ header: [], main: [{ value: 'Doc A' }], footer: [] } as any}
        onBack={vi.fn()}
      />,
    );

    rerender(
      <DocPreviewPage
        documentData={{ header: [], main: [{ value: 'Doc B' }], footer: [] } as any}
        onBack={vi.fn()}
      />,
    );

    expect(bridgeState.mountedDocs).toEqual(['Doc A', 'Doc B']);

    bridgeState.wordCountResolvers[0]?.(11);
    bridgeState.wordCountResolvers[1]?.(22);

    await waitFor(() => {
      expect(screen.getByText('22 个词')).toBeTruthy();
    });
  });

  it('provides package-owned word-editor token fallbacks on the word-editor root', () => {
    const packageStyles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

    expect(packageStyles).toContain('.nop-word-editor-page');
    expect(packageStyles).not.toContain('.nop-theme-root');
    expect(packageStyles).toContain('--nop-app-bg:');
    expect(packageStyles).toContain('--nop-border:');
    expect(packageStyles).toContain('--nop-playground-stage-bg:');
  });

  it('adds explicit accessible labels to icon-only back buttons', async () => {
    resetFluxI18n();
    initFluxI18n();
    await changeLanguage('zh-CN');

    render(
      <DocPreviewPage
        documentData={{ header: [], main: [{ value: 'Doc A' }], footer: [] } as any}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '返回' })).toBeInTheDocument();
  });
});
