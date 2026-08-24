import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, describe, expect, it } from 'vitest';
import {
  findUndeclaredTypeReferences,
  verifyTarball,
} from '../check-flux-bundle-pack.mjs';

const execFileAsync = promisify(execFile);

const fixtureManifest = {
  name: '@nop-chaos/flux-fixture',
  version: '0.0.0-fixture',
  exports: {
    '.': { types: './dist/index.d.ts', default: './dist/index.js' },
    './style.css': { default: './dist/style.css' },
  },
  peerDependencies: {
    '@nop-chaos/ui': '*',
    'lucide-react': '*',
    react: '^19.0.0',
    'react-dom': '^19.0.0',
    zustand: '^5.0.0',
  },
};

const stagedDirs: string[] = [];

async function stageTarballFixture(dtsContent: string): Promise<string> {
  const workDir = await mkdtemp(join(tmpdir(), 'flux-bundle-pack-fixture-'));
  stagedDirs.push(workDir);

  const packageDir = join(workDir, 'package');
  await mkdir(join(packageDir, 'dist'), { recursive: true });
  await writeFile(
    join(packageDir, 'package.json'),
    `${JSON.stringify(fixtureManifest, null, 2)}\n`,
    'utf8',
  );
  await writeFile(join(packageDir, 'dist', 'index.js'), 'export {};\n', 'utf8');
  await writeFile(join(packageDir, 'dist', 'index.d.ts'), dtsContent, 'utf8');
  await writeFile(join(packageDir, 'dist', 'style.css'), '.x{}\n', 'utf8');

  const tarballPath = join(workDir, 'nop-chaos-flux-fixture.tgz');
  await execFileAsync('tar', ['-czf', tarballPath, '-C', workDir, 'package']);
  return tarballPath;
}

afterAll(async () => {
  for (const dir of stagedDirs) {
    await rm(dir, { recursive: true, force: true });
  }
  stagedDirs.length = 0;
});

describe('findUndeclaredTypeReferences', () => {
  it('flags undeclared @nop-chaos imports including import type and subpaths', () => {
    const missing = findUndeclaredTypeReferences(
      [
        'import type { ComponentType } from "react";',
        'import type { RendererEnv } from "@nop-chaos/flux-core";',
        'import type { X } from "@nop-chaos/flux-renderers-form/definitions";',
        'export type E = import("@nop-chaos/flux-core").RendererEnv;',
      ].join('\n'),
      fixtureManifest.peerDependencies,
    );

    expect(missing).toContain('@nop-chaos/flux-core');
    expect(missing).toContain('@nop-chaos/flux-renderers-form');
    expect(missing).not.toContain('@nop-chaos/ui');
  });

  it('passes self-contained declarations and declared peers', () => {
    const missing = findUndeclaredTypeReferences(
      [
        'import type { ComponentType } from "react";',
        'export type B = import("@nop-chaos/ui").ButtonProps;',
        'export declare const F: string;',
      ].join('\n'),
      fixtureManifest.peerDependencies,
    );

    expect(missing).toEqual([]);
  });
});

describe('check-flux-bundle-pack tarball verification', () => {
  it('fails the gate when dist/index.d.ts references undeclared @nop-chaos packages', async () => {
    const tarballPath = await stageTarballFixture(
      'import type { RendererEnv } from "@nop-chaos/flux-core";\n' +
        'export declare function createDefaultFluxEnv(): RendererEnv;\n',
    );

    await expect(verifyTarball({ tarballPath })).rejects.toThrow(
      /dist\/index\.d\.ts references undeclared @nop-chaos packages: @nop-chaos\/flux-core/,
    );
  });

  it('passes the gate for a self-contained type declaration face', async () => {
    const tarballPath = await stageTarballFixture(
      'import type { ComponentType } from "react";\n' +
        'export interface FluxSchemaRendererProps { schema: unknown }\n' +
        'export declare function createFluxSchemaRenderer(): ComponentType<FluxSchemaRendererProps>;\n',
    );

    await expect(verifyTarball({ tarballPath })).resolves.not.toThrow();
  });
});


