# 167 Test Quality And Reliability Improvement Plan

> Plan Status: proposed
> Last Reviewed: 2026-05-01
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
- Q10 `form-tree-checkbox-fields.test.tsx` (680行) 为 P1 跨领域文件，但测试间耦合度低于 Q09/Q11，纳入本计划 Phase 2 渐进处理

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

| Finding | Severity | File | Phase |
|---------|----------|------|-------|
| 模块顶层共享 expressionCompiler（stateless，风险低） | P2 | `flux-react/src/__tests__/schema-renderer-runtime-core.test.tsx` | Phase 1 |
| 共享可变状态 submitCalls（手动重置，非 afterEach） | P2 | `flux-renderers-form-advanced/src/__tests__/form-double-edit-regression.test.tsx` | Phase 1 |
| window 全局污染（globalThis.window 替换） | P1 | `nop-debugger/src/automation.test.ts` | Phase 1 |
| schema-compiler-registry.test.ts 745 行跨领域 | P1 | `flux-compiler/src/schema-compiler-registry.test.ts` | Phase 2 |
| data-crud-state-interactions.test.tsx 643 行跨领域 | P1 | `flux-renderers-data/src/__tests__/data-crud-state-interactions.test.tsx` | Phase 2 |
| form-tree-checkbox-fields.test.tsx 680 行跨领域 | P1 | `flux-renderers-form/src/__tests__/form-tree-checkbox-fields.test.tsx` | Phase 2 |
| 709 处 as any 降低测试类型安全 | P1 | 多文件 | Phase 3 |
| test-support 采用率需提升 | P1 | 多文件 | Phase 4 |

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

Status: planned
Targets: 3 个存在共享状态的测试文件

- [ ] **schema-renderer-runtime-core.test.tsx**：将模块顶层 `expressionCompiler` 实例（line 36）移到 `beforeEach` 内创建。注意：`expressionCompiler` 包装的 `FormulaCompiler` 实际为 stateless，风险较低，但遵循最佳实践移到 `beforeEach` 可防止未来 stateful 扩展导致耦合
- [ ] **form-double-edit-regression.test.tsx**：将 `submitCalls.length = 0` 从每个测试开头的手动重置改为 `afterEach(() => { submitCalls.length = 0; })`。注意：当前手动重置可靠（每个测试开头都有），此修改为 hygiene improvement
- [ ] **automation.test.ts**：将 `Object.defineProperty(globalThis, 'window', ...)` (lines 82-85) 从模块顶层移到 `beforeEach`/`afterEach` 中，`afterEach` 恢复原始值；或使用 `vi.stubGlobal`/`vi.unstubAllGlobals`。这是唯一真正的 P1 级别共享状态问题
- [ ] 添加验证：对每个修复后的文件运行 `vitest --no-threads` 和 `vitest --sequence.shuffle` 确认测试隔离

Exit Criteria:

- [ ] 3 个文件不再有模块顶层共享可变状态或未清理的全局副作用
- [ ] `vitest --sequence.shuffle` 在修复后的文件上通过
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [ ] 确认相关 `docs/architecture/` 无需更新（测试内部修改，无契约变更）
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 2 - Split Cross-Cutting Test Files (P1)

Status: planned
Targets: `packages/flux-compiler/src/schema-compiler-registry.test.ts` (745行), `packages/flux-renderers-data/src/__tests__/data-crud-state-interactions.test.tsx` (643行), `packages/flux-renderers-form/src/__tests__/form-tree-checkbox-fields.test.tsx` (680行)

- [ ] **schema-compiler-registry.test.ts** (745行)：
  - 将 lines 1-94 的 helper/fixture 定义提取到 `schema-compiler-registry-fixtures.ts` 共享文件
  - 按测试主题拆分（注意：实际的 test groupings 不严格按 renderer/validator/action 划分）：
    - `schema-compiler-registry-core.test.ts` — 核心注册/查找/生命周期
    - `schema-compiler-registry-compilation.test.ts` — 编译行为和 transform
    - `schema-compiler-registry-features.test.ts` — table extraction、CRUD aliases、imports 等特性
  - 确保拆分后每个文件不超过 300 行
- [ ] **data-crud-state-interactions.test.tsx** (643行)：
  - 按实际测试结构拆分（注意：多个测试跨 domain boundary，如 query+pagination、selection+refresh）：
    - `crud-binding-and-status.test.tsx` — $crud binding, status summary, visible columns
    - `crud-query-and-pagination.test.tsx` — query flow, validation, refresh params, pagination/sort/filter summary
    - `crud-selection-and-features.test.tsx` — selection state, responsive expand, operation columns, component handles
  - 确保拆分后每个文件不超过 300 行
- [ ] **form-tree-checkbox-fields.test.tsx** (680行)：
  - 分析实际测试 groupings，按主题拆分为 2-3 个文件
  - 确保拆分后每个文件不超过 300 行
