# 05 HMI Renderer Test Boilerplate Extraction

> Plan Status: completed
> Last Reviewed: 2026-08-05
> Source: `docs/components/roadmap-industrial-hmi.md` Follow-up Backlog →「2026-08-05-0653 post-remediation audit P2」子节 multi `[P2-2]`（dim 14）；源审计 `docs/audits/2026-08-05-0653-multi-audit-industrial-hmi.md`
> Related: `docs/plans/2026-08-05-1253-2-hmi-public-surface-dead-code-hygiene.md`（Follow-up 显式「multi P2-2 renderer 测试样板抽取按 Non-Goals 归后续 round」，本 plan 即该后续 round）

## Purpose

收口 multi-audit `[P2-2]`（dim 14）：将 8 个 scada-canvas renderer 测试文件中近重复的 `validConfig` / `makeProps` / `configProp` / `scadaTestHandle` 样板抽取到既有 `test-support/renderer-test-support.tsx`，消除 `cid` 漂移（7 / 7 / 7 / 9 / 11 / 19 / 21 / 31）与维护 footgun。纯测试 hygiene 重构，不改变任何测试行为或产品代码。

## Current Baseline

- **Roadmap 状态**：I0–I16 全部 `done`。Follow-up Backlog 逐项核对后，multi `[P2-2]` 是唯一底层尚未被任何 plan 处理的项（其余 P2 均已 `已由 plan ... 收口`，见 roadmap:489-512 各 per-line marker）。
- **既有 test-support 基建**：`packages/flux-renderers-industrial/src/test-support/renderer-test-support.tsx`（76 行）已导出 `createScadaTestEnvironment` / `ScadaTestProviders` / `renderScadaCanvas` 三个环境级 helper，但**不含**本 plan 要抽取的 props/config/handle 工厂。
- **既有 handle 类型**：`packages/flux-renderers-industrial/src/engine/test-handle.ts` 已导出规范 `ScadaTestHandle` 接口（9 成员）+ `scadaTestHandleKey(cid)` 函数，可作为 `scadaTestHandle(cid)` reader 的权威返回类型与 key 来源。
- **样板分布（live，2026-08-05 核对）**：8 个 renderer 测试文件各自定义同名局部 helper（注：本 plan 将审计 citing 的 4 文件 [audit:152] 有意扩展到全部 8 个含同款样板的 renderer 测试文件——同一 owner surface / 同一组 proof / 同一组 exit criteria，合并收口符合 plan-authoring guide Rule 22/25），逐文件漂移：

  | 文件                                        | 行数 | cid | validConfig 签名         | scadaTestHandle 返回类型 |
  | ------------------------------------------- | ---- | --- | ------------------------ | ------------------------ |
  | `scada-canvas-lifecycle.test.tsx`           | 667  | 7   | `(overrides?)` 2 symbols | `{ engine; getSymbol }`  |
  | `scada-canvas-lifecycle-hardening.test.tsx` | 479  | 7   | 无（内联）               | `{ engine; getSymbol }`  |
  | `scada-canvas-lifecycle-wiring.test.tsx`    | 362  | 7   | `(overrides?)` 2 symbols | `{ engine; getSymbol }`  |
  | `scada-canvas-diagnostic-channels.test.tsx` | 337  | 19  | `(overrides?)` 1 symbol  | `{ engine }`（窄）       |
  | `scada-events.test.tsx`                     | 184  | 11  | `()` 0 override          | 无 scadaTestHandle       |
  | `scada-handles.test.tsx`                    | 308  | 9   | `(overrides?)`           | 无 scadaTestHandle       |
  | `scada-hover-overlay.test.tsx`              | 219  | 31  | `()` 0 override          | 无 scadaTestHandle       |
  | `scada-event-actions.test.tsx`              | 325  | 21  | `()` 0 override          | 无 scadaTestHandle       |
  - `makeProps` 结构跨 8 文件完全一致（仅 cid 值不同），8 文件均定义。
  - `configProp` 跨文件签名轻微差异（`ScadaConfig` vs `ScadaConfig | { version: number } | string`），实现均为单行 `as` 强转；7 文件定义（scada-handles 不定义，直接用 `validConfig()`）。
  - `scadaTestHandle` 仅 lifecycle 家族 4 文件定义（lifecycle/hardening/wiring 含 `getSymbol`、diagnostic 窄化为 `{ engine }`）；events/handles/hover-overlay/event-actions 不定义。实际 window 句柄是同一 `ScadaTestHandle`，差异纯为局部窄化。
  - `validConfig` 跨文件默认 symbol 数不同：lifecycle/wiring 默认 2 symbols（rect-1+rect-2，wiring 在 `:99,127,129,132` 断言 rect-2），diagnostic/handles 默认 1 symbol，events/hover-overlay/event-actions 默认 1 symbol 且无 `overrides` 参数。

