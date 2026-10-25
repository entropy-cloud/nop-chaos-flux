import type { FieldSourceProvider } from '@nop-chaos/report-designer-core';
import type { FieldItemSnapshot } from '@nop-chaos/report-designer-core';

/**
 * nop-report 数据集字段源（nop-report-profile.md §5）：
 * 数据集 → FieldSourceSnapshot（每数据集一个 source，groups = 字段树），
 * 字段 meta 携带 dataset/path/valueType 供 drop adapter 构造绑定。
 */

export const NOP_REPORT_FIELD_SOURCE_PROVIDER_ID = 'nop-report-datasets';

export interface NopReportDatasetField {
  path: string;
  label: string;
  valueType?: string;
  meta?: Record<string, unknown>;
}

export interface NopReportDataset {
  id: string;
  label: string;
  fields: NopReportDatasetField[];
}

export interface NopReportDatasetProviderOptions {
  datasets: NopReportDataset[] | (() => NopReportDataset[] | Promise<NopReportDataset[]>);
  id?: string;
}

export function createNopReportDatasetProvider(
  options: NopReportDatasetProviderOptions,
): FieldSourceProvider {
  const id = options.id ?? NOP_REPORT_FIELD_SOURCE_PROVIDER_ID;
  return {
    id,
    async load(context, loadOptions) {
      void context;
      if (loadOptions?.signal?.aborted) {
        return [];
      }
      const datasets =
        typeof options.datasets === 'function' ? await options.datasets() : options.datasets;
      if (loadOptions?.signal?.aborted) {
        return [];
      }
      return datasets.map((dataset) => ({
        id: `${id}:${dataset.id}`,
        label: dataset.label,
        provider: id,
        groups: [
          {
            id: 'fields',
            label: dataset.label,
            expanded: true,
            fields: dataset.fields.map(
              (field): FieldItemSnapshot => ({
                id: `${dataset.id}.${field.path}`,
                label: field.label,
                path: field.path,
                fieldType: field.valueType,
                meta: { dataset: dataset.id, path: field.path, valueType: field.valueType, ...field.meta },
              }),
            ),
          },
        ],
      }));
    },
  } satisfies FieldSourceProvider & { id: string };
}
