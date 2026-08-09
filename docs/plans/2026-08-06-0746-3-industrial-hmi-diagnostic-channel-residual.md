# 03 Industrial HMI Diagnostic Channel Residual（handler-error telemetry + cycle depth）

> Plan Status: completed
> Mission: industrial-hmi
> Work Item: 2026-08-05-2129 post-remediation audit P2（diagnostic-channel residual 子集）
> Last Reviewed: 2026-08-06
> Source: `docs/audits/2026-08-05-2129-multi-audit-industrial-hmi.md` `[P2-5]`（dim 19）+ `[P2-6]`（dim 19），登记于 `docs/components/roadmap-industrial-hmi.md` Follow-up Backlog「2026-08-05-2129 post-remediation audit P2」子节
> Related: `docs/plans/2026-08-05-0653-4-hmi-config-build-equality-diagnostic-fidelity.md`（C3 收口 multi P2-4 = evaluateFlux cause 透传，本 plan **不重复**）、`docs/plans/2026-08-05-2129-3-industrial-hmi-audit-p1-remediations.md`（Phase 3 接通 `RefreshPipeline.onError` = multi P1-2；本 plan 两项即该 plan Non-Goals 显式 deferred 的「P1-2 修复后仍存在的 debuggability residual」——handler-error telemetry（P2-5）+ cycle depth cap（P2-6））

## Purpose

把 2026-08-05-2129 multi-audit 登记的 2 条**诊断通道 debuggability residual** P2（dim 19）收口。

**背景**：plan `2026-08-05-2129-3` Phase 3（multi P1-2）刚把 `RefreshPipeline.onError` 接通到 `scada-canvas.reportDiagnostic`，使 pipeline 层 `flux-compile-failed`/`flux-evaluate-failed` 经 `reportDiagnostic` 出口可达 `console.warn` + `env.monitor.onError`（phase:'expression'），并透传原始 Error（`new Error(message, { cause: error })`）。但该修复同时显式 deferred 两项 residual（2129-3 Non-Goals）：

- **multi P2-5**：用户侧图元事件处理器 throw（`handler-error`）的诊断出口**仍丢原始 Error**（只传 message），且**完全无 `monitor.onError` telemetry 路径**（`reportDiagnostic` 仅对 `flux-*` 码转发 monitor；handler-error 的 `'action'` phase 超出现 `ExpressionExecutionEnv.monitor` 的 `'expression'` 限定）。即 expression 错误可达 host 监控（含 cause 链），等价的 action 错误不可达——通道不对称。
- **multi P2-6**：`findCircularDependencyError`（`dirty-collector.ts:137-148`）cause-chain 深度上限硬编码 `10`，对 10+ 层 expression chain（工业过程管线现实场景）的 cycle 会误判为 generic eval 失败（cycle 不可识别 → 上报 `flux-evaluate-failed` 而非 `circular dependency`，host 无法区分真 cycle vs runtime TypeError）。

两条共享同一收口判据：**P1-2 接通的 onError 通道，其信息完整性 / 适用范围的两个 gap 收敛**。

## Current Baseline

> 起草前已逐条核对 live repo（2026-08-06），下列事实均经源码实测确认。

