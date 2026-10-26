#!/usr/bin/env node
// check:deps-baseline (plan 767 Phase 2, MA8.3-002): the dependency-cruiser
// no-circular face is gated against a registered signature baseline. Raw
// `audit:deps` stays an opt-in tool (57 standing violations would make a
// direct chain entry permanently red); this gate turns the face mechanical:
// any circular-dependency signature NOT in scripts/baselines/deps-baseline.json
// fails the chain, a shrinking count is reported as a tightening hint.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const baselineIdx = args.indexOf('--baseline');
const baselinePath =
  baselineIdx >= 0
    ? path.resolve(args[baselineIdx + 1])
    : path.join(rootDir, 'scripts', 'baselines', 'deps-baseline.json');

function signature(v) {
  const cycle = v.cycle.map((c) => c.name);
  // normalize rotation so the same cycle registers once
  const min = cycle.reduce((m, n) => (n < m ? n : m), cycle[0]);
  const at = cycle.indexOf(min);
  return [...cycle.slice(at), ...cycle.slice(0, at)].join(' -> ');
}

let baseline;
try {
  baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
} catch {
  console.error(`[check:deps-baseline] cannot read baseline ${baselinePath}`);
  process.exit(1);
}

let json;
try {
  json = execFileSync(
    process.execPath,
    [
      path.join(rootDir, 'node_modules', 'dependency-cruiser', 'bin', 'dependency-cruise.mjs'),
      '--config',
      '.dependency-cruiser.mjs',
      '--output-type',
      'json',
      'apps',
      'packages',
      'scripts',
    ],
    { cwd: rootDir, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
  );
} catch (error) {
  console.error('[check:deps-baseline] dependency-cruise run failed:', error.message);
  process.exit(1);
}

const violations = (JSON.parse(json).summary?.violations ?? []).filter(
  (v) => v.rule?.name === 'no-circular',
);
const live = new Map();
for (const v of violations) {
  const sig = signature(v);
  live.set(sig, (live.get(sig) ?? 0) + 1);
}
const registered = new Set(baseline.signatures ?? []);
const newOnes = [...live.keys()].filter((sig) => !registered.has(sig));

console.log(`[check:deps-baseline] live no-circular signatures: ${live.size} (violations ${violations.length}); registered: ${registered.size}`);
if (newOnes.length > 0) {
  console.error('[check:deps-baseline] NEW circular-dependency signatures not registered in baseline:');
  for (const sig of newOnes) {
    console.error(`  - ${sig}`);
  }
  console.error(`  fix the cycle or consciously re-register in scripts/baselines/deps-baseline.json`);
  process.exit(1);
}
if (live.size < registered.size) {
  console.log(
    `[check:deps-baseline] tightening hint: live (${live.size}) < registered (${registered.size}) — consider re-registering the baseline downward`,
  );
}
console.log('[check:deps-baseline] no new circular dependencies');
