import { copyFile, mkdir, readdir } from 'fs/promises';
import path from 'path';

const fromDir = path.resolve(process.cwd(), 'generated');
const toDir = path.resolve(process.cwd(), 'dist/generated');
await mkdir(toDir, { recursive: true });
for (const file of await readdir(fromDir)) {
  if (file.endsWith('.js') || file.endsWith('.d.ts')) {
    await copyFile(path.join(fromDir, file), path.join(toDir, file));
    console.log(`[copy-generated] generated/${file} -> dist/generated/${file}`);
  }
}
