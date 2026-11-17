# M0 DevTools 协议冻结（前端内核 ↔ Java 网关）

> Plan Status: completed
> Last Reviewed: 2026-11-18
> Source: docs/research/2026-11-17-flux-debugger-roadmap.md（M0 节）· docs/research/2026-11-17-flux-devtools-design.md §8.1、§10.2 · docs/research/2026-11-17-flux-devtools-capture-design.md §2、§8
> Related: M1–M7 全部消费本协议；M6（nop-entropy Java 网关）为本协议的服务端实现方

## Purpose

冻结 DevTools 前端内核 ↔ Java 网关的全部消息协议：JSON Schema 单一事实源 + 前端 TS 类型 + 编解码层 + 协议符合性用例（vitest mock 网关）。两端此后可独立开发，任何协议变更必须回到本 Schema（roadmap 全局验收第 4 条红线）。

## Current Baseline

- `packages/nop-debugger` 已存在（panel/controller/explanations/redaction/automation 等），但无 `protocol/` 模块，无任何 WebSocket RPC 封包定义。
- 仓库无 ajv 直接依赖（root 与 nop-debugger package.json 均无；lockfile 已有 ajv 传递依赖，新增 devDependency 不引入新包）。
- 设计文档（research/ 下三份）已给出协议形状（总体设计 §10.2 RPC 封包与拦截帧、§8.1 DevSession、采集设计 §2 ScreenshotResult、§8 VisualBaseline），但无机器可校验的 Schema。
- `docs/research/` 目录当前为 git 未跟踪状态（`?? docs/research/`）。
- Java 侧（nop-entropy）不在本仓库，无法在本仓库内执行 Java 模拟客户端符合性用例。

## Goals

- 发布独立 JSON Schema 文件（单一事实源）：RPC 封包、方法清单 v1、拦截帧、`ScreenshotResult`、`DevSession`、`VisualBaseline`。
- 前端 TS 类型 + 编解码（codec）与 Schema 一一对应，由符合性用例保证（样例消息逐一过 Schema 校验）。
- mock 网关（vitest 内）走通 attach→log.emit→intercept.frame→resolve→capture.upload→baseline.get/put→detach 全往返。

## Non-Goals

- 不实现真实 WebSocket 网关 / GatewayClient 网络层（M6/后续前端配套）。
- 不实现 Java DTO 生成与 Java 侧符合性用例（跨仓库，见 Deferred But Adjudicated）。
- 不做协议 v2 演进机制设计（当前仅冻结 v1）。

## Scope

### In Scope

- `packages/nop-debugger/protocol/*.schema.json`（发布物，draft-07）
- `packages/nop-debugger/src/protocol/`：TS 类型、codec（encode/decode/validate）、方法注册表
- 协议符合性 vitest 用例（含 mock 网关往返）
- nop-debugger `src/index.tsx` 导出协议公共面（类型 + codec）
- 二进制载荷线上表示的 Decision 裁决（`bytes: Uint8Array` → JSON 表示）
- 每日开发日志与 roadmap 就地状态标注（部分收敛口径）

### Out Of Scope

- nop-entropy Java 网关实现
- 真实 WSS endpoint / 鉴权 / 权限位
- DevSession 录制器 / Replayer 本体（M5）

## Failure Paths

| 场景                    | 触发                                              | 行为                                                                           | 可重试           | 用户可见表现                       |
| ----------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------- | ---------------------------------- |
| rpc-invalid-envelope    | 消息缺 `id`/`method` 或同时含 `result` 与 `error` | codec 校验失败，抛 `ProtocolError{code:'invalid-envelope'}`                    | 否（开发期错误） | 调试面板错误提示（后续里程碑接线） |
| rpc-method-unknown      | request method 不在方法注册表                     | codec 校验失败，`ProtocolError{code:'unknown-method'}`                         | 否               | 同上                               |
| intercept-frame-timeout | 超时未 resolve（语义层约定）                      | 网关自动 continue 并标 `degraded:true`（协议字段承载，前端本计划只定义不执行） | 是               | 面板 degraded 标记（后续里程碑）   |

## Test Strategy

档位选择：`必须自动化`（对外协议契约）

Proof 项先行：Schema 样例消息符合性用例先写（红），codec 落地后转绿。

## Execution Plan

### Phase 1 - JSON Schema 发布物

Status: completed
Targets: `packages/nop-debugger/protocol/`

- Item Types: `Decision | Proof`

