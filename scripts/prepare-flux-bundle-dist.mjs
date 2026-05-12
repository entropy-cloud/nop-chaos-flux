import { copyFile, mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');
const packageDir = path.join(rootDir, 'packages', 'flux-bundle');
const distDir = path.join(packageDir, 'dist');
const sourceTypesPath = path.join(packageDir, 'types', 'public-types.d.ts');
const distTypesPath = path.join(distDir, 'index.d.ts');

async function main() {
  await mkdir(distDir, { recursive: true });
  await copyFile(sourceTypesPath, distTypesPath);

  const packageJsonPath = path.join(packageDir, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  const rootExport = packageJson.exports?.['.'];

  if (!rootExport || rootExport.types !== './dist/index.d.ts') {
    throw new Error('Facade root export must point types to ./dist/index.d.ts');
  }

  if (packageJson.exports?.['./style.css'] !== './dist/style.css') {
    throw new Error('Facade stylesheet export must point to ./dist/style.css');
  }

  const indexJsPath = path.join(distDir, 'index.js');
  await writeFile(indexJsPath, await readFile(indexJsPath, 'utf8'), 'utf8');
}

main().catch((error) => {
  console.error('[prepare-flux-bundle-dist] Error:', error);
  process.exit(1);
});
