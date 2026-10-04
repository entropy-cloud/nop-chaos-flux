# 552 manifest 补齐——dashboard-editor / scada-editor（P3.1）

> Plan Status: completed
> Last Reviewed: 2026-10-04
> Source: `docs/backlog/editor-designer-standardization-roadmap.md` §6 P3.1；`docs/architecture/capability-projection-manifest.md`；`docs/architecture/editor-designer-standard.md` §2.3
> Related: plan 544（裁决②：print 维持裸组件 → 走 props 契约文档档，P2.3 已成文，**不立 manifest**——本计划范围相应缩为 dashboard/scada 两家族）；plan 552 为 P3.2 前置

## Purpose

为 dashboard-editor 与 scada-editor 各立 `*_MANIFEST_V1` + `hostContract` 挂到既有 RendererDefinition，补齐 roadmap §3 基线表中两家族的 manifest 缺口。projection 形状从各自 session 投影声明（P3.3 按此形状实现运行时 publish）；capabilities 如实声明（两家族当前无家族 namespaced action 面，能力经 component handles——留空 methods 并注记，命名空间保留）。

## Current Baseline

- 先例模式：`spreadsheet-renderers/spreadsheet-manifest.ts`（60 行：SPREADSHEET_MANIFEST_V1 + resolve + CAPABILITY_PUBLICATION + hostContract）；flow/report/word 各有更全的 manifest。
- dashboard-editor：`dashboard-editor-definitions.ts` 有 propContracts/eventContracts，无 hostContract；session = editor-core `EditorSessionState`（editor-session-hook.ts，working=layout 文档/mode/canUndo/canRedo/dirty）；事件 = `dashboard-editor:save {serialized}` / `dashboard-editor:error`；无家族 namespaced action 注册。
- scada-editor：`flux-renderers-industrial/src/editor/renderer-definitions.ts` 无 hostContract；session = `ScadaEditorSession`（workingConfig/committedBaseline/selection/mode + `ScadaEditorSessionChangePayload {canUndo,canRedo,selection,mode}`）；20 句柄走 component handles；无家族 namespaced action 注册。
- print-designer：裁决②豁免档（P2.3 props 契约已成文），roadmap P3.1 括注"print 若维持裸组件则改为 props 契约文档档"——条件已触发，print 不在本计划范围。

## Goals

- `packages/flux-renderers-dashboard/src/editor/dashboard-editor-manifest.ts`：`DASHBOARD_EDITOR_MANIFEST_V1`（family `dashboard-editor`，version 1.0；projection = `layout`/`selection`/`mode`/`runtime{canUndo,canRedo,dirty}`，逐字段来源：layout ← `EditorSessionState.working`（布局文档）、selection ← `.selection`（renderer 已消费 session.selection，不裁剪）、mode ← `.mode`、runtime ← `.canUndo/canRedo/dirty`（m2 修正：selection 不再静默裁剪）；capabilities = namespace `dashboard-editor` + **空 methods** + `metadata.description` 注记"能力面经 component handles，家族命名空间保留"（m1：注记入 manifest 自身元数据，工具可见））+ resolve + `dashboardEditorHostContract` 挂到 dashboard-editor RendererDefinition。**capabilityPublication 裁定（M1）：两家族均省略**（字段可选）——两编辑器当前未向任何 schema region 传 `actionScope`（dashboard 仅传 pathSuffix；scada region.render 仅传 bindings），不存在可声明的真实 publication 边界；owner doc 明文禁止为不存在的边界发明 attribution；空 methods 下 attribution 亦为空转。未来引入家族 namespaced action 时随 manifest version 一并声明。
- `packages/flux-renderers-industrial/src/editor/scada-editor-manifest.ts`：`SCADA_EDITOR_MANIFEST_V1`（family `scada-editor`；projection = `config`/`selection`/`mode`/`runtime{canUndo,canRedo}`，逐字段来源：config ← `ScadaEditorSession.workingConfig`（change payload 无 config 字段，m2 措辞修正）、selection/mode ← session、runtime ← undoStack 派生（projectSessionChange 同源）；capabilities 同上空 methods + metadata 注记）+ hostContract 挂到 scada-editor-canvas RendererDefinition（capabilityPublication 同 dashboard 裁定：省略）。
- 两 manifest 各配单测（family/version/形状/hostContract 解析往返 + projection 形状与编辑器实际投影源字段一致性静态断言）。
- owner doc `capability-projection-manifest.md` 增一行注记（m1）："空 methods 映射是合法的命名空间预留——当能力面经 component handles 而非家族 namespaced actions 暴露时"（本文档为 P3.x owner，随本计划同步）。

## Non-Goals

- 不为 print-designer 立 manifest（豁免档裁定）。
- 不实现 useHostScope 运行时 publish（P3.3 按本计划 projection 形状执行）。
- 不引入家族 namespaced action 注册（空 methods 如实声明；未来需要时扩 manifest version）。
- 不改事件面（P3.2）。

