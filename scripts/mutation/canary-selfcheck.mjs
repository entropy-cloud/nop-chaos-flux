#!/usr/bin/env node
// Canary self-check for the mutation device (P1-MA4.5-001 fix direction ③).
//
// The device (stryker + vitest runner) once collapsed per-mutant test
// execution to 0 (23/23 mutants `testsCompleted=0` judged Survived,
// 2026-10 MA4.5 audit), making every mutation score invalid. This script is
// the anti-regression ratchet: run a scoped stryker pass over
// validation/validators.ts and assert, from the json report:
//   1. the known-killable email-validator EqualityOperator canary mutants
//      (`!== ''` -> `=== ''`, killed by validators-edge-cases.test.ts
//      email suite) are KILLED;
//   2. no mutant is a false survivor (Survived with testsCompleted=0 —
//      the collapse signature; NoCoverage mutants legitimately have no
//      tests and are excluded).
// Any assertion failure means the device is invalid: do NOT trust any
// mutation score until fixed.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const target = 'packages/flux-runtime/src/validation/validators.ts';
const reportPath = resolve(repoRoot, 'reports/mutation/mutation.json');

function fail(message) {
  console.error(`[audit:mutants:canary] DEVICE INVALID: ${message}`);
  process.exit(1);
}

// Locate the email validator's equality canary line dynamically (line drift
// beats hardcoded numbers).
const source = readFileSync(resolve(repoRoot, target), 'utf8').split('\n');
const emailLine = source.findIndex((line) => line.includes('email(input)')) + 1;
if (emailLine === -1) {
  fail('cannot locate `email(input)` in validators.ts');
}
// Window = the email validator's own body (up to the next sibling validator
// declaration) — a NoCoverage mutant on a neighboring uncovered validator
// is not an escaped canary.
let windowEnd = source.length - 1;
for (let i = emailLine; i < source.length; i += 1) {
  if (i > emailLine && /^\s{2}\w+\(input\)/.test(source[i])) {
    windowEnd = i - 1;
    break;
  }
}
const windowStart = emailLine;

console.log(`[audit:mutants:canary] running scoped stryker pass (canary window ${target}:${windowStart}-${windowEnd})...`);
try {
  execFileSync(
    'npx',
    [
      'stryker',
      'run',
      'stryker.runtime.conf.mjs',
      '--plugins',
      '@stryker-mutator/vitest-runner',
      '--mutate',
      target,
    ],
    { cwd: repoRoot, stdio: ['ignore', 'inherit', 'inherit'] },
  );
} catch {
  // threshold break (exit 1) is fine — the report is still written
  console.log('[audit:mutants:canary] stryker exited non-zero (threshold break); validating report anyway');
}

let report;
try {
  report = JSON.parse(readFileSync(reportPath, 'utf8'));
} catch (error) {
  fail(`cannot read json report at ${reportPath}: ${error.message}`);
}

const fileEntry = report.files[target];
if (!fileEntry) {
  fail(`report has no entry for ${target}`);
}

const mutants = fileEntry.mutants;
if (!mutants || mutants.length === 0) {
  fail('report contains no mutants');
}

const falseSurvivors = mutants.filter(
  (mutant) => mutant.status === 'Survived' && (mutant.testsCompleted ?? 0) === 0,
);
if (falseSurvivors.length > 0) {
  fail(
    `${falseSurvivors.length}/${mutants.length} mutants are false survivors (Survived with testsCompleted=0 — test-execution collapse)`,
  );
}

const canaries = mutants.filter((mutant) => {
  if (mutant.mutatorName !== 'EqualityOperator') {
    return false;
  }
  const line = mutant.location.start.line;
  return line >= windowStart && line <= windowEnd;
});

if (canaries.length === 0) {
  fail(`no EqualityOperator canary mutants found in ${target}:${windowStart}-${windowEnd} (email validator)`);
}

const aliveCanaries = canaries.filter((mutant) => mutant.status !== 'Killed' && mutant.status !== 'Timeout');
if (aliveCanaries.length > 0) {
  fail(
    `canary escaped: ${aliveCanaries.length}/${canaries.length} email-validator canary mutants not killed (${aliveCanaries
      .map((mutant) => `line ${mutant.location.start.line}:${mutant.status} testsCompleted=${mutant.testsCompleted}`)
      .join(', ')})`,
  );
}

console.log(
  `[audit:mutants:canary] OK — ${canaries.length} canary mutant(s) killed, 0 false survivors across ${mutants.length} mutants; device valid`,
);
