import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');
const SOURCE_ROOTS = ['packages', 'apps'];

const ARTIFACT_EXTENSIONS = ['.d.ts', '.js', '.js.map'];

async function scanForArtifacts(dir, relativePath = '') {
  const artifacts = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const entryRelativePath = relativePath ? join(relativePath, entry.name) : entry.name;

    if (entry.isDirectory()) {
      const subArtifacts = await scanForArtifacts(fullPath, entryRelativePath);
      artifacts.push(...subArtifacts);
    } else if (entry.isFile()) {
      const ext = ARTIFACT_EXTENSIONS.find((e) => entry.name.endsWith(e));
      if (ext) {
        artifacts.push(entryRelativePath);
      }
    }
  }

  return artifacts;
}

async function main() {
  let allArtifacts = [];

  for (const rootName of SOURCE_ROOTS) {
    const workspaceDir = join(rootDir, rootName);
    const entries = await readdir(workspaceDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const srcDir = join(workspaceDir, entry.name, 'src');
      try {
        const statResult = await stat(srcDir);
        if (statResult.isDirectory()) {
          const artifacts = await scanForArtifacts(srcDir, `${rootName}/${entry.name}/src`);
          allArtifacts.push(...artifacts);
        }
      } catch {
        // src directory doesn't exist, skip
      }
    }
  }

  if (allArtifacts.length > 0) {
    console.error('❌ Found build artifacts in src/ directories:');
    allArtifacts.forEach((artifact) => console.error(`  - ${artifact}`));
    process.exit(1);
  } else {
    console.log('✓ No src artifacts found');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
