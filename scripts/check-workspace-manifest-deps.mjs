import { readFile } from 'fs/promises';
import { existsSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');
const workspaceImportPattern =
  /from\s+['"](@nop-chaos\/[^'"]+)['"]|import\s*\(['"](@nop-chaos\/[^'"]+)['"]\)|import\s+['"](@nop-chaos\/[^'"]+)['"]/g;
const relativeImportPattern =
  /from\s+['"](\.{1,2}\/[^'"]+)['"]|import\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]|import\s+['"](\.{1,2}\/[^'"]+)['"]/g;
const extensionProbes = ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.css'];

function normalizeWorkspaceSpecifier(specifier) {
  const parts = specifier.split('/');
  return parts.length >= 2 ? parts.slice(0, 2).join('/') : specifier;
}

async function getTrackedFiles() {
  // git pathspec `packages/*/src/**/*.ts` does NOT match root-level src files
  // (`src/**/` requires at least one directory level), so list all tracked
  // files and filter in JS instead of relying on glob pathspecs.
  // Untracked source files (`git ls-files --others --exclude-standard`) are
  // merged in too: package split/migration mid-states often introduce
  // cross-package relative imports before anything is committed, and they must
  // fail locally rather than only at CI (where everything is already tracked).
  const [tracked, untracked] = await Promise.all([
    execFileAsync('git', ['ls-files'], {
      cwd: rootDir,
      maxBuffer: 10 * 1024 * 1024,
    }),
    execFileAsync('git', ['ls-files', '--others', '--exclude-standard'], {
      cwd: rootDir,
      maxBuffer: 10 * 1024 * 1024,
    }),
  ]);

  const seen = new Set();
  const files = [];

  for (const line of [...tracked.stdout.split(/\r?\n/), ...untracked.stdout.split(/\r?\n/)]) {
    const filePath = line.trim();
    if (!filePath || seen.has(filePath)) {
      continue;
    }
    seen.add(filePath);

    if (!filePath.startsWith('packages/')) {
      continue;
    }

    if (!filePath.includes('/src/')) {
      continue;
    }

    if (!/\.(ts|tsx)$/.test(filePath)) {
      continue;
    }

    if (filePath.includes('/dist/')) {
      continue;
    }

    if (filePath.endsWith('.d.ts')) {
      continue;
    }

    files.push(filePath);
  }

  return files;
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
      const specifier = match[1] ?? match[2] ?? match[3];
    if (specifier) {
      imports.add(normalizeWorkspaceSpecifier(specifier));
    }
  }

  return imports;
}

function isFile(targetPath) {
  return existsSync(targetPath) && statSync(targetPath).isFile();
}

// Extension probing mirrors TS module resolution: the specifier may omit the
// extension, use the ESM-style `.js` suffix for a `.ts` source, or point at a
// directory with an index file.
function resolveRelativeImport(filePath, specifier) {
  const dir = path.dirname(filePath);
  const base = path.resolve(dir, specifier);
  const candidates = [
    base,
    ...extensionProbes.map((ext) => base + ext),
    ...(base.endsWith('.js')
      ? [base.slice(0, -3) + '.ts', base.slice(0, -3) + '.tsx']
      : []),
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    path.join(base, 'index.js'),
  ];
  for (const candidate of candidates) {
    if (isFile(candidate)) {
      return candidate;
    }
  }
  return null;
}

// Returns the package name owning a src tree path (`packages/<name>/src/...`),
// or null when the path is not under a package src tree.
function packageNameUnderSrcTree(filePath) {
  const relative = path.relative(rootDir, filePath);
  const parts = relative.split(path.sep);
  if (parts.length >= 3 && parts[0] === 'packages' && parts[2] === 'src') {
    return parts[1];
  }
  return null;
}

function collectCrossPackageRelativeImports(filePath, content, packagePath) {
  const problems = [];
  let match;

  while ((match = relativeImportPattern.exec(content))) {
    const specifier = match[1] ?? match[2] ?? match[3];
    if (!specifier) continue;

    const resolved = resolveRelativeImport(filePath, specifier);
    if (!resolved) continue;

    const targetPackage = packageNameUnderSrcTree(resolved);
    const owningName = packagePath.split('/')[1];
    if (targetPackage && targetPackage !== owningName) {
      problems.push({ filePath, packagePath, specifier, targetPackage });
    }
  }

  return problems;
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

    const crossPackageImports = collectCrossPackageRelativeImports(filePath, content, packagePath);
    for (const problem of crossPackageImports) {
      problems.push(problem);
    }
  }

  if (problems.length > 0) {
    console.error(
      '[check-workspace-manifest-deps] ERROR: undeclared workspace imports or cross-package relative imports found in package sources:',
    );
    for (const problem of problems) {
      if (problem.targetPackage) {
        console.error(
          `  - ${problem.filePath}: relative import "${problem.specifier}" resolves into ${problem.targetPackage}/src (cross-package relative src import; use a bare workspace specifier)`,
        );
      } else {
        console.error(
          `  - ${problem.filePath}: ${problem.specifier} missing from ${problem.packagePath}/package.json`,
        );
      }
    }
    process.exit(1);
  }

  console.log(
    '[check-workspace-manifest-deps] All package source workspace imports are declared in local manifests; no cross-package relative src imports',
  );
}

main().catch((error) => {
  console.error('[check-workspace-manifest-deps] Error:', error);
  process.exit(1);
});