## Scope

### In Scope

- `packages/flux-renderers-dashboard/src/editor/`（manifest + definitions hostContract + 测试）。
- `packages/flux-renderers-industrial/src/editor/`（manifest + definitions hostContract + 测试）。

### Out Of Scope

- print-designer、事件面、scope 运行时 publish、playground。

## Failure Paths

| 触发                                             | 行为                                                                  | 可重试 | 用户可见表现 |
| ------------------------------------------------ | --------------------------------------------------------------------- | ------ | ------------ |
| hostContract 解析失败（version selector 不匹配） | resolve 返回 undefined（与既有家族同契约）；'1.0'/'1'/'latest' 全注册 | 是     | 无           |
| projection 形状与 P3.3 实现漂移                  | P3.3 plan 以本 manifest 形状为实现输入；P5.1 守卫做一致性断言         | 是     | 无           |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`（公共契约面新增；failing-first）。

## Execution Plan

### Phase 1 - dashboard-editor manifest（Proof + Fix）

Status: completed
Targets: `packages/flux-renderers-dashboard/src/editor/`

- Item Types: `Proof`、`Fix`

- [x] （Proof）失败测试：4 用例先红（manifest 不存在）
- [x] （Fix）manifest 文件（省略 capabilityPublication）+ hostContract 挂接 + `rendererClass: 'domain-host-renderer'` + 测试绿（4/4）

Exit Criteria:

- [x] dashboard 包测试全绿（9 文件 81/81 含新 manifest 测试）

### Phase 2 - scada-editor manifest（Proof + Fix）

Status: completed
Targets: `packages/flux-renderers-industrial/src/editor/`

- Item Types: `Proof`、`Fix`

- [x] （Proof）失败测试：同上模式（4 用例先红）
- [x] （Fix）manifest 文件 + hostContract 挂接 + rendererClass 修正 + 测试绿（4/4；既有 renderer-definitions.test 的 instance-renderer pin 为旧分类断言，按 plan M2 裁定更新并注记）

Exit Criteria:

- [x] industrial 全量测试零回归（137 文件，1622 既有 + 4 新增）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_36250f5d-9e4d-4d40-a8f6-a7ec3b4f8bdf）
- Verdict: pass（round 1 fail → 修订）
- Rounds: 2（round 2 为修订核对）
- Findings addressed: M1 capabilityPublication 裁定（两家族均省略——无真实 actionScope 边界，owner doc 禁止发明 attribution；未来随 manifest version 声明）；M2 两 definitions 补 `rendererClass: 'domain-host-renderer'` + 测试断言（现缺省 instance-renderer 违反 owner doc 分类）；m1 空 methods 注记入 manifest metadata + owner doc 增预留合法性一行；m2 projection 逐字段来源成文（dashboard selection 不再裁剪、scada config 来源修正）；m3 Phase 3 全门禁重复删除。

## Closure Gates

- [x] 两家族 `*_MANIFEST_V1` + hostContract 挂接落地（resolve 往返 '1.0'/'1'/'latest' 测试锁定）
- [x] projection 形状与 session 投影源一致（逐字段来源成文于 manifest 头注 + 形状测试锁定）
- [x] print 不立 manifest 的裁定依据成文（Source 节 + roadmap 回写标注）
- [x] 必要 focused verification 已完成（dashboard 81/81 + industrial 137 文件全绿）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`（78 tasks 全绿）
- [x] `pnpm check`（exit 0）
- [x] roadmap §6 P3.1 回写 `done`（closure audit 通过后；标注 print 走豁免档）

## Deferred But Adjudicated

（无。）

## Non-Blocking Follow-ups

- P3.3 落地 useHostScope 时若发现 projection 形状需微调，须同步修订 manifest 并声明（契约单一事实源）。

## Closure

Status Note: 两家族 manifest（dashboard-editor/scada-editor V1）+ hostContract 挂接 + rendererClass 分类修正 + 空 methods 预留裁定全部落地；print 按裁决②走豁免档不立 manifest；独立 closure audit approved。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_62f11713-ec8a-4dd4-85c5-7188f3abf4a5）
- Evidence: VERDICT: approved——manifest 与 M1/m1 裁定逐项核对（无 capabilityPublication/空 methods/metadata 注记）；projection 逐字段来源与 EditorSessionState/ScadaEditorSession 类型核实；rendererClass 修正两处 + 唯一修改的既有 pin 含裁定注记且为强化（新增 hostContract.family 断言）；resolve 往返测试锁定；dashboard 81/81 + industrial 1626/1626（1622 既有 + 4 新增）独立复跑；五门禁独立复核 exit 0。

Follow-up:

- P3.3 落地 useHostScope 时按本 manifest projection 形状实现（Non-Blocking Follow-ups 已记）；no remaining plan-owned work。
