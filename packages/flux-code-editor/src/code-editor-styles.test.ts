import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync('src/code-editor-styles.css', 'utf8');
const compactStyles = styles.replace(/\s+/g, ' ').trim();

describe('code-editor stylesheet contract', () => {
  it('scopes package selectors to the code-editor root', () => {
    expect(styles).toContain(".nop-code-editor [data-slot='code-editor-toolbar']");
    expect(styles).toContain(".nop-code-editor [data-slot='code-editor-header']");
    expect(styles).toContain(".nop-code-editor [data-slot='code-editor-result-header']");
    expect(styles).not.toContain("\n[data-slot='code-editor-toolbar']");
    expect(styles).not.toContain("\n[data-slot='code-editor-header']");
    expect(styles).not.toContain("\n[data-slot='code-editor-result-header']");
  });

  it('derives default chrome tokens from shared theme variables', () => {
    expect(compactStyles).toContain(
      '--nop-code-editor-toolbar-bg: color-mix( in srgb, hsl(var(--background)) 88%, hsl(var(--foreground)) 12% );',
    );
    expect(compactStyles).toContain('--nop-code-editor-header-title-fg: hsl(var(--foreground));');
    expect(compactStyles).toContain(
      '--nop-code-editor-var-item-value-fg: hsl(var(--muted-foreground));',
    );
    expect(styles).not.toContain('--nop-code-editor-toolbar-bg: rgba(0, 0, 0, 0.03);');
    expect(styles).not.toContain('--nop-code-editor-header-title-fg: #333;');
  });
});
