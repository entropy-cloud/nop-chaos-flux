import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { cleanup, render } from '@testing-library/react';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { buttonRenderer, formulaCompiler } from '../test-support.js';
import { formAdvancedRendererDefinitions } from '../index.js';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { buildEditorExtensions } from '../editor-renderer.js';
import { isSafeImageUrl } from '../editor-toolbar-config.js';
import { installFormAdvancedTestHooks } from '../test-support.js';

installFormAdvancedTestHooks();

/**
 * Plan 480 Phase 3 red-first proofs:
 *
 * 1. Schema round-trip — before the Image/Highlight extensions are wired into
 *    `buildEditorExtensions`, ProseMirror's schema silently DROPS `<img>`
 *    nodes and `<mark>` highlights on load/serialize. The stored field value
 *    loses content the host wrote. These assertions pin the fixed contract.
 * 2. Sanitize round-trip — `<mark>` must survive the DOMPurify gate (the
 *    editor emits `<mark>` once Highlight lands).
 * 3. Image src guard — the URL prompt accepts only safe schemes.
 */

function makeEditor(initialHtml: string) {
  return new Editor({
    extensions: buildEditorExtensions(),
    content: initialHtml,
  });
}

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

describe('plan 480 Phase 3 — Image/Highlight schema round-trip (red-first)', () => {
  it('a <mark> highlight in the value survives load → serialize', () => {
    const editor = makeEditor('<p>before <mark>highlighted</mark> after</p>');
    const html = editor.getHTML();
    expect(html).toContain('<mark>');
    expect(html).toContain('highlighted');
    editor.destroy();
  });

  it('an <img> node in the value survives load → serialize', () => {
    const editor = makeEditor('<p><img src="https://cdn.example.com/x.png" alt="x"></p>');
    const html = editor.getHTML();
    expect(html).toContain('<img');
    expect(html).toContain('https://cdn.example.com/x.png');
    editor.destroy();
  });

  it('toggleHighlight applies a highlight mark (toolbar command registered)', () => {
    const editor = makeEditor('<p>hello world</p>');
    editor.commands.setTextSelection({ from: 1, to: 6 });
    const ok = editor.chain().focus().toggleHighlight().run();
    expect(ok).toBe(true);
    expect(editor.getHTML()).toContain('<mark');
    editor.destroy();
  });

  it('setImage inserts an img node (toolbar command registered)', () => {
    const editor = makeEditor('<p>hello</p>');
    const ok = editor.chain().focus().setImage({ src: 'https://cdn.example.com/y.png' }).run();
    expect(ok).toBe(true);
    expect(editor.getHTML()).toContain('https://cdn.example.com/y.png');
    editor.destroy();
  });
});

describe('plan 480 Phase 3 — isSafeImageUrl guard (red-first)', () => {
  it('allows http(s) and data:image sources', () => {
    expect(isSafeImageUrl('https://cdn.example.com/x.png')).toBe(true);
    expect(isSafeImageUrl('http://example.com/x.png')).toBe(true);
    expect(isSafeImageUrl('data:image/png;base64,AAAA')).toBe(true);
  });

  it('allows scheme-less relative and protocol-relative URLs', () => {
    expect(isSafeImageUrl('/assets/x.png')).toBe(true);
    expect(isSafeImageUrl('./x.png')).toBe(true);
    expect(isSafeImageUrl('//cdn.example.com/x.png')).toBe(true);
  });

  it('rejects script-capable and non-image data URIs (case-insensitive)', () => {
    expect(isSafeImageUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeImageUrl('JaVaScRiPt:alert(1)')).toBe(false);
    expect(isSafeImageUrl('vbscript:msgbox(1)')).toBe(false);
    expect(isSafeImageUrl('data:text/html,<script>x</script>')).toBe(false);
    expect(isSafeImageUrl('file:///etc/passwd')).toBe(false);
    expect(isSafeImageUrl('')).toBe(false);
    expect(isSafeImageUrl('   ')).toBe(false);
  });
});

describe('plan 480 Phase 3 — editor toolbar exposes image + highlight buttons', () => {
  const allDefinitions = [
    ...formRendererDefinitions,
    ...formAdvancedRendererDefinitions,
    buttonRenderer,
  ];
  const SchemaRenderer = createSchemaRenderer(allDefinitions);
  const env = {
    fetcher: async () => ({ status: 0, data: null }),
    notify: () => undefined,
  } as never;

  it('default toolbar renders the image and highlight buttons', () => {
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://editor-phase3-toolbar"
        schema={
          {
            type: 'form',
            id: 'ed-phase3-form',
            data: {},
            submitAction: { action: 'ajax', args: { url: '/api/submit', method: 'post' } },
            body: [{ type: 'editor', name: 'rich', label: 'Content' }],
          } as never
        }
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(container.querySelector('button[data-testid="editor-toolbar-image"]')).toBeTruthy();
    expect(container.querySelector('button[data-testid="editor-toolbar-highlight"]')).toBeTruthy();
  });
});
