import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const distAssets = join(root, 'apps', 'playground', 'dist', 'assets');

// Markers that survive minification: string literals emitted by the kernel itself.
// (Identifier names like `createNopDebugger` are minified away; demo-page copy text
// like `window.__NOP_DEBUGGER_API__` is user-facing documentation, not kernel code.)
const KERNEL_MARKERS = [
  'nop-debugger-hub',
  'playground-main',
  '[recorder] checkpoint hash failed cause:',
];

if (!existsSync(distAssets)) {
  console.error('[check:devtools-tree-shake] FAIL: apps/playground/dist/assets does not exist.');
  console.error('  Produce a production build first: pnpm --filter @nop-chaos/flux-playground build --mode production');
  process.exit(1);
}

const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js')) files.push(full);
  }
};
walk(distAssets);

const offenders = [];
for (const file of files) {
  const content = readFileSync(file, 'utf8');
  for (const marker of KERNEL_MARKERS) {
    if (content.includes(marker)) {
      offenders.push(`${file} contains "${marker}"`);
    }
  }
}

if (offenders.length > 0) {
  console.error('[check:devtools-tree-shake] FAIL: full debugger kernel found in production build:');
  offenders.forEach((entry) => console.error(`  - ${entry}`));
  process.exit(1);
}
console.log('[check:devtools-tree-shake] production build is kernel-free');
