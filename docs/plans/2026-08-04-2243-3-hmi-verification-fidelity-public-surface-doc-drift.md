# {2243-3} HMI — Verification Fidelity, Public Surface & Doc-Drift Hardening

> Plan Status: active
> Mission: industrial-hmi
> Work Item: Follow-up Backlog §2026-08-04-2242 post-remediation audit (Test effectiveness dim 14/23 + Public API dim 03 + Documentation drift dim 16 + Wiring dead-code)
> Last Reviewed: 2026-08-05
> Source: `docs/audits/2026-08-04-2242-multi-audit-industrial-hmi.md` (dim 14/23: 6 P2 test/mock findings; dim 03: 1 P2 public-API leak; dim 16: 3 P2 doc-drift; dim 22: 1 P2 dead-code)
> Related: `docs/plans/2026-08-04-1558-3-hmi-display-geometry-test-effectiveness-plan.md` (mock↔real drift 面，gate-3 M-1/M-2/M-3 同根因), `docs/plans/2026-08-04-1558-1-hmi-public-api-surface-convergence-plan.md` (公共面收敛先例), `docs/plans/2026-08-04-2243-1-hmi-lifecycle-destruction-pipeline-hardening.md` + `2026-08-04-2243-2-hmi-geometry-viewport-data-path-correctness.md` (先固化运行时，本 plan 是验证/契约 fidelity 层), `docs/components/roadmap-industrial-hmi.md`

## Purpose

把 SCADA 包的**验证 fidelity / 公共面 / 文档一致性**上的 11 项确认 P2 finding 收口：mock 建模对齐真实 leafer（`zoomLayer === tree`、bounds API stub）以防 mock 掩蔽 live defect（gate-3 M-1/M-2/M-3 同根因复发）、e2e canvas 存在性硬门覆盖全压力路径且像素探测对非空场景严格、`not.toThrow()` 弱断言换负向副作用断言、`IndustrialRendererSchema` 公共面泄漏收敛、`ConfigAdapter.setConfig` 死代码移除、`design-renderer.md §6/§10` 与 `design-engine.md §8.3` 文档漂移同步。这些共享同一结果面（验证可信度 + 契约/文档一致性），统一由本 plan 收口。

## Current Baseline

> 已对照 live repo 核对（`packages/flux-renderers-industrial/src/`，2026-08-05）。行号随实现可能漂移，以函数/符号名为准。

