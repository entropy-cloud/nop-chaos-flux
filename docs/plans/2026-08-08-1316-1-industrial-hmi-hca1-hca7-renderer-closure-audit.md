# 01 Industrial HMI Component Audit — HCA1 + HCA7 Renderer 层 Closure Audit（scada-canvas / scada-editor-canvas 18 维审计卡收口）

> Plan Status: completed
> Last Reviewed: 2026-08-08
> Mission: industrial-hmi-component-audit
> Work Item: HCA1. Renderer 层审计 + HCA7. Editor renderer 层审计
> Source: `docs/backlog/industrial-hmi-component-audit-roadmap.md` §HCA1 / §HCA7；审计卡 `docs/audits/per-component/scada-canvas.md`、`docs/audits/per-component/scada-editor-canvas.md`（均 `fixed-pending-closure`）；18 维组件 checklist `docs/audits/component-audit-checklist.md`
> Related: HCA0（done，编排基线）、HCAX-1（done，error code 统一）、HCAX-2（done，canvas a11y）、HCA11（successor，editor infra，依赖 HCA7 收口）、HCA-BL/HCA-CR（successor，依赖 HCA1–HCA11 全 `done`）

## Purpose

对 industrial HMI 两个注册 renderer type——`scada-canvas`（HCA1）与 `scada-editor-canvas`（HCA7）——的 18 维组件审计做**独立 closure audit**，把两张审计卡从 `fixed-pending-closure` 推进到 `closed`，并把 roadmap §HCA1/§HCA7 从 `planned` 推进到 `done`。两张卡的 P0/P1/P2 修复（含 HCAX-1 error code 统一、HCAX-2 canvas a11y 两条共性项）已 inline 落地，本 plan 不再产生新审计/新修复，只做收口验证 + 状态同步。HCA1/HCA7 是 HCA-BL/HCA-CR 收敛的前置依赖，也是 HCA11（editor infra，依赖 HCA7）的干净前置。

## Current Baseline

> 起草前已逐条核对 live repo（2026-08-08，审计卡 + HEAD 代码对齐）。

### HCA1 — scada-canvas（审计卡 `docs/audits/per-component/scada-canvas.md`，状态 `fixed-pending-closure`）

- 注册定义 `src/renderer-definitions.ts:47`；渲染器 `src/renderer/scada-canvas.tsx:69`；schema `src/schemas.ts:12-27`；5 hooks（use-scada-engine/use-scada-config-sync/use-scada-points-bridge/use-scada-events/use-scada-handles）；scada-errors。
- 18 维结论：16 pass / 1 n-a（值所有权）/ 1 fail（dim 8 a11y，已修）。
- finding：
  - **P2-1**（dim 8 a11y）canvas 交互面缺 `role`/`aria-label` —— 状态 **fixed**（`role="application"` + `aria-label={t('industrial.scada.canvasLabel')}`）。
  - **P3-1**（dim 14 React19）6 处 `useCallback` 为 React Compiler 冗余候选 —— 状态 **recorded**（P3，非阻塞，归 HCA-LL/HCA-CR）。
- 卡片「Closure」节：独立 closure audit = **pending（fresh session）**。

### HCA7 — scada-editor-canvas（审计卡 `docs/audits/per-component/scada-editor-canvas.md`，状态 `fixed-pending-closure`）

- 注册定义 `src/editor/renderer-definitions.ts:17`；渲染器 `src/editor/scada-editor-canvas.tsx:68`；schema `src/editor/schemas.ts:19-48`；2 hooks（use-editor-engine/use-editor-handles）；editor-errors（`src/editor/renderer/editor-errors.ts`）。
- 18 维结论：含 5 个 fail 维度（dim 1/7/8/10/18），全部已修。
- finding：
  - **P1-1**（dim 1）`ScadaEditorCanvasSchema` 缺 `loading`/`empty`/`error` region 声明 —— 状态 **fixed**。
  - **P2-1**（dim 1/7）editor renderer definition 缺 `propContracts`/`eventContracts` —— 状态 **fixed**（补齐 7 propContracts + 7 eventContracts）。
  - **P2-2**（dim 8 a11y）canvas 交互面缺 `role`/`aria-label` —— 状态 **fixed**（`role="application"` + `aria-label`）。
  - **P2-3**（dim 10）`props.meta.disabled` 未响应 —— 状态 **fixed**（`aria-disabled` + `inert` + drop/keyboard guard）。
  - **P2-4（shared）**（dim 18）error code `invalid-config` vs `config-invalid` 语义混淆 —— 状态 **fixed**（统一为 `config-invalid`，对应 HCAX-1 `done`）。
  - **P3-1**（dim 9 i18n）palette `title={def.type}` —— 状态 **fixed**（改为 `def.name`）。
