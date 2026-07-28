import type { ErrorMonitorPayload, RendererEnv } from '../types/renderer-api.js';
import type { XuiImportSpec } from '../types/schema.js';

type ReportableImportError = Error & { __fluxImportReported?: boolean };

export function markImportErrorReported(error: Error): Error {
  (error as ReportableImportError).__fluxImportReported = true;
  return error;
}

export function isReportedImportError(error: unknown): boolean {
  return error instanceof Error && Boolean((error as ReportableImportError).__fluxImportReported);
}

export function reportImportFailure(input: {
  env: RendererEnv;
  error: Error;
  imports?: readonly XuiImportSpec[];
  nodeId?: string;
  path?: string;
  message?: string;
  phase?: ErrorMonitorPayload['phase'];
  reason?: string;
}): Error {
  const error = markImportErrorReported(input.error);
  const message = input.message ?? error.message;

  input.env.notify('error', message);

  return error;
}
