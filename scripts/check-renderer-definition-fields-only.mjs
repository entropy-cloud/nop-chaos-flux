import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();

function collectSourceFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'dist' || entry.name === 'node_modules') {
      continue;
    }

    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }

    if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }

  return files;
}

const files = collectSourceFiles(resolve(repoRoot, 'packages'));

const failures = [];

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  if (source.includes('RendererDefinition.regions') || source.includes('renderer.regions')) {
    failures.push(`${relative(repoRoot, file)}: legacy RendererDefinition.regions reference`);
  }

  const regionLiteralPattern = /\bregions\s*:\s*\[/g;
  if (regionLiteralPattern.test(source)) {
    failures.push(`${relative(repoRoot, file)}: legacy regions: [...] definition`);
  }
}

if (failures.length > 0) {
  console.error('Renderer definition fields-only guard failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Renderer definition fields-only guard passed.');
