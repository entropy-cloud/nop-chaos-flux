# 470 Three.js I3.2 数据源 Schema Surface 与 three-canvas 组件接线计划

> Plan Status: active
> Last Reviewed: 2026-09-16
> Source: `docs/backlog/threejs-integration-roadmap.md`（I3.2，2026-09-16 人工指令新增——兑现 plan 467 Deferred「renderer/host 组件接线与 schema surface」successor 义务）、`docs/components/threejs-integration/design-protocol.md` §2/§4（v5）
> Related: 前置 plan 463–469（closed）；消费 plan 467 交付的 IndustrialAdapter/ReconnectionManager 与 plan 468 交付的 schema 资产

## Purpose

收口 I3.2：three-canvas 获得声明式数据源能力——`ThreeCanvasSchema` 增 `dataSources` 配置字段（schema surface），渲染器组件经 `useDataSources` hook 将其接线到 IndustrialAdapter（`env.openSocket` → subscribe → 数据帧 → `scope.update('dataSources.<name>')`），使 schema 作者无需直接构造 adapter 即可声明工业数据源；AI schema 资产（threejs-schema.json + SchemaValidator）同步覆盖新字段，设计分册回写接线契约。完成后 threejs-integration roadmap 全部 work item（含全部已裁定后继义务）收口。

## Current Baseline

- **plan 467 交付（契约级可用）**：`IndustrialAdapter`（`src/data-source/industrial-adapter.ts:42`）——构造入参 `{ env, scope, onError? }`；`connect(cfg: IndustrialTagConfig)` 同 id 重入先 disconnect 再建连；capability check（`!env.openSocket` → `unavailable` + `socket-unavailable` 一次性上报，adapter 实例生命周期去重）；`onopen` → `reconnection.reset()` → 发送 `{type:'subscribe', tags: addresses, polling}` 帧；数据帧 address→tag 映射 + 类型转换（bool/int16/float32，NaN 丢弃）→ `scope.update('dataSources.<tag.name>', value)`（industrial-adapter.ts:114）；`onclose`/`onerror` → 退避重连（pending 幂等）；`disconnectAll()` 卸载语义。包导出面已含 `IndustrialAdapter`/`IndustrialTagConfig`/`IndustrialTag`（src/index.ts:6,11）。
- **schema surface 现状**：`ThreeCanvasSchema`（src/schemas.ts:21-35）字段为 type/scene/bindings/animations/events/loading/empty，无数据源配置；`renderer-definitions.ts` propContracts 已注册 scene/bindings/animations/events 四个顶层字段，fields 注册 kind 'prop'（renderer-definitions.ts:52-59）。
- **组件现状**：`ThreeCanvasRenderer`（src/renderer/three-canvas.tsx）已注入 `env`（useRendererEnv）与 `scope`（useRenderScope）；events.onError 桥接先例 `createNormalizedActionEvent({ type: 'scene:error', code, message })` + `props.helpers.dispatch`（three-canvas.tsx:47-58）；scene 状态机（empty/loading/ready/error）独立存在，error 为挂载周期终态（three-canvas.tsx:86-87）。
- **AI 资产现状（plan 468）**：`threejs-schema.json` properties 含 type/scene/bindings/animations/events/loading/empty（无 dataSources，draft-07 默认不拒未知字段）；`SchemaValidator.validate()` 为手写结构 + 语义双层校验，顶层仅检查 type/scene/models/bindings（schema-validator.ts:24-124）；plan 468 确立的常驻契约「schema 资产覆盖当前形状 + getSchema 与 TS 抽查一致」——TS 类型增字段后资产与 validator 必须同步扩展，否则即时 drift。
- **测试基建**：`test-support/renderer-test-support.tsx` 提供完整 env/scope/runtime harness（`createThreeTestEnvironment` 返回 `env: createDefaultEnv()` 可变对象，测试可注入 mock `openSocket`）；`three-canvas.test.tsx` 以 mock 引擎 + 手工构建 props 直测组件（buildProps 模式）；`industrial-adapter.test.ts` 以 `{ updates: [] }` 记录数组 mock scope.update 断言写入。
- **roadmap 现状**：I0–I4 全部 `done`（plans 463–469 completed）；plan 467 Deferred「renderer/host 组件接线与 schema surface（tags/dataSource 配置字段）」Successor Required: `yes`，Successor Path「提请人工评审新增 roadmap work item（如 I3.2）」——2026-09-16 人工指令「执行 threejs-integration-roadmap.md 直到结束」即为该人工评审输入，roadmap I3.2 行已置 `planned`。

