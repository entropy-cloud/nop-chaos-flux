import { execSync } from 'child_process';
import { readFile, rename, readdir, writeFile } from 'fs/promises';
import { basename, dirname, extname, join, posix, sep } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');

const DRY_RUN = process.argv.includes('--dry-run');
const SCOPE = process.argv.find((a, i) => process.argv[i - 1] === '--scope') || 'packages';

function toKebabCase(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function toPosix(p) {
  return p.split(sep).join(posix.sep);
}

const SKIP_PATTERNS = [
  /^[a-z]{2}-[A-Z]{2}$/, // BCP 47 locale tags: en-US, zh-CN
];

function needsRename(filePath) {
  const name = basename(filePath);
  const ext = extname(name);
  if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(ext)) return false;
  const base = basename(name, ext);
  if (base === 'index' || base.startsWith('.')) return false;
  if (SKIP_PATTERNS.some((re) => re.test(base))) return false;
  return base !== toKebabCase(base);
}

async function collectFiles(dir) {
  const results = [];
  const skipDirs = new Set(['node_modules', 'dist', '.git', 'coverage', '.next']);

  async function walk(d) {
    let entries;
    try {
      entries = await readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (skipDirs.has(entry.name)) continue;
      const full = join(d, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && needsRename(full)) {
        results.push(full);
      }
    }
  }

  await walk(dir);
  return results;
}

function grepWorkingTree(searchRoot, pattern) {
  try {
    const out = execSync(
      `rg -l -F --glob "*.{ts,tsx,js,jsx,mjs,cjs}" "${pattern}" "${searchRoot}"`,
      {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
        cwd: rootDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      },
    );
    return out
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((p) => {
        // rg returns paths relative to cwd, normalize to absolute
        return p.includes(':') ? p : join(rootDir, p);
      });
  } catch {
    return [];
  }
}

async function updateFileImports(absPath, renameEntries) {
  let content;
  try {
    content = await readFile(absPath, 'utf-8');
  } catch {
    return false;
  }

  let modified = false;

  for (const { oldBase, newBase, oldName, newName } of renameEntries) {
    const variants = [
      { old: oldBase, new: newBase },
      { old: oldName, new: newName },
    ];

    for (const { old, new: newV } of variants) {
      const escaped = old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(
        `((?:from|import\\s+[^;\\n]*?from|import)\\s*['"\`][^'"\`]*?)${escaped}((?:[^'"\`]*?['"\`]))`,
        'g',
      );
      const updated = content.replace(re, `$1${newV}$2`);
      if (updated !== content) {
        content = updated;
        modified = true;
      }
    }
  }

  if (modified && !DRY_RUN) {
    await writeFile(absPath, content, 'utf-8');
  }
  return modified;
}

async function main() {
  const scopeDir = join(rootDir, SCOPE);
  console.log(`Scanning ${scopeDir} for non-kebab-case files...`);
  if (DRY_RUN) console.log('(dry-run mode)\n');

  const files = await collectFiles(scopeDir);
  if (files.length === 0) {
    console.log('All files are already kebab-case. Nothing to do.');
    return;
  }

  console.log(`Found ${files.length} files to rename:\n`);

  const renameEntries = [];
  for (const filePath of files) {
    const dir = dirname(filePath);
    const name = basename(filePath);
    const ext = extname(name);
    const base = basename(name, ext);
    const newBase = toKebabCase(base);
    const newName = newBase + ext;
    const newPath = join(dir, newName);

    console.log(`  ${toPosix(filePath.slice(rootDir.length + 1))} -> ${newName}`);
    renameEntries.push({ filePath, newPath, oldName: name, newName, oldBase: base, newBase });
  }

  // Find files referencing each old name via git grep
  const candidateFiles = new Set();
  for (const entry of renameEntries) {
    const refs = grepWorkingTree(SCOPE, entry.oldBase);
    for (const ref of refs) {
      const abs = join(rootDir, ref);
      if (abs !== entry.filePath) {
        candidateFiles.add(abs);
      }
    }
  }

  console.log(`\nScanning imports in ${candidateFiles.size} candidate files...`);
  let updatedCount = 0;

  for (const absFile of candidateFiles) {
    const changed = await updateFileImports(absFile, renameEntries);
    if (changed) {
      console.log(`  Updated: ${toPosix(absFile.slice(rootDir.length + 1))}`);
      updatedCount++;
    }
  }

  console.log(`\nRenaming ${renameEntries.length} files...`);
  for (const { filePath, newPath, newName } of renameEntries) {
    if (!DRY_RUN) {
      await rename(filePath, newPath);
    }
    console.log(`  -> ${newName}`);
  }

  console.log(
    `\nDone. ${renameEntries.length} files renamed, ${updatedCount} files had imports updated.`,
  );
  if (DRY_RUN) {
    console.log('(dry-run: no files were actually modified)');
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
