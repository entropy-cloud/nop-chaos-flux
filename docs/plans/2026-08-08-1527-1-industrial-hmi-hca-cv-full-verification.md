# 01 Industrial HMI Component Audit — HCA-CV 全量验证（typecheck/build/lint/test + 6 scada e2e full-green + 性能基线复测）

> Plan Status: completed
> Last Reviewed: 2026-08-08
> Mission: industrial-hmi-component-audit
> Work Item: HCA-CV. 全量验证
> Source: `docs/backlog/industrial-hmi-component-audit-roadmap.md` §HCA-CV（Phase Details + Work Item Status HCA-CV=`todo`，依赖 HCA-CR=`done`）；`docs/plans/2026-08-08-1430-2-industrial-hmi-hca-cross-layer-remediation.md`（HCA-CR closure，Closure Gates `pnpm typecheck/build/lint/test` 32/32·32/32·32/32·59/59，industrial 100 files / 1340 tests）；`docs/context/project-context.md`（C0 e2e 基线：9 pre-existing 失败均非 scada）；`docs/analysis/industrial-hmi/benchmark-report.md`（I14 runtime 包络）+ `docs/analysis/industrial-hmi-editor/editing-envelope-retest-2026-08-07.md`（E9.2 编辑态包络）
> Related: HCA1–HCA11 / HCAX-1 / HCAX-2 / HCA-BL / HCA-CR（全 `done`，本 plan 验证对象）、HCA-LL（并行 successor，lesson 沉淀，结果面独立）、HCA-CG（successor，Guard 沉淀，依赖本 plan 通过）

## Purpose

在 HCA1–HCA11 + HCAX-1/HCAX-2 + HCA-CR 全部代码修复落地后，对 industrial 包做**mission 级全量验证收口**：workspace 全量 `pnpm typecheck/build/lint/test` + 6 个 scada e2e spec full-green + 性能基线复测（对照 I14 runtime 包络 / E9.2 编辑态包络）。本 plan 是**纯验证 + 诚实裁定**计划——交付物是 full-green 证据 + 性能复测报告 + 失败项的诚实 triage（audit 回归 → 修复；机器相关 perf flake → watch-only residual），不改 industrial 包的 supported 行为（除非发现 audit 自身修复引入的真实回归）。完成后解锁 HCA-CG（Guard 沉淀）。

## Current Baseline

> 起草前已核对 live repo（2026-08-08）。

- **HCA-CR closure 基线**（`docs/plans/2026-08-08-1430-2` Closure Gates）：`pnpm typecheck` 32/32、`pnpm build` 32/32、`pnpm lint` 32/32、`pnpm test` 59/59（industrial 100 test files / 1340 tests，+14 新测自 HCA-CR）。HCA-CR 5 项 Fix（connection-wiring pointerup / scada-engine destroyed guard / validate align+grid / cloneNodeDeep custom 深克隆）test-first 落地。
- **industrial 规模**：101 source files / ~100 test files（live `find` 实测 100 个 `*.test.ts(x)`）/ 1340+ tests。
- **e2e C0 基线**（`project-context.md`）：9 pre-existing e2e 失败（ai-chat timestamp、ai-rich-text-sender ×5、calendar-demo nav、diff-perf 200ms 阈值、input-suggest popover 稳定性）——**均非 scada spec**，即 C0 时 6 个 scada spec 全绿。
- **6 个 scada e2e spec**（`tests/e2e/scada-*.spec.ts`）：`scada-demo` / `scada-edge-cases` / `scada-perf` / `scada-pressure-demo` / `scada-editor-interaction-correctness` / `scada-editor-perf`。
- **性能包络（对照基线）**：
  - **I14 runtime**（`docs/analysis/industrial-hmi/benchmark-report.md`）：10 万图元可交互 ≥45fps / 首屏创建 <2s / 内存 ≤320MB / 1 万点刷新 <200ms；spec `tests/e2e/scada-perf.spec.ts`。
  - **E9.2 编辑态**（`docs/analysis/industrial-hmi-editor/editing-envelope-retest-2026-08-07.md`）：拖拽响应 ≥30fps@选区≤1k / 编辑操作 <100ms / 内存 ≤320MB；spec `tests/e2e/scada-editor-perf.spec.ts`。
- **已知机器相关 perf 波动先例**：`docs/logs/2026/08-06.md` 记录 scada-perf FPS 曾被列为 pre-existing（headless+swiftshader 帧钟波动，机器相关）；C0 基线（08-02 后）已不在 9 pre-existing 内。本 plan 复测时须区分「audit 回归」与「机器相关 flake」。

