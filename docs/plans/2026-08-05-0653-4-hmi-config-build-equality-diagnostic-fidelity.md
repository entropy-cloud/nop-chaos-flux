# 04 HMI Config-build, Equality & Diagnostic-channel Fidelity

> Plan Status: completed
> Last Reviewed: 2026-08-05
> Source: `docs/components/roadmap-industrial-hmi.md` → Follow-up Backlog → 2026-08-05-0653 post-remediation audit P2（open-audit `[P2-3]`/`[P2-6]`，multi-audit `[P2-4]`/`[P2-6]`）；源审计 `docs/audits/2026-08-05-0653-{open,multi}-audit-industrial-hmi.md`
> Mission: industrial-hmi
> Work Item: post-remediation P2 收口（config-build / 序列化相等 / 诊断通道分支）
> Related: `2026-08-05-0653-3-hmi-binding-state-resolution-correctness.md`（同批 plan，binding/state 分支，先执行）

## Purpose

收口 `2026-08-05-0653` 审计在 config-build / 序列化相等 / 诊断通道上的 4 项 P2 silent-defect：这些缺陷的共同特征是**静默丢失信息**——带 `children` 的叶子图元被静默降级为 Group（fill/stroke/width/height 丢）、序列化相等用 key-order-sensitive `JSON.stringify`（重新引入已修掉的 W5 隐患）、诊断通道把原始 error 降为 message string 再包成无 `{cause}` 的 fresh Error（host 监控无法定位 formula 源）、`extractExpressionDepsViaProbe` 把所有失败塌缩为 `[]` 使语法坏表达式同时触发 `flux-deps-empty` 误报 + `flux-compile-failed` 真报。本 plan 把这四项收敛到「config-build / equality / reporting 不再静默丢信息」单一结果面。

## Current Baseline

经 live repo 核对（2026-08-05），四项缺陷均在当前 `packages/flux-renderers-industrial/` 源码中复现：

- **C1（buildNode 静默 Group 降级，open `[P2-3]`）**：`src/engine/config-adapter.ts:84` `const isContainer = node.type === GROUP_CONTAINER_TYPE || (node.children?.length ?? 0) > 0;`——任何带 `children` 的节点被静默降级为 Group，**即便 `type` 是叶子 shape**（如 `scada-rect`/`scada-pipe` 误带 `children`）。leaf 的 `fill`/`stroke`/`width`/`height` 经 Group 构造分支（`:86-102`）被丢，validator 也不拒绝（`children` 字段未约束到 `type==='scada-group'`）。
- **C2（compound deepEquals 用 JSON.stringify，open `[P2-6]`）**：`src/symbols/compound.ts:79-83` `deepEquals` 用 `JSON.stringify(a) === JSON.stringify(b)`（key-order-sensitive），重新引入 plan `2026-08-04-2243-2` W5 为 `diff.valuesEqual` 修掉的同类隐患。第三方 `registerScadaSymbol` 带 object-typed defaults 时，`diffInstanceProps`（`:73`）按 key 序判等产冗余 override（序列化输出非最小覆盖集）。`diff.ts valuesEqual` 已是 own-keys 递归 stable deep-equal（W5 修复），两处应共享同一实现。
- **C3（诊断通道丢失 error stack/cause，multi `[P2-4]`）**：`src/renderer/hooks/use-scada-points-bridge.ts:218` `onError?: (code: string, message: string) => void` 签名只收 message；`:270-274` `reportOnce` 把 `error: unknown` 降为 `errorMessage(error)`（string）。`src/renderer/scada-canvas.tsx:130-134` `reportDiagnostic` 再包成 `new Error(message)`（无 `{cause}`）送 `env.monitor.onError`。host 监控收到的是无 stack/cause 的 fresh Error，无法定位 formula evaluator 源。
- **C4（flux-deps-empty 对语法坏表达式双报，multi `[P2-6]`）**：`use-scada-points-bridge.ts:62-86` `extractExpressionDepsViaProbe` 把 compile/createState/evaluate 三类失败**全部塌缩**为 `return []`。`analyzeFluxSubscriptions`（`:137-147`）见 `deps.length===0` 且 `expressionReadsScope` 真就把表达式推入 `depsEmptyExpressions`（→ 一次性 `flux-deps-empty` 上报）；同时 bridge effect（`:314-320`）真编译该表达式失败上报 `flux-compile-failed`。语法坏表达式产 `flux-deps-empty` 误报 + `flux-compile-failed` 真报双报。

