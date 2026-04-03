import { mkdir, readdir, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');
const pnpmDir = join(rootDir, 'node_modules', '.pnpm');

const esmUtils = {
  'mergeClasses.js': `export function mergeClasses(...classes) {
  return classes
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value) => typeof value === 'string' && value.length > 0)
    .join(' ');
}
`,
  'toKebabCase.js': `export function toKebabCase(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}
`,
  'toPascalCase.js': `export function toPascalCase(value) {
  return String(value)
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}
`,
  'hasA11yProp.js': `export function hasA11yProp(props) {
  if (!props || typeof props !== 'object') {
    return false;
  }

  return Object.keys(props).some((key) => key === 'role' || key === 'title' || key.startsWith('aria-'));
}
`
};

async function ensurePatched(esmDir) {
  const utilsDir = join(esmDir, 'shared', 'src', 'utils');
  await mkdir(utilsDir, { recursive: true });

  for (const [fileName, content] of Object.entries(esmUtils)) {
    await writeFile(join(utilsDir, fileName), content, 'utf8');
  }
}

async function main() {
  let patched = 0;
  let entries = [];

  try {
    entries = await readdir(pnpmDir, { withFileTypes: true });
  } catch {
    console.log('[patch-lucide-react] .pnpm store not found, skipping');
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('lucide-react@')) {
      continue;
    }

    const esmDir = join(pnpmDir, entry.name, 'node_modules', 'lucide-react', 'dist', 'esm');

    try {
      const result = await stat(esmDir);
      if (!result.isDirectory()) {
        continue;
      }
    } catch {
      continue;
    }

    await ensurePatched(esmDir);
    patched += 1;
  }

  console.log(`[patch-lucide-react] patched ${patched} lucide-react installation(s)`);
}

main().catch((error) => {
  console.error('[patch-lucide-react] failed', error);
  process.exit(1);
});