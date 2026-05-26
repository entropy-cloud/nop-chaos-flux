import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/components/ui/sonner.tsx', 'utf8');

describe('Toaster token contract', () => {
  it('maps Sonner CSS variables to valid theme color functions', () => {
    expect(source).toContain("'--normal-bg': 'hsl(var(--popover, var(--card)))'");
    expect(source).toContain(
      "'--normal-text': 'hsl(var(--popover-foreground, var(--card-foreground)))'",
    );
    expect(source).toContain("'--normal-border': 'hsl(var(--border))'");
    expect(source).not.toContain("'--normal-bg': 'var(--popover)'");
    expect(source).not.toContain("'--normal-text': 'var(--popover-foreground)'");
    expect(source).not.toContain("'--normal-border': 'var(--border)'");
  });
});
