# 03 Industrial HMI 2026-08-05-2129 Audit P1 Remediations

> Plan Status: completed
> Last Reviewed: 2026-08-06
> Source: `docs/audits/2026-08-05-2129-open-audit-industrial-hmi.md`（1×P1）+ `docs/audits/2026-08-05-2129-multi-audit-industrial-hmi.md`（3×P1），mission `industrial-hmi` / `packages/flux-renderers-industrial`
> Related: `docs/plans/2026-08-05-0653-2-industrial-hmi-audit-p1-remediations.md`（上一轮 4×P1 收口，本 plan 同型 successor）、`docs/components/roadmap-industrial-hmi.md`（Follow-up Backlog 收 P2）

## Purpose

把 2026-08-05-2129 两份 open 审计（open-ended adversarial + multi-dimensional）登记的 **4 条 P1** 全部收口到「live 缺陷已修 + focused regression / integration proof 已入库（断言结果值/可见性，非仅 call-count 或 mock 属性）+ 受影响 owner doc 已同步 + 仓库硬门禁恢复绿」。两份审计的 P2（共 25 条）不进本 plan，已 triage 到 roadmap Follow-up Backlog 新子节「2026-08-05-2129 post-remediation audit P2」（各带源审计路径可追溯）。

4 条 P1 均已逐条核对 live repo（2026-08-06），均经源码/测试/门禁实测确认：

- **multi P1-1（Dim 22/05）**：binding-level `expression` 的 scope 依赖在生产桥接层从未订阅 → 契约 ①（无点表直连 scope）端到端断裂。
- **multi P1-2（Dim 19）**：`RefreshPipeline.onError` 在生产装配中从未接线 → `source:'expression'` / `binding.expression` / `scale.expression` 求值失败全部静默。
- **multi P1-3（Dim 02/14）**：`pnpm check:oversized-code-files` 对本包 2 个新测试文件 FAIL（hard-gate 退化）。
- **open P1-1**：`StateVisualApplier` 退出状态时从不 revert `shadow` → 报警辉光永久残留 + `applied` 追踪集泄漏。

## Current Baseline

> 起草前已逐条核对 live repo（2026-08-06），下列事实均经源码/测试/门禁实测确认。

