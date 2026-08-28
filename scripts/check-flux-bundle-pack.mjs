import { readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');
const distPackagesDir = path.join(rootDir, 'dist-packages');

const typeReferencePattern = /(?:\bfrom\s*|\bimport\(\s*)['"](@nop-chaos\/[^'"]+)['"]/g;

function packageRootOfSpecifier(specifier) {
  const segments = specifier.split('/');
  return segments.length > 1 && segments[0].startsWith('@')
    ? segments.slice(0, 2).join('/')
    : segments[0];
}

export function findUndeclaredTypeReferences(typeDeclarationText, peerDependencies) {
  const declared = new Set(Object.keys(peerDependencies ?? {}));
  const missing = new Set();
  for (const match of typeDeclarationText.matchAll(typeReferencePattern)) {
    const specifier = match[1];
    const packageRoot = packageRootOfSpecifier(specifier);
    if (!declared.has(packageRoot)) {
      missing.add(packageRoot);
    }
  }
  return [...missing].sort();
}

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

export async function verifyTarball({ tarballPath }) {
  const { stdout: tarListRaw } = await execFileAsync('tar', ['-tf', tarballPath], {
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

  const { stdout: manifestRaw } = await execFileAsync('tar', [
    '-xOf',
    tarballPath,
    'package/package.json',
  ], { maxBuffer: 10 * 1024 * 1024 });
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

  const styleExport = manifest.exports?.['./style.css'];
  const stylePath = typeof styleExport === 'string' ? styleExport : styleExport?.default;
  if (stylePath !== './dist/style.css') {
    throw new Error('Packed manifest does not export ./style.css');
  }

  const { stdout: typeDeclarations } = await execFileAsync(
    'tar',
    ['-xOf', tarballPath, 'package/dist/index.d.ts'],
    { maxBuffer: 10 * 1024 * 1024 },
  );
  const undeclaredTypeReferences = findUndeclaredTypeReferences(typeDeclarations, peerDependencies);
  if (undeclaredTypeReferences.length > 0) {
    throw new Error(
      `dist/index.d.ts references undeclared @nop-chaos packages: ${undeclaredTypeReferences.join(', ')} ` +
        '(the facade type face must be self-contained; inline the types or declare the peer)',
    );
  }

  const { stdout: styles } = await execFileAsync('tar', [
    '-xOf',
    tarballPath,
    'package/dist/style.css',
  ], { maxBuffer: 10 * 1024 * 1024 });
  if (styles.includes('\nhtml {') || styles.includes('\nbody {') || styles.includes('\n:root {')) {
    throw new Error('Facade stylesheet contains unscoped global selectors');
  }
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

  await verifyTarball({ tarballPath });

  console.log(`[check-flux-bundle-pack] Verified tarball ${path.basename(tarballPath)}`);
}

const isDirectRun =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  main().catch((error) => {
    console.error('[check-flux-bundle-pack] Error:', error.message);
    process.exit(1);
  });
}
