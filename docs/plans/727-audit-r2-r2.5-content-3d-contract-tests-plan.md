# 727 审计修复 R2·R2.5：契约补测—content+3d（P1-MA4.3-001 + P1-MA4.3-005 live defect 修复）

> Plan Status: completed
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` R2.5（MR2.0/plan 713 展开，单条包合并依据）；`docs/audits/2026-10-21-1524-arm2-MA4.3-content-domain-tests.md` §P1-MA4.3-001（interval 生命周期三契约）+ §P1-MA4.3-005（三方漂移 live defect，最小补强=**修复（ready 时 dispatch）+ unit**）；owner doc `docs/architecture/renderer-runtime.md`（事件桥接惯例 createNormalizedActionEvent + helpers.dispatch）
> Related: 先例 plan 723/724/726（同构契约补测链）；4.3-005 与 MA4.2 P1-002 capability 漂移族姊妹例（声明↔注册↔派发一致性）
> 编号 runway：726 为 R2.4（本线）；727 本 plan；ARC 线从 728 起避开

## Purpose

001 为 carousel autoplay interval 生命周期三契约（量/命/清理）判别补测（现 harness setInterval stub 丢弃 delay 实参 + 无 unmount 计时统计——三条契约被 harness 结构性抹平）；005 为 three-canvas `events.onReady` 承诺↔实现↔测试三方漂移 **live defect 修复**（schema :19 + definition :71 + demo 三处承诺「场景就绪触发一次」，实现 :124 仅内部消费零派发——audit 最小补强明示「修复（ready 时 dispatch）+ unit」——本 plan 含授权内 P1 修复，Cross-Cutting 8）。001 回填 `closed`（补测）；005 修复+unit 后回填 `closed`。

## Current Baseline（2026-10-24 live，HEAD `3066921a0` 实测）

- **001**：`packages/flux-renderers-content/src/carousel.tsx:36-39`（interval = slotProps.interval>0 ? interval : DEFAULT_INTERVAL=5000）+:87-168（autoplay effect：reduced-motion 门 stop/start、hover/focus/visible 三源独立 flag、`start()` 单槽守卫 `id!==undefined return`、unmount stop）；`carousel-autoplay.test.tsx:189-195` setInterval stub 丢弃 delay 实参（单槽 intervalCallback）——量/命/清理三契约在 harness 层无断言。harness 惯用法：`@nop-chaos/ui` Carousel mock 注入 FakeApi（scrollNext spy + on('select') 回调收集 + selectedScrollSnap）、matchMedia/IntersectionObserver stub、`createMockRendererProps`。
- **005**：`packages/flux-renderers-3d/src/renderer/three-canvas.tsx:122-125` `engine.onReady(() => setSceneState(...))` 内部消费零派发（:65-76 onError 派发先例 `scene:error` type + createNormalizedActionEvent + helpers.dispatch；events 变量在作用域内）；`schemas.ts:19`「场景就绪（模型全部加载完成后触发一次）」、`renderer-definitions.ts:71` 文案、demo schema :114 showToast 承诺。全包测试零守护（复核实测：3d 包 25 文件/216 用例，其中 three-canvas\* + use-three-events 渲染器面 21 用例，均不含 onReady 派发断言）。
- roadmap R2.5 行 `todo`（:102）；arm2-index :146（001）/:150（005）状态 `open`、修复列 R2.5。
- 并发线：content 包 WIP 已由 ARC 线 bffaea342 清空（markdown 系列已入其提交），本 plan 无同包冲突。

## Goals

- 001 三契约测试落地（量/命/清理 + select→onChange 链贯通），红证 1（恢复 stub 丢 delay 旧状 → 量断言红）。
- 005 修复落地（ready 时 dispatch `scene:ready`，沿 onError 既有惯例）+ unit 测试（mock engine 触发 onReady 断言 events.onReady 派发一次 + error 终态不覆盖 + ready 不重复派发），红证 1（回退修复 → 派发断言红）。
- 双 finding 回填 `closed`；roadmap R2.5 翻转。

## Non-Goals

- 不改 carousel 行为（001 纯补测）；不处理 005 以外 3d 契约（onObjectClick 等有既有守护面）；不处理 MA4.3 其余 finding（R2.6/R2.7 独立行）；并发线隔离。

## Scope（必填节）

### In Scope

- `packages/flux-renderers-content/src/carousel-autoplay-lifecycle.test.tsx`（新建，001）
- `packages/flux-renderers-3d/src/renderer/three-canvas.tsx`（005 修复：onReady 回调内 dispatch events.onReady，沿 :65-76 onError 惯例；「触发一次」语义——effect [engine] 注册一次）
- `packages/flux-renderers-3d/src/renderer/three-canvas.test.tsx`（新建或既有文件扩展，005 unit）
- `docs/audits/arm2-index.md` 回填 + daily log + roadmap R2.5 翻转（激活/收口两提交）

### Out Of Scope

- carousel 实现变更；MA4.3 其余 finding；R2.6-R2.15 与 R3.x；并发线。

## Failure Paths

| 可测场景编号 | 触发                                                                   | 行为                                                                                          | 可重试 | 用户可见表现         |
| ------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------ | -------------------- |
| api-shape    | 集成 API 形状与规格不符（embla mock/engine mock 接线）                 | 以既有同类测试先例校正规格，plan 补记                                                         | 是     | 不适用（测试行为面） |
| contract-gap | 005 修复后 demo（three-canvas-demo-schema :114 showToast）实测仍不触发 | 停：升级新 finding（派发链另有断点），不静默扩修复面                                          | 否     | 不适用               |
| flake        | 005 unit 在 StrictMode 双挂载下派发两次                                | 以「每次 engine 生命周期恰一次」口径断言（per-engine），StrictMode 计数按两次挂载各自一次容忍 | 是     | 不适用               |

## Test Strategy

本档选择：**必须自动化**——红证 = 临时变异（001：setInterval stub 恢复丢弃 delay 实参旧状；005：回退修复使 onReady 不派发），变异复员后提交，红证输出入 plan。判别机制（Rule 13）：001 量断言直接对 delay 实参（旧 stub 丢参即红）；005 派发断言对 dispatch 调用（回退修复即红）。005 修复面 = three-canvas.tsx 一处回调体 + 「一次」语义由 effect-[engine] 注册一次承载。

## Execution Plan

### Phase 1 - 补测与修复落地（各先红后绿）

Status: completed
Targets: 两测试文件 + three-canvas.tsx

- Item Types: `Fix`

- [x] T1（001，content unit，沿 carousel-autoplay.test.tsx mock 惯用法）：**A 量** interval:2500 → setInterval 收集的 delay 实参 === 2500；无 interval 配置 → delay === 5000（DEFAULT_INTERVAL）；**B 命** mount→unmount→mount → setInterval 恰 2 次调用（每挂载恰一注册，无跨挂载累积）+ 同挂载内不变式（start 单槽守卫）；**C 清理** unmount → clearInterval 收到该 id，此后 fireTick → scrollNext 零调用；**D 链** FakeApi.scrollNext 驱动 snap 前进 + 发 select → onChange 事件派发（props.events.onChange spy 收到，非纯 spy 断链）。红证：**M-A** stub 恢复丢 delay 实参（旧 harness 状）→ A 红。
- [x] T2（005 修复+unit，扩展 three-canvas-lifecycle.test.tsx 新 describe ×2）：**派发恰一次**（mock 注册即回放 ready——loadModels 即刻 readyEmitted；重放 readyCallbacks 仍恰一次=once-ref 生效）+ `scene:ready` 载荷断言；**error 后 onReady 不再派发**（simulateError 入 error 终态 → ready 重放零新增派发，post-error slice 断言；执行注记：mock 注册即回放序使「先 error 后 ready」不可构造，error-前合法 ready 派发不计违例）。修复实现：onReadyDispatchedRef（每 engine 重置）+ sceneErroredRef（error 终态）双守卫 + deps 含 events.onReady/props.helpers（lint exhaustive-deps 合规，重订阅由 once-ref 保单次——Deferred m1 措辞的执行期落地：lint 强制新鲜度 ref 化而非闭包捕获，api-shape Failure Path 消化）。红证：**M-B** 回退修复 → 双派发断言红 2 → 复员（git checkout 连 fix 一并清除后重新落回，复员/重落双核）

Exit Criteria:

- [x] 双测试绿证 + 双红证留痕：**M-A** 红 1（量断言，B/C/D 保持绿——判别面精确）；**M-B** 红 2（双派发断言）——复员后 005 修复保留为唯一实现 diff（three-canvas.tsx：onReady 回调 + 双 ref + deps 行）
- [x] content 48 文件/374 用例 + 3d 25 文件/218 用例全绿

### Phase 2 - 索引回填与收口

Status: completed
Targets: arm2-index、roadmap、daily log

- Item Types: `Proof`

- [x] arm2-index 两行回填：:146（001）/:150（005）→ `closed` + 注记（005 含 MA5.5 同块双证回填，m-b 义务落地：:56 + scene-manager.ts:331 双源归属）；Last Updated 滚动（open 53→51）
- [x] roadmap R2.5 `planned`→`done` 翻转（IN closure commit；激活提交 dce7abf5c 已先行翻转）

Exit Criteria:

- [x] arm2-index 两行状态与注记实测一致（open 53→51 grep 复核）；roadmap R2.5 行 `done`（收口提交内）
- [x] daily log R2.5 条目在场（随收口落）

## Closure Gates

- [x] 全量门禁：typecheck 44/44 + build 44/44 + lint 44/44 + test 82/82（lint 修复：three-canvas effect deps 入 events.onReady/helpers）
- [x] `pnpm check` 全链绿 exit 0（scanner-baselines +7/+7 登记：新测试文件 harness 控制面形态命中，reRegistrationNotes 注记，09ed6e5b6 手改先例）
- [x] 双红证全部复员（001 无实现 diff；005 修复保留为唯一实现 diff——three-canvas.tsx onReady 回调 + 双 ref 声明 + deps 行，即「回调及其终态守卫所需最小改动」口径内）
- [x] 独立 closure audit（fresh sub-agent `agent_a5018116`，输入=plan+diff summary+验证输出）：**approved** 0B/0M/2m（m1 :99 deps 措辞 touch-up 随收口提交、m2 转述计数差异注记非 repo 层）——checklist 1-8 全 PASS，auditor 独立重演 M-A/M-B 双变异（字节级复员 cmp 核验）+ open 51 程序化验证 + check:scanner-baselines within baseline
- [x] 收口提交（flip `done` IN commit；记录复核结论）

## Deferred But Adjudicated

- **MA5.5 IS-three-002 onError「同块」处置**（review R1 M3）：arm2-index :150 行载 MA5.5 注记「IS-three-002 疑 onError 同块同死随修复一并验证」——经核 `three-canvas-lifecycle.test.tsx:56` 既有用例已 refute 该疑点（model-load-failed 经 onError 回调达 `scene:error` 状态面，onError 派发既有守护在位），本 plan 不扩 T2 断言面；收口时回填 ：150 注记「IS-three-002 同块疑点经 lifecycle 用例证伪，onError 派发守护在位」。Classification: watch-only residual。Why Not Blocking Closure: 既有用例已覆盖疑点面，无新增缺口。Successor Required: 否。

- **005 修复闭包新鲜度**：effect deps 最终落地为 `[engine, events?.onReady, props.helpers]`（lint exhaustive-deps 合规口径；重订阅由 once-ref 保单次派发，见 T2 执行注记）；「触发一次 + error 终态不覆盖」断言所需的最小守卫以 ref/flag 承载（review R2 m-a 就地修正：sceneState 函数式更新仅承载状态不覆盖半边，dispatch 抑制与单次语义需 onReadyDispatchedRef/sceneErroredRef 最小 ref，:91 条款已授权）；若未来 events 动态化需随 family 行重审。Why Not Blocking Closure: 静态 schema 下闭包捕获等价。Successor Required: 否。
- **001 loop:false 转发语义**：loop 经 embla opts（:249）转发属 embla 库行为面，audit 最小补强未列——不在本 plan 断言面。Classification: out-of-scope improvement。Why Not Blocking Closure: 非审计规格面。Successor Required: 否。

## Draft Review Record

- R1（fresh sub-agent agent_891826e6，2026-10-24）：**FAIL** 0B/3M/3m——M1 arm2-index 行号（005=:150 非 :147）；M2 计数对账（复核实测 25 文件/216 用例/渲染器面 21）；M3 MA5.5 IS-three-002 onError「同块」处置入 Deferred（lifecycle 用例已 refute）；m1 ref 措辞 scope 至 events 新鲜度 + Closure Gate 措辞放宽；m2 Failure Paths 列序；m3 Why Not Blocking Closure 标签。T1/T2 设计裁定 PASS（判别力+惯例一致性经 live 核验）。
- R2（同一评审 agent 复审，2026-10-24）：**PASS 共识**（pass-with-minors，0B/0M/2m）——M1-M3/m1-m3 全数确认已解；残留 m-a（实现落 guard 时须就地修正 :99 deferred 句「函数式更新已承载」——updater 仅承载状态不覆盖半边，dispatch 抑制/单次语义需最小 ref/flag，:91+:99 条款已授权）与 m-b（:150 回填注记归属精确化：:56 + scene-manager.ts:331 双证）为执行期义务。准予 `active`。

## Non-Blocking Follow-ups

- 无（001/005 最小补强即全量规格）。

## Closure

- [x] R2 共识（pass-with-minors，m-a/m-b 执行期义务在案）后激活提交（Status→`active` + roadmap R2.5 `todo`→`planned` IN commit `dce7abf5c`）
- [x] 执行 Phase 1/2 → Closure Gates 全过 → closure audit **approved**（`agent_a5018116`，0B/0M/2m）→ 收口提交（Status→`completed`、flip `done` IN commit）
- [x] Closure audit 记录：修复最小性（3 hunks 恰为回调+refs+deps）；M-A/M-B 独立重演同色（量断言精确判别 / 双派发断言）+ 字节级复员；:150 MA5.5 双源回填 live 核验（lifecycle :56 + scene-manager.ts:331）；scanner 登记 within baseline；m-a 义务（ref-based guard 措辞）落地核验一致。
- [ ] 执行 Phase 1/2 → Closure Gates 全过 → closure audit PASS → 收口提交（Status→`completed`、flip `done` IN commit、记录复核结论于本节）
