import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Plan 480 Phase 4 (A6/R1) — the ai sender content root typography contract.
 * jsdom/happy-dom do not apply package stylesheets, so the CSS side is
 * asserted as source text (repo precedent: markdown-content.test.tsx).
 */
const css = readFileSync('src/styles.css', 'utf8');

describe('plan 480 A6 — ai sender tiptap content typography matrix', () => {
  it('covers the minimal element matrix (h1-h3/ul/ol/blockquote/code/a/img)', () => {
    const scope = "\\[data-slot='ai-sender-tiptap-content'\\]";
    expect(css).toMatch(new RegExp(`${scope} h1,`));
    expect(css).toMatch(new RegExp(`${scope} h3\\s*\\{`));
    expect(css).toMatch(new RegExp(`${scope} ul,`));
    expect(css).toMatch(new RegExp(`${scope} ol\\s*\\{`));
    expect(css).toMatch(new RegExp(`${scope} blockquote\\s*\\{`));
    expect(css).toMatch(new RegExp(`${scope} pre\\s*\\{`));
    expect(css).toMatch(new RegExp(`${scope} :not\\(pre\\) > code\\s*\\{`));
    expect(css).toMatch(new RegExp(`${scope} a\\s*\\{`));
    expect(css).toMatch(new RegExp(`${scope} img\\s*\\{[^}]*max-width:\\s*100%`));
  });

  it('is token-driven with dual dark triggers (OS preference + data-mode)', () => {
    const scope = "\\[data-slot='ai-sender-tiptap-content'\\]";
    expect(css).toMatch(new RegExp(`${scope}\\s*\\{[^}]*--ai-sender-fg:`));
    expect(css).toMatch(
      new RegExp(
        `@media \\(prefers-color-scheme: dark\\)\\s*\\{\\s*:root:not\\(\\[data-mode='light'\\]\\) ${scope}\\s*\\{`,
      ),
    );
    expect(css).toMatch(new RegExp(`\\[data-mode='dark'\\] ${scope}\\s*\\{[^}]*--ai-sender-fg:`));
  });
});