包级基线：628 tests / 46 files 全绿、workspace 全量（typecheck/build/lint 32/32 + test 59/59）全绿（plan `2026-08-05-0653-2` 收口后状态）。

## Goals

- C1：`ConfigAdapter.buildNode` 不再静默把带 `children` 的叶子图元降级为 Group——要么收紧 validator（`children` 仅 `type==='scada-group'`），要么 `buildNode` 按 `type` 分支（叶子带 children 时按 leaf 构建并忽略/告警 children）。leaf 的 fill/stroke/width/height 不丢。
- C2：`compound.deepEquals` 与 `diff.valuesEqual` 共享同一 key-order-insensitive deep-equal 实现（提取共享 `serialization/equality.ts`），消除 compound 路径的 W5 同类隐患。
- C3：诊断通道透传原始 error——`onError(code, message, error)` 三参签名，`reportDiagnostic` 用 `new Error(message, { cause: error })`（或直传 error）送 monitor，host 监控可定位 formula 源。
- C4：`extractExpressionDepsViaProbe` 返 discriminated result（`ok`/`compile-failed`/`deps-empty`），`analyzeFluxSubscriptions` 仅 `deps-empty` 才入 `depsEmptyExpressions`；语法坏表达式只报 `flux-compile-failed`，不误报 `flux-deps-empty`。

## Non-Goals

- 不重构整个诊断通道架构（`reportDiagnostic`/`env.monitor.onError` 出口不变，仅透传 cause）。
- 不改 `SCADA_ERROR_CODES` 注册表本身（C3/C4 不新增错误码，C4 是消除误报而非新增码）。
- 不处理 sibling plan `2026-08-05-0653-3` 的 binding/state 五项（B1–B5）。
- 不处理 Multi P2-1（serializeScadaConfig §11 枚举 doc）、P2-2（test 样板重构）、P2-3（scada-canvas.types.ts 死模块）、P2-5（applyInitialViewport fill 钳制）、Open P2-1（TreeRegistry 性能）、P2-2（point-values 全 record 重建）——本批明确 out-of-scope，留 backlog。

## Scope

### In Scope

- `src/engine/config-adapter.ts` + `src/serialization/validate.ts`：buildNode Group 降级修复 + validator `children` 约束（C1）。
- `src/symbols/compound.ts` + `src/serialization/diff.ts` + 新建 `src/serialization/equality.ts`：共享 deep-equal 提取（C2）。
- `src/renderer/hooks/use-scada-points-bridge.ts` + `src/renderer/scada-canvas.tsx`：onError 签名 + cause 透传（C3）。
- `src/renderer/hooks/use-scada-points-bridge.ts`：`extractExpressionDepsViaProbe` discriminated result + `analyzeFluxSubscriptions` 消双报（C4）。
- 必要的 owner-doc 同步：`docs/components/industrial-hmi/design-renderer.md`（诊断通道 cause 语义 + Group 降级契约）、`design-data-binding.md`（probe result 语义）。
- focused failing-first 单测 + 回归 proof（每项 Fix 前先落 Proof）。

### Out Of Scope

- sibling plan `2026-08-05-0653-3` 的全部 in-scope 项（B1–B5）。
- Multi P2-1/P2-2/P2-3/P2-5、Open P2-1/P2-2（doc/test-hygiene/perf，留 backlog）。

## Failure Paths

