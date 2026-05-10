#!/usr/bin/env node

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ROOT = args.find((a) => !a.startsWith('--')) || process.cwd();
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', '.turbo', '.nx', 'coverage', '.stryker-tmp', '.cache']);
const HAPPY_DOM_VERSION = '^15.11.0';

const changes = [];
const errors = [];

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

function replaceInFile(filePath, replacements) {
  try {
    let content = readFileSync(filePath, 'utf-8');
    let modified = false;

    for (const { pattern, replacement, label } of replacements) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
        changes.push({ file: relative(ROOT, filePath), change: label });
      }
    }

    if (modified && !DRY_RUN) {
      writeFileSync(filePath, content, 'utf-8');
    }
  } catch (e) {
    errors.push({ file: relative(ROOT, filePath), error: e.message });
  }
}

function main() {
  console.log('='.repeat(70));
  console.log(`  jsdom -> happy-dom Migration (${DRY_RUN ? 'DRY RUN' : 'LIVE'})`);
  console.log('  Root: ' + ROOT);
  console.log('='.repeat(70) + '\n');

  const files = walkDir(ROOT);
  console.log(`Scanned ${files.length} files\n`);

  // 1. vitest.config.* and vitest.shared.*
  for (const file of files) {
    const base = file.replace(/\\/g, '/').split('/').pop() || '';
    if (!base.startsWith('vitest.config') && !base.startsWith('vitest.shared')) continue;

    replaceInFile(file, [
      { pattern: /environment:\s*['"]jsdom['"]/g, replacement: "environment: 'happy-dom'", label: "environment: 'jsdom' -> 'happy-dom'" },
      { pattern: /'jsdom'/g, replacement: "'happy-dom'", label: "type literal 'jsdom' -> 'happy-dom'" },
      { pattern: /isJSDOM/g, replacement: 'isHappyDOM', label: 'isJSDOM -> isHappyDOM' },
    ]);
  }

  // 2. test file pragmas
  for (const file of files) {
    if (!file.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/)) continue;
    replaceInFile(file, [
      { pattern: /@vitest-environment\s+jsdom/g, replacement: '@vitest-environment happy-dom', label: 'pragma: jsdom -> happy-dom' },
    ]);
  }

  // 3. package.json dependencies
  for (const file of files) {
    if (!file.endsWith('package.json') || file.includes('package-lock.json')) continue;
    try {
      let content = readFileSync(file, 'utf-8');
      const json = JSON.parse(content);
      let modified = false;

      if (json.devDependencies && json.devDependencies['jsdom']) {
        delete json.devDependencies['jsdom'];
        json.devDependencies['happy-dom'] = HAPPY_DOM_VERSION;
        modified = true;
        changes.push({ file: relative(ROOT, file), change: `devDependencies: jsdom -> happy-dom@${HAPPY_DOM_VERSION}` });
      }
      if (json.dependencies && json.dependencies['jsdom']) {
        delete json.dependencies['jsdom'];
        json.dependencies['happy-dom'] = HAPPY_DOM_VERSION;
        modified = true;
        changes.push({ file: relative(ROOT, file), change: `dependencies: jsdom -> happy-dom@${HAPPY_DOM_VERSION}` });
      }

      if (modified && !DRY_RUN) {
        writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf-8');
      }
    } catch (e) {
      errors.push({ file: relative(ROOT, file), error: e.message });
    }
  }

  // Report
  console.log('--- Changes ---\n');
  const grouped = {};
  for (const c of changes) {
    if (!grouped[c.file]) grouped[c.file] = [];
    grouped[c.file].push(c.change);
  }

  for (const [file, changeList] of Object.entries(grouped)) {
    console.log(`  ${file}`);
    for (const c of changeList) {
      console.log(`    - ${c}`);
    }
  }

  console.log(`\n  Total: ${changes.length} changes across ${Object.keys(grouped).length} files`);

  if (errors.length > 0) {
    console.log('\n--- Errors ---\n');
    for (const e of errors) {
      console.log(`  ${e.file}: ${e.error}`);
    }
  }

  if (DRY_RUN) {
    console.log('\n  (dry-run: no files were modified)');
  } else {
    console.log('\n  Run `pnpm install` then `node scripts/validate-happy-dom-migration.mjs` to verify.');
  }

  console.log('\n' + '='.repeat(70));
}

try { main(); } catch(e) { console.error(e); process.exit(1); }
