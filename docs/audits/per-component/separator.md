# 审计卡：separator（flux-renderers-content）

> 状态: closed
> 审查日期: 2026-08-04
> 审查 plan: `docs/plans/2026-08-04-0841-3-c6-2-content-status-feedback-family-audit.md`
> 注册定义: `packages/flux-renderers-content/src/content-renderer-definitions.ts:45` | 渲染器: `packages/flux-renderers-content/src/separator.tsx:6` | design.md: `docs/components/separator/design.md` | playground: `apps/playground/src/component-lab/renderers/separator-lab-page.tsx` | e2e: `tests/e2e/w1b-feedback-family.spec.ts`（separator 场景）、`tests/e2e/component-lab/c6-2-host-surfaces.spec.ts`

## 组件身份

separator / flux-renderers-content / SeparatorSchema（`schemas.ts:44-52`）/ defaultSchema `{type:'separator'}` / 表单参与: 无 / widget 展示 renderer（自样式，`data-slot="separator"`）

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                        | 发现 |
| --- | --------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | Schema 契约                 | pass | 注册项 `content-renderer-definitions.ts:45-56` fields（orientation/decorative prop、label value-or-region）与 SeparatorSchema `schemas.ts:44-52` 一致                                                                                       | —    |
| 2   | RendererComponentProps 合规 | pass | `separator.tsx:6-47` 仅读 props.props/meta/regions；无 store 访问                                                                                                                                                                           | —    |
| 3   | 值所有权三态                | n-a  | 展示型无值所有权（design.md §7）                                                                                                                                                                                                            | —    |
| 4   | 表单参与                    | n-a  | 非表单字段                                                                                                                                                                                                                                  | —    |
| 5   | DOM 与选择器契约            | pass | 根 `nop-separator` marker（`:26/:43`）+ `data-slot="separator"` + 无 label 变体 `aria-orientation`（base-ui 输出）+ label 变体 `data-orientation="horizontal"`（`:25`）；label slot `data-slot="separator-label"`（`:29`）；testid/cid 透传 | —    |
| 6   | 嵌套 schema 分类            | pass | label value-or-region（定义 `:54`）——08-02 机制一致；无 deepFields 残留                                                                                                                                                                     | —    |
| 7   | 事件与 action 契约          | n-a  | 无事件（design.md §8）                                                                                                                                                                                                                      | —    |
| 8   | a11y                        | pass | decorative → `aria-hidden` + `role="none"`（`separator.tsx:13` + 测试 :34-43）；无 label 时 base-ui role="separator" + aria-orientation；label 变体为纯视觉水平分隔（设计注 :14-16 记录垂直+label 无意义 → 强制水平）                       | —    |
| 9   | i18n                        | pass | 无硬编码文案（label schema 驱动）                                                                                                                                                                                                           | —    |
| 10  | 四态覆盖                    | pass | 空 label → 无 label 变体；无 loading/error/disabled 语义（纯分隔线）                                                                                                                                                                        | —    |
| 11  | 异步生命周期                | n-a  | 无异步                                                                                                                                                                                                                                      | —    |
| 12  | 组合宿主场景                | pass | w1b 横/竖分隔线场景 + c6-2 宿主 host-separator（横/竖/带 label/decorative 组合宿主）——programmatic DOM 断言                                                                                                                                 | —    |
| 13  | 样式契约                    | pass | widget 自样式（ui Separator + label 变体 flex 布局）；`cn()` 合并（`:26/:43`）；无 BEM                                                                                                                                                      | —    |
| 14  | React 19 规范               | pass | 纯函数组件，无 memo/effect                                                                                                                                                                                                                  | —    |
| 15  | 性能边界                    | pass | 无订阅/监听器                                                                                                                                                                                                                               | —    |
| 16  | 测试质量                    | pass | separator.test.tsx 5 用例断言正确行为（默认水平/垂直透传/decorative 映射/label 强制水平/testid 透传）；无 not-throw 空断言                                                                                                                  | —    |
| 17  | 文档对照                    | pass | design.md ↔ 实现一致（字段 §4/§5、marker §10、label 语义边界 §12）                                                                                                                                                                          | —    |
| 18  | 注册、包边界与 IO/安全红线  | pass | 定义 `:45` + index.ts 导出 + registerContentRenderers；无浏览器 IO；demo 宿主 `w1b-content-feedback-demo.tsx:47` + lab 页（Phase 3 补）                                                                                                     | —    |

## 发现清单

- [P2-1] lab 页缺失（维度 18 缺口）→ 状态: fixed（Phase 3 补 `separator-lab-page.tsx`）
- [P3-1] decorative + label 并存时 label 变体忽略 decorative（`:9-13` 映射仅作用于无 label 分支）——垂直/带文案分隔线 incoherent 组合，行为可接受（label 强制水平已记录设计注）→ 状态: keep（P3 卡内记录）

## 组合宿主场景（真实浏览器验证）

- 场景: separator 横/竖/带 label/decorative 组合（host-separator，c6-2-host-surfaces.spec.ts） | 断言: aria-orientation/role 契约 + label 变体 data-orientation | 结果: **pass**

## 修复记录

- P0/P1: 无。P2-1 lab 页 Phase 3 补齐。
- 验证: `pnpm --filter @nop-chaos/flux-renderers-content typecheck/build/lint/test` 全绿（248 → 254 tests）；w1b-feedback-family 5/5 + c6-2 宿主 7/7 回归。

## Closure

- 独立 closure audit: 待 mission-driver CLOSURE_VERIFY fresh session（证据位置: plan Closure 节）
