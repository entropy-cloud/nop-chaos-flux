import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readContractHonestySourceFiles } from '../test-support/contract-honesty-harness.js';

describe('contract-honesty source walk', () => {
  let root: string | undefined;

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
  });

  it('collects only package sources: skips node_modules, dist and symlinked directories', () => {
    root = mkdtempSync(join(tmpdir(), 'contract-honesty-walk-'));
    mkdirSync(join(root, 'renderers'), { recursive: true });
    writeFileSync(join(root, 'renderers', 'button.tsx'), 'export const Button = 1;');
    writeFileSync(join(root, 'renderers', 'button.test.tsx'), 'export {};');
    mkdirSync(join(root, 'node_modules', 'dep'), { recursive: true });
    writeFileSync(join(root, 'node_modules', 'dep', 'index.ts'), 'export const onFake = 1;');
    mkdirSync(join(root, 'dist'), { recursive: true });
    writeFileSync(join(root, 'dist', 'button.d.ts'), 'export declare const onFake: number;');
    symlinkSync(root, join(root, 'renderers', 'loop'), 'dir');

    const paths = readContractHonestySourceFiles(root).map((file) => file.path);

    expect(paths).toEqual(['renderers/button.tsx']);
  });
});