- **T1 `MockApp.tree.zoomLayer` 独立实例**：`src/test-support/leafer-ui-mock.ts:210` `zoomLayer: MockZoomLayer` + `:223` `this.zoomLayer = new MockZoomLayer(...)`；真实 leafer `tree.zoomLayer === tree`（viewport 插件语义）。未来产线代码直读 `tree.scaleX` 在 mock 见身份、产线见 viewport transform。`{1558-3}` P1-9 已按真实 `zoomOfLocal` 语义建模 zoomLayer 锚定副作用，但身份仍独立。
- **T2 `MockLeaf`/`MockGroup` 未建模 bounds API**：`leafer-ui-mock.ts:16` `MockLeaf`、`:126` `MockGroup` 无 `getBoundsToWorld`/`worldBox`/`getBounds()`；未来产线代码调 leafer bounds API 在 mock 见 `undefined`。
- **T3 pressure-demo canvas 硬门覆盖缺口**：`tests/e2e/scada-pressure-demo.spec.ts:49-110,112-145` `assertScadaCanvasRendered` 只盖 overview 场景；10k-symbol 切换路径无硬门。
- **T4 perf canvas 硬门 skipped**：`tests/e2e/scada-perf.spec.ts:272-305,307-377` 10k-refresh 与 memory 测试 canvas 硬门 skipped。
- **T5 `assertScadaCanvasRendered` 像素探测 best-effort**：`tests/e2e/helpers/scada-canvas-assert.ts:85-113,122-128` 非空场景下 `visible:false`/`opacity:0` 回归会过（`renderFrames>0` 满足、像素 `fallback-all-zero` 非失败）。
- **T6 弱断言 + 重复覆盖**：多处 `not.toThrow()`（`scada-canvas-lifecycle-hardening.test.tsx:453-472`、`scada-robustness-hardening.test.ts:194-241`、`scada-points-bridge.test.tsx:122-132`、`renderer-definitions.test.ts:139-148`、`use-scada-config-sync.test.ts:78-84` 双重 `computeSymbolBounds([])`）。
- **A1 `IndustrialRendererSchema` 公共面泄漏**：`src/index.ts:36` `export type { IndustrialRendererSchema }` + `src/renderer-definitions.ts:209` `export type IndustrialRendererSchema = ScadaCanvasSchema`；零消费者，不在 `design-renderer.md §11` 授权清单。
- **W2 `ConfigAdapter.setConfig` 死代码**：`src/engine/config-adapter.ts:45` `setConfig(config: ScadaConfig): void` 全仓零消费者 + stale-index footgun（未来贡献者直调会跳过 tree 重建 + `nodeById` 刷新，重引 P1-4 形态）。
- **Doc1 `design-renderer.md §10` loading/error marker 漂移**：`scada-canvas.tsx:247,250` 发 `nop-scada-canvas-loading`/`nop-scada-canvas-error`（且有 CSS），但 §10 表两行记 `—`。
- **Doc2 `design-renderer.md §6:187` overlay slot 未 retire**：§6 仍记已移除的 `data-slot="scada-canvas-overlay"`，与 §10「已移除」自相矛盾（`{1558-3}` Phase 1 已移除 §10 行，§6 漏改）。
- **Doc3 `design-engine.md §8.3` ScadaTestHandle 漏字段**：`test-handle.ts:9-21` 9 成员（含 `setPointValues?`/`measureAddStrategies?`）vs 文档 7 成员；sibling `editor-initiation.md:59` 正确列全。

## Goals

- T1/T2：mock 对齐真实 leafer 身份/语义（`zoomLayer === tree`、bounds API stub 抛「mock 不建模」错），消除 mock 掩蔽 live defect 的失败模式。
- T3/T4：e2e canvas 存在性硬门覆盖全部压力/性能成功 ready 路径（10k/pressure/perf）。
- T5：非空场景下 `assertScadaCanvasRendered` 像素 `fallback-all-zero` 视为失败。
- T6：`not.toThrow()` 弱断言换副作用负向断言，删重复覆盖、misnamed 文件改名/补直测。
- A1：`IndustrialRendererSchema` 从 `index.ts` 公共面移除（或加进 §11 授权枚举——Decision，倾向移除因零消费者）。
- W2：`ConfigAdapter.setConfig` 死代码删除或改名 `setConfigReference` + inline 注记。
- Doc1/Doc2/Doc3：三处文档漂移同步 live baseline。

## Non-Goals

- 不改运行时生命周期/几何/数据路径行为（plan `{2243-1}`/`{2243-2}`）；本 plan 仅 mock/test/公共面/文档，唯一 runtime 改动是 A1 类型导出移除 + W2 死代码删除（均无消费者）。
- 不实现 W1 表达式订阅诊断（successor，见 plan `{2243-1}` Deferred）。
- 不重写 e2e 框架；仅在既有 `scada-canvas-assert.ts` / spec 上补强。
- 不改 leafer-ui 真实依赖版本（已锁 v2.2.9）。

## Scope

### In Scope

- `src/test-support/leafer-ui-mock.ts`（T1 zoomLayer 身份 + T2 bounds API stub）
- `tests/e2e/scada-pressure-demo.spec.ts` + `tests/e2e/scada-perf.spec.ts`（T3/T4 canvas 硬门覆盖）
- `tests/e2e/helpers/scada-canvas-assert.ts`（T5 像素严格化）
- 多个 unit test 文件（T6 弱断言替换）
- `src/index.ts` + `src/renderer-definitions.ts`（A1 公共面）
- `src/engine/config-adapter.ts`（W2 死代码）
- `docs/components/industrial-hmi/design-renderer.md`（Doc1/Doc2）+ `design-engine.md`（Doc3）

