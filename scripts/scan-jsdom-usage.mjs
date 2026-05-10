#!/usr/bin/env node

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
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

function scanPackageJson(files) {
  const jsdomDeps = [];
  const jestEnvDeps = [];
  const inlineJestEnv = [];

  for (const file of files) {
    if (!file.endsWith('package.json') || file.includes('package-lock.json') || file.includes('.modules.yaml')) continue;
    try {
      const content = readFileSync(file, 'utf-8');
      const json = JSON.parse(content);
      const relPath = relative(ROOT, file);
      const allDeps = { ...(json.dependencies || {}), ...(json.devDependencies || {}) };

      if (allDeps['jsdom']) {
        jsdomDeps.push({ file: relPath, version: allDeps['jsdom'] });
      }
      if (allDeps['jest-environment-jsdom'] || allDeps['jest-fixed-jsdom']) {
        jestEnvDeps.push({ file: relPath, version: allDeps['jest-environment-jsdom'] || allDeps['jest-fixed-jsdom'] });
      }
      if (json.jest && json.jest.testEnvironment === 'jsdom') {
        inlineJestEnv.push({ file: relPath });
      }
    } catch {}
  }

  return { jsdomDeps, jestEnvDeps, inlineJestEnv };
}

function scanVitestConfig(files) {
  const results = [];
  for (const file of files) {
    const base = file.replace(/\\/g, '/').split('/').pop() || '';
    if (!base.startsWith('vitest.config') && !base.startsWith('vitest.shared')) continue;
    try {
      const content = readFileSync(file, 'utf-8');
      const relPath = relative(ROOT, file);
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.includes("environment") && line.includes("jsdom")) {
          results.push({ file: relPath, line: i + 1, content: line.trim() });
        }
      });
    } catch {}
  }
  return results;
}

function scanTestPragmas(files) {
  const results = [];
  for (const file of files) {
    if (!file.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/)) continue;
    try {
      const content = readFileSync(file, 'utf-8');
      const relPath = relative(ROOT, file);
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.includes('@vitest-environment') && line.includes('jsdom')) {
          results.push({ file: relPath, line: i + 1, content: line.trim() });
        }
      });
    } catch {}
  }
  return results;
}

function scanSourceImports(files) {
  const results = [];
  for (const file of files) {
    if (!file.match(/\.(ts|tsx|js|jsx|mjs|cjs)$/)) continue;
    try {
      const content = readFileSync(file, 'utf-8');
      const relPath = relative(ROOT, file);
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if ((line.includes("from 'jsdom'") || line.includes('from "jsdom"') || line.includes("require('jsdom')") || line.includes('require("jsdom")')) && !line.trim().startsWith('//')) {
          results.push({ file: relPath, line: i + 1, content: line.trim() });
        }
      });
    } catch {}
  }
  return results;
}

function printSection(title, items, formatter) {
  console.log(`\n## ${title} (${items.length} items)\n`);
  if (items.length === 0) {
    console.log('  (none)\n');
    return;
  }
  items.forEach((item) => formatter(item));
}

function main() {
  console.log('='.repeat(70));
  console.log('  jsdom Usage Scan Report');
  console.log('  Root: ' + ROOT);
  console.log('='.repeat(70));

  const files = walkDir(ROOT);
  console.log(`\nScanned ${files.length} files\n`);

  const pkgResults = scanPackageJson(files);
  const vitestResults = scanVitestConfig(files);
  const pragmaResults = scanTestPragmas(files);
  const importResults = scanSourceImports(files);

  printSection('package.json: jsdom dependency', pkgResults.jsdomDeps, (item) => {
    console.log(`  ${item.file}: "jsdom": "${item.version}"`);
  });

  printSection('Vitest configs / vitest.shared with environment: jsdom', vitestResults, (item) => {
    console.log(`  ${item.file}:${item.line} | ${item.content}`);
  });

  printSection('Test files with @vitest-environment jsdom pragma', pragmaResults, (item) => {
    console.log(`  ${item.file}:${item.line} | ${item.content}`);
  });

  printSection('Source files importing jsdom directly', importResults, (item) => {
    console.log(`  ${item.file}:${item.line} | ${item.content}`);
  });

  console.log('\n' + '='.repeat(70));
  console.log('  SUMMARY');
  console.log('='.repeat(70));
  console.log(`  package.json jsdom deps:         ${pkgResults.jsdomDeps.length}`);
  console.log(`  vitest configs / shared:         ${vitestResults.length}`);
  console.log(`  test file pragmas:               ${pragmaResults.length}`);
  console.log(`  source imports:                  ${importResults.length}`);
  console.log('='.repeat(70));

  const output = {
    vitestPkgDeps: pkgResults.jsdomDeps.map((i) => i.file),
    vitestConfigs: vitestResults.map((i) => `${i.file}:${i.line}`),
    testPragmas: pragmaResults.map((i) => `${i.file}:${i.line}`),
    sourceImports: importResults.map((i) => `${i.file}:${i.line}`),
  };

  writeFileSync(join(ROOT, 'jsdom-scan-result.json'), JSON.stringify(output, null, 2));
  console.log('\n  Results saved to jsdom-scan-result.json\n');
}

try { main(); } catch(e) { console.error(e); process.exit(1); }
