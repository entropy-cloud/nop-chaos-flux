import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync('src/code-editor-styles.css', 'utf8');

describe('code-editor stylesheet contract', () => {
  it('scopes package selectors to the code-editor root', () => {
    expect(styles).toContain(".nop-code-editor [data-slot='code-editor-toolbar']");
    expect(styles).toContain(".nop-code-editor [data-slot='code-editor-header']");
    expect(styles).toContain(".nop-code-editor [data-slot='code-editor-result-header']");
    expect(styles).not.toContain("\n[data-slot='code-editor-toolbar']");
    expect(styles).not.toContain("\n[data-slot='code-editor-header']");
    expect(styles).not.toContain("\n[data-slot='code-editor-result-header']");
  });
});
