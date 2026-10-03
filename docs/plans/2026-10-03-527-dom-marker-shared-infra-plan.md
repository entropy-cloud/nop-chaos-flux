# 527 DOM 标记共享基建：data-renderer 中央注入 + frame 协议对齐 + 契约测试 helper

> Plan Status: completed
> Last Reviewed: 2026-10-03
> Source: `docs/architecture/renderer-markers-and-selectors.md`（Universal Root Anchors、Design-Time Frame Protocol）、`docs/backlog/dom-structure-audit-roadmap.md`（W0）
> Related: `docs/audits/dom-structure-checklist.md`；528-536 各包计划（依赖本计划产出的 helper 与注入）

## Purpose

把 DOM 结构契约的三件共享能力一次性建成，供 528-536 各包计划直接引用：所有渲染器根的 `data-renderer` 中央注入（含 portal 内容根）、设计器 frame 的 `nop-frame-${anchor}` 命名对齐、跨包根标记断言 helper。本计划不审计任何具体组件。

## Current Baseline

- `packages/flux-react/src/auto-renderer.tsx:28-29` 已中央注入 `data-testid` / `data-cid`；`data-renderer` 尚无任何中央注入。
- `data-renderer` 目前仅存在于字段族：`packages/flux-react/src/field-frame.tsx:234`（值取 `NodeMetaContext.type`），被 `packages/flux-renderers-form/src/__tests__/field-controls-dom-contract.test.tsx` 冻结。
- **portal 内容根**：basic dialog/drawer 的 portal 根由 flux-react `dialog-host.tsx:374-377` 渲染，已带 `nop-dialog`/`nop-drawer` + `data-testid` + `data-cid`（cid 经 `use-surface-renderer.ts:240-247`），但 AutoRenderer 注入不可达（`DialogRenderer` 自身 return null，`dialog.tsx:5-8`）——`data-renderer` 需在 dialog-host 侧按 surface kind 补齐。
- **设计器 frame 锚定命名空间**：page-designer canvas 的投影节点以 `xui:sid`（`psid-` 前缀 session id，`page-designer-core/src/types.ts:17`）锚定，bridge/overlay 全按 `data-testid^="psid-"` / `data-psid` 查询（`canvas-bridge.tsx:41-58`、`canvas-overlay.tsx:44-60`）；编译期 `data-cid` 与 sid 不同源，canvas 投影节点可以没有 cid。frame 命名因此按"目标元素携带的锚 id"取值：有 `data-cid` 用 cid，否则用 psid sid。
- 契约文本（Universal Root Anchors / Design-Time Frame Protocol）已于 2026-10-03 落入 owner doc。

## Goals

- 任何经 AutoRenderer 路径的渲染器根上都能查到 `data-renderer="<type>"` 与 `data-cid`；portal 内容根（dialog-host 路径）同样三件套齐全。
- 设计器 frame 元素统一为 `id="nop-frame-${anchor}"` + `data-frame-for="${anchor}"`（anchor = 目标 `data-cid`，缺省回退 `data-psid` sid）；查找通道保持既有 `data-psid` 不变；生产渲染路径零 frame 输出。
- 528-536 各包可直接复用一个根标记断言 helper 写 `dom-structure` 契约测试。

## Non-Goals

- 不逐组件审计、不改任何渲染器组件的包装结构（各包计划负责）。
- 不引入 `nop-renderer` 通用 class（owner doc 已明确拒绝）。
- 不改动 FieldFrame 现有属性语义与既有冻结测试的断言内容。
- 不改动 page-designer 的交互行为与锚定通道（仅加 frame 命名/归属属性；`data-psid` 通道不退役）。

## Scope

### In Scope

- `packages/flux-react`：auto-renderer 补 `data-renderer` 中央注入 + focused 单测；`dialog-host.tsx` 为 portal 内容根补 `data-renderer`。
- `packages/page-designer-renderers`：canvas-overlay frame 元素加 `id="nop-frame-${anchor}"` + `data-frame-for`。
- 共享契约测试 helper 的落位与导出（落位在 Phase 3 Decision 定，候选：flux-react 主入口导出 internal 测试 helper）。
- owner doc Design-Time Frame Protocol 补一句 anchor 回退规则（canvas 投影节点无 cid 时用 psid sid）。
- `docs/logs/` 收口记录。

### Out Of Scope

- 各渲染器包的组件结构与审计卡（528-536）。
- `data-psid` 既有通道的下线。
- 表单字段族现有属性（`data-field` 等）的任何变更。

## Failure Paths

| 场景 | 触发 | 行为 | 可重试 | 用户可见表现 |
| ---- | ---- | ---- | ------ | ------------ |
| renderer type 不可得 | 自定义 component 路径无 renderer type 来源 | 注入跳过该属性（不输出空值），卡面登记 bypass 路径 | 是 | 无 |
| cid/sid 均缺失 | 目标节点无任何锚 id | `data-cid`/frame 均不输出，frame 不渲染 | 是 | 无 |

## Test Strategy

档位选择：`建议有测`——本计划是基础设施，`data-renderer` 注入与 frame 命名均为属性级断言，必须落 focused 单测（Proof 前置于 Fix 完成）。

## Execution Plan

### Phase 1 - data-renderer 中央注入（含 portal 根）

Status: completed
Targets: `packages/flux-react/src/auto-renderer.tsx`、`packages/flux-react/src/dialog-host.tsx`（必要时 `use-surface-renderer.ts` 传 kind）

