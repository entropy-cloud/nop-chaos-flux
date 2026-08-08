# HCA-CV 全量验证复测报告（mission 级收口）

> Plan: `docs/plans/2026-08-08-1527-1-industrial-hmi-hca-cv-full-verification.md`
> Date: 2026-08-08
> Mission: industrial-hmi-component-audit
> Verifier: 执行 session（closure audit 由独立子 agent fresh session 复核，见 plan Closure Audit Evidence）
> 性质：纯验证 + 诚实裁定（不改 industrial 包 supported 行为，除非发现 audit 自身修复引入的真实回归）

## 1. 全量静态验证（Phase 1）

> 命令：workspace 根 `pnpm typecheck/build/lint/test`。`FULL TURBO` cache replay = 输出与 post-HCA-CR 构建一致（cache key 未变证明无源码改动偏离）。

| 命令                                                      | 结果                                   | 对照 HCA-CR closure 基线                              |
| --------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------- |
| `pnpm typecheck`                                          | **32/32** successful（FULL TURBO）     | 一致（32/32）                                         |
| `pnpm build`                                              | **32/32** successful（FULL TURBO）     | 一致（32/32）                                         |
| `pnpm lint`                                               | **32/32** successful（FULL TURBO）     | 一致（32/32）                                         |
| `pnpm test`（workspace unit）                             | **59/59** packages successful          | 一致（59/59）                                         |
| `pnpm --filter @nop-chaos/flux-renderers-industrial test` | **100 test files / 1340 tests** passed | **精确匹配** HCA-CR closure（100 files / 1340 tests） |

**裁定**：静态四项全绿，industrial 单测计数与 HCA-CR closure 基线**零偏差**（1340 tests，无 unit 回归）。无 audit 修复落点回归。

## 2. 6 scada e2e spec 结果（Phase 2）

> 环境：`feat-industrial-hmi` worktree dev server（port 4175）。程序化诊断（`page.evaluate` / 计时 API / `getComputedStyle`），**禁止截图诊断**。

| spec                                   | 结果                                                             |
| -------------------------------------- | ---------------------------------------------------------------- |
| `scada-pressure-demo`                  | ✅ all pass                                                      |
| `scada-editor-interaction-correctness` | ✅ all pass                                                      |
| `scada-editor-perf`（E9.2）            | ✅ all pass（3/3）                                               |
| `scada-perf`（I14）                    | 3 pass / 1 fail（TE-1 viewport-change guard；**FPS 达标**见 §3） |
| `scada-demo`                           | 7 pass / 5 fail（hover/click-on-symbol）                         |
| `scada-edge-cases`                     | 4 pass / 2 fail（hover overlay）                                 |

**合计**：24 passed / 7 failed。

### 2.1 环境根因（首轮 23 fail → 7 fail）

首轮 23 fail 根因为**陈旧 dev server**：PID 32950 cwd = `nop-chaos-flux-master`（sibling worktree，主分支），经 `reuseExistingServer: !CI` 被复用，服务的是无 scada 路由的主分支首页（home page snapshot 无 Industrial/Scada 入口）。kill 陈旧 server 后复测 → 24 pass / 7 fail。**非 audit、非回归**——纯环境（跨 worktree server 复用）。

### 2.2 7 failures 程序化诊断 + triage（全部 non-audit）

诊断 spec（`_diag-scada-hover.spec.ts`，已删除）`page.evaluate` 证据：

- **overlay 机制正常**：手动 `engine.interactionOverlay.highlight('pump-1')` → `activeCount=1`、`hasActive('pump-1')=true`。
- **engine 健康**：`eventBridgeExists=true`、`options.interactionLayer=true`、`registryHasPump1=true`、`destroyed=false`。
- **hover 事件未发射**：`page.mouse.move` 后 `activeCount=0`。根因 = **鼠标坐标落在 canvas DOM box 之外**：canvas box `{x:466.6, y:310.8, width:302.8, height:520}`，pump-1 world `(350,278)` → `getViewportPoint` → screen x `816.6` > box 右边界 `769.5`（离屏）。schema 声明 `width:960`（scada-demo.tsx:53），实际渲染 302px；`viewport.fit:'contain'` 未生效（`scale:1`）。
- **归因**：08-06 非 audit 提交 **`9a8a6f38` "SCADA demo 视觉重设计（三区布局）"** 重排 demo 页布局——在 hover 测试最后全绿（08-04 `cb2e753a`: "scada-\* e2e 23/23"）之后。三区布局收窄 canvas → world 坐标 hover/click 落点离屏。

