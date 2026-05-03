# 167 Test Quality And Reliability Improvement Plan

> Plan Status: partially completed
> Last Reviewed: 2026-05-02
> Source: `docs/analysis/2026-05-01-deep-audit-full-2/14-test-coverage.md`, live code verification
> Related: `docs/plans/161-workspace-quality-and-dx-improvement-plan.md` (Phase 4 ui/action-core tests, Phase 1.7 no-explicit-any warn), `docs/plans/143-unit-test-coverage-80-percent-target-plan.md` (completed)

## Purpose

消除深度审核维度 14 中未被 Plans 161-166 覆盖的测试质量问题。核心问题不是覆盖率数值，而是测试可靠性：共享状态泄漏导致测试间耦合、709 处 `as any` 降低测试类型安全、跨领域大文件难以维护、test-support 工具采用率需提升。

## Current Baseline

- 359 个测试文件（packages + apps），~80,000 行测试代码，所有 24 个包均有测试
- Plan 143 已完成核心管道 9 包 80% 覆盖率目标
- Plan 161 Phase 4 覆盖 ui/action-core 测试文件新增（10 个 UI 组件测试），但未解决已有测试的质量问题
- Q01-Q03 vitest.config.ts 环境不匹配已由 Plan 161 Phase 1 规划
- Live code 验证：709 处 `as any` 在测试文件中（`rg "as any" -g "*.test.*" -c` 精确计数），1 处 describe.skip（benchmark 文件），15 个文件使用 fake timers
- test-support 工具（`@nop-chaos/flux-react` 的 `test-support-runtime.tsx`/`test-support-core.tsx`、`flow-designer-renderers` 的 `test-support.tsx`）有 66 个测试文件采用，全量 359 个测试文件中采用率约 18.4%
- 2026-05-02 deep audit 重新确认当前 hard-threshold mega tests 为：`flux-compiler/src/schema-compiler-registry.test.ts` (746 行)、`flux-compiler/src/schema-compiler-shape-validation.test.ts` (744 行)、`flux-react/src/__tests__/schema-renderer-runtime-core.test.tsx` (742 行)。这 3 个文件已超过仓库 `>700` 强制拆分阈值，必须由本计划 Phase 2 一并收口，而不是再分裂成第二个测试 successor plan。
- `data-crud-state-interactions.test.tsx` (643 行) 与 `form-tree-checkbox-fields.test.tsx` (680 行) 仍属 P1 跨领域热点，但优先级低于上述 3 个 hard-threshold 文件；它们继续纳入本计划 Phase 2 渐进处理。

## Goals

- 消除模块顶层共享可变状态导致的测试间耦合
- 拆分跨领域大文件为聚焦的单主题测试模块
- 降低测试中 `as any` 的数量，提升测试类型安全
- 提升 test-support 工具采用率

## Non-Goals

- 不提升覆盖率数值（Plan 143 已完成核心管道 80% 目标）
- 不新增 UI 组件 smoke test（Plan 161 Phase 4 已覆盖）
- 不处理 `ui` 包和 `flux-i18n` 的极低覆盖（Q18/Q19，P2，独立 follow-up）
- 不为 16 个无覆盖率阈值的包添加 threshold（Q20，P3，独立 follow-up）
- 不移除 `passWithNoTests`（Q21，P3，风险高于收益）
- 不处理 `describe.skip` 累积（Q08，仅 1 处，benchmark 文件合理）
- 不处理真实定时器 sleep（Q07，P2，非阻塞）

## Scope

### In Scope

| Finding                                                        | Severity | File                                                                              | Phase   |
| -------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------- | ------- |
| 模块顶层共享 expressionCompiler（stateless，风险低）           | P2       | `flux-react/src/__tests__/schema-renderer-runtime-core.test.tsx`                  | Phase 1 |
| 共享可变状态 submitCalls（手动重置，非 afterEach）             | P2       | `flux-renderers-form-advanced/src/__tests__/form-double-edit-regression.test.tsx` | Phase 1 |
| window 全局污染（globalThis.window 替换）                      | P1       | `nop-debugger/src/automation.test.ts`                                             | Phase 1 |
| schema-compiler-registry.test.ts 745 行跨领域                  | P1       | `flux-compiler/src/schema-compiler-registry.test.ts`                              | Phase 2 |
| schema-compiler-shape-validation.test.ts 744 行跨领域          | P1       | `flux-compiler/src/schema-compiler-shape-validation.test.ts`                      | Phase 2 |
| schema-renderer-runtime-core.test.tsx 742 行跨多个运行时测试域 | P1       | `flux-react/src/__tests__/schema-renderer-runtime-core.test.tsx`                  | Phase 2 |
| data-crud-state-interactions.test.tsx 643 行跨领域             | P1       | `flux-renderers-data/src/__tests__/data-crud-state-interactions.test.tsx`         | Phase 2 |
| form-tree-checkbox-fields.test.tsx 680 行跨领域                | P1       | `flux-renderers-form/src/__tests__/form-tree-checkbox-fields.test.tsx`            | Phase 2 |
| 709 处 as any 降低测试类型安全                                 | P1       | 多文件                                                                            | Phase 3 |
| test-support 采用率需提升                                      | P1       | 多文件                                                                            | Phase 4 |

