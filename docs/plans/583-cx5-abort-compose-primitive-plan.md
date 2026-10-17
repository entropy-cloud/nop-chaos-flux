# 583 CX-5 共性重构：abort 信号组合原语下沉 flux-core（composeAbortSignals 超集 API）

> Plan Status: completed
> Last Reviewed: 2026-10-13
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md` CX-5 条目（WA-2 批立案 WA-action-core-002，台账 85 行 successor-required→本批）；先例：plan 579-582
> Related: `docs/architecture/flux-core.md`、`docs/architecture/action-scope-and-imports.md`

## Purpose

收敛 abort 信号合并双实现（~40 行）：flux-action-core `mergeAbortSignals`（action-execution.ts:92-137，双信号手写监听+cleanup+reason 传播+identity/aborted 短路）↔ flux-runtime `composeAbortSignals`（abort-signal-helpers.ts:18-54，n 信号+undefined 过滤+NEVER_ABORTED 单例+native `AbortSignal.any` 快路径+manual fallback）。根因=共享原语家在 flux-runtime 而层级位于其下的 flux-action-core 不可反向导入（e68fe452f 层级约束手写第二份）。修复=flux-core 增超集原语，两包薄封装收敛。

## Current Baseline（拟制时 HEAD `e22253bee` 实测）

- **runtime 版**（abort-signal-helpers.ts:18-54，export）：`composeAbortSignals(signals: readonly (AbortSignalLike|undefined)[]): AbortSignal`——AbortSignalLike 接口定义于同文件 :1（flux-core 无此类型，原语需在 flux-core 定义等价结构类型）；语义链=undefined 过滤→0 返回 NEVER_ABORTED_SIGNAL 单例→1 返回 toStandardAbortSignal→native `AbortSignal.any` 快路径（注释自证须静态调用）→manual fallback（controller+once 监听+abort 后移除全部监听）。**无 cleanup 暴露、无 reason 定制**（controller.abort() 默认 reason）。消费点=renderer-reaction-handle.ts:224（取 .signal 语义）。
- **action-core 版**（action-execution.ts:92-137，**私有函数**）：`mergeAbortSignals(rootSignal, actionSignal?)`——四短路分支（!actionSignal 或 ===root → 透传 rootSignal 本体[**identity 可观测**]；root.aborted → 透传 root；action.aborted → 透传 action）+双活时 controller+**reason 传播**（`controller.abort(signal.reason)`）+cleanup（移除双监听，幂等）+abort 时自动 cleanup。消费点=:493。
- **语义张力点三处裁定（draft review R1 已裁，实施照办）**：①**reason 传播=共享 manual fallback 采用透传**（`controller.abort(source.reason)`）——action-core :505 直接读取 `.reason` 外部可观测；runtime 输入恒无自定义 reason（:208 `abort()` 无参）行为不变；runtime manual+自定义 reason+pre-any 环境微差（默认 AbortError→透传）=**accepted delta 落字**。②**四短路保留在 action-core 薄壳**（:498 `mergedSignal === actionCtx.signal` identity 决定 context 克隆——短路返回输入本体使 identity 走快路径；runtime 0/1 分支在真实消费点 :219-223 恒 ≥2 信号不可达=防御路径照钉）；措辞勘误：native 1-signal 输入 `toStandardAbortSignal` 恒等直通（含已 abort 者），「新 controller.signal」仅对 like 桥接与组合路径成立。③**action-core 委托路径必须可拆卸（manual 形态）**——:642 `finally { mergedSignalCleanup() }` 每次 dispatch 必调为唯一拆卸机制，root 信号 page-lifetime（:648），noop cleanup=每次双活 dispatch 永久累积监听+闭包滞留 GC+late-abort 重新可见（现行为=cleanup 后冻结）；且真实链路双活是常态（renderer-reaction-handle 每次 dispatch 注入 combinedSignal）。**方案 B 落字**：原语第二参 `{ detachable?: boolean }`——runtime 薄壳走默认 fast path（AbortSignal.any 可用时），action-core 走 `detachable: true` manual 组合；A（原语整体 always-manual）弃用（runtime 侧零 delta 更优）。
- **依赖方向**：flux-action-core 直依 flux-core（层级正向下沉可行）；AbortSignalLike 为最小结构接口（aborted/addEventListener/removeEventListener?），flux-core 定义等价结构类型零新依赖。
- **既有测试**：两包均无 abort 专项测试（实测零命中）——特征化全量从零建；action-core 实有 8 个 abort 间接测试文件（cancelled-class-and-error-guard/contract-control-flow-timeout-cancel/operation-control-timeout-retry 等）=次级证据面。
- **在途**（draft review m3 补全）：flux-core types/scope.ts+flux-runtime {scope.ts,runtime-factory.ts,dialogs 测试}+flux-renderers-{data,form,layout} 共 14 文件并行在途——与目标三文件零交集（composeAbortSignals/AbortSignalLike 消费面仅 renderer-reaction-handle.ts 与 abort-signal-helpers.ts，均不在途）；**提交严格限定本批路径**。
- **授权链（执行前人工确认门处置）**：flux-core 新增公共工具=公共面变更（roadmap CX-5 显式标记）；**显式确认记录**（与 plan 580/582 同链）：时间=2026-10-12（会话期间下发并持续有效）；渠道=用户会话指令（goal）；引语=「执行workaround-code-smell-audit-roadmap.md直到彻底完成。每个工作项按照plan guide拟制计划完成。每个计划完成后自动提交一次」；单项可撤回（提交可逆）。
- **公开面影响**：flux-core index +1 原语导出（+1 AbortSignalLike 结构类型导出或包内私有——由 draft review 定）；flux-runtime/flux-action-core 公共导出面零变更（runtime 的 composeAbortSignals 保留薄壳同名导出[renderer-reaction-handle 消费面不变]；action-core 的 mergeAbortSignals 本就私有）。

## Goals

- flux-core 超集原语 `composeAbortSignals(signals, options?: { detachable?: boolean }): { signal, cleanup }`（`packages/flux-core/src/utils/abort-signals.ts` 同域先例落位+判别性单测）；**AbortSignalLike=draft review m4 裁定 flux-core 定义+index 导出 type**（依赖方向核验零新依赖；runtime 薄壳 re-export 使 renderer-reaction-handle 导入零改动）；两包薄封装收敛；**两包外部行为逐项保持**（张力点裁定落原语处注记）。
- 台账 WA-action-core-002 `found → fixed → verified`（closure 后）；roadmap CX-5 `todo → planned → done`。
- 三包 filter 门禁 + 双哨兵 + 隔离五门禁全绿；flux-runtime/flux-action-core index 零变更。

## Non-Goals

- renderer-reaction-handle/action-execution 消费点行为语义变化；abort 语义增强（**除张力点①裁定的最小 reason 透传统一外零语义增强**[runtime manual+自定义 reason+pre-any 环境微差=accepted delta]）。

## Scope

### In Scope

- `packages/flux-core/src/`（新原语件+index 导出+单测）
- `packages/flux-runtime/src/abort-signal-helpers.ts`（薄壳化）、`packages/flux-action-core/src/action-dispatcher/action-execution.ts`（短路保留+compose 委托）
- ledger/roadmap/dev log

### Out Of Scope

- 并行在途文件；消费点语义变化；其他 CX。

## Failure Paths

不适用（零新增运行时错误处理面）。

## Test Strategy

档位：**必须自动化**。特征化从零建——runtime 分支（undefined 过滤/0 单例[身份钉]/1 直通[含 native aborted 恒等钉]/native-any/manual[须 stub：`delete (AbortSignal as { any?: unknown }).any`+afterEach 恢复；仓内零 stub 先例故落字手法]）+action-core 分支（四短路/reason 传播/cleanup 幂等/abort 自动 cleanup/**:498 消费级 identity 钉**[action.aborted 短路→baseActionCtx 不克隆]/**manual 先 aborted 输入 break 后剩余不订阅边缘**）共 7 分支逐项钉住；action-core 既有 8 个 abort 间接测试文件=次级证据面必须保持绿；原语落地→两包套件同绿+flux-core 新单测判别；三包 filter 四门禁+双哨兵（ai+react）+隔离五门禁。

## Execution Plan

### Phase 1 - 特征化钉住与原语落地

Status: done（2026-10-13：执行批实施——特征化 16 钉先钉绿[基线 runtime 1532+1skip/action-core 227]→原语+两薄壳落地→三包读数精确一致[flux-core 680 含 +11 判别/runtime 1532+1skip/action-core 227]；动态判别 2 组恰红→恢复[①reason 无参化→action-core 双活 reason 钉恰红 1 failed|226 passed+flux-core reason 钉恰红；②detachable 改走 any→action-core cleanup 冻结钉恰红 1 failed|226 passed+flux-core detachable 两钉恰红]；三包 filter typecheck/build/lint/test exit 0+双哨兵 ai 850/react 554+两 index.ts diff --exit-code 通过；pnpm check 22/23 子门 exit 0[唯一红=oversized 的 runtime-factory.ts 在途文件非本批]）
Targets: flux-core + flux-runtime + flux-action-core

- Item Types: `Proof | Fix`（Proof 先于 Fix）
- [x] Proof：特征化基线——①runtime 五分支（0/1/native-any/manual/undefined 过滤）②action-core 六分支（四短路+reason 传播+cleanup 幂等+abort 自动 cleanup）逐分支钉住；重构前后同绿。
- [x] Fix：flux-core 原语（张力点裁定落地）+两包薄封装。
- [x] Proof：三包 filter 四门禁+双哨兵+index 零变更（runtime/action-core）。

Exit Criteria:

- [x] 特征化前后同绿；张力点现行为逐字保持（裁定注记在原语处）。
- [x] filter 门禁+双哨兵 exit 0。

### Phase 2 - 回写与收口

Status: done（2026-10-13：台账 WA-action-core-002 fixed→verified 翻转[终读 220=85+0+135——closure m1 修正预期算式]；closure audit R1 approved[agent_8fd5e55d，0B/0M/2m informational：m1 算式勘误/m2 证据日志分布注记]；roadmap CX-5 done；dev log 回填完成）
Targets: ledger、roadmap、dev log

- Item Types: `Proof | Decision`
- [x] Proof：台账 WA-action-core-002 `found → fixed → verified`（closure 后；fixed 已于执行批落账）；roadmap CX-5 回写；dev log。
- [x] Proof：隔离五门禁；独立 closure audit。

Exit Criteria:

- [x] reconcile exit 0；closure audit approved。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_d549feb5-9dcf-407f-b4ac-0ada730e60f0，review-only）
- Verdict: `fail`（0B/3M/5m）→ 全修转 active（张力点三处裁定为审查员核心交付）
- Rounds: 1
- Findings addressed: **张力点①** reason 传播=共享 manual fallback 透传（:505 直接读取 .reason 外部可观测；runtime 微差=accepted delta）；**张力点②** 四短路保留 action-core 薄壳（:498 identity 可观测；措辞勘误 native 1-signal 恒等直通）；**张力点③** action-core 委托路径必须 manual/detachable（:642 finally 拆卸机制+page-lifetime root+双活常态——noop cleanup 四重行为差）；**M1** Non-Goals 自相矛盾改写；**M2** ③裁定落字；**M3** stub 手法落字（delete AbortSignal.any+afterEach 恢复；环境 Node 25 fast path 恒走）；**m1** ①措辞勘误+1-signal aborted 恒等钉；**m2** 分支数 7 项+两个 load-bearing 钉；**m3** 在途清单补全+提交限定条款；**m4** AbortSignalLike=flux-core 定义+index 导出 type+utils/abort-signals.ts 落位+runtime re-export；**m5** 8 个间接测试文件=次级证据面。审查员 14 项实测全过（HEAD/台账/roadmap 时序/出生 commit e68fe452f/消费面/reason 可观测/cleanup 消费链/runtime index 零命中/依赖方向/测试环境 v25.3.0/stub 零先例/在途/模板）。

## Closure Gates

- [x] 双实现已收敛（原语+两薄壳；张力点裁定落字）
- [x] 行为零变化（特征化前后同绿+filter 门禁+双哨兵）
- [x] 台账/roadmap/dev log 齐
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（隔离 worktree，exit 0）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`（同上）
- [x] `pnpm test`（同上）
- [x] `pnpm check`（同上——零新增未登记红；**新增文件 git add 后复跑 check 门**[CX-4 untracked 盲区教训]）

