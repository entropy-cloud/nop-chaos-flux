# M5 录制与确定性回放 + 视频录制

> Plan Status: completed
> Last Reviewed: 2026-11-18
> Source: docs/research/2026-11-17-flux-debugger-roadmap.md（M5 节）· docs/research/2026-11-17-flux-devtools-design.md §8 · docs/research/2026-11-17-flux-devtools-capture-design.md §7 · M0 协议 `dev-session.schema.json`
> Related: M1（ForestSnapshot/checkpoint 底座）、M2（capture canvas 管线）、M3（waitFor 可用于回放断言）、M3 Deferred fake-clock→本计划

## Purpose

用户会话可录制为 `DevSession` v1（M0 协议冻结格式），可在新 runtime 确定性重放（checkpoint 分歧检测定位）；会话可出视频（canvas → MediaRecorder webm）；本地会话缓存 IndexedDB LRU（<200MB）。含 M3 Deferred 的 fake-clock。

## Current Baseline（live repo 核对）

- M0 协议 `dev-session.schema.json` 冻结：version/meta/clock/inputs/envFrames/checkpoints/logs 六段。
- M1：ForestSnapshotCollector（epoch 环形 + revisions；pathHashes 由 recorder 计算，见 Phase 1）、写观察者（fetch/stream 计数接入 decorateDebuggerEnv）、store 日志总线（logs 投影来源）。
- M2：capture 管线产出 canvas（截图管线），MediaRecorder 视频未实现。
- automation `exportSession` 已有（NopDebuggerSessionExport——调试事件导出，非 DevSession 回放格式）。
- flux-action-core plugin `afterAction`（M1）捕获 action 流，但 `ActionOutcome` 目前**不含** `ctx.event`（action-execution.ts:220-228 仅 source/status/durationMs/error/interactionId）——本阶段需扩展 flux-action-core（ActionOutcome 增可选 `event` 字段，emitAfterAction 从 activeCtx.event 归一化后附带）；FluxActionEvent 的 nativeEvent/currentTarget/target/preventDefault 不可序列化，归一化时白名单剥离（仅 type + 自定义字符串/数字/布尔载荷键）。
- 无 fake-clock（setTimeout/Date 接管）、无回放器、无视频、无 IndexedDB 会话缓存。

## Goals

- Recorder：归一化输入事件（`afterAction` + `ctx.event` 载荷，脱敏）+ envFrames（fetcher 装饰捕获 request/response 脱敏帧）+ 周期 checkpoint（ForestSnapshot revision 向量 + 关键路径哈希，每 N 步）+ logs display 投影 → `DevSession` v1。
- fake-clock（M3 Deferred 收口）：`createFakeClock()` 接管 setTimeout/setInterval/Date.now（可选启用，仅回放使用），事件序列进 `clock.events`。
- Replayer：新建独立 SchemaRenderer（隐藏容器）+ fetcher stub（走 envFrames）+ fake-clock 驱动；逐步比对 checkpoint（revision 向量 + 路径哈希）；分歧记录 `Divergence {step, path, expected, actual}` 并可停驻；副作用默认 stub（navigate/dialog 记录不执行）。
- 视频：`capture.record({fps})`——时间轴截图 canvas 产物 drawImage 进录制 canvas → `MediaRecorder`（webm/vp9）；不支持时降级关键帧序列 + 时间戳。
- IndexedDB 会话缓存 LRU（配额 <200MB）。
- automation V2：`startRecording/stopRecording/getLastSession/replaySession(session)/record({fps})/stopRecordingVideo`。

## Non-Goals

- 服务端转码/归档（M6）；半真模式白名单副作用放行（记录为 follow-up）；回放 UI 面板（automation 面 + e2e 程序化断言即可）；S3 光栅回退。

## Scope

### In Scope

- flux-action-core：`ActionOutcome` 增可选 `event`（归一化后的可序列化输入载荷）
- nop-debugger：`recorder.ts`（DevSession 采集）、`fake-clock.ts`（**仅回放会话内安装/卸载**，不全局常驻）、`replayer.ts`（确定性回放 + 分歧检测 + 回放侧 ActionContext 合成，runtime 经 onRuntimeChange 获取）、`capture/video.ts`（MediaRecorder + 降级；帧源=逐帧解码截图字节回绘——无保留 canvas 产物，重页面高 fps 会帧饥饿，默认低 fps）、`session-cache.ts`（IndexedDB LRU）、automation V2 扩展、debugger-lab 演示按钮
- e2e：录制 30 步交互 → 刷新重放 → 最终 store/DOM 一致程序化断言；注入随机数用例被分歧检测捕获；含视频会话可回看
- 单测：DevSession 形状过 M0 schema 校验（复用 M0 ajv fixtures 模式）、checkpoint 分歧检测、fake-clock 语义、LRU 驱逐
- 文档：quick-reference 回放节；roadmap 附注；daily log

### Out Of Scope

- 回放 UI 面板；服务端归档；多会话管理 UI

