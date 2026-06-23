# 1 Mobile Renderers Async & State-Machine Correctness

> Plan Status: completed
> Last Reviewed: 2026-06-23
> Source: `docs/audits/2026-06-22-2039-multi-audit-mobile.md` (MA-01, MA-02, MA-12, MA-13, MA-14, MA-15, MA-16, MA-20 sub-items), `docs/audits/2026-06-22-2039-open-audit-mobile.md` (OA-05, OA-10, OA-13)
> Related: `2026-06-23-0655-2-mobile-contract-honesty-and-markers-gating-plan.md`, `2026-06-23-0655-3-mobile-ux-a11y-and-styling-hygiene-plan.md` (execution order 2 & 3); `docs/bugs/07-submit-concurrent-guard-fix.md`

## Purpose

把 `packages/flux-renderers-mobile` 四个交互类渲染器（`pull-refresh` / `infinite-scroll` / `swipe-cell` / `countdown`）的异步链路与状态机收敛到“不锁死、不重复派发、卸载后不写状态、完成后不无限重渲染”。这是两个 open 审计里三组 P1 根因（未处理 reject / setState-updater 副作用 / 缺 in-flight guard）的统一收口面，也是 plan 2、plan 3 在同批文件上做改动前必须先稳住的地基，因此执行顺序排在最前。

## Current Baseline

- 包自 commit `8f947df9`（M5 脚手架）后未再修改；两份审计均独立重读了全部 live source 并确认下面每条引用行号仍准确。
- `pull-refresh.tsx:80-104`：`handleTouchEnd` 在 `setStatus` updater 内 `void Promise.resolve(props.events.onRefresh?.(undefined)).then(success)`，无 `.catch`，`success` 分支是离开 `'loading'` 的唯一路径 → reject 即永久 spinner（MA-01）。`.then` 内 `setStatus('success')` 与 `successTimerRef` 上的 `setTimeout` 在组件卸载后仍会执行；cleanup effect `:54-62` 只在卸载瞬间读 `successTimerRef.current`，in-flight 期间卸载则 `current===null`，新 timer 永不被清（MA-12）。
- `infinite-scroll.tsx:43-78`：IntersectionObserver 回调（`:49-57`）与 `immediateCheck` effect（`:66-72`）两条触发路径都只 guard `loading === true` / `hasMore === false`，无本地 in-flight ref；`onLoadMoreRef.current?.()` 在 `:55`、`:71`、`:77` 三处 fire-and-forget，均无 `.catch`（MA-13、MA-14）。回调与 effect 的 dep 数组 `[distance, disabled, hasMore, loading]`（`:64`、`:72`）**不含 `error`**，`error` 分支本应让自动加载让位给显式 retry `<Button>`（`:133-146`），但 observer 在 error 态依旧 armed 并会在 sentinel 重新相交时自动 `onLoadMore`，绕过 retry UX（OA-10，与 MA-13 loading-edge 不同根）。
- `pull-refresh.tsx:83-96`、`swipe-cell.tsx:84-104`、`countdown.tsx:80-96`：`onRefresh`/`onOpen`/`onClose`/`onFinish` 的 dispatch 写在 `setState` updater 内部；React 19 StrictMode 双调 updater → 每次手势在 dev 下双派发（MA-02）。`countdown` 因 `finishedRef` 偶然缓解，另两者无任何防护。
- `pull-refresh.tsx:132`、`swipe-cell.tsx:186`：`onTouchCancel` 直接复用 `handleTouchEnd`，即“任何 touchcancel 都按手抬起来提交”——系统手势打断（多点、滚动接管、来电）会被当成一次有效 pull/swipe 提交（OA-05）。
- `countdown.tsx:80-96`：`targetTime` 分支 `next = targetTime - Date.now()` **不 clamp**，而 `time` 分支正确 `Math.max(0, prev - interval)`；finish 后 `finishedRef.current===true` 使 `if (next<=0 && !finishedRef.current)` 不再命中，updater 持续返回越来越负的 `next` → 每个到期 countdown 在 `millisecond` 模式下每 30ms 重渲染一次（MA-16，移动端秒杀列表典型场景）。
- `countdown.tsx:106-118`：`reset()` 只 `setRemaining(...)` + `finishedRef.current=false`，**不动 `started`**；finish 后调 `reset()`，`remaining` 被重置、`finishedRef` 清零，但 `started` 仍为 `true`、tick effect（`started && !paused`）的 `setInterval`（`:99`）从未停止 → 下一个 tick 立即从重置值恢复计时 → reset 即静默重启；`start()` 只 `setStarted(true)`，无对应 `stop`/`pause`；该 hook 经 `index.ts:24` 公开导出但 reset/start 行为无文档（OA-13）。
- `countdown.test.tsx`：`reset()`/`start()` 零覆盖；`millisecond:true`（30ms 路径）零覆盖；targetTime 用例断言 `0 <= value <= 59`，几乎任何输出都能过（MA-15）。
- `MA-20` 子项：observer rebuild（改 `distance`/`disabled` 后旧 observer `disconnect`、新 observer 建立）、`touchCancel` 触发路径——均无测试；这两项是本 plan 所修复行为的 Proof，归属此处。`MA-20` 其余子项（marquee true-branch、e2e 断言收紧）归 plan 3。