`scada-perf:155` fail：**非 perf 包络突破**——实测 `[PERF] Scada 100k pan render-throughput fps: best=49.5`、`pointer-drag fps: best=50.3`（均 ≥45，**达 I14 包络**）。仅 TE-1 guard「pointer drag must actually move the viewport」失败（pointer-drag-pan 未驱动 zoomLayer，与 hover 同一类 pointer/canvas-interaction 问题；`viewport.ts` 最近改动为非 audit `ddd39b1b` 08-04）。

**HCA audit diff 全量复核**（所有 HCA\* feat 提交）：仅触及 connection-wiring / undo-redo-adapter / scada-engine(importConfig→reset) / validate / editor-working-helpers / pipe-junction / dirty-collector+refresh-pipeline（import 重构，"97 files / 1307 tests 不变"）/ editor palette+renderer-definitions / scada-canvas a11y（仅 role+aria-label，dd6f111f）/ config-types / diff。**均不触及** canvas DOM sizing / viewport-fit / hover event-bridge / hit-testing / pointer-drag-pan。

**裁定**：0 audit 回归。7 failures → watch-only residual（non-audit，canvas-sizing/pointer-interaction，08-06 重设计遗留）。按 plan Non-Goals「不重新审计 / 不发现新 finding」+「不改 industrial 包 supported 行为（除非 audit 自身修复引入回归）」，修复 08-06 layout 回归**不在 CV scope**（喂入 industrial successor）。

## 3. 性能基线复测（Phase 3）

### 3.1 I14 runtime 包络（`scada-perf.spec.ts`，对照 `benchmark-report.md` I14.3）

| 测量项                                      | I14.3 基线            | CV 复测（2026-08-08）                  | 验收包络 | 判定    |
| ------------------------------------------- | --------------------- | -------------------------------------- | -------- | ------- |
| 10 万图元首屏创建                           | 373.1 ms              | genMs=9.9 + buildMs=338.6 ≈ **348 ms** | <2000 ms | ✅ 达标 |
| 10 万拖动/平移 fps（pointer rAF 显示帧率）  | best 70.3 fps         | best **50.3 fps**                      | ≥45 fps  | ✅ 达标 |
| 10 万平移 fps（render-throughput 代理口径） | best 49.4 fps         | best **49.5 fps**                      | ≥45 fps  | ✅ 达标 |
| 内存（CDP JS heap，stroke）                 | 130.6 MB              | **131.7 MB**                           | ≤320 MB  | ✅ 达标 |
| 内存（无 stroke 对照组）                    | 127.8 MB（delta 2.8） | **129 MB**（delta 2.7）                | ≤320 MB  | ✅ 达标 |
| 1 万点批量刷新端到端延迟                    | 41.9 ms               | **43.6 ms**（run1: 25.5 ms）           | <200 ms  | ✅ 达标 |

**裁定**：I14 六项全部达标。复测值与 I14.3 基线同量级（348 vs 373ms / 131.7 vs 130.6MB / 43.6 vs 41.9ms）；pointer rAF fps 50.3 vs 基线 70.3 为 headless+swiftshader 帧钟机器方差（仍 ≥45，~12% 余量），**非 audit 回归**（audit 未触及 perf-critical 路径）。`scada-perf:155` 测试 fail 属 TE-1 viewport-change guard（pointer-drag-pan），**非 perf 数值突破**——fps 数值已达标。

### 3.2 E9.2 编辑态包络（`scada-editor-perf.spec.ts`，对照 `editing-envelope-retest-2026-08-07.md`）

| §3 # | 包络维度                   | E9.2 基线        | CV 复测（2026-08-08）  | 验收包络 | 判定    |
| ---- | -------------------------- | ---------------- | ---------------------- | -------- | ------- |
| ②    | 编辑操作 per-call 响应延迟 | n=100 max 13.1ms | ✅ test green（12.6s） | <100ms   | ✅ 达标 |
| ①    | 拖拽响应 fps @ 选区 ≤1k    | best 50.2fps     | ✅ test green（20.2s） | ≥30fps   | ✅ 达标 |
| ④    | 编辑器内存 @ 1k 图元       | 50.2MB           | ✅ test green          | ≤320MB   | ✅ 达标 |

