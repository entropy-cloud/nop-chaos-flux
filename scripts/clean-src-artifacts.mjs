import { readdir, rm, stat } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');
const SOURCE_ROOTS = ['packages', 'apps'];

const ARTIFACT_EXTENSIONS = ['.d.ts', '.js', '.js.map'];

async function removeArtifacts(dir) {
  let removed = 0;
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      removed += await removeArtifacts(fullPath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (ARTIFACT_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      await rm(fullPath, { force: true });
      removed += 1;
    }
  }

  return removed;
}

async function main() {
  let removed = 0;

  for (const rootName of SOURCE_ROOTS) {
    const workspaceDir = join(rootDir, rootName);
    const entries = await readdir(workspaceDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const srcDir = join(workspaceDir, entry.name, 'src');
      try {
        const srcStat = await stat(srcDir);
        if (srcStat.isDirectory()) {
          removed += await removeArtifacts(srcDir);
        }
      } catch {
        // ignore missing src directories
      }
    }
  }

  console.log(`[clean-src-artifacts] removed ${removed} generated file(s)`);
}

main().catch((error) => {
  console.error('[clean-src-artifacts] failed', error);
  process.exit(1);
});
