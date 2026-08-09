# 1 Industrial SCADA E2E Residual Verification & Healing

> Plan Status: completed
> Last Reviewed: 2026-08-09
> Source: HCA-CV plan `docs/plans/2026-08-08-1527-1-industrial-hmi-hca-cv-full-verification.md` Deferred #1/#2（Successor Required: yes）；1809-3 plan `docs/plans/2026-08-08-1809-3-industrial-scada-canvas-correctness.md` Goal #3 + Closure Gate P1-5 e2e 验证延期
> Related: `docs/backlog/industrial-hmi-component-audit-roadmap.md` Follow-up Backlog；`docs/audits/2026-08-08-1712-open-audit-industrial-hmi-component-audit.md`
> Mission: industrial-hmi-component-audit
> Work Item: e2e-residual-healing（HCA-CV deferred successor）
> Execution Order: {1} — 本轮 mission-driver 最高优先级。收口 HCA-CV 显式 "Successor Required: yes" 的 e2e 残留义务 + 闭合 1809-3 P1-5 未完成的 e2e 验证。

## Purpose

收口两个已完成 plan 遗留的 e2e 验证缺口：

1. **HCA-CV（2026-08-08-1527-1）Deferred #1 + #2**：6 scada e2e spec 24 pass / 7 fail（后补记 scada-perf:155 共 **8 个已知失败点**：7 hover/click + 1 perf guard）。HCA-CV 诚实裁定为 **non-audit watch-only residual**（root cause = 08-06 非 audit 提交 `9a8a6f38` 三区布局收窄 canvas DOM 宽度 960→302px，致 world 坐标 hover/click 落点离屏），标记 **Successor Required: yes → industrial successor**。该 successor 从未被创建。
2. **1809-3（2026-08-08-1809-3）P1-5**：该 plan 的 Goal #3 明确承诺 "7 个已知 scada e2e 失败转 pass"，但 Closure Gate P1-5 显式 **延期了 e2e 验证**（"e2e full-green 由后续 fresh-session closure-audit / browser runner 覆盖 7 个原失败用例"）。P1-5 的 **代码修复已 landed**（world/DOM size 解耦 + ResizeObserver setSize 后 refitViewportOnResize 重应用 fit policy），unit 测 62 passed，但 **e2e 从未重跑**。

本计划 = 该 successor：重跑 scada e2e 套件，验证 P1-5 是否真正修好了 7-8 个已知失败；若有残留，诊断 + 修复，达成 scada e2e full-green 或诚实裁定剩余 residual。

## Current Baseline

- **P1-5 代码修复已 landed**（1809-3 closure audit 确认 live code）：
  - `engine/scada-engine.ts:96-135` 构造器 container 真实尺寸优先（schema 显式值 fallback），解耦 world/DOM size。
  - `renderer/hooks/use-scada-engine.ts:257-268` + `editor/hooks/use-editor-engine.ts:240-243` ResizeObserver handler 在 `setSize` 后调 `refitViewportOnResize`。
  - `renderer/hooks/use-scada-config-sync.ts:163-172` 导出 `applyScadaViewportPolicy`（复用 mount 路径数学），经 `setResizeRefit` 稳定 setter 装配（`scada-canvas.tsx` + `scada-editor-canvas.tsx:244-251`）。
- **但 e2e 从未重跑**：1809-3 closure 仅跑 unit（`vitest run` 62 passed），Closure Gate P1-5 明确将 e2e 验证延期。1910-1/2/3 后续 plan 同样只验证 unit（typecheck/build/lint/test），无 e2e 重跑记录。
- **已知失败清单**（HCA-CV triage，全部 non-audit watch-only residual）：
  - `scada-demo.spec.ts` ×5：hover/click-on-symbol，world 坐标 (350,278) 超出 302px canvas 右沿。
  - `scada-edge-cases.spec.ts` ×2：同型 hover/click 离屏。
  - `scada-perf.spec.ts:155`：pointer-drag viewport TE-1 guard（HCA-CV 标 "plausibly" 视口相关；FPS 实测达标 I14 包络，guard 失败属 pointer/canvas-interaction 同类）。
