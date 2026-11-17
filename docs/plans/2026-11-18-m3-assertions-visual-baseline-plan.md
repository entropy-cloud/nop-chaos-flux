# M3 断言与等待 API + 视觉基线对比（自动化面）

> Plan Status: completed
> Last Reviewed: 2026-11-18
> Source: docs/research/2026-11-17-flux-debugger-roadmap.md（M3 节）· docs/research/2026-11-17-flux-devtools-design.md §6 · docs/research/2026-11-17-flux-devtools-capture-design.md §8
> Related: M1（StabilityTracker/ForestSnapshot）、M2（capture 管线/增量签名）、M0（协议不变更）

## Purpose

flux 版 retry-ability（`waitFor` 四类谓词 + 重试日志面板可见）+ 内置视觉回归（YIQ 像素 diff、diffRatio、cid 忽略区、`xui:visual-ignore` schema 注解驱动、本地基线），供 e2e 与用户共享同一 API。

## Current Baseline（live repo 核对）

- M1/M2 已交付：`getStabilityTracker()`（whenStable 原语）、`__NOP_DEBUGGER_API__` V1 查询面（queryEvents/waitForEvent/inspectByCid）、capture S2 管线（`captureScreenshotFromClone`/`createIncrementalCapturer`/`computeDomSignature`）、`getSnapshotAt`。
- 无 waitFor 重试查询 API（V1 `waitForEvent` 是单事件等待，非谓词重试）；无任何像素 diff/基线设施。
- store 日志总线支持 `append`/`updateEvent`（M1 diff + 4ms 合并），可承载 `assertion:retry` 日志。
- `xui:` schema 注解模式在仓库既有（`xui:imports` 等）；`data-cid` 恒等已冻结。
- 本地基线目录政策：`_tmp/` 已 gitignore；`tests/e2e/__snapshots__/` 亦 gitignore（AGENTS.md 视觉产物政策）。

## Goals

- `waitFor(pred, {timeoutMs=4000, intervalMs=32, stableGate=true})`：cid / scope / event / stability 四类谓词；每次重试发 `assertion:retry` Log（面板显示尝试次数与最近失败原因）；`WaitResult = {ok:true, attempts, durationMs} | {ok:false, attempts, lastError}`；设计 §6 的 `trace: EvalTrace[]` 简化为不返回（表达式采样在 M1 默认关闭、无轨迹数据可填——非目标记入 Deferred 记账）。
- 效果/查询二分文档化：`dispatch(action)` 一次执行不重试 vs `waitFor` 纯查询可重试；`__NOP_DEBUGGER_API__` 暴露 `waitFor` 与 `dispatch`。
- 视觉基线对比（本地模式）：YIQ 逐像素 diff（pixelmatch 算法自实现，无三方依赖）、diffRatio、按 cid 聚合区域 diff、`xui:visual-ignore` 注解 → 忽略区、`visual` 谓词接入 `waitFor`、基线本地存储（`_tmp/baselines/` 政策 + 内存 fallback）。
- 用 waitFor 重写 2–3 个现有 e2e 等待场景验证稳定性。

## Non-Goals

- fake-clock（设计标注可选后置，接口按 M5 回放需求设计时再定）。
- 网关版本化基线（M6）；基线上传。
- 面板 diff 画廊 UI（E4 Console v2 消费）。

## Scope

### In Scope

- nop-debugger：`wait-for.ts`（四类谓词引擎 + 重试日志 + stableGate）、`capture/visual-diff.ts`（YIQ diff + diffRatio + cid 聚合 + 忽略区）、基线存储（内存 + `_tmp/baselines/` 可选落盘）、automation V2 扩展（`waitFor`/`compareScreenshot`/`putBaseline`）、`xui:visual-ignore` 注解读取（从节点 schema/`data-` 属性标记）
- e2e：1px diff 注入阈值行为、cid 忽略区生效、waitFor 重写 2–3 个既有等待场景
- 文档：quick-reference waitFor/visual API 节；效果/查询二分说明；roadmap 附注 + daily log

### Out Of Scope

- 面板 assertion 日志的专属 UI（timeline 列表已能显示 kind=assertion 事件）
- 服务端基线/上传/转码

## Failure Paths