- 卡片「Closure」节：独立 closure audit = **pending（fresh session）**。

### 共性项（已 `done`）

- **HCAX-1** error code `invalid-config`→`config-invalid`：跨 renderer + editor + runtime-mutators + toolbox-runtime 统一，状态 `done`。
- **HCAX-2** canvas 交互面 a11y：scada-canvas + scada-editor-canvas 两 renderer wrapper 加 `role="application"` + `aria-label` + i18n key，状态 `done`。

### owner doc 现状

- `docs/components/industrial-hmi/design-renderer.md`（runtime，§1/§4.1/§8/§10）。
- `docs/components/industrial-hmi-editor/design-renderer.md`（editor，§4.1/§4.3/§8）。
- `docs/components/industrial-hmi/editor-initiation.md`（10 runtime 复用点）。
- 审计卡 dim 17 已判定 pass；本 plan Phase 抽查复核上述章节与 live 一致。

### 包级机械健康

`pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/build/lint/test` 全绿（HEAD 基线 ~1302+ tests / 97 test files）；两审计卡修复记录均注明验证全绿。

## Goals

- 由独立子 agent（fresh session，不复用本 plan 起草者上下文）对 HCA1/HCA7 两张审计卡做 closure audit：逐条核对每个 finding 的 fix 是否在 live 代码中成立（`文件:行` 证据），区分「接口存在」与「行为完成」。
- 核对 18 维 checklist 完整性（无未分类维度 / 无遗留 fail 未修）。
- 核对 HCAX-1/HCAX-2 共性 fix 在两 renderer 中的实际落地一致性。
- 核对 owner doc（design-renderer.md runtime + editor、editor-initiation.md）与 live 一致，发现 drift 则同步。
- closure 通过后：把两张审计卡状态改 `closed` 并补 Closure 证据；roadmap §HCA1/§HCA7 改 `done`；Closure Gates 全量验证全绿。

## Non-Goals

- 不重做 18 维审计（审计已完成，本 plan 只收口）。
- 不审计内部模块（HCA2–HCA6, HCA8–HCA11）、不产出新 finding 的修复（除非 closure audit 发现新 P0/P1 live defect，则按 roadmap 自动修复契约 test-first 处理并显式记入审计卡）。
- 不做 HCA-BL/HCA-LL/HCA-CR 全量汇总（本 plan 仅把两张卡推到 `closed`，喂入后续 successor）。
- 不改 renderer 公共面 / schema 契约（除非 closure 发现 contract drift）。

## Scope

### In Scope

- `docs/audits/per-component/scada-canvas.md`（HCA1 审计卡 closure）。
- `docs/audits/per-component/scada-editor-canvas.md`（HCA7 审计卡 closure）。
- live 核对目标：`src/renderer/scada-canvas.tsx`、`src/renderer-definitions.ts`、`src/schemas.ts`、`src/editor/scada-editor-canvas.tsx`、`src/editor/renderer-definitions.ts`、`src/editor/schemas.ts`、`src/editor/palette/editor-palette.tsx`、`src/renderer/scada-errors.ts`、`src/editor/renderer/editor-errors.ts`、i18n locale（zh-CN/en-US `canvasLabel` key）。
- owner doc：`docs/components/industrial-hmi/design-renderer.md`、`docs/components/industrial-hmi-editor/design-renderer.md`、`docs/components/industrial-hmi/editor-initiation.md`（仅当发现 drift 时同步）。
- roadmap `docs/backlog/industrial-hmi-component-audit-roadmap.md` §HCA1/§HCA7 状态同步 + 依赖图 ✅ 标记。

### Out Of Scope

