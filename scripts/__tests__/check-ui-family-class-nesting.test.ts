import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

// [2026-09-09-0001 follow-up] The nesting guard must actually fail on duplicates.
// Regression: the original pattern omitted the trailing space inside family
// literals ("nop-table "), matched 0 of 55 real literals, and exited 0 vacuously
// (closure-audit round-2 blocker). The negative control below stages a duplicate
// into the real tree, runs the real guard, and restores the tree; the config's
// fileParallelism: false keeps fixture staging race-free.

const scriptPath = new URL('../audit/check-ui-family-class-nesting.mjs', import.meta.url).pathname;
const fixtureDir = `${process.cwd()}/packages/ui/src/components/ui`;
const fixtureFile = `${fixtureDir}/zz-nesting-guard-fixture.tsx`;
const fixtureContent = `export function NestingGuardFixture() {
  return (
    <div data-slot="fixture" className={'nop-zzzfixture '}>
      <span className={'nop-zzzfixture '} />
    </div>
  );
}
`;

function runGuard(): { status: number; output: string } {
  try {
    const output = execFileSync('node', [scriptPath], { encoding: 'utf8' });
    return { status: 0, output };
  } catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string };
    return { status: err.status ?? 1, output: `${err.stdout ?? ''}${err.stderr ?? ''}` };
  }
}

describe('check-ui-family-class-nesting', () => {
  it('passes on the live (clean) ui tree', () => {
    const { status, output } = runGuard();
    expect(status).toBe(0);
    expect(output).toContain('ok');
  });
});

describe('check-ui-family-class-nesting fixture', () => {
  beforeAll(() => {
    mkdirSync(fixtureDir, { recursive: true });
    writeFileSync(fixtureFile, fixtureContent);
  });

  afterAll(() => {
    rmSync(fixtureFile, { force: true });
  });

  it('exits 1 on a duplicated family literal (negative control)', () => {
    const { status, output } = runGuard();
    expect(status).toBe(1);
    expect(output).toContain('nop-zzzfixture appears 2x');
  });
});