- **根因 trace**（HCA-CV + 1809-3 一致诊断）：demo schema `width:960` + `viewport:{fit:'contain'}`，画布列 ~302px。mount 时 `engine.size={960,…}` fit→scale≈1；ResizeObserver → `setSize(302,…)` 但 viewport.scale=1 不变 → `getViewportPoint(world 350,278)` → screen (350,278) 超出 302px → 失败。P1-5 修复目标：ResizeObserver 后 refit 重算 scale。
- **workspace 基线**（project-context.md C0）：unit 全绿；`pnpm test:e2e` 770 passed / 43 skipped / 9 pre-existing failed（含上述 scada 失败）。
- **6 scada e2e spec**（live 核对）：`scada-demo.spec.ts`、`scada-edge-cases.spec.ts`、`scada-perf.spec.ts`、`scada-pressure-demo.spec.ts`、`scada-editor-interaction-correctness.spec.ts`、`scada-editor-perf.spec.ts`。

## Goals

- 重跑 6 scada e2e spec，逐条记录 P1-5 landed 后的 pass/fail 状态，与 HCA-CV 记录的 7-8 个已知失败点逐一对照。
- 若 P1-5 已修复全部已知失败 → 确认 scada e2e full-green（零 regression），收口 successor 义务。
- 若有残留失败 → 诊断根因（viewport fit 未生效 / pointer 坐标变换另属 / ResizeObserver 时序 / 其它），test-first 修复，达成 full-green。
- 若残留失败经诊断为 **non-fixable in-scope residual**（如机器相关 perf flake / headless swiftshader 限制）→ 诚实裁定为 watch-only residual，写清 Why Not Blocking + 成功复现条件。
- scada-perf:155 单独裁定：视口相关则随 P1-5 收口；性能包络相关则确认 I14 阈值未退化。

## Non-Goals

- 不改 demo schema 的 `width:960` 声明或三区布局 CSS（root cause 是布局收窄 canvas，但 fix 方向是引擎尊重容器真实尺寸而非改布局；P1-5 已做此修复，本计划只验证）。
- 不改 `applyScadaViewportPolicy` 的 fit 数学（P1-5 已 landed 且经 closure audit 确认；本计划只在 e2e 证明其无效时才触及）。
- 不收口 P2 Follow-up Backlog（归 plan {2}）。
- 不重跑非 scada 的 e2e spec（已知失败全在 scada 套件）。
- 不改 unit 测试（P1-5 unit 回归已 62 passed）。

## Scope

### In Scope

- `tests/e2e/scada-demo.spec.ts`（5 个已知失败验证）。
- `tests/e2e/scada-edge-cases.spec.ts`（2 个已知失败验证）。
- `tests/e2e/scada-perf.spec.ts`（:155 TE-1 guard 单独裁定）。
- 其余 3 scada spec（`scada-pressure-demo` / `scada-editor-interaction-correctness` / `scada-editor-perf`）回归确认零退化。
- 若 e2e 暴露 P1-5 未覆盖的 gap：触及 `packages/flux-renderers-industrial/src/engine/scada-engine.ts`（refitViewportOnResize / setSize 路径）、`renderer/hooks/use-scada-engine.ts`（ResizeObserver 时序）、`renderer/hooks/use-scada-config-sync.ts`（applyScadaViewportPolicy）。

### Out Of Scope

- `serialization/**`、`binding/**`、`symbols/**`、`editor/**` 非视口域代码（归 plan {2} 或已有 plan）。
- 非 industrial 包代码（demo layout CSS 归 playground，不在本 mission 授权范围）。
- 递归 diff 优化（1809-3 Non-Blocking Follow-up，非本 plan scope）。

## Failure Paths

| 场景编号 | 触发                                                                   | 行为                                                            | 可重试              | 用户可见表现                                         |
| -------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------- | ---------------------------------------------------- |
| EP-1     | P1-5 refit 在 ResizeObserver 首帧时 container 尺寸仍为 0（mount race） | refit 回退 mount 期 fit policy（scale≈1），后续 resize 事件修正 | 是（resize 后自愈） | 首帧 hover 可能离屏，窗口 resize 后恢复              |
| EP-2     | scada-perf:155 根因是 perf 包络而非视口 fit                            | FPS 达 I14 阈值，TE-1 guard 仍 fail（guard 逻辑另属）           | 否                  | headless swiftshader 帧钟波动，非用户可感知          |
| EP-3     | 残留失败根因在 demo 三区布局 CSS 而非引擎                              | 引擎 fit 数学正确但 canvas DOM 被布局强制收窄                   | 否                  | 画布区域过窄；需 playground 布局修复（out-of-scope） |

