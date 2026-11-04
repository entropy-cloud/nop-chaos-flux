import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, '..', 'check-i18n-keys.mjs');

describe('check-i18n-keys scan roots', () => {
  it('fails instead of silently shrinking the usage scan when a configured scan directory is missing', () => {
    const result = spawnSync('node', [scriptPath], {
      encoding: 'utf-8',
      env: { ...process.env, CHECK_I18N_SCAN_DIRS: 'packages,apps,renamed-away' },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('renamed-away');
  });
});
