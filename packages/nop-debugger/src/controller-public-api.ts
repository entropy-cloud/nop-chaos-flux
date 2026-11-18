import type { NopDebuggerController, NopDiagnosticReport, NopDiagnosticReportOptions } from './types.js';
import { installNopDebuggerWindowFlag, getNopDebuggerAutomationApi } from './automation.js';

export { getNopDebuggerAutomationApi, installNopDebuggerWindowFlag };

export function createNopDiagnosticReport(
  controller: NopDebuggerController,
  options?: NopDiagnosticReportOptions,
): NopDiagnosticReport {
  return controller.createDiagnosticReport(options);
}
