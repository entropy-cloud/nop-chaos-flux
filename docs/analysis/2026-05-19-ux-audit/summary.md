# UI/UX 设计合规性审查汇总报告

## 审查范围

- 扫描的包：flux-renderers-form, flux-renderers-form-advanced, flux-renderers-data, flux-renderers-basic
- 审查日期：2026-05-19
- 执行方式：4 轮迭代发现 + 独立复核

## 发现统计

- 总轮次：4（R01-R03 有发现，R04 收敛零发现）
- 深挖总发现数：10
- 复核后保留：9（MEDIUM: 8, LOW: 1）
- 降级：1（LOW→INFO）
- 驳回：0

## 快速修复项（Quick Wins，<30分钟可修复）

| 编号    | 文件                              | 修复描述                                                         |
| ------- | --------------------------------- | ---------------------------------------------------------------- |
| 视角5-1 | chart-renderer.tsx:308            | 添加 `role="status" aria-live="polite"` 到 loading div           |
| 视角9-1 | tree-renderer.tsx:222             | 添加 `focus-visible:ring-2 focus-visible:ring-ring`              |
| 视角9-2 | fieldset.tsx:56-58                | 添加 `focus-visible:ring-2 focus-visible:ring-ring outline-none` |
| 视角9-3 | table-body-row-rendering.tsx:109  | 给交互行添加 `focus-visible:ring-2 focus-visible:ring-ring`      |
| 视角6-1 | crud-renderer-toolbar.tsx:127-131 | 给 PaginationNext 添加最后一页禁用逻辑                           |
| 视角3-1 | condition-item.tsx:154            | 将 `opacity-0` 改为 `opacity-40`                                 |

## 最大影响修复（Top 3）

1. **视角2-1** — 统一删除按钮样式（影响 4 个组件，跨组件一致性最高优先级）
2. **视角8-1** — 修复 input-number suffix/stepper 重叠（功能性视觉障碍，用户直接受阻）
3. **视角10-1** — 统一分页交互（CRUD vs Table，高频交互路径）

## MEDIUM 清单

| 编号     | 文件                                                                 | 问题                                                       | 行业惯例                                                |
| -------- | -------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------- |
| 视角2-1  | array-editor.tsx, array-field.tsx, key-value.tsx, condition-item.tsx | 删除按钮样式不一致（destructive+文本 vs ghost+Trash2Icon） | shadcn/ui data-table: 行级删除用 ghost+Trash icon       |
| 视角5-1  | chart-renderer.tsx:307-319                                           | chart loading 缺少 aria-live                               | WAI-ARIA: loading 用 role="status" + aria-live="polite" |
| 视角8-1  | input.tsx:536-569                                                    | suffix 和 stepper 视觉重叠                                 | Ant Design InputNumber: suffix 在 stepper 左侧，有间距  |
| 视角10-1 | crud-renderer-toolbar.tsx:108-133                                    | CRUD 与 Table 分页交互不一致                               | Ant Design/MUI: 同一系统分页 UI 统一                    |
| 视角6-1  | crud-renderer-toolbar.tsx:127-131                                    | PaginationNext 最后一页未禁用                              | shadcn/ui Pagination: Next 在最后一页 aria-disabled     |
| 视角9-1  | tree-renderer.tsx:222                                                | treeitem 缺少 focus-visible ring                           | shadcn/ui: 所有可交互元素 focus-visible:ring-2          |
| 视角9-2  | fieldset.tsx:54-66                                                   | 可折叠 legend 缺少 focus-visible                           | WAI-ARIA: role="button" 必须有可见焦点指示              |
| 视角9-3  | table-body-row-rendering.tsx:108-127                                 | Table 交互行缺少 focus-visible                             | Ant Design/MUI Table: 可点击行有焦点指示                |

## LOW 清单

