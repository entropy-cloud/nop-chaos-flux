# 2 createScope/disposeScope 配对纪律（09-01 + 09-02，10 处一次性求值 scope 泄漏）

> Plan Status: completed
> Mission: component-audit
> Work Item: 一次性 scope 生命周期配对（follow-up backlog 家族：09-01 / 09-02）
> Last Reviewed: 2026-08-06
> Source: `docs/audits/2026-08-06-0711-multi-audit-component-audit.md`（[P2] 09-01 / 09-02）、`docs/backlog/component-audit-roadmap.md`（Follow-up Backlog 2026-08-06-0711 节）
> Related: `docs/plans/2026-08-06-2306-1-event-dispatch-ctx-full-scan.md`（同轮，独立家族）

## Purpose

修复渲染器在一次性求值路径上 `helpers.createScope()` 无配对 `helpers.disposeScope()` 的资源泄漏（render 期 4 处 + 交互/事件路径 6 处，跨 4 个 renderer 包：data/basic/form-advanced/form），使 `ownedScopeDisposers`（`runtime-factory.ts:369-371`）不再为一次性查询语义累积 scope + store + disposer 闭包；并对 `docs/architecture/renderer-runtime.md` 补强「一次性求值优先 evaluationBindings」指引（multi-audit 跨维度模式 #3 建议）。

## Current Baseline

- **契约**：`docs/architecture/renderer-runtime.md:246-253`——「renderers that retain child scopes across renders must dispose those scopes explicitly」；`:251` `helpers.disposeScope(scopeId)` 是显式配对 teardown hook。每次 `createChildScope` 注册进 `ownedScopeDisposers` Map（`runtime-factory.ts:369-371`），不 dispose 则累积到 runtime 销毁。
- **泄漏点**（live 核对，2026-08-06）：
  - **render 期（09-01，4 处跨 3 包）**：
    - `packages/flux-renderers-data/src/table-renderer/use-table-selection.ts:97-121`（useMemo 内每行 createScope 求值 `checkableWhen`，无 dispose）
    - `packages/flux-renderers-basic/src/loop.tsx:82-94,105-117`（两处 bindingsScope）
    - `packages/flux-renderers-basic/src/recurse.tsx:88`（bindingsScope）
    - `packages/flux-renderers-form-advanced/src/variant-field/variant-field-matching.ts:45-56`（经 variant-field-controller.ts:48-62 render 期调用）
  - **交互/事件路径（09-02，6 处）**：
    - `packages/flux-renderers-data/src/table-renderer/use-table-lazy-children.ts:60`
    - `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx:106`（condition-builder 为目录，live 文件路径含子目录）
    - `packages/flux-renderers-form-advanced/src/tree-control-controllers.ts:48`
    - `packages/flux-renderers-form-advanced/src/picker-renderer.tsx:196`
    - `packages/flux-renderers-data/src/table-renderer/table-event-context.ts:17`
    - `packages/flux-renderers-form/src/renderers/use-select-remote-search.ts:54`
- **正确配对先例**（同包已有）：upload-field、list-renderer、crud、row-scope-cache 均有 createScope→disposeScope 配对。
- **替代通道**：renderer-runtime.md:253/257-271——一次性求值优先 `evaluationBindings` 覆盖层（一次性查询语义不创建 runtime-owned scope）；`evaluate(expr, scope)` 可直接用父 scope + evaluationBindings。
- **验证基线**：CV full-green（2026-08-06）；受影响的 data/basic/form-advanced/form 包单测绿。

## Goals

- 10 处泄漏点全部落地「求值后配对 `disposeScope`」或「改 evaluationBindings 一次性通道」，`ownedScopeDisposers` 不再因一次性查询累积。
- 每处修复带 focused 测试（断言 scope 被 dispose / 行为等价无回归）。
- `renderer-runtime.md` 补强一次性求值指引（evaluationBindings 优先 + 明确 disposeScope 配对义务示例）。