### Out Of Scope

- lifecycle/geometry runtime 行为（plan `{2243-1}`/`{2243-2}`）
- W1 表达式诊断（successor）、编辑器时代资源诊断（I16 后继）

## Failure Paths

> 本 plan 主体是验证/契约 fidelity，无运行时错误处理路径变更。A1/W2 为零消费者清理，移除后 `pnpm typecheck`/`build` 须仍全绿（若有隐藏消费者则 typecheck 暴露 → 回滚移除并改加进 §11 授权枚举）。

## Test Strategy

档位选择：**建议有测**。本 plan 改动 mock/test/公共面，其「测试」即既有套件保持全绿 + 新增 mock-invariant 单测证明 zoomLayer 身份/bounds stub 行为；A1/W2 移除后 typecheck/build 是硬门。

## Execution Plan

### Workstream 1 - Mock fidelity（T1 + T2）

Status: planned
Targets: `src/test-support/leafer-ui-mock.ts`

- Item Types: `Fix`（mock↔real 漂移）

- [ ] T1：`MockApp`/`MockTree` 的 `zoomLayer` getter 返 `this`（对齐真实 `tree.zoomLayer === tree`）。注：这不是纯 getter 改写——`MockZoomLayer` 承载 P1-9 建模的 `scaleOfWorld`/`scaleX`/`scaleY`/`move`/`moveCalls`/`scaleOfWorldCalls` 等专有成员，`MockLeaf`/`MockGroup`/`MockLeafer` 当前没有；Phase 内需让 tree 身份继承/混入这些能力（或调整 mock 类型层级），并扫描修正既有假设独立身份的断言，保留 P1-9 锚定副作用建模一致性
- [ ] T2：`MockLeaf`/`MockGroup` 加 `getBoundsToWorld`/`worldBox`/`getBounds()` stub，抛「mock 不建模 bounds API」错（或返回确定性退化值——Decision，倾向抛错以暴露误用）
- [ ] Proof：mock-invariant 单测——(a) `app.tree.zoomLayer === app.tree`；(b) 调 bounds API 抛预期错；既有 leafer mock 消费者套件全绿

Exit Criteria:

- [ ] `zoomLayer === tree` 身份对齐，mock-invariant 单测入库，既有套件全绿
- [ ] bounds API stub 行为明确（抛错或退化），单测入库
- [ ] 包级 `pnpm --filter @nop-chaos/flux-renderers-industrial test` 全绿

### Workstream 2 - e2e assert hardening（T3 + T4 + T5 + T6）

Status: planned
Targets: `tests/e2e/scada-pressure-demo.spec.ts`, `tests/e2e/scada-perf.spec.ts`, `tests/e2e/helpers/scada-canvas-assert.ts`, 多个 unit test 文件

- Item Types: `Fix`（断言有效性）

- [ ] T3：`scada-pressure-demo.spec.ts` 10k/pressure 每个成功 ready 后补调 `assertScadaCanvasRendered`
- [ ] T4：`scada-perf.spec.ts` 10k-refresh 与 memory 测试补 `assertScadaCanvasRendered`（移除 skip）
- [ ] T5：`scada-canvas-assert.ts` 非空场景下 `fallback-all-zero` 视为失败（仅空场景允许 fallback）；保留 SecurityError/全零 F2 fallback 语义对空场景
- [ ] T6：逐处替换 `not.toThrow()` 为副作用负向断言、删重复覆盖（如双重 `computeSymbolBounds([])`）、misnamed 文件改名或补 hook 直测
- [ ] Proof：全量 scada e2e + playground-entry-pages 无 allowance 全绿；T6 改后单测覆盖不下降

Exit Criteria:

- [ ] pressure/perf 全成功 ready 路径有 canvas 硬门，全量 scada e2e 全绿
- [ ] 非空场景像素 `fallback-all-zero` 判失败
- [ ] `not.toThrow()` 弱断言清零（或残留项显式记入 Follow-up 并附理由），无重复覆盖

