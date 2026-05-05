import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');
const packagesDir = path.join(rootDir, 'packages');

function collectCssExports(exportsField) {
  if (!exportsField || typeof exportsField !== 'object') {
    return [];
  }

  return Object.entries(exportsField)
    .filter(([subpath, target]) => subpath.endsWith('.css') && typeof target === 'string')
    .map(([subpath, target]) => ({ subpath, target }));
}

async function main() {
  const packageEntries = await readdir(packagesDir, { withFileTypes: true });
  const problems = [];
  let checkedCount = 0;

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
      checkedCount += 1;

      if (cssExport.target.includes('/src/')) {
        problems.push(
          `${packageJson.name} ${cssExport.subpath} points at source asset ${cssExport.target}`,
        );
      }

      if (!cssExport.target.startsWith('./dist/')) {
        problems.push(
          `${packageJson.name} ${cssExport.subpath} must point at ./dist/* but found ${cssExport.target}`,
        );
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

  console.log(`[check-package-css-exports] Verified ${checkedCount} CSS export targets`);
}

main().catch((error) => {
  console.error('[check-package-css-exports] Error:', error);
  process.exit(1);
});