- **包级机械健康**：`pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/lint/test` 全绿（**683/683 tests / 49 files**，较上一轮 615/43 增 68 tests）。`pnpm check:audit-runtime-raw-schema-reads` 本包 0 命中；`pnpm check:workspace-manifest-deps` 本包 0 未声明导入。
- **上一轮 0653 P1/P2 已确认全部 FIXED**：multi-audit §Prior P1/P2 Verification 表逐条标注 FIXED（W3 revert-vs-binding、2 超限文件、serializeScadaConfig §11、scada-canvas.types.ts 删除、cause 透传、fill-branch clamp、flux-deps-empty discriminated result）。本 plan 不重复处理已收口项。
- **multi P1-1 已确认 live**：`use-scada-points-bridge.ts:53-86` `analyzeFluxSubscriptions` **仅扫描 `config.variables`**，从不扫描 `config.symbols[].bindings[].expression` 的 scope 路径；`:182-188` `useMemo` 仅消费 `analyzeFluxSubscriptions` 的 `paths`；`:189-197` `useScopeSelector` 在 `paths.length === 0`（即 `variables:[]`）时 `enabled:false` + `fallback:{}` → `scopeData` 永久 `{}`；`:255-259` effect 把 `{}` 推给 `pipeline.updateScopeData({})` → binding.expression 经 `evalScope = {...pointValues, ...{}}` 求值，`${scopeMember}` → undefined → `NaN`。`binding/reverse-index.ts:24-33` `collectBindingPointIds` **确实**经 `probeExpressionPaths` 收集 binding-expression scope 路径，但只进 reverse index，**从不转发到桥接层订阅**。`variables-optional-contract.test.ts:77-94` 场景 ① 是 false-green：它 `pipeline.flushFrame(harnessApply(harness))` 直接驱动 pipeline 并手工注入 `{ scopeVal: 21 }`，**绕过整个桥接层**，故 CI 绿不反映端到端行为。
- **multi P1-2 已确认 live**：`use-scada-engine.ts:53-87` `createBindingDomain` 构造 `RefreshPipeline` 时**无 `onError` 字段**，函数签名 `:53-60` **不接受** `onError` 参数；`binding/dirty-collector.ts:585-589` `reportError` → `this.options.onError?.(error)` → 生产 `onError === undefined` → no-op；`:348`（`source:'expression'` 点求值）、`:415,421`（`binding.expression` / `scale.expression` 求值）三处均 `reportError` → 生产全部静默。对比：桥接层 `source:'flux'` 通道**已接线**（`scada-canvas.tsx:220-231` `useScadaPointsBridge({ ..., onError: reportDiagnostic })`）。即 `source:'flux'` 错误可达 `console.warn` + `env.monitor.onError`，而等价的 `source:'expression'` / `binding.expression` / `scale.expression` 错误可达空。
- **multi P1-3 已确认 live**：`wc -l` 实测 `serialization/serialization.test.ts` = **749 行**、`binding/refresh-pipeline.test.ts` = **726 行**，均 > 700 硬限（`scripts/check-oversized-code-files.mjs` `ERROR_LINES=700`，无 test 豁免，接入 `pnpm check`）。该包由「0653-5 closure 后 0 失败」退化为「2 失败」——退化由 0653-3/4 + 2129-1 remediation wave 新增的回归测试撑破。
- **open P1-1 已确认 live**：`symbols/visual-state.ts:11-19` `STYLE_RESET_DEFAULTS` 列 `visible/opacity/fill/stroke/strokeWidth/textColor/strokeDash`，**独缺 `shadow`**；`:80-92` revert 分支 `const revert = base[key] !== undefined ? base[key] : STYLE_RESET_DEFAULTS[key]`，对 `shadow`（builtin defaults 均无 shadow）`revert = undefined` → `if (revert !== undefined)` 为 false → 既不 `collector.collect` 也不 `applied.delete('shadow')`。`symbols/symbol-types.ts:47-52` `ScadaSymbolStylePatch` 显式 `Pick<..., 'fill'|'stroke'|'strokeWidth'|'opacity'|'visible'|'textColor'|'shadow'|'strokeDash'>`——`shadow` 是受类型契约祝福的状态样式字段。`binding/dirty-collector.ts:494-518` `collectStates` 在状态进入时对**每个** style 条目（含 shadow）`collector.collect`。→ builtin 图元（rect/ellipse/... defaults 均无 shadow）声明 `states.alarm.style.shadow` 时，进入 alarm 应用辉光，退出到 normal（其 style 无 shadow）时辉光**永久残留** + `applied` 集保留 `'shadow'`（后续每次 applyState 重试且重败）。其余 7 个 `ScadaSymbolStylePatch` 字段全部在 `STYLE_RESET_DEFAULTS` 中，shadow 是唯一离群点。`state-visual.test.ts:201-239`（"should keep fields without a resettable base value tracked (shadow revert edge)"）**确实**在 state style 中使用 shadow，但该测试**把缺陷断言为预期行为**——退出 fault 态（`setFlag(0)`）后 `:224-229` 断言 shadow **残留**（`toEqual({...,blur:4,color:'#ff0000'})`），`:223` 注记「base 无 shadow 且无重置默认 → 保持状态值」。即缺陷被一条测试「祝福」而非守护；Phase 4 修复后该测试必红（shadow 将被清除），须翻转为断言正确行为。
- **回归测试落点**：multi P1-1/P1-2 的 false-green 必须用「挂载真实 React/renderer 边界」的 integration test 关闭（不是 pipeline/hook 隔离测试）。multi P1-3 是机械拆分。open P1-1 是 `state-visual.test.ts` 扩展（failing-first）。三者落点互不物理耦合，但 Phase 1（拆分）先行可保持门禁全程绿。
- **受影响 owner doc**：`docs/components/industrial-hmi/design-data-binding.md`（§9.1 无点表直连 scope 契约、错误通道对称性）、`design-renderer.md`（pipeline onError 通道、错误码对称）。open P1-1 无独立 owner doc 改动（`STYLE_RESET_DEFAULTS` 是内部实现），但 `visual-state.ts:10-19` 注记需补「reset map 由 `keyof ScadaSymbolStylePatch` 派生/穷尽」结构守卫说明。