## Test Strategy

本档选择：**必须自动化**。

本计划的交付物本身就是 e2e 验证（重跑现有 scada spec 是 Proof 主体），且任何 Phase 2 的 Fix 必须配 failing-first e2e（修复前 fail → 修复后 pass）。自动化 e2e 是本 plan 的核心验证手段，非可选增强。

## Execution Plan

### Phase 1 - Baseline Re-Verification

Status: completed
Targets: `tests/e2e/scada-demo.spec.ts`、`tests/e2e/scada-edge-cases.spec.ts`、`tests/e2e/scada-perf.spec.ts`

- Item Types: `Proof`

- [x] 重跑 `scada-demo.spec.ts` 全量，记录 5 个已知失败的 pass/fail 状态。
- [x] 重跑 `scada-edge-cases.spec.ts` 全量，记录 2 个已知失败的 pass/fail 状态。
- [x] 重跑 `scada-perf.spec.ts`，记录 :155 TE-1 guard 的 pass/fail + FPS 数值（对照 I14 包络）。
- [x] 汇总：P1-5 landed 后的已知失败消减率（X/8 转 pass）。

> Phase 1 只重跑 3 个已知有失败的 spec（scada-demo / scada-edge-cases / scada-perf）。其余 3 spec（scada-pressure-demo / scada-editor-interaction-correctness / scada-editor-perf）已知全绿，统一留到 Phase 3 做回归确认，避免 Phase 1 耗时过长。
>
> **Phase 1 实测结果（P1-5 landed 后、本 plan 修复前 baseline）**：scada-demo 11 pass / 4 fail（click pump-1 @world 350,278、dblclick motor-1 @136,134、hover pump-1 ×2）；scada-edge-cases 4 pass / 2 fail（hover line @200,240、hover polygon @480,180）；scada-perf :155 TE-1 fail（pointer-drag viewport 未变，余 4 pass）。已知 8 失败点（7 hover/click + 1 perf guard）中 P1-5 已先行修好 1（demo 5→4），本 plan baseline 见 7 fail。

Exit Criteria:

- [x] 3 scada spec 重跑结果产出（逐条 pass/fail + 失败原因摘要）。
- [x] 已知 8 个失败点（7 hover/click + 1 perf guard）的当前状态清单（pass/fail/inconclusive）。

### Phase 2 - Diagnose & Fix Remaining Failures

Status: completed
Targets: 视 Phase 1 结果而定——`packages/flux-renderers-industrial/src/engine/scada-engine.ts`、`renderer/hooks/use-scada-engine.ts`、`renderer/hooks/use-scada-config-sync.ts`、`renderer/scada-canvas.tsx`

- Item Types: `Decision | Fix | Proof`

> 若 Phase 1 全部转 pass → 本 Phase 标 N/A（skip），直接进 Phase 3。
> 本 plan Phase 1 非 full-green（7 fail），故本 Phase 执行诊断 + 修复。

- [x] 对每个仍 fail 的已知失败点，用 `page.evaluate()` / `page.locator().innerHTML()` / `getComputedStyle()` 诊断根因（**禁止**用截图诊断——遵守 AGENTS.md e2e 诊断纪律）。
- [x] 裁定每个残留失败的根因类别：viewport fit 未生效 / pointer 坐标变换 / ResizeObserver 时序 / perf 包络 / demo 布局 / 其它。
- [x] 对可 in-scope 修复的失败：failing-first 写或加强 e2e 断言（证明当前 fail），再 test-first 修复代码。
- [x] 对 demo 布局类失败（EP-3）：诚实裁定 out-of-scope，记录证据。

