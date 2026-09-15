# 467 Three.js 集成 I3.1 工业协议接入计划

> Plan Status: completed
> Last Reviewed: 2026-09-13
> Source: `docs/backlog/threejs-integration-roadmap.md`（I3.1）、`docs/components/threejs-integration/design-protocol.md`（v5）
> Related: 前置 plan 465/466（closed）；消费 `RendererEnv.openSocket` 契约（`renderer-api.ts:136-167`）

## Purpose

收口 I3.1：`RendererEnv.openSocket` 消费（capability check + 同步返回 + 属性赋值事件）、ReconnectionManager（指数退避 + 抖动）、IndustrialAdapter（订阅帧/数据帧/tag→scope 写入），交付为**契约级可用**（openSocket 消费 + 重连 + 数据帧→scope 写入，经 mock 链路证明）——renderer/host 组件接线与 schema surface（tags/dataSource 配置字段）无 roadmap work item，显式裁定归后继（见 Deferred）。

## Current Baseline

- 契约（live，plan 463/464 已核对）：`openSocket?: (url, options?, ctx?) => WebSocketConnection` 同步返回；`onopen/onmessage/onclose/onerror` 属性赋值；使用前必须 capability check（`renderer-api.ts:136-167,186-188`）；host 实现先例 `apps/playground/src/env/socket-impl.ts`（signal abort → close）。
- 设计契约（design-protocol.md v5）：消息模型 `{type:'subscribe', tags, polling}` / `{type:'data', payload:{address: value}}`；ReconnectionManager baseDelay 默认 500ms（±25% 抖动 →「断开检测→首试 <1s」指标）、maxRetries 默认 10、reset/cancel 语义；IndustrialAdapter `connect(cfg)`/`disconnect(id)`/`disconnectAll()`；tag 类型转换 bool→Boolean、int16→parseInt、float32→parseFloat、NaN 丢弃；scope 写入 `dataSources.<name>`。
- `flux-renderers-3d` 现状：无 data-source 模块；`scope` 不可直接获得（adapter 由组件层传入 ScopeRef——I2.1 组件已有 `useRenderScope`）。
- 测试基建：包内 vitest happy-dom + 覆盖率 ≥90 硬阈值；vi.useFakeTimers 可驱动退避序列。

## Goals

- `ReconnectionManager`：可注入 timer 的指数退避（baseDelay 500ms 默认、±25% 抖动、clamp maxDelay）、`cancel()` 幂等、**scheduleReconnect pending 幂等（已有 pending 时不重复调度——onerror+onclose 双触发只产生一次重连）**、`reset()` 归零、耗尽经 `onGiveUp` 诊断通道上报 `reconnect-give-up`（构造注入 onError/onGiveUp 与随机源、timer，均为显式接口面）。
- `IndustrialAdapter`：capability check 降级（`socket-unavailable` 一次性）、onopen → reset → 发送 subscribe、`onmessage` 数据帧解析 + tag 类型转换 + NaN 丢弃 → `scope.update('dataSources.<name>', value)`、onclose/onerror 退避重连、主动 disconnect 不触发重连、`disconnectAll()` 卸载清理。
- 失败路径表（design-protocol.md §5）五场景全部有 focused 测试（必须自动化档，Proof 先行）。

## Non-Goals

- Socket.IO 客户端/具体工业协议栈实现（协议语义由 URL 与消息 schema 承载）。
- Gemini/AI 生成（I4.1）。
- 真实网络集成测试（ws 服务器）——契约级 mock 覆盖。
- `dataSources` 之外的 scope 写入路径。

## Scope

### In Scope

- `packages/flux-renderers-3d/src/data-source/reconnection-manager.ts`、`industrial-adapter.ts` 及测试。
- `src/index.ts` 导出更新（ReconnectionManager/IndustrialAdapter 类型与实现）。

### Out Of Scope

- playground 演示接线（无 roadmap work item）。
- `flux-core`/`flux-react` 契约改动。

## Failure Paths

承 design-protocol.md §5（五场景），本计划逐行测试化：

