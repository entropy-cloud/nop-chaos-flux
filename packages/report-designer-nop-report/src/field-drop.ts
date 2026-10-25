import type { FieldDropAdapter, MetadataBag } from '@nop-chaos/report-designer-core';

/**
 * nop-report 字段拖放绑定（nop-report-profile.md §6）：字段 drop 到单 cell →
 * `cellMeta[sheetId][address]['nop-report'].model` 的 `field`/`ds` patch。
 * 首版仅支持单 cell（roadmap §6 NRP-3 裁定；range 批量 patch 显式 deferred）。
 */

export const NOP_REPORT_FIELD_DROP_ADAPTER_ID = 'nop-report-cell-binding';

export const NOP_REPORT_FIELD_DRAG_TYPE = 'nop-report-field';

export function createNopReportCellBindingDropAdapter(): FieldDropAdapter {
  return {
    id: NOP_REPORT_FIELD_DROP_ADAPTER_ID,
    canHandle(field, target) {
      if (target.kind !== 'cell') {
        return false;
      }
      return !field.type || field.type === NOP_REPORT_FIELD_DRAG_TYPE;
    },
    mapDropToMetaPatch(args): MetadataBag {
      const data = args.field.data ?? {};
      const dataset = typeof data.dataset === 'string' ? data.dataset : undefined;
      const path = typeof data.path === 'string' ? data.path : args.field.fieldId;
      const model: Record<string, unknown> = { field: path };
      if (dataset) {
        model.ds = dataset;
      }
      return { 'nop-report': { model } };
    },
  };
}
