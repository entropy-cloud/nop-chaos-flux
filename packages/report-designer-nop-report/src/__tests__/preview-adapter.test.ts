import { describe, expect, it, vi } from 'vitest';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import {
  createReportDesignerCore,
  createReportTemplateDocument,
  type ReportDesignerProfile,
} from '@nop-chaos/report-designer-core';
import {
  createNopReportAdapters,
  createNopReportFieldSourceConfigEntry,
  createNopReportPreviewAdapter,
  createNopReportProfile,
  NOP_REPORT_FIELD_SOURCE_PROVIDER_ID,
  NOP_REPORT_PREVIEW_ADAPTER_ID,
  NOP_REPORT_PROFILE_FIELD_SOURCE_ID,
  NOP_REPORT_TEMPLATE_FORMAT,
  type NopReportTemplateEnvelope,
} from '../index.js';

function sampleDocument() {
  return createReportTemplateDocument(createEmptyDocument('preview-doc'), 'Preview Demo');
}

describe('createNopReportPreviewAdapter', () => {
  it('exports the envelope and forwards it to the injected endpoint', async () => {
    const endpoint = vi.fn(() => ({ data: { rows: 2 } }));
    const adapter = createNopReportPreviewAdapter({ previewEndpoint: endpoint });
    expect(adapter.id).toBe(NOP_REPORT_PREVIEW_ADAPTER_ID);

    const controller = new AbortController();
    const result = await adapter.preview({
      document: sampleDocument() as never,
      mode: 'inline',
      params: { p: 1 },
      context: {} as never,
      signal: controller.signal,
    });

    expect(result.ok).toBe(true);
    expect(result.mode).toBe('inline');
    expect(result.data).toEqual({ rows: 2 });
    expect(endpoint).toHaveBeenCalledTimes(1);
    const args = (endpoint.mock.calls as unknown as Array<[{ envelope: NopReportTemplateEnvelope; mode?: string; params?: Record<string, unknown> }]>)[0][0];
    expect(args.envelope.format).toBe(NOP_REPORT_TEMPLATE_FORMAT);
    expect(args.mode).toBe('inline');
    expect(args.params).toEqual({ p: 1 });
  });

  it('maps endpoint rejection to {ok:false,error} without throwing', async () => {
    const adapter = createNopReportPreviewAdapter({
      previewEndpoint: () => Promise.reject(new Error('backend down')),
    });
    const result = await adapter.preview({ document: sampleDocument() as never, context: {} as never });
    expect(result.ok).toBe(false);
    expect((result.error as Error).message).toBe('backend down');
  });

  it('passes the abort signal through to the endpoint', async () => {
    const endpoint = vi.fn((_args: { signal?: AbortSignal }) => ({ data: null }));
    const adapter = createNopReportPreviewAdapter({ previewEndpoint: endpoint });
    const controller = new AbortController();
    await adapter.preview({ document: sampleDocument() as never, context: {} as never, signal: controller.signal });
    expect((endpoint.mock.calls[0][0] as { signal?: AbortSignal }).signal).toBe(controller.signal);
  });
});

describe('createNopReportProfile + createNopReportAdapters assembly', () => {
  const profile = createNopReportProfile();

  it('produces a profile whose ids align with the assembled registry maps', () => {
    const adapters = createNopReportAdapters({
      datasets: [],
      previewEndpoint: () => ({ data: null }),
    });
    expect(profile.id).toBe('nop-report-default');
    expect(profile.codecId && adapters.codecs?.has(profile.codecId)).toBe(true);
    expect(profile.previewId && adapters.previews?.has(profile.previewId)).toBe(true);
    expect(profile.expressionEditorId && adapters.expressions?.has(profile.expressionEditorId)).toBe(true);
    expect(profile.referencePickerId && adapters.references?.has(profile.referencePickerId)).toBe(true);
    expect(profile.fieldDropIds.every((id) => adapters.fieldDrops?.has(id))).toBe(true);
    expect(profile.fieldSourceIds).toContain(NOP_REPORT_PROFILE_FIELD_SOURCE_ID);
  });

  it('explicitly asserts the provider pickup chain (config entry id in profile.fieldSourceIds + provider string)', async () => {
    const adapters = createNopReportAdapters({
      datasets: [{ id: 'orders', label: 'Orders', fields: [{ path: 'id', label: 'ID' }] }],
      previewEndpoint: () => ({ data: null }),
    });
    const entry = createNopReportFieldSourceConfigEntry();
    expect(entry.provider).toBe(NOP_REPORT_FIELD_SOURCE_PROVIDER_ID);
    expect(profile.fieldSourceIds).toContain(entry.id);

    const core = createReportDesignerCore({
      document: sampleDocument() as never,
      config: { kind: 'nop-report', fieldSources: [entry as never] },
      profile: profile as ReportDesignerProfile,
      adapters: adapters as never,
    });
    const sources = await core.refreshFieldSources();
    // provider 实际被拾取并加载（field-sources.ts 的静默 continue 未吞掉）
    expect(sources.some((source) => source.id === `${NOP_REPORT_FIELD_SOURCE_PROVIDER_ID}:orders`)).toBe(true);
  });

  it('importTemplate smoke-tests through the assembled registry', async () => {
    const adapters = createNopReportAdapters({
      previewEndpoint: () => ({ data: null }),
    });
    const core = createReportDesignerCore({
      document: sampleDocument() as never,
      config: { kind: 'nop-report' },
      profile: profile as ReportDesignerProfile,
      adapters: adapters as never,
    });
    const result = await core.dispatch({
      type: 'report-designer:importTemplate',
      payload: {
        format: NOP_REPORT_TEMPLATE_FORMAT,
        version: '1.0.0',
        workbook: { sheets: [{ id: 's1', name: 'S1' }] },
      },
    });
    expect(result.ok).toBe(true);
    expect(result.changed).toBe(true);
  });
});