## Failure Paths

| 场景                 | 触发                      | 行为                                                                                           | 可重试 | 用户可见表现            |
| -------------------- | ------------------------- | ---------------------------------------------------------------------------------------------- | ------ | ----------------------- |
| replay-divergence    | checkpoint 比对不一致     | 记录 `Divergence{step, path, expected, actual}` 并停驻该步（`replaySession` 返回 divergences） | 否     | 面板/结果列出分歧       |
| video-unsupported    | MediaRecorder 不可用      | 降级关键帧序列（PNG/WebP + 时间戳）                                                            | 否     | 结果标注 keyframes 模式 |
| cache-quota-exceeded | IndexedDB 超 200MB        | LRU 驱逐最旧会话至配额内                                                                       | 是     | —                       |
| env-frame-miss       | 回放请求未在 envFrames 中 | fetcher stub 返回 503 stub error（记录分歧上下文）                                             | 否     | 分歧报告                |

## Test Strategy

档位选择：`必须自动化`（回放确定性 = 核心回归路径；设计 §12 Must automate 明确列出）

Proof 先行：checkpoint 分歧检测单测（注入随机数场景）先于回放器消费面。

## Execution Plan

### Phase 1 - fake-clock + Recorder

Status: completed
Targets: `packages/flux-action-core/src/`、`packages/nop-debugger/src/fake-clock.ts`、`recorder.ts`、`session-cache.ts`

- Item Types: `Fix | Proof`

- [x] fake-clock：`createFakeClock()` → `{install(), uninstall(), now(), setTimeout/setInterval/clearTimeout/clearInterval 接管, tick(ms), events}`；install 替换 window 级定时器 + Date.now；事件按 `ClockEvent`（M0 schema kind 枚举）记录
- [x] flux-action-core：`ActionOutcome` 增可选 `event`（emitAfterAction 从 activeCtx.event 白名单归一化：type + 可序列化自定义键）
- [x] Recorder：挂 afterAction 归一化输入（脱敏 redactData）；fetcher 装饰扩展 envFrames 捕获（request/response 脱敏；requestInstanceId 映射 schema `requestId`）；周期 checkpoint（每 5 步 ForestSnapshot revisions + 关键路径哈希——哈希由 recorder 对 scopes 稳定字符串化计算，M1 无现成 pathHashes，回放侧用同一哈希函数）；logs 取 store 日志总线 display 投影；`stopRecording()` → DevSession v1 并过 M0 ajv 校验（ajv 需同时加载 methods.schema.json 外部引用）
- [x] session-cache：IndexedDB LRU（<200MB，key=sessionId，驱逐最旧）
- [x] 单测：fake-clock 语义（tick 推进/事件记录/uninstall 还原）、DevSession 过 `dev-session.schema.json` 校验（ajv 同时加载 methods.schema.json）、输入归一化白名单（nativeEvent 等被剥离）、LRU 驱逐（抽象存储注入）

Exit Criteria:

- [x] fake-clock/Recorder/缓存单测全绿；DevSession schema 校验用例绿（判别：缺段必挂）

### Phase 2 - Replayer + 分歧检测

Status: completed
Targets: `packages/nop-debugger/src/replayer.ts`

- Item Types: `Fix | Proof`

- [x] Proof 先行：分歧检测单测（checkpoint 摘要不一致 → Divergence 记录 + 停驻步号）
- [x] Replayer（交付机制：回放进**当前 live runtime**——隔离隐藏容器回放 runtime 归 Deferred）：`replaySession(session)` → 输入按序 dispatch（bridge 合成 signal+scope ctx）；每步比对 checkpoint（step=输入序号对齐，record 侧每 5 输入采集）；回放前 env coverage 校验（envFrames 逐一 resolve，miss → step 0 divergence，即 env-frame-miss Failure Path）；fake-clock 驱动（session.clock.events 非空时 install→tick→uninstall，仅回放会话）；副作用 stub（navigate/dialog/print 记录不执行）
- [x] 返回 `ReplayResult{steps, divergences: Divergence[], finalSnapshot}`
- [x] automation V2：`replaySession(session)` （进程内对象面）
- [x] 单测：envFrames 命中/miss、输入序、分歧定位（注入随机 delta 场景模拟）、副作用 stub 不执行

Exit Criteria:

- [x] 分歧检测判别用例绿（一致会话 0 分歧 vs 注入差异 ≥1 分歧并定位 step/path）
- [x] schema 校验后回放输入路径单测绿

### Phase 3 - 视频录制

Status: completed
Targets: `packages/nop-debugger/src/capture/video.ts`

- Item Types: `Fix | Proof`

- [x] `capture.record({fps})`：逐帧解码截图字节回绘录制 canvas（无保留 canvas 产物；重页面建议低 fps）+ `canvas.captureStream` + MediaRecorder（webm/vp9 优先）→ `stopRecordingVideo()` 返回 blob/base64 + 模式标注
- [x] 降级：MediaRecorder/captureStream 不可用 → 关键帧序列（复用增量截图 + 时间戳）
- [x] automation V2：`record({fps})` / `stopRecordingVideo()`
- [x] 单测（happy-dom 能力探测路径）：降级选择逻辑；浏览器真实录制由 e2e 覆盖

