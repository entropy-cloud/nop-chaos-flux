# 143 Unit Test Coverage 80% Target Plan

> Plan Status: partially completed
> Last Reviewed: 2026-04-27
> Source: Coverage audit via `vitest run --coverage` across all packages
> Related: None

## Purpose

将所有核心包（flux-core, flux-formula, flux-compiler, flux-runtime, flux-react, flux-renderers-basic, flux-renderers-form, flux-renderers-data, flux-renderers-form-advanced）的行覆盖率提升至 80% 以上，并修复已有失败测试。

## Current Baseline

- Execution update (2026-04-26): `flux-runtime` now clears its enforced package gate at `87.78%` statements, `80.16%` branches, `90.48%` functions, and `88.28%` lines after targeted tests for async-governance and form-owner lifecycle branches.
- Execution update (2026-04-26): `flux-renderers-data` now clears its enforced package gate at `92.32%` statements, `80.04%` branches, `94.23%` functions, and `93.33%` lines after focused coverage on chart, CRUD state, table controls, quick-edit, and virtual/body helper paths.
- Active remaining work is still substantive and in-scope: `flux-renderers-form` currently has a failing/timed-out validation test under coverage, and `flux-renderers-form-advanced` still misses the enforced 80% branch threshold.

### 覆盖率现状 (2026-04-26 audit)

| 包 | Stmts | Branch | Funcs | Lines | 达标? |
|---|-------|--------|-------|-------|-------|
| flux-core | 79.7% | 67.5% | 78.6% | 84.1% | Lines OK, Stmts 接近 |
| flux-formula | 83.9% | 71.6% | 94.8% | 83.4% | 达标 |
| flux-compiler | 67.2% | 58.4% | 71.1% | 67.4% | 不达标 |
| flux-runtime | 73.0% | 63.1% | 74.3% | 73.3% | 不达标 |
| flux-react | 75.8% | 63.4% | 75.9% | 77.2% | 不达标 |
| flux-renderers-basic | 88.2% | 70.1% | 90.8% | 88.7% | 达标 |
| flux-renderers-form | (有2个失败测试) | | | | 需修复后确认 |
| flux-renderers-data | (有17个失败测试) | | | | 需修复后确认 |
| flux-renderers-form-advanced | 53.1% | 41.0% | 49.6% | 54.8% | 严重不达标 |

### 关键低覆盖率模块

**flux-compiler (67.2% Stmts):**
- `action-compiler.ts` (~65%) — legacy payload extraction, parallel branch, isNodeFullyStatic
- `tables.ts` (47%) — table schema compilation
- `schema-compiler/source-validation.ts` (53%) — source validation rules
- `schema-compiler/schema-validation.ts` (58%) — schema-level validation
- `schema-compiler/collection-validation.ts` (58%) — collection validation
- `schema-compiler/schema-compiler.ts` (66%) — main compiler, many branches untested
- `schema-compiler/symbol-helpers.ts` (41%) — symbol resolution helpers
- `schema-compiler/host-action-validation.ts` — validateHostAction, recursive shape validation

**flux-runtime (73.0% Stmts):**
- `validation/validators.ts` (36%) — 11 of 15 validators untested
- `validation/message.ts` (37%) — most message branches untested
- `validation/rules.ts` (0%) — entire file untested (15 lines, pure function)
- `form-runtime-array-ops.ts` (13%) — 6 of 7 mutation ops untested
- `page-runtime.ts` (35%) — scope subscription and change tracking
- `status-owner.ts` (27.5%) — scope proxy logic and caching
- `import-stack.ts` (33%) — import resolution stack
- `scope-reaction-helpers.ts` (42%) — reaction helper functions
- `form-runtime-values.ts` (61%) — value operations
- `form-runtime-subtree.ts` (0%) — subtree operations

**flux-react (75.8% Stmts):**
- `dialog-host.tsx` (75%) — dialog/drawer rendering components
- `dialog-host-surface.tsx` (70%) — surface scope providers
- `dialog-visibility.ts` (56%) — dialog visibility logic
- `defaults.ts` (0%) — default configuration
- `form-state.ts` (51%) — form state hooks
- `helpers.tsx` (56%) — renderer helpers
- `error-boundary.tsx` (33%) — error boundary component
- `slot-frame.ts` (17%) — slot frame rendering
- `dialog-controller.ts` (18%) — dialog controller
- `workbench/` (43%) — workbench hooks and shell
- `schema-renderer.tsx` (20%) — schema renderer component

