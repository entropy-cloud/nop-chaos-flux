import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Plan 480 Phase 4 (A6) — `.nop-markdown` preview typography contract for the
 * markdown-editor split surface. jsdom/happy-dom do not apply package
 * stylesheets, so the CSS side is asserted as source text (repo precedent:
 * markdown-content.test.tsx). Computed-style verification is owned by the
 * A7 e2e layer.
 */
const css = readFileSync('src/form-renderers.css', 'utf8');

describe('plan 480 A6 — .nop-markdown preview typography matrix', () => {
  it('covers the minimal element matrix (h1-h3/ul/ol/blockquote/code/a/img)', () => {
    expect(css).toMatch(/\.nop-markdown h1,/);
    expect(css).toMatch(/\.nop-markdown h3\s*\{/);
    expect(css).toMatch(/\.nop-markdown ul,/);
    expect(css).toMatch(/\.nop-markdown ol\s*\{/);
    expect(css).toMatch(/\.nop-markdown blockquote\s*\{/);
    expect(css).toMatch(/\.nop-markdown pre\s*\{/);
    expect(css).toMatch(/\.nop-markdown :not\(pre\) > code\s*\{/);
    expect(css).toMatch(/\.nop-markdown a\s*\{/);
    expect(css).toMatch(/\.nop-markdown img\s*\{[^}]*max-width:\s*100%/);
  });

  it('is token-driven with dual dark triggers (OS preference + data-mode)', () => {
    expect(css).toMatch(/\.nop-markdown\s*\{[^}]*--flux-md-fg:/);
    expect(css).toMatch(
      /@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-mode='light'\]\) \.nop-markdown\s*\{/,
    );
    expect(css).toMatch(/\[data-mode='dark'\] \.nop-markdown\s*\{[^}]*--flux-md-fg:/);
  });
});