## Goals

- **4 条 P1 live 缺陷全部修复**并各配 focused regression / integration proof：
  - multi P1-1：binding-expression scope 路径并入订阅，无点表 + binding.expression 配置随 scope 变化 reactive 更新（断言结果值，非 mock）。
  - multi P1-2：`RefreshPipeline.onError` 生产接线，pipeline 层 expression/binding/scale 错误可达 `reportDiagnostic`/`monitor.onError`，错误码与桥接层对称（断言错误到达，非仅 not.toThrow）。
  - multi P1-3：`pnpm check:oversized-code-files` 对 industrial 包恢复 0 失败。
  - open P1-1：builtin 图元（无 base shadow）声明 `states.alarm.style.shadow` 时，退出到 normal 后 shadow 被清除、`applied` 不泄漏。
- **false-green 类防御**：multi P1-1/P1-2 各加一条「挂载真实桥接/renderer 边界」的 integration test（关闭 dimension-23 integration-boundary mock 盲点），不仅修单例。
- **结构性守卫**：open P1-1 修复同时使 `STYLE_RESET_DEFAULTS` 对 `ScadaSymbolStylePatch` 穷尽（hoist `applied.delete` + 穷尽 reset map），关掉「per-field 枚举总比类型契约少一个」类。
- **owner doc 同步**到 live baseline（仅限真正改变行为/契约的项）。

## Non-Goals

