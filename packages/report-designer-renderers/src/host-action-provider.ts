import type { ActionResult } from '@nop-chaos/flux-core';
import { createHostActionProvider, toHostActionError } from '@nop-chaos/flux-core';
import type {
  ReportDesignerCommand,
  ReportDesignerCommandResult,
} from '@nop-chaos/report-designer-core';
import { REPORT_DESIGNER_MANIFEST_V1 } from './report-designer-manifest.js';

export const REPORT_DESIGNER_HOST_METHODS = [
  'dropFieldToTarget',
  'updateMeta',
  'replaceMeta',
  'openInspector',
  'closeInspector',
  'preview',
  'stopPreview',
  'undo',
  'redo',
  'save',
  'importTemplate',
  'exportTemplate',
] as const;

export function toReportDesignerActionResult(response: ReportDesignerCommandResult): ActionResult {
  return {
    ok: response.ok,
    cancelled: response.cancelled,
    data: response.data,
    error: toHostActionError(response.error, 'Report designer command failed'),
  };
}

export function createReportDesignerActionProvider(
  dispatch: (command: ReportDesignerCommand) => Promise<ReportDesignerCommandResult>,
) {
  return createHostActionProvider<ReportDesignerCommand, ReportDesignerCommandResult>({
    namespace: 'report-designer',
    methods: REPORT_DESIGNER_HOST_METHODS,
    contracts: REPORT_DESIGNER_MANIFEST_V1.capabilities.methods,
    dispatch,
    toActionResult: toReportDesignerActionResult,
    fallbackErrorMessage: 'Report designer command failed',
    onInvokeError: (method, error) => {
      console.warn(`[report-designer] action ${method} failed`, error);
    },
  });
}