- 内部模块审计对象（engine/binding/serialization/symbols/editor 子系统，归属 HCA2–HCA11）。
- `*.test.ts` / `*-fixtures.ts` / `index.ts` barrel（不纳入审计对象）。
- HCA-BL/LL/CR/CV/CG 汇总（successor work item）。
- flux-guide 补充（I15.2/E9.2 backlog，归 HCA-CG）。

## Failure Paths

> 本 plan 是 closure audit，无外部 IO / 鉴权。失败路径关注点是「closure audit 发现先前修复未真正落地」时的处置。

| 可测场景编号              | 触发                                                       | 行为                                                                                 | 可重试 | 用户可见表现                                 |
| ------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------ | -------------------------------------------- |
| closure-fix-not-landed    | closure audit 发现某 P-item 的 fix 在 live 代码中缺失/错位 | 退回执行：补/修正 fix（test-first），审计卡保持 `fixed-pending-closure`，plan 不关闭 | 是     | 审计卡状态不变，roadmap §HCAx 维持 `planned` |
| closure-new-p0p1-surfaced | closure audit 抽查 live behavior 发现先前未记录的新 P0/P1  | 按 roadmap 自动修复契约 test-first 修复 + 显式记入审计卡，再继续收口                 | 是     | 审计卡增新 finding 行 + 修复记录             |
| closure-owner-doc-drift   | owner doc 章节与 live 不一致                               | 同步 owner doc 到 live baseline（最终设计状态，无 Proposed/Current）                 | 否     | design-renderer.md 章节更新                  |

## Test Strategy

本档选择：**建议有测**

closure audit 是验证型工作，不引入新功能。若 closure 发现新 P0/P1 live defect，按 roadmap 自动修复契约 test-first（failing-first proof 先于 fix）。验证以「逐 finding live `文件:行` 复核 + 关键行为抽查（a11y role/aria-label DOM 断言 / disabled meta 响应 / error code 一致性 / schema region 声明）+ 全量 `pnpm typecheck/build/lint/test`」为主。两 renderer 的 DOM 契约（a11y/disabled）已有 e2e 覆盖（`scada-demo.spec.ts` / `scada-editor-interaction-correctness.spec.ts`），closure 抽查复用。

## Execution Plan

### Phase 1 - HCA1 scada-canvas 独立 closure audit

Status: completed
Targets: `docs/audits/per-component/scada-canvas.md`、`src/renderer/scada-canvas.tsx`、`src/renderer-definitions.ts`、`src/schemas.ts`、i18n locale

- Item Types: `Proof | Decision`

- [x] 由独立子 agent（fresh session）逐条核对 HCA1 finding：
  - **P2-1**：live `scada-canvas.tsx` 根 div 存在 `role="application"` + `aria-label={t('industrial.scada.canvasLabel')}`；locale zh-CN/en-US 存在 `canvasLabel` key。
  - **P3-1**：6 处 `useCallback` 仍为 P3 recorded（非阻塞，归 HCA-LL/HCA-CR）；确认未被静默升级或降级。
- [x] 核对 18 维 checklist 完整性：16 pass / 1 n-a / 1 fail(dim8, fixed) 无遗留未分类维度。
- [x] 抽查关键行为：a11y DOM 断言（`role` 属性存在）；`scada-demo.spec.ts` / `scada-edge-cases.spec.ts` 复用通过。
- [x] 核对 owner doc `docs/components/industrial-hmi/design-renderer.md`（§1/§4.1/§8/§10）与 live 一致；仅当 drift 时同步。
- [x] 把审计卡 `## Closure` 节补独立 closure audit 证据（auditor session id / `文件:行` evidence / 结论），状态推进 `closed`。

Exit Criteria:

> 写法原则：只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续的局部检查；全量验证归 Closure Gates。

- [x] HCA1 全部 finding 的 fix 经 live `文件:行` 复核成立（行为完成，非仅接口存在）。
- [x] 审计卡 `scada-canvas.md` `## Closure` 节含独立 closure audit 证据，状态 `closed`。

### Phase 2 - HCA7 scada-editor-canvas 独立 closure audit

Status: completed
Targets: `docs/audits/per-component/scada-editor-canvas.md`、`src/editor/scada-editor-canvas.tsx`、`src/editor/renderer-definitions.ts`、`src/editor/schemas.ts`、`src/editor/palette/editor-palette.tsx`、`src/editor/editor-errors.ts`、i18n locale