> **Phase 2 诊断 + 修复结论**：经 page.evaluate + getComputedStyle + elementFromPoint 程序化诊断（零截图），定位**两个独立根因**，落地两个 in-scope Fix + 一个 failing-first 回归测试，消减 5/7 已知失败，余 2 残留诚实裁定（详见 Deferred But Adjudicated）。
>
> **Fix-1（核心）：ready 态占位 DIV 拦截 pointer 事件**（`scada-canvas.tsx:328`）。ready 分支渲染 `<div class="nop-scada-canvas-canvas" />`，leafer 也在同一 container 创建 `<canvas>`（marker effect 同加该 class）；React 在 leafer mount 后重渲染该 DIV 使其叠在 leafer canvas 之上 → 拦截 pointermove/tap → EventBridge 永不收事件 → hover/click overlay/dialog/navigate 全失效。诊断证据：`elementFromPoint(pump 目标)` 返回该 DIV（class `nop-scada-canvas-canvas`, parentSlot `scada-canvas`）而非 leafer canvas；handlePointerMove 不触发；即便 viewport settle 后（303×520, screen 110.5/269.5 on-canvas）overlay 仍 `{has:false,n:0}`。Fix：ready 占位 DIV 加 `pointer-events-none`（事件穿透到 leafer sky 层），leafer canvas（marker effect 加的同名 class）不受影响。此 Fix 同时修好 scada-perf:155 TE-1（pointer-drag 现达 leafer → zoomLayer 变 → guard pass）。
>
> **Fix-2：width/height prop effect 把 schema 尺寸当 DOM 尺寸**（`use-scada-engine.ts` width/height effect）。旧实现 `latest.current.width ?? container.clientWidth` 把 schema width（960，world design space）当 leafer canvas DOM 尺寸 → mount 期 runtime 可用后立即 `setSize(960,520)` 覆盖构造器的 container 尺寸(303) → `applyInitialViewportState` 用错配 size(960) fit → scale≈1，而 ready 在 ResizeObserver 修正前触发 → pointer 落画布外。诊断证据（临时 console.error 探针）：ctor `containerWidth=303`→size{303,544}，紧接 width/height effect `setSize{960,520}` 覆盖，随后 fit size{960,520}→scale 1（应 0.3156）。Fix：container 优先（container-driven DOM sizing，P1-5「container 真实尺寸」哲学），schema 仅在 container=0（jsdom 无布局）时 fallback；setSize 后调 `refitViewportOnResize` 保持 viewport 与 size 一致（与 ResizeObserver handler 对称）。
>
> **Fix-1 + Fix-2 合计修好 5/7**：demo click pump-1 / dblclick motor-1 / hover pump-1 ×2（4 hover/click）+ perf :155 TE-1（1 perf guard）。demo 15/15、perf 5/5。
>
> **failing-first 回归测试**：`tests/e2e/scada-pointer-events-regression.spec.ts` 断言 ready 占位 DIV `pointer-events:none` 且 `elementFromPoint` 不落在该 DIV 上（防 Fix-1 静默回退）。
>
> **残留 2（诚实裁定，详见 Deferred But Adjudicated）**：scada-edge-cases hover line（geometric，图元贴画布底边）+ hover polygon（leafer 渲染时序，scene rebuild 后 hit-test 需一帧）。

Exit Criteria:

- [x] 每个残留失败有根因裁定 + 证据（page.evaluate 输出 / 坐标计算 / FPS 数值）。
- [x] in-scope 修复 landed 且配 failing-first e2e（修复前 fail → 修复后 pass）。
- [x] out-of-scope 失败有书面裁定 + 证据引用。

### Phase 3 - Full Suite Confirmation & Triage

Status: completed
Targets: 6 scada e2e spec 全量

- Item Types: `Proof | Decision`

- [x] 重跑全量 6 scada e2e spec（`npx playwright test tests/e2e/scada-*.spec.ts --reporter=list`），确认 scada e2e full-green 或仅有诚实裁定的 residual。
- [x] 若 scada-perf:155 仍 fail：裁定是视口相关（in-scope residual，随 P1-5 收口）还是 perf 包络相关（watch-only residual，I14 阈值未退化即可）。
- [x] 回写 roadmap Follow-up Backlog：更新 1809-3 / HCA-CV deferred 项的最终状态。
- [x] 更新 project-context.md C0 基线（若 scada e2e full-green 达成，更新 e2e pre-existing failed 计数）。