- Item Types: `Fix | Proof`

- [x] Proof：先写失败单测——AutoRenderer 路径渲染器根含 `data-renderer="<type>"`（值语义参照 FieldFrame 的 `NodeMetaContext.type`）——`defaults-and-auto-renderer.test.tsx` 新增用例先红
- [x] Fix：auto-renderer 注入 `data-renderer`（`createAutoRendererComponent(ReactComponent, { rendererType })`，type 不可得时不输出空属性）
- [x] Proof：dialog-host 路径失败单测——打开态 portal 内容根含 `data-renderer`——新文件 `__tests__/portal-root-anchors.test.tsx` 先红
- [x] Fix：dialog-host 按 surface kind 注入 `data-renderer`（dialog/drawer 两处根）

Exit Criteria:

- [x] 新增单测通过：auto-renderer 路径与 dialog-host portal 根的三件套（`nop-*` + `data-renderer` + `data-cid`）齐全（flux-react 535/535）
- [x] 既有 flux-react 测试无回归（focused 范围）（59 文件全绿）

### Phase 2 - CanvasOverlay frame 命名对齐

Status: completed
Targets: `packages/page-designer-renderers/src/canvas-overlay.tsx`

- Item Types: `Fix | Proof`

- [x] Fix：frame 元素输出 `id="nop-frame-${anchor}"` + `data-frame-for="${anchor}"`（anchor = 目标元素 `data-cid`，缺省回退 `data-psid` sid；`readAnchorBoxes` 读 `data-cid`，仅 selection frame 携带身份）；目标查找通道保持 `data-psid` 不变
- [x] Proof：单测断言 frame 元素 id / data-frame-for 与目标锚 id 的对应关系（cid 与 psid 两种情形 + hover chrome 无身份）——`canvas-overlay.test.tsx` 新增 3 用例先红后绿（12/12）
- [x] owner doc Design-Time Frame Protocol 补 anchor 回退一句

Exit Criteria:

- [x] 新增单测通过；既有 page-designer 测试全绿（20 文件 150/150，无涉及 e2e 需要单独跑）
- [x] 生产（非设计器）渲染路径抽查确认零 frame 输出（frame 仅存在于 CanvasOverlay 组件，生产渲染路径不含 page-designer-renderers 依赖）

### Phase 3 - 共享契约测试 helper

Status: completed
Targets: helper 落位文件（Phase 3 内 Decision 定）、`docs/audits/dom-structure-checklist.md`（helper 用法一行）

- Item Types: `Decision | Proof`

- [x] Decision：helper 落位 `packages/flux-react/src/dom-structure-testing.ts`，经主入口 `index.tsx` 导出（纯 DOM 断言、零测试框架依赖，测试代码按 `import { assertRendererRootAnchors } from '@nop-chaos/flux-react'` 使用）
- [x] Proof：helper 提供 `assertRendererRootAnchors(root, { type, cid?, skip? })` 断言，并在 `portal-root-anchors.test.tsx` 先行使用（替换原 expect 断言）

Exit Criteria:

- [x] helper 可被 528 直接引用（import 路径 `@nop-chaos/flux-react`）
- [x] 用法补进 checklist 冻结测试要求节（一行）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子代理 R1（fresh session）
- Verdict: pass（Round 1 issues → 3 项 Major 已修订：sid/cid 命名空间连接方式、portal 注入归属 dialog-host、field-frame 包路径；Round 2 复核通过）
- Rounds: 2
- Findings addressed: ①Phase 2 改为 anchor 回退方案（data-cid 缺省用 data-psid，查找通道不变）②portal `data-renderer` 归属 527 dialog-host ③field-frame.tsx 修为 packages/flux-react

## Closure Gates

- [x] `data-renderer` 中央注入落地（auto 路径 + portal 根）且 focused 单测通过
- [x] frame 命名对齐落地且 page-designer 既有行为绿
- [x] 共享 helper 落位并可被各包引用
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] 受影响 owner docs 已同步（frame anchor 回退一句 + checklist helper 用法一行）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（exit 0）
- [x] `pnpm build`（exit 0）
- [x] `pnpm lint`（exit 0；余 3 处为既有 0-error warning）
- [x] `pnpm test`（全量 exit 0；flux-react 535/535、page-designer-renderers 150/150）
- [x] `pnpm check`（exit 0）

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

- `data-psid` 旧锚定通道的退役清理（待 528-536 全部收口后单独评估）

## Closure

Status Note: 2026-10-03 收口。三 Phase 全部落地：`data-renderer` 中央注入（auto 路径经 definition.type、portal 根经 dialog-host surface.kind）、frame `nop-frame-${anchor}` 身份（anchor=data-cid 缺省回退 psid sid，仅 selection frame 携带）、共享 helper `assertRendererRootAnchors` 经 `@nop-chaos/flux-react` 导出。全量门禁 typecheck/build/lint/test/check 全过。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理（fresh session，agent_9d6008a8）
- Evidence: approved 判定——逐 Gate 核对 live 代码（auto-renderer.tsx:31/:47、dialog-host.tsx:377/:530、canvas-overlay.tsx:59/:110/:305、index.tsx 导出）；独立复跑 flux-react 535/535、page-designer-renderers 150/150；无静默降级。

Follow-up:

- 见 Non-Blocking Follow-ups