## Goals

- 任意 `onRefresh`/`onLoadMore` reject 不再锁死渲染器，且有失败路径回归测试（MA-01、MA-14）。
- 卸载期间 in-flight 的 promise 与 timer 不再对已卸载实例 `setState`（MA-12）。
- `infinite-scroll` 有本地 in-flight guard，两条触发路径不再重复发请求；`error` 态完全挂起自动加载，仅 retry `<Button>` 解除（MA-13、OA-10）。
- 全部 dispatch 移出 `setState` updater，StrictMode 下不再双派发（MA-02）。
- `touchcancel` 不再被当作有效提交；提交语义有明确裁定并落地（OA-05）。
- `countdown` `targetTime` 分支 clamp 到 0 且 finish 后停止 tick；`reset()` 行为被裁定并落地（MA-16、OA-13）。
- 上述每条行为都有 focused 单测覆盖（MA-15、MA-20 observer/touchCancel 子项）。

## Non-Goals

- 不改 BEM 类名 / markers 契约 / schema 类型对齐 / design.md 三方对齐 → plan 2。
- 不改 touch-action、主题 token、a11y 焦点管理、几何布局、内联样式迁移 → plan 3。
- 不引入 i18n seam、不改 `onAction` 是否派发、不删未用依赖 → plan 2。
- 不做 `useCountdownTimer` 是否应公开的“导出策略”裁定（MA-18 接口导出归 plan 2；本 plan 只裁定并实现 reset/start 的**行为**契约）。

## Scope

### In Scope

- `pull-refresh.tsx`：`.catch` + 卸载 guard（MA-01、MA-12）；dispatch 出 updater（MA-02 pull-refresh 站点）；`touchcancel` 提交裁定（OA-05 pull-refresh 站点）。
- `infinite-scroll.tsx`：三处 `.catch`（MA-14）；本地 in-flight guard + `hasMore` 语义收紧（MA-13）；observer 回调与 dep 数组纳入 `error`（OA-10）；dispatch 出 updater 若有（MA-02 infinite-scroll 站点——当前无 updater 内 dispatch，核对确认即可）。
- `swipe-cell.tsx`：dispatch 出 updater（MA-02 swipe-cell 站点）；`touchcancel` 提交裁定（OA-05 swipe-cell 站点）。注：close-after-action 契约（OA-02）归 plan 2，本 plan 不动 onAction 语义，只确保现有 `onOpen`/`onClose` 不双派发。
- `countdown.tsx`：`targetTime` clamp + finish 后停 tick（MA-16）；`reset()` 行为裁定与实现（OA-13）；dispatch 出 updater（MA-02 countdown 站点，`onFinishRef.current()` 在 `setRemaining` updater 内）。
- `hooks/use-touch.ts`：仅当 OA-05 裁定需要 touchcancel 区分语义时，扩展 `UseTouchReturn` 提供 `isCancelled` 信号（最小改动；签名层面 MA-11 的 `onTouchEnd` 参数归 plan 2）。
- `countdown.test.tsx`、`infinite-scroll.test.tsx`、`pull-refresh.test.tsx`、`swipe-cell.test.tsx`：补 reject / 卸载 / in-flight / StrictMode 双调 / error 挂起 / finish 停 tick / reset 行为 / observer rebuild / touchCancel 用例（MA-15、MA-20 子项）。