- **真正剩余的 gap**：重复维护面（`makeProps` 8 份 + `configProp` 7 份 + `validConfig` 7 份 + `scadaTestHandle` 4 份）；`cid` 漂移已导致同一渲染器在不同测试里身份不一致（audit 指出的 7 vs 19 已发生），未来新增 test 文件会继续复制漂移。

## Goals

- 在 `renderer-test-support.tsx` 提供单一权威工厂集：`makeScadaCanvasProps`、`configProp`、`scadaTestHandle`、`validCanvasConfig`。
- 8 个 renderer 测试文件全部迁移到消费共享工厂，删除各自的局部重复定义。
- 消除 `cid` 漂移：工厂以 `cid` 为显式参数（带稳定默认值），消费文件按需传入。
- 全部测试行为不变（同等断言、同等覆盖）。

## Non-Goals

- 不抽取 `warnReported` / `warnReportCount` 等 diagnostic-channels 专有断言 helper（仅单文件使用，非跨文件样板）。
- 不抽取 `makeRegion` 等 lifecycle 专有 helper（仅单文件使用）。
- 不改动任何产品代码（`src/` 下非 test 文件）。
- 不处理 `SYMBOL_KEYS 派生 lint 守卫`（plan `2026-08-05-0653-2` Deferred `optimization candidate`，Successor Required: no，与本 plan 结果面不同）。
- 不处理 mock z-order / 几何重算建模（mission 级 mock 加固，非本 plan 范围）。
- 不迁移 `src/engine/` 或 `src/scada-canvas-smoke.test.tsx` 等非 renderer 测试文件（它们用的是 engine 级 test-support，样板形态不同，不在本 audit finding 范围）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/test-support/renderer-test-support.tsx`（新增 4 个工厂导出）。
- 上述 8 个 renderer 测试文件（删除局部样板 + 改引共享工厂）。
- roadmap Follow-up Backlog multi `[P2-2]` 回写「已由 plan ... 收口」marker。

### Out Of Scope

- 产品代码（`scada-canvas.tsx`、hooks、engine 等）。
- 非 renderer 测试文件的样板（engine 测试、smoke 测试）。
- 单文件专有 helper（diagnostic 断言、makeRegion）。

## Failure Paths

不适用：纯测试重构，无错误处理 / API 契约 / 鉴权 / 外部集成路径。唯一失败模式是「迁移后某测试断言行为变化」，由 Phase 2 的全量包级测试守护。

## Test Strategy

档位选择：`建议有测`

本档选择：`建议有测`——纯测试 hygiene 重构，无产品行为变更。验证策略为「Phase 1 新增工厂 focused 自测 + Phase 2 全量包级测试不回归」，不引入新产品测试。

## Execution Plan

### Phase 1 - 共享工厂落地

Status: completed
Targets: `packages/flux-renderers-industrial/src/test-support/renderer-test-support.tsx`、`packages/flux-renderers-industrial/src/test-support/renderer-test-support.test.ts`（新建）

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] `Decision`：确定 4 个工厂签名（裁定以下为权威签名）：
  - `makeScadaCanvasProps(overrides?: { cid?: number; props?: Record<string, unknown>; ... }): RendererComponentProps<ScadaCanvasSchema>` —— `cid` 默认值取非碰撞 sentinel `1`（无消费文件用 cid=1，仅作 "未指定" 占位，调用方按需显式传入真实 cid），`id`/`path`/`schema` 等保持现有默认，所有可变字段经 `overrides` 覆盖。
  - `configProp(config: ScadaConfig | { version: number } | string): ScadaCanvasConfigProp` —— 统一最宽入参签名；`ScadaCanvasConfigProp` 类型（`string | (ScadaConfig & SchemaObject)`）在 `renderer-test-support.tsx` 内定义并导出（替代各文件局部 `type ScadaCanvasConfigProp`），单行 `as` 强转。
  - `scadaTestHandle(cid: number): ScadaTestHandle | undefined` —— 复用 `scadaTestHandleKey(cid)` + 返回规范 `ScadaTestHandle`（从 `engine/test-handle.ts` 导入），消除局部窄化返回类型漂移。
  - `validCanvasConfig(overrides?: Record<string, unknown>): ScadaConfig` —— 最小默认（1 个 `scada-rect` symbol），`overrides` 浅合并到顶层（与 diagnostic-channels 现有签名一致，最通用）；**需 2+ symbol 的测试经 `overrides.symbols` 显式传入完整 symbols 数组**（浅合并顶层 key，symbols 整体替换）。
- [x] `Fix`：在 `renderer-test-support.tsx` 新增上述 4 个导出（复用既有 imports，新增 `ScadaCanvasEngine`/`ScadaTestHandle`/`scadaTestHandleKey` 类型 import）。
- [x] `Proof`：新建 `renderer-test-support.test.ts` 断言工厂行为——`makeScadaCanvasProps()` 默认 `cid` 稳定 + `overrides.cid` 生效 + `overrides.props` 合并；`configProp` round-trip；`scadaTestHandle` 读 window 句柄（mount/remove round-trip）；`validCanvasConfig()` 默认 1 symbol + `overrides.symbols` 替换。

Exit Criteria:

- [x] `renderer-test-support.tsx` 导出 4 个工厂，签名与 Decision 一致。
- [x] `renderer-test-support.test.ts` 全绿，断言工厂默认值 + override 合并 + handle round-trip。

### Phase 2 - 8 文件迁移

Status: completed
Targets: 8 个 renderer 测试文件（见 Current Baseline 表）

- Item Types: `Fix | Proof`

- [x] `Fix`：逐文件删除局部 `validConfig` / `makeProps` / `configProp` / `scadaTestHandle` 定义，改从 `../test-support/renderer-test-support.js` 导入对应工厂。保留各文件**专有** helper（`warnReported`/`warnReportCount`/`makeRegion` 等）不动。注：`scada-handles.test.tsx` 无局部 `configProp`（直接用 `validConfig()`），不强制引入 `configProp`；events/hover-overlay/event-actions 原无 `overrides` 参数，迁移后经工厂默认值等价。按文件实际消费的 helper 子集适配，不机械套用全 4 个。
- [x] `Fix`：逐文件校正 `cid`——把硬编码的漂移 cid（7/9/11/19/21/31）替换为经工厂 `cid` 参数显式传入（保持各测试原有 cid 语义不变，即该文件仍用其原 cid 值，只是经参数传入而非硬编码在 makeProps 内）。若某文件的 cid 值对断言无实际依赖（仅作为 window key），统一用工厂默认值。
- [x] `Fix`：逐文件校正 default symbol set——`scada-canvas-lifecycle.test.tsx` 与 `scada-canvas-lifecycle-wiring.test.tsx` 原默认 **2 symbols**（rect-1+rect-2，wiring 在 `:99,127,129,132` 断言 rect-2），迁移时经 `validCanvasConfig({ symbols: [rect-1, rect-2] })` 显式传入保持原默认，避免静默丢 rect-2 回归断言；其余文件原默认 1 symbol 与工厂默认一致，直接用 `validCanvasConfig()` 即可（个别文件经 `overrides` 注入特殊字段时保持原 overrides 语义）。
- [x] `Proof`：`pnpm --filter @nop-chaos/flux-renderers-industrial test` 全绿，测试数与迁移前一致（无测试丢失/新增），断言行为不变。

Exit Criteria:

- [x] 8 文件均无局部 `validConfig`/`makeProps`/`configProp`/`scadaTestHandle` 定义（`rg` 在 renderer 测试目录零命中局部定义）。
- [x] 包级全量测试全绿，测试总数 ≥ 迁移前（含 Phase 1 新增 factory 自测）。
- [x] 无 cid 漂移：同渲染器的 cid 在工厂参数层显式可见。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 独立子 agent fresh session（round 1 `ses_02f87e357ffeAB4319t06AhA2J`；round 2 `ses_02f7f5d56ffeg1s1LiC3sgcyZ9`）
- Verdict: `pass`（round 2，零 Blocker / 零 Major / 零 Minor）
- Rounds: 2（R1 `revised` 1 Major + 5 Minor → R2 `pass` 共识）
- Findings addressed:
  - R1 Major（Phase 2 未 operationalize default-symbol-set 保持）→ 新增 Phase 2 Fix 项（lifecycle/wiring 默认 2 symbols 经 `overrides.symbols` 显式传入，引用 wiring `:99,127,129,132` rect-2 断言）。
  - R1 Minor ×5（样板计数过述 / 4→8 扩展未注 / cid 默认值未文档化 / configProp 类型不一致+ScadaCanvasConfigProp 归属 / scada-handles 无 configProp 未注）→ 全部在 Current Baseline / Decision / Phase 2 逐条落地。

## Closure Gates

> 纯代码（测试）变更计划，`pnpm test`/`lint`/`typecheck`/`build` 均适用。

- [x] multi-audit `[P2-2]` 样板抽取已落地（8 文件迁移完成）
- [x] `cid` 漂移已消除（工厂参数化）
- [x] 必要 focused verification 已完成（Phase 1 factory 自测 + Phase 2 包级全量不回归）
- [x] 不存在被静默降级到 deferred 的 in-scope 项
- [x] roadmap Follow-up Backlog multi `[P2-2]` 回写「已由 plan ... 收口」marker
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

无。

## Non-Blocking Follow-ups

- `SYMBOL_KEYS 派生 lint 守卫`（plan `2026-08-05-0653-2` Deferred `optimization candidate`，Successor Required: no）——与本 plan 结果面不同，维持现状。

## Closure

Status Note: 执行完成（2026-08-05）。两 Phase 全部落地——Phase 1：`test-support/renderer-test-support.tsx` 新增 4 个权威工厂（`makeScadaCanvasProps` cid 参数化 sentinel 默认 1 / `configProp` + 导出 `ScadaCanvasConfigProp` / `scadaTestHandle(cid)` 复用 `scadaTestHandleKey` 返规范 `ScadaTestHandle` / `validCanvasConfig` 最小 1-symbol 默认）+ `renderer-test-support.test.ts` 11 项 factory 自测全绿；Phase 2：8 个 renderer 测试文件全部迁移（删除全部局部 `makeProps`/`configProp`/`scadaTestHandle`/`validConfig`/`ScadaCanvasConfigProp` 定义，rg 零命中），文件专有 helper 保留，cid 漂移消除（7/9/11/19/21/31 经 `makeScadaCanvasProps({ cid })` 显式可见），lifecycle/wiring 2-symbol 默认经 `validCanvasConfig({ symbols })` 显式传入保 wiring rect-2 断言不丢。包级 668 tests / 47 files 全绿（baseline 657 + 11 factory 自测，无测试丢失/新增产品测试），workspace 全量验证（typecheck/build/lint 32/32 + test 全绿）。closure-audit 已由独立 fresh-session sub-agent 执行并通过（zero Blocker/Major），plan 真正关闭。

Closure Audit Evidence:

- Auditor / Agent: independent fresh-session sub-agent（closure audit, 2026-08-05，task `ses_02ef03b19ffe8Qpp2W4fY1Gcxt`）
- Evidence: 独立 fresh session 复核 live repo（非复用执行者上下文）。Phase 1：`renderer-test-support.tsx:86-137` 导出 `ScadaCanvasConfigProp` + 4 工厂（`configProp`/`validCanvasConfig`/`scadaTestHandle`/`makeScadaCanvasProps`，cid sentinel 默认 1）签名与 Decision 一致；`renderer-test-support.test.ts`（11 tests / 4 describe）断言默认值 + override 合并 + handle mount/remove round-trip + 1-symbol 默认 + symbols 整体替换。Phase 2：`rg` 局部 `makeProps`/`validConfig`/`configProp`/`scadaTestHandle`/`ScadaCanvasConfigProp` 在 `src/renderer/` 返 ZERO_HITS；8 文件均 import 共享工厂；per-file 唯一 cid（lifecycle/hardening/wiring=7, diagnostic=19, events=11, handles=9, hover-overlay=31, event-actions=21）匹配，无 intra-file 漂移；文件专有 helper（`textConfig`/`alwaysAnimConfig`/`warnReported`/`warnReportCount`/`makeRegion`）保留。**关键回归核查 PASS**：lifecycle `lifecycleConfig()` 保 rect-1+rect-2（`:27-30`，断言 `:60`），wiring `wiringConfig()` 保 rect-1+rect-2（`:25-31`，rect-2 断言 `:98/:100/:103`）——Draft Review R1 Major 经 `validCanvasConfig({ symbols })` 正确 operationalize，rect-2 未被静默丢弃。复核：`pnpm --filter @nop-chaos/flux-renderers-industrial test` → 668 passed / 47 files（baseline 657 + 11 factory 自测）；`pnpm typecheck`/`build`/`lint` → 32/32 green。`git status` 仅 test 文件 + test-support + roadmap + plan 变更，产品代码未触。roadmap:496 multi `[P2-2]` 已标 ✅ 收口。零 in-scope defect 被降级。Minor：工作未提交（执行者将提交）；flow-designer 动态 import / babel PLUGIN_TIMINGS 为 baseline 既存 warning 与本 plan 无关。Verdict: `approved`，无 must-fix。

Follow-up:

- <<no remaining plan-owned work 或明确 successor>>
