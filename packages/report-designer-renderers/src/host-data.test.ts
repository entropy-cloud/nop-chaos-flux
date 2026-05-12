import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import {
  createReportDesignerCore,
  createReportTemplateDocument,
} from '@nop-chaos/report-designer-core';
import { buildReportDesignerScopeData } from './host-data.js';

describe('buildReportDesignerScopeData', () => {
  it('publishes designer.dirty separately from aggregated runtime.dirty', async () => {
    const spreadsheet = createEmptyDocument();
    const document = createReportTemplateDocument(spreadsheet, 'Dirty Report');
    const core = createReportDesignerCore({
      document,
      config: { kind: 'report-template' },
    });

    await core.dispatch({
      type: 'report-designer:updateMeta',
      target: { kind: 'workbook' },
      patch: { title: 'Changed' },
    });

    const snapshot = core.getSnapshot();
    const scopeData = buildReportDesignerScopeData(core, snapshot);
    const designer = scopeData.designer as { dirty?: boolean };
    const runtime = scopeData.runtime as { dirty?: boolean };

    expect(designer.dirty).toBe(true);
    expect(runtime.dirty).toBe(true);
  });

  it('keeps canonical report designer projection vocabulary aligned', () => {
    const spreadsheet = createEmptyDocument();
    const document = createReportTemplateDocument(spreadsheet, 'Vocabulary Report');
    const core = createReportDesignerCore({
      document,
      config: { kind: 'report-template' },
    });

    const scopeData = buildReportDesignerScopeData(core, core.getSnapshot());
    const designer = scopeData.designer as { inspectorPanels?: unknown; fieldSources?: unknown[] };

    expect(scopeData).toHaveProperty('selectionTarget');
    expect(scopeData).toHaveProperty('selection');
    expect(scopeData).toHaveProperty('target');
    expect(scopeData).toHaveProperty('reportDocument');
    expect(scopeData).toHaveProperty('fieldSources');
    expect(scopeData).toHaveProperty('preview');
    expect(scopeData).toHaveProperty('inspectorPanels');
    expect(scopeData).not.toHaveProperty('inspectorBody');
    expect(designer).toHaveProperty('inspectorPanels');
    expect(Array.isArray(designer.fieldSources)).toBe(true);
  });
});