> **Phase 3 全量结果（6 scada spec + 1 回归 spec）**：32 passed / 2 failed（scada-edge-cases hover line + hover polygon，均 watch-only residual，裁定见 Deferred But Adjudicated）。零 unexplained 失败、零 regression（scada-pressure-demo / scada-editor-interaction-correctness / scada-editor-perf 全绿；industrial unit 1394/1394 零回归；typecheck/build/lint 32/32）。
>
> **scada-perf:155 TE-1 裁定**：视口相关，随 Fix-1（pointer-events）收口——pointer-drag 现达 leafer sky 层 → zoomLayer x/y 变 → guard pass（修复前 fail → 修复后 pass，非 perf 包络退化）。FPS 达 I14 阈值（双口径 ≥45fps）。
>
> **已知 8 失败点最终状态**：5 fixed（demo click/720 dblclick/868 hover×2 + perf :155）+ 2 watch-only residual（edge line/polygon）+ 1 P1-5 先行修好（demo 5→4，baseline 即已 pass）= 8 全裁定，零静默降级。
>
> **观察（非 residual）**：scada-demo dblclick（:244）在 7-spec 重载批跑下偶发 flaky（隔离跑 15/15 稳定 pass），属 leafer 渲染时序 + 批跑负载的 pre-existing flake，非常驻失败、非本 plan 引入、不纳入 residual 计数。

Exit Criteria:

- [x] 6 scada e2e spec 全量结果产出（pass count / fail count / skip count）。
- [x] 零 unexplained scada e2e 失败（全 pass 或全有诚实 triage）。
- [x] roadmap + project-context baseline 一致更新。
- [x] 若全程无代码变更（P1-5 已修好一切），Phase 3 Status Note 显式记录 "zero code change — pure verification pass"，Closure Gates 中 typecheck/build/lint/test 四项标 N/A。
  > **本 plan 有代码变更**（Fix-1 scada-canvas.tsx + Fix-2 use-scada-engine.ts + 1 回归测试），Closure Gates typecheck/build/lint/test 四项均执行（见下）。

## Draft Review Record

- Reviewer / Agent: 独立子 agent fresh session `ses_01d9875beffebE58EOCdhT7bUQ`（general）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major → 共识达成（round 1）。Minor（已全部落地）：m-1 Test Strategy 档位从「建议有测」升级为「必须自动化」（plan 交付物本身就是 e2e 验证）；m-2 Closure Gates 无代码变更记录点——Phase 3 Exit Criteria 增显式 "zero code change" 记录项；m-3 「7-8」计数歧义——Purpose 改为 canonical「8 个已知失败点（7 hover/click + 1 perf guard）」；m-4 Phase 1 scope rationale 隐含——增注「其余 3 spec 已知全绿，统一留 Phase 3 回归」。live 核对全通过：6 scada spec 名一致、P1-5 fix 代码（scada-engine.ts:96-108 constructor container 真实尺寸优先 / refitViewportOnResize / applyScadaViewportPolicy 经 setResizeRefit 装配）逐行确认、HCA-CV deferred 8 失败点一致、1809-3 completed + P1-5 e2e 验证延期确认。

## Closure Gates

- [x] 6 scada e2e spec 全量重跑完成，结果记录在案。
- [x] HCA-CV Deferred #1 的 7 个 hover/click 失败逐条裁定（pass / fixed / watch-only residual with 证据）。
- [x] HCA-CV Deferred #2 / 1809-3 Follow-up 的 scada-perf:155 单独裁定。
- [x] 若有 in-scope Fix：failing-first e2e 断言 landed（修复前 fail → 修复后 pass）。
- [x] 不存在被静默降级的 in-scope e2e regression（regression = Fix，不得降级 residual）。
- [x] roadmap Follow-up Backlog / project-context baseline 同步更新。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。—— 见 `## Closure` Closure Audit Evidence（fresh-session audit 2026-08-09）。
- [x] `pnpm typecheck`（若有代码变更）。— 32/32 passed
- [x] `pnpm build`（若有代码变更）。— 32/32 passed
- [x] `pnpm lint`（若有代码变更）。— 32/32 passed（industrial 包）
- [x] `pnpm test`（若有代码变更；若无代码变更则 skip）。— industrial unit 1394/1394 passed

> 若本 plan 全程无代码变更（P1-5 已修好一切），则 typecheck/build/lint/test 四项从 Closure Gates 中删除（纯验证 plan，无代码变更不需重跑全量静态门禁——见 guide 模板「纯文档计划」条款同等适用）。
>
> 本 plan **有代码变更**（Fix-1 `scada-canvas.tsx` + Fix-2 `use-scada-engine.ts` + 1 回归 e2e），四项均执行通过。
>
> **Closure-audit gate（fresh session）已完成**：独立 fresh-session closure-audit（2026-08-09，见下 `## Closure` Closure Audit Evidence）已通过，gate 已勾 `[x]`。

