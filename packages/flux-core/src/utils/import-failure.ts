import type { ErrorMonitorPayload, RendererEnv } from '../types/renderer-api';
import type { XuiImportSpec } from '../types/schema';

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
  input.env.monitor?.onError?.({
    phase: input.phase ?? 'render',
    error,
    nodeId: input.nodeId,
    path: input.path,
    details: {
      reason: input.reason ?? 'import-namespace-setup-failed',
      imports: input.imports ?? [],
    },
  });

  return error;
}