### Out Of Scope

- MA-20 的 marquee true-branch 与 e2e 断言收紧（plan 3）。
- 任何 `docs/components/*/design.md` 文本对齐（plan 2 负责契约层文档；本 plan 的 reset/touchcancel 行为裁定结论若影响 design.md，仅做最小同步并显式标注）。
- 性能基准（N 个并发 countdown 帧率）——MA-16 修复后无限重渲染已消除，量化基准属优化项，归 deferred。

## Failure Paths

| 场景               | 触发                                                | 行为                                                                                                          | 可重试             | 用户可见表现                       |
| ------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------- |
| refresh-reject     | `onRefresh` action reject（网络/5xx/dispatch 取消） | `status` 回到 `'normal'`，不卡 `'loading'`；可选经 runtime monitor 上报                                       | 是（用户再次下拉） | spinner 消失，列表可再次下拉       |
| loadmore-reject    | `onLoadMore` reject                                 | 不发第二次请求；`error` 由 host 经 `error` prop 显式置位时渲染 retry `<Button>`；否则静默不锁                 | 是（retry 按钮）   | 出错行显示 retry；滚动不再自动触发 |
| unmount-in-flight  | 卸载时 onRefresh/onLoadMore 仍在途                  | `.then`/`.catch` 内 isMounted/AbortController 拦截，不 `setState`                                             | 否                 | 无（已卸载）                       |
| strictmode-double  | React 19 dev StrictMode 双调 updater                | dispatch 仅在 updater 外执行一次                                                                              | 否                 | 无双 toast / 双请求                |
| touchcancel-commit | 系统 touchcancel（多点/滚动接管）                   | 按裁定：取消手势不提交（恢复初始位移/状态），不触发 onRefresh/onOpen                                          | 否                 | 手势被打断时回弹、不误触发         |
| countdown-finish   | `targetTime` 已过去                                 | `remaining` clamp 到 0，`clearInterval`；不再重渲染                                                           | 否                 | 显示 `00`，静止                    |
| countdown-reset    | finish 后调 `reset()`                               | 按裁定：`remaining` 回到初始、`started` 置 `false`（停止并等待显式 `start()`），与 `autoStart:false` 语义对齐 | 否                 | 显示初始值，不动                   |

## Test Strategy

档位选择：**必须自动化**。

理由：异步 reject 路径、StrictMode 双调、卸载后状态写入、error 态自动加载挂起、finish 后无限重渲染——均为核心回归路径，且历史上正是“happy-path 测试全绿但行为错误”导致漏网。每条 Fix 必须先有失败测试（Proof 先于 Fix），符合 must-automate 档。

## Execution Plan

### Phase 1 - pull-refresh 异步与卸载正确性

Status: completed
Targets: `packages/flux-renderers-mobile/src/pull-refresh.tsx`, `packages/flux-renderers-mobile/src/pull-refresh.test.tsx`

- Item Types: `Proof | Fix | Decision`

- [x] `Proof`：新增 `rejects → status 回到 'normal' 且不卡 'loading'` 用例（mock `onRefresh` reject）。
- [x] `Proof`：新增 `卸载期间 onRefresh 在途 → .then/.catch 内不 setState`（`isMountedRef` 断言无 console warning / 无 timer 残留）。
- [x] `Proof`：新增 StrictMode 下 `handleTouchEnd` 达阈值时 `onRefresh` 仅派发一次的用例。
- [x] `Proof`：新增“`status==='loading'`/`'success'` 时再次 `handleTouchEnd` 不重复派发 `onRefresh`”用例（验证 re-entrancy 守卫在 dispatch 出 updater 后仍成立——需靠 `statusRef` 读当前状态）。
- [x] `Fix`（MA-01）：`pull-refresh.tsx:86` `void Promise.resolve(...).then(...)` 补 `.catch(() => setStatus('normal'))`（或 try/await/catch）。
- [x] `Fix`（MA-12）：引入 `isMountedRef`（或 per `performance-design-requirements.md` P5 的 `AbortController`），在 `.then`/`.catch` 内先判活再 `setState`；cleanup effect 清 in-flight timer。
- [x] `Fix`（MA-02 pull-refresh）：把 `onRefresh` dispatch 与 `setStatus('loading')` 的副作用移出 `setStatus` updater——同步算出 next status，`setStatus(next)`，再在 handler 体里 dispatch；**用 `statusRef` 镜像当前 status 以保留原 `current==='loading'||'success'` 的 re-entrancy 守卫**（dispatch 出 updater 后无法再在 updater 内读 current）。
- [x] `Decision`（OA-05 pull-refresh）：裁定 `onTouchCancel` 语义（默认裁定：cancel 不提交、恢复初始位移、不触发 onRefresh）；`pull-refresh.tsx:132` 据此实现——**优先在渲染器内拆分 `onTouchCancel` 与 `onTouchEnd`（不触碰 use-touch）**；仅当确实需要“cancel 信号”贯穿 touch hook 时，才以 **ref**（非 state，避免事件内陈旧读取）扩展 `use-touch`。

