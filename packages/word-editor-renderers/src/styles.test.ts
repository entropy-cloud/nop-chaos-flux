import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync('src/styles.css', 'utf8');

describe('word-editor stylesheet contract', () => {
  it('scopes package token defaults to the word-editor root instead of .nop-theme-root', () => {
    expect(styles).toContain('.nop-word-editor-page {');
    expect(styles).not.toContain('.nop-theme-root {');
  });

  it('wraps shared HSL fragment tokens in valid color functions', () => {
    expect(styles).toContain('hsl(var(--background');
    expect(styles).toContain('hsl(var(--foreground');
    expect(styles).toContain('hsl(var(--card');
    expect(styles).toContain('hsl(var(--muted');
    expect(styles).not.toContain('--nop-app-bg: var(--background');
    expect(styles).not.toContain('--nop-app-text: var(--foreground');
  });
});
