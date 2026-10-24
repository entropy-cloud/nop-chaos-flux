# 725 Arc G5I — `dropdown-button` split 模式实现

> Plan Status: completed
> Last Reviewed: 2026-10-24（R1 revised：Blocker-1 mainAction 通道裁决为 (a) event 通道经 `props.events.mainAction` 消费 + design.md §7 就地勘误；Major-2/Minor-3/4/5 采纳——全部落正文）
> Source: `docs/backlog/arc-component-gap-roadmap.md` §6 Wave 3 G5I（依赖 G5D `done`，plan 724）
> Related: 协议权威 `docs/components/dropdown-button/design.md` §2/§4/§7/§10（plan 724 定稿）

## Purpose

按 G5D 协议实现 `split` + `mainAction`：分体触发面（主段派发 / caret 段开菜单）+ focused 单测（判别 + 回归钉）+ lab/e2e + 登记收口。

## Current Baseline（live 实测 2026-10-24）

- `dropdown-button-renderer.tsx`（207 行）：合并态单 trigger（DropdownMenuTrigger render Button + ChevronDown），items 协议/visible/destructive/hover grace 窗口/side-align-offset 全在位。
- `DropdownButtonSchema` schemas.ts:236-263；definition fields `layout-renderer-definitions.ts:401` 起。
- 测试先例 `dropdown-button-renderer.test.tsx` / `dropdown-button-redline.test.tsx`。
- i18n 预期零新 key；caret 段 `aria-label` 复用主段 label（同一控件的菜单触发面，Deferred But Adjudicated 有案）。

## Goals

- `split: true` 时：根 `data-mode="split"` + `role="group"` 包两段；主段（`data-slot="dropdown-button-main"`，普通 button）Enter/Space/点击派发 `mainAction`（无 mainAction 则开菜单——退化）；caret 段（`data-slot="dropdown-button-caret-trigger"`，`aria-haspopup="menu"`）开菜单；合并态 slot（`dropdown-button-trigger`/`caret`）在 split 态不输出。
- 默认（`split` 未声明）行为零变化：既有测试组全绿 + 显式回归钉。
- disabled 整体禁用两段；`trigger: 'hover'` 仅作用于 caret。
- focused 单测 + lab 场景 + e2e + full-green。

## Non-Goals

- 不动 items/visible/destructive 协议；不做 open/close 句柄；不加 i18n key。

## Scope

### In Scope

- `packages/flux-renderers-layout/src/schemas.ts`（`split`/`mainAction` 字段）
- `packages/flux-renderers-layout/src/dropdown-button-renderer.tsx`（split 分支）
- `packages/flux-renderers-layout/src/layout-renderer-definitions.ts`（definition fields）
- `packages/flux-renderers-layout/src/dropdown-button-split.test.tsx`（新 focused 单测）
- `apps/playground/src/component-lab/renderers/`（layout lab 页 split 场景）
- `tests/e2e/`（split 用例）
- `docs/components/existing-components-improvement-analysis.md`（G5 行补 ✅ 实现落地）

### Out Of Scope

- `packages/ui/`；code-editor；matrix；schema validator（`split` 走 definition fields 既有通道）。

## Failure Paths

- 主段无 `mainAction`：退化为开菜单（§7 契约，需测试钉住）。
- split + disabled：两段均 disabled（§7，测试钉住）。

## Test Strategy

本档选择：`必须自动化`（交互契约 + 零漂移回归）：

- 判别组（含主段派发上下文断言：`evaluationBindings` 不含 item/index——§7 契约点名，经 events 派发参数结构保证，判别组主段用例顺带断言）：split schema → `data-mode="split"`、group/main/caret-trigger slot 出现、合并态 trigger slot 不出现；主段点击派发 mainAction（action spy 经 dispatch 通道）；caret 点击开菜单（菜单项出现）；无 mainAction 主段点击开菜单；disabled 两段不可点；hover 模式主段 hover 不开菜单。
- 回归钉：未声明 `split` 的 schema 输出与现状一致（`dropdown-button-trigger`/`caret` 在、`data-mode` 不在）。

## Execution Plan

### Phase 1 — 实现 + focused 单测

Status: planned

- Item Types: `Fix | Proof`

- [x] schemas.ts：`split?: boolean` + `mainAction?: ActionSchema | ActionSchema[]`（:266 区域，含协议注释同 design.md §4）
- [x] layout-renderer-definitions.ts：fields 增 `{ key: 'split', kind: 'prop', valueType: 'boolean' }`、`{ key: 'mainAction', kind: 'event' }`（**Blocker-1 裁决 (a)**：顶层 event 字段走 node-compiler rawEventPlans→compileActions，运行时以 `props.events.mainAction` 呈现——**不经 props.props、无需 unwrapPreservedLiteral**（那是嵌套 fieldRules 信封通道）；存在性探测 `props.events.mainAction != null`；派发 `props.events.mainAction(event, { scope: props.node.scope })`）
- [x] renderer split 分支（根节点 `hoverOpenHandlers` 仅合并态展开，split 态 hover 经 `caretHoverHandlers` 附 caret 段）：`split === true` 时根 `data-mode="split"`，`role="group"`（data-slot dropdown-button-group）包 Button 主段（data-slot dropdown-button-main，onClick dispatch mainAction 或 fallback setOpen(true)）+ DropdownMenuTrigger render caret Button（data-slot dropdown-button-caret-trigger，aria-haspopup，ChevronDown）；hover handlers 仅附 caret；合并态渲染路径零改动
- [x] focused 单测 `dropdown-button-split.test.tsx`（判别 6 + 回归钉 1，见 Test Strategy）；含分隔线衔接（§10 1px 分隔线，widget 自样式，不专测）；caret `aria-label` 复用主段 label、label 缺失时不输出（与合并态一致）

