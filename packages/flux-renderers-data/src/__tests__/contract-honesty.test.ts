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
import { dataRendererDefinitions } from '../index.js';

// `src/` is one level above this test file's `src/__tests__/` directory.
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
  dataRendererDefinitions.map((d) => d.type),
  factories,
);

describe('flux-renderers-data contract honesty guard', () => {
  it('every declared event / capability contract is referenced by the renderer implementation (per-renderer isolation)', () => {
    const violations = findUnreferencedContracts(dataRendererDefinitions, resolver);

    expect(violations).toEqual([]);
  });

  it('per-renderer isolation: a probe is flagged even when a sibling wires its contract (H7)', () => {
    const real = dataRendererDefinitions.find(
      (d) =>
        (d.eventContracts && Object.keys(d.eventContracts).length > 0) ||
        (d.componentCapabilityContracts && d.componentCapabilityContracts.length > 0),
    );
    const eventKey = real?.eventContracts && Object.keys(real.eventContracts)[0];
    const handle = real?.componentCapabilityContracts?.[0]?.handle;
    const probe: RendererDefinition = {
      type: '__contract_probe__',
      component: () => null,
      ...(eventKey ? { eventContracts: { [eventKey]: { displayName: 'X' } } } : {}),
      ...(handle ? { componentCapabilityContracts: [{ handle, displayName: 'X' }] } : {}),
    };

    const violations = findUnreferencedContracts([...dataRendererDefinitions, probe], resolver);
    const probeViolation = violations.find((v) => v.rendererType === '__contract_probe__');

    expect(probeViolation).toBeTruthy();
    if (eventKey) expect(probeViolation!.unreferencedEventKeys).toContain(eventKey);
    if (handle) expect(probeViolation!.unreferencedCapabilityHandles).toContain(handle);
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
