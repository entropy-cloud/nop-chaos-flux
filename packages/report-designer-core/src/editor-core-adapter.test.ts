import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearEditorDomains, getEditorDomain } from '@nop-chaos/editor-core';
import {
  REPORT_DESIGNER_COMMAND_TYPES,
  REPORT_DESIGNER_DOMAIN_KIND,
  createReportDesignerDomainAdapter,
  hasReportDocChanges,
  isReportDesignerCommand,
  registerReportDesignerDomain,
} from './editor-core-adapter.js';
import { createReportDesignerCore } from './core.js';
import { createEmptyAdapterRegistry } from './adapters.js';
import type { ReportTemplateDocument } from './types.js';
import type { ReportDesignerConfig } from './types.js';

function makeDoc(sheetName: string): ReportTemplateDocument {
  return {
    semantic: { title: sheetName },
    spreadsheet: { workbook: { sheets: [{ id: 's1', name: sheetName, rows: 5, cols: 3, cells: {} }] } },
  } as unknown as ReportTemplateDocument;
}

const config: ReportDesignerConfig = { inspector: { mode: 'panel' } } as unknown as ReportDesignerConfig;

beforeEach(() => {
  clearEditorDomains();
});

describe('report designer domain adapter (editor-core contract)', () => {
  it('kind is report-designer and domainCommands covers the full command type set', () => {
    const adapter = createReportDesignerDomainAdapter(makeDoc('x'));
    expect(adapter.kind).toBe(REPORT_DESIGNER_DOMAIN_KIND);
    expect(adapter.domainCommands).toHaveLength(12);
    expect(REPORT_DESIGNER_COMMAND_TYPES.every((t) => t.startsWith('report-designer:'))).toBe(true);
    expect(REPORT_DESIGNER_COMMAND_TYPES).toContain('report-designer:save');
    expect(REPORT_DESIGNER_COMMAND_TYPES).toContain('report-designer:undo');
  });

  it('isReportDesignerCommand guards the declared type set', () => {
    expect(isReportDesignerCommand({ type: 'report-designer:save' })).toBe(true);
    expect(isReportDesignerCommand({ type: 'report-designer:unknown' })).toBe(false);
  });

  it('diff returns null when structurally identical, next snapshot otherwise', () => {
    const adapter = createReportDesignerDomainAdapter(makeDoc('x'));
    const a = makeDoc('x');
    const b = makeDoc('y');
    expect(adapter.diff(a, a)).toBeNull();
    expect(adapter.diff(a, b)).toEqual(b);
    expect(hasReportDocChanges(a, a)).toBe(false);
    expect(hasReportDocChanges(a, b)).toBe(true);
  });

  it('applyDiff round-trips snapshot pairs symmetrically', () => {
    const adapter = createReportDesignerDomainAdapter(makeDoc('x'));
    const a = makeDoc('x');
    const b = makeDoc('y');
    const forward = adapter.diff(a, b)!;
    const inverse = adapter.diff(b, a)!;
    expect(adapter.applyDiff(a, forward)).toEqual(b);
    expect(adapter.applyDiff(adapter.applyDiff(a, forward), inverse)).toEqual(a);
  });

  it('serialize/validate delegate', () => {
    const doc = makeDoc('x');
    const adapter = createReportDesignerDomainAdapter(doc);
    expect(JSON.parse(adapter.serialize(doc))).toEqual(doc);
    expect(adapter.validate(doc).ok).toBe(true);
  });
});

describe('registerReportDesignerDomain (editor-core domain registry)', () => {
  it('registers kind report-designer retrievable via getEditorDomain', () => {
    const initial = makeDoc('seed');
    registerReportDesignerDomain(initial);
    const domain = getEditorDomain(REPORT_DESIGNER_DOMAIN_KIND);
    expect(domain).toBeDefined();
    expect(domain!.load()).toEqual(initial);
  });

  it('re-registration overwrites (editor-core.md §3 ruling)', () => {
    registerReportDesignerDomain(makeDoc('a'));
    registerReportDesignerDomain(makeDoc('b'));
    expect(getEditorDomain(REPORT_DESIGNER_DOMAIN_KIND)!.load()).toEqual(makeDoc('b'));
  });
});

describe('P1.3 session semantics (operation-time undo/redo + onCommitted)', () => {
  it('undo restores pre-op doc; redo restores the undo-time doc', async () => {
    const core = createReportDesignerCore({
      document: makeDoc('A'),
      config,
      adapters: createEmptyAdapterRegistry(),
    });
    await core.initialize();
    core.setMetadata({ kind: 'workbook' }, { title: 'B' });
    const title = (): unknown => core.exportDocument().semantic?.workbookMeta?.title;
    expect(title()).toBe('B');
    await core.dispatch({ type: 'report-designer:undo' });
    expect(title()).toBeUndefined();
    await core.dispatch({ type: 'report-designer:redo' });
    expect(title()).toBe('B');
  });

  it('onCommitted fires after a successful save with the save result (document payload)', async () => {
    const onCommitted = vi.fn();
    const core = createReportDesignerCore({
      document: makeDoc('A'),
      config,
      adapters: createEmptyAdapterRegistry(),
      onCommitted,
    });
    await core.initialize();
    const result = await core.dispatch({ type: 'report-designer:save' });
    expect(result.ok).toBe(true);
    expect(onCommitted).toHaveBeenCalledTimes(1);
    const payload = onCommitted.mock.calls[0]![0] as { data: ReportTemplateDocument };
    expect(payload.data.semantic?.workbookMeta?.title).toBeUndefined();
  });

  it('onCommitted does not fire on failed save and its exception is isolated from the save result', async () => {
    const onCommitted = vi.fn(() => {
      throw new Error('cascade failed');
    });
    const onError = vi.fn();
    const core = createReportDesignerCore({
      document: makeDoc('A'),
      config,
      adapters: createEmptyAdapterRegistry(),
      readonly: true,
      onCommitted,
      onError,
    });
    await core.initialize();
    const result = await core.dispatch({ type: 'report-designer:save' });
    // readonly save fails (mutation gate) → ok:false, callback not fired
    expect(result.ok).toBe(false);
    expect(onCommitted).not.toHaveBeenCalled();

    const core2 = createReportDesignerCore({
      document: makeDoc('A'),
      config,
      adapters: createEmptyAdapterRegistry(),
      onCommitted,
      onError,
    });
    await core2.initialize();
    const save = await core2.dispatch({ type: 'report-designer:save' });
    // throwing callback is isolated: save still ok:true, error surfaced via onError
    expect(save.ok).toBe(true);
    expect(onCommitted).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalled();
  });
});