| 场景             | 触发                   | 行为                                                  | 可重试 | 用户可见表现                          |
| ---------------- | ---------------------- | ----------------------------------------------------- | ------ | ------------------------------------- |
| wait-timeout     | 超时谓词仍未满足       | resolve（不 reject）`{ok:false, attempts, lastError}` | 是     | 面板 assertion 日志 failed + 尝试次数 |
| baseline-missing | compare 时基线键不存在 | `{match:false, missing:true}`，可选 `putBaseline` 建  | 是     | 面板提示缺基线                        |
| size-mismatch    | 对比图像尺寸不一致     | `CaptureError{code:'size-mismatch'}`                  | 否     | 面板报尺寸差异                        |

## Test Strategy

档位选择：`必须自动化`（对外断言契约 + 视觉 diff 算法为核心回归路径）

Proof 先行：YIQ diff 算法单测（同图 diffRatio=0、1px 变化 → diffRatio>0 且 < 阈值、忽略区生效）先于消费面。

## Execution Plan

### Phase 1 - waitFor 引擎

Status: completed
Targets: `packages/nop-debugger/src/wait-for.ts`、`automation.ts`、`controller.ts`

- Item Types: `Fix | Proof`

- [x] `WaitForPredicate` 四类：`{type:'cid', cid, state(inspect)=>boolean}`、`{type:'scope', selector(data)=>unknown, until(v)=>boolean}`、`{type:'event', kind, match(log)=>boolean}`、`{type:'stability'}`
- [x] `waitFor(pred, opts)`：stableGate（每次重试前 whenStable）、intervalMs 轮询、timeoutMs resolve `{ok:false}`；每次失败重试 append `assertion:retry` 日志（kind='assertion'，detail 含 attempts + 最近失败原因），成功时 updateEvent 状态 passed
- [x] cid 谓词用 `inspectByCid`（cid 为 number，inspect 结果类型以 live `NopComponentInspectResult` 为准；设计 §6 的 NodeInspect 为 conceptual 名，实现不新造类型）；scope 谓词用 `getSnapshotAt(latest)` + selector；stability 谓词 = `whenStable()` 后 ok
- [x] automation V2 第二批扩展（同 V2 面，非新 API 代）：`waitFor(pred, opts)` 挂载（谓词函数经 JSON 不可序列化——仅进程内 API 面，窗口自动化用字符串表达式变体 `waitForExpression({type:'scope-path', scopeId?, path, op: 'eq'|'ne'|'truthy'|'defined', value?})`——语义固定为：路径经 getIn 解析（未命中=undefined），op 确定性比较，不支持任意表达式字符串）
- [x] `dispatch` 暴露（一次执行，不重试；经 runtime dispatchAction）
- [x] 单测：四类谓词命中/超时、stableGate 行为、retry 日志条数与状态翻转、二分语义（dispatch 不重试）

Exit Criteria:

- [x] waitFor 单测全绿（含超时 resolve ok:false 判别、retry 日志条数断言）
- [x] automation 挂载且 V1 兼容

### Phase 2 - 视觉基线对比

Status: completed
Targets: `packages/nop-debugger/src/capture/visual-diff.ts`、`controller.ts`

- Item Types: `Fix | Proof`

- [x] Proof 先行：YIQ diff 单测骨架（同图=0、1px 注入 → 0<diffRatio<阈值、忽略区消除 diff、尺寸不匹配抛 CaptureError）——先红
- [x] `yiqPixelDiff(a, b, {threshold, includeAA?})` 自实现 pixelmatch 算法（YIQ 色差 + 抗噪阈值）；输入为 RGBA Uint8ClampedArray（从 canvas 抽取）
- [x] `compareScreenshot(result, baselineKey, opts)`：基线图 RGBA vs 当前 RGBA → diffRatio + 按 cid 聚合区域 diff（矩形分桶）+ 忽略区（`xui:visual-ignore`：节点标注集合，矩形或 cid）
- [x] 基线存储：内存 Map + 可选 `_tmp/baselines/<key>.json`（base64 png）落盘；`putBaseline(key)` 从最近截图写入
- [x] `visual` 谓词接入 waitFor：`{type:'visual', baselineKey, maxDiffRatio}` → compare 后判定
- [x] `xui:visual-ignore` 读取：`[data-xui-visual-ignore]` DOM 标记 + schema 注解投影（节点 cid 集合入忽略区）