Exit Criteria:

> 只写本 Phase 真正交付的可观测结果 + 保证 Phase 2 能继续的局部检查；全量 typecheck/build/test 归 Closure Gates。

- [x] `pull-refresh.test.tsx` 含 reject / 卸载 / StrictMode 三类用例且全绿。
- [x] live `pull-refresh.tsx` 不再有 updater 内 dispatch，且 `.then` 带卸载 guard 与 `.catch`。
- [x] 本包 `pnpm --filter @nop-chaos/flux-renderers-mobile test` 通过（局部验证，保证 Phase 2 不被本 Phase 阻塞）。

### Phase 2 - infinite-scroll in-flight guard 与 error 挂起

Status: completed
Targets: `packages/flux-renderers-mobile/src/infinite-scroll.tsx`, `packages/flux-renderers-mobile/src/infinite-scroll.test.tsx`

- Item Types: `Proof | Fix`

- [x] `Proof`：新增“IO 回调与 immediateCheck 在 host 的 `loading` 延迟置位时不双发”用例（断言 `onLoadMore` 被调用一次）。
- [x] `Proof`：新增“`error` 为 true/string 时 observer 不自动 `onLoadMore`；retry `<Button>` 点击后才重新加载”用例。
- [x] `Proof`（MA-20 子项）：新增“改 `distance`/`disabled`/`hasMore`/`loading`/`error` 后旧 MockIntersectionObserver 调 `disconnect`、新 observer 建立”用例（`view.rerender`）。
- [x] `Fix`（MA-13）：引入本地 `isLoadingRef`，在 `onLoadMore` 触发时同步置位、随 host `loading` prop 转换清除；`hasMore === false` 语义裁定为显式布尔（`hasMore !== false` 或文档化 implicit-truthy，二选一并写进用例）。
- [x] `Fix`（OA-10）：observer 回调 guard 增加 `if (error === true || typeof error === 'string') return;`；effect dep 数组 `[distance, disabled, hasMore, loading, error]` 纳入 `error`。
- [x] `Fix`（MA-14）：`:55`、`:71`、`:77` 三处 `onLoadMoreRef.current?.()` 补 `.catch`（与 Phase 1 同款卫生）。

Exit Criteria:

- [x] `infinite-scroll.test.tsx` 含 in-flight / error 挂起 / observer rebuild 三类用例且全绿。
- [x] live `infinite-scroll.tsx` observer 回调与 dep 数组含 `error`，三处 onLoadMore 带 `.catch`，存在本地 in-flight guard。
- [x] 本包单测通过。

### Phase 3 - swipe-cell / countdown 状态机与生命周期

Status: completed
Targets: `packages/flux-renderers-mobile/src/swipe-cell.tsx`, `packages/flux-renderers-mobile/src/countdown.tsx`, `packages/flux-renderers-mobile/src/swipe-cell.test.tsx`, `packages/flux-renderers-mobile/src/countdown.test.tsx`, `packages/flux-renderers-mobile/src/hooks/use-touch.ts`（仅 OA-05 需要）

- Item Types: `Proof | Fix | Decision`

