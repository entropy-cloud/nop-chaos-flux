import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..', '..');
const scriptPath = resolve(rootDir, 'scripts', 'check-page-designer-import-boundary.mjs');

const stagedFiles = [];

// `temp` is in `ignoreDirectoryNames` (scripts/audit/shared.mjs) so the other
// audit-gate tests running in parallel forks never collect this fixture; it is
// NOT gitignored, so `git ls-files --others --exclude-standard` still lists it.
async function stageFixture(packageDir, fileName, content) {
  const filePath = join(rootDir, 'packages', packageDir, 'src', 'temp', fileName);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
  stagedFiles.push(filePath);
}

function runGate() {
  return execFileAsync(process.execPath, [scriptPath], { cwd: rootDir, env: process.env });
}

afterEach(async () => {
  for (const filePath of stagedFiles) {
    await rm(filePath, { force: true });
  }
  stagedFiles.length = 0;
});

describe('check-page-designer-import-boundary', () => {
  it('flags a six-domain workspace import (design-architecture §10.2) with file and specifier', async () => {
    await stageFixture(
      'page-designer-core',
      '__boundary_fixture__.ts',
      "import { editor } from '@nop-chaos/flux-renderers-industrial/editor';\nexport const value = editor;\n",
    );
    await expect(runGate()).rejects.toMatchObject({
      stderr: expect.stringContaining('__boundary_fixture__.ts'),
      stderr: expect.stringContaining('@nop-chaos/flux-renderers-industrial'),
    });
  });

  it('flags static/dynamic/require import forms alike', async () => {
    await stageFixture(
      'page-designer-renderers',
      '__boundary_fixture_forms__.ts',
      [
        "import { flow } from '@nop-chaos/flow-designer-core';",
        "export async function load() { return import('@nop-chaos/word-editor-renderers'); }",
        "const r = require('@nop-chaos/report-designer-core');",
        "import '@nop-chaos/flux-print-core';",
        'export const values = [flow, load, r];',
      ].join('\n'),
    );
    await expect(runGate()).rejects.toMatchObject({
      stderr: expect.stringContaining('flow-designer-core'),
      stderr: expect.stringContaining('word-editor-renderers'),
      stderr: expect.stringContaining('report-designer-core'),
    });
  });

  it('passes the clean tree — six-domain string literals in classify.ts (sourcePackage fallback data) are NOT imports and must stay clean', async () => {
    // 防误报钉子：page-designer-core/src/classify.ts:20-25 持有六域包名字符串字面量
    // （sourcePackage 兜底数据，受 classify.test.ts 钉住的受保护行为）；本 gate 只扫
    // import 面，字面量不是越界。若本用例红，先查脚本是否误扫了非 import 面，
    // 不要改 classify.ts。
    await expect(runGate()).resolves.toMatchObject({
      stdout: expect.stringContaining('import boundary clean'),
    });
  });
});