| 场景编号                  | 触发                                             | 行为                                                                    | 可重试 | 用户可见表现                                           |
| ------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- | ------ | ------------------------------------------------------ |
| leaf-with-children        | `scada-rect`（叶子 type）误带 `children`         | validator 拒绝（错误码指向 children 仅 group）或 buildNode 按 leaf 构建 | 否     | leaf 的 fill/stroke/width/height 不丢；author 可见拒绝 |
| key-order-equality        | 第三方 symbol defaults object-typed + key 序不同 | deepEquals 判等不受 key 序影响（不产冗余 override）                     | 否     | 序列化输出最小覆盖集                                   |
| cause-lost                | flux 表达式编译/求值 throw                       | monitor 收到 `{cause: originalError}`，stack 可定位 formula 源          | 否     | host 监控能定位错误源                                  |
| deps-empty-false-positive | 语法坏复杂表达式（`${a +}`）                     | 仅报 `flux-compile-failed`，不误报 `flux-deps-empty`                    | 否     | author 不被双报误导                                    |

## Test Strategy

档位选择：**必须自动化**

理由：4 项均为「静默丢失信息」的 silent defect（数据丢失 / 错误归因丢失 / 误报），且分布在纯逻辑层（config-adapter/compound/diff/bridge），可单测充分覆盖。C1（数据丢失）与 C4（误报）尤其需要 failing-first proof 证明缺陷真实可复现。每项 Fix 前先落 Proof（红→绿）。

## Execution Plan

### Phase 1 - Config-build correctness（C1）

Status: completed
Targets: `src/engine/config-adapter.ts`、`src/serialization/validate.ts`、`docs/components/industrial-hmi/design-renderer.md`

- Item Types: `Decision`、`Proof`、`Fix`

- [x] **Decision-C1**（裁定）：带 `children` 的叶子 type 处理——「validator 拒绝（`children` 仅 `type==='scada-group'`）」vs「buildNode 按 type 分支（叶子带 children 时按 leaf 构建 + 告警/忽略 children）」。默认采 (a) validator 拒绝（fail-fast，author 可见，与 §4 config schema 一致）；裁定写入 `design-renderer.md`。
- [x] **Proof-C1**（failing-first）：`config-adapter.test.ts` 或 `validate.test.ts`——`scada-rect` 带 `children` + `fill`/`stroke`/`width`/`height`：或 validator 拒绝（错误码可观测），或 buildNode 按 leaf 构建保留 fill/stroke/width/height（断言 leaf 节点 attrs 完整）。当前实现丢失 leaf attrs。
- [x] **Fix-C1**：按 Decision-C1 落地——`validate.ts` 增 `children` 仅 `scada-group` 约束（含错误消息），或 `config-adapter.ts:84` `isContainer` 改为 `node.type === GROUP_CONTAINER_TYPE`（叶子带 children 不再进 Group 分支）。`design-renderer.md` 同步 Group 降级契约。

Exit Criteria:

- [x] failing-first 用例由红转绿，leaf 的 fill/stroke/width/height 不丢（按裁定可观测：拒绝或保留）。
- [x] `design-renderer.md` 同步 children 约束/Group 降级契约。
- [x] 局部 typecheck 通过（engine + serialization 模块）。

### Phase 2 - Serialization equality 共享（C2）

Status: completed
Targets: 新建 `src/serialization/equality.ts`、`src/serialization/diff.ts`、`src/symbols/compound.ts`

- Item Types: `Proof`、`Fix`

- [x] **Proof-C2**（failing-first）：`compound.test.ts`——`diffInstanceProps` 对第三方 symbol defaults（object-typed，key 序与 instance 不同）判等稳定，不产冗余 override。当前 `deepEquals`（`JSON.stringify`）key 序敏感会产冗余。
- [x] **Fix-C2**：新建 `src/serialization/equality.ts` 导出 `deepEqual(a, b)`（own-keys 递归 stable，从 `diff.ts valuesEqual` 提取或合并）；`diff.ts` `valuesEqual` 改为引用共享实现（行为不变，W5 修复保留）；`compound.ts:79-83` `deepEquals` 改为引用共享实现（消除 key 序敏感）。