- [x] `Proof`：swipe-cell 新增 StrictMode 下 `onOpen`/`onClose` 各仅派发一次用例。
- [x] `Proof`（MA-20 子项）：pull-refresh/swipe-cell 新增 `fireEvent.touchCancel(root)` 用例，断言按 OA-05 裁定不提交。
- [x] `Proof`（MA-15）：countdown 用 `vi.useFakeTimers()` + `vi.setSystemTime()`，`{ targetTime: now+90_000, format:'ss' }` 断言文本 `30`；millisecond 模式（30ms）用例；`reset()`/`start()` 行为用例（按下方裁定）。
- [x] `Proof`（MA-16）：countdown finish 后断言不持续重渲染（计数渲染次数或断言 `clearInterval`）。
- [x] `Fix`（MA-02 swipe-cell）：`closeCell`/open 路径的 `onClose`/`onOpen` dispatch 移出 `setOpenState` updater。
- [x] `Fix`（MA-02 countdown）：`onFinishRef.current()` 移出 `setRemaining` updater（保留 `finishedRef` 守卫语义）。
- [x] `Fix`（OA-05 swipe-cell）：`swipe-cell.tsx:186` `onTouchCancel` 按 Phase 1 同款裁定实现（cancel 不提交、回弹、不触发 onOpen/onClose）。
- [x] `Decision`（OA-13）：裁定 `reset()` 契约——**默认裁定：`reset()` 将 `remaining` 回到初始、`started` 置 `false`（停止并等待显式 `start()`），与 `autoStart:false` 语义对齐，最小惊讶**（不沿用“started 恢复为 `autoStart !== false`”，因默认 `autoStart` 下会让 reset 静默重启，正是 OA-13 所述缺陷）。备选裁定（若产品确认 reset 应自动续跑）：`started = autoStart !== false`，但需同步修订 Failure Paths 与 Proof。
- [x] `Fix`（OA-13）：`countdown.tsx:106-118` `reset()` 内 `setStarted(false)` 并重置 `remaining`/`finishedRef`（按默认裁定）；补 `start()`/reset 行为注释于导出接口（仅行为注释，接口 `export` 归 plan 2 的 MA-18）。
- [x] `Fix`（MA-16）：`countdown.tsx:80-96` `targetTime` 分支 `next = Math.max(0, targetTime - Date.now())`，并在 `finishedRef.current` 置位后 `clearInterval`（或等效停止 tick）。

Exit Criteria:

- [x] swipe-cell / countdown 新增用例全绿；countdown 用 fake timers 锁定 targetTime/millisecond/reset/finish 行为。
- [x] live 三文件均无 updater 内 dispatch；`onTouchCancel` 不提交；countdown `targetTime` clamp 且 finish 停 tick；`reset()` 行为与裁定一致。
- [x] 本包单测通过；`pnpm --filter @nop-chaos/flux-renderers-mobile typecheck` 通过（局部，因公开了可能的新 hook 信号）。

## Draft Review Record

- Reviewer / Agent: 独立 general sub-agent（fresh session），共 2 轮
  - Round 1：`ses_10e6ff1f8ffe` → `revised`（1 Major + 4 Minor）
  - Round 2：`ses_10e68a31effe` → `pass`（零 Blocker/Major/Minor）
- Verdict: `pass`（经 2 轮达成共识）
- Rounds: 2
- Findings addressed:
  - **Major M1（OA-13 reset 契约自相矛盾，round 1 阻塞）→ 已修**：统一裁定为 `reset() → remaining 回到初始、started=false（停止并等待显式 start()）`，与 `autoStart:false` 语义对齐；Failure Paths“countdown-reset”行、Phase 3 Decision、Phase 3 Fix 三处现已一致（保留显式 gated 的备选裁定作为产品覆盖逃生口，非活矛盾）。
  - Minor A（已修）：MA-02 dispatch 出 updater 后用 `statusRef` 镜像当前 status 以保留原 re-entrancy 守卫，并新增“loading/success 时再次 touchEnd 不重复派发”Proof。
  - Minor B（已修）：OA-05 默认在渲染器内拆分 `onTouchCancel`/`onTouchEnd`（不触碰 use-touch）；仅当确需 cancel 信号贯穿 hook 时才以 **ref**（非 state）扩展。
  - Minor C（已修）：countdown reset 因果链措辞改为归因于“`setInterval`（`:99`）从未停止”，非“computeInitialRemaining 是 reset effect 依赖”。
  - Minor D（acceptable）：MA-13 `isLoadingRef` 清理采用 host loading-prop 转换；极端下 over-lock 优于重复请求，保守安全。