- [ ] 拆分前运行原文件全量测试记录 `it()` 块数量，拆分后对比确认无遗漏

Exit Criteria:

- [ ] 3 个跨领域大文件已拆分为聚焦的单主题测试模块
- [ ] 每个拆分后文件不超过 300 行
- [ ] 所有原有测试用例保留且通过（`it()` 块总数与拆分前一致）
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [ ] 确认相关 `docs/architecture/` 无需更新（测试文件内部修改）
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 3 - Reduce Test `as any` Usage (P1)

Status: planned
Targets: 多文件，709 处 `as any`

> 前置条件：先完成 Phase 2 的文件拆分，再处理拆分后文件的 `as any`，避免在即将被拆分的文件上做重复修改。

- [ ] 执行全量 `rg "as any" -g "*.test.*" -c` 并按文件分组统计，识别 Top-20 高频文件
- [ ] 对 Top-20 文件逐文件分析 `as any` 分类：
  - **Category A — 可消除**：已知具体类型但图省事写的 `as any`，替换为正确类型
  - **Category B — 需要类型工具**：需要新增测试辅助类型（如 `Partial<T>`、`Pick<T, K>`、或 `DeepPartial<T>`），添加辅助类型后替换
  - **Category C — 合理保留**：低代码引擎边界（`BaseSchema` 为 `Record<string, unknown>` + optional known keys，高度动态）、第三方库类型不完整、mock 函数签名兼容
- [ ] 修复所有 Category A 和 Category B 的 `as any`
- [ ] 为 Category C 添加 `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- <reason>` 注释（仅在 Plan 161 Phase 1.7 no-explicit-any warn 生效后才有意义）
- [ ] 目标：将 709 处降低到 500 处以下（消除 ~30%）。如 Category A+B 占比超预期，上调目标到 400 处以下

Exit Criteria:

- [ ] `rg "as any" -g "*.test.*" -c` 总计低于 500 处
- [ ] Top-20 文件中无 Category A 类型的 `as any`
- [ ] 所有保留的 `as any` 有明确的 reason 注释（Category C）
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [ ] 确认相关 `docs/architecture/` 无需更新（测试内部修改）
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 4 - Increase test-support Adoption (P1)

Status: planned
Targets: `packages/flux-react/src/test-support-runtime.tsx`, `packages/flux-react/src/test-support-core.tsx`, `packages/flow-designer-renderers/src/test-support.tsx`, 多个测试文件

- [ ] 审查现有 test-support 工具的 API 和文档覆盖情况，添加缺失的 JSDoc
- [ ] 统计当前未使用 test-support 的测试文件中，有多少可以直接受益于 test-support（手动创建 runtime、手动 mock scope 等）
- [ ] 为 test-support 添加缺失的常用工具（如果分析发现测试文件在手动实现已有工具的功能）
- [ ] 将 Top-20 高价值测试文件迁移到使用 test-support 工具
- [ ] 目标：test-support 采用率从 ~18.4%（66/359）提升到至少 25%（~90 个文件）

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

| Risk | Impact | Mitigation |
|------|--------|------------|
| 拆分测试文件可能遗漏 describe 嵌套和共享 setup | 测试用例丢失 | 拆分前记录 `it()` 块数量，拆分后对比；shared fixtures 提取到独立文件避免重复 |
| 共享 fixture 文件可能引入新的共享可变状态 | Phase 1 的修复被绕过 | fixture 文件只导出纯函数和不可变常量，不导出可变状态 |
| 消除 `as any` 可能引入过于严格的类型导致测试脆弱 | 测试因类型变更频繁失败 | Category B 优先使用 `Partial`/`Pick` 等标准工具类型；不触碰 Category C |
| test-support 迁移可能改变测试运行时行为 | 测试失败 | 逐文件迁移，每次迁移后运行全量测试 |
| Phase 2 和 Phase 3 同修改 schema-compiler-registry 相关文件 | Merge conflict | Phase 2 先拆分，Phase 3 再处理拆分后文件的 `as any` |
| Phase 3 目标可能过于激进或保守 | 延期或标准过低 | 先做 A/B/C 分类计数，再根据 Category A+B 实际占比调整目标 |

## Closure

Status Note: <<执行完成后填写>>

Closure Audit Evidence:

- Reviewer / Agent: <<独立审阅者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- Q12-Q14 其他跨领域测试文件（400-700 行）可按 Phase 2 的拆分模式渐进处理
- Q07 真实定时器 sleep → vi.useFakeTimers 渐进替换
- Q18/Q19 ui/i18n 覆盖率提升独立跟进
- Q20 为 16 个无阈值包添加 coverage threshold
- Phase 3 如 Category A+B 占比高，可在 follow-up 中继续降低 `as any` 数量