- 不处理 25 条 P2（已 triage 到 roadmap Follow-up Backlog「2026-08-05-2129 post-remediation audit P2」子节，各带源审计路径）。
- 不重新仲裁「{binding, state-style, animation} 同属性写优先级」（open P2-1 backlog）；本 plan 仅修「退出状态不 revert shadow」这一 live defect。
- 不重构 `analyzeFluxSubscriptions` 为消费 reverse-index 的唯一入口（multi P1-1 修法取最小侵入：并集订阅路径；是否再抽 helper 是 P2 follow-up）。
- 不改 `leafer-ui-mock` 全量 shadow 渲染 / z-order / 属性强转建模（mission 级 mock 加固，超出本 4-P1 收口范围；open P1-1 仅在 attrs 层断言 revert 值）。
- 不动其它包的超限文件（非本 mission / 非本审计来源）。
- 不动 `evaluateFlux` 错误上下文塌缩（multi P2-4 backlog）、`handler-error` telemetry（multi P2-5 backlog）、cycle depth cap（multi P2-6 backlog）——这些是 P1-2 修复后仍存在的 debuggability residual，独立 backlog 项。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-points-bridge.ts`（multi P1-1：订阅路径并集 binding-expression scope 路径）。
- `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-engine.ts`（multi P1-2：`createBindingDomain` 增 `onError` 参数 + 接线）+ `scada-canvas.tsx`（把 reportDiagnostic 注入 createBindingDomain 调用链）+ `binding/dirty-collector.ts`（如需扩 onError 签名透传 code/error）。
- `packages/flux-renderers-industrial/src/symbols/visual-state.ts`（open P1-1：`STYLE_RESET_DEFAULTS` 补 shadow + 穷尽 + hoist `applied.delete`）。
- 拆分 `src/serialization/serialization.test.ts`（749）与 `src/binding/refresh-pipeline.test.ts`（726）为聚焦兄弟文件，均 < 700 行。
- 新增/扩展 focused regression / integration proof：`symbols/state-visual.test.ts`（shadow revert）、桥接/renderer 边界 integration test（multi P1-1/P1-2，挂载真实 useScadaPointsBridge/useScadaEngine）。
- owner doc 同步：`design-data-binding.md`（§9.1 契约 + 错误通道对称）、`design-renderer.md`（pipeline onError 通道）。

### Out Of Scope

- 其它包超限文件、其它 mission 的 mock 加固、25 条 P2、`evaluateFlux`/`handler-error`/cycle-cap debuggability residual、`{binding,state,animation}` 优先级文档化。

## Failure Paths

> 涉及运行时数据流所有权（Phase 2 订阅）与错误通道（Phase 3），列关键可测场景。

| 场景编号                        | 触发                                                                      | 行为                                                                                                                            | 可重试 | 用户可见表现                                                              |
| ------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| `binding-expr-no-vars-reactive` | `variables:[]` + `bindings.text.expression='${v*2}'`，scope `{v:21}` 变化 | `useScopeSelector` enabled，`scopeData` 含 `v`，binding 求值得 42，随 scope 变化重算                                            | 是     | 图元 text 随 scope 变化更新到 42（非 NaN/永久 undefined）                 |
| `pipeline-expr-error-surfaced`  | `bindings.fill.expression='${broken syntax'`                              | pipeline `reportError` → `onError('flux-compile-failed', msg, error)` → `reportDiagnostic` → `console.warn` + `monitor.onError` | 否     | author 在 console/monitor 看到 `flux-compile-failed` 诊断（非静默无响应） |
| `state-exit-clears-shadow`      | builtin 图元 + `states.alarm.style.shadow={...}`，alarm→normal            | 退出时 revert shadow（reset default），`applied.delete('shadow')`                                                               | 否     | 报警辉光在退出 alarm 后消失（非永久残留）                                 |

## Test Strategy

档位选择：**必须自动化**。

理由：multi P1-1/P1-2 是核心数据流契约 / 错误通道的 contract break，且当前 CI 由 false-green（mock 了 integration boundary）掩盖——属「核心回归路径」且「测试必须先红后绿」。multi P1-3 是 CI hard gate（机械但不可降级）。open P1-1 是状态机退出恢复的视觉正确性回归。四者均需 focused 验证；multi P1-1/P1-2 的 Proof 项（integration test）**先于** Fix 落地以锁定红→绿。

## Execution Plan

### Phase 1 - Restore oversized-code-files hard gate（multi P1-3）

Status: completed
Targets: `packages/flux-renderers-industrial/src/serialization/serialization.test.ts`（749）、`packages/flux-renderers-industrial/src/binding/refresh-pipeline.test.ts`（726）

- Item Types: `Fix`

- [x] 拆分 `serialization.test.ts`（749）为按域聚焦的兄弟文件，均 < 700 行（按既有 `describe` 边界机械切分：legacy-at-syntax/codemod、C1 leaf-with-children、C2 key-order-insensitive equality、round-trip/serialize 等套件分别外移为聚焦兄弟）。
- [x] 拆分 `refresh-pipeline.test.ts`（726）为按域聚焦的兄弟文件，均 < 700 行（按既有 `describe` 边界：B1-B5 binding/state-resolution、C3 cause 透传、C4 deps-empty、lifecycle 分别外移）。
- [x] 不改动被拆文件的测试逻辑/断言，仅物理搬迁 `describe` 块到新文件 + import 调整（纯机械拆分，零行为变更）。

Exit Criteria:

- [x] `pnpm check:oversized-code-files` 对 industrial 包 0 失败（`serialization.test.ts` 与 `refresh-pipeline.test.ts` 两个源文件 + 所有新拆兄弟均 < 700 行）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial test` 全绿（拆分前后用例数守恒，断言不丢）。

### Phase 2 - Wire binding-expression scope subscription（multi P1-1）

Status: completed
Targets: `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-points-bridge.ts`、`binding/reverse-index.ts`（只读查询）、新增 integration test

- Item Types: `Proof | Fix | Decision`

