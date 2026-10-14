import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { CrudSchema } from './crud-schema.js';
import { normalizeToolbarBlocks, resolveToolbarBlocks } from './crud-renderer-toolbar.js';
import { regionHasRendererType } from './crud-query-region.js';
import type { UseCrudPollingResult } from './use-crud-polling.js';

export function resolveCrudToolbarBlockState({
  normalizedSchema,
  props,
  paginationMode,
  isMobile,
  hasListActions,
  pollingState,
}: {
  normalizedSchema: CrudSchema;
  props: RendererComponentProps<CrudSchema>;
  paginationMode: 'pages' | 'infinite';
  isMobile: boolean;
  hasListActions: boolean;
  pollingState: UseCrudPollingResult;
}) {
  const headerBlocksRaw = normalizeToolbarBlocks(normalizedSchema.toolbarLayout, 'header');
  const footerBlocksRaw = normalizeToolbarBlocks(normalizedSchema.toolbarLayout, 'footer');

  const headerBlocks = resolveToolbarBlocks(headerBlocksRaw, paginationMode, isMobile, hasListActions);
  const footerBlocks = resolveToolbarBlocks(footerBlocksRaw, paginationMode, isMobile, hasListActions);

  // footerToolbar/toolbar 区域可能直接放独立 pagination/switch-per-page renderer 节点
  // （如 nop-entropy grid_crud.xpl 生成的 <statistics/>+<pagination/>），
  // 此时同样视为外部分页控件，隐藏表格内置分页栏，避免双分页器。
  const hasRegionPaginationControl =
    [props.regions.footerToolbar, props.regions.toolbar].some((region) =>
      regionHasRendererType(region, 'pagination') || regionHasRendererType(region, 'switch-per-page'),
    );

  const hasExternalPaginationControl =
    headerBlocksRaw.some((b) => b.type === 'pagination' || b.type === 'switch-per-page') ||
    footerBlocksRaw.some((b) => b.type === 'pagination' || b.type === 'switch-per-page') ||
    hasRegionPaginationControl;

  const pollingToggleBlockVisible =
    headerBlocks.some((block) => block.type === 'polling-toggle') ||
    footerBlocks.some((block) => block.type === 'polling-toggle');
  const pollingToggleProps = pollingToggleBlockVisible
    ? {
        visible: true,
        active: pollingState.effectiveEnabled && pollingState.userToggle,
        onToggle: pollingState.toggle,
      }
    : undefined;

  return { headerBlocks, footerBlocks, hasExternalPaginationControl, pollingToggleProps };
}
