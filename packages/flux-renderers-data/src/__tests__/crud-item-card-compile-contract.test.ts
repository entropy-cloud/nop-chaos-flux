import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// C-03 / AUDIT-02: compile-once contract for CRUD list/cards item-card.
//
// Outcome: the keyed-remount workaround has been REMOVED. The carrier
// (`list`/`cards` renderer, delegated via `helpers.render`) now stays mounted
// across CRUD-owned state changes (pagination page, selection) and updates
// reactively as `carrierSchema.items` / scope bindings change. Because the
// carrier instance persists, its `item`/`card` template is compiled once (on
// first mount) and reused on subsequent updates — no per-state-change
// recompile and no remount. (The earlier "Deferred But Adjudicated" note
// claimed removing the key would break page-change re-slice under the React
// Compiler; that was disproven — `crud-list-mode.test.tsx` verifies page
// re-slice and selection reactivity with the carrier node identity preserved.)
//
// The carrier `list`/`cards` delegation itself is retained (load-bearing
// contract enforced by `crud-list-mode.test.tsx` via the `list`/`cards`
// renderer markers), so the compile-once win comes from carrier persistence,
// not from bypassing the carrier.

const crudRendererSource = readFileSync(
  join(import.meta.dirname, '..', 'crud-renderer.tsx'),
  'utf8',
);

describe('C-03 / AUDIT-02: CRUD list/cards carrier compile-once', () => {
  it('still delegates item/card to a carrier list/cards renderer via helpers.render (delegation contract retained)', () => {
    expect(crudRendererSource).toContain('helpers.render(carrierSchema');
  });

  it('does NOT retain a keyed-remount wrapper on the carrier subtree (compile-once via reactive carrier persistence)', () => {
    // The keyed wrapper (`key={`${listMode}:...`}`) was the per-state-change
    // remount workaround that forced carrier recompilation. It must be gone so
    // the carrier stays mounted and compiles its item/card template once.
    expect(crudRendererSource).not.toMatch(/key=\{`\$\{listMode\}:/);
  });
});
