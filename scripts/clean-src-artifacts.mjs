import { readdir, rm, stat } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');
const packagesDir = join(rootDir, 'packages');

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
  const packageEntries = await readdir(packagesDir, { withFileTypes: true });
  let removed = 0;

  for (const entry of packageEntries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const srcDir = join(packagesDir, entry.name, 'src');
    try {
      const srcStat = await stat(srcDir);
      if (srcStat.isDirectory()) {
        removed += await removeArtifacts(srcDir);
      }
    } catch {
      // ignore missing src directories
    }
  }

  console.log(`[clean-src-artifacts] removed ${removed} generated file(s)`);
}

main().catch((error) => {
  console.error('[clean-src-artifacts] failed', error);
  process.exit(1);
});