## Goals

- workspace 全量 `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` 全绿，捕获权威计数（包数 / industrial test file / test 数）。
- 6 个 scada e2e spec full-green；任何失败逐条 triage：audit 修复引入的回归 → root-cause 修复 + 回归测试；机器相关 perf flake / 非 audit 相关 pre-existing → watch-only residual（附 Why-Not-Blocking）。
- 性能复测：重跑 `scada-perf.spec.ts` + `scada-editor-perf.spec.ts`，数值对照 I14 / E9.2 包络；达标记录复测证据，未达标判定是否 audit 回归（修复）或机器方差（flag，**不自动放宽阈值**——perf 阈值属人工确认项）。
- 产出 CV 复测报告（`docs/analysis/industrial-hmi-component-audit/hca-cv-verification-2026-08-08.md` 或当日 `docs/logs/`）：含全量验证计数 + e2e 结果 + 性能复测表 + 失败 triage 裁定。
- roadmap §HCA-CV 状态两段流转：draft review 通过 `todo`→`planned`；closure audit 通过 `planned`→`done`（roadmap §Rule 1）。

## Non-Goals

- 不改 industrial 包 supported 行为 / 公共面（除非验证发现 audit 自身修复引入的真实回归，此时修回归属于本 plan scope）。
- 不做 HCA-LL（lesson 沉淀，并行 successor，纯文档）/ HCA-CG（Guard 沉淀，successor，依赖本 plan）。
- 不重跑全量 e2e 套件的 9 pre-existing 失败（非 scada、watch-only，out of scope）；只跑 6 scada spec。
- 不自动放宽 / 收紧 perf 阈值（R7 编辑态包络数字属人工确认阈值；AI 只复测 + 报告 + flag）。
- 不重新审计 / 不发现新 finding（本 plan 只验证已落地修复 + 复测基线）。
- 不做 validate.ts 行数治理（537 行，HCA-CG 所有权）。

## Scope

### In Scope

- workspace 全量 `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test`。
- `tests/e2e/scada-*.spec.ts`（6 spec）full-green 验证 + 失败 triage。
- `scada-perf.spec.ts` + `scada-editor-perf.spec.ts` 性能复测（对照 I14 / E9.2）。
- 验证中发现的 audit 回归修复（含回归测试）；机器相关 flake 的 watch-only residual 裁定。
- CV 复测报告 + `docs/backlog/industrial-hmi-component-audit-roadmap.md` §HCA-CV 状态。

### Out Of Scope

- 非 scada e2e spec / 9 pre-existing 失败。
- `docs/bugs/`（HCA-BL done）/ `docs/skills/` + checklist v2（HCA-LL / HCA-CG）。
- validate.ts 拆分（HCA-CG）。
- perf 阈值裁定 / R7 人工最终确认（人工确认阈值）。
- 非 industrial 包代码。

## Failure Paths

> CV 关注区分「audit 回归」与「机器方差 / pre-existing」。判定原则：失败定位到 HCA\* 修复落点的代码路径 → 回归（须修）；失败为 FPS 数值波动 / 机器相关 / 与 audit 修复无因果 → flake / residual（诚实裁定，不硬修）。

| 可测场景编号         | 触发                                        | 行为                                                                                        | 可重试 | 用户可见表现 / 裁定                                          |
| -------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------ |
| static-regression    | typecheck/build/lint/test 某项失败          | 定位：audit 修复落点 → 修；非 audit（如跨包）→ flag 升级                                    | 否     | 全绿通过；否则定位 + 修复或 flag                             |
| e2e-functional-fail  | 6 scada spec 中功能性用例失败               | 定位到 audit 修复（pointerup / destroyed guard / validate 严格化 / clone）→ root-cause 修   | 否     | 用例转绿 + 回归测试                                          |
| e2e-perf-flake       | scada-perf / scada-editor-perf FPS 数值波动 | 重跑隔离；机器方差（headless+swiftshader 帧钟）→ watch-only residual（附 Why-Not-Blocking） | 是     | 复测数值记录；flake 不阻塞 closure（与 C0 / 08-06 先例一致） |
| perf-out-of-envelope | 复测数值落在 I14/E9.2 包络外                | 判定 audit 回归（修复）vs 机器退化（flag）；**不自动放宽阈值**                              | 否     | 回归 → 修复转绿；机器退化 → flag + 记录，R7 属人工确认       |