Exit Criteria:

- [x] 模式选择/降级单测绿；e2e 含视频会话录制→停止→产物非空且可解码（video 元素加载）

### Phase 4 - demo e2e + 文档 + 收口

Status: completed
Targets: debugger-lab、docs

- Item Types: `Proof`

- [x] e2e：lab 页录制 30 步交互（按钮/输入序列）→ stopRecording → 会话过 schema → 刷新页面 → replaySession → 最终 snapshot 与录制终点一致断言 + divergences 为空；注入随机 delta（schema 表达式含随机）场景 divergences 非空并定位
- [x] e2e：record({fps}) → stopRecordingVideo → blob 非空
- [x] quick-reference 回放节；roadmap M5 附注 + M3 Deferred（fake-clock）收口勘误；daily log

Exit Criteria:

- [x] e2e 全绿（含分歧检测负例）
- [x] docs 落盘且与 live 契约一致

## Draft Review Record

- Verdict: round 2 pass（0 Blocker / 0 Major；2 residual Minor 文字润色已随手修）。round 1：1 Major——afterAction 不含 ctx.event，输入捕获不可行，已扩 flux-action-core ActionOutcome + 白名单归一化入 scope/targets；6 Minor：pathHashes 现状措辞、视频帧源 caveat、回放 ActionContext 合成、logs 来源点名、requestId 映射、fake-clock 安装范围——全部落入文本）
- Rounds: 2
- Findings addressed: Major×1 + Minor×6 如上

## Closure Gates

- [x] DevSession 采集过 M0 schema 校验（判别用例）
- [x] 回放确定性：一致会话 0 分歧、注入随机 ≥1 分歧定位（判别测试绿）
- [x] 视频录制 + 降级路径落地
- [x] IndexedDB LRU 缓存落地（配额驱逐判别）
- [x] fake-clock 模块 + 回放驱动收口（M3 Deferred；录制侧接线 Deferred 见 Deferred 节）
- [x] e2e：30 步录制→重放一致 + 随机注入分歧 + 视频产物
- [x] 受影响 owner docs 已同步（quick-reference）
- [x] 独立子 agent closure audit 通过并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### fake-clock 录制侧接线（live 录制期间接管定时器）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: fake-clock 模块与回放驱动已落地（session.clock.events 非空时 install→tick→uninstall）；live 录制期间接管页面定时器会影响宿主应用运行（设计权衡），故 live 录制的会话 clock.events 合法为空、回放侧对录制的会话无 clock 驱动需求；fake-clock 录制接线（可选启用的"录制 + fake-clock"组合模式）归后续。
- Successor Required: `yes`
- Successor Path: 依赖图增强后续 plan（roadmap M5 附注声明）

### 半真模式（副作用白名单放行）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 设计 §8.2 标注可选；默认 stub 语义已覆盖回放确定性核心，白名单放行涉及真实副作用幂等性风险，独立演进。
- Successor Required: `no`
- Successor Path: 依赖图增强后续一并考虑

### 回放 UI 面板（停驻分歧的交互检查器）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: automation 返回 Divergence 列表已满足程序化消费（e2e/用户脚本）；交互式检查器归 Console v2（E4）。
- Successor Required: `yes`
- Successor Path: E4 Console v2

## Non-Blocking Follow-ups

- 视频转码/缩略图（M6 ffmpeg）
- fake-clock 与真实定时器的混合模式

## Closure

Status Note: M5 四 Phase 落地：fake-clock（M3 Deferred 收口模块 + 回放驱动；录制侧接线 Deferred）、DevSession 采集过 M0 schema 校验（checkpoint 对齐输入序号 + written-path 哈希 + runtime 前缀归一化）、确定性回放（分歧停驻 + env coverage 校验 + 副作用 stub）、视频 MediaRecorder/关键帧（frameCount 断言）、IndexedDB LRU。closure audit 3 轮：round 1 issues（1 Blocker + 6 Major——checkpoint 语义、CI 确定性、视频帧接线等）→ 修复 → round 2 issues（stableStringify 非循环安全、docs 漂移）→ 修复 → round 3 approved（0 Blocker / 0 Major）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-11-18，3 轮）
- Evidence: round 3 approved。实跑：M5 单测 12/12、nop-debugger 278/278、e2e 3/3（fresh server）、typecheck/lint/check/build 46/46。round 1→2 关键修复：checkpoint 采集对齐输入序号 + 写 settle 后 stability 门 + deterministic sync capture；stableStringify cycle-safe；视频帧源经 assertion-bridge onFrame 接线（frameCount e2e 断言）；env coverage 校验（env-frame-miss Failure Path）；fake-clock 录制接线 Deferred 裁决。

Follow-up:

- （见 Non-Blocking Follow-ups）