- [x] **Proof（failing-first）**：新增 integration test，挂载真实 `useScadaPointsBridge`（或真实 `ScadaCanvasRenderer` + 真实 `useScopeSelector` 驱动 scope），配置 `{ version:1, variables:[], symbols:[{ id:'sym', type:'scada-rect', bindings:{ text:{ expression:'${scopeVal * 2}' } } }] }`，scope `{ scopeVal: 21 }` 变化时断言图元 text 更新到 42（**非** NaN/永久 undefined）。先确认该 test 红（当前 `scopeData` 永久 `{}`）。
- [x] **Decision**：订阅路径来源裁定——在 `useScadaPointsBridge` 中把 `analyzeFluxSubscriptions(config).paths` 与 binding-expression scope 路径**并集**。binding-expression scope 路径来源取 reverse index 已收集的 `pointIds()` 中属于 scope 路径的子集，或新增/复用一个 helper 扫描 `config.symbols[].bindings[].expression`（经 `collectBindingPointIds`/`probeExpressionPaths`）。裁定：最小侵入 = 桥接层经 runtime.reverseIndex 暴露的 binding-scope-path 集并入 `useScopeSelector` `paths`（reverse index 已在 `use-scada-engine` config reload 时重建）。**实现注意**：桥接层 `ScadaPointsBridgeRuntime` 类型（`use-scada-points-bridge.ts:141-145`）当前仅声明 `{pointStore, pipeline, applyAttrs}`，无 `reverseIndex`；`ReverseIndex.pointIds()`（`reverse-index.ts:99-101`）返回 point id 与 binding-expr scope 路径的**并集**，无「仅 scope 路径」方法。实现时需扩 bridge runtime 类型暴露 reverseIndex（或新增过滤方法），或接受轻微 over-subscription（把 point id 也当 scope 路径订阅，无害但语义噪音）——取扩类型暴露 + 过滤方法为优选。
- [x] **Fix**：实现订阅并集——`useScopeSelector` 的 `paths` 在 `variables:[]` 但存在 binding-expression scope 路径时仍 `enabled:true`，使 `scopeData` 含 binding-expression 所读的 scope 成员。
- [x] **Fix**：确认 `:255-259` scope-push effect 在 `paths` 非空时把含 binding-expression scope 成员的 `scopeData` 推给 `pipeline.updateScopeData`，binding.expression 经 `evalScope` 正确求值。
- [x] **Proof**：上述 failing-first integration test 转绿（scope 变化 → text=42 reactive 更新）。
- [x] **Fix（守卫）**：扩展既有 `variables-optional-contract.test.ts` 场景 ① 的注记或新增一条 test，明示「该隔离测试仅验 pipeline 层；端到端由 Phase 2 integration test 覆盖」，关闭 false-green 的歧义。

Exit Criteria:

- [x] 无点表（`variables:[]`）+ `binding.expression '${scopeMember}'` 配置随 scope 变化 reactive 更新（integration test 断言结果值 42，挂载真实桥接/renderer 边界）。
- [x] 既有 `variables-optional-contract.test.ts` 其余场景（② 点表直连、③ 混合）不回归。
- [x] `design-data-binding.md §9.1` 无点表直连 scope 契约注记「端到端 wiring 由桥接层订阅并集覆盖（Phase 2 收口 multi P1-1 false-green）」。

### Phase 3 - Wire RefreshPipeline.onError in production（multi P1-2）

Status: completed
Targets: `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-engine.ts`、`scada-canvas.tsx`、`binding/dirty-collector.ts`（如扩签名）、新增 integration test

- Item Types: `Proof | Fix | Decision`

