import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildPerRendererSourceResolver,
  findUnreferencedContracts,
  isCapabilityHandleReferenced,
  isRendererEventKeyReferenced,
  type ContractHonestyHandleFactory,
  type ContractHonestySourceFile,
  type RendererDefinition,
} from '@nop-chaos/flux-core';
import { formAdvancedRendererDefinitions } from '../index.js';

const srcDir = join(import.meta.dirname, '..');

function findWorkspaceRoot(start: string): string {
  let dir = start;
  for (let depth = 0; depth < 10; depth += 1) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = join(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('Could not locate workspace root (pnpm-workspace.yaml).');
}

function readSourceFiles(root: string): ContractHonestySourceFile[] {
  const out: ContractHonestySourceFile[] = [];
  function walk(current: string): void {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(extname(full))) continue;
      if (/\.test\./.test(full)) continue;
      out.push({ path: relative(root, full).split(/[\\/]/).join('/'), content: readFileSync(full, 'utf8') });
    }
  }
  walk(root);
  return out;
}

/**
 * Runtime handle factories shared across renderer packages. A factory is mixed
 * into a renderer's capability source ONLY when that renderer references the
 * factory's hook (per-renderer selection, see buildPerRendererSourceResolver),
 * so a sibling's factory cannot mask a missing implementation.
 */
function readRuntimeHandleFactories(): ContractHonestyHandleFactory[] {
  const runtimeSrc = join(findWorkspaceRoot(import.meta.dirname), 'packages/flux-runtime/src');
  const read = (name: string) => {
    const p = join(runtimeSrc, name);
    return existsSync(p) ? readFileSync(p, 'utf8') : '';
  };
  return [
    { hookPattern: /useInputComponentHandle|createInputComponentHandle/, source: read('input-component-handle.ts') },
    { hookPattern: /createFormComponentHandle/, source: read('form-component-handle.ts') },
    { hookPattern: /useCompositeFieldHandle|createCompositeFieldHandle/, source: read('composite-field-handle.ts') },
    { hookPattern: /useSurfaceComponentHandle|createSurfaceComponentHandle/, source: read('surface-component-handle.ts') },
  ];
}

const files = readSourceFiles(srcDir);
const factories = readRuntimeHandleFactories();
const resolver = buildPerRendererSourceResolver(
  files,
  formAdvancedRendererDefinitions.map((d) => d.type),
  factories,
);

describe('flux-renderers-form-advanced contract honesty guard', () => {
  it('every declared event / capability contract is referenced by the renderer implementation (per-renderer isolation)', () => {
    const violations = findUnreferencedContracts(formAdvancedRendererDefinitions, resolver);

    expect(violations).toEqual([]);
  });

  it('per-renderer isolation: a probe declaring a sibling-wired contract is still flagged (H7)', () => {
    // 'addItem' is wired by the composite-editor siblings (and their shared
    // capability constant). A probe with no own implementation source must be
    // flagged — under the old whole-package blob it was masked by the siblings.
    const probe: RendererDefinition = {
      type: '__contract_probe__',
      component: () => null,
      componentCapabilityContracts: [{ handle: 'addItem', displayName: 'Add' }],
    };

    const violations = findUnreferencedContracts([...formAdvancedRendererDefinitions, probe], resolver);

    expect(violations).toContainEqual({
      rendererType: '__contract_probe__',
      unreferencedEventKeys: [],
      unreferencedCapabilityHandles: ['addItem'],
    });
  });

  it('guard mechanism is effective: an injected unreferenced contract is flagged', () => {
    const probe: RendererDefinition = {
      type: '__contract_probe__',
      component: () => null,
      eventContracts: {
        onInjectedFakeEvent: { displayName: 'Fake' },
      },
      componentCapabilityContracts: [{ handle: 'injectedFakeCapability', displayName: 'Fake' }],
    };

    const violations = findUnreferencedContracts([probe], resolver);

    expect(violations).toEqual([
      {
        rendererType: '__contract_probe__',
        unreferencedEventKeys: ['onInjectedFakeEvent'],
        unreferencedCapabilityHandles: ['injectedFakeCapability'],
      },
    ]);
    expect(isRendererEventKeyReferenced('onInjectedFakeEvent', '')).toBe(false);
    expect(isCapabilityHandleReferenced('injectedFakeCapability', '')).toBe(false);
  });
});