- Item Types: `Proof | Decision`

- [x] 由独立子 agent（fresh session）逐条核对 HCA7 finding：
  - **P1-1**：`src/editor/schemas.ts` `ScadaEditorCanvasSchema` 含 `loading?`/`empty?`/`error?: SchemaInput` 声明 + import；与 `renderer-definitions.ts` fields 一致。
  - **P2-1**：`src/editor/renderer-definitions.ts` 含 7 propContracts + 7 eventContracts（含 payload shape）。
  - **P2-2**：`scada-editor-canvas.tsx` canvas 区存在 `role="application"` + `aria-label`；locale 存在 editor `canvasLabel` key（HCAX-2 一致性）。
  - **P2-3**：`scada-editor-canvas.tsx` 消费 `props.meta.disabled`（`aria-disabled` + `inert` + drop/keyboard guard）。
  - **P2-4（shared）**：`parseAndValidateConfig` 用 `config-invalid`（与 runtime scada-canvas 一致，HCAX-1 `done` 一致性）。
  - **P3-1**：`editor-palette.tsx` `title={def.name}`（非 `def.type`）。
- [x] 核对 18 维 checklist 完整性：5 个 fail 维度（dim 1/7/8/10/18）全部 fixed，无遗留。
- [x] 抽查关键行为：disabled meta 响应（`aria-disabled`/`inert` DOM 断言）；error code 一致性（editor 与 runtime 同码）；`scada-editor-interaction-correctness.spec.ts` 复用通过。
- [x] 核对 owner doc `docs/components/industrial-hmi-editor/design-renderer.md`（§4.1/§4.3/§8）+ `editor-initiation.md`（10 runtime 复用点）与 live 一致；仅当 drift 时同步。
- [x] 把审计卡 `## Closure` 节补独立 closure audit 证据，状态推进 `closed`。

Exit Criteria:

- [x] HCA7 全部 finding 的 fix 经 live `文件:行` 复核成立（行为完成）。
- [x] HCAX-1/HCAX-2 共性 fix 在 editor renderer 中落地与 runtime 一致。
- [x] 审计卡 `scada-editor-canvas.md` `## Closure` 节含独立 closure audit 证据，状态 `closed`。

### Phase 3 - 全量验证 + roadmap / 依赖图状态同步

Status: completed
Targets: `docs/backlog/industrial-hmi-component-audit-roadmap.md`、`docs/audits/per-component/*.md`、`docs/logs/`

- Item Types: `Follow-up`

- [x] roadmap §Work Item Status：HCA1 / HCA7 行 `planned` → `done`；依赖图 HCA1/HCA7 节点补 ✅。
- [x] 「已完成审计卡索引」表两卡状态 `fixed-pending-closure` → `closed`。
- [x] 日志 `docs/logs/2026/08-08.md` 记 HCA1/HCA7 closure audit PASS（fresh session 证据 + 全量验证状态）。

Exit Criteria:

- [x] roadmap §HCA1/§HCA7 状态 `done`，依赖图与状态表一致。
- [x] 审计卡索引表状态一致。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立子 agent（fresh session）反复 review 直到共识后填写。

- Reviewer / Agent: 独立子 agent fresh session `ses_02030057effe6X6sB6ggt7dSgh`
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major。1 Minor + 1 Nit 已落地：M-1（In Scope 两处 error 文件路径错误——`src/scada-errors.ts`→`src/renderer/scada-errors.ts`、`src/editor/editor-errors.ts`→`src/editor/renderer/editor-errors.ts`）已修正；N-1（`schemas.ts:19-46` 实际闭合于 :48）已修正为 `:19-48`。Live repo 全量复核通过：两张审计卡存在且状态 `fixed-pending-closure`；8 项 P-item 与卡片记录一致；7 个主源文件 + 3 个 owner doc 路径存在；roadmap HCA1/HCA7 `planned`、HCAX-1/HCAX-2 `done`；inline fix 抽查全部确认（scada-canvas role/aria-label、scada-editor-canvas disabled meta 消费、parseAndValidateConfig 两处均用 config-invalid、editor-palette title=def.name、editor propContracts/eventContracts 7+7、schemas loading/empty/error 声明、i18n canvasLabel 双 locale）。

## Closure Gates