- [x] **Proof（failing-first）**：新增 integration test，经 `useScadaEngine`（**非** test harness）构造引擎，配置含坏 `binding.expression '${broken syntax'`，断言错误到达 `reportDiagnostic`/`monitor.onError`（code 为 `flux-compile-failed`/`flux-evaluate-failed`）。先确认该 test 红（生产 `onError` 未接线，错误静默）。
- [x] **Decision**：onError 签名裁定——`createBindingDomain` 增 `onError` 参数。签名形态优先 `(code, message, error?) => void`（与桥接层 `UseScadaPointsBridgeArgs.onError` 对称，便于统一错误码）；若 `RefreshPipelineOptions.onError` 当前是 `(error: string) => void`，则扩为 `(code, message, error?)` 并把 `dirty-collector.ts:585-589` `reportError` 改为携带 code/error（错误码统一为 `flux-compile-failed`/`flux-evaluate-failed`，与桥接层对称）。**实现注意（3 点 ripple）**：(1) `evaluateFlux`（`dirty-collector.ts:384-407`）当前 compile catch（`:391`）与 evaluate catch（`:402`）均塌缩返 `undefined`、不区分阶段——要 emit `flux-compile-failed` vs `flux-evaluate-failed` 需让 `evaluateFlux` 区分/透传失败阶段（经 sentinel 返回或非 cycle 重抛由 caller 捕获）。(2) 扩 `RefreshPipelineOptions.onError` 签名会波及既有 test harness 声明（`refresh-pipeline.test.ts:32`、`binding-expression-unification.test.ts:38`、`scada-robustness-hardening.test.ts:339` 等），实现时同步迁移（保持 `(code, message)` 前缀 + 追加 `error?` 向后兼容）。(3) 这些 ripple 属实现细节，不改变 Phase 3 的 closure surface（pipeline 错误可达 reportDiagnostic + 错误码对称）。
- [x] **Fix**：`createBindingDomain` 接受 `onError` 并传入 `new RefreshPipeline({ ..., onError })`；`use-scada-engine.ts` 装配处把同一 `reportDiagnostic` 出口（桥接层所用，`scada-canvas.tsx:126`）注入 `createBindingDomain`。
- [x] **Fix**：`scada-canvas.tsx` 把 `reportDiagnostic`（或其封装）经 `useScadaEngine` 参数传到 `createBindingDomain`，使 pipeline 层 expression/binding/scale 错误经同一诊断出口上报。
- [x] **Fix**：统一错误码——pipeline 层 expression 错误 emit `flux-compile-failed`（编译失败）/ `flux-evaluate-failed`（求值失败），使 `source:'flux'` / `source:'expression'` / binding-level 三个声明源 observably symmetric（`reportDiagnostic` 的 `monitor.onError` 分支已覆盖此二码）。
- [x] **Proof**：上述 failing-first integration test 转绿（坏 binding.expression → `flux-compile-failed`/`flux-evaluate-failed` 到达 reportDiagnostic/monitor.onError）。
- [x] **Proof（对称性）**：新增/扩展 test 断言 `source:'flux'` 与 `binding.expression` 错误走同一 `reportDiagnostic` 出口与同一错误码族（关闭「三个声明源 observably asymmetric」）。

Exit Criteria:

- [x] pipeline 层 expression/binding/scale 求值失败在生产装配下可达 `reportDiagnostic` + `monitor.onError`（integration test 挂载真实 `useScadaEngine`，断言错误到达，**非** not.toThrow）。
- [x] 错误码与桥接层对称（`flux-compile-failed`/`flux-evaluate-failed`），三个声明源 observably symmetric。
- [x] `design-renderer.md` 诊断通道章节注记 pipeline `onError` 通道已接线（与桥接层/engine handler-error 三通道对称），`design-data-binding.md` 错误码对称注记同步。

### Phase 4 - Fix shadow revert completeness in StateVisualApplier（open P1-1）

Status: completed
Targets: `packages/flux-renderers-industrial/src/symbols/visual-state.ts`、`symbols/state-visual.test.ts`

- Item Types: `Proof | Fix | Decision`

