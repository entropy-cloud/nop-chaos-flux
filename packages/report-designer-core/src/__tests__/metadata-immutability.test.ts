import { describe, expect, it } from 'vitest';
import type { ReportSelectionTarget } from '../index.js';
import { createTestContext } from './test-utils.js';

describe('report designer metadata immutability', () => {
  it('replaces the document reference when metadata updates through dispatch', async () => {
    const { core, sheetId } = createTestContext();
    const target: ReportSelectionTarget = {
      kind: 'cell',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
    };

    const before = core.getSnapshot().document;
    const beforeSemantic = before.semantic;

    await core.dispatch({
      type: 'report-designer:updateMeta',
      target,
      patch: { field: 'amount' },
    });

    const after = core.getSnapshot().document;
    expect(after).not.toBe(before);
    expect(after.semantic).not.toBe(beforeSemantic);
    expect(core.getMetadata(target)).toEqual({ field: 'amount' });
  });

  it('notifies subscribers and replaces the document reference for direct setMetadata', () => {
    const { core, sheetId } = createTestContext();
    const target: ReportSelectionTarget = {
      kind: 'cell',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
    };

    let notifications = 0;
    const before = core.getSnapshot().document;
    const unsubscribe = core.subscribe(() => {
      notifications += 1;
    });

    try {
      core.setMetadata(target, { field: 'direct' });
    } finally {
      unsubscribe();
    }

    const after = core.getSnapshot().document;
    expect(after).not.toBe(before);
    expect(notifications).toBeGreaterThan(0);
    expect(core.getMetadata(target)).toEqual({ field: 'direct' });
  });
});
