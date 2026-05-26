import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..', '..');
const scriptPath = resolve(rootDir, 'scripts', 'check-package-css-exports.mjs');

describe('check-package-css-exports', () => {
  it('counts direct and conditional css export targets', async () => {
    const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath], {
      cwd: rootDir,
      env: process.env,
    });

    expect(stderr).toBe('');
    expect(stdout).toContain('Verified 11 CSS export subpaths across 11 resolved targets');
  });
});
