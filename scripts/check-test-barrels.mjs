#!/usr/bin/env node
// Rejects test files that import another test module. Vitest collects every
// `*.test.ts(x)` by glob, so an aggregator ("barrel") that imports sibling
// test files makes each imported suite run twice and inflates pass counts.
//
// Usage: node scripts/check-test-barrels.mjs [file ...]
// Without arguments, scans every git-tracked *.test.ts / *.test.tsx file.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const TEST_MODULE_SPECIFIER = /\b(?:import|from)\s*\(?\s*['"]([^'"]+\.test(?:\.[cm]?[jt]sx?)?)['"]/g;

export function findTestModuleImports(source) {
  return [...source.matchAll(TEST_MODULE_SPECIFIER)].map((match) => match[1]);
}

function listTrackedTestFiles() {
  return execFileSync('git', ['ls-files', '*.test.ts', '*.test.tsx'], { encoding: 'utf-8' })
    .split('\n')
    .filter((file) => file && existsSync(file));
}

function main() {
  const files = process.argv.length > 2 ? process.argv.slice(2) : listTrackedTestFiles();
  const violations = [];
  for (const file of files) {
    for (const specifier of findTestModuleImports(readFileSync(file, 'utf-8'))) {
      violations.push(`${file} imports test module '${specifier}'`);
    }
  }
  if (violations.length > 0) {
    console.error(`[check:test-barrels] ${violations.length} test file import(s) of another test module:`);
    for (const violation of violations) console.error(`  - ${violation}`);
    console.error('[check:test-barrels] Each suite is collected by the vitest glob; delete the aggregator instead of re-importing.');
    process.exit(1);
  }
  console.log(`[check:test-barrels] OK (${files.length} test files, no test-module imports)`);
}

main();
