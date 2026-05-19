import { readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');
const packageDir = path.join(rootDir, 'packages', 'flux-bundle');
const distPackagesDir = path.join(rootDir, 'dist-packages');

async function getLatestTarball() {
  const entries = await readdir(distPackagesDir, { withFileTypes: true });
  const tarballs = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.tgz'))
      .map(async (entry) => {
        const filePath = path.join(distPackagesDir, entry.name);
        const stats = await import('fs/promises').then((fs) => fs.stat(filePath));
        return { filePath, mtimeMs: stats.mtimeMs };
      }),
  );

  tarballs.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return tarballs[0]?.filePath;
}

async function main() {
  await execFileAsync('node', [path.join(rootDir, 'scripts', 'pack-flux-bundle.mjs')], {
    cwd: rootDir,
    maxBuffer: 10 * 1024 * 1024,
  });

  const tarballPath = await getLatestTarball();
  if (!tarballPath) {
    throw new Error('No tarball produced in dist-packages/');
  }

  const tarballName = path.basename(tarballPath);

  const { stdout: tarListRaw } = await execFileAsync('tar', ['-tf', tarballName], {
    cwd: distPackagesDir,
    maxBuffer: 10 * 1024 * 1024,
  });
  const tarEntries = tarListRaw.split(/\r?\n/).filter(Boolean);

  const requiredEntries = [
    'package/package.json',
    'package/dist/index.js',
    'package/dist/index.d.ts',
    'package/dist/style.css',
  ];
  for (const entry of requiredEntries) {
    if (!tarEntries.includes(entry)) {
      throw new Error(`Missing tarball entry: ${entry}`);
    }
  }

  const jsEntries = tarEntries.filter(
    (entry) => entry.startsWith('package/dist/') && entry.endsWith('.js') && !entry.endsWith('.js.map'),
  );
  if (jsEntries.length !== 1 || jsEntries[0] !== 'package/dist/index.js') {
    throw new Error(`Expected a single JS entry chunk, found: ${jsEntries.join(', ')}`);
  }

  const { stdout: manifestRaw } = await execFileAsync(
    'tar',
    ['-xOf', tarballName, 'package/package.json'],
    {
      cwd: distPackagesDir,
      maxBuffer: 10 * 1024 * 1024,
    },
  );
  const manifest = JSON.parse(manifestRaw);
  const manifestText = JSON.stringify(manifest);

  if (manifestText.includes('workspace:*')) {
    throw new Error('Packed manifest still contains workspace:* references');
  }

  for (const internalPackage of [
    '@nop-chaos/flux-core',
    '@nop-chaos/flux-formula',
    '@nop-chaos/flux-react',
    '@nop-chaos/flux-renderers-basic',
    '@nop-chaos/flux-renderers-form',
    '@nop-chaos/flux-renderers-data',
  ]) {
    if (manifestText.includes(internalPackage)) {
      throw new Error(`Packed manifest leaked internal package reference: ${internalPackage}`);
    }
  }

  const peerDependencies = manifest.peerDependencies ?? {};
  for (const peerName of ['@nop-chaos/ui', 'lucide-react', 'react', 'react-dom', 'zustand']) {
    if (!(peerName in peerDependencies)) {
      throw new Error(`Packed manifest missing required peer dependency: ${peerName}`);
    }
  }

  if (manifest.exports?.['./style.css'] !== './dist/style.css') {
    throw new Error('Packed manifest does not export ./style.css');
  }

  const { stdout: styles } = await execFileAsync('tar', ['-xOf', tarballName, 'package/dist/style.css'], {
    cwd: distPackagesDir,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (styles.includes('\nhtml {') || styles.includes('\nbody {') || styles.includes('\n:root {')) {
    throw new Error('Facade stylesheet contains unscoped global selectors');
  }

  console.log(`[check-flux-bundle-pack] Verified tarball ${path.basename(tarballPath)}`);
}

main().catch((error) => {
  console.error('[check-flux-bundle-pack] Error:', error);
  process.exit(1);
});