Exit Criteria:

- [x] 包测试全绿（layout 24 文件/160 用例，含新 split 组 7 例；contract-honesty discoveryBaseline eventKeys 8→9——mainAction 为第 9 个已实现引用的 event 契约，守卫语义满足）
- [x] 包 typecheck 通过

### Phase 2 — lab / e2e / 登记收口

Status: planned

- Item Types: `Proof`

- [x] lab 页 split 场景（dropdown-button-lab-page.tsx "Split button (split + mainAction)"）（提交 + 更多操作示例）
- [x] e2e：c5-2-host-surfaces.spec.ts split 用例（data-mode 判别 / 主段派发 split:saved / caret 开菜单 / 合并态 trigger slot 零输出）1 passed（主段点击动作生效 / caret 开菜单）
- [x] improvement-analysis G5 行补 ✅ 实现落地
- [x] 铁律核对结论写入 Closure（example/manifest/index/i18n 逐项）

Exit Criteria:

- [x] e2e 全绿；铁律结论入 Closure 证据节

## Closure Gates

- [x] 所有 in-scope 行为结果已达成（Phase 1/2 Exit 全 [x]）
- [x] 无被静默降级的 in-scope 项
- [x] owner docs 已同步（improvement-analysis ✅；design.md §7 event 通道勘误随本 commit）

Closure Evidence（执行 session 提供）:

- 实现面：schemas `split?/mainAction?` + definition `{ split, prop, boolean }`/`{ mainAction, event }`；renderer split 分支（`data-mode="split"`、`role="group"` group/main/caret-trigger 三 slot、主段 onClick 经 `props.events.mainAction(payload, { event, evaluationBindings: {}, scope })` 派发、无 mainAction 退化 setOpen(true)、hover handlers 仅合并态附根、caret aria-label 复用 label 缺省不输出、圆角衔接 widget 自样式）；test-support 内联 dropdown-button 定义补 split/mainAction（Blocker-1 通道问题在测试面的同一根因）。
- 判别/回归：dropdown-button-split.test.tsx 7 例全绿；layout 包 24 文件/160 用例全绿（contract-honesty 基线 eventKeys 8→9 已更新）。
- 铁律核对：example——dropdown-button 已有 example.json（live 最小示例，split 演示归 lab 场景，不扩）；manifest/index——既有条目已含 dropdown-button，非新 type 无增行；i18n——零新 key（caret aria 复用 label）。
- 执行注（Deferred 观察）：schema `mainAction: undefined`（键存在值 undefined）触发编译异常使节点丢弃——真实 schema 应省略键；判别组 degrade 用例按"键不存在"构造。
- Closure audit R1 = **fail**（agent_a9204975，2 Major：§10 caret slot 判别锚 split 态泄漏、§7 hover-only-caret 被静默窄化）→ 修复：split 态 chevron 去除 slot 标记（design.md §10 细化附注）+ 判别组补 caret slot 缺席断言；split+hover 经 `caretHoverHandlers` 附 caret 段（design.md §7 原语义恢复），hover 用例补 caret hover 开菜单断言；plan :67 复选框补勾（Minor-1 簿记）。修复后 layout 包 24 文件/160 用例全绿、split 组 7/7。
- 门禁（全量复验 2026-10-24）：typecheck/build/lint/test/check 全部 exit 0；e2e split 用例 1 passed。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（R1 fail→R2 approved）
- [x] `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` / `pnpm check`（零新增 red）

## Draft Review Record

- R1（fresh 子 agent `agent_357a6a2b`，2026-10-24）：**`revised`**（1 Blocker：mainAction 通道混述——裁决 (a) event 通道经 `props.events.mainAction` 消费 + design.md §7 就地勘误；1 Major：evaluationBindings 契约补判别断言；3 Minor 全采纳）→ R2 **`approved`**（Blocker/Major 实证消除，残留 2 nit 行号偏差不阻塞）。

## Deferred But Adjudicated

- caret 段 aria-label：复用主段 label（同一控件菜单触发面；不引入 i18n key）。

## Closure

Status Note: 完成——split+mainAction 落地，closure audit R1 fail（2 Major）→ 修复 → R2 approved。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_a9204975，2026-10-24）
- Evidence: R1 **fail**（Major-1：§10 caret slot 判别锚 split 态泄漏且测试无断言；Major-2：§7 hover-only-caret 被静默窄化为 hover 全失效）→ 修复（split 态 chevron 去 slot 标记 + §10 细化附注 + 判别断言；caretHoverHandlers 恢复 caret-only hover + 双向 hover 用例；plan :67 补勾）→ R2 **approved**（两 Major 实证消除，合并态零漂移不受影响，抽查复跑 layout 24 文件/160 用例全绿；残留 R1 已记录 Minor 不阻塞）。
