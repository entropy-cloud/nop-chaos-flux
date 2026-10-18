export { asReactNode } from '@nop-chaos/flux-react';
import type { ReactNode } from 'react';
import { asReactNode } from '@nop-chaos/flux-react';

/**
 * 表头单元格文字解析（ux-r12e 从 table-header-row 抽出，控制该文件行数预算）：
 * labelRegion 优先，其次 column.label，最后回退 column.name。
 */
export function resolveTableHeaderText(options: {
  labelRegion: unknown;
  label: unknown;
  name: unknown;
}): { labelContent: ReactNode; columnLabelText: string } {
  const labelContent =
    asReactNode(options.labelRegion) ??
    (options.label as ReactNode) ??
    (options.name as ReactNode);
  const columnLabelText =
    typeof options.label === 'string' ? options.label : String(options.name ?? '');
  return { labelContent, columnLabelText };
}

/** labelRegionKey → region 的解析（与上文 labelContent 配套）。 */
export function resolveLabelRegion(
  regions: Readonly<Record<string, { render: () => unknown }>> | undefined,
  labelRegionKey: unknown,
): { render: () => unknown } | undefined {
  return typeof labelRegionKey === 'string'
    ? regions?.[labelRegionKey]
    : undefined;
}
