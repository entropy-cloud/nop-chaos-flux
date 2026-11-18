import { describe, expect, it } from 'vitest';
import { buildWhyReport, type WhyReportDeps } from './why-report.js';
import { createForestSnapshotCollector, findFirstWriteEpoch } from './snapshot-repository.js';
import type { NopComponentInspectResult } from './types.js';

function makeCollector() {
  const collector = createForestSnapshotCollector();
  collector.observe({ scopeId: 'root', revision: 1, snapshot: { form: { username: 'a' } }, change: { paths: ['form'], revision: 1 } });
  collector.flush();
  collector.observe({ scopeId: 'root', revision: 2, snapshot: { form: { username: 'b' } }, change: { paths: ['form'], revision: 2 } });
  collector.flush();
  return collector;
}

import { createDebuggerStore } from './store.js';

function makeDeps(overrides: Partial<WhyReportDeps> = {}): WhyReportDeps & { store: ReturnType<typeof createDebuggerStore> } {
  const store = createDebuggerStore({
    enabled: true, sessionId: 's', maxEvents: 50, defaultOpen: false, defaultTab: 'overview',
    position: { x: 0, y: 0 }, errorBufferKeepEarliest: 5, errorBufferKeepLatest: 5,
  });
  const collector = makeCollector();
  const inspect = {
    meta: { visible: true, disabled: true },
    scopeId: 'root',
    nodeId: 'n-1',
    field: 'form.username',
  } as unknown as NopComponentInspectResult;
  return {
    store,
    inspectByCid: () => inspect,
    explainMeta: (cid, field) => ({
      kind: 'meta',
      subject: { cid, field },
      answer: `${field} meta 规则求值为 ${field === 'disabled' ? 'true' : 'true'}`,
      confidence: 'high',
      evidenceRefs: [],
      related: { cid },
      truncated: false,
      data: { field, source: 'resolved-meta', dependencyPaths: ['form.submitting'] },
    }) as never,
    explainValue: () => undefined,
    getLatestEvent: () => undefined,
    collector,
    listReactions: (scopeId) => [
      { id: 'r-1', scopeId: scopeId ?? 'root', when: 'form.submitting', dependencies: ['form.submitting'], disposed: false, fireCount: 3 },
    ],
    screenshot: async () => ({}),
    ...overrides,
  };
}

describe('buildWhyReport (M4)', () => {
  it('unknown cid yields verdict unknown without throwing', () => {
    const deps = makeDeps({ inspectByCid: () => undefined });
    const report = buildWhyReport(999, deps);
    expect(report.verdict).toBe('unknown');
    expect(report.parts).toHaveLength(0);
  });

  it('disabled 之谜: meta part reports the disabled meta with evidence link', () => {
    const deps = makeDeps();
    const report = buildWhyReport(1, deps);
    const metaPart = report.parts.find((part) => part.category === 'meta');
    expect(metaPart).toBeDefined();
    expect(report.evidence.some((link) => link.type === 'cid')).toBe(true);
  });

  it('不渲染之谜: visible=false attributes non-rendering with high confidence', () => {
    const deps = makeDeps({
      inspectByCid: () => ({ meta: { visible: false }, scopeId: 'root' } as unknown as NopComponentInspectResult),
    });
    const report = buildWhyReport(2, deps);
    const part = report.parts.find((candidate) => candidate.category === 'notRendered');
    expect(part?.verdict).toContain('visible=false');
    expect(part?.confidence).toBe('high');
  });

  it('不渲染之谜: error boundary attribution via onError log', () => {
    const deps = makeDeps({
      inspectByCid: () => ({ meta: { visible: true }, scopeId: 'root', nodeId: 'n-err' } as unknown as NopComponentInspectResult),
      getLatestEvent: () => ({ id: 1, kind: 'error', nodeId: 'n-err', summary: 'render exploded' } as never),
    });
    const report = buildWhyReport(3, deps);
    const part = report.parts.find((candidate) => candidate.category === 'notRendered');
    expect(part?.verdict).toContain('error boundary');
    expect(report.evidence.some((link) => link.type === 'expression')).toBe(true);
  });

  it('props part reports the field expression evaluation', () => {
    const deps = makeDeps({
      explainValue: (cid, field) => ({
        kind: 'value',
        subject: { cid, field },
        answer: `prop ${field} 来自 scope 写入`,
        confidence: 'high',
        evidenceRefs: [],
        related: { cid },
        truncated: false,
        data: { field },
      }) as never,
    });
    const report = buildWhyReport(8, deps);
    const part = report.parts.find((candidate) => candidate.category === 'props');
    expect(part?.verdict).toContain('来自 scope 写入');
    expect(report.evidence.some((link) => link.type === 'expression')).toBe(true);
  });

  it('reaction part lists scope reactions with fire counts', () => {
    const deps = makeDeps();
    const report = buildWhyReport(4, deps);
    const part = report.parts.find((candidate) => candidate.category === 'reaction');
    expect(part?.verdict).toContain('r-1');
    expect(part?.verdict).toContain('fired=3');
  });

  it('data part reverse-looks-up the first write epoch with an epoch evidence link', () => {
    const deps = makeDeps();
    const report = buildWhyReport(5, deps);
    const part = report.parts.find((candidate) => candidate.category === 'data');
    expect(part?.verdict).toContain('首写于 epoch 1');
    expect(report.evidence.some((link) => link.type === 'epoch' && link.target === '1')).toBe(true);
  });

  it('data part degrades to low confidence when history lacks the path', () => {
    const collector = createForestSnapshotCollector();
    collector.observe({ scopeId: 'other', revision: 1, snapshot: {}, change: { paths: ['*'], revision: 1 } });
    collector.flush();
    const deps = makeDeps({ collector });
    const report = buildWhyReport(6, deps);
    const part = report.parts.find((candidate) => candidate.category === 'data');
    expect(part?.confidence).toBe('low');
    expect(part?.limitations).toContain('history evicted or never written');
  });

  it('why verdict carries a why:<verdict> screenshot tag', () => {
    const deps = makeDeps();
    const report = buildWhyReport(7, deps);
    expect(report.screenshotTag).toContain('why:');
  });
});

describe('findFirstWriteEpoch (M4)', () => {
  it('finds the earliest epoch containing the path', () => {
    const collector = makeCollector();
    const result = findFirstWriteEpoch(collector.getRing(), 'root', 'form.username');
    expect(result.found).toBe(true);
    expect(result.epoch).toBe(1);
    expect(result.value).toBe('a');
  });

  it('distinguishes missing scope from missing path', () => {
    const collector = makeCollector();
    expect(findFirstWriteEpoch(collector.getRing(), 'no-scope', 'x').reason).toBe('scope');
    expect(findFirstWriteEpoch(collector.getRing(), 'root', 'nope').found).toBe(false);
  });
});