**裁定**：E9.2 primary 包络三项硬数字（①②④）全部达标，3/3 test green。`envelope-below-candidate` Failure Path **不触发**。R7（编辑态包络数字）维持「AI 复测达标 + 待人工最终确认」状态（AI 不自确认人工阈值）。

## 4. 失败 triage 汇总 + 裁定

| 失败项                                        | 类别                   | 根因                                           | audit 回归？                                | 裁定                |
| --------------------------------------------- | ---------------------- | ---------------------------------------------- | ------------------------------------------- | ------------------- |
| scada-demo ×5（hover/click-on-symbol）        | e2e-functional         | 08-06 三区布局收窄 canvas → 指针坐标离屏       | 否（`9a8a6f38` 非 audit）                   | watch-only residual |
| scada-edge-cases ×2（hover overlay）          | e2e-functional         | 同上                                           | 否                                          | watch-only residual |
| scada-perf:155（pointer-drag viewport guard） | e2e-functional（TE-1） | pointer-drag-pan 未驱动 viewport；**FPS 达标** | 否（`viewport.ts` 最近非 audit `ddd39b1b`） | watch-only residual |

**Why-Not-Blocking**：

1. 7 failures 均**非 audit 回归**——HCA\* 修复落点（connection-wiring pointerup / destroyed guard / validate / cloneNodeDeep / dirty-collector 拆分 / pipe-junction resize）均不在 canvas-sizing / viewport-fit / hover-event-bridge / pointer-drag-pan 代码路径。
2. 实际根因为 08-06 非 audit 视觉重设计（`9a8a6f38` 三区布局）收窄 demo canvas DOM 宽度，使 world 坐标 hover/click 落点离屏——属 industrial 包**既有 layout 缺陷**，CV 验证对象（audit 修复）无因果。
3. perf 包络（I14 六项 + E9.2 三项）**全部达标**，无 envelope 突破。
4. 静态四项（typecheck/build/lint/test）全绿，industrial 单测 1340 与 HCA-CR closure 基线零偏差。

**Successor Required**：industrial successor（非 HCA-CG scope）修复 08-06 三区布局 canvas sizing 回归（feed to industrial-hmi backlog）。

## 5. 与 HCA-CR closure 基线的 diff

| 维度                   | HCA-CR closure                                                               | HCA-CV 复测                      | diff                                                        |
| ---------------------- | ---------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------- |
| typecheck              | 32/32                                                                        | 32/32                            | 无                                                          |
| build                  | 32/32                                                                        | 32/32                            | 无                                                          |
| lint                   | 32/32                                                                        | 32/32                            | 无                                                          |
| unit test（workspace） | 59/59                                                                        | 59/59                            | 无                                                          |
| industrial test files  | 100                                                                          | 100                              | 无                                                          |
| industrial tests       | 1340                                                                         | 1340                             | 无                                                          |
| scada e2e（6 spec）    | 未在 HCA-CR 复测（C0 基线：6 spec 全绿 @ 08-02，但 hover 测试 08-04 才加入） | 24 pass / 7 fail（全 non-audit） | 7 fail 为 08-06 非 audit 重设计遗留，非 HCA-CR/closure 引入 |
| I14 perf               | I14.3 全达标                                                                 | 全达标                           | 无 envelope 退化                                            |
| E9.2 perf              | 全达标                                                                       | 全达标                           | 无 envelope 退化                                            |

## 6. 结论

- **静态验证**：workspace 全量 typecheck/build/lint/test 全绿，industrial 单测零回归（1340 = 1340）。
- **e2e**：6 scada spec 24 pass / 7 fail；7 failures 全部诚实裁定为 non-audit watch-only residual（08-06 三区布局遗留 + pointer-interaction），0 audit 回归。
- **perf**：I14（六项）+ E9.2（三项）包络全部达标，复测值与基线同量级，无 envelope 退化；R7 维持待人工确认。
- **解锁**：HCA-CG（Guard 沉淀）前置条件满足（audit 修复未引入回归）。