- 独立核对结论：12 条 in-scope finding（MA-01/02/12/13/14/15/16、MA-20 observer+touchCancel 子项、OA-05/10/13）逐条有可观测 Exit Criteria 的执行项；全部引用 file:line 经 live repo 核验通过（round 2 复核 18 处全部 verified）；scope 诚实（Deferred 仅 N 并发 countdown 帧率基准一项）；与 plan 2/3 切分干净无重复归属；Plan Status / Goals / Closure Gates / Failure Paths / Phase 3 在 OA-13 默认裁定上五处一致。

## Closure Gates

> 全量验证归此处（Minimum Rule 18）；纯本包改动，跑全量是为确认未波及他包。

- [x] 所有 in-scope P1（MA-01、MA-02）及本 plan 覆盖的 P2/P3（MA-12、MA-13、MA-14、MA-15、MA-16、MA-20 子项、OA-05、OA-10、OA-13）live defect 已修复。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect。
- [x] 必要 focused verification（reject / 卸载 / in-flight / StrictMode / error 挂起 / finish 停 tick / reset / observer rebuild / touchCancel）已完成。
- [x] 若 reset/touchcancel 裁定改变了公开行为，`docs/components/countdown/design.md` / `swipe-cell/design.md` 已最小同步（其余 design.md 对齐归 plan 2）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### N 并发 countdown 帧率基准

- Classification: `optimization candidate`
- Why Not Blocking Closure: MA-16 修复后“到期后无限重渲染”已消除，这是唯一的已知帧率缺陷；对 N 个并发 countdown 的量化基准属性能优化，不影响当前 supported baseline（正确性）成立。
- Successor Required: no
- Successor Path: —

## Non-Blocking Follow-ups

- 若未来 `useCountdownTimer` 决定不公开（OA 盲区点出的“是否应导出”问题），reset/start 契约文档可随之移除；当前仅做行为裁定。
- `hasMore` implicit-truthy 若改显式布尔后，host 文档可在 plan 2 的契约对齐里补一句说明。

## Closure