## Non-Goals

- 不重构长期持有行 scope 的缓存机制（table row-scope-cache 等已有生命周期管理，属既有正确先例）。
- 不处理 09-03（carousel/tabs type 命名空间，plan 1）。
- 不做全仓「所有 createScope 点」的清扫——只处理审计确认的 10 处一次性求值泄漏点；扫描中发现的同型新点（若有）逐点裁决并入。

## Scope

### In Scope

- 上述 10 处泄漏点修复（配对 disposeScope 或 evaluationBindings 迁移）。
- 每处 focused 测试（先红后绿或行为等价断言）。
- `renderer-runtime.md` 一次性求值指引强化（对应 multi-audit §6 模式 #3 建议）。

### Out Of Scope

- 事件 ctx 家族（plan 1）、useScopeSelector 门控（后续轮次）、scheduling/graph 接线（plan 3）。
- 其余 2026-08-06-0711 P2 条目。

## Failure Paths

> 不适用：纯内部资源生命周期修复，无外部 IO/鉴权/错误码契约。风险形态为「修复后行为不等价」或「dispose 顺序破坏」——由 focused 行为测试覆盖。

## Test Strategy

本档选择：`必须自动化`（跨包 runtime 资源生命周期契约；每处修复必须有 focused 测试断言 dispose 被调用且行为等价——对应 AGENTS.md Bug Fix Test Coverage Rule 与 renderer-runtime.md 契约）。

## Execution Plan

### Phase 1 - 泄漏点清单与测试先红（Proof）

Status: completed
Targets: 各泄漏点所在包 `__tests__/`

- Item Types: `Proof`

- [x] 逐处编写 focused 测试（spy `helpers.createScope`/`disposeScope`，或断言求值结果正确 + scope dispose 被调用）：use-table-selection（checkableWhen 行判定）、loop/recurse（bindingsScope 求值）、variant-field-matching（when 匹配）、use-table-lazy-children、condition-builder、tree-control-controllers、picker-renderer、table-event-context、use-select-remote-search。
- [x] **Decision（修复通道分型）**：逐处裁决「配对 disposeScope」或「evaluationBindings 一次性通道」——`helpers.evaluate/evaluateCompiled` 只接受 `(target, scope)` 无 bindings 参数，故 **render 期同步求值点（7 处）默认走配对 disposeScope**（同步求值后立即 dispose，简单可靠）；**dispatch 点（use-table-lazy-children/tree-control-controllers/use-select-remote-search）**因 scope 流入异步 action 求值且 host fetcher 直接读 `ctx.scope`（tree 测试实证），保留 scope 并 **promise settle 后（`.finally()`）dispose**（先试 evaluationBindings 纯迁移，被 tree-lazy-children/tree-remote-search 既有测试证伪——fetcher 读 `ctx.scope.readVisible()` 的可见性契约依赖 patched child scope，故弃用）；variant-field 的注入式 createScope 扩展签名（`disposeScope` 注入，controller 传 `props.helpers.disposeScope`）；table-event-context 不建子 scope，按既有约定 `{ event, evaluationBindings, scope: rootScope }`（kanban-board.tsx:148-152 先例）。裁决理由已逐处记录于 Phase 2/3 条目。
- [x] 确认测试在修复前失败（dispose 未调用断言红，或行为等价基线测试先行登记）。

Exit Criteria:

- [x] 每处泄漏点对应测试文件存在且修复前红（或无法 spy 时至少行为等价基线测试绿，dispose 断言以可观测方式登记）。

### Phase 2 - render 期 4 处修复

Status: completed
Targets: `use-table-selection.ts`、`loop.tsx`、`recurse.tsx`、`variant-field-matching.ts`

- Item Types: `Fix | Proof`

