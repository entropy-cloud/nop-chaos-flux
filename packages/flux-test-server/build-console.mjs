import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const pkgDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(pkgDir, '../..');

await build({
  entryPoints: [path.join(pkgDir, 'src/console/app.tsx')],
  bundle: true,
  format: 'iife',
  jsx: 'automatic',
  outfile: path.join(pkgDir, 'dist/console-bundle.js'),
  alias: { '@nop-chaos/ui': path.join(repoRoot, 'packages/ui/src/index.ts') },
  logLevel: 'warning',
});