## Goals

- `ThreeCanvasSchema.dataSources?: (IndustrialTagConfig & SchemaObject)[]`——声明式工业数据源配置（id/url/tags[{name,address,type}]/polling），条目与 `IndustrialAdapter.connect(cfg)` 入参一一对应；静态配置面（url/tags 不走 `${}` 表达式求值）。
- `renderer-definitions.ts`：`dataSources` propContract（shape kind 'unknown'，同 scene/animations 先例）+ fields 注册（kind 'prop'）。
- `useDataSources` hook（`src/renderer/hooks/use-data-sources.ts`）：mount/配置变更时逐 cfg `adapter.connect(cfg)`；unmount `disconnectAll()`；adapter 实例随 mount 创建一次（latest-ref 模式接线 onError，同 use-binding-bridge.ts:50-53 先例）；adapter onError → `events.onError` dispatch（`createNormalizedActionEvent({ type: 'datasource:error', code, message })`），**不翻转 scene 状态机**（数据通道独立于场景渲染，design-protocol.md §5 用户可见面 = onError 诊断）。
- AI 资产同步：`threejs-schema.json` 增 `dataSources` property + `IndustrialTagConfig` definition；`SchemaValidator` 增 dataSources 结构校验（数组、条目 id/url/tags 必填、tag.name/address 必填、tag.type 枚举 bool/int16/float32、polling 可选数值）。
- 全部 Proof 先行（先红后绿），3d 包覆盖率四维 ≥90 维持。

## Non-Goals

- 真实 socket/网关 demo 与浏览器 e2e（沿袭 plan 469 Non-Goals：openSocket 契约演示属潜在后续工作）；本计划证明标准为**组件级 mock 链路**（mock env.openSocket + 真 IndustrialAdapter + 真组件渲染），强于 plan 467 的类级 mock 链路。
- 数据帧批量化、spring 物理参数化、per-primitive 事件、Gemini 适配（均已在 465–468 裁定为 out-of-scope improvement，无 successor 义务）。
- dataSources 字段表达式化（url/tags 动态求值）：设计契约为静态配置，出现真实诉求时另立。
- 渲染管线/引擎/绑定桥行为改动（useBindingBridge 经 scope 汇合消费 dataSources 写入，无需感知数据来源——design-protocol.md §4 scope 写入路径）。
- playground 演示页改动（three-canvas-demo 不接真实 socket，不演示数据源）。

## Scope

### In Scope

- `packages/flux-renderers-3d/src/schemas.ts`（ThreeCanvasSchema.dataSources 类型）。
- `src/renderer-definitions.ts`（propContract + fields 注册）。
- `src/renderer/hooks/use-data-sources.ts`（新建）及 `src/renderer/hooks/use-data-sources.test.tsx`（新建，hook 测试先例为 .tsx 后缀：use-binding-bridge.test.tsx）。
- `src/renderer/three-canvas.tsx`（hook 接线 + props.props.dataSources 读取）。
- `src/renderer-definitions.test.ts`（dataSources 注册断言扩展）。
- `src/ai/threejs-schema.json`、`src/ai/schema-validator.ts` 及 `schema-validator.test.ts` 扩展。
- 设计分册漂移回写：`design-renderer.md` §1（schema 形状）、`design-protocol.md`（schema surface 与接线契约）。
- `docs/backlog/threejs-integration-roadmap.md`（I3.2 状态随 plan 生命周期同步）。
- `docs/logs/2026/09-16.md` 记录。

### Out Of Scope

- 其他 renderer 包、flux-react/flux-core/runtime、playground、engine/binding/data-source 模块行为改动（data-source 仅消费不改）。

## Failure Paths

