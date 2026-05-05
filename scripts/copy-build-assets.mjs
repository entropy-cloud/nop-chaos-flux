import { copyFile, mkdir } from 'fs/promises';
import path from 'path';

const args = process.argv.slice(2);

if (args.length === 0 || args.length % 2 !== 0) {
  console.error(
    '[copy-build-assets] Usage: node scripts/copy-build-assets.mjs <from> <to> [<from> <to> ...]',
  );
  process.exit(1);
}

async function copyAsset(fromRelativePath, toRelativePath) {
  const fromPath = path.resolve(process.cwd(), fromRelativePath);
  const toPath = path.resolve(process.cwd(), toRelativePath);
  await mkdir(path.dirname(toPath), { recursive: true });
  await copyFile(fromPath, toPath);
  console.log(`[copy-build-assets] ${fromRelativePath} -> ${toRelativePath}`);
}

async function main() {
  for (let index = 0; index < args.length; index += 2) {
    await copyAsset(args[index], args[index + 1]);
  }
}

main().catch((error) => {
  console.error('[copy-build-assets] Error:', error);
  process.exit(1);
});
