import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('spreadsheet canvas styles', () => {
  it('keeps spreadsheet shell chrome on shared theme tokens', () => {
    // @ts-expect-error process is available in the Vitest node runtime
    const stylesheet = readFileSync(join(process.cwd(), 'src', 'canvas-styles.css'), 'utf8');

    expect(stylesheet).toContain("border: 1px solid var(--nop-border);");
    expect(stylesheet).toContain("background: var(--nop-surface);");
    expect(stylesheet).toContain("border-color: var(--nop-accent);");
    expect(stylesheet).toContain("color: var(--nop-body-copy);");
    expect(stylesheet).not.toContain("var(--nop-border, rgb(226, 232, 240))");
    expect(stylesheet).not.toContain("var(--nop-surface, rgb(255, 255, 255))");
    expect(stylesheet).not.toContain("var(--nop-accent, rgb(59, 130, 246))");
    expect(stylesheet).not.toContain("var(--nop-body-copy, rgb(71, 85, 105))");
  });
});
