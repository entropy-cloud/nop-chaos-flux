import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Plan 480 Phase 2 (A5) — three rich-text toolbar faces converge on one
 * Button spec. Adjudicated baseline (Decision in plan 480): the editor side
 * `ghost` + `h-7 min-w-7 px-1.5` with icons unified at `size-4`; text-label
 * keys (template bar) keep `text-xs`. R5: no `role="toolbar"` composite role
 * on any face (20-07 decision — APG toolbar requires roving tabindex; every
 * button stays an independent tab stop). R7: the dead text fallback label
 * domain is gone — every editor toolbar button renders an icon.
 *
 * jsdom/happy-dom do not load cross-package styles or the sibling packages'
 * rendered toolbars, so the contract is asserted against source text
 * (repo precedent: markdown-content.test.tsx read-src pattern).
 */

const EDITOR_RENDERER = readFileSync('src/editor-renderer.tsx', 'utf8');
const TOOLBAR_CONFIG = readFileSync('src/editor-toolbar-config.ts', 'utf8');
const MARKDOWN_RENDERER = readFileSync(
  '../flux-renderers-form/src/renderers/markdown-editor-renderer.tsx',
  'utf8',
);
const TEMPLATE_BAR = readFileSync(
  '../flux-renderers-ai/src/rich-text/components/template-bar.tsx',
  'utf8',
);

describe('plan 480 A5 — three toolbar faces share one Button spec', () => {
  it('every face renders ghost buttons with the unified h-7 min-w-7 px-1.5 geometry', () => {
    for (const [face, src] of [
      ['editor', EDITOR_RENDERER],
      ['markdown', MARKDOWN_RENDERER],
      ['template-bar', TEMPLATE_BAR],
    ] as const) {
      expect(src, face).toContain('variant="ghost"');
      expect(src, face).toContain('h-7');
      expect(src, face).toContain('min-w-7');
      expect(src, face).toContain('px-1.5');
    }
  });

  it('icon faces use size-4 icons; the text-key face keeps text-xs', () => {
    expect(EDITOR_RENDERER).toContain('className="size-4"');
    expect(MARKDOWN_RENDERER).toContain('className="size-4"');
    expect(TEMPLATE_BAR).toContain('text-xs');
    // The retired editor icon size must not resurface.
    expect(EDITOR_RENDERER).not.toContain('size-3.5');
  });

  it('no face declares a role="toolbar" composite role (R5)', () => {
    for (const [face, src] of [
      ['editor', EDITOR_RENDERER],
      ['markdown', MARKDOWN_RENDERER],
      ['template-bar', TEMPLATE_BAR],
    ] as const) {
      expect(src, face).not.toContain('role="toolbar"');
    }
  });

  it('the dead text fallback label domain is gone (R7)', () => {
    expect(TOOLBAR_CONFIG).not.toMatch(/\blabel:/);
    expect(EDITOR_RENDERER).not.toContain('config.label');
    // The retired emoji/letter fallbacks must not resurface.
    for (const dead of ["label: 'B'", "label: 'I'", "label: 'S'", 'label: \'""\'', "label: '🔗'"]) {
      expect(TOOLBAR_CONFIG).not.toContain(dead);
    }
  });

  it('the markdown face keeps its 20-07 no-role contract unchanged', () => {
    expect(MARKDOWN_RENDERER).not.toContain('role=');
  });
});
