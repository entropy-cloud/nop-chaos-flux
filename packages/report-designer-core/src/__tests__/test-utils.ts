import { beforeEach } from 'vitest';
import {
  createEmptyDocument,
} from '@nop-chaos/spreadsheet-core';
import {
  createReportDesignerCore,
  createReportTemplateDocument,
  type ReportDesignerCore,
  type ReportTemplateDocument,
  type ReportDesignerConfig,
} from '../index.js';

export const defaultConfig: ReportDesignerConfig = {
  kind: 'report-template',
};

export interface TestContext {
  core: ReportDesignerCore;
  doc: ReportTemplateDocument;
  sheetId: string;
}

export function createTestContext(): TestContext {
  const spreadsheetDoc = createEmptyDocument();
  const sheetId = spreadsheetDoc.workbook.sheets[0].id;
  const doc = createReportTemplateDocument(spreadsheetDoc);
  const core = createReportDesignerCore({ document: doc, config: defaultConfig });
  return { core, doc, sheetId };
}

export function setupBeforeEach(setter: (ctx: TestContext) => void) {
  beforeEach(() => {
    setter(createTestContext());
  });
}

export { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
export {
  createReportDesignerCore,
  createReportTemplateDocument,
  type ReportDesignerCore,
  type ReportTemplateDocument,
  type ReportDesignerConfig,
  type ReportDesignerProfile,
  type ReportSelectionTarget,
} from '../index.js';