- [x] **Proof（failing-first，翻转既有缺陷测试）**：既有 `state-visual.test.ts:201-239`（"should keep fields without a resettable base value tracked (shadow revert edge)"）当前**断言缺陷**（退出 fault 态后 shadow 残留）。先翻转该测试——把 `:224-229` 退出后断言改为「shadow 已清除（reset default）」、`setFlag(1)` 重入后再应用——确认翻转后该 test **红**（当前实现仍残留 shadow）。该 test 的前提「without a resettable base value」因 Phase 4 fix 失效，需同步更新 test 标题/注记为「shadow revert on state exit」。若需更强 failing-first，另加 builtin 图元（无 base shadow）+ `states.alarm.style.shadow` + 退出到 normal，断言 revert patch 含 shadow 清除值 + `applied` 集不含 `'shadow'`。
- [x] **Decision**：shadow reset 值裁定——核实 leafer 契约：清除 shadow 的合法表示（`shadow: undefined` / `shadow: null` / 零效 shadow 对象）。`STYLE_RESET_DEFAULTS` 需补一个「非 undefined 且 leafer 接受为无 shadow」的 reset 值（使 `if (revert !== undefined)` 为 true）。若 leafer 接受 `null` 清除则用 `null`；否则用零效对象 `{x:0,y:0,blur:0,color:'transparent'}`（实现时以 leafer-ui@2.2.9 dist 行为为准；翻转后的 test 期望值须与所选 reset 表示一致）。
- [x] **Fix**：`STYLE_RESET_DEFAULTS` 补 `shadow` reset 值（按 Decision 裁定）。
- [x] **Fix（结构守卫）**：使 `STYLE_RESET_DEFAULTS` 对 `ScadaSymbolStylePatch` 全部键穷尽——补类型守卫或注释断言「reset map 覆盖 `keyof ScadaSymbolStylePatch`」，防止未来新增 style 字段再次机械遗漏（关掉「per-field 枚举总比类型契约少一个」类）。
- [x] **Fix（防御）**：hoist `applied.delete(key)` 到 `if (revert !== undefined)` 守卫**之外**（revert 分支内），使「缺失 reset default」无法泄漏追踪条目（belt-and-suspenders；与穷尽 reset map 配合）。
- [x] **Proof**：上述 failing-first test 转绿（退出 alarm → shadow 清除 + `applied` 不含 shadow）。
- [x] **Proof（不回归）**：既有 `state-visual.test.ts` 的 fill/opacity/visible/rotation revert 用例 + W3 binding-vs-revert 用例（`applied.delete` 在有 binding 时跳过 revert 的分支）保持绿。`state-visual.test.ts:201-239` 已按 failing-first 项**翻转为断言正确行为**（非保持原「残留」断言）。

Exit Criteria:

- [x] builtin 图元（无 base shadow）声明 `states.alarm.style.shadow` 时，退出到 normal 后 shadow 被清除（revert patch 含 reset 值）、`applied` 集不含 `'shadow'`（test 断言结果值，非仅 call-count）。
- [x] `STYLE_RESET_DEFAULTS` 对 `ScadaSymbolStylePatch` 穷尽（结构守卫就位），既有 revert 用例不回归。
- [x] `visual-state.ts:10-19` 注记补「reset map 由 `keyof ScadaSymbolStylePatch` 穷尽 + `applied.delete` hoist」结构守卫说明。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 plan guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session（round 1 `ses_02c4caa66ffeKi1bo7x57zNM4y`，round 2 `ses_02c49a577ffeRjSJhSwwdO45TN`）
- Verdict: `pass-with-minors`（2 轮后达成共识，零 Blocker / 零 Major）
- Rounds: 2
- Findings addressed:
  - **Round 1 Major（已解决）**：Current Baseline open-P1-1 段误称「无任何用例在 state style 中使用 shadow」——实际 `state-visual.test.ts:201-239` 使用 shadow 且把缺陷（退出后残留）断言为预期。已修正 Current Baseline 表述、Phase 4 failing-first Proof 改为「翻转该既有缺陷测试」、Phase 4 不回归 Proof 明示该测试须翻转为断言正确行为。Round 2 独立核对 live repo 确认解决。
  - **Round 1 Minors（3 项，非阻塞，已折入 Decision「实现注意」）**：Phase 2 reverse-index 类型访问（bridge runtime 类型无 reverseIndex、`pointIds()` 返并集无 scope-only 方法）；Phase 3 `evaluateFlux` compile/evaluate 阶段区分 + onError 签名 ripple 到 3 个 test harness（`refresh-pipeline.test.ts:32`、`binding-expression-unification.test.ts:38`、`scada-robustness-hardening.test.ts:339`）。均标注为实现细节、不改变 closure surface，执行时处理。
- Reference verification：4 条 P1 的文件路径/行号/函数名/代码片段均经独立子 agent live repo 核对确认（`wc -l`=749/726、`STYLE_RESET_DEFAULTS` 缺 shadow、`analyzeFluxSubscriptions` 仅扫 variables、`createBindingDomain` 无 onError、`state-visual.test.ts:201-239` 编码缺陷）。

## Closure Gates

