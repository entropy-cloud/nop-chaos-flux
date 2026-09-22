// plan 491 Phase 2: reconcile-coverage judgment tests (Proof-first item).
// The gate's structural semantics are pinned here with staged fixtures before
// the real ledger existed: uncovered (inventory without ledger row) and
// orphan (ledger row without inventory entry) both fail; status progress is
// informational; fully-verified ledgers report uncovered=0.

import { describe, expect, it } from 'vitest';
import { reconcile } from '../visual-quality/reconcile-coverage.mjs';
import { parseLedger } from '../visual-quality/ledger-lib.mjs';

const inventoryFixture = {
  pages: [
    { id: 'home', hash: '#/', batch: 'R2-1d' },
    { id: 'flow-designer', hash: '#/flow-designer', batch: 'R2-1b' },
  ],
  controls: [
    { type: 'button', sourcePackage: '@nop-chaos/flux-renderers-basic', batch: 'R2-2a' },
    { type: 'kanban', sourcePackage: '@nop-chaos/flux-renderers-scheduling', batch: 'R2-2c' },
  ],
};

function ledgerFixture(pageRows, controlRows) {
  return parseLedger(
    [
      '# ledger',
      '<!-- ledger:pages -->',
      '| id | kind | batch | status | card | note |',
      '| --- | --- | --- | --- | --- | --- |',
      ...pageRows,
      '<!-- ledger:controls -->',
      '| id | kind | batch | status | card | note |',
      '| --- | --- | --- | --- | --- | --- |',
      ...controlRows,
    ].join('\n'),
  );
}

describe('reconcile-coverage (plan 491 Phase 2)', () => {
  it('closes cleanly when every inventory entry has a ledger row (uncovered=0, orphan=0)', () => {
    const ledger = ledgerFixture(
      ['| home | page | R2-1d | pending |  |  |', '| flow-designer | page | R2-1b | carded | card |  |'],
      ['| button | control | R2-2a | verified | card |  |', '| kanban | control | R2-2c | digested | card |  |'],
    );
    const report = reconcile(inventoryFixture, ledger);
    expect(report.totals).toEqual({ uncovered: 0, orphan: 0 });
    expect(report.pages.byStatus).toMatchObject({ pending: 1, carded: 1 });
    expect(report.controls.byStatus).toMatchObject({ verified: 1, digested: 1 });
  });

  it('flags inventory entries missing from the ledger as uncovered', () => {
    const ledger = ledgerFixture(
      ['| home | page | R2-1d | pending |  |  |'],
      ['| button | control | R2-2a | pending |  |  |'],
    );
    const report = reconcile(inventoryFixture, ledger);
    expect(report.uncovered).toEqual(['page:flow-designer', 'control:kanban']);
    expect(report.totals.uncovered).toBe(2);
  });

  it('flags ledger rows whose inventory entry vanished as orphan', () => {
    const ledger = ledgerFixture(
      [
        '| home | page | R2-1d | pending |  |  |',
        '| flow-designer | page | R2-1b | carded | card |  |',
        '| deleted-page | page | R2-1d | carded | card |  |',
      ],
      ['| button | control | R2-2a | pending |  |  |', '| kanban | control | R2-2c | pending |  |  |', '| removed-widget | control | R2-2b | pending |  |  |'],
    );
    const report = reconcile(inventoryFixture, ledger);
    expect(report.orphan).toEqual(['page:deleted-page', 'control:removed-widget']);
    expect(report.totals.orphan).toBe(2);
  });

  it('treats status progress as informational — all-pending still reconciles structurally', () => {
    const ledger = ledgerFixture(
      ['| home | page | R2-1d | pending |  |  |', '| flow-designer | page | R2-1b | pending |  |  |'],
      ['| button | control | R2-2a | pending |  |  |', '| kanban | control | R2-2c | pending |  |  |'],
    );
    const report = reconcile(inventoryFixture, ledger);
    expect(report.totals).toEqual({ uncovered: 0, orphan: 0 });
    expect(report.pages.byStatus.pending).toBe(2);
  });

  it('is row-order insensitive (matches by id, per the ledger format contract)', () => {
    const ledger = ledgerFixture(
      ['| flow-designer | page | R2-1b | pending |  |  |', '| home | page | R2-1d | pending |  |  |'],
      ['| kanban | control | R2-2c | pending |  |  |', '| button | control | R2-2a | pending |  |  |'],
    );
    const report = reconcile(inventoryFixture, ledger);
    expect(report.totals).toEqual({ uncovered: 0, orphan: 0 });
  });
});