### Out Of Scope

- Q01-Q03 vitest 环境不匹配（Plan 161）
- Q07 真实定时器（P2）
- Q08 describe.skip（P2）
- Q12-Q14 其他跨领域大文件 400-700 行（P2，可随 Phase 2 模式推广渐进处理）
- Q16 test-fixtures.ts any 参数（P2）
- Q18-Q19 ui/i18n 覆盖（P2）
- Q20-Q21 threshold/passWithNoTests（P3）

## Execution Plan

### Phase 1 - Eliminate Shared Mutable Test State (P1/P2)

Status: completed
Targets: 3 个存在共享状态的测试文件

- [x] **schema-renderer-runtime-core.test.tsx**：将模块顶层 `expressionCompiler` 实例移到 `beforeEach` 内创建（拆分后为 `data-source-and-node-identity.test.tsx`）
- [x] **form-double-edit-regression.test.tsx**：将 `submitCalls.length = 0` 从手动重置改为 `afterEach`
- [x] **automation.test.ts**：将 `Object.defineProperty(globalThis, 'window', ...)` 替换为 `vi.stubGlobal`/`vi.unstubAllGlobals`
- [x] 添加验证：对每个修复后的文件运行测试确认隔离

Exit Criteria:

- [ ] 3 个文件不再有模块顶层共享可变状态或未清理的全局副作用
- [ ] `vitest --sequence.shuffle` 在修复后的文件上通过
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [ ] 确认相关 `docs/architecture/` 无需更新（测试内部修改，无契约变更）
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 2 - Split Cross-Cutting And Hard-Threshold Test Files (P1)

Status: completed

- [x] **schema-compiler-registry.test.ts** (745行)：拆分为 `schema-compiler-registry-fixtures.ts` (161行) + `schema-compiler-registry-core.test.ts` (76行, 4 it) + `schema-compiler-registry-compilation.test.ts` (272行, 11 it) + `schema-compiler-registry-features.test.ts` (204行, 8 it)。总计 23 it，与原文件一致
- [x] **schema-compiler-shape-validation.test.ts** (743行)：拆分为 `schema-compiler-shape-validation-test-utils.ts` (11行) + `schema-compiler-shape-validation-helpers.test.ts` (79行, 8 it) + `schema-compiler-shape-validation-analyze.test.ts` (290行, 17 it) + `schema-compiler-shape-validation-compile.test.ts` (295行, 15 it)。总计 40 it，与原文件一致
- [x] **schema-renderer-runtime-core.test.tsx** (741行)：拆分为 `compilation-and-boundaries.test.tsx` (272行, 8 it) + `scope-and-reactivity.test.tsx` (184行, 5 it) + `data-source-and-node-identity.test.tsx` (317行, 6 it)。总计 19 it，与原文件一致
- [x] **data-crud-state-interactions.test.tsx** (643行)：拆分为 `crud-binding-and-status.test.tsx` (129行, 3 it) + `crud-query-and-pagination.test.tsx` (284行, 4 it) + `crud-selection-and-features.test.tsx` (240行, 4 it)。总计 11 it，与原文件一致
- [x] **form-tree-checkbox-fields.test.tsx** (680行)：拆分为 `form-tree-checkbox-fields.shared.ts` (4行) + `tree-values.test.tsx` (237行, 4 it) + `tree-structure.test.tsx` (270行, 5 it) + `checkbox-groups-scope-debug.test.tsx` (194行, 3 it)。总计 12 it，与原文件一致
- [x] 原始 5 个 monolith 文件已删除，barrel import 文件已更新

Exit Criteria:

- [ ] 3 个 `>700` hard-threshold 文件和 2 个额外 P1 跨领域热点都已拆分为聚焦的单主题测试模块
- [ ] 每个拆分后文件不超过 300 行
- [ ] 所有原有测试用例保留且通过（`it()` 块总数与拆分前一致）
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [ ] 确认相关 `docs/architecture/` 无需更新（测试文件内部修改）
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 3 - Reduce Test `as any` Usage (P1)

Status: completed
Targets: 多文件，758 处 `as any` → 437 处

