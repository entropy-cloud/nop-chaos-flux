import React from 'react';
import { describe, expect, it, afterEach, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv, SchemaInput } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { codeEditorRendererDefinition, ColorizeView, getLanguageParser } from '../index.js';
import type { EditorLanguage } from '../types.js';

const env: RendererEnv = {
  fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined,
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerDataRenderers(registry);
registry.register(codeEditorRendererDefinition);

const SchemaRenderer = createSchemaRenderer();

function renderCodeEditorSchema(schema: SchemaInput) {
  return render(
    <SchemaRenderer
      schemaUrl="test://flux-code-editor/colorize"
      schema={schema}
      env={env}
      registry={registry}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

async function waitForColorizeRoot(container: HTMLElement): Promise<HTMLElement> {
  return waitFor(() => {
    const root = container.querySelector('[data-colorize-container]');
    expect(root).toBeTruthy();
    return root as HTMLElement;
  });
}

describe('getLanguageParser (E3 colorize language mapping)', () => {
  const SUPPORTED: EditorLanguage[] = [
    'expression',
    'javascript',
    'typescript',
    'sql',
    'json',
    'html',
    'css',
    'python',
    'markdown',
    'yaml',
    'xml',
  ];

  it('returns a parser for every non-plaintext language (12-language contract alignment)', () => {
    for (const lang of SUPPORTED) {
      const parser = getLanguageParser(lang);
      expect(parser, `${lang} should yield a parser`).not.toBeNull();
    }
  });

  it('returns null for plaintext (plain-text degradation path)', () => {
    expect(getLanguageParser('plaintext')).toBeNull();
  });
});

describe('ColorizeView (E3 static highlight)', () => {
  const cases: Array<{ lang: EditorLanguage; sample: string; label: string }> = [
    { lang: 'javascript', sample: 'const x = 1;', label: 'javascript' },
    { lang: 'json', sample: '{"key": "value"}', label: 'json' },
    { lang: 'sql', sample: 'SELECT * FROM users', label: 'sql' },
  ];

  for (const { lang, sample, label } of cases) {
    it(`produces highlighted token spans for ${label}`, () => {
      const { container } = render(
        <ColorizeView value={sample} language={lang} editorTheme="light" />,
      );
      const pre = container.querySelector('[data-colorize]');
      expect(pre).toBeTruthy();
      const spans = container.querySelectorAll('[data-colorize] span[class]');
      expect(spans.length, `${label} should yield at least one highlighted token span`).toBeGreaterThan(0);
      const codeEl = pre?.querySelector('code');
      expect(codeEl?.textContent).toContain(sample);
      expect(pre?.getAttribute('data-colorize-fallback')).toBeNull();
    });
  }

  it('degrades to plain text for plaintext language (colorize-unknown-language path)', () => {
    const { container } = render(
      <ColorizeView value="just plain text" language="plaintext" editorTheme="light" />,
    );
    const pre = container.querySelector('[data-colorize]');
    expect(pre).toBeTruthy();
    expect(pre?.getAttribute('data-colorize-fallback')).toBe('');
    const spans = container.querySelectorAll('[data-colorize] span[class]');
    expect(spans.length).toBe(0);
    const codeEl = pre?.querySelector('code');
    expect(codeEl?.textContent).toContain('just plain text');
  });

  it('emits a <style> block with the highlight CSS rules', () => {
    const { container } = render(
      <ColorizeView value="const x = 1;" language="javascript" editorTheme="light" />,
    );
    const style = container.querySelector('[data-colorize] style');
    expect(style).toBeTruthy();
    expect(style?.textContent).toBeTruthy();
  });

  it('aligns to dark theme via data-colorize-theme', () => {
    const { container } = render(
      <ColorizeView value="const x = 1;" language="javascript" editorTheme="dark" />,
    );
    const pre = container.querySelector('[data-colorize]');
    expect(pre?.getAttribute('data-colorize-theme')).toBe('dark');
  });
});

describe('code-editor colorize integration (E3)', () => {
  it('short-circuits EditorView when colorize:true (no .cm-editor)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const view = renderCodeEditorSchema({
      type: 'page',
      body: [
        {
          type: 'form',
          name: 'testForm',
          data: { snippet: 'const greeting = "Hello";' },
          body: [
            {
              type: 'code-editor',
              name: 'snippet',
              label: 'Colorized JS',
              language: 'javascript',
              colorize: true,
              height: 200,
            },
          ],
        },
      ],
    });

    await waitForColorizeRoot(view.container);

    const container = view.container.querySelector('[data-colorize-container]');
    expect(container).toBeTruthy();
    const editorCount = view.container.querySelectorAll('.cm-editor').length;
    expect(editorCount, 'colorize mode must not instantiate EditorView').toBe(0);

    await waitFor(() => {
      const spans = view.container.querySelectorAll('[data-colorize] span[class]');
      expect(spans.length).toBeGreaterThan(0);
    });

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('still renders full editor when colorize is not set', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const view = renderCodeEditorSchema({
      type: 'page',
      body: [
        {
          type: 'form',
          name: 'testForm',
          data: { snippet: 'const greeting = "Hello";' },
          body: [
            {
              type: 'code-editor',
              name: 'snippet',
              label: 'Editable JS',
              language: 'javascript',
              height: 200,
            },
          ],
        },
      ],
    });

    await waitFor(() => {
      expect(view.container.querySelector('.cm-editor')).toBeTruthy();
    });
    expect(view.container.querySelector('[data-colorize-container]')).toBeNull();

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('does not combine colorize with diff (diffValue wins, MergeView renders)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const view = renderCodeEditorSchema({
      type: 'page',
      body: [
        {
          type: 'form',
          name: 'testForm',
          data: { snippet: 'const a = 1;' },
          body: [
            {
              type: 'code-editor',
              name: 'snippet',
              label: 'Diff + Colorize (diff wins)',
              language: 'javascript',
              diffValue: 'const a = 2;',
              colorize: true,
              height: 200,
            },
          ],
        },
      ],
    });

    await waitFor(() => {
      expect(view.container.querySelector('.cm-editor')).toBeTruthy();
    });
    expect(view.container.querySelector('[data-colorize-container]')).toBeNull();
    expect(
      view.container.querySelector('[data-diff]') ||
        view.container.querySelector('.nop-code-editor[data-diff]'),
    ).toBeTruthy();

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('falls back to plain text for plaintext colorize (colorize-unknown-language)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const view = renderCodeEditorSchema({
      type: 'page',
      body: [
        {
          type: 'form',
          name: 'testForm',
          data: { snippet: 'no syntax here' },
          body: [
            {
              type: 'code-editor',
              name: 'snippet',
              label: 'Colorized Plaintext',
              language: 'plaintext',
              colorize: true,
              height: 100,
            },
          ],
        },
      ],
    });

    const container = await waitForColorizeRoot(view.container);
    expect(container.querySelectorAll('.cm-editor').length).toBe(0);

    await waitFor(() => {
      const pre = container.querySelector('[data-colorize]');
      const codeEl = pre?.querySelector('code');
      expect(codeEl?.textContent).toContain('no syntax here');
    });
    const pre = container.querySelector('[data-colorize]');
    expect(pre?.getAttribute('data-colorize-fallback')).toBe('');

    expect(consoleError).not.toHaveBeenCalled();
  });
});