## Test Strategy

本档选择：**必须自动化**

CV 的交付物就是 full-green 自动化验证证据本身。Proof 先于 Fix：若验证发现 audit 回归，先写 failing-first 回归测试（断言结果值，非 not.toThrow）复现回归，再修。机器相关 perf flake 不写测试（诚实裁定为 watch-only residual）。验证以现有 suites（unit 59 包 / e2e 6 scada spec / perf 2 spec）重跑为主，不新造测试除非发现回归。

## Execution Plan

### Phase 1 - Workspace 全量静态验证

Status: completed
Targets: workspace 根（`pnpm typecheck/build/lint/test`）

- Item Types: `Proof | Fix`

- [x] 跑 `pnpm typecheck`（全包），捕获 N/N 计数。
- [x] 跑 `pnpm build`（全包），捕获 N/N 计数。
- [x] 跑 `pnpm lint`（全包），捕获 N/N 计数。
- [x] 跑 `pnpm test`（全包 unit），捕获包数 + industrial test file 数 + test 总数（对照 HCA-CR closure 1340 tests 基线，确认无 unit 回归）。
- [x] 任一项失败：定位是否 audit 修复落点回归 → `Fix`（failing-first 回归测试先于 fix）；非 audit → flag 并在 Phase 3 裁定。

Exit Criteria:

- [x] 四项静态验证命令输出 + 计数记录入 CV 报告草稿（无悬而未决失败，或失败已定位 + 分类）。
- [x] 若有 audit 回归，已 failing-first 修复转绿（局部 `pnpm --filter @nop-chaos/flux-renderers-industrial test` 验证）。

**Phase 1 Evidence** (2026-08-08 live run, `FULL TURBO` cache replay = outputs identical to post-HCA-CR build):

- `pnpm typecheck`: 32/32 successful (32 cached, FULL TURBO)
- `pnpm build`: 32/32 successful (32 cached, FULL TURBO)
- `pnpm lint`: 32/32 successful (32 cached, FULL TURBO)
- `pnpm test`: 59/59 packages successful (full workspace)
- `pnpm --filter @nop-chaos/flux-renderers-industrial test`: **100 test files / 1340 tests** passed — **exact match** to HCA-CR closure baseline (100 files / 1340 tests), confirming zero unit-test regression from audit fixes.
- No static failures → no Fix needed; no flag needed. Phase 1 verdict: clean pass.

### Phase 2 - 6 scada e2e spec full-green 验证 + 失败 triage

Status: completed
Targets: `tests/e2e/scada-*.spec.ts`（6 spec）

- Item Types: `Proof | Fix`

- [x] 跑 6 scada e2e spec（`scada-demo` / `scada-edge-cases` / `scada-perf` / `scada-pressure-demo` / `scada-editor-interaction-correctness` / `scada-editor-perf`），按 `docs/references/e2e-test-diagnostic-guide.md` 程序化诊断（**禁止截图诊断**，用 `page.evaluate` / `getComputedStyle` / 计时 API）。
- [x] 功能性失败 triage：定位到 audit 修复（HCA11-P2-2 connection-wiring pointerup / HCA2 destroyed guard / HCA4 validate align+grid 严格化 / HCA11 cloneNodeDeep）→ root-cause `Fix` + failing-first 回归测试；非 audit 相关 → flag。
- [x] FPS 数值波动（scada-perf / scada-editor-perf）：重跑隔离，机器方差 → 标记待 Phase 3 watch-only residual 裁定（不硬修）。

Exit Criteria:

- [x] 6 scada spec 结果记录入 CV 报告（full-green，或失败逐条 triage 完成）。
- [x] audit 回归（若有）已 failing-first 修复转绿；非回归 flake 已分类待裁定。

**Phase 2 Evidence** (2026-08-08 live run, current `feat-industrial-hmi` worktree dev server, programmatic diagnostics via `page.evaluate`):

Initial run hit 23 failures → root-caused to a **stale dev server** (PID 32950, cwd `nop-chaos-flux-master` sibling worktree) being reused via `reuseExistingServer: !CI`; it served the main branch (no scada routes on home page). Killed stale server → re-run on fresh current-worktree server.

Re-run result (24 passed / 7 failed across 6 specs):
| spec | result |
| --- | --- |
| scada-pressure-demo | ✅ all pass |
| scada-editor-interaction-correctness | ✅ all pass |
| scada-editor-perf (E9.2) | ✅ all pass |
| scada-perf (I14) | 3 pass / 1 fail (see below) |
| scada-demo | 7 pass / 5 fail (hover/click-on-symbol) |
| scada-edge-cases | 4 pass / 2 fail (hover overlay) |

