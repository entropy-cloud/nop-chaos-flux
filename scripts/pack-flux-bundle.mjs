import { cp, mkdir, readFile, rm, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');
const packageDir = path.join(rootDir, 'packages', 'flux-bundle');
const distDir = path.join(packageDir, 'dist');
const releaseDir = path.join(rootDir, 'tmp', 'flux-bundle-package');
const distPackagesDir = path.join(rootDir, 'dist-packages');

async function runPnpm(args, cwd) {
  if (process.platform === 'win32') {
    return execFileAsync('cmd.exe', ['/d', '/s', '/c', `pnpm ${args.join(' ')}`], {
      cwd,
      maxBuffer: 10 * 1024 * 1024,
    });
  }

  return execFileAsync('pnpm', args, {
    cwd,
    maxBuffer: 10 * 1024 * 1024,
  });
}

async function createReleaseDir() {
  const packageJsonPath = path.join(packageDir, 'package.json');
  const readmePath = path.join(packageDir, 'README.md');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));

  const releaseManifest = {
    name: packageJson.name,
    version: packageJson.version,
    type: packageJson.type,
    sideEffects: packageJson.sideEffects,
    files: packageJson.files,
    main: packageJson.main,
    module: packageJson.module,
    types: packageJson.types,
    exports: packageJson.exports,
    peerDependencies: packageJson.peerDependencies,
  };

  await rm(releaseDir, { recursive: true, force: true });
  await mkdir(releaseDir, { recursive: true });
  await cp(distDir, path.join(releaseDir, 'dist'), { recursive: true });
  await writeFile(
    path.join(releaseDir, 'package.json'),
    `${JSON.stringify(releaseManifest, null, 2)}\n`,
    'utf8',
  );
  await cp(readmePath, path.join(releaseDir, 'README.md'));
}

async function main() {
  await runPnpm(['--filter', '@nop-chaos/flux', 'build'], rootDir);

  await mkdir(distPackagesDir, { recursive: true });
  await createReleaseDir();

  const { stdout } = await runPnpm(['pack', '--pack-destination', distPackagesDir], releaseDir);

  process.stdout.write(stdout);
}

main().catch((error) => {
  console.error('[pack-flux-bundle] Error:', error);
  process.exit(1);
});