Exit Criteria:

- [x] `compound.test.ts` failing-first 用例由红转绿，key 序重排不影响 `diffInstanceProps` 判等。
- [x] `diff.ts` 现有 W5 回归测试仍全绿（共享实现行为等价）。
- [x] 局部 typecheck 通过（serialization + symbols 模块）。

### Phase 3 - Diagnostic-channel fidelity（C3 cause 透传 + C4 消双报）

Status: completed
Targets: `src/renderer/hooks/use-scada-points-bridge.ts`、`src/renderer/scada-canvas.tsx`、`src/renderer/scada-points-bridge.test.tsx`（probe 直测）、`src/renderer/scada-points-bridge-diagnostics.test.tsx`（onError/flux-\* 诊断测试）、`docs/components/industrial-hmi/{design-renderer,design-data-binding}.md`

- Item Types: `Proof`、`Fix`

- [x] **Proof-C3**（failing-first）：`scada-points-bridge-diagnostics.test.tsx`——注入会 throw 的 compiler，断言 `onError` 收到第三参 `error`（原始 Error 实例，含 stack）；当前签名只有 `(code, message)`，error 丢失。
- [x] **Fix-C3**：`UseScadaPointsBridgeArgs.onError` 签名改 `(code: string, message: string, error?: unknown) => void`（第三参可选 → 向后兼容现有 `(code, message)` / `()` 桩；参数序与 roadmap 建议的 `(code, error, message)` 不同——刻意保留 `(code, message)` 前缀以维持现有桩位置稳定，仅追加 `error?`）；`reportOnce`（`:270-274`）透传 `error`；`scada-canvas.tsx` `reportDiagnostic` 签名增 `error?`，`env.monitor.onError` 处 `new Error(message, error ? { cause: error } : undefined)`（或直传 `toError(error)`，复用 `scada-errors.ts toError`）。`design-renderer.md` 同步诊断通道 cause 语义。
- [x] **Proof-C4**（failing-first）：`scada-points-bridge-diagnostics.test.tsx`——语法坏复杂表达式（如 `${a +}`，`expressionReadsScope` 为真）经 `analyzeFluxSubscriptions` 不入 `depsEmptyExpressions`（仅 compile/createState 失败不入），且 bridge effect 仍报 `flux-compile-failed`（真报保留）。当前实现双报。
- [x] **Fix-C4**：`extractExpressionDepsViaProbe` 返 discriminated result——`{ status: 'ok'; paths: string[] } | { status: 'compile-failed' | 'create-state-failed' | 'evaluate-failed' } | { status: 'deps-empty' }`（compile/createState/evaluate 失败归非 deps-empty；probe 成功但 deps 空为 `deps-empty`）。`analyzeFluxSubscriptions`（`:137-147`）仅在 `status === 'deps-empty'` 时入 `depsEmptyExpressions`；`status === 'ok'` 时取 paths；其余跳过（由 bridge effect 的 `flux-compile-failed`/`flux-evaluate-failed` 真报覆盖）。**迁移既有直测**：`scada-points-bridge.test.tsx:110-122` 直接断言 `extractExpressionDepsViaProbe(...) returns string[]`（`.toContain('analog')`/`.toEqual([])`）需改为消费 discriminated result（`.status === 'ok'` → `.paths`，失败分支断言 `.status`）。`design-data-binding.md` 同步 probe result 语义。

Exit Criteria:

