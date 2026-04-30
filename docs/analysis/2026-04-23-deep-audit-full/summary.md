# 深度审核汇总报告

## 审核范围

- 执行的维度：01-18 全量
- 覆盖的包：workspace `packages/*` 与相关 `apps/playground`
- 审核日期：2026-04-23
- 执行方式：18 个初审子 agent + 18 个维度复核子 agent + 9 个子项复核子 agent

## 复核统计

- 初审发现总数：109
- 已独立复核条目数：93
- 维度级复核完成数：18
- 子项逐条复核数：9
- 批量复核覆盖条目数：0
- 保留：55
- 降级：32
- 驳回：6

## P0 清单

- 本轮未确认需要按 P0 处理的条目。

## P1 清单（按文件/主题归并）

| 主题                                                   | 关键文件                                                                                                                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [已修复] Report Designer workbook source-of-truth 分叉 | `packages/report-designer-renderers/src/page-renderer.tsx`, `packages/report-designer-core/src/core.ts`, `packages/report-designer-core/src/core-dispatch.ts` |
| [已修复] object-field async 回写竞态                   | `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`                                                                                  |
| [已修复] validation external errors owner 边界缺失     | `packages/flux-runtime/src/form-runtime-owner.ts`, `packages/flux-runtime/src/form-runtime.ts`                                                                |
| [已修复] submit-only 错误可见性错误                    | `packages/flux-react/src/field-error-visibility.ts`, `packages/flux-runtime/src/form-runtime-submit-flow.ts`                                                  |
| [已修复] report-designer action DTO/type 混淆          | `packages/report-designer-renderers/src/inspector-shell-renderer.tsx`, `packages/report-designer-core/src/types.ts`                                           |
| >700 行必须拆分文件                                    | `packages/flux-runtime/src/async-data/data-source-runtime.ts`, `packages/flux-formula/src/compile.ts`, `packages/flux-action-core/src/action-dispatcher.ts`   |

## 高频问题文件

| 文件                                                                         | 命中维度           |
| ---------------------------------------------------------------------------- | ------------------ |
| `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx` | 04, 05, 06         |
| `packages/flux-runtime/src/form-runtime-owner.ts`                            | 02, 08             |
| `packages/report-designer-renderers/src/page-renderer.tsx`                   | 09, 12, 18         |
| `packages/report-designer-renderers/src/inspector-shell-renderer.tsx`        | 05, 09, 13         |
| `packages/flow-designer-renderers/src/designer-page.tsx`                     | 02, 05, 07, 10, 12 |
| `packages/flux-code-editor/src/code-editor-renderer.tsx`                     | 09, 10, 12         |

## 跨维度模式

- owner/source-of-truth 分裂：`object-field`、Report Designer workbook、`$crud`/statusPath 导出机制
- root meta / className / marker / slot 契约收口不一致：host renderer、code-editor、report designer
- runtime/documentation 演进后，旧兼容层与 stale artifacts 未完全清理：`CompiledSchemaNode`、completed plan checklist 等仍需后续收口
- 测试与 docs 导航的“过渡态留痕”较多：测试跨包导入、component-lab smoke；active docs 的 `app.tsx` 路径残留已在本轮修正

## 已自动化的检查项

- 超大代码文件阈值已有 `pnpm check:oversized-code-files`
- `pnpm lint` 已有 `max-lines: 700`
- 第一方源码中的 `eval/new Function` 本轮未命中

## 建议新增的自动化检查

- 禁止测试使用跨包相对 `src` 导入；优先强制包名或公开子路径
- completed plan hygiene 检查：`Plan Status: completed` 时 validation checklist 不得残留未勾项
- active docs 中的 playground 入口路径有效性检查（`app.tsx`）
- 对 namespaced action DTO 做 shape 诊断，拦截 `{ type: ... }` 被当 `ActionSchema` 直接 dispatch
- 针对 `showErrorOn: submit` 的行为回归测试

## 可暂缓项

- `structural-loop` 的虚拟化/窗口化要求，应先明确组件边界再决定是否升级
- `flow-designer-core` 是否收敛到 Zustand vanilla store，可放在更大规模 store API 收敛计划中处理
- `theme-tokens` 空 root JS 入口是否保留，需与资产包导出约定统一考虑

## 误报排除清单

- `dialog.tsx` / `drawer.tsx` 的 controlled/uncontrolled open 桥接不构成状态 owner 冲突
- `word-editor-core` 对 canvas-editor 的 vendor 透传属于当前架构基线，不单独视为 API 违约
- `crud-renderer.tsx` 内部 `nop-crud-*` 结构 marker 仍在当前组件文档契约内
- `SidebarRail` 的原生 `<button>` 更像 UI 库内部低层 affordance，不与业务层 raw button 同等处理
