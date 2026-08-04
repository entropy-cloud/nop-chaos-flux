# 审计卡：empty（flux-renderers-content）

> 状态: closed
> 审查日期: 2026-08-04
> 审查 plan: `docs/plans/2026-08-04-0841-3-c6-2-content-status-feedback-family-audit.md`
> 注册定义: `packages/flux-renderers-content/src/content-renderer-definitions.ts:86` | 渲染器: `packages/flux-renderers-content/src/empty.tsx:24` | design.md: `docs/components/empty/design.md` | playground: `apps/playground/src/component-lab/renderers/empty-lab-page.tsx` | e2e: `tests/e2e/w1b-feedback-family.spec.ts`（empty 场景）、`tests/e2e/component-lab/c6-2-host-surfaces.spec.ts`

## 组件身份

empty / flux-renderers-content / EmptySchema（`schemas.ts:79-89`）/ defaultSchema `{type:'empty'}` / 表单参与: 无 / widget 展示 renderer（自样式，`data-slot="empty"`）

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                                | 发现 |
| --- | --------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | Schema 契约                 | pass | 注册项 `content-renderer-definitions.ts:86-98` fields（title/description value-or-region、image prop、actions region）与 EmptySchema `schemas.ts:79-89` 一致                                                                                        | —    |
| 2   | RendererComponentProps 合规 | pass | `empty.tsx:24-52` 仅读 props.props/meta/regions；无 store 访问                                                                                                                                                                                      | —    |
| 3   | 值所有权三态                | n-a  | 展示型无值所有权（design.md §7）                                                                                                                                                                                                                    | —    |
| 4   | 表单参与                    | n-a  | 非表单字段                                                                                                                                                                                                                                          | —    |
| 5   | DOM 与选择器契约            | pass | 根 `nop-empty` marker（`empty.tsx:42`）+ ui Empty `data-slot="empty"` + title/description/actions slot（`empty-title`/`empty-description`/`empty-content` 由 ui 层输出，`packages/ui/src/components/ui/empty.tsx:21/:61/:69/:84`）；testid/cid 透传 | —    |
| 6   | 嵌套 schema 分类            | pass | title/description value-or-region（定义 `:93-94`）、actions region（`:96`）、image prop——08-02 机制一致；无 deepFields 残留                                                                                                                         | —    |
| 7   | 事件与 action 契约          | pass | 组件自身无事件（design.md §8）；交互在 actions region 内嵌 action（宿主 CTA 派发，host-empty-cta 实证）                                                                                                                                             | —    |
| 8   | a11y                        | pass | 无交互语义（纯展示）；icon aria-hidden（`empty.tsx:21`）；title/description 文本 AT 可读                                                                                                                                                            | —    |
| 9   | i18n                        | pass | title fallback `t('flux.common.noData')`（`empty.tsx:26-28`）——key 双 locale 存在；无其他硬编码文案                                                                                                                                                 | —    |
| 10  | 四态覆盖                    | pass | 空 title → 默认文案；无 loading/error/disabled 语义（纯空态组件，四态中"空态"即本体）                                                                                                                                                               | —    |
| 11  | 异步生命周期                | n-a  | 无异步                                                                                                                                                                                                                                              | —    |
| 12  | 组合宿主场景                | pass | w1b empty CTA 场景 + **c6-2 宿主 host-empty-cta（actions 内嵌 button action 派发 + 文案/slot 渲染）**——programmatic DOM 断言                                                                                                                        | —    |
| 13  | 样式契约                    | pass | widget 自样式（ui Empty 视觉壳）；`cn()` 合并（`empty.tsx:42`）；无 BEM                                                                                                                                                                             | —    |
| 14  | React 19 规范               | pass | 纯函数组件，无 memo/effect                                                                                                                                                                                                                          | —    |
| 15  | 性能边界                    | pass | 无订阅/监听器                                                                                                                                                                                                                                       | —    |
| 16  | 测试质量                    | pass | empty.test.tsx 4 用例断言正确行为（title/description 渲染、fallback、actions region、无 actions 省略 slot）；无 not-throw 空断言                                                                                                                    | —    |
| 17  | 文档对照                    | pass | design.md ↔ 实现一致（字段 §4/§5、regions §6、marker §10）                                                                                                                                                                                          | —    |
| 18  | 注册、包边界与 IO/安全红线  | pass | 定义 `:86` + index.ts 导出 + registerContentRenderers；无浏览器 IO；无 dangerouslySetInnerHTML；demo 宿主 `w1b-content-feedback-demo.tsx:86` + lab 页（Phase 3 补）                                                                                 | —    |

## 发现清单

- [P2-1] lab 页缺失（维度 18 缺口）→ 状态: fixed（Phase 3 补 `empty-lab-page.tsx`）

## 组合宿主场景（真实浏览器验证）

- 场景: empty actions CTA 触发 action（host-empty-cta，c6-2-host-surfaces.spec.ts） | 断言: CTA 点击 → 内嵌 action 派发（报告 flag 翻转）| 结果: **pass**

## 修复记录

- P0/P1: 无。P2-1 lab 页 Phase 3 补齐。
- 验证: `pnpm --filter @nop-chaos/flux-renderers-content typecheck/build/lint/test` 全绿（248 → 254 tests）；w1b-feedback-family 5/5 + c6-2 宿主 7/7 回归。

## Closure

- 独立 closure audit: 待 mission-driver CLOSURE_VERIFY fresh session（证据位置: plan Closure 节）