- **multi P2-4 已收口（不在本 plan）**：P2-4（evaluateFlux cause 透传）已由 plan `2026-08-05-0653-4` C3 收口（代码注释实证：`scada-canvas.tsx:122`「plan 2026-08-05-0653-4 C3（multi-audit P2-4）」、`use-scada-points-bridge.ts:202/288` 同）。live 证据：`dirty-collector.ts:641-644 reportError(key, code, message, error?)` 已透传 `error` 第 4 参；桥接层 `use-scada-points-bridge.ts:208 onError?: (code, message, error?) => void` + `:290 reportOnce` 透传；`scada-canvas.tsx:135 reportDiagnostic` 经 `new Error(message, { cause: error })` 包装。即 `flux-compile-failed`/`flux-evaluate-failed` 的原始 Error / cause 链已完整到达 host。注：2129-3 Non-Goals（line 50）亦显式声明「不动 evaluateFlux 错误上下文塌缩（multi P2-4 backlog）」，证实 P2-4 不属 2129-3；roadmap Follow-up Backlog「2026-08-05-2129」子节对 P2-4 未带「已由 plan 收口」marker（doc-hygiene 缺口，非本 plan in-scope，仅记录）。本 plan **不重复** P2-4。
- **multi P2-5 已确认 live（两部分）**：
  - (a) **丢原始 Error**：`scada-canvas.tsx:176-177` `onHandlerError: (error) => reportDiagnostic('handler-error', error instanceof Error ? error.message : String(error))` —— 只传 `message`，**未传第 3 参 `error`**（而 `reportDiagnostic` 签名已支持 `error?`，:127）。即使转发到 monitor，cause 链也已丢失（被 `:135` 的 `error === undefined` 分支降级为 `new Error(message)` 无 cause）。
  - (b) **无 monitor telemetry**：`reportDiagnostic`（`:130-141`）仅对 `code === 'flux-compile-failed'|'flux-evaluate-failed'|'flux-deps-empty'` 调 `env.monitor?.onError?.({ phase: 'expression', ... })`；`handler-error` 不在白名单 → 永不到达 `env.monitor.onError`。根因：`ExpressionExecutionEnv.monitor.onError` 的 payload 类型 `ExpressionErrorMonitorPayload`（`flux-core/src/types/expression-env-types.ts:1-5`）`phase: 'expression'` **字面量限定**，不接 `'action'`。但同仓 `ErrorMonitorPayload`（`flux-core/src/types/renderer-api.ts:166-172`）`phase: 'compile'|'render'|'action'|'expression'|'api'` **已接 `'action'`**（由 `renderer-plugin.ts:14 onError?(error, payload: ErrorMonitorPayload)` 消费）。即 host 侧已有容纳 `'action'` phase 的更宽 telemetry 面，scada-canvas 当前只用了窄面（`ExpressionExecutionEnv.monitor`）。`:117` 注释明示「handler-error 的 'action' phase 超出现 monitor 类型，host telemetry 后置，Follow-up」——本 plan 即该 Follow-up。
- **multi P2-6 已确认 live**：`dirty-collector.ts:137-148 findCircularDependencyError`：`:139` `let depth = 0`，`:140` `while (current && typeof current === 'object' && depth < 10)` —— cause-chain 遍历硬上限 `10`。`:143` `cause === current || cause === undefined` break 守卫已防无限循环（自环 / 链终止），故提高上限无无限循环风险。10+ 层 expression chain（如工业过程管线 `${a}` → `${b}` → ... → `${k}` cycle）的 cause 链超过 10 即在 `:145 depth++` 后退出循环返 `undefined` → 上游 `:434/445 findCircularDependencyError(error)` 返 `undefined` → 当作 generic eval 失败上报 `flux-evaluate-failed`，cycle 不可识别。
- **包级机械健康**：`pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/lint/test` 全绿（2129-3 收口后基线 ~687 tests / 54 files）。
- **跨包影响**：P2-5 可能触及 `flux-core/src/types/expression-env-types.ts` 或 `renderer-api.ts` 的 telemetry 面（若选择扩 `ExpressionExecutionEnv.monitor` phase）；优先选择「不改公共类型、改走已接 `'action'` 的 `ErrorMonitorPayload` 面」的路径（见 Phase 1 Decision）。

## Goals

- **P2-5（handler-error telemetry 对称）**：`handler-error` 诊断出口 (a) 透传原始 Error（保留 cause 链）+ (b) 经一个 host 可消费、且 phase 语义为 `'action'` 的 telemetry 面到达 host 监控——与 `flux-*` 错误的 expression-phase telemetry 对称（断言 host 收到 `phase:'action'` + 原 Error 实例含 cause，非仅 console.warn）。
- **P2-6（cycle depth 上限）**：`findCircularDependencyError` cause-chain 深度上限提高至能覆盖现实工业表达式链（~1000）或移除人工上限（保留 `cause===current/undefined` 守卫防无限循环），使 10+ 层 cycle 被正确识别为 `CircularDependencyError`（断言深链 cycle 被识别，非误判 generic eval）。
- **通道对称性 owner doc 同步**：`design-renderer.md`（§10 错误码段落 / §8.1 诊断≠升级契约）与 `design-data-binding.md`（§9.1 诊断通道）反映 handler-error telemetry 到达 host。

## Non-Goals

