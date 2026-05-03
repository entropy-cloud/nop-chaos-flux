import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');
const workspaceImportPattern = /from\s+['"](@nop-chaos\/[^'"]+)['"]|import\s*\(['"](@nop-chaos\/[^'"]+)['"]\)/g;

function normalizeWorkspaceSpecifier(specifier) {
  const parts = specifier.split('/');
  return parts.length >= 2 ? parts.slice(0, 2).join('/') : specifier;
}

async function getTrackedFiles() {
  const { stdout } = await execFileAsync('git', ['ls-files', 'packages/*/src/**/*.ts', 'packages/*/src/**/*.tsx'], {
    cwd: rootDir,
    maxBuffer: 10 * 1024 * 1024,
  });

  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((filePath) => {
      if (!filePath.startsWith('packages/')) {
        return false;
      }

      if (!filePath.includes('/src/')) {
        return false;
      }

      if (filePath.includes('/dist/')) {
        return false;
      }

      if (filePath.endsWith('.d.ts')) {
        return false;
      }

      return true;
    });
}

function owningPackagePath(filePath) {
  const parts = filePath.split('/');
  return parts.length >= 2 ? parts.slice(0, 2).join('/') : null;
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(rootDir, relativePath), 'utf8'));
}

function collectDeclaredWorkspaceDeps(pkgJson) {
  return new Set([
    ...Object.keys(pkgJson.dependencies ?? {}),
    ...Object.keys(pkgJson.devDependencies ?? {}),
    ...Object.keys(pkgJson.peerDependencies ?? {}),
  ]);
}

function collectWorkspaceImports(content) {
  const imports = new Set();
  let match;

  while ((match = workspaceImportPattern.exec(content))) {
    const specifier = match[1] ?? match[2];
    if (specifier) {
      imports.add(normalizeWorkspaceSpecifier(specifier));
    }
  }

  return imports;
}

async function main() {
  const files = await getTrackedFiles();
  const packageCache = new Map();
  const problems = [];

  for (const filePath of files) {
    const packagePath = owningPackagePath(filePath);
    if (!packagePath) continue;

    let content;
    try {
      content = await readFile(path.join(rootDir, filePath), 'utf8');
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        continue;
      }
      throw error;
    }

    if (!packageCache.has(packagePath)) {
      packageCache.set(packagePath, await readJson(`${packagePath}/package.json`));
    }

    const pkgJson = packageCache.get(packagePath);
    const declared = collectDeclaredWorkspaceDeps(pkgJson);
    const workspaceImports = collectWorkspaceImports(content);

    for (const specifier of workspaceImports) {
      if (specifier === pkgJson.name) {
        continue;
      }

      if (!declared.has(specifier)) {
        problems.push({ filePath, packagePath, specifier });
      }
    }
  }

  if (problems.length > 0) {
    console.error('[check-workspace-manifest-deps] ERROR: undeclared workspace imports found in package sources:');
    for (const problem of problems) {
      console.error(`  - ${problem.filePath}: ${problem.specifier} missing from ${problem.packagePath}/package.json`);
    }
    process.exit(1);
  }

  console.log('[check-workspace-manifest-deps] All package source workspace imports are declared in local manifests');
}

main().catch((error) => {
  console.error('[check-workspace-manifest-deps] Error:', error);
  process.exit(1);
});
