import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { buttonRenderer, formulaCompiler } from '../test-support.js';
import { formAdvancedRendererDefinitions } from '../index.js';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import {
  buildEditorExtensions,
  isSafeLinkUrl,
} from '../editor-renderer.js';

/**
 * C3.5 P1-1/P1-2 test-first: the default toolbar advertises a `link` button,
 * but StarterKit does not ship a Link extension, so `setLink` was never a
 * registered command (zero-behavior button; `isActive('link')` always false).
 * And once Link lands, `javascript:`/`data:` hrefs must be rejected at
 * set-time (security red line — the stored HTML value is echoed by hosts
 * without re-sanitizing).
 *
 * These tests drive a headless TipTap `Editor` (no DOM view needed for
 * commands) so the extension wiring itself is under test — the exact surface
 * that was broken.
 */

function makeEditor() {
  return new Editor({
    extensions: buildEditorExtensions(),
    content: '<p>hello world</p>',
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

describe('editor — link toolbar wiring (P1-1)', () => {
  it('setLink applies a link mark to the selected range (command registered)', () => {
    const editor = makeEditor();
    editor.commands.setTextSelection({ from: 1, to: 6 });
    const ok = editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: 'https://example.com' })
      .run();
    const html = editor.getHTML();
    expect(ok).toBe(true);
    expect(html).toContain('<a');
    expect(html).toContain('https://example.com');
    editor.destroy();
  });

  it('isActive("link") reflects the applied mark', () => {
    const editor = makeEditor();
    editor.commands.setTextSelection({ from: 1, to: 6 });
    editor.chain().setLink({ href: 'https://example.com' }).run();
    expect(editor.isActive('link')).toBe(true);
    editor.destroy();
  });

  it('unsetLink removes the mark (link button click with empty prompt)', () => {
    const editor = makeEditor();
    editor.commands.setTextSelection({ from: 1, to: 6 });
    editor.chain().setLink({ href: 'https://example.com' }).run();
    editor.chain().extendMarkRange('link').unsetLink().run();
    expect(editor.isActive('link')).toBe(false);
    expect(editor.getHTML()).not.toContain('<a');
    editor.destroy();
  });
});

describe('editor — URL protocol validation (P1-2, security red line)', () => {
  it('javascript: href is rejected — never lands in output HTML', () => {
    const editor = makeEditor();
    editor.commands.setTextSelection({ from: 1, to: 6 });
    editor.chain().extendMarkRange('link').setLink({ href: 'javascript:alert(1)' }).run();
    const html = editor.getHTML();
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<a');
    editor.destroy();
  });

  it('data: href is rejected', () => {
    const editor = makeEditor();
    editor.commands.setTextSelection({ from: 1, to: 6 });
    editor.chain().extendMarkRange('link').setLink({ href: 'data:text/html,<script>x</script>' }).run();
    expect(editor.getHTML()).not.toContain('<a');
    editor.destroy();
  });

  it('safe schemes (http/https/mailto/tel) and relative/anchored URLs are accepted', () => {
    const editor = makeEditor();
    editor.commands.setTextSelection({ from: 1, to: 6 });
    editor.chain().setLink({ href: 'https://a.io/x' }).run();
    expect(editor.isActive('link')).toBe(true);
    editor.destroy();

    const relative = makeEditor();
    relative.commands.setTextSelection({ from: 1, to: 6 });
    relative.chain().setLink({ href: '/docs/1' }).run();
    expect(relative.isActive('link')).toBe(true);
    relative.destroy();

    const anchor = makeEditor();
    anchor.commands.setTextSelection({ from: 1, to: 6 });
    anchor.chain().setLink({ href: '#section' }).run();
    expect(anchor.isActive('link')).toBe(true);
    anchor.destroy();
  });

  it('isSafeLinkUrl classifies schemes (pure guard)', () => {
    expect(isSafeLinkUrl('https://example.com')).toBe(true);
    expect(isSafeLinkUrl('http://example.com')).toBe(true);
    expect(isSafeLinkUrl('mailto:a@b.c')).toBe(true);
    expect(isSafeLinkUrl('tel:+8613800000000')).toBe(true);
    expect(isSafeLinkUrl('/relative/path')).toBe(true);
    expect(isSafeLinkUrl('#anchor')).toBe(true);
    expect(isSafeLinkUrl('//cdn.example.com/x.png')).toBe(true);
    expect(isSafeLinkUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeLinkUrl('JaVaScRiPt:alert(1)')).toBe(false);
    expect(isSafeLinkUrl('data:text/html,x')).toBe(false);
    expect(isSafeLinkUrl('vbscript:msgbox(1)')).toBe(false);
    expect(isSafeLinkUrl('')).toBe(false);
    expect(isSafeLinkUrl('   ')).toBe(false);
  });
});

describe('editor — toolbar config + render shell (render-level)', () => {
  const allDefinitions = [
    ...formRendererDefinitions,
    ...formAdvancedRendererDefinitions,
    buttonRenderer,
  ];
  const SchemaRenderer = createSchemaRenderer(allDefinitions);
  const env = {
    fetcher: async () => ({ ok: true, status: 200, data: null }),
    notify: () => undefined,
  } as never;

  function renderEditor(schema: Record<string, unknown>) {
    return render(
      <SchemaRenderer
        schemaUrl="test://editor-link"
        schema={
          {
            type: 'form',
            id: 'ed-form',
            data: { rich: '<p>Initial text</p>' },
            submitAction: { action: 'ajax', args: { url: '/api/submit', method: 'post' } },
            body: [{ type: 'editor', name: 'rich', label: 'Content', ...schema }],
          } as never
        }
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
  }

  it('renders the default toolbar including the link button', () => {
    const { container } = renderEditor({});
    expect(container.querySelector('.nop-editor')).toBeTruthy();
    expect(
      container.querySelector('button[data-testid="editor-toolbar-link"]'),
    ).toBeTruthy();
  });

  it('readOnly hides the toolbar and marks the editor read-only', () => {
    const { container } = renderEditor({ readOnly: true });
    expect(container.querySelector('button[data-testid="editor-toolbar-bold"]')).toBeNull();
    expect(
      container.querySelector('[data-testid="editor-content"]'),
    ).toBeTruthy();
  });
});