> **关闭条件**：本 section 所有条目 + 每个 Phase Exit Criteria 全部 `[x]` 后才能 `Plan Status: completed`。closure-audit 必须由独立子 agent（fresh session）完成，执行 session 不得自审勾选。

- [x] HCA1/HCA7 两张审计卡全部 finding 经 live `文件:行` 复核（行为完成，非仅接口存在）。
- [x] 18 维 checklist 完整性核对通过（无遗留未修 fail 维度）。
- [x] HCAX-1/HCAX-2 共性 fix 在两 renderer 落地一致。
- [x] 受影响 owner doc 与 live baseline 一致（或明确无 drift）。
- [x] 审计卡状态 `closed` + roadmap §HCA1/§HCA7 `done` + 依赖图/索引表一致。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（P3-1 已诚实归 HCA-LL/HCA-CR，附 non-blocking 理由）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### P3-1（HCA1）6 处 useCallback React Compiler 冗余候选

- Classification: `optimization candidate`
- Why Not Blocking Closure: React Compiler 基线下 useCallback 为冗余优化项，非 live defect / 非 contract drift；editor 同型组件已清理（参考），runtime 侧迁移为 P3 非阻塞，归 HCA-LL（lesson 沉淀）/ HCA-CR。
- Successor Required: `no`（归 HCA-LL/HCA-CR，非独立 successor plan）

## Non-Blocking Follow-ups

- HCA1 P3-1 useCallback 迁移 → HCA-LL（React 19 lesson 沉淀）/ HCA-CR backlog。
- 两 renderer 的 flux-guide 词条（I15.2/E9.2 backlog）→ HCA-CG。

## Closure

Status Note: 两张审计卡（HCA1 scada-canvas / HCA7 scada-editor-canvas）closure audit PASS（fresh session），状态 `closed`；roadmap §HCA1/§HCA7 `done`；依赖图 + 索引表一致；closure remediation（owner doc drift 修正 + a11y/disabled 回归守护测试）已落地；全量验证 typecheck/build/lint/test 全绿。P3-1（HCA1 useCallback）诚实归 HCA-LL/HCA-CR，无 in-scope live defect 被静默降级。

Closure Audit Evidence:

- Auditor / Agent:
  - HCA1 per-card closure audit: 独立子 agent fresh session `ses_0202b17cbffeXMF0hmlW22VM6N`（verdict `pass`）
  - HCA7 per-card closure audit: 独立子 agent fresh session `ses_0202ae215ffeqrZBtX2DOumfch`（verdict `pass`，先 issues → remediation → pass）
  - Plan-level closure audit: 独立子 agent fresh session `ses_0201c77ccffeIeAT1ZKvfPtb32`（verdict `pass`）
- Evidence:
  - HCA1：P2-1 a11y LANDED（`scada-canvas.tsx:298-299` + i18n `zh-CN.ts:935`/`en-US.ts:936`）；P3-1 useCallback P3 recorded；审计卡 `scada-canvas.md` `closed` w/ file:line evidence。
  - HCA7：6 finding（P1-1/P2-1/P2-2/P2-3/P2-4/P3-1）全部 LANDED（`editor/schemas.ts:41-45` + `editor/renderer-definitions.ts:30-149` + `scada-editor-canvas.tsx:42,217,270-273,275,305` + `editor-palette.tsx:51`）；HCAX-1/HCAX-2 共性 fix 与 runtime 一致；审计卡 `scada-editor-canvas.md` `closed`。
  - Closure remediation：owner doc（`industrial-hmi/design-renderer.md` §10 + `industrial-hmi-editor/design-renderer.md` §4.1/§4.3/§10）drift 修正；回归守护（`scada-canvas-smoke.test.tsx` +1 / 新增 `scada-editor-canvas-disabled-meta.test.tsx` +3）断言结果值。
  - 全量验证：`pnpm typecheck` 32/32 + `pnpm build` 32/32 + `pnpm lint` 32/32 + `pnpm test` 59/59 tasks（industrial 98 files / 1319 tests，+4 regression）全绿。
  - 日志：`docs/logs/2026/08-08.md` HCA1+HCA7 closure 条目。

Follow-up:

- P3-1 useCallback 迁移归 HCA-LL/HCA-CR。
- 无其他 plan-owned remaining work。
