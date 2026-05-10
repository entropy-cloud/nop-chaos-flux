#!/usr/bin/env node

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.argv[2] || process.cwd();
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', '.turbo', '.nx', 'coverage', '.stryker-tmp', '.cache']);

function walkDir(dir) {
  const results = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...walkDir(fullPath));
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  } catch {}
  return results;
}

function main() {
  console.log('='.repeat(70));
  console.log('  happy-dom Migration Validation');
  console.log('  Root: ' + ROOT);
  console.log('='.repeat(70) + '\n');

  const files = walkDir(ROOT);
  let pass = true;
  const residuals = [];

  // Check 1: vitest configs should use happy-dom
  console.log('Check 1: vitest.config.* / vitest.shared.* should use happy-dom\n');
  for (const file of files) {
    const base = file.replace(/\\/g, '/').split('/').pop() || '';
    if (!base.startsWith('vitest.config') && !base.startsWith('vitest.shared')) continue;
    try {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.includes("environment") && line.includes("jsdom") && !line.includes("happy-dom")) {
          const relPath = relative(ROOT, file);
          residuals.push({ check: 1, file: relPath, line: i + 1, content: line.trim() });
          console.log(`  FAIL: ${relPath}:${i + 1} | ${line.trim()}`);
          pass = false;
        }
      });
    } catch {}
  }
  if (!residuals.some(r => r.check === 1)) {
    console.log('  PASS\n');
  }

  // Check 2: test file pragmas
  console.log('Check 2: test file pragmas should use happy-dom\n');
  let pragmaFailCount = 0;
  for (const file of files) {
    if (!file.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/)) continue;
    try {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.includes('@vitest-environment') && line.includes('jsdom') && !line.includes('happy-dom')) {
          const relPath = relative(ROOT, file);
          residuals.push({ check: 2, file: relPath, line: i + 1, content: line.trim() });
          console.log(`  FAIL: ${relPath}:${i + 1} | ${line.trim()}`);
          pragmaFailCount++;
          pass = false;
        }
      });
    } catch {}
  }
  if (pragmaFailCount === 0) {
    console.log('  PASS\n');
  }

  // Check 3: package.json should not have jsdom
  console.log('Check 3: package.json should use happy-dom instead of jsdom\n');
  let pkgFailCount = 0;
  for (const file of files) {
    if (!file.endsWith('package.json') || file.includes('package-lock.json')) continue;
    try {
      const content = readFileSync(file, 'utf-8');
      const json = JSON.parse(content);
      const allDeps = { ...(json.dependencies || {}), ...(json.devDependencies || {}) };

      if (allDeps['jsdom']) {
        const relPath = relative(ROOT, file);
        residuals.push({ check: 3, file: relPath, line: 0, content: `"jsdom": "${allDeps['jsdom']}"` });
        console.log(`  FAIL: ${relPath} still has "jsdom": "${allDeps['jsdom']}"`);
        pkgFailCount++;
        pass = false;
      }
    } catch {}
  }
  if (pkgFailCount === 0) {
    console.log('  PASS\n');
  }

  // Check 4: vitest.shared.ts should not reference jsdom/isJSDOM
  console.log('Check 4: vitest.shared.ts should not reference jsdom/isJSDOM\n');
  for (const file of files) {
    const base = file.replace(/\\/g, '/').split('/').pop() || '';
    if (base !== 'vitest.shared.ts') continue;
    try {
      const content = readFileSync(file, 'utf-8');
      if (content.includes("'jsdom'") || content.includes('"jsdom"') || content.includes('isJSDOM')) {
        const relPath = relative(ROOT, file);
        residuals.push({ check: 4, file: relPath, line: 0, content: 'still references jsdom/isJSDOM' });
        console.log(`  FAIL: ${relPath} still references jsdom or isJSDOM`);
        pass = false;
      } else {
        console.log('  PASS\n');
      }
    } catch {}
  }

  // Summary
  console.log('='.repeat(70));
  if (pass) {
    console.log('  RESULT: ALL CHECKS PASSED');
  } else {
    console.log('  RESULT: FAILED - Residual jsdom references:');
    for (const r of residuals) {
      console.log(`    [Check ${r.check}] ${r.file}:${r.line} | ${r.content}`);
    }
  }
  console.log('='.repeat(70));

  process.exit(pass ? 0 : 1);
}

try { main(); } catch(e) { console.error(e); process.exit(1); }