**flux-renderers-form-advanced (53.1% Stmts):**
- `condition-builder/` (1.5%) — nearly entire directory untested
- `composite-field/object-field.tsx` (40%) — object field rendering
- `composite-field/composite-field-runtime.ts` (23%) — item scope/form proxy
- `composite-field/composite-item-id.ts` (0%) — item ID utilities
- `variant-field/variant-field-runtime.ts` (34%) — variant scope/form proxy

### 已有失败测试

- `flux-renderers-form`: 2个失败 (`validates fields on blur and renders async validating feedback`)
- `flux-renderers-data`: 17个失败 (主要是 `data-source` 和 `data-crud-state-interactions` 测试)

## Goals

- 所有核心包 Stmts 和 Lines 覆盖率达到 80% 以上
- 所有现有测试通过（0 failures）
- 为每个 vitest config 添加 coverage 配置和 80% threshold
- 修复已有失败测试

## Non-Goals

- 不追求 100% 覆盖率
- 不涉及 e2e 测试（仅 unit test）
- 不涉及 `flow-designer-*`, `spreadsheet-*`, `report-designer-*`, `word-editor-*`, `nop-debugger`, `ui` 等辅助/专业包的覆盖率提升（它们有自己的覆盖需求）
- 不重构已有实现代码

## Scope

### In Scope

- 修复 `flux-renderers-data` 和 `flux-renderers-form` 的失败测试
- 为 flux-compiler 补充测试到 80%+
- 为 flux-runtime 补充测试到 80%+
- 为 flux-react 补充测试到 80%+
- 为 flux-renderers-form-advanced 补充测试到 80%+
- 为 flux-core 补充测试到 80%+
- 为每个包配置 coverage threshold

### Out Of Scope

- 辅助包覆盖率（flow-designer, spreadsheet, report-designer, word-editor, nop-debugger, ui）
- e2e 测试
- 代码重构
- 性能优化

## Execution Plan

### Phase 1 — 修复已有失败测试

Status: completed
Targets: `packages/flux-renderers-data/src/__tests__/`, `packages/flux-renderers-form/src/__tests__/`

- [x] 修复 `flux-renderers-form` 的 2 个失败测试 (`validates fields on blur and renders async validating feedback`)
- [x] 修复 `flux-renderers-data` 的 `data-source.test.tsx` 失败测试 (fetch/data 相关，`Cannot read properties of undefined (reading 'url')`)
- [x] 修复 `flux-renderers-data` 的 `data-crud-state-interactions.test.tsx` 失败测试
- [x] 修复 `flux-renderers-data` 的 `data-table.test.tsx` 失败测试

