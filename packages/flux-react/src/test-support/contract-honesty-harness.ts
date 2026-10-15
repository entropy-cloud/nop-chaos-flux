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

export interface ContractHonestyDiscoveryBaseline {
  renderers: number;
  eventKeys: number;
  capabilityHandles: number;
}

export interface ContractHonestyHarnessOptions {
  packageName: string;
  definitions: RendererDefinition[];
  /**
   * Walk root for the package's own renderer sources. Callers resolve it
   * exactly as their pre-consolidation test file did (`join(import.meta.dirname, '..')`
   * from `src/` walks the package root; from `src/__tests__/` it walks `src/`).
   */
  srcDir: string;
  /**
   * Test 3 asserts the capability-handle half of the injected-probe guard.
   * form's pre-consolidation file asserts only the event half — pass `false`
   * to reproduce that shape verbatim (plan 594 Phase 1 measurement note).
   */
  capabilityProbe?: boolean;
  /**
   * H7 probe style. `dynamic` (default) picks the first real definition's
   * declared contracts; `sibling-wired` reproduces form-advanced's hardcoded
   * `addItem` probe (flagged even though composite-editor siblings wire it).
   */
  h7Mode?: 'dynamic' | 'sibling-wired';
  /**
   * Declared-contract discovery counts pinned from the pre-consolidation
   * baseline (plan 594 Phase 1). Keeps the thin wrappers honest about the
   * surface they scan.
   */
  discoveryBaseline?: ContractHonestyDiscoveryBaseline;
}

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

export function computeContractHonestyDiscoveryCounts(
  definitions: RendererDefinition[],
): ContractHonestyDiscoveryBaseline {
  return {
    renderers: definitions.length,
    // RM-5 (plan 607): fields kind:'event' entries are the single event
    // declaration surface (the former `eventContracts` record is gone).
    eventKeys: definitions.reduce(
      (n, d) => n + (d.fields?.filter((f) => f.kind === 'event' && f.key).length ?? 0),
      0,
    ),
    capabilityHandles: definitions.reduce(
      (n, d) => n + (d.componentCapabilityContracts?.length ?? 0),
      0,
    ),
  };
}

export function runContractHonestyGuardSuite(options: ContractHonestyHarnessOptions): void {
  const capabilityProbe = options.capabilityProbe ?? true;
  const h7Mode = options.h7Mode ?? 'dynamic';
  const files = readSourceFiles(options.srcDir);
  const factories = readRuntimeHandleFactories();
  const resolver = buildPerRendererSourceResolver(
    files,
    options.definitions.map((d) => d.type),
    factories,
  );

  describe(`${options.packageName} contract honesty guard`, () => {
    it('every declared event / capability contract is referenced by the renderer implementation (per-renderer isolation)', () => {
      if (options.discoveryBaseline) {
        expect(computeContractHonestyDiscoveryCounts(options.definitions)).toEqual(
          options.discoveryBaseline,
        );
      }

      const violations = findUnreferencedContracts(options.definitions, resolver);

      expect(violations).toEqual([]);
    });

    if (h7Mode === 'sibling-wired') {
      it('per-renderer isolation: a probe declaring a sibling-wired contract is still flagged (H7)', () => {
        // 'addItem' is wired by the composite-editor siblings (and their shared
        // capability constant). A probe with no own implementation source must be
        // flagged — under the old whole-package blob it was masked by the siblings.
        const probe: RendererDefinition = {
          type: '__contract_probe__',
          component: () => null,
          componentCapabilityContracts: [{ handle: 'addItem', displayName: 'Add' }],
        };

        const violations = findUnreferencedContracts([...options.definitions, probe], resolver);

        expect(violations).toContainEqual({
          rendererType: '__contract_probe__',
          unreferencedEventKeys: [],
          unreferencedCapabilityHandles: ['addItem'],
        });
      });
    } else {
      it('per-renderer isolation: a probe is flagged even when a sibling wires its contract (H7)', () => {
        // RM-5 (plan 607): probes synthesize `fields` kind:'event' entries —
        // the single event-declaration channel.
        const real = options.definitions.find(
          (d) =>
            d.fields?.some((f) => f.kind === 'event') ||
            (d.componentCapabilityContracts && d.componentCapabilityContracts.length > 0),
        );
        const eventKey = real?.fields?.find((f) => f.kind === 'event' && f.key)?.key;
        const handle = real?.componentCapabilityContracts?.[0]?.handle;
        const probe: RendererDefinition = {
          type: '__contract_probe__',
          component: () => null,
          ...(eventKey ? { fields: [{ key: eventKey, kind: 'event' as const }] } : {}),
          ...(handle ? { componentCapabilityContracts: [{ handle, displayName: 'X' }] } : {}),
        };

        const violations = findUnreferencedContracts([...options.definitions, probe], resolver);
        const probeViolation = violations.find((v) => v.rendererType === '__contract_probe__');

        expect(probeViolation).toBeTruthy();
        if (eventKey) expect(probeViolation!.unreferencedEventKeys).toContain(eventKey);
        if (handle) expect(probeViolation!.unreferencedCapabilityHandles).toContain(handle);
      });
    }

    it(
      capabilityProbe
        ? 'guard mechanism is effective: an injected unreferenced contract is flagged'
        : 'guard mechanism is effective: an injected unreferenced event contract is flagged',
      () => {
        const probe: RendererDefinition = {
          type: '__contract_probe__',
          component: () => null,
          fields: [{ key: 'onInjectedFakeEvent', kind: 'event' }],
          ...(capabilityProbe
            ? { componentCapabilityContracts: [{ handle: 'injectedFakeCapability', displayName: 'Fake' }] }
            : {}),
        };

        const violations = findUnreferencedContracts([probe], resolver);

        expect(violations).toEqual([
          {
            rendererType: '__contract_probe__',
            unreferencedEventKeys: ['onInjectedFakeEvent'],
            unreferencedCapabilityHandles: capabilityProbe ? ['injectedFakeCapability'] : [],
          },
        ]);
        expect(isRendererEventKeyReferenced('onInjectedFakeEvent', '')).toBe(false);
        if (capabilityProbe) {
          expect(isCapabilityHandleReferenced('injectedFakeCapability', '')).toBe(false);
        }
      },
    );
  });
}