**Triage of 7 failures — ALL non-audit (no causal path to any HCA\* fix):**

Programmatic diagnostic (`_diag-scada-hover.spec.ts`, since removed) established:

- Overlay mechanism **functional**: manual `engine.interactionOverlay.highlight('pump-1')` → `activeCount=1`, `hasActive('pump-1')=true`. Event chain + engine healthy (`eventBridgeExists=true`, `interactionLayer=true`, `registryHasPump1=true`, `destroyed=false`).
- Hover event **does not fire** on `page.mouse.move`: `activeCount=0` after move. Root cause = **mouse coordinates land OUTSIDE the canvas DOM box**: canvas box `{x:466.6, y:310.8, width:302.8, height:520}` but pump-1 world `(350,278)` → `getViewportPoint` → screen x `816.6` > box right edge `769.5` (off-canvas). Declared canvas `width:960` (scada-demo.tsx:53) but rendered at 302px; `viewport.fit:'contain'` not applied (`scale:1`).
- The 08-06 non-audit commit **`9a8a6f38` "SCADA demo 视觉重设计（三区布局）"** reshaped the demo page layout after the hover tests were last green (08-04 `cb2e753a`: "scada-\* e2e 23/23"). The three-zone layout narrows the rendered canvas so world-coord-based hover/click targets fall off-canvas.

`scada-perf:155` failure: NOT a perf-envelope breach — measured `[PERF] Scada 100k pan render-throughput fps: best=49.3` (≥45, **meets I14**). Failed only on TE-1 guard `pointer drag must actually move the viewport` (same pointer/canvas-interaction class as hover; `viewport.ts` last changed by non-audit `ddd39b1b` 08-04).

**HCA audit diff audit (all HCA\* feat commits reviewed)**: touched only connection-wiring / undo-redo-adapter / scada-engine(importConfig→reset) / validate / editor-working-helpers / pipe-junction / dirty-collector+refresh-pipeline(import refactor, "97 files / 1307 tests 不变") / editor palette+renderer-definitions / scada-canvas a11y(role+aria-label ONLY, dd6f111f) / config-types / diff. **None** touch canvas DOM sizing, viewport-fit logic, hover event-bridge, hit-testing, or pointer-drag-pan.

Verdict: 0 audit regressions. 7 failures adjudicated → Phase 3 watch-only residual (non-audit, canvas-sizing/pointer-interaction, pre-existing since 08-06 redesign). Per Non-Goals "不重新审计 / 不发现新 finding" + "不改 industrial 包 supported 行为（除非 audit 自身修复引入回归）", fixing the 08-06 layout regression is **out of scope** for CV (feed to industrial successor).

### Phase 3 - 性能基线复测 + 失败裁定 + CV 报告

Status: completed
Targets: `tests/e2e/scada-perf.spec.ts` + `tests/e2e/scada-editor-perf.spec.ts`；I14 / E9.2 包络报告；CV 复测报告 + roadmap

- Item Types: `Proof | Decision | Follow-up`

- [x] 重跑 `scada-perf.spec.ts`（I14 runtime 包络：≥45fps / <2s / ≤320MB / <200ms），数值对照 `benchmark-report.md`，记录复测表。
- [x] 重跑 `scada-editor-perf.spec.ts`（E9.2 编辑态包络：≥30fps@≤1k / <100ms / ≤320MB），数值对照 `editing-envelope-retest-2026-08-07.md`，记录复测表。
- [x] `Decision`：逐项裁定——达标记录证据；未达标判定 audit 回归（`Fix`，已在 Phase 1/2 修或本 Phase 补修）vs 机器退化（flag，**不放宽阈值**，R7 人工确认）；FPS 机器方差 flake → watch-only residual（附 Why-Not-Blocking：headless+swiftshader 帧钟波动，与 C0 / 08-06 先例一致，非 audit 回归）。
- [x] 产出 CV 复测报告（`docs/analysis/industrial-hmi-component-audit/hca-cv-verification-2026-08-08.md`）：全量验证计数 + 6 scada e2e 结果 + 性能复测表（I14/E9.2 对照）+ 失败 triage 裁定 + 与 HCA-CR closure 基线的 diff。
- [x] `Follow-up`：roadmap §HCA-CV 行状态预留 closure audit 通过后改 `done` 的说明（实际改写在 closure audit pass 后）。