| 可测场景编号          | 触发                     | 行为                                    | 可重试           | 用户可见表现    |
| --------------------- | ------------------------ | --------------------------------------- | ---------------- | --------------- |
| socket-unavailable    | `env.openSocket` 缺失    | `unavailable` 态 + 一次性上报，不重试   | 否               | onError（去重） |
| socket-connect-failed | onclose/onerror          | 指数退避重连 ≤ maxRetries，reset 后归零 | 是               | onError（去重） |
| reconnect-give-up     | 重连次数耗尽             | 停止重试 + 上报                         | 否（重挂载重来） | onError         |
| socket-message-parse  | 数据帧 JSON.parse 抛错   | 丢弃该帧 + 去重上报                     | 是（后续帧）     | onError 诊断    |
| tag-value-nan         | int16/float32 转换得 NaN | 丢弃该值，不写 scope，静默              | 是               | 无              |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`（重连退避序列与数据帧解析是工业可靠性核心回归路径）。ReconnectionManager 用 fake timers 断言退避时刻序列；IndustrialAdapter 用 mock `env.openSocket` + 手控 `WebSocketConnection` 事件。

## Execution Plan

### Phase 1 - ReconnectionManager（Proof 先行）

Status: completed
Targets: `src/data-source/reconnection-manager.ts`

- Item Types: `Proof | Fix`

- [x] 先写失败测试（红，fake timers）：退避时刻序列 baseDelay×2^n ±25% 抖动且 clamp maxDelay；onReconnect 触发；**重复 scheduleReconnect 只保留一个 pending timer**；maxRetries 耗尽后 give-up 诊断且不再调度；cancel 幂等（pending 不触发）；reset 归零后续调度从头计。
- [x] 实现 ReconnectionManager（构造注入 timer、随机源、onGiveUp 诊断通道——均显式接口面；onGiveUp 缺省转发 onError 诊断通道，timer/随机源缺省 setTimeout/Math.random；Phase 3 有意回写 design-protocol.md §3）。

Exit Criteria:

- [x] reconnection-manager 单测全绿（先红后绿；退避时刻逐点断言）。

### Phase 2 - IndustrialAdapter（Proof 先行）

Status: completed
Targets: `src/data-source/industrial-adapter.ts`

- Item Types: `Proof | Fix`

- [x] 先写失败测试（红，mock openSocket）：capability check 缺失 → `socket-unavailable` 一次且不重试（按 adapter 实例生命周期去重）；onerror 紧接 onclose 只产生一次重连调度（双触发幂等联合用例）；onopen → reset + 发送 subscribe 帧（含 tags address 与 polling）；数据帧 address→tag 映射 + 三类类型转换 + NaN 丢弃 + `scope.update('dataSources.<name>', v)`；JSON.parse 失败 → `socket-message-parse` 去重；onclose/onerror → 调度重连（pending 幂等去重）且主动 disconnect 不触发；connect 同 id 重入先 disconnect。
- [x] 实现 IndustrialAdapter（契约见 design-protocol.md §4；scope 写入经注入 ScopeRef）。

Exit Criteria:

- [x] industrial-adapter 单测全绿（先红后绿；Failure Paths 表五行逐行覆盖）。
- [x] 包级覆盖率四维 ≥90 维持。

### Phase 3 - 全量验证与收尾

Status: completed
Targets: 仓库级

- Item Types: `Proof`

- [x] 根 `pnpm typecheck`/`build`/`lint`/`test`/`check` 全绿（断言归 Closure Gates，此处为执行动作）。
- [x] design-protocol.md 有意回写：§3 ReconnectionManager 增 onGiveUp/随机源/timer 注入与 schedule pending 幂等契约、§4 增双触发幂等语义 + `socket-unavailable` 去重粒度（adapter 实例生命周期）；`docs/logs/` 记录。

Exit Criteria:

- [x] design-protocol.md 漂移回写完成（§3/§4 有意扩展在案）；`docs/logs/` 记录 I3.1 完成。
- [x] roadmap I3.1 状态随 plan 生命周期同步（draft review 通过 → `planned`；closure audit 通过 → `done`）。

## Draft Review Record

> 由独立子 agent（fresh session）填写。

- Reviewer / Agent: independent sub-agent（general-purpose fresh session）
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed: R1 fail（2 Major / 5 Minor）→ M1 采用方案 (a)：Purpose 收窄「契约级可用」+ In-Scope 增 index.ts 导出 + Deferred 增「renderer/host 组件接线与 schema surface」（moved to explicit successor ownership，roadmap Rule 5）；M2 Goals 增 scheduleReconnect pending 幂等 + onGiveUp/随机源/timer 显式接口面 + Phase 2 双触发联合红测 + unavailable 去重粒度（adapter 实例生命周期）+ Phase 3 有意回写 §3/§4；m1 Deferred 引用更正（setIn 单点写）；m2 Phase 3 Exit 只留漂移回写 + roadmap 同步；m3 roadmap 状态同步入 Exit；m4/m5 并入。R2 定向复核 pass-with-minors（0B/0M），残留 5 条措辞级 Minor 已由起草者顺手落盘（closure gate「契约级（mock 链路）」措辞、manager 级 pending 幂等红测、Classification 词表注、Phase 3 执行项注、onGiveUp 缺省转发措辞）。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope confirmed contract drifts 已收敛（§3/§4 有意扩展已回写分册）
- [x] 行为/契约结果已达成（openSocket 消费 + 重连 + 数据帧→scope 写入，**契约级可用（mock 链路）**）
- [x] 必要 focused verification 已完成（Phase 1–2 focused tests，先红后绿）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] 受影响的 owner docs 已同步（design-protocol.md 漂移回写；`docs/logs/`）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（两轮：R1 issues → 修复 commit faff10b7d → R2 approved，见 Closure Audit Evidence）
- [x] `pnpm typecheck` 40/40
- [x] `pnpm build` 40/40
- [x] `pnpm lint` 40/40
- [x] `pnpm test` 73/73 任务 12,329 passed / 0 failed（3d 包 158 测试）
- [x] `pnpm check` exit 0

## Deferred But Adjudicated

### 数据帧批量化（多 tag 合帧写 scope）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 契约为逐 tag 写 scope（design-protocol.md §4 表），合帧属优化；`scope.update` 为单点 `setIn` 写入（flux-runtime），非绑定热路径（绑定求值才在热路径上，其成本基线见调研文档 §10.3）。
- Successor Required: `no`
- Successor Path: 无（出现性能诉求时新立）

### renderer/host 组件接线与 schema surface（tags/dataSource 配置字段）

- Classification: `moved to explicit successor ownership`（依 Anti-Slacking Rule 终态词表；roadmap 结构调整，需人工评审后新立 work item）
- Why Not Blocking Closure: v5 设计契约（design-protocol.md §4）即 host 驱动形态——adapter 经构造/`connect()` 由调用方驱动，无 schema 字段；本计划交付契约级可用面（类 + mock 链路证明）。接线需要新的 schema surface（ThreeCanvasSchema 增数据源配置），属 roadmap 结构调整，AI 不得自行新增 work item（roadmap Rule 5）。
- Successor Required: `yes`
- Successor Path: 提请人工评审新增 roadmap work item（如「I3.2 数据源 schema surface 与组件接线」）；在此期间 host 可直接构造 IndustrialAdapter（包导出面）。

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 待关闭时填写

Closure Audit Evidence:

- Auditor / Agent: independent sub-agent（general-purpose fresh session），2 轮
- Evidence: R1 `issues`（1 Major：§3/§4 漂移回写仅落 1/3 而三处声明已完成——onGiveUp/random/pending 幂等/双触发缺失；1 Minor：socket-connect-failed 去重粒度三方不对齐）→ 修复 commit `faff10b7d`（§3 config 两字段 + scheduleReconnect pending 幂等契约 + §4 错误行双触发语义与 connect-failed 粒度声明，daily log 诚实更正）→ R2 `approved`。Evidence：live grep/sed 核对 §3:33-47、§4:75-84；data-source 14/14、3d 包 158/158 live 绿；覆盖率 95.34/91.34/92.7/97.59；roadmap I3.1 审计期间保持 `planned`（2026-09-13，`docs/logs/2026/09-13.md`）。

Status Note: I3.1 交付（ReconnectionManager 退避/幂等/耗尽诊断 + IndustrialAdapter 契约级可用：capability check/subscribe/数据帧→scope/重连抑制）经两轮独立审计关闭；组件接线与 schema surface 归后继（Deferred 显式裁定）。roadmap I3.1 → done。

Follow-up:

- 无