Exit Criteria:

- [x] diff 算法单测全绿（1px 注入判别：无忽略区时 diffRatio>0；加忽略区后归 0/低于阈值）
- [x] compare 输出含 regions（cid 聚合）且 e2e 程序化断言 cid 忽略区生效

### Phase 3 - e2e 重写 + 文档 + 收口

Status: completed
Targets: `tests/e2e/`、docs

- Item Types: `Proof | Follow-up`

- [x] 重写 2–3 个既有 sleep 类等待场景为 `waitFor`（选择标准：`page.waitForTimeout` + `__NOP_DEBUGGER_API__` 调用；候选：`tests/e2e/debugger-m1-stability-snapshots.spec.ts` 的固定 sleep、`tests/e2e/debugger.spec.ts` 的 sleep 处），同 commit 替换旧等待；对比前后稳定性（重跑 3 次记录）
- [x] e2e：1px diff 注入 → diffRatio 阈值行为；cid 忽略区生效（程序化）
- [x] quick-reference：waitFor/visual 节 + 效果/查询二分说明；roadmap M3 附注；daily log

Exit Criteria:

- [x] e2e 新增/重写用例全绿（含忽略区程序化断言）
- [x] docs 节与 live 契约一致；daily log/roadmap 落盘

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session）
- Verdict: pass-with-minors（0 Blocker / 0 Major；5 Minor 全部处理：trace 简化 Deferred 记账、cid 类型钉死 number+NopComponentInspectResult、waitForExpression DSL 语义固化、e2e 候选点名+选择标准、automation V2 措辞）
- Rounds: 1
- Findings addressed: Minor×5 如上

## Closure Gates

- [x] waitFor 四类谓词 + retry 日志 + stableGate 全部落地且有判别性测试
- [x] YIQ diff 算法 + diffRatio + cid 聚合 + 忽略区全落地（1px 注入判别 + 忽略区归零判别）
- [x] waitFor 重写 2–3 个既有 e2e 等待场景且全绿
- [x] 受影响 owner docs 已同步（quick-reference）
- [x] 独立子 agent closure audit 通过并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### WaitResult.trace: EvalTrace[]（设计 §6 字段）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 表达式采样（onExpressionEval）M1 起默认采样率 0、本阶段不开启，谓词重试期间无 EvalTrace 数据可回填；字段留 M4（表达式追踪开启后）补。
- Successor Required: `yes`
- Successor Path: M4 计划（Why 面板/依赖图开启表达式追踪）

### fake-clock（调试会话接管 setTimeout/Date）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 设计文档标注"可选后置"；其接口设计依赖 M5 回放的时钟需求（录制 clock events 消费方），先行实现会造成接口返工。M5 计划将把 fake-clock 纳入回放器 Phase。
- Successor Required: `yes`
- Successor Path: M5 计划（回放器）

## Non-Blocking Follow-ups

- 面板 assertion 日志分组展示优化（timeline 已可见）
- 抗锯齿 includeAA 调参（默认关闭，按实际页面噪声调）

## Closure

Status Note: M3 三 Phase 落地：waitFor 四类谓词 + assertion:retry 日志 + stableGate、dispatch 二分、YIQ diff + diffRatio + cid 聚合 + xui:visual-ignore、4 个既有 e2e sleep 改写为 waitFor(stability)、1px 注入/忽略区程序化断言。closure audit 2 轮（round 1 issues 2 Major——e2e 调试残留、dispatch 测试缺失；round 2 approved）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-11-18，2 轮）
- Evidence: round 1 issues（Major×2：e2e M3-DIAG 调试残留、dispatch 不重试测试缺失；Minor×3）→ 修复（spec 清理；wait-for.test 新增 dispatch 单调用判别；死断言修正；e2e 忽略区改为 cid 精确 rect 10x11；waitFor 入口 fast-reject visual）→ round 2 approved（0 Blocker / 0 Major）。实跑 wait-for+visual-diff 18/18、e2e 7/7；typecheck/lint/check/build 全绿。附注：删除仓库根 stray `--stat` 调试残留文件。

Follow-up:

- （见 Non-Blocking Follow-ups）