Exit Criteria:

- [x] 性能复测表含 I14（4 项）+ E9.2（3 项）数值 + 包络对照 + 裁定（达标 / 回归已修 / watch-only residual）。
- [x] CV 复测报告存在且含全量验证 + e2e + 性能 + triage 四节，无悬而未决失败（全绿或已诚实裁定）。
- [x] roadmap §HCA-CV 行说明就绪（待 closure audit pass 回写 `done`）。

**Phase 3 Evidence** (详见 CV 报告 `docs/analysis/industrial-hmi-component-audit/hca-cv-verification-2026-08-08.md`)：

I14 runtime（6 项全达标）：首屏创建 348ms <2s ✅｜pointer rAF fps 50.3 ≥45 ✅｜render-throughput fps 49.5 ≥45 ✅｜内存 stroke 131.7MB ≤320 ✅｜内存 no-stroke 129MB ≤320 ✅｜1万点刷新 43.6ms <200ms ✅。复测值与 I14.3 基线同量级；pointer fps 50.3 vs 基线 70.3 属 headless 帧钟机器方差（≥45 余量 ~12%），非 audit 回归。

E9.2 编辑态（3 项全达标，3/3 test green）：② 编辑操作 per-call <100ms ✅｜① 拖拽 fps ≥30 @1k ✅｜④ 内存 ≤320MB ✅。`envelope-below-candidate` 不触发。R7 维持「AI 复测达标 + 待人工最终确认」（AI 不自确认人工阈值）。

`Decision`：I14/E9.2 包络全部达标，无 envelope 突破，无 audit 回归。7 e2e failures（hover/click-on-symbol + pointer-drag-pan TE-1 guard）诚实裁定为 watch-only residual（08-06 非 audit 三区布局遗留 + pointer-interaction，非 HCA\* 修复落点）。CV 报告含四节齐全 + 与 HCA-CR closure diff（静态/unit 零偏差）。

## Draft Review Record

> 起草后、执行前的独立审查证据（详见 guide `Plan Review Rule`）。由独立子 agent（fresh session）反复 review 直到共识后填写。

- Reviewer / Agent: 独立子 agent fresh session `ses_01fb74bbeffezSCU9OcOMo5dUm`
- Verdict: `pass`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major。2 Minor（不阻塞）：m-1 Phase 3 输出目录 `docs/analysis/industrial-hmi-component-audit/` 尚不存在（plan 已 hedge「或当日 docs/logs/」fallback，执行时 mkdir 或落 logs，非阻断）；m-2 roadmap §HCA-CV 行仍带 pre-CR 旧计数（1302+ tests / 97+ test files），plan 已用 post-CR 100 files / 1340 tests，closure 时回写 roadmap 行——plan 本身无需改。live 核对全通过：6 scada spec 名一致、benchmark-report.md（I14 包络）+ editing-envelope-retest-2026-08-07.md（E9.2 包络）+ e2e-test-diagnostic-guide.md 存在、C0 9 pre-existing 均非 scada、HCA-CR closure 32/32·32/32·32/32·59/59 + industrial 100/1340、validate.ts 537 行（CG scope）准确。

## Closure Gates

> CV 是验证计划：全量 `pnpm typecheck/build/lint/test` 是 Closure Gates 主体（也是交付物）。e2e + 性能复测为本 plan 专属 gate。

- [x] workspace `pnpm typecheck` 全绿（N/N）。
- [x] workspace `pnpm build` 全绿（N/N）。
- [x] workspace `pnpm lint` 全绿（N/N）。
- [x] workspace `pnpm test` 全绿（含 industrial test file / test 计数对照 HCA-CR 1340 基线无回归）。
- [x] 6 scada e2e spec full-green（或失败已诚实 triage：audit 回归已修 / flake 已裁定 watch-only residual）。
- [x] 性能复测对照 I14 / E9.2 包络（达标记录 / 回归已修 / 机器退化 flag 未自动放宽阈值）。
- [x] CV 复测报告产出（四节齐全，无悬而未决失败）。
- [x] 不存在被静默降级到 deferred 的 audit 回归（回归 = Fix，不得降级 residual）。
- [x] roadmap §HCA-CV 行状态一致（closure audit 通过后 `done`）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。