- [x] 执行全量统计，识别 Top-25 高频文件
- [x] 对 Top-25 文件逐文件分析 `as any` 分类并修复 Category A+B
- [x] 最终结果：758 → 437（消除 321 处，-42.4%），超额完成 <500 目标
- [x] Category C 注释部分因 Plan 161 §1.7 (no-explicit-any warn) 被 intentionally skipped 而不适用

Exit Criteria:

- [ ] `rg "as any" -g "*.test.*" -c` 总计低于 500 处
- [ ] Top-20 文件中无 Category A 类型的 `as any`
- [ ] 所有保留的 `as any` 有明确的 reason 注释（Category C）
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [ ] 确认相关 `docs/architecture/` 无需更新（测试内部修改）
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 4 - Increase test-support Adoption (P1)

Status: deferred
Targets: `packages/flux-react/src/test-support-runtime.tsx`, `packages/flux-react/src/test-support-core.tsx`, `packages/flow-designer-renderers/src/test-support.tsx`, 多个测试文件

- [ ] 审查现有 test-support 工具的 API 和文档覆盖情况，添加缺失的 JSDoc
- [ ] 统计当前未使用 test-support 的测试文件中，有多少可以直接受益于 test-support
- [ ] 为 test-support 添加缺失的常用工具
- [ ] 将 Top-20 高价值测试文件迁移到使用 test-support 工具
- [ ] 目标：test-support 采用率从 ~18.4% 提升到至少 25%

Exit Criteria:

- [ ] test-support 工具 API 有完整 JSDoc
- [ ] 至少 20 个测试文件新采用 test-support 工具（总数达到 90+，>= 25%）
- [ ] 采用 test-support 后的测试文件不比原版更长
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [ ] 确认相关 `docs/architecture/` 无需更新（测试工具内部修改）
- [ ] `docs/logs/` 对应日期条目已更新

## Validation Checklist

- [ ] 无模块顶层共享可变测试状态（P1 修复）
- [ ] 跨领域大文件已拆分（P1 修复）
- [ ] `as any` 数量低于 500
- [ ] test-support 采用率 >= 25%
- [ ] 独立子 agent closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Risks And Rollback

| Risk                                                        | Impact                 | Mitigation                                                                   |
| ----------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| 拆分测试文件可能遗漏 describe 嵌套和共享 setup              | 测试用例丢失           | 拆分前记录 `it()` 块数量，拆分后对比；shared fixtures 提取到独立文件避免重复 |
| 共享 fixture 文件可能引入新的共享可变状态                   | Phase 1 的修复被绕过   | fixture 文件只导出纯函数和不可变常量，不导出可变状态                         |
| 消除 `as any` 可能引入过于严格的类型导致测试脆弱            | 测试因类型变更频繁失败 | Category B 优先使用 `Partial`/`Pick` 等标准工具类型；不触碰 Category C       |
| test-support 迁移可能改变测试运行时行为                     | 测试失败               | 逐文件迁移，每次迁移后运行全量测试                                           |
| Phase 2 和 Phase 3 同修改 schema-compiler-registry 相关文件 | Merge conflict         | Phase 2 先拆分，Phase 3 再处理拆分后文件的 `as any`                          |
| Phase 3 目标可能过于激进或保守                              | 延期或标准过低         | 先做 A/B/C 分类计数，再根据 Category A+B 实际占比调整目标                    |

## Closure

Status Note: Phase 1-3 completed and remain the landed baseline. This plan cannot stay `completed` because Phase 4 is still marked `deferred` inside the same plan, its exit criteria and validation checklist remain unchecked, no successor plan currently owns the deferred test-support adoption scope, and no independent closure audit evidence is recorded. Keep the plan `partially completed` until Phase 4 is either executed here or moved to an explicit successor owner plan.

Closure Audit Evidence:

- Reviewer / Agent: pending independent closure audit
- Evidence: 2026-05-03 plan-hygiene re-audit confirms the Phase 1-3 closure note is directionally consistent with the live baseline, but closure cannot be claimed while Phase 4 remains deferred without successor ownership and while the validation checklist still requires test-support adoption >= 25%.

Follow-up:

- Create or route to an explicit successor owner plan for Phase 4 test-support adoption, then update this plan to `superseded` / `partially completed` with that path or finish Phase 4 here.
- Q12-Q14 其他跨领域测试文件（400-700 行）可按 Phase 2 的拆分模式渐进处理
- Q07 真实定时器 sleep → vi.useFakeTimers 渐进替换
- Q18/Q19 ui/i18n 覆盖率提升独立跟进
- Q20 为 16 个无阈值包添加 coverage threshold
- 继续 Phase 3 的 `as any` 消除（如 Category A+B 占比高）
