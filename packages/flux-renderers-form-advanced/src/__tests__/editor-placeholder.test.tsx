import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { buttonRenderer, formulaCompiler } from '../test-support.js';
import { formAdvancedRendererDefinitions } from '../index.js';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { installFormAdvancedTestHooks } from '../test-support.js';

installFormAdvancedTestHooks();

/**
 * R3 red-first proof (plan 480 Phase 1): the editor wrote a handwritten
 * `data-placeholder` attribute on the ProseMirror content root, but nothing
 * consumed it — no Placeholder extension, no CSS (the `:empty`-class rule in
 * the ai package never applied here, and ProseMirror roots are never empty
 * anyway). These assertions pin the fixed contract:
 *
 * 1. DOM structure: the Placeholder extension decorates the empty paragraph
 *    with `data-placeholder` + `is-editor-empty`.
 * 2. CSS contract: the package stylesheet must consume that decoration with a
 *    `::before` rule (token-driven, no `:empty` gate).
 */

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

describe('R3 — editor placeholder visibility (plan 480 Phase 1)', () => {
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

  function renderEditor(schema: Record<string, unknown>, data: Record<string, unknown> = {}) {
    return render(
      <SchemaRenderer
        schemaUrl="test://editor-placeholder"
        schema={
          {
            type: 'form',
            id: 'ed-placeholder-form',
            data,
            submitAction: { action: 'ajax', args: { url: '/api/submit', method: 'post' } },
            body: [{ type: 'editor', name: 'rich', label: 'Content', ...schema }],
          } as never
        }
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
  }

  it('empty content decorates the empty paragraph with data-placeholder + is-editor-empty', () => {
    const { container } = renderEditor({ placeholder: 'Start writing…' });
    const emptyNode = container.querySelector('.ProseMirror p.is-editor-empty');
    expect(emptyNode).not.toBeNull();
    expect(emptyNode?.getAttribute('data-placeholder')).toBe('Start writing…');
  });

  it('non-empty content carries no placeholder decoration', () => {
    const { container } = renderEditor(
      { placeholder: 'Start writing…' },
      { rich: '<p>existing</p>' },
    );
    expect(container.querySelector('.ProseMirror p.is-editor-empty')).toBeNull();
  });

  it('no placeholder is configured when the schema omits it', () => {
    const { container } = renderEditor({});
    expect(container.querySelector('.ProseMirror p.is-editor-empty')).toBeNull();
  });

  it('styles.css consumes the decoration for .nop-editor-content (no :empty gate)', () => {
    expect(existsSync('src/styles.css')).toBe(true);
    const css = readFileSync('src/styles.css', 'utf8');
    expect(css).not.toMatch(/nop-editor-content[^\n]*:empty::before/);
    expect(css).toMatch(/\.nop-editor-content[^\n]*is-editor-empty[^\n]*::before\s*\{/);
  });

  it('styles.css caps oversized content images (plan 480 Phase 3 img fallback)', () => {
    const css = readFileSync('src/styles.css', 'utf8');
    expect(css).toMatch(/\.nop-editor-content img\s*\{[^}]*max-width:\s*100%/);
  });
});