- 不重做 P2-4（evaluateFlux cause 透传——已由 plan `2026-08-05-0653-4` C3 收口，见 Current Baseline；非 2129-3）。
- 不改 `ExpressionExecutionEnv.monitor` 的 `'expression'` phase 语义本身（不把窄面改成接任意 phase——优先用已存在的更宽 `ErrorMonitorPayload` 面；是否需要新 optional 通道由 Phase 1 Decision 裁定，倾向最小公共面变更）。
- 不处理同轮其余 P2（归 sibling plan `2026-08-06-0746-1` doc-drift / `2026-08-06-0746-2` test-fidelity 或后续 mission 节奏）。
- 不改 flux-core `ErrorMonitorPayload` 的 phase 联合类型（已含 `'action'`，无需改）。
- 不动 scada 错误码注册表 / i18n 文案（`handler-error` 已在 `SCADA_ERROR_CODES` 登记）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx`（P2-5：`onHandlerError` 透传 error + `reportDiagnostic` 对 `handler-error` 走 action-phase telemetry）。
- `packages/flux-renderers-industrial/src/binding/dirty-collector.ts`（P2-6：`findCircularDependencyError` 深度上限）。
- 可能：`packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx` 或 hooks 内 telemetry 路由（P2-5 Decision 裁定后）；`flux-core` 公共类型**仅在** Decision 裁定「扩窄面 phase」时才动（优先不动）。
- 回归 proof：handler-error telemetry 到达（含 cause）+ 深链 cycle 识别。
- owner doc：`design-renderer.md`（错误码/诊断段落）、`design-data-binding.md`（§9.1）。

### Out Of Scope

- `evaluateFlux` / `reportError` 主体（P2-4 已收口）。
- `flux-core` `ErrorMonitorPayload` phase 联合、`ExpressionExecutionEnv` 主体（除非 Decision 裁定扩窄面）。
- 其余 audit P2。

## Failure Paths

| 可测场景编号             | 触发                                             | 行为                                                                     | 可重试 | 用户可见表现                                                                             |
| ------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------- |
| handler-error-no-cause   | 图元 click handler throw（坏 ActionSchema）      | `reportDiagnostic('handler-error', msg, error)` 透传原 Error             | 否     | console.warn + host monitor 收 phase:'action' + Error.cause                              |
| deep-cycle-misclassified | 12 层 expression chain 形成 cycle（a→b→...→l→a） | `findCircularDependencyError` 返 CircularDependencyError（非 undefined） | 否     | 上报含 'circular dependency involving point' 而非 generic 'expression evaluation failed' |

## Test Strategy

档位选择：`必须自动化`

本档选择：**必须自动化**——诊断通道语义（host telemetry 到达 + cycle 识别）是组态可观测性公共契约，且 P2-5 涉及跨包 telemetry 面。failing-first Proof 先行（退化场景红 → 修复绿）。

## Execution Plan

### Phase 1 - handler-error telemetry 对称（P2-5）

Status: completed
Targets: `packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx`（`onHandlerError` + `reportDiagnostic`）；telemetry 面（Decision 裁定）

- Item Types: `Decision | Proof | Fix`

- [x] **Decision（telemetry 路由）**：裁定 handler-error 经已存在、已接 `'action'` phase 的**宽** telemetry 面 `RendererPlugin.onError`（`flux-core/src/types/renderer-api.ts:166` `ErrorMonitorPayload`，phase 联合含 `'action'`；`flux-action-core/action-execution.ts:153` 已用此面转发 action 错误）转发到 host，由 `rendererRuntime.plugins` 迭代调用，phase:'action' + 原 Error（cause 链保留）。**拒绝**扩 `ExpressionExecutionEnv.monitor` 的 `'expression'` 字面量限定（会模糊窄面语义——窄面刻意限定 expression-phase，且需改公共类型）与新增 optional `onActionError` 通道（属不必要的重复面——`plugins[].onError` 宽面已覆盖）。对称性：flux-\* expression 错误 → 窄面 `env.monitor.onError`（phase:'expression'）；handler-error action 错误 → 宽面 `plugins[].onError`（phase:'action'）。Decision 写入 `design-renderer.md` §8.1（plan 2026-08-06-0746-3 Phase 1 Decision 注记）+ 本 plan。
- [x] **Proof（failing-first，先于 Fix）**：先写失败用例——`scada-canvas-diagnostic-channels.test.tsx` 新增 describe「handler-error action-phase telemetry symmetry」(plan 2026-08-06-0746-3 Phase 1, multi P2-5)：构造图元 click handler throw 场景，断言 host plugin.onError 收 `phase:'action'` + `error instanceof Error` + `error.cause` 为原始 throw 值（cause 链保留）+ 画布保持 ready（§8.1 不升级）。修复前 handler-error 既不透传 error 也无 telemetry 路径 → 红；Fix 后绿。另含「plugin onError throw 自隔离不阻断其余 plugin」回归用例。
- [x] **Fix-a（透传原始 Error）**：`scada-canvas.tsx` `onHandlerError` 改为 `reportDiagnostic('handler-error', error instanceof Error ? error.message : String(error), error)`（补第 3 参 `error`），使 `reportDiagnostic` 走 `new Error(message, { cause: error })` 分支保留 cause 链。
- [x] **Fix-b（action-phase telemetry）**：`reportDiagnostic` 增 `else if (code === 'handler-error')` 分支：经 `rendererRuntime.plugins` 迭代 `plugin.onError(reportedError, { phase: 'action', error: reportedError, details: { code: 'handler-error' } })`（per-plugin try/catch 隔离，镜像 action-execution.ts）。`reportedError` 经 `error === undefined ? new Error(message) : new Error(message, { cause: error })` 统一构造（cause 链保留）。保持「诊断≠status 升级」（§8.1 不动 setStatus/不派发 scada:error）。Fix-a/b 落地后上述 failing-first Proof 转绿。

Exit Criteria:

> 本 Phase 交付 = handler-error 与 flux-\* expression 错误在「cause 链 + host telemetry」上对称。只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续的局部检查（Minimum Rule 18）。

- [x] handler-error 经 action-phase 面到达 host 监控（proof 断言 `phase:'action'` + Error 实例 + cause），与 flux-\* 的 expression-phase telemetry 对称。
- [x] handler-error 透传原始 Error（cause 链保留），不再 message-only。
- [x] 诊断≠升级契约不破（§8.1：仍不 setStatus/不派发 scada:error）。
- [x] 局部 typecheck 通过（证明 telemetry 面 Decision 落地无类型漂移；跨包变更未发生——未改公共类型）。

### Phase 2 - cycle depth 上限（P2-6）

Status: completed
Targets: `packages/flux-renderers-industrial/src/binding/dirty-collector.ts`（`findCircularDependencyError`）

- Item Types: `Proof | Fix`

- [x] **Proof（failing-first，先于 Fix）**：`binding-expression-unification.test.ts` 新增 describe「findCircularDependencyError cause-chain depth cap」(plan 2026-08-06-0746-3 Phase 2, multi P2-6)：构造 12 层 wrapper 包裹 `CircularDependencyError`（模拟多层嵌套求值的包装叠加），断言 `findCircularDependencyError` 返原 `CircularDependencyError` 实例（toBe identity）。修复前上限 `10` 下确认转红（12/50 层返 undefined → 误判 generic eval）；补充「≤10 层 cycle 仍正确识别」回归守护（5 层，防上限调整回归浅链）+ 自环 `cause===current` 守卫用例（防无限循环）+ 普通 error 返 undefined 用例（防误报）。
- [x] **Fix**：`findCircularDependencyError` 深度上限 `10` 提至 `MAX_CAUSE_CHAIN_DEPTH = 1000`（新增模块级常量）。注释更新：说明 `cause === current`/`undefined` break 守卫已防自环/链终止，上限仅为防御性兜底而非语义约束（兜底恶意/损坏极深链防栈耗尽）。落地后上述 failing-first Proof 转绿。

Exit Criteria:

- [x] ≥12 层 expression cycle 被识别为 `CircularDependencyError`（proof 断言 toBe identity），非误判 generic eval。
- [x] 浅链（≤10）cycle 识别不回归（回归守护用例绿——5 层仍识别）。
- [x] 无无限循环风险（`cause === current`/`undefined` 守卫保留，proof 含自环 cause===current 用例）。

## Draft Review Record

> 起草后、执行前的独立审查证据（plan guide `Plan Review Rule`）。由独立子 agent（fresh session）填写。

- Reviewer / Agent: independent fresh-session sub-agents（R1 `ses_02ba9622effeAPS0RMHDzWEOEA`、R2 `ses_02ba18b04ffebTfJ8DoqEhV5Dh`、R3 `ses_02b9e48f7ffe0WO6zI1LHSYSGz`）
- Verdict: `pass`（R3 共识轮零 Blocker / 零 Major）
- Rounds: 3（R1 `revise` → R2 `revise` 残留 → R3 `pass`）
- Findings addressed: R1 **Major**——P2-4 归属由「2129-3 收口」更正为 `2026-08-05-0653-4` C3（live 代码注释实证 `scada-canvas.tsx:122`「plan 2026-08-05-0653-4 C3（multi-audit P2-4）」+ `use-scada-points-bridge.ts:202/288`；2129-3 Non-Goals 亦显式声明不动 P2-4），P2-4 排除本身经 live 核对成立（4 参 `reportError` + cause 包装）故保留排除；R1 minor——`必须自动化` 档 Proof 项前置（Phase 1 Decision→Proof→Fix-a→Fix-b；Phase 2 Proof→Fix）；R2 Major——Non-Goals 残留「2129-3 收口」措辞更正为 0653-4 C3 + 「非 2129-3」。参考准确性 P2-5（onHandlerError message-only + monitor 白名单缺 handler-error + 窄/宽 telemetry 面核对）与 P2-6（`findCircularDependencyError` depth<10 + break 守卫）均经 live 核对。

## Closure Gates

- [x] P2-5：handler-error 透传原始 Error + 经 action-phase 面到达 host 监控，与 flux-\* expression 错误对称（proof 断言 phase/Error/cause）。
- [x] P2-6：深链 cycle 识别（≥12 层），浅链不回归，无无限循环。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 项（P2-4 明确为已收口的 Non-Goal，非本 plan in-scope）。
- [x] owner doc 同步：`design-renderer.md`（handler-error action-phase telemetry + §8.1 诊断≠升级不变）、`design-data-binding.md`（§9.1 通道对称 + 环检测 cause 链深度）反映 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Non-Blocking Follow-ups

- 其余 2026-08-05-2129 P2（归 sibling plan `2026-08-06-0746-1` doc-drift / `2026-08-06-0746-2` test-fidelity 或后续 mission 节奏）。
- P2-5 Decision 若最终选择不动公共类型，未来 host 若统一 telemetry 面（编辑器 mission 时代）可回头收敛窄面/宽面双轨。

## Closure

Status Note: 两 Phase 全部落地，两条诊断通道 debuggability residual P2 收口——handler-error 与 flux-\* expression 错误在「cause 链 + host telemetry」上对称（P2-5），findCircularDependencyError cause-chain 深度上限覆盖现实工业过程管线多层 expression chain（P2-6）。每项 Fix 前先落 failing-first Proof（红→绿）。owner docs 同步 live baseline。workspace 全量 typecheck/build/lint/test 全绿。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session sub-agent（task `ses_02b749de7ffea3gWZyXOU7bQlf`，general agent，不复用执行者上下文）
- Verdict: `approved`（零 Blocker / 零 Major / 零 Minor）
- Evidence: 逐项核验 Phase 1（scada-canvas.tsx `onHandlerError` 透传 error + `reportDiagnostic` handler-error 分支经 `rendererRuntime.plugins` 转发 phase:'action' + cause 链 + §8.1 不升级；proof 断言 phase/Error.cause identity）、Phase 2（`MAX_CAUSE_CHAIN_DEPTH=1000` + break 守卫保留；proof 断言 12/50 层 toBe identity + 浅链回归 + 自环守卫）、Decision 诚实（`ExpressionErrorMonitorPayload.phase` 字面量未改、`ErrorMonitorPayload` phase 联合未改、test-support 3rd 参可选向后兼容）、owner docs 一致（§8.1/§9.1 描述 action-phase telemetry + 深度上限 1000 为 LANDED，无 stale 文本）、scope 诚实（P2-4 为已收口 Non-Goal 非 deferred）、文本一致性（Status/Exit Criteria/Closure Gates 彼此一致）。workspace 全量验证：typecheck 32/32、build 32/32、lint 32/32、test 59/59（industrial 696/54）全绿。

Follow-up:

- no remaining plan-owned work（其余 2026-08-05-2129 P2 归 sibling plan 或后续 mission 节奏；P2-5 Decision 若未来 host 统一 telemetry 面，可回头收敛窄/宽面双轨——见 Non-Blocking Follow-ups）。
