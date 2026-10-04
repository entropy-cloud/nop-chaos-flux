import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

/**
 * P5.1（plan 560）：designer 契约符合性守卫自身回归——
 * 对 conformed baseline（P0-P4 落地后）应 exit 0。
 */
describe('check-designer-conformance', () => {
  it('passes against the conformed eight-family baseline', () => {
    const stdout = execFileSync('node', ['scripts/check-designer-conformance.mjs'], {
      encoding: 'utf8',
      cwd: process.cwd(),
    });
    expect(stdout).toContain('all designer contract conformance checks passed');
  });
});


