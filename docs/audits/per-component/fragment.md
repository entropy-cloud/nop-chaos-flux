# 审计卡：fragment（flux-renderers-basic）

> 状态: closed
> 审查日期: 2026-08-02
> 审查 plan: `docs/plans/2026-08-02-2043-3-c1-2-basic-structure-extension-family-audit.md`
> 注册定义: `packages/flux-renderers-basic/src/basic-renderer-definitions.ts:81` | 渲染器: `packages/flux-renderers-basic/src/fragment.tsx:6` | design.md: `docs/components/fragment/design.md` | playground: `apps/playground/src/component-lab/renderers/fragment-lab-page.tsx` | e2e: `tests/e2e/component-lab/layout-content.spec.ts:74`

## 组件身份

fragment / flux-renderers-basic / FragmentSchema（`schemas.ts:180`）/ `{type:'fragment', body:[]}` / 表单参与: 无 / 无 UI 结构分组节点（无 DOM 壳层、无 marker）

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                   | 发现                                                                         |
| --- | --------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | Schema 契约                 | pass | `basic-renderer-definitions.ts:87-91` fields body(region)/data(prop)/isolate(prop) ↔ `schemas.ts:180-185`（body/data/isolate）；defaultSchema `{type:'fragment', body:[]}`；staticCapable: true                                        | —                                                                            |
| 2   | RendererComponentProps 合规 | pass | `fragment.tsx:6-20` 仅读 props.regions.body / props.props.data/isolate / props.id / props.helpers；无 store 直接访问                                                                                                                   | —                                                                            |
| 3   | 值所有权三态                | n-a  | —                                                                                                                                                                                                                                      | fragment 无值所有权；data 是 own scope patch（design.md §7），非 owner state |
| 4   | 表单参与                    | n-a  | —                                                                                                                                                                                                                                      | 非表单字段                                                                   |
| 5   | DOM 与选择器契约            | pass | `fragment.tsx:7-19` 渲染 React fragment（`<>`），无自有 DOM 节点；design.md §11 明确"不给 fragment 分配 nop-fragment 视觉 marker"，无 marker 是设计内语义；子节点各自携带自身 marker/data-renderer                                     | —                                                                            |
| 6   | 嵌套 schema 分类            | pass | `basic-renderer-definitions.ts:88` body → region；data/isolate → prop；无 deepFields 残留；`when` 走 BaseSchema → meta 门控（设计内）                                                                                                  | —                                                                            |
| 7   | 事件与 action 契约          | n-a  | —                                                                                                                                                                                                                                      | fragment 无事件                                                              |
| 8   | a11y                        | n-a  | —                                                                                                                                                                                                                                      | 无 UI                                                                        |
| 9   | i18n                        | n-a  | —                                                                                                                                                                                                                                      | 无文案                                                                       |
| 10  | 四态覆盖                    | pass | 空 body → null（fragment.tsx:18-19）；data/isolate 组合测试 `basic-structural.test.tsx:16-57`；when=false 子树整体不激活（flux-guide/07-structural-nodes.md §Fragment）                                                                | —                                                                            |
| 11  | 异步生命周期                | n-a  | —                                                                                                                                                                                                                                      | 无异步                                                                       |
| 12  | 组合宿主场景                | pass | loop body 内 fragment+when 条件分组（`basic-structural.test.tsx:280-321` recurse 宿主）；e2e `layout-content.spec.ts:74-98`（data 合并/isolate 隔离真机断言）；fragment 自身无 scope 上下文依赖                                        | —                                                                            |
| 13  | 样式契约                    | pass | 无任何 class/style 输出（无壳层）；`check:audit-styling-suspects` 0 命中（本族）                                                                                                                                                       | —                                                                            |
| 14  | React 19 规范               | pass | 纯函数组件，无 memo/callback/effect（fragment.tsx 全文 21 行）                                                                                                                                                                         | —                                                                            |
| 15  | 性能边界                    | pass | 无订阅/监听器；scopeKey `fragment:${id}` 稳定                                                                                                                                                                                          | —                                                                            |
| 16  | 测试质量                    | pass | `basic-structural.test.tsx:16-57`（继承 scope/data+isolate 断言正确行为）、`basic-coverage-gaps.test.tsx`、e2e fragment 2 用例真机断言；scope 身份回归见 `docs/references/architecture-guardrails-from-bugs.md`（bug 03 已修复并回归） | —                                                                            |
| 17  | 文档对照                    | pass | design.md §1-12 与实现逐项一致（无 UI 分组/data/isolate/when 用法/与 container 边界）；flux-guide/07-structural-nodes.md Fragment 示例与实现一致；quick-reference 无组件级词条（类型/hooks 参考，非组件目录）                          | —                                                                            |
| 18  | 注册、包边界与 IO/安全红线  | pass | 注册 basic-renderer-definitions.ts:81；导出 index.tsx:15；playground fragment-lab-page.tsx + renderer-lab-registry.ts:72；无浏览器 IO；无 HTML 输出（无 sanitize 需求）                                                                | —                                                                            |

## 发现清单

- 无 P0/P1/P2 发现。P3 无（实现与 design.md 完全一致，且为全族最简组件）。

## 组合宿主场景（真实浏览器验证）

- 场景: loop body 内 fragment+when 递归条件分组（recurse 宿主链路）| 断言: programmatic DOM 文本断言 | 结果: **pass**（`layout-content.spec.ts` fragment/recurse 用例 + Phase 3 `c1-2-host-surfaces.spec.ts` 行 scope 场景，见修复记录）

## 修复记录

- 本卡无修复项；Phase 3 宿主场景覆盖 fragment 在 loop/recurse 中的宿主行为（见 `tests/e2e/component-lab/c1-2-host-surfaces.spec.ts`）。

## Closure

- 独立 closure audit: 见 plan `2026-08-02-2043-3` Closure Audit Evidence（由独立子 agent fresh session 执行，执行 session 不自审）。