- [x] use-table-selection.ts:97-121——求值后配对 `helpers.disposeScope(scopeId)`（try/finally 或求值后立即 dispose），或按 renderer-runtime.md 指引改 evaluationBindings 一次性通道（该点属 render 期同步求值，默认配对 dispose）；行为等价。
- [x] loop.tsx:82-94,105-117、recurse.tsx:88——同一模式（同步求值后立即 dispose）。
- [x] variant-field-matching.ts:45-56——按 Phase 1 裁决（注入式 createScope 签名扩展：新增 `disposeScope` 参数，matchesVariant/detectMatchedVariant/resolveInitialVariant 透传，controller 传 `props.helpers.disposeScope`）。
- [x] 各包 typecheck + focused 测试绿 + 该包既有测试全绿。

Exit Criteria:

- [x] 4 处 render 期点均无未配对 createScope（live grep 复验 + dispose 断言测试绿）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-{data,basic,form-advanced} typecheck` 通过、单测绿。

### Phase 3 - 交互/事件路径 6 处修复

Status: completed
Targets: `use-table-lazy-children.ts`、`condition-builder.tsx`、`tree-control-controllers.ts`、`picker-renderer.tsx`、`table-event-context.ts`、`use-select-remote-search.ts`

- Item Types: `Fix | Proof`

- [x] 6 处逐一按 Phase 1 裁决落地：dispatch 点（use-table-lazy-children/tree-control-controllers/use-select-remote-search）scope 流入异步 action——保留 scope 于 promise settle 后（`.finally()`）配对 dispose（host fetcher 读 `ctx.scope` 契约；tree 既有测试实证 evaluationBindings 纯迁移不可行），不得在 dispatch 前立即 dispose；table-event-context 按既有约定 `{ event, evaluationBindings, scope: rootScope }` 不创建子 scope（kanban-board.tsx:148-152 先例，签名收敛为 `{ event, scope }`，四 hook 10 调用点传 `renderScope`，3 个既有 hook 级测试断言同步新契约）；condition-builder/picker-renderer 同步求值点直接配对 dispose。
- [x] 各包 typecheck + focused 测试绿 + 该包既有测试全绿。

Exit Criteria:

- [x] 6 处交互路径点均无未配对 createScope（live grep 复验 + dispose 断言测试绿）。
- [x] data/form-advanced/form 包 typecheck + 单测绿。

### Phase 4 - owner-doc 补强与收口

Status: completed
Targets: `docs/architecture/renderer-runtime.md`、`docs/logs/`

- Item Types: `Fix | Decision`

- [x] renderer-runtime.md 一次性求值节（:253/:257-271 附近）补强：新增「One-shot evaluation scope discipline (09-01/09-02)」节——明确「一次性查询语义不得创建 runtime-owned scope（ownedScopeDisposers 累积机制）；优先 evaluationBindings；确需 createScope 时必须立即配对 disposeScope（同步求值 try/finally / 异步 dispatch settle 后 `.finally()`）」，并列出 upload-field/list-renderer/crud/row-scope-cache 等配对先例。
- [x] 全仓复扫 `createScope(` 无配对点（`rg` 抽查）+ 受影响 4 包单测全绿 + daily log 收口记录。

Exit Criteria:

- [x] renderer-runtime.md 指引文本与 live 行为一致（无 createScope 无 dispose 的 in-scope 残留）。
- [x] daily log 记录修复清单与验证结果。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立 fresh session（task `ses_0285f0e98ffecfb0Poke3V0bet`）
- Verdict: pass（0 Blocker / 0 Major；7 Minor 全部处理：condition-builder 目录路径、包计数 3→4、evaluationBindings 通道仅限 dispatch 点、异步 dispatch `.finally()` dispose、table-event-context 约定不建子 scope、variant-field 签名扩展、Closure Gate 措辞）
- Rounds: 1
- Findings addressed: Minor-1..7（见上）——Phase 1 新增修复通道分型 Decision，Phase 2/3 按分型落地，Closure Gate 措辞对齐

## Closure Gates

- [x] 10 处 in-scope 泄漏点全部配对（或迁移 evaluationBindings），全仓 live 复扫零 in-scope 残留
- [x] 每处 focused 测试落地且绿（dispose 断言适用于配对方案处；evaluationBindings 方案处为行为等价断言）
- [x] renderer-runtime.md 一次性求值指引已补强
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 项
- [x] 受影响的 owner docs 已同步（renderer-runtime.md + daily log；无其他 owner-doc 变更）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 扫描中发现的非清单 createScope 点（若有）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 若 Phase 1 扫描发现清单外点：逐点裁决——同型立即并入本 plan；属长期持有/缓存机制（table row-scope-cache 等）的登记为既有正确先例排除；不存在则为空
- Successor Required: `no`
- Successor Path: n/a

## Non-Blocking Follow-ups

- 审计文档 `docs/audits/2026-08-06-0711-multi-audit-component-audit.md` 09-01/09-02 条目修复后回写 fixed。
- 未来可评估把「createScope 无配对」纳入机械扫描（`check:audit-*` 族，本 plan 不新增脚本——先以 grep 复扫验证，工具化建议登记 follow-up）。

## Closure

Status Note: 4 Phase 全 completed（2026-08-07）。验证基线 full-green：`pnpm typecheck` 32/32、`pnpm build` 32/32、`pnpm lint` 32/32（scheduling 1 条预存在 warning）、`pnpm test` 59/59 task 全绿；`pnpm check` 链仅 `check:oversized-code-files` 红（14 既有 pre-existing 命名清单零新增：tree-control-controllers.ts 725→733、table-renderer.tsx 736→735 均为 HEAD 已超限登记文件），其余 10 项逐项全绿。Closure-audit gate 由独立 fresh sub-agent session 执行，证据见下。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent（closure audit session）
- Evidence: 全量复核本 plan（4 Phase 项 + Exit Criteria 全 [x]，Status 全 completed，Plan Status: completed，Closure Gates 除独立审计项外全 [x]）。live 源码复扫 10 处泄漏点：use-table-selection.ts:105-116（try/finally）、use-table-lazy-children.ts:60/89（.finally() settle 后 dispose）、loop.tsx:87/96 + 114/123、recurse.tsx:88/97、variant-field-matching.ts:56/60（disposeScope 注入参数，controller.ts:53-54/62-63 传 props.helpers.disposeScope）、tree-control-controllers.ts:51/58 + 65/72（formula 同步 + action await settle 后 finally）、picker-renderer.tsx:194/202、condition-builder.tsx:106/114（仅 created 时 dispose）、use-select-remote-search.ts:53/86（.finally()）——所有 createScope 均配对 disposeScope；table-event-context.ts 不创建子 scope（{ event, evaluationBindings, scope }），9 个 createTableEventContext 调用点均传 root renderScope/args.scope，无残留 createScope。9 个 focused 测试文件全部存在且断言 dispose 配对 + 行为等价（table-selection-checkable、table-lazy-children、table-event-context、basic-loop-recurse、variant-field-matching、tree-control-controllers、picker-autofill、condition-builder-source、use-select-remote-search）。docs 核验：renderer-runtime.md:255 「One-shot evaluation scope discipline (09-01/09-02)」节存在且与 live 行为一致；roadmap 09-01/09-02 均 [x]；audit doc 09-01/09-02 修复状态: fixed；daily log 2026/08-07.md 含 plan 条目。独立跑测（fresh session）：@nop-chaos/flux-renderers-data 101 files / 731 tests、flux-renderers-basic 50 files / 487 tests、flux-renderers-form-advanced 134 files / 1046 tests、flux-renderers-form 87 files / 735 tests 全绿，与 executor 声称计数一致。Verdict: pass（0 Blocker / 0 Major / 0 Minor）。

Follow-up:

- 待关闭时填写