- [x] C3 failing-first 用例由红转绿，`onError` 第三参透传原始 error，`monitor.onError` 收到 `{cause}`。
- [x] C4 failing-first 用例由红转绿，语法坏表达式不误报 `flux-deps-empty`，真报 `flux-compile-failed` 保留。
- [x] `design-renderer.md`（cause 语义）+ `design-data-binding.md`（probe result 语义）同步。
- [x] 局部 typecheck 通过（renderer/hooks 模块）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见本 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_0309f074dffeV8JJkBvOFbel4Y`）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - **Major/Blocker：零**（逐条 citation 经 live repo 核对全部准确：config-adapter.ts:84 isContainer / compound.ts:79-83 deepEquals JSON.stringify / diff.ts valuesEqual own-keys 递归 / use-scada-points-bridge.ts:218 onError 签名 + :270-274 reportOnce + :62-86 probe 塌缩 + :137-147 depsEmpty push / scada-canvas.tsx:130-134 new Error 无 cause）。
  - **C3 消费者扫面落地**：`UseScadaPointsBridgeArgs.onError` 唯一生产消费者 = `scada-canvas.tsx:222 onError: reportDiagnostic`；其余 `onError` 符号（RefreshPipelineOptions.onError 单参 / ScadaCanvasEvents.onError / env.monitor.onError 对象载荷）是不同契约。第三参 `error?` 可选 → 向后兼容现有测试桩。
  - **C4 传播路径落地**：`extractExpressionDepsViaProbe` 唯一消费者 = `analyzeFluxSubscriptions:139`；`extractFluxScopePaths` 薄包装不直调 probe；且 probe 不经 `src/index.ts` 公共面导出 → 返回类型变更**非公共 API 破坏**。
  - **Minor-test-file 引用落地**：Phase 3 Targets 与 Proof-C3/C4 引用改为实际文件 `scada-points-bridge.test.tsx`（probe 直测）+ `scada-points-bridge-diagnostics.test.tsx`（onError/flux-\* 诊断），原误写 `use-scada-points-bridge.test.tsx`。
  - **Minor-C4 既有直测迁移落地**：Fix-C4 补注——`scada-points-bridge.test.tsx:110-122` 直接断言 probe 返 `string[]`，返回类型改后需迁移为消费 discriminated result；Phase 3 Targets 已列入该测试文件。
  - **Minor-C3 参数序落地**：Fix-C3 补注——签名取 `(code, message, error?)` 而非 roadmap 建议的 `(code, error, message)`，刻意保留 `(code, message)` 前缀以维持现有桩位置稳定，仅追加 `error?`。
  - **Minor-C3 引用 off-by-one 落地**：baseline 与 Fix-C3 的 `reportOnce` 行号改为 `:270-274`。
  - **Cross-plan check**：与 plan `{0653-3}` 零 scope 重叠（共享 `validate.ts`/`config-types.ts`/`design-data-binding.md` 但触及不同规则/章节），独立 closure criteria，不应合并。

## Closure Gates

- [x] C1–C4 四项 confirmed live defect 已修复并各带 focused regression proof（断言结果值/可观测行为）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect。
- [x] `docs/components/industrial-hmi/design-renderer.md` + `design-data-binding.md` 同步到 live baseline（Group 降级契约、cause 语义、probe result 语义）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 本 plan 暂无 deferred 项。

## Non-Blocking Follow-ups

- `env.monitor.onError` 的 `phase:'action'` 类型未覆盖 handler-error（`scada-canvas.tsx:117` 注记，host telemetry 后置）——作 watch-only residual，不属本 plan scope。
- sibling plan `2026-08-05-0653-3` 的 in-scope 项不在此追。

## Closure

Status Note: 三 Phase 全部落地（Phase 1 C1 / Phase 2 C2 / Phase 3 C3+C4），每项 Fix 前先落 failing-first Proof（红→绿）。包级 647 tests / 46 files 全绿（较基线 640 增 7：C1 buildNode defense + validator reject 2 用例 + C2 key-order stable 2 用例 + C3 cause transparency + C4 消双报）、workspace 全量验证（typecheck 32/32、build 32/32、lint 32/32、test 59/59）全绿。源审计 `2026-08-05-0653-{open,multi}-audit` 已由 sibling plan `2026-08-05-0653-2` 关闭（P1 收口），本 plan 仅回写 roadmap Follow-up Backlog 对应 per-line P2 条目（multi P2-4/P2-6 + open P2-3/P2-6）。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit sub-agent（fresh session，mission-driver closure-audit step 2026-08-05）。执行 session 未参与本审核。
- Verdict: `approved`
- Evidence:
  - **C1（live code + test + doc）**：`config-adapter.ts:90` `const isContainer = node.type === GROUP_CONTAINER_TYPE;`（children fallback 已移除，defense-in-depth 守护 `engine.reset` 旁路）；`validate.ts` children 仅 `scada-group` 约束落地（错误消息含 `children.*scada-group`）；`config-adapter.test.ts:151`（buildNode 保 leaf attrs）+ `serialization.test.ts:718`（validator fail-fast 拒绝）failing-first proof 双绿；`design-renderer.md:148-155`/`:169`/`:219` 同步 children 契约 + cause 语义。
  - **C2（live code + test）**：`serialization/equality.ts` 存在并导出 `deepEqual`（own-keys 递归 stable）；`compound.ts:3` 导入 + `:78` 使用 `deepEqual`（旧 `JSON.stringify` 删除）；`diff.ts:2` 导入 + `:55` `return deepEqual(a, b)`（W5 行为保留）；`compound.test.ts:233` key-order stable proof 绿。
  - **C3（live code + test + doc）**：`use-scada-points-bridge.ts:253` `onError?: (code, message, error?) => void` 三参签名；`:310` `latest.current.onError?.(code, errorMessage(error), error)` 透传；`scada-canvas.tsx:135` `new Error(message, { cause: error })` 包装；`scada-points-bridge-diagnostics.test.tsx:397` C3 cause transparency proof 绿（断言第三参为原始 Error 含 stack）。
  - **C4（live code + test + doc）**：`use-scada-points-bridge.ts:65-69` discriminated result 类型；`:80-103` 返各 status 分支；`analyzeFluxSubscriptions:160-172` 仅 `status==='deps-empty'` 入 `depsEmptyExpressions`（compile/createState/evaluate 失败跳过，由 bridge effect 真报覆盖）；`scada-points-bridge.test.tsx:110-146` 直测已迁移消费 discriminated result；`design-data-binding.md:272-281` probe result 语义同步；C4 消双报 proof 绿。
  - **Anti-hollow**：四处 Fix 均被运行时调用（buildNode 经 engine.reset/applyDiff 调；deepEqual 经 diffInstanceProps/diffScadaConfig 调；onError 经 useScadaPointsBridge effect 调；extractExpressionDepsViaProbe 经 analyzeFluxSubscriptions 调），无空函数体 / return null 占位 / 吞异常。
  - **Verification**：`pnpm --filter @nop-chaos/flux-renderers-industrial test` → 647 tests / 46 files 全绿（与 plan Status Note 声明一致）；plan Closure Gates 中 `pnpm typecheck`/`build`/`lint`/`test` 已 `[x]` 且与 08-05 daily log 记录的 workspace 全量（32/32 + 59/59）一致。
  - **Five-point consistency**：`Plan Status: completed` / 三 Phase `Status: completed` / 三 Phase Exit Criteria 全 `[x]` / Closure Gates 全 `[x]` / `docs/logs/2026/08-05.md` 收口记录 → 彼此一致。
  - **Deferred honesty**：`Deferred But Adjudicated` 为空；`Non-Blocking Follow-ups` 仅含 watch-only residual（`env.monitor` phase 类型扩展）+ sibling plan 引用，无 in-scope live defect / contract drift 被偷偷降级。

Follow-up:

- 无剩余 plan-owned work。sibling plan `2026-08-05-0653-3`（binding/state B1–B5）已由其自身独立 closure-audit 收口（daily log `08-05.md` 记录 task `ses_0300d86c3ffeYQJYXK2oqgkuD3` approved）。剩余 0653 audit P2（multi P2-1/P2-2/P2-3/P2-5 + open P2-1/P2-2，doc/test-hygiene/perf 类）明确 out-of-scope 留 backlog，不属本 plan closure。