| 可测场景编号           | 触发                                  | 行为                                                                                | 可重试           | 用户可见表现                                                       |
| ---------------------- | ------------------------------------- | ----------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------ |
| socket-unavailable     | 宿主 env 未实现 openSocket            | adapter `unavailable` + 一次性上报（adapter 实例生命周期去重）→ onError dispatch    | 否               | `datasource:error` 诊断（若声明 events.onError）；场景渲染不受影响 |
| connect-failed/give-up | 连接被拒/网络断/重连耗尽              | 既有 adapter 行为（退避重连 ≤ maxRetries；耗尽 `reconnect-give-up`）经 onError 透传 | 是（adapter 内） | `datasource:error` 诊断                                            |
| datasources-invalid    | schema dataSources 非数组/条目缺字段  | AI 门禁：SchemaValidator 结构错误聚合返回；渲染器防御式忽略非数组（不崩）           | 否               | validator errors；渲染静默降级                                     |
| config-identity-change | 重渲染 dataSources 数组 identity 变更 | 旧连接全断（disconnectAll）→ 逐 cfg 重连（同 id 重入语义兜底）                      | 是               | 短暂断连后恢复                                                     |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`（本计划交付 public schema surface + 组件接线契约 + AI 门禁扩展；数据源接线是 I3 契约的消费面，错误语义必须程序化证明）。全部 Proof 先行。

## Execution Plan

### Phase 1 - Schema surface 与 AI 资产同步（Proof 先行）

Status: planned
Targets: `src/schemas.ts`、`src/renderer-definitions.ts`、`src/renderer-definitions.test.ts`、`src/ai/threejs-schema.json`、`src/ai/schema-validator.ts`、`src/ai/schema-validator.test.ts`

- Item Types: `Proof | Fix`

- [ ] 先写失败测试（红，schema-validator.test.ts 表驱动扩展）：含合法 dataSources 的配置通过；dataSources 非数组 → 结构错误；条目缺 url → `dataSources[<i>].url` 聚合 path；条目缺 tags/tags 非数组 → 结构错误；tag.type 非法（非 bool/int16/float32）→ 结构错误；tag 缺 name/address → 结构错误；polling 非数值 → 结构错误；不含 dataSources 的既有合法配置仍通过（向后兼容）。
- [ ] `schemas.ts`：`ThreeCanvasSchema` 增 `dataSources?: (IndustrialTagConfig & SchemaObject)[]`（type-only import 自 `./data-source/industrial-adapter.js`，无运行时环），JSDoc 声明静态配置面与 adapter connect 一一对应。
- [ ] `renderer-definitions.ts`：propContracts 增 `dataSources`（shape kind 'unknown'，description 指向 design-protocol.md §4）+ fields 增 `{ key: 'dataSources', kind: 'prop' }`。
- [ ] `threejs-schema.json`：properties 增 `dataSources`（array of `$ref: #/definitions/IndustrialTagConfig`）+ definitions 增 IndustrialTagConfig（id/url/tags required；tag type enum bool/int16/float32；polling number）。
- [ ] `schema-validator.ts`：validate() 增 dataSources 结构校验（错误一次聚合、JSON Pointer path `dataSources[<i>]...`），未知顶层字段仍不拒绝（draft-07 口径不变）。
- [ ] Proof：`renderer-definitions.test.ts` 增 dataSources 注册断言（fields 含 key 且 kind 'prop'、propContract 存在）；**既有严格 keys 断言（renderer-definitions.test.ts:41 `Object.keys(contracts).sort()` 全等断言）同步扩展纳入 dataSources**——该测试必然需要编辑，非仅保持绿。
- [ ] Proof：schema-validator 既有不变式维持绿——generateSchema 输出过自身 validator；getSchema 与 TS 抽查守卫补 dataSources 一处（getSchema().properties.dataSources 存在且指向 IndustrialTagConfig definition）。

Exit Criteria:

- [ ] schema-validator 扩展单测全绿（先红后绿；表驱动含全部结构错误路径）。
- [ ] renderer-definitions 注册断言绿；3d 包既有测试无回归（focused：schemas/validator/definitions 相关文件）。

### Phase 2 - useDataSources 组件接线（Proof 先行）

Status: planned
Targets: `src/renderer/hooks/use-data-sources.ts`（新建）、`src/renderer/hooks/use-data-sources.test.tsx`（新建）、`src/renderer/three-canvas.tsx`

- Item Types: `Proof | Fix`

