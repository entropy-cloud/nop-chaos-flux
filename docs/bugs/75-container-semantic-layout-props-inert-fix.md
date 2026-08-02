# 75 Container Semantic Layout Props Inert Fix（bug 73 模式：单测绿但真机失效）

## Problem

`container` 的语义布局 props（`direction`/`wrap`/`align`/`gap`/`responsiveDirection`/`responsiveWrap`）在真实浏览器中**全部视觉失效**：`direction: 'row'` 不横排、`gap` 不生效、`wrap` 不换行。单测全部通过（断言 `data-direction="row"` 等属性存在），但没有任何 CSS 消费这些属性，`default-spacing.css` 又无条件强制 `flex-direction: column`——典型 bug 73 模式「单测绿但真机失败」。

## Diagnostic Method

- 先比对实现与 owner 文档：`styling-system.md` §641-648 明确记载语义 prop → Tailwind 类映射表（`direction → flex-row/flex-col`、`gap → gap-*`、`align → items-* justify-*`）；`container/design.md` §12/§16 与 `container-spacing-design.md` §130 均承诺类覆盖。实现却只输出 data 属性。
- 全仓 grep `data-direction|data-flex` 于 CSS：零命中——确认无消费方（与 drawer/flow-designer 的 `data-direction` 消费点对比）。
- `git log` 定位引入点：07-28 audit-remediation（fea7813e）把语义类输出整体替换为 data 属性，误读「marker-only」为「不输出任何语义类」；测试同步冻结了错误基线（`layout-styling-contract.test.tsx` 断言 `body.className === ''`）。
- 对照同族 `flex` renderer（仍输出 `flex-col`/`gap-4` 等类且正确）确认是 container 单点回归而非公共机制问题。

## Root Cause

- 07-28 fea7813e 过度修正样式契约：container flex-child 路径的语义类（`flex`/`flex-row`/`flex-col`/`flex-wrap`/`items-*`/`justify-*`/`gap-*`/inline gap style）被整体删除，仅留 `data-*` 状态属性；
- `flux-react/src/default-spacing.css` `.nop-container > [data-slot='container-body']` 无条件 `flex-direction: column` + 默认 gap，schema 显式声明的语义 props 无任何覆盖路径；
- 冻结测试只断言属性存在，未断言 class/computed style，掩盖了视觉失效（bug 73 模式）。

## Fix

- `container.tsx` 恢复语义类输出（与 `flex` 同款解析器）：`resolveDirection`/`resolveGap`/`resolveResponsiveDirection`/`resolveResponsiveWrap` + `align` 的 `items-* justify-*` 映射（按 styling-system.md §641-648）；
- `data-*` 属性保留（host-visible 状态 marker，既有测试兼容）；
- 更新冻结错误基线断言（`layout-styling-contract.test.tsx` gap-only 用例 `className === ''` → 断言 `gap-2` 且无方向类；direction row/column 用例补类断言），`flex-responsive.test.tsx` container 用例补类断言。

## Tests

- 新增回归测试 `packages/flux-renderers-basic/src/__tests__/audit-family-regressions.test.tsx` container describe（10 用例）：direction row/column → `flex-row`/`flex-col`、wrap → `flex-wrap`、gap token → `gap-4`、numeric gap → inline px、align center → `items-center justify-center`、responsiveDirection/Wrap → 断点类、裸路径无类、根 marker 不被污染——先红后绿（test-first）。
- 既有测试更新：`layout-styling-contract.test.tsx`、`flex-responsive.test.tsx`。
- 验证：basic 包 typecheck/build/lint/test 452 全绿；workspace 31/31/31/58 全绿。

## Related

- Plan: `docs/plans/2026-08-02-2043-2-c1-1-basic-structure-core-family-audit.md`（container 审计卡 P1-1）
- 审计卡: `docs/audits/per-component/container.md`