- [x] rpc-envelope.schema.json：request `{id, method, params?}` / response `{id, result?|error?}`（互斥）/ event `{event, payload}`
- [x] Decision：二进制载荷线上表示——`ScreenshotResult.bytes`（及 `capture.upload` 的 `bytes`）以 base64 string 编码，结构附 `encoding: 'base64'` 字段；裁决记入协议 README
- [x] methods.schema.json：v1 方法注册表（session.attach/detach/heartbeat、log.emit、intercept.register/resolve、capture.upload、baseline.get/put），每个方法的 params/result schema
- [x] intercept-frame.schema.json：`intercept.frame` 事件 payload + `intercept.resolve` params（continue|modify|shortCircuit）+ timeoutMs/degraded 语义字段
- [x] screenshot-result.schema.json、dev-session.schema.json、visual-baseline.schema.json（采集设计 §2/§8、总体 §8.1）
- [x] 协议 README（`packages/nop-debugger/protocol/README.md`）：演进规则（协议红线：变更必须回本 Schema 并同步两端符合性用例）

Exit Criteria:

- [x] 5+ 个 schema 文件存在于 `packages/nop-debugger/protocol/`，draft-07，`"$id"` 唯一
- [x] schema 内容与三份设计文档章节逐项对齐（封包互斥、拦截帧三 action、DevSession 的 meta/clock/inputs/envFrames/checkpoints/logs 六段 + version 字段）；设计文档中的 TS 原生类型（如 `Uint8Array`）按本计划 Decision 项的 JSON 表示映射，README 记录映射表

### Phase 2 - 前端类型 + codec + 符合性用例

Status: completed
Targets: `packages/nop-debugger/src/protocol/`

- Item Types: `Decision | Proof`

- [x] 先写符合性用例（Proof 先行）：样例消息集（合法/非法各若干）逐一过 Schema 校验，codec 编解码往返断言——先红
- [x] TS 类型（`types.ts`）：与 Schema 一一对应
- [x] codec（`codec.ts`）：`encode/decode + validate`，错误抛 `ProtocolError`；方法注册表 `methods.ts`
- [x] mock 网关（vitest 内 fake pair）全往返用例：attach→heartbeat→log.emit→intercept.frame→resolve→capture.upload→baseline.get/put→detach
- [x] `src/index.tsx` 导出协议公共面
- [x] Decision：校验器采用 ajv devDependency（lockfile 已有传递版本，不引入新包；避免自实现 validator 成为第二协议事实源）

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/nop-debugger test` 协议用例全绿（含非法样例被拒）
- [x] TS 类型与 Schema 字段逐一对齐（用例中用 schema required/properties 抽查断言）

### Phase 3 - 收口

Status: completed
Targets: docs

- Item Types: `Proof`

- [x] daily log 记录
- [x] roadmap M0 行就地标注状态（落地勘误式附注，不改写原文；口径为"M0 前端半收敛，Java 侧符合性用例归 M6"——不做整行 done）

Exit Criteria:

- [x] `docs/logs/2026/11-18.md` 含 M0 收口记录
- [x] roadmap M0 节附落地状态标注

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session）
- Verdict: pass（round 1 fail→修订→round 2 pass，0 Blocker / 0 Major）
- Rounds: 2
- Findings addressed: Major×2（closure gate 降级无记账→恢复全量 pnpm test；bytes JSON 表示未裁决→Phase 1 Decision：base64 + encoding 字段 + README 映射表）、Minor×5（格式、DevSession 计数口径、ajv 声称、Item Types、roadmap 部分收敛标注）

## Closure Gates

- [x] 所有 in-scope 协议结构已发布且符合性用例全绿
- [x] 无 in-scope live defect / contract drift
- [x] codec 与 Schema 一致性有判别性测试（非法消息旧"无校验实现"必挂、新实现拒收）
- [x] 独立子 agent closure audit 通过并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Java 模拟客户端协议符合性用例（M0 验收后半句）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: nop-entropy 仓库不在本工作区，Java 侧用例无法在本仓库落地；本计划产出 Schema + 共享样例 fixtures（`protocol/fixtures/`），Java 侧可直接消费；该验收项归 M6 网关实现时一并执行（roadmap M6 明确为 nop-entropy 平台工程）。
- Successor Required: `yes`
- Successor Path: M6（nop-entropy DevTools Gateway plan，跨仓库人工门禁）

## Non-Blocking Follow-ups

- 协议版本协商字段（`session.attach` capability 协商）留 M6 联调时按需扩展（需回 Schema，红线不变）

## Closure

Status Note: M0 前端侧全部落地（6 份 Schema + fixtures + TS 类型/codec + 28 符合性用例全绿）；Java 侧符合性用例经裁决归 M6（Deferred 节），roadmap M0 行以"前端半收敛"勘误附注标注，不与 Deferred 矛盾。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-11-18）
- Evidence: verdict approved（0 Blocker / 0 Major / 0 Minor-defect）；逐项核对 6 份 Schema draft-07 + 唯一 $id、封包互斥、拦截帧三 action、DevSession 六段+version、方法清单 9 个、base64 Decision 映射表、fixtures 10 组 valid/invalid；实跑 protocol-conformance 28/28 与 nop-debugger 27 files/200 tests 全绿；Deferred 分类诚实、roadmap 附注一致。

Follow-up:

- （见 Non-Blocking Follow-ups）
