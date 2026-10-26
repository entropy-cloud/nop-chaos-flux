import type {
  ReportDesignerAdapterRegistry,
  ReportDesignerProfile,
} from '@nop-chaos/report-designer-core';
import {
  createNopReportCellBindingDropAdapter,
  NOP_REPORT_FIELD_DROP_ADAPTER_ID,
} from './field-drop.js';
import {
  createNopReportDatasetProvider,
  NOP_REPORT_FIELD_SOURCE_PROVIDER_ID,
  type NopReportDataset,
} from './field-source.js';
import { createNopReportExpressionEditorAdapter } from './expression-editor-adapter.js';
import { createNopReportReferencePickerAdapter } from './reference-picker-adapter.js';
import {
  createNopReportPreviewAdapter,
  NOP_REPORT_PREVIEW_ADAPTER_ID,
  type NopReportPreviewEndpointArgs,
} from './preview-adapter.js';
import { createNopReportTemplateCodec } from './template-codec.js';

/**
 * nop-report profile 装配（plan 753）：固定 id 的一条 profile + 填满六类 map 的
 * adapter registry。renderer definitions 经 `createNopReportRendererDefinitions`
 * 由宿主注册进 live flux registry（NRP-4）。
 */

export const NOP_REPORT_PROFILE_ID = 'nop-report-default';
export const NOP_REPORT_PROFILE_KIND = 'nop-report';
export const NOP_REPORT_PROFILE_FIELD_SOURCE_ID = 'nop-report-datasets-source';

export function createNopReportProfile(_options?: {
  id?: string;
}): ReportDesignerProfile {
  return {
    id: NOP_REPORT_PROFILE_ID,
    kind: NOP_REPORT_PROFILE_KIND,
    fieldSourceIds: [NOP_REPORT_PROFILE_FIELD_SOURCE_ID],
    fieldDropIds: [NOP_REPORT_FIELD_DROP_ADAPTER_ID],
    inspectorSchemaId: NOP_REPORT_PROFILE_ID,
    previewId: NOP_REPORT_PREVIEW_ADAPTER_ID,
    codecId: 'nop-report-xpt-codec',
    expressionEditorId: 'nop-report-expression-editor',
    referencePickerId: 'nop-report-reference-picker',
  };
}

/** 宿主 config 侧配套：provider-backed 字段源 entry（id ∈ profile.fieldSourceIds）。 */
export function createNopReportFieldSourceConfigEntry(label?: string): {
  id: string;
  label: string;
  provider: string;
} {
  return {
    id: NOP_REPORT_PROFILE_FIELD_SOURCE_ID,
    label: label ?? 'Datasets',
    provider: NOP_REPORT_FIELD_SOURCE_PROVIDER_ID,
  };
}

export function createNopReportAdapters(options: {
  datasets?: NopReportDataset[] | (() => NopReportDataset[] | Promise<NopReportDataset[]>);
  previewEndpoint: (args: NopReportPreviewEndpointArgs) => Promise<Pick<{ ok: boolean; data?: unknown; error?: unknown }, 'data' | 'error'>> | Pick<{ ok: boolean; data?: unknown; error?: unknown }, 'data' | 'error'>;
  selectAddress?: (context: { targetKind: string }) => Promise<string | undefined> | string | undefined;
}): Partial<ReportDesignerAdapterRegistry> {
  const registry: Partial<ReportDesignerAdapterRegistry> = {
    codecs: new Map([['nop-report-xpt-codec', createNopReportTemplateCodec()]]),
  };
  if (options.datasets) {
    registry.fieldSources = new Map([
      [NOP_REPORT_FIELD_SOURCE_PROVIDER_ID, createNopReportDatasetProvider({ datasets: options.datasets })],
    ]);
  }
  registry.fieldDrops = new Map([
    [NOP_REPORT_FIELD_DROP_ADAPTER_ID, createNopReportCellBindingDropAdapter()],
  ]);
  registry.previews = new Map([
    [NOP_REPORT_PREVIEW_ADAPTER_ID, createNopReportPreviewAdapter({ previewEndpoint: options.previewEndpoint })],
  ]);
  registry.expressions = new Map([
    ['nop-report-expression-editor', createNopReportExpressionEditorAdapter()],
  ]);
  registry.references = new Map([
    ['nop-report-reference-picker', createNopReportReferencePickerAdapter({ selectAddress: options.selectAddress })],
  ]);
  return registry;
}