> 关闭条件：本 section 所有条目 + 每个 Phase Exit Criteria 全部 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] open P1-1 confirmed live defect 已修复（shadow revert + 结构守卫 + regression proof）。
- [x] multi P1-1 confirmed contract drift 已收敛（binding-expression scope 订阅并集 + integration proof）。
- [x] multi P1-2 confirmed contract drift 已收敛（RefreshPipeline.onError 生产接线 + 错误码对称 + integration proof）。
- [x] multi P1-3 hard-gate 失败已恢复（oversized-code-files industrial 包 0 失败）。
- [x] 必要 focused verification 已完成（4 条 P1 各带断言结果值/可见性/错误到达的 proof，非仅 not.toThrow 或 call-count）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（25 P2 已显式移出 scope 到 roadmap backlog，各带源审计路径）。
- [x] 受影响 owner docs 已同步到 live baseline（`design-data-binding.md` §9.1 + 错误码对称、`design-renderer.md` pipeline onError 通道、`visual-state.ts` 结构守卫注记）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check:oversized-code-files`（industrial 包 0 失败）

## Deferred But Adjudicated

> 本 plan 无 deferred 项。25 条 P2 不是「本 plan in-scope 但降级」的项，而是审计显式判定 non-blocking、triage 到 roadmap Follow-up Backlog 的独立条目（各带源审计路径）。multi P1-2 修复后仍存在的 debuggability residual（`evaluateFlux` 错误上下文塌缩 multi P2-4、`handler-error` telemetry multi P2-5、cycle depth cap multi P2-6）同样在 backlog 追踪，非本 plan scope。

## Non-Blocking Follow-ups

- 见 `docs/components/roadmap-industrial-hmi.md` Follow-up Backlog「2026-08-05-2129 post-remediation audit P2」子节（25 条，各带源审计路径）。

## Closure

Status Note: 4 条 P1 全部收口。open P1-1（shadow revert + STYLE_RESET_DEFAULTS 穷尽守卫 + applied.delete hoist）、multi P1-1（binding-expression scope 订阅并集）、multi P1-2（RefreshPipeline.onError 生产接线 + 错误码对称）、multi P1-3（oversized-code-files industrial 包 0 失败）四项 confirmed live defect 已修复并各带 focused regression / integration proof（断言结果值 42/60/6、shadow reset default、错误到达 reportDiagnostic/monitor.onError 的 flux-\* 码族，非仅 not.toThrow 或 call-count）。包级 687 tests / 54 files 全绿、workspace 全量验证（typecheck/build/lint 32/32 + test 59/59）全绿。源审计 `Audit Status: planned → closed`（两份）。25 P2 已在 roadmap Follow-up Backlog「2026-08-05-2129 post-remediation audit P2」追踪。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session（task `ses_02bb6a641ffe7eR3pBVTw6MA5v`，general subagent，非执行 session）
- Verdict: `pass`（零 Blocker / 零 Major）
- Evidence: 独立 walk-through live repo 逐条核对——(1) open P1-1 `visual-state.ts:18,30,109` STYLE_RESET_DEFAULTS 为 `Record<keyof ScadaSymbolStylePatch, unknown>` 穷尽 + shadow reset + applied.delete hoist，`state-visual.test.ts:201-243` 翻转为断言退出后 shadow 清除；(2) multi P1-1 `use-scada-points-bridge.ts:105-132,243-249` 订阅并集，`binding-expression-scope-integration.test.tsx` 挂真实桥接边界断言 text=42→60、nested=6（非 pipeline 直驱）；(3) multi P1-2 `use-scada-engine.ts:67,90,193,281` + `scada-canvas.tsx:182` onPipelineError=reportDiagnostic + `dirty-collector.ts` evaluateFlux discriminated outcome emit flux-compile/evaluate-failed，`scada-canvas-diagnostic-channels.test.tsx:312+` 断言错误到达 monitor.onError + 对称性 proof；(4) multi P1-3 两源文件已删 + 8 兄弟均 <700 行（wc -l 实测），industrial 包 0 文件 >700（ERROR 桶 14 文件全在其他包，out-of-scope）。机械门禁复跑：industrial typecheck/lint/test 全绿、check:oversized industrial 0 失败。

Follow-up:

- 25 条 P2 在 roadmap Follow-up Backlog 追踪（各带源审计路径）；无 plan-owned remaining work。