## Deferred But Adjudicated

- **张力点③ 方案 A/B 裁定（draft review R1，2026-10-13）**：选 **B**——原语第二参 `{ detachable?: boolean }`（runtime 薄壳默认 fast path 零 delta；action-core `detachable: true` manual 组合）；弃 A（原语整体 always-manual 需论证 manual≡any 等价性，runtime 侧反受累）。

## Non-Blocking Follow-ups

- 两版 abort 语义增强统一（reason 策略等）如需要归独立行为变更批。

## Closure

Status Note: done（2026-10-13 收口提交）

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_8fd5e55d，review-only）
- Rounds: R1 `approved`（0B/0M/2m informational）
- m1 reconcile 预期算式勘误（终态 85+0+135——CX-4 同日已翻 WA-runtime-001，简报漏计）；m2 证据日志分布注记（主树 check-full.log 因在途 oversized 中断仅 3 子门，全链证据=隔离 cx5-gates-5-check.log+主树独立 knip log）。
- 审计员独立实证：原语与两原版逐字段开档（AbortSignalLike/NEVER_ABORTED/toStandardAbortSignal 逐字一致+manual 超集 reason 透传+幂等 cleanup+break 形态逐字保持+张力点注记落 JSDoc）；薄壳与消费面（runtime re-export 零改导入面[renderer-reaction-handle :2-3/:224 零改动]/action-execution 四短路逐字原位+:627 finally 拆卸机制原位）；动态判别 2 组亲手恰红（①reason 反转→core+action-core 恰红且 runtime AbortError 钉保持绿=accepted delta 边界正向证据②detachable 忽略→cleanup 冻结钉恰红=张力点③缺陷精确复现）→sha256 恢复；git add -N 盲区修复实证（4 新文件 ls-files 全可见）；knip 零新命中；reconcile 亲跑；两树 11 路径一致。