Closure Gates 证据：typecheck 32/32 · build 32/32 · lint 32/32 · test 59/59（industrial 100 files / 1340 tests，与 HCA-CR 零偏差）· I14 六项 + E9.2 三项 perf 包络全达标 · 7 e2e failures 全部 non-audit watch-only residual（0 audit 回归，0 静默降级）。末两项经 closure audit pass（fresh session `ses_01f976451ffeyxrjLAqE5BeqDH`）落地。

## Deferred But Adjudicated

> 起草时无已知可延期项。Phase 2/3 裁定为 watch-only residual 的机器相关 perf flake（如 scada-perf / scada-editor-perf FPS headless+swiftshader 帧钟波动）将在此节记录（Classification + Why Not Blocking Closure + Successor Required=no），仅在执行中实际命中时填入。confirmed audit 回归不得进入此节（必须 Fix）。

执行中实际命中并裁定的 watch-only residual：

1. **scada-demo ×5 + scada-edge-cases ×2（hover/click-on-symbol e2e）** — Classification: e2e-functional（non-audit）。Root cause: 08-06 非 audit 提交 `9a8a6f38` "SCADA demo 视觉重设计（三区布局）" 收窄 canvas DOM 宽度（声明 960 / 实际渲染 302px），world 坐标 hover/click 落点离屏；`viewport.fit:'contain'` 未生效。Why Not Blocking Closure: 非 HCA\* 修复落点（HCA diff 全量复核确认均不触及 canvas-sizing/viewport-fit/hover-event-bridge），CV 验证对象（audit 修复）无因果；静态/unit 零回归。Successor Required: **yes** → industrial successor 修复 08-06 三区布局 canvas sizing（喂入 industrial-hmi backlog；非 HCA-CG scope）。
2. **scada-perf:155（pointer-drag viewport TE-1 guard）** — Classification: e2e-functional TE-1 guard（non-audit；**非 perf 数值突破**）。FPS 实测 pointer rAF 50.3 / render-throughput 49.5 均 ≥45 达 I14 包络。Root cause: pointer-drag-pan 未驱动 zoomLayer（viewport.ts 最近改动非 audit `ddd39b1b` 08-04）。Why Not Blocking Closure: perf 包络达标，guard 失败属 pointer/canvas-interaction 同类问题，非 HCA\* 修复落点。Successor Required: yes → 同 #1 industrial successor。

## Non-Blocking Follow-ups

- HCA-CG（Guard 沉淀）：依赖本 plan 通过；validate.ts 537 行拆分 + checklist v2 industrial 专项 + 工具脚本升级。
- HCA-LL（lesson 沉淀）：并行 successor，若 CV 发现新 lesson 值得模式（如 perf flake triage 经验）喂入 LL。
- R7 编辑态包络人工最终确认（人工确认阈值，AI 只 flag 不自确认）。

## Closure

Status Note: HCA-CV 全量验证收口完成（closure audit PASS）。静态四项全绿 32/32·32/32·32/32·59/59（industrial 100 files / 1340 tests，与 HCA-CR closure 基线零偏差，零 unit 回归）；6 scada e2e 24 pass / 7 fail，7 failures 全部诚实裁定为 non-audit watch-only residual（08-06 `9a8a6f38` 三区布局收窄 canvas 致 pointer 坐标离屏，+ pointer-drag-pan TE-1 guard；0 audit 回归，0 静默降级）；I14（六项）+ E9.2（三项）perf 包络全部达标，无 envelope 退化，无阈值放宽（R7 维持待人工最终确认）。解锁 HCA-CG（Guard 沉淀）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session `ses_01f976451ffeyxrjLAqE5BeqDH`（three-piece set 独立审计，非执行 session 自审）
- Verdict: `pass`（零 Blocker / 零 Major / 零 Minor）
- Evidence: CV 报告 `docs/analysis/industrial-hmi-component-audit/hca-cv-verification-2026-08-08.md`；live 复核 static 32/32·32/32·32/32 + industrial 100/1340；triage 诚实性确认（`9a8a6f38` 非 audit，audit canvas diff 仅 a11y role/aria-label 不触及 sizing/hover/hit；0 audit 回归静默降级）；perf 阈值未放宽（scada-perf.spec.ts 阈值 `<2000`/`≥45`×2/`≤320`×2/`<200` 原样）；zero 源码改动（仅 docs）；Closure Gates 10/10。

Follow-up:

- HCA-CG successor（`todo`，依赖本 plan 通过——已满足）。
- industrial successor（非 HCA-CG scope）：修复 08-06 `9a8a6f38` 三区布局 canvas sizing 回归（world-coord pointer 离屏）。
- 除 successor 外无 plan-owned remaining work。
