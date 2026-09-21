import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Plan 480 Phase 4 (A6/R1) — `.nop-editor-content` typography contract.
 * jsdom/happy-dom do not apply package stylesheets, so the CSS side is
 * asserted as source text (repo precedent: markdown-content.test.tsx).
 * Computed-style verification is owned by the A7 e2e layer.
 */
const css = readFileSync('src/styles.css', 'utf8');

describe('plan 480 A6 — .nop-editor-content typography matrix', () => {
  it('covers the minimal element matrix (h1-h3/ul/ol/blockquote/code/a/img + p/pre)', () => {
    expect(css).toMatch(/\.nop-editor-content h1,/);
    expect(css).toMatch(/\.nop-editor-content h3\s*\{/);
    expect(css).toMatch(/\.nop-editor-content p\s*\{/);
    expect(css).toMatch(/\.nop-editor-content ul,/);
    expect(css).toMatch(/\.nop-editor-content ol\s*\{/);
    expect(css).toMatch(/\.nop-editor-content blockquote\s*\{/);
    expect(css).toMatch(/\.nop-editor-content pre\s*\{/);
    expect(css).toMatch(/\.nop-editor-content :not\(pre\) > code\s*\{/);
    expect(css).toMatch(/\.nop-editor-content a\s*\{/);
    expect(css).toMatch(/\.nop-editor-content img\s*\{[^}]*max-width:\s*100%/);
  });

  it('is token-driven with dual dark triggers (OS preference + data-mode)', () => {
    expect(css).toMatch(/\.nop-editor-content\s*\{[^}]*--flux-editor-fg:/);
    expect(css).toMatch(
      /@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-mode='light'\]\) \.nop-editor-content\s*\{/,
    );
    expect(css).toMatch(/\[data-mode='dark'\] \.nop-editor-content\s*\{[^}]*--flux-editor-fg:/);
  });

  it('the dead prose class family stays out of the package (R1)', () => {
    expect(css).not.toMatch(/\bprose\b/);
  });
});