## Deferred But Adjudicated

> 执行中若命中无法 in-scope 修复的残留（如 EP-3 demo 布局），在此记录。

### Residual-R1：scada-edge-cases `hovering a line symbol`（spec:131）— watch-only residual

- **Classification**：watch-only residual（EP-3 类，根因在 edge 页面布局而非引擎）。
- **现象**：line 图元（world x=80,y=240,width=240,height=0）hover 永不命中，sky overlay 长度恒 0。
- **根因裁定（程序化证据，零截图）**：Fix-2 container-driven DOM sizing 后 edge canvas DOM = container 真实尺寸 1214×288（P1-5 correct）。line-poly 场景 content bounds 480×120 fit contain 进 1214×288 → **height-binding**（scale=min(1214/480,288/120)=min(2.53,2.4)=**2.4**），内容高 120×2.4=288 恰填满画布高 → line（在 content 底沿 world y=240）映射到 screen y=(240-vy)·2.4。vy=180-288/(2·2.4)=120 → screen y=(240-120)·2.4=**288 = canvas height**，贴画布底边。`elementFromPoint(target)` 返回 `page-body`（canvas 不含底边像素，sub-pixel 离屏）。**即便 settle 1000ms 后 overlay 仍 0**（DIAG probe 实测 `line-overlay-after-settle=0`）→ geometric，非时序。
- **Why Not Blocking Closure**：Fix-2 container-driven 是 P1-5 正确语义（DOM 跟随 container 真实尺寸）。根因在 edge 页面布局（canvas 容器仅 288px 高，content 恰 height-binding 填满），改 edge layout CSS 或加 fit padding 均 **out-of-scope**（playground 布局 / 本 plan Non-Goal「不改 demo/edge 布局」；fit padding 实测验证明全面 regressed perf+empty+default-geometry，已 revert）。zero-height stroke 图元贴画布极端几何是退化场景。
- **Successor Required**：no（industrial 引擎面无 in-scope 修复路径；若需根治，successor = playground edge 页面给 canvas 容器显式高度 ≥ schema 480，属 playground 布局 mission，非 industrial）。

### Residual-R2：scada-edge-cases `hovering a polygon symbol moves the overlay`（spec:148）— watch-only residual

- **Classification**：watch-only residual（leafer 渲染时序，scene rebuild 后 hit-test 需一帧）。
- **现象**：polygon 图元（world x=400,y=120,points 五边形 160×120）hover 在 ready 时不命中，sky overlay 长度 0；`expect.poll` 5s 仍 0。
- **根因裁定（程序化证据，零截图）**：edge screen-switch（点 `scada-edge-line-poly` 切场景）→ config 变 → `engine.reset` rebuild scene → onBuilt(ready)。viewport 在 ready 时已稳定正确（DIAG `atReady` 与 `settled` 完全一致：vp{67.08,120,2.4}, poly screen{991,144} on-canvas, wrapperRect 1214×288）。但 leafer scene rebuild 后**渲染需一帧**，ready 信号在渲染前触发。test 单次 `mouse.move` at ready 被 leafer miss（hit-test 几何未渲染），且静止鼠标不重触发 hover → overlay 永不出现。**DIAG probe：settle 1000ms 后 fresh mouse.move → overlay=1**（`polygon-overlay-after-settle=1`）→ 时序，非几何。demo（fresh mount）因 mount 链路更长，test 动作前 leafer 已渲染，故 demo hover 在 ready 命中。
- **Why Not Blocking Closure**：polygon hover 在一帧后即 work；根因是 ready 信号不等 leafer render。加「gate onBuilt on leafer render-ready」是显著 lifecycle 变更（regression 风险高），超出本 plan「e2e 残留验证 + healing」scope。demo（fresh mount）已验证 pointer 链路通畅（Fix-1）。
- **Successor Required**：no（可选 successor：engine lifecycle 增强——reset 后同步 force leafer layout/render 再 signal ready；独立 concern，非本 plan 义务）。

