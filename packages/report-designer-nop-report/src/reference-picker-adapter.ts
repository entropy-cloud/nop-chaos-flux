import type {
  ReferencePickerAdapter,
  ReferencePickerContext,
} from '@nop-chaos/report-designer-core';

/**
 * nop-report 引用选择器 adapter（nop-report-profile.md §9.1 首版）：
 * 地址回填 `rowParent`/`colParent`；宿主可注入 `selectAddress` 回调
 * （如 canvas 选择），缺省回退 undefined（不抛错）。
 */

export const NOP_REPORT_REFERENCE_PICKER_ADAPTER_ID = 'nop-report-reference-picker';

export function createNopReportReferencePickerAdapter(options?: {
  id?: string;
  selectAddress?: (
    context: ReferencePickerContext,
  ) => Promise<string | undefined> | string | undefined;
}): ReferencePickerAdapter {
  return {
    id: options?.id ?? NOP_REPORT_REFERENCE_PICKER_ADAPTER_ID,
    async pick(context): Promise<string | undefined> {
      if (!options?.selectAddress) {
        return undefined;
      }
      return await options.selectAddress(context);
    },
  };
}
