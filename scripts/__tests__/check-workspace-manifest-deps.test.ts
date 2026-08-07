import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..', '..');
const scriptPath = resolve(rootDir, 'scripts', 'check-workspace-manifest-deps.mjs');

const stagedFiles = [];

// `temp` is in `ignoreDirectoryNames` (scripts/audit/shared.mjs) so the other
// audit-gate tests (find-renderer-browser-io / find-event-dispatch-without-ctx)
// running in parallel forks never collect or read this fixture; it is NOT
// gitignored, so `git ls-files --others --exclude-standard` still lists it.
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

describe('check-workspace-manifest-deps', () => {
  it('flags cross-package relative imports from untracked source files', async () => {
    await stageFixture(
      'flux-renderers-basic',
      '__manifest_scan_fixture__.ts',
      "import { cn } from '../../../ui/src/index.js';\nexport const value = cn;\n",
    );
    await expect(runGate()).rejects.toMatchObject({
      stderr: expect.stringContaining('__manifest_scan_fixture__.ts'),
      stderr: expect.stringContaining('../../../ui/src/index.js'),
    });
  });

  it('leaves tracked-file behavior unchanged (zero false positives on the real repo)', async () => {
    const { stdout } = await runGate();
    expect(stdout).toContain(
      'All package source workspace imports are declared in local manifests',
    );
  });
});
