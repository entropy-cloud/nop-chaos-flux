import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');
const packagesDir = path.join(rootDir, 'packages');

function collectCssTargets(target, targets = []) {
  if (typeof target === 'string') {
    targets.push(target);
    return targets;
  }

  if (!target || typeof target !== 'object') {
    return targets;
  }

  for (const nestedTarget of Object.values(target)) {
    collectCssTargets(nestedTarget, targets);
  }

  return targets;
}

function collectCssExports(exportsField) {
  if (!exportsField || typeof exportsField !== 'object') {
    return [];
  }

  return Object.entries(exportsField)
    .filter(([subpath]) => subpath.endsWith('.css'))
    .map(([subpath, target]) => ({ subpath, targets: collectCssTargets(target) }))
    .filter((cssExport) => cssExport.targets.length > 0);
}

async function main() {
  const packageEntries = await readdir(packagesDir, { withFileTypes: true });
  const problems = [];
  let checkedSubpathCount = 0;
  let checkedTargetCount = 0;

  for (const entry of packageEntries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const packageJsonPath = path.join(packagesDir, entry.name, 'package.json');
    let packageJson;
    try {
      packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
    } catch {
      continue;
    }

    for (const cssExport of collectCssExports(packageJson.exports)) {
      checkedSubpathCount += 1;
      checkedTargetCount += cssExport.targets.length;

      for (const target of cssExport.targets) {
        if (target.includes('/src/')) {
          problems.push(`${packageJson.name} ${cssExport.subpath} points at source asset ${target}`);
        }

        if (!target.startsWith('./dist/')) {
          problems.push(
            `${packageJson.name} ${cssExport.subpath} must point at ./dist/* but found ${target}`,
          );
        }
      }
    }
  }

  if (problems.length > 0) {
    console.error('[check-package-css-exports] ERROR: invalid CSS export targets found:');
    for (const problem of problems) {
      console.error(`  - ${problem}`);
    }
    process.exit(1);
  }

  console.log(
    `[check-package-css-exports] Verified ${checkedSubpathCount} CSS export subpaths across ${checkedTargetCount} resolved targets`,
  );
}

main().catch((error) => {
  console.error('[check-package-css-exports] Error:', error);
  process.exit(1);
});
