import { describe, expect, it } from 'vitest';
import { computeThreeWayDiff } from '../model/diff-3way.js';

describe('computeThreeWayDiff', () => {
  it('returns all context when all three contents are identical', () => {
    const result = computeThreeWayDiff('a\nb\nc', 'a\nb\nc', 'a\nb\nc');
    expect(result.rows).toHaveLength(3);
    expect(result.rows.every((r) => r.type === 'context')).toBe(true);
    expect(result.conflictZones).toHaveLength(0);
  });

  it('detects old-side changes (old≠middle, middle===new)', () => {
    const result = computeThreeWayDiff('a\nold-b\nc', 'a\nmid-b\nc', 'a\nmid-b\nc');
    const changeRows = result.rows.filter((r) => r.type === 'change-old');
    expect(changeRows.length).toBeGreaterThan(0);
    expect(changeRows[0].oldContent).toBe('old-b');
    expect(changeRows[0].middleContent).toBe('mid-b');
    expect(changeRows[0].newContent).toBe('mid-b');
    expect(result.conflictZones).toHaveLength(0);
  });

  it('detects new-side changes (old===middle, middle≠new)', () => {
    const result = computeThreeWayDiff('a\nmid-b\nc', 'a\nmid-b\nc', 'a\nnew-b\nc');
    const changeRows = result.rows.filter((r) => r.type === 'change-new');
    expect(changeRows.length).toBeGreaterThan(0);
    expect(changeRows[0].oldContent).toBe('mid-b');
    expect(changeRows[0].middleContent).toBe('mid-b');
    expect(changeRows[0].newContent).toBe('new-b');
    expect(result.conflictZones).toHaveLength(0);
  });

  it('detects conflict when both old and new differ from middle', () => {
    const result = computeThreeWayDiff('a\nold-value\nc', 'a\nbase-value\nc', 'a\nnew-value\nc');
    expect(result.conflictZones.length).toBeGreaterThan(0);
    const conflictRows = result.rows.filter((r) => r.type === 'conflict');
    expect(conflictRows.length).toBeGreaterThan(0);
    expect(conflictRows[0].oldContent).toBe('old-value');
    expect(conflictRows[0].newContent).toBe('new-value');
  });

  it('returns empty result for empty inputs', () => {
    const result = computeThreeWayDiff('', '', '');
    expect(result.rows).toHaveLength(0);
    expect(result.conflictZones).toHaveLength(0);
  });

  it('handles addition in old vs middle (insertion case) — not a conflict, just change-old', () => {
    const result = computeThreeWayDiff('a\nb', 'a\nb\nc', 'a\nb\nc');
    const changeRows = result.rows.filter((r) => r.type === 'change-old');
    expect(changeRows.length).toBeGreaterThan(0);
    expect(changeRows[0].oldContent).toBe('');
    expect(changeRows[0].middleContent).toBe('c');
    expect(changeRows[0].newContent).toBe('c');
    expect(result.conflictZones).toHaveLength(0);
  });

  it('emits conflict markers (start/separator/end) around conflicts', () => {
    const result = computeThreeWayDiff('a\nold-val\nc', 'a\nmid-val\nc', 'a\nnew-val\nc');
    const markers = result.rows.filter(
      (r) => r.type === 'conflict-start' || r.type === 'conflict-separator' || r.type === 'conflict-end',
    );
    expect(markers.length).toBeGreaterThanOrEqual(3);
    expect(markers[0].type).toBe('conflict-start');
  });

  it('conflict zones have correct line number ranges', () => {
    const result = computeThreeWayDiff('a\nold-val\nc', 'a\nmid-val\nc', 'a\nnew-val\nc');
    expect(result.conflictZones.length).toBeGreaterThan(0);
    for (const zone of result.conflictZones) {
      expect(zone.startLine).toBeGreaterThan(0);
      expect(zone.endLine).toBeGreaterThanOrEqual(zone.startLine);
    }
  });

  it('handles multiple conflict zones', () => {
    const oldContent = 'a\nold1\nb\nold2\nc';
    const middleContent = 'a\nbase1\nb\nbase2\nc';
    const newContent = 'a\nnew1\nb\nnew2\nc';
    const result = computeThreeWayDiff(oldContent, middleContent, newContent);
    expect(result.conflictZones.length).toBeGreaterThanOrEqual(2);
  });

  it('navigation boundary: zero conflicts means empty navigation state', () => {
    const result = computeThreeWayDiff('a\nb\nc', 'a\nb\nc', 'a\nb\nc');
    expect(result.conflictZones).toHaveLength(0);
  });

  it('navigation boundary: single conflict zone with markers', () => {
    const result = computeThreeWayDiff('old-val', 'mid-val', 'new-val');
    expect(result.conflictZones).toHaveLength(1);
    expect(result.conflictZones[0].startLine).toBeGreaterThan(0);
    expect(result.conflictZones[0].endLine).toBeGreaterThanOrEqual(result.conflictZones[0].startLine);
  });
});
