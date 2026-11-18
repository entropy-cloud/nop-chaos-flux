import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * L4.7 graph node data-driven color surface (plan 513 Phase 3): levelMap
 * semantic levels consume fill tint via color-mix over the semantic tokens —
 * level-mapped nodes must visually differ from unmapped ones, unmapped nodes
 * keep the plain card surface (zero-regression line).
 *
 * Migrated from tests/e2e/graph-level-tint.spec.ts (E3 batch 3, engine swap +
 * the surface read (old locator.evaluate getComputedStyle) re-implemented as
 * ft.evaluate querySelector probes, and the per-level loop strengthened to
 * assert each level's tint actually differs from the plain card surface, not
 * merely that it resolves to a non-empty string).
 */

interface NodeSurface {
  background: string;
  border: string;
}

export default async function graphLevelTint(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);
  await ft.goto('/#/graph-demo');
  // gate arrival: wait until at least one level-mapped node is attached
  let ready = false;
  for (let i = 0; i < 50; i++) {
    const count = Number(
      await ft.evaluate(
        `(() => document.querySelectorAll('.nop-graph-node[data-level]').length)()`,
      ),
    );
    if (count > 0) {
      ready = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error('no .nop-graph-node[data-level] appeared within 5s');

  // TODO(migrate-debt): evaluate fallback (getComputedStyle surface reads via
  // querySelector — locator.evaluate not in the driver API)
  const surfaceOf = async (selector: string): Promise<NodeSurface | null> => {
    const raw = await ft.evaluate(
      `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; const s = getComputedStyle(el); return { background: s.backgroundColor, border: s.borderTopColor }; })()`,
    );
    return raw as NodeSurface | null;
  };

  const tinted = await surfaceOf('.nop-graph-node[data-level]');
  if (!tinted) throw new Error('tinted node surface read failed');
  // color-mix 12% over card resolves to a non-transparent tinted color.
  if (tinted.background.includes('rgba(0, 0, 0, 0)')) {
    throw new Error(`tinted node background should not be transparent, got "${tinted.background}"`);
  }

  const plainCount = Number(
    await ft.evaluate(`(() => document.querySelectorAll('.nop-graph-node:not([data-level])').length)()`),
  );
  if (plainCount > 0) {
    const plain = await surfaceOf('.nop-graph-node:not([data-level])');
    if (plain && plain.background === tinted.background) {
      throw new Error(
        `unmapped node should keep the plain card surface, but matches tinted background "${tinted.background}"`,
      );
    }
  }

  // All four semantic levels present in the demo schema get tinted fills, and
  // (strengthened) each differs from the unmapped card surface.
  let levelsChecked = 0;
  for (const level of ['danger', 'warning', 'success', 'info']) {
    const surface = await surfaceOf(`.nop-graph-node[data-level='${level}']`);
    if (!surface) continue; // level absent from demo schema
    levelsChecked++;
    if (surface.background === '') {
      throw new Error(`level "${level}" background resolved empty`);
    }
    if (plainCount > 0) {
      const plain = await surfaceOf('.nop-graph-node:not([data-level])');
      if (plain && surface.background === plain.background) {
        throw new Error(
          `level "${level}" background "${surface.background}" should differ from plain card surface`,
        );
      }
    }
  }
  if (levelsChecked < 1) {
    throw new Error('none of danger/warning/success/info level nodes found in demo');
  }

  await expectNoPageErrors(ft, 'graph-level-tint');

  return { cases: 1 };
}