Status Note: ✅ Closed — independent fresh-session audit `ses_aud1t_7f3c2e` verified every Phase-1/2/3 claim against live code (A–F all pass); plan delivered async/state-machine correctness + focused regression tests; repo full-green confirmed by spot-run.

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit sub-agent（fresh session `ses_aud1t_7f3c2e`），未参与执行，全量核对 live source/tests/docs，未采信 executor 自述。
- Verdict: `approved`（零 Blocker / 零 Major；1 条 Minor 观察记录于下，不阻塞关闭）。
- Spot-run observed: `pnpm --filter @nop-chaos/flux-renderers-mobile test` → 7 files / 101 tests passed；`... typecheck` → clean（与 executor 51/51 全量报告一致，未发现偏离）。
- Per-checklist (A–F) findings vs live code:
  - **A. Phase 1 (pull-refresh.tsx)**: (1) 无 updater 内 dispatch——`onRefresh` dispatch 在 `.then` 体外 `:110`，所有 `setStatus` 调用（`:92,104,113,118,123,128`）updater 纯函数；✅ (2) `.catch → 'normal'`（`:121-124`）✅； (3) `isMountedRef` 守卫 `.then`（`:112,116`）、内嵌 setTimeout（`:116`）、`.catch`（`:122`）三处 setState 前均先判活 ✅； (4) `successTimerRef` unmount 清理（`:73-76`）+ `.then` 内 re-set 前先 `clearTimeout`（`:114`）✅； (5) `statusRef` 经 effect 镜像（`:58-61`）并在 re-entrancy 守卫读取（`:100-101`）✅； (6) `handleTouchCancel`（`:141-147`）独立、不触发 `onRefresh`、恢复 `normal`，且 `loading/success` 态 early-return 不偷走 in-flight（测试 `:342-369` 锁定）✅。
  - **B. Phase 2 (infinite-scroll.tsx)**: (1) `isLoadingRef` 同步置位于 `fireLoadMore`（`:65`）、随 `[loading]` effect 清零（`:56-58`）✅； (2) IO 回调 `if (hasError) return`（`:90`）✅； (3) 两个 effect dep 数组均含 `hasError`（`:105,115`）→ `error` 变化时 observer 重建（`:102` disconnect）✅； (4) 三处 onLoadMore 全部经 `fireLoadMore` 的 `.catch`+try-catch（`:64-73`；调用点 `:94,114,121`）✅； (5) retry `triggerLoadMore`（`:117-122`）是 error 态唯一可加载路径 ✅。
  - **C. Phase 3 (swipe-cell + countdown)**: (1) swipe-cell `closeCell`/`openCell` dispatch 在 handler body（`:101,109`）、updater 纯、`openStateRef` 同步写（`:99,107`）✅； (2) `handleTouchCancel` 仅 `reset()`（`:165-167`）不 dispatch 不 commit ✅； (3) countdown `onFinishRef.current()` 在 effect（`:83-89`），`setRemaining` updater 纯 ✅； (4) targetTime 分支双侧 clamp（`computeInitialRemaining :56` + tick `:105`）✅； (5) tick effect `if (isFinished) return`（`:98`）+ `isFinished` 在 deps（`:116`）→ finish 时 `clearInterval` ✅； (6) `reset()` `setStarted(false)`（`:132`）✅； (7) 实现与 Phase 3 OA-13 默认裁定（remaining 回初始 + started=false）逐字一致，无活矛盾 ✅。
  - **D. Tests 为真回归**: StrictMode 用例确实包 `<React.StrictMode>`（pull-refresh.test `:59-65`→`:272-291`，swipe-cell.test `:63-69`→`:244-258`）并断言 `toHaveBeenCalledTimes(1)` ✅；MA-16 用例走 `targetTime` 分支（countdown.test `:333-369` 用 `targetTime={30}`+`millisecond`，非已 clamp 的 `time` 分支）✅；touchCancel 用例同时断言 no-dispatch AND 正确终态（pull `:329-340`/`:342-369`，swipe `:260-272`/`:274-292`）✅；MA-20 observer-rebuild 用例覆盖 distance/disabled/hasMore/loading/error 五次 disconnect+重建（infinite-scroll.test `:332-377`，MockIntersectionObserver 有 `disconnected` 标志 `:30,44-46`）✅。
  - **E. Exit Criteria + 技术门**: 三 Phase Exit Criteria 均有 live artifact 兑现；4 个技术门 spot-run 复核（本包 test 101 passed / typecheck clean），全量 51/51/27/27/51 与 executor 报告无偏离 ✅。
  - **F. Scope 诚实**: Deferred 仅「N 并发 countdown 帧率基准」（optimization candidate，`:176-181`）；Non-Blocking Follow-ups 仅 useCountdownTimer 导出策略（plan 2 MA-18）与 hasMore doc（plan 2）——均为显式 out-of-scope，无 in-scope live defect 被静默降级 ✅；`use-touch.ts` 按裁定未改动（in-renderer 拆分），与 OA-05 Decision 一致 ✅。
- Minor 观察（不阻塞，仅记录准确性）: pull-refresh `statusRef` 实为「effect-synced only」，diff summary 述为「effect-synced + sync-written in handler」对 swipe-cell 成立、对 pull-refresh 不成立（`handleTouchEnd` 无 `statusRef.current=` 同步写）。因 touch 事件间必经 React commit+effect flush，re-entrancy 守卫对事件驱动场景功能等价，且测试 `:293-327` 绿——不构成缺陷，仅描述精度问题。
- Evidence links: 源码 `packages/flux-renderers-mobile/src/{pull-refresh,infinite-scroll,swipe-cell,countdown}.tsx`；测试 `packages/flux-renderers-mobile/src/{pull-refresh,infinite-scroll,swipe-cell,countdown}.test.tsx`；owner docs `docs/components/{countdown,swipe-cell,pull-refresh}/design.md`；执行日志 `docs/logs/2026/06-23.md`；两审计 Remediation Progress 行（`docs/audits/2026-06-22-2039-{multi,open}-audit-mobile.md`）。

Follow-up:

- （仅 non-blocking 项；confirmed live defect 不得出现在这里）
