import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/components/ui/alert-dialog.tsx', 'utf8');

describe('AlertDialog overlay token contract', () => {
  it('uses token-backed overlay chrome instead of hardcoded black alpha', () => {
    expect(source).toContain('bg-surface-overlay');
    expect(source).not.toContain('bg-black/10');
  });
});