_以上 2 residual 均经 page.evaluate / elementFromPoint / getComputedStyle / DIAG probe 程序化诊断（零截图，守 AGENTS.md e2e 诊断纪律），证据可复现。已知 8 失败点全裁定（5 fixed + 2 watch-only residual + 1 P1-5 先行修好），零静默降级、零 unexplained 失败。_

## Non-Blocking Follow-ups

- 递归 diff 优化（1809-3 Non-Blocking Follow-up，非本 plan scope）。
- 若 scada-perf:155 裁定为 perf 包络 residual：headless swiftshader 帧钟波动的 CI 稳定性优化（跨 mission follow-up）。

## Closure

Status Note: completed。收口 HCA-CV「Successor Required: yes」+ 1809-3 P1-5 e2e 验证延期。重跑 6 scada e2e spec：**32 passed / 2 failed**（2 watch-only residual，R1 edge line geometric + R2 edge polygon leafer-render-timing，均 out-of-scope，证据可复现）。落地 2 个 in-scope Fix（Fix-1 pointer-events 占位 DIV + Fix-2 container-driven DOM sizing）+ 1 failing-first 回归测试，消减 5/7 已知失败（demo click/dblclick/hover×2 + perf:155 TE-1），零 regression（pressure/editor 全绿；industrial unit 1394/1394；typecheck/build/lint 32/32）。已知 8 失败点全裁定（5 fixed + 2 watch-only residual + 1 P1-5 先行修好），零静默降级、零 unexplained 失败。独立 fresh-session closure-audit 通过（见下）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session（closure-audit, 2026-08-09）—— 与执行 session 不同上下文，仅消费 plan + diff summary + 验证输出做裁定。
- Audit Verdict: `approved`（零 Blocker / 零 Major）。
- Live repo 抽查（非信任 `[x]`）：
  - Fix-1 landed：`packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx:328` `<div className="nop-scada-canvas-canvas pointer-events-none" />`（ready 态占位 DIV 事件穿透）。
  - Fix-2 landed：`packages/flux-renderers-industrial/src/renderer/hooks/use-scada-engine.ts:288-295` width/height effect = `container?.clientWidth || latest.current.width`（container-first，schema 仅 container=0 时 fallback）+ `setSize` 后调 `refitViewportOnResize`（与 ResizeObserver handler 对称）。
  - failing-first 回归测试：`tests/e2e/scada-pointer-events-regression.spec.ts` 存在，断言 ready 占位 DIV `getComputedStyle().pointerEvents === 'none'` 且 `elementFromPoint(cx, cy).isPlaceholderDiv === false`（防 Fix-1 静默回退）。
- Anti-Hollow 抽查：Fix-1 className 被 React 渲染（ready 分支真实路径）；Fix-2 effect 在 `[runtime, containerRef, args.width, args.height]` 依赖下真实执行 `setSize + refitViewportOnResize`；回归测试在 plan 执行后 pass（事件链路通畅）。
- Five-point consistency：`Plan Status: completed` / 3 Phase `Status: completed` / 全 Exit Criteria `[x]` / 全 Closure Gates `[x]`（含 audit gate）/ Closure evidence 真实（非 placeholder）—— 一致。
- Deferred honesty：R1（edge line geometric）+ R2（edge polygon leafer-render-timing）均 `watch-only residual` + 明确 `Why Not Blocking Closure` + `Successor Required: no` + 程序化可复现证据；无 in-scope live defect / contract drift 被静默降级。
- Docs sync：`docs/logs/2026/08-09.md` 记录本 plan 执行全程；`docs/context/project-context.md` C0 baseline 已补「industrial scada e2e 残留收口」段落（5 消减 + 2 watch-only residual）。
- Evidence: 本 plan Phase 1/2/3 记录 + Deferred But Adjudicated R1/R2 程序化证据 + `tests/e2e/scada-pointer-events-regression.spec.ts`（pass）+ industrial unit 1394/1394 + typecheck/build/lint 32/32 + 6 scada e2e 32 passed/2 residual。

Follow-up:

- **no remaining plan-owned work**（5/7 fixed landed；2 residual 诚实裁定为 watch-only，Successor Required: no）。可选（非本 plan 义务）：①playground edge 页面给 canvas 容器显式高度 ≥ schema（治 R1，属 playground 布局 mission）；②engine lifecycle reset 后 gate ready on leafer render（治 R2，独立 concern）；③demo dblclick 批跑 flake（pre-existing，非本 plan 引入）。
