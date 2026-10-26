import type { PreviewAdapter, PreviewResult } from '@nop-chaos/report-designer-core';
import type { ReportTemplateDocument } from '@nop-chaos/report-designer-core';
import { createNopReportTemplateCodec, type NopReportTemplateEnvelope } from './template-codec.js';

/**
 * nop-report preview adapter（nop-report-profile.md §10）：导出当前模板信封 →
 * 调用宿主注入的 previewEndpoint → 结果回传。URL/协议由宿主决定。
 */

export const NOP_REPORT_PREVIEW_ADAPTER_ID = 'nop-report-preview';

export interface NopReportPreviewEndpointArgs {
  envelope: NopReportTemplateEnvelope;
  mode?: string;
  params?: Record<string, unknown>;
  signal?: AbortSignal;
}

export function createNopReportPreviewAdapter(options: {
  id?: string;
  previewEndpoint: (args: NopReportPreviewEndpointArgs) => Promise<Pick<PreviewResult, 'data' | 'error'>> | Pick<PreviewResult, 'data' | 'error'>;
}): PreviewAdapter {
  const codec = createNopReportTemplateCodec();
  return {
    id: options.id ?? NOP_REPORT_PREVIEW_ADAPTER_ID,
    async preview(args): Promise<PreviewResult> {
      const envelope = codec.exportTemplate(args.document as ReportTemplateDocument);
      return await Promise.resolve(options)
        .then((resolved) =>
          resolved.previewEndpoint({
            envelope,
            mode: args.mode,
            params: args.params,
            signal: args.signal,
          }),
        )
        .then(
          (result) => ({ ok: true, mode: args.mode, data: result.data }),
          (error: unknown) => ({ ok: false, mode: args.mode, error }),
        );
    },
  };
}