- [ ] 先写失败测试（红，renderer test harness：`createThreeTestEnvironment` + 手工 props 注入 `dataSources` + mock `env.openSocket`，mock 引擎沿 three-canvas.test.tsx 先例）：声明 dataSources + env.openSocket 存在 → socket 以 cfg.url 建立；onopen 后 subscribe 帧发出（tags 为 address 数组、polling 透传）；数据帧 `{type:'data',payload:{address:value}}` → `scope.update('dataSources.<tag.name>', 转换后值)`（bool/float32 各一）；unmount → 每连接 close 被调（disconnectAll）；env.openSocket 缺失 → helpers.dispatch 收到 `datasource:error`（code 'socket-unavailable'）且 scene 状态埋点不翻转 error；未声明 dataSources → openSocket 从未被调；dataSources identity 变更 → 旧连接 close + 新连接建立；connect-failed 透传（mock socket onclose 触发 → helpers.dispatch 收到 `datasource:error` code 'socket-connect-failed'）；dataSources 非数组（防御式）→ openSocket 从未被调、不崩。
- [ ] 实现 `useDataSources` hook：adapter 实例 mount 级一次（useRef）；onError 经 latest-ref 接线（捕获最新 events/helpers）；effect 以 dataSources identity 为依赖逐 cfg connect，cleanup disconnectAll；非数组输入防御式忽略。
- [ ] `three-canvas.tsx` 接线：读取 `props.props.dataSources`，调用 hook（传 env/scope/events/helpers.dispatch）。
- [ ] Proof：`datasource:error` dispatch payload 断言（type/code/message 三字段，createNormalizedActionEvent 桥接先例一致）。

Exit Criteria:

- [ ] use-data-sources 单测全绿（先红后绿；覆盖 Failure Paths 全部四行）。
- [ ] three-canvas 既有组件测试无回归（mock 引擎先例文件全绿）。

### Phase 3 - 设计分册回写、roadmap 同步与收尾

Status: planned
Targets: `docs/components/threejs-integration/design-renderer.md`、`docs/components/threejs-integration/design-protocol.md`、`docs/backlog/threejs-integration-roadmap.md`、`docs/logs/2026/09-16.md`

- Item Types: `Fix | Decision | Proof`

- [ ] Fix：`design-renderer.md` §1 ThreeCanvasSchema 形状补 `dataSources` 字段（静态配置面、IndustrialTagConfig 引用）。
- [ ] Fix：`design-protocol.md` §4 补 schema surface 与接线契约小节——`dataSources` 字段语义、useDataSources 接线所有权（mount 级 adapter、identity 变更重连、unmount disconnectAll）、`datasource:error` 事件通道（不翻转 scene 状态机的裁定理由：数据通道独立于场景渲染，§5 用户可见面 = onError 诊断）。
- [ ] Proof：`docs/logs/2026/09-16.md` 记录（交付面、focused 测试计数、全量验证结果）。
- [ ] Decision：roadmap I3.2 状态随 plan 生命周期同步（closure audit 通过后 `planned` → `done`，本 plan 执行期保持 `planned`）。

Exit Criteria:

- [ ] 两分册回写与 live 实况一致（抽查：字段形状、接线语义、事件通道三处可对照代码验证）；`docs/logs/` 记录在案。

## Draft Review Record

> 由独立子 agent（fresh session）填写。

- Reviewer / Agent: independent sub-agent（general-purpose fresh session）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 0 Blocker / 0 Major；5 Minor 已随转 active 落盘——M-1 Phase 1 明确 renderer-definitions.test.ts:41 严格 keys 断言须同步编辑纳入 dataSources；M-2 Phase 2 红测清单补 connect-failed 透传与非数组防御式两用例（对齐 Exit Criteria「Failure Paths 全部四行」）；M-3 测试文件名统一 `.tsx`（hook 测试先例）；M-4 getSchema 抽查守卫改为确定性承诺（补 dataSources 一处）；M-5 程序项（本次 Draft Review Record 填写即闭合）。四维核对全部通过（可想象性：prop 管线 classifyField→propsProgram→props.props 逐环验证、createDefaultEnv 可变对象 mock openSocket 可行、type-only import 无环；格式/稳健性/引用准确性逐条 live 核对）。

## Closure Gates

- [ ] 所有 in-scope confirmed live defects 已修复
- [ ] 所有 in-scope confirmed contract drifts 已收敛（AI 资产 + 两设计分册与 live 一致）
- [ ] 行为/契约结果已达成（schema 作者可经 `dataSources` 字段声明式接线工业数据源：connect/subscribe/数据帧→scope/重连/卸载全链路经组件级 mock 链路证明）
- [ ] 必要 focused verification 已完成（Phase 1–2 focused tests，先红后绿）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [ ] 受影响的 owner docs 已同步（design-renderer.md §1、design-protocol.md §4、roadmap、`docs/logs/`）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`（exit 0，零新增超注册红线）

## Deferred But Adjudicated

无（本计划即一条已裁定义务的兑现；如执行中发现新的优化空间，按模板新增条目并裁定）。

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 待关闭时填写

Closure Audit Evidence:

- Auditor / Agent: 待独立审计（fresh session）
- Evidence: 待审计后填写

Follow-up:

- 待关闭时填写（或明确写 no remaining plan-owned work）