| 编号    | 文件                   | 问题                        | 行业惯例                                         |
| ------- | ---------------------- | --------------------------- | ------------------------------------------------ |
| 视角3-1 | condition-item.tsx:154 | 删除按钮 opacity-0 完全隐藏 | AG Grid: 操作按钮用 opacity-40+hover:opacity-100 |

## 按组件分组

| 组件                                                       | 发现数 | 主要问题类别                  |
| ---------------------------------------------------------- | ------ | ----------------------------- |
| array-editor / array-field / key-value / condition-builder | 1      | 按钮样式一致性                |
| chart-renderer                                             | 1      | loading 状态 ARIA             |
| input-number (input.tsx)                                   | 1      | 视觉重叠                      |
| crud-renderer-toolbar                                      | 2      | 分页交互一致性、Next 按钮禁用 |
| tree-renderer                                              | 1      | 焦点可见性                    |
| fieldset                                                   | 1      | 焦点可见性                    |
| table-renderer (交互行)                                    | 1      | 焦点可见性                    |
| condition-builder (condition-item)                         | 1      | 删除按钮可见性                |

## 跨组件一致性问题

### 1. 删除按钮样式不统一

同一语义操作（行级删除）在 4 个组件中使用两种视觉模式：`array-editor`/`array-field` 使用 `variant="destructive"` + 纯文本；`key-value`/`condition-builder` 使用 `variant="ghost"` + `Trash2Icon`。修复后统一为 ghost 基调 + `hover:text-destructive`，但根据布局语境区分表现形式：行内紧凑布局（array-editor、key-value、condition-item）使用纯图标；卡片列表布局（array-field）使用文字按钮，因删除按钮单独占卡片底部一整行，纯图标显得单薄。

### 2. focus-visible 指示不统一

三个独立的交互元素（tree-renderer treeitem、fieldset legend、table 交互行）缺少 `focus-visible` ring，而同类组件（tree-controls、table-header-row sort trigger、chart interactive）正确实现了 focus-visible。统一标准应为所有 `tabIndex={0}` + `role="button"` 的非原生交互元素添加 `focus-visible:ring-2 focus-visible:ring-ring`。

### 3. 分页 UI 不统一

CRUD toolbar 使用简化分页（Prev/Next+纯文本），Table 使用完整分页（页码按钮+省略号）。且 CRUD 的 PaginationNext 缺少最后一页禁用逻辑。

## 建议的统一设计规范

1. **行级删除按钮**：统一使用 `variant="ghost"` + `hover:text-destructive` 基调。行内紧凑布局使用 `Trash2Icon` 纯图标；卡片列表布局（删除按钮单独占一整行）使用文字按钮。仅批量删除或不可逆操作使用 `variant="destructive"` + 确认对话框。
2. **可交互元素焦点指示**：所有 `tabIndex={0}` 的非原生交互元素必须添加 `focus-visible:ring-2 focus-visible:ring-ring outline-none`。
3. **分页组件**：CRUD 和 Table 应使用相同的分页组件实例，确保交互一致。
4. **Loading 状态**：所有替换内容区域的 loading 指示器使用 `role="status" aria-live="polite"` + `Spinner`。

## 被驳回 / 降级模式复盘

| 编号    | 判定          | 复盘说明                                                                                                                                                   |
| ------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 视角9-4 | 降级 LOW→INFO | `tabIndex=-1` 的元素虽缺少 focus-visible，但实际导航路径不直接聚焦该元素，实际触发概率极低。未来审查应明确区分"用户可达的焦点元素"和"程序化管理的内部元素" |

## 对 deep-audit 的依赖

无。所有发现均为独立的 UX/交互质量问题，不依赖 deep-audit 修复后才能解决。

## 可暂缓项

1. `table-pagination-bar.tsx` 的分页信息可能需要 i18n 翻译
2. `detail-surface.tsx` 确认/取消按钮顺序（Cancel-then-Confirm）符合 shadcn/ui 惯例，可接受
3. RadioGroup/CheckboxGroup 的 inline loading indicator 缺少 role="status"（控件 disabled 状态已传达信息，影响极低）
