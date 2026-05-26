import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/components/ui/alert-dialog.tsx', 'utf8');

describe('AlertDialog overlay token contract', () => {
  it('uses token-backed overlay chrome instead of hardcoded black alpha', () => {
    expect(source).toContain(
      "bg-[var(--nop-dialog-backdrop,hsl(var(--popover,0_0%_0%)_/_0.1))]",
    );
    expect(source).not.toContain('bg-black/10');
  });
});
