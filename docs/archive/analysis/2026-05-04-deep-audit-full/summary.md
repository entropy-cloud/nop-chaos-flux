# 深度审核汇总报告

## 审核范围

- 执行的维度：01-18 全量
- 覆盖的包：workspace `packages/*` 与 `apps/playground`
- 审核日期：2026-05-04
- 执行方式：18 个初审子 agent + 18 个维度复核子 agent + 21 个子项复核子 agent

## 复核统计

- 初审发现总数：37
- 已独立复核条目数：37
- 维度级复核完成数：18
- 子项逐条复核数：21
- 批量复核覆盖条目数：0
- 保留：17
- 降级：16
- 驳回：4

## P0 清单

- 本轮未确认需要按 P0 处理的条目。

## P1 清单（按文件/主题归并）

| 主题                                                       | 关键文件                                                                                                                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| submit 流程的 pre-cleanup abort/reject 会卡住 `submitting` | `packages/flux-runtime/src/form-runtime-submit-flow.ts`                                                                                                       |
| `validateForm()` 静默跳过 rejected validator promise       | `packages/flux-runtime/src/form-runtime-owner.ts`, `packages/flux-runtime/src/form-runtime-validation.ts`                                                     |
| active docs 把 bare `validate` 当 built-in action          | `docs/architecture/action-scope-and-imports.md`, `packages/flux-core/src/constants.ts`, `packages/flux-action-core/src/action-dispatcher/built-in-actions.ts` |

## 高频问题文件

| 文件                                                              | 命中维度 |
| ----------------------------------------------------------------- | -------- |
| `packages/flux-runtime/src/form-runtime-submit-flow.ts`           | 06       |
| `packages/flux-runtime/src/form-runtime-owner.ts`                 | 06, 08   |
| `packages/flux-react/src/field-frame.tsx`                         | 08, 12   |
| `packages/flux-react/src/node-frame-wrapper.tsx`                  | 09, 12   |
| `packages/report-designer-renderers/src/field-panel-renderer.tsx` | 05, 10   |
| `docs/architecture/action-scope-and-imports.md`                   | 17       |

## 跨维度模式

- validation / submit 异常路径仍有“失败被折叠成继续运行或状态未清理”的问题
- `FieldFrame` / `frameWrap` / renderer root meta 的契约边界尚未完全收口
- workbench host surface 还存在 coarse subscription、主题变量未完全落地、以及 mixed-language shell text
- active docs 在 plan 归档与 action 命名收敛后仍有残留 drift

## 已自动化的检查项

- 超大代码文件阈值已有 `pnpm check:oversized-code-files`
- `pnpm lint` 已有 `max-lines: 700`
- 第一方源码中的 `eval/new Function` 本轮未命中

## 建议新增的自动化检查

- active docs broken-link 检查，尤其针对 `docs/plans/*` 已归档路径
- `frameWrap: 'none'` 下 root `meta.className/testid/cid` 保留的回归测试
- submit 流程对 child validation reject / validator crash 的 cleanup 与 failure-path 回归测试
- 针对 workbench shell 的 whole-scope selector lint/check（如 `useOwnScopeSelector((data) => data)`）

## 可暂缓项

- `report-field-panel.css` 的 token 化与 renderer 路径 CSS 接线可放在同一轮样式收口中处理
- spreadsheet interaction hook 的直接 contract tests 建议补齐，但不应挤占高优先级 runtime/validation 修复
- Flow Designer graph-mode fallback 的 O(E^2) 路径当前更适合作为后续性能债清理

## 误报排除清单

- `variant-field` 的 `userSelectedKey/detectedKey` 没有越过第二事实源门槛
- `word-editor-page` 的 live extras vs persisted snapshot 不是双状态 owner 冲突
- `code-editor` 的字面量主题色当前更接近 widget-owned style 收敛项，不单独作为主问题保留
- `SidebarRail` 与 playground panel toggle 的 raw `<button>` 未越过 raw-HTML 校准门槛
- `report-inspector.body` 的 prop-based schema carrier 属于当前已接受建模