Exit Criteria:
- [x] `pnpm --filter @nop-chaos/flux-renderers-form test` 全部通过
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test` 全部通过
- [ ] `pnpm test` 全部通过
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 — Quick Wins: 纯函数模块覆盖率

Status: completed
Targets: `packages/flux-runtime/src/validation/`, `packages/flux-runtime/src/form-runtime-array-ops.ts`

优先测试纯函数模块，无需 React 环境或复杂 mock，投入产出比最高。

- [x] `validation/rules.ts` (0% → 100%) — 15 行纯函数，测试所有 case 分支
- [x] `validation/validators.ts` (36% → 90%+) — 补充 11 个未测验证器的测试：
  - minLength, maxLength, minItems, maxItems
  - atLeastOneFilled, allOrNone
  - pattern, email
  - notEqualsField, requiredWhen, requiredUnless
- [x] `validation/message.ts` (37% → 90%+) — 与 validators 联动测试所有消息分支
- [x] `form-runtime-array-ops.ts` (13% → 90%+) — 测试所有 7 个 mutation ops：
  - prepend, insert, remove, move, swap, replace
  - 边界情况：空数组、单元素数组、同索引 move/swap

Exit Criteria:
- [x] `pnpm --filter @nop-chaos/flux-runtime test` 全部通过
- [x] `validation/rules.ts` Lines ≥ 95%
- [x] `validation/validators.ts` Lines ≥ 90%
- [x] `validation/message.ts` Lines ≥ 90%
- [ ] `form-runtime-array-ops.ts` Lines ≥ 90%
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 — flux-compiler 覆盖率提升

Status: completed
Targets: `packages/flux-compiler/src/`

- [x] `action-compiler.ts` (65% → 80%+) — 测试 legacy payload extraction, parallel branch, isNodeFullyStatic
- [x] `tables.ts` (47% → 80%+) — 测试 table schema compilation 路径
- [x] `schema-compiler/source-validation.ts` (53% → 80%+) — 测试 source validation 规则
- [x] `schema-compiler/schema-validation.ts` (58% → 80%+) — 测试 schema-level validation
- [x] `schema-compiler/collection-validation.ts` (58% → 80%+) — 测试 collection validation
- [x] `schema-compiler/symbol-helpers.ts` (41% → 80%+) — 测试 symbol resolution
- [x] `schema-compiler/schema-compiler.ts` (66% → 80%+) — 补充主编译器分支测试

Exit Criteria:
- [x] `pnpm --filter @nop-chaos/flux-compiler test` 全部通过
- [x] flux-compiler 整体 Stmts ≥ 80%
- [x] `docs/logs/` 对应日期条目已更新

### Phase 4 — flux-runtime 剩余模块覆盖率

Status: completed
Targets: `packages/flux-runtime/src/`

- [x] `page-runtime.ts` (35% → 80%+) — 测试 scope subscription, change tracking, refresh
- [x] `status-owner.ts` (27.5% → 80%+) — 测试 createReadonlyScopeBinding, get/has/readVisible/materializeVisible
- [x] `import-stack.ts` (33% → 80%+) — 测试 import resolution 路径
- [x] `async-data/async-governance.ts` (61.29% Branch → 90.32%) — 补充 current/stale/cancelled/retention 分支测试
- [x] `form-runtime-values.ts` (61% → 80%+) — 测试 value 操作
- [x] `form-runtime-subtree.ts` (0% → 80%+) — 测试 subtree 操作
- [x] `form-runtime-array.ts` (47% → 80%+) — 测试 array runtime
- [x] `form-runtime-submit-flow.ts` (73% → 84.37% Branch) — 测试 submit flow 边界
- [x] `form-runtime-owner-lifecycle.ts` (59.09% Branch → 86.36%) — 补充 refresh/dispose 生命周期清理分支测试
- [x] flux-runtime package coverage now passes enforced thresholds: `87.78%` Stmts / `80.16%` Branch / `90.48%` Funcs / `88.28%` Lines

Exit Criteria:
- [x] `pnpm --filter @nop-chaos/flux-runtime test` 全部通过
- [x] flux-runtime 整体 Stmts ≥ 80%
- [x] `docs/logs/` 对应日期条目已更新

### Phase 5 — flux-react 覆盖率提升

Status: partially completed
Targets: `packages/flux-react/src/`

- [x] `form-state.ts` (51% → 80%+) — 测试 form state hooks
- [x] `helpers.tsx` (56% → 80%+) — 测试 renderer helper 函数
- [ ] `dialog-host.tsx` (75% → 80%+) — 测试 DialogView, DrawerView 组件渲染
- [x] `dialog-host-surface.tsx` (70% → 80%+) — 测试 SurfaceScopeProviders
- [ ] `dialog-visibility.ts` (56% → 80%+) — 测试 dialog visibility 逻辑
- [x] `error-boundary.tsx` (33% → 80%+) — 测试 error boundary 组件
- [x] `slot-frame.ts` (17% → 80%+) — 测试 slot frame rendering
- [x] `schema-renderer.tsx` (20% → 80%+) — 测试 schema renderer component
- [x] `workbench/hooks.ts` (66% → 80%+) — 测试 workbench hooks

Exit Criteria:
- [x] `pnpm --filter @nop-chaos/flux-react test` 全部通过
- [x] flux-react 整体 Stmts ≥ 80%
- [x] `docs/logs/` 对应日期条目已更新

### Phase 6 — flux-renderers-form-advanced 覆盖率提升

Status: partially completed
Targets: `packages/flux-renderers-form-advanced/src/`

- [ ] `condition-builder/condition-builder.tsx` (2.5% → 80%+) — 测试 ConditionBuilderRenderer 组件
- [ ] `condition-builder/condition-group.tsx` (0% → 80%+) — 测试 condition group 组件
- [x] `condition-builder/condition-item.tsx` (0% → 80%+) — 测试 condition item 组件
- [x] `condition-builder/field-select.tsx` (0% → 80%+) — 测试 field select 组件
- [ ] `condition-builder/operators.ts` (15% → 80%+) — 测试 operator 逻辑
- [ ] `condition-builder/value-input.tsx` (0% → 80%+) — 测试 value input 组件
- [x] `condition-builder/utils.ts` (0% → 80%+) — 测试 condition builder utilities
- [x] `condition-builder/id-utils.ts` (33% → 80%+) — 测试 ID utilities
- [ ] `composite-field/object-field.tsx` (40% → 80%+) — 测试 object field 渲染
- [x] `composite-field/array-field-runtime.ts` (23% → 80%+) — 测试 item scope/form proxy
- [x] `composite-field/composite-item-id.ts` (0% → 80%+) — 测试 item ID utilities
- [x] `variant-field/variant-field-runtime.ts` (34% → 80%+) — 测试 variant scope/form proxy

Exit Criteria:
- [x] `pnpm --filter @nop-chaos/flux-renderers-form-advanced test` 全部通过
- [x] flux-renderers-form-advanced 整体 Stmts ≥ 80%
- [x] `docs/logs/` 对应日期条目已更新

### Phase 7 — flux-core 覆盖率微调 + Coverage Threshold 配置

Status: partially completed
Targets: `packages/flux-core/src/validation-model.ts`, 所有包的 `vitest.config.ts`

- [x] `flux-core/validation-model.ts` (68.85% → 80%+) — 补充 validation model 测试
- [x] 为所有核心包配置 coverage `include` 和 `thresholds`:
  - flux-core: 80% threshold
  - flux-formula: 80% threshold (已 70%，需提升)
  - flux-compiler: 80% threshold
  - flux-runtime: 80% threshold
  - flux-react: 80% threshold
  - flux-renderers-basic: 80% threshold
  - flux-renderers-form: 80% threshold
  - flux-renderers-data: 80% threshold
  - flux-renderers-form-advanced: 80% threshold

Exit Criteria:
- [x] flux-core 整体 Stmts ≥ 80%
- [x] 所有核心包 `vitest.config.ts` 包含 `coverage.thresholds` 且设为 80%
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过
- [ ] `pnpm lint` 通过
- [ ] `pnpm test` 通过
- [x] `docs/logs/` 对应日期条目已更新

## Validation Checklist

- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过
- [ ] `pnpm lint` 通过
- [ ] `pnpm test` 通过（0 failures）
- [x] 所有核心包 Stmts ≥ 80%
- [x] 所有核心包 Lines ≥ 80%
- [x] `flux-renderers-data` 和 `flux-renderers-form` 失败测试已修复
- [x] Coverage threshold 已配置在 `vitest.config.ts` 中
- [x] `docs/logs/` 已更新
- [x] 独立子 agent closure-audit 已完成并记录证据

## Closure

Status Note: Independent closure audit still confirms the plan is only partially complete. The targeted packages now have substantially expanded unit coverage, and `flux-runtime`, `flux-react`, and `flux-renderers-data` all clear their enforced 80% gates package-locally. However, `flux-renderers-form` still has a failing/timed-out validation test under direct package coverage execution, and `flux-renderers-form-advanced` still misses the enforced 80% branch gate, so substantive in-scope work remains.

Closure Audit Evidence:

- Reviewer / Agent: independent subagent closure audit
- Evidence: `ses_237c93997ffeK62ineF4gYSnQc` — audit found partial completion only: `flux-core` and `flux-compiler` clear 80% gates, but `flux-runtime` branches, `flux-react` branches/functions, `flux-renderers-form`, `flux-renderers-data`, and `flux-renderers-form-advanced` still miss current enforced thresholds.
- Post-audit execution update: package-local verification on 2026-04-26 moved `flux-runtime` over the enforced gate (`pnpm --filter @nop-chaos/flux-runtime typecheck`, `build`, `lint`, `test`, and `pnpm exec vitest run --config vitest.config.ts --coverage` all pass locally).
- Post-audit execution update: package-local verification on 2026-04-26 moved `flux-renderers-data` over the enforced gate (`pnpm --filter @nop-chaos/flux-renderers-data typecheck`, `build`, `lint`, `test`, and `pnpm exec vitest run --config vitest.config.ts --coverage` all pass locally) with final package coverage at `92.32%` statements / `80.04%` branches / `94.23%` functions / `93.33%` lines.
- Reviewer / Agent: independent subagent closure audit
- Evidence: `ses_235a1832fffeBbNYQhAWMXCLFx` — re-audit against the current live repo confirms partial completion remains: `flux-runtime`, `flux-react`, and `flux-renderers-data` now clear enforced package gates, but `flux-renderers-form` fails package coverage execution on `src/__tests__/form-validation-rules.test.tsx` timeout and `flux-renderers-form-advanced` still fails the enforced 80% branch threshold.
- Plan-level verification update (2026-04-27): workspace `pnpm typecheck`, `pnpm build`, and `pnpm lint` complete successfully from repo root; workspace `pnpm test` progressed successfully through most packages but still timed out before the full recursive run returned, so it is supportive evidence only and not closure evidence by itself.

Follow-up:

- 辅助包覆盖率（flow-designer, spreadsheet, report-designer, word-editor, nop-debugger, ui）不在本计划 scope 内，可由后续专项计划覆盖
- Remaining plan-owned work: fix the `flux-renderers-form` timed-out validation test under coverage, raise `flux-renderers-form-advanced` branch coverage to the enforced 80% gate, then re-run final plan-level verification and a fresh closure audit before marking this plan `completed`.
