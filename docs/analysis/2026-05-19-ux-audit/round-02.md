# UI/UX 设计合规性审查 — Round 02（递归扩展）

> 审查日期：2026-05-19
> 基于 Round 01 的 5 条发现，继续深挖尚未覆盖的盲区

---

## 新发现

### [视角6-1] CRUD 工具栏 PaginationNext 在最后一页未禁用，与 PaginationPrevious 不对称

- **文件**: `packages/flux-renderers-data/src/crud-renderer-toolbar.tsx:115-131`
- **证据片段**:
  ```tsx
  // PaginationPrevious — 正确禁用，页码 <= 1:
  <PaginationPrevious
    text={t('flux.pagination.previous')}
    onClick={() => onPageChange(Math.max(1, pagination.currentPage - 1))}
    className={pagination.currentPage <= 1 ? 'pointer-events-none opacity-50' : undefined}
  />
  // ...
  // PaginationNext — 没有禁用样式，没有边界检查:
  <PaginationNext
    text={t('flux.pagination.next')}
    onClick={() => onPageChange(pagination.currentPage + 1)}
  />
  ```
- **严重程度**: MEDIUM
- **现状**: `PaginationPrevious` 按钮在第 1 页通过 `pointer-events-none opacity-50` 视觉禁用。`PaginationNext` 按钮在最后一页没有禁用样式、没有 `aria-disabled`，也没有边界保护。点击它会调用 `onPageChange(currentPage + 1)`，无论是否还有更多数据。
- **行业惯例**: shadcn/ui 的 PaginationNext（如 `table-pagination-bar.tsx:138-145`）在最后一页使用 `aria-disabled`、`pointer-events-none` 和 `opacity-50`。Ant Design Pagination 和 MUI TablePagination 都对称处理 Previous 和 Next 禁用状态。
- **用户影响**: 在第 1 页时，Previous 变暗且不可点击；在最后一页时，Next 看起来完全激活并可点击。用户点击 Next 后会看到空的表格或无意义的状态。这种不对称性使用户困惑是否还有更多页面。
- **建议**: 计算 `isLastPage = summary.total != null && pagination.currentPage >= Math.ceil(summary.total / pagination.pageSize)`。为 PaginationNext 添加 `className={isLastPage ? 'pointer-events-none opacity-50' : undefined}` 和 `aria-disabled={isLastPage || undefined}`，与 table-pagination-bar.tsx:138-145 中的模式一致。
- **复核状态**: 未复核

---

### [视角9-1] tree-renderer treeitem 缺少 focus-visible 焦点环，与同代码库的 tree-controls 不一致

- **文件**: `packages/flux-renderers-data/src/tree-renderer.tsx:221-222`
- **证据片段**:
  ```tsx
  // tree-renderer.tsx — treeitem div，无 focus-visible ring:
  <div
    className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
    role="treeitem"
    tabIndex={isTabbable ? 0 : -1}
    ...
  >
  ```
  对比 `packages/flux-renderers-form-advanced/src/tree-controls.tsx:53-58`：
  ```tsx
  // tree-controls.tsx — TreeOptionNode，有 focus-visible ring:
  <div
    className={cn(
      'flex w-full items-center rounded-md py-1.5 pr-2 text-sm',
      props.disabled ? 'opacity-50' : 'cursor-pointer',
      checked ? 'bg-muted' : 'hover:bg-muted',
      'focus-visible:ring-2 focus-visible:ring-ring',
    )}
    role="treeitem"
    ...
  >
  ```
- **严重程度**: MEDIUM
- **现状**: `tree-renderer` 的 TreeNodeRenderer 在 `role="treeitem"` div 上有 `hover:bg-muted` 但没有 `focus-visible` 样式。由于 Tailwind CSS reset 移除了默认浏览器焦点轮廓，键盘用户在树节点间导航时看不到任何焦点指示。树的焦点管理通过 tabIndex 轮换和 focusNode() 编程式处理，但没有可见反馈。
- **行业惯例**: shadcn/ui 组件（包括本项目自己的 tree-controls.tsx）一致使用 `focus-visible:ring-2 focus-visible:ring-ring` 指示焦点。Ant Design Tree 显示蓝色焦点轮廓。MUI TreeItem 在焦点态渲染可见轮廓。
- **用户影响**: 仅键盘用户（Tab 进入树，箭头键导航）不会看到任何视觉焦点指示，无法知道哪个节点被选中直到按回车激活。仅鼠标用户不受影响。但在同一应用中 tree-controls 有焦点环，造成可见的不一致性。
- **建议**: 在 tree-renderer.tsx 第 222 行的 className 中添加 `focus-visible:ring-2 focus-visible:ring-ring`。可选同时添加 `focus-visible:bg-accent`。匹配 tree-controls.tsx:58 已使用的模式。
- **复核状态**: 未复核
