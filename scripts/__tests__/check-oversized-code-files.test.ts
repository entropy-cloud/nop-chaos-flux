import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, '..', 'check-oversized-code-files.mjs');

describe('check-oversized-code-files output honesty', () => {
  it('reports exempt-only over-limit files as INFO, never as a MUST-split error, and exits 0', () => {
    const result = spawnSync('node', [scriptPath], { encoding: 'utf-8' });
    const output = `${result.stdout}\n${result.stderr}`;
    expect(result.status).toBe(0);
    expect(output).toMatch(/INFO: \d+ files exceed \d+ lines — all exempt/);
    expect(output).not.toContain('MUST split');
  });
});
