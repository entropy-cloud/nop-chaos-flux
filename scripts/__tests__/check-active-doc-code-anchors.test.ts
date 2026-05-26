import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..', '..');
const scriptPath = resolve(rootDir, 'scripts', 'check-active-doc-code-anchors.mjs');
const fixtureRoot = resolve(here, 'fixtures', 'active-doc-anchor-check');

describe('check-active-doc-code-anchors', () => {
  it('fails for missing anchors in active docs but ignores analysis and logs', async () => {
    await expect(
      execFileAsync(process.execPath, [scriptPath], {
        cwd: fixtureRoot,
        env: { ...process.env, NOP_ACTIVE_DOC_ROOT: fixtureRoot },
      }),
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('docs/architecture/bad.md:3 -> packages/example/src/missing.ts'),
    });
  });
});
