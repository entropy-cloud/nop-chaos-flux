import { describe, expect, it } from 'vitest';
import { collectLogBatch, type KernelEventView } from './kernel.js';

function events(range: Array<[number, string]>): KernelEventView[] {
  return range.map(([seq, kind]) => ({ seq, kind, summary: `${kind}#${seq}` }));
}

describe('collectLogBatch (log.emit rate limiter)', () => {
  it('ships all fresh events when under the cap', () => {
    const batch = collectLogBatch(events([[1, 'action'], [2, 'api'], [3, 'eval']]), 0);
    expect(batch.entries).toHaveLength(3);
    expect(batch.dropped).toBe(0);
    expect(batch.nextSeq).toBe(3);
  });

  it('keeps the newest 20 and counts the rest as dropped', () => {
    const evts = events(Array.from({ length: 25 }, (_, i) => [i + 1, 'action'] as [number, string]));
    const batch = collectLogBatch(evts, 0);
    expect(batch.entries).toHaveLength(20);
    expect(batch.entries[0]?.seq).toBe(6);
    expect(batch.dropped).toBe(5);
    expect(batch.nextSeq).toBe(25);
  });

  it('ignores events at or below lastSeq', () => {
    const batch = collectLogBatch(events([[4, 'action'], [5, 'api']]), 5);
    expect(batch.entries).toHaveLength(0);
    expect(batch.dropped).toBe(0);
    expect(batch.nextSeq).toBe(5);
  });

  it('handles partial freshness', () => {
    const batch = collectLogBatch(events([[9, 'old'], [10, 'new'], [11, 'newer']]), 9);
    expect(batch.entries.map((e) => e.seq)).toEqual([10, 11]);
    expect(batch.dropped).toBe(0);
    expect(batch.nextSeq).toBe(11);
  });
});
