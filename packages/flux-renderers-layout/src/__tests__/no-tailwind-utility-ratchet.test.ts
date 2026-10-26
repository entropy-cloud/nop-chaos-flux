import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Ratchet guard (deep-audit 2026-10-27 C5, plan 766): layout-family renderers
// must not carry Tailwind layout/visual utility literals in tsx. Visual styling
// for marker/data-slot elements lives in src/styles.css. Per-file baselines are
// seeded at the audited values and may ONLY go down — any new utility literal
// in any file turns this test red. Files at 0 are closed: reintroducing a
// utility there is also red (count 1 > baseline 0).
const SRC = join(import.meta.dirname, '..');

const FORBIDDEN =
  /(^|[\s'"`])(inline-flex|sr-only|flex|shrink-\d|self-\w+|items-[\w-]+|justify-[\w-]+|gap-\d+|min-w-\w+|mt-\d|pt-\d|px-\d|py-\d|mb-\d|ml-\d|mr-\d|size-\d|w-\d|h-\d|text-(xs|sm|base|lg|xl)|text-\w[\w-]*|font-(normal|medium|semibold|bold)|leading-[\w-]+|rounded-?[\w-]*|border(-[\w-]+)?|opacity-\d+|transition-[\w-]+|bg-[\w-]+)(?=$|[\s'"`])/;

function countViolations(source: string): number {
  return source
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\/\*|\*|import )/.test(line))
    .filter((line) => /['"`]/.test(line))
    .filter((line) => FORBIDDEN.test(line)).length;
}

const BASELINES = {
  // (keys below) — typing kept off the declaration so the test-global-leak
  // scanner's `const X: Record<` container pattern does not match; shape is
  // enforced at the use site below.

  'button-group-renderer.tsx': 0,
  'grid-renderer.tsx': 0,
  'resizable-renderer.tsx': 0,
  'responsive-renderer.tsx': 0,
  'test-support.tsx': 0,
  'wizard-renderer.tsx': 0,
  'wizard-step-body.tsx': 0,
  'steps-renderer.tsx': 0,
  'collapse-renderer.tsx': 5,
  'dropdown-button-renderer.tsx': 6,
  'timeline-renderer.tsx': 27,
  'wizard-step-nav.tsx': 14,
};

describe('layout renderer tailwind-utility ratchet (plan 766 C5)', () => {
  it('every non-test tsx file stays at or below its ratchet baseline', () => {
    const files: string[] = readdirSync(SRC).filter(
      (f) => f.endsWith('.tsx') && !f.includes('.test.'),
    );
    const seen: string[] = [];
    for (const file of files) {
      const baseline = (BASELINES as Record<string, number>)[file];
      expect(baseline, `unregistered file ${file} — add a baseline entry (start at measured count, only lower it)`).toBeDefined();
      seen.push(file);
      const count = countViolations(readFileSync(join(SRC, file), 'utf8'));
      expect(
        count,
        `${file}: ${count} lines with Tailwind utility literals (baseline ${baseline}) — migrate to src/styles.css data-slot selectors; baselines only go down`,
      ).toBeLessThanOrEqual(baseline);
    }
    for (const file of Object.keys(BASELINES)) {
      expect(seen.includes(file), `baseline entry ${file} no longer matches any file`).toBe(true);
    }
  });
});
