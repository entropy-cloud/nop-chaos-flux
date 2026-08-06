# 03 Industrial HMI Diagnostic Channel Residual（handler-error telemetry + cycle depth）

> Plan Status: active
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

Status: planned
Targets: `packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx`（`onHandlerError` + `reportDiagnostic`）；telemetry 面（Decision 裁定）

- Item Types: `Decision | Proof | Fix`

- [ ] **Decision（telemetry 路由）**：裁定 handler-error 到达 host 的路径。优先方案（最小公共面变更）：`handler-error` 经已存在、已接 `'action'` phase 的 `ErrorMonitorPayload` 面（`renderer-api.ts:166`）转发到 host，而非扩 `ExpressionExecutionEnv.monitor` 的 `'expression'` 字面量限定。若 host 侧仅暴露 `ExpressionExecutionEnv.monitor`（窄面），则裁定是否 (i) 在 renderer 内经 `rendererRuntime.env` 的更宽 error-reporting 面（如 renderer-plugin 的 `onError(error, payload: ErrorMonitorPayload)`）转发，或 (ii) 新增 optional `onActionError` 通道。Decision 写入 `design-renderer.md` + 本 plan，记录拒绝的替代方案（如「扩 `ExpressionExecutionEnv.monitor.phase` 联合」会模糊窄面语义，故不选）。
- [ ] **Proof（failing-first，先于 Fix）**：先写失败用例——构造图元 click handler throw 场景，断言 host monitor 收到 `phase:'action'` + `error instanceof Error` + `error.cause` 为原始 throw 值。当前实现下确认转红（handler-error 未到 monitor / cause 丢失），作为 Fix 完成后的转绿判据。
- [ ] **Fix-a（透传原始 Error）**：`scada-canvas.tsx:176-177` `onHandlerError` 改为 `reportDiagnostic('handler-error', error instanceof Error ? error.message : String(error), error)`（补第 3 参 `error`），使 `:135` 走 `new Error(message, { cause: error })` 分支保留 cause 链。
- [ ] **Fix-b（action-phase telemetry）**：`reportDiagnostic`（或 Decision 裁定的路由）对 `handler-error` 经 action-phase 面转发到 host 监控（phase:'action'，含原 Error + `{ code: 'handler-error' }`）。保持「诊断≠status 升级」（§8.1 不动 setStatus/不派发 scada:error）。Fix-a/b 落地后上述 failing-first Proof 转绿。

Exit Criteria:

> 本 Phase 交付 = handler-error 与 flux-\* expression 错误在「cause 链 + host telemetry」上对称。只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续的局部检查（Minimum Rule 18）。

- [ ] handler-error 经 action-phase 面到达 host 监控（proof 断言 `phase:'action'` + Error 实例 + cause），与 flux-\* 的 expression-phase telemetry 对称。
- [ ] handler-error 透传原始 Error（cause 链保留），不再 message-only。
- [ ] 诊断≠升级契约不破（§8.1：仍不 setStatus/不派发 scada:error）。
- [ ] 局部 typecheck 通过（证明 telemetry 面 Decision 落地无类型漂移；跨包变更若发生则 typecheck 覆盖）。

### Phase 2 - cycle depth 上限（P2-6）

Status: planned
Targets: `packages/flux-renderers-industrial/src/binding/dirty-collector.ts`（`findCircularDependencyError`）

- Item Types: `Proof | Fix`

- [ ] **Proof（failing-first，先于 Fix）**：先写失败用例——构造 ≥12 层 expression chain 形成 cycle（a→b→...→l→a），断言 `findCircularDependencyError` 返 `CircularDependencyError`（非 undefined）→ 上游上报含 'circular dependency involving point'。当前上限 `10` 下确认转红（深链返 undefined → 误判 generic eval）；补充「≤10 层 cycle 仍正确识别」回归守护用例（防上限调整回归浅链）+ 自环 `cause===current` 守卫用例。
- [ ] **Fix**：`findCircularDependencyError`（`:137-148`）深度上限 `10` 提至 ~1000（或移除，仅保留 `cause === current`/`undefined` break 守卫防无限循环）。注释更新：说明守卫已防自环/链终止，上限仅为防御性兜底而非语义约束。落地后上述 failing-first Proof 转绿。

Exit Criteria:

- [ ] ≥12 层 expression cycle 被识别为 `CircularDependencyError`（proof 断言），非误判 generic eval。
- [ ] 浅链（≤10）cycle 识别不回归（回归守护用例绿）。
- [ ] 无无限循环风险（`cause === current`/`undefined` 守卫保留，proof 含自环 cause===current 用例）。

## Draft Review Record

> 起草后、执行前的独立审查证据（plan guide `Plan Review Rule`）。由独立子 agent（fresh session）填写。

- Reviewer / Agent: independent fresh-session sub-agents（R1 `ses_02ba9622effeAPS0RMHDzWEOEA`、R2 `ses_02ba18b04ffebTfJ8DoqEhV5Dh`、R3 `ses_02b9e48f7ffe0WO6zI1LHSYSGz`）
- Verdict: `pass`（R3 共识轮零 Blocker / 零 Major）
- Rounds: 3（R1 `revise` → R2 `revise` 残留 → R3 `pass`）
- Findings addressed: R1 **Major**——P2-4 归属由「2129-3 收口」更正为 `2026-08-05-0653-4` C3（live 代码注释实证 `scada-canvas.tsx:122`「plan 2026-08-05-0653-4 C3（multi-audit P2-4）」+ `use-scada-points-bridge.ts:202/288`；2129-3 Non-Goals 亦显式声明不动 P2-4），P2-4 排除本身经 live 核对成立（4 参 `reportError` + cause 包装）故保留排除；R1 minor——`必须自动化` 档 Proof 项前置（Phase 1 Decision→Proof→Fix-a→Fix-b；Phase 2 Proof→Fix）；R2 Major——Non-Goals 残留「2129-3 收口」措辞更正为 0653-4 C3 + 「非 2129-3」。参考准确性 P2-5（onHandlerError message-only + monitor 白名单缺 handler-error + 窄/宽 telemetry 面核对）与 P2-6（`findCircularDependencyError` depth<10 + break 守卫）均经 live 核对。

## Closure Gates

- [ ] P2-5：handler-error 透传原始 Error + 经 action-phase 面到达 host 监控，与 flux-\* expression 错误对称（proof 断言 phase/Error/cause）。
- [ ] P2-6：深链 cycle 识别（≥12 层），浅链不回归，无无限循环。
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope 项（P2-4 明确为已收口的 Non-Goal，非本 plan in-scope）。
- [ ] owner doc 同步：`design-renderer.md`（handler-error action-phase telemetry + §8.1 诊断≠升级不变）、`design-data-binding.md`（§9.1 通道对称）反映 live baseline。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Non-Blocking Follow-ups

- 其余 2026-08-05-2129 P2（归 sibling plan `2026-08-06-0746-1` doc-drift / `2026-08-06-0746-2` test-fidelity 或后续 mission 节奏）。
- P2-5 Decision 若最终选择不动公共类型，未来 host 若统一 telemetry 面（编辑器 mission 时代）可回头收敛窄面/宽面双轨。

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<明确写 no remaining plan-owned work，或记录 non-blocking follow-up>>