### Workstream 3 - Public surface & doc drift（A1 + W2 + Doc1 + Doc2 + Doc3）

Status: planned
Targets: `src/index.ts`, `src/renderer-definitions.ts`, `src/engine/config-adapter.ts`, `docs/components/industrial-hmi/design-{renderer,engine}.md`

- Item Types: `Fix`（公共面/死代码/文档漂移）

- [ ] A1：`IndustrialRendererSchema` 从 `index.ts:36` 移除（零消费者）；typecheck/build 验证无隐藏消费者（若有则回滚并加进 §11 授权枚举）
- [ ] W2：`ConfigAdapter.setConfig` 死代码删除（零消费者），或改名 `setConfigReference` + inline 注记防 stale-index footgun——Decision，倾向删除
- [ ] Doc1：`design-renderer.md §10` loading/error 两行 marker 改 `nop-scada-canvas-loading`/`nop-scada-canvas-error`
- [ ] Doc2：`design-renderer.md §6:187` 移除已 retire 的 `data-slot="scada-canvas-overlay"` 引用，与 §10 一致
- [ ] Doc3：`design-engine.md §8.3` ScadaTestHandle 补 `setPointValues?`/`measureAddStrategies?` + 「非公共契约」注（对齐 `editor-initiation.md:59`）
- [ ] Proof：A1/W2 移除后 `pnpm typecheck && pnpm build` 全绿；三处文档抽查与 live code 一致

Exit Criteria:

- [ ] `IndustrialRendererSchema` 公共面收敛（移除或授权），`ConfigAdapter.setConfig` 死代码移除，typecheck/build 全绿
- [ ] Doc1/Doc2/Doc3 三处文档漂移同步 live baseline
- [ ] 包级单测全绿

## Draft Review Record

- Reviewer / Agent: `ses_03220ea6cffeP3zimdSCd8kwD8`（fresh session）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major；2 项实质 Minor 全部落地——(1) T1 补注：`zoomLayer === this` 非纯 getter 改写，`MockZoomLayer` 承载 P1-9 建模的 `scaleOfWorld`/`scaleX`/`scaleY`/`move`/`moveCalls`/`scaleOfWorldCalls` 专有成员，Phase 内需让 tree 身份继承/混入这些能力（或调整 mock 类型层级）并扫描既有断言；(2) 移除重复「本档选择」行。Rule 22-26 复审：11 项 finding 同属验证/契约 fidelity 结果面、共享同一 proof path（套件全绿 + mock-invariant + typecheck/build 硬门），与 2243-1/2 运行时行为有独立 closure criteria → 单 owner plan + 3 workstream 拆分合理，非 over-split。11 项 finding 真实性 + A1/W2 零消费者声明经独立 grep 核对成立。

## Closure Gates

- [ ] T1-T6 + A1 + W2 + Doc1-Doc3 共 11 项 in-scope finding 全部 landed
- [ ] 不存在被静默降级到 deferred 的 in-scope live defect
- [ ] `design-renderer.md §6/§10` + `design-engine.md §8.3` 同步 live baseline
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### T6-residual — 个别 `not.toThrow()` 替换受 hook 私有性阻塞

- Classification: `watch-only residual`
- Why Not Blocking Closure: 若个别弱断言替换需导出私有 hook 才能直测（破坏封装），保留 `not.toThrow()` 并记理由；mock fidelity（T1/T2）与 e2e 硬门（T3-T5）已提供主路径覆盖，残留弱断言不阻塞验证 fidelity closure。
- Successor Required: no

## Non-Blocking Follow-ups

- W1 表达式订阅 `flux-deps-empty` 诊断（successor，见 plan `{2243-1}` Deferred）
- mock bounds API 若未来产线代码真需，可升级 stub 为确定性建模（optimization candidate）

## Closure

Status Note: <<关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立 fresh-session 子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- W1 表达式订阅诊断 → successor
- <<或明确写 no remaining plan-owned work>>
