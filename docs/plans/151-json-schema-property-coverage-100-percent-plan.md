# 151 JSON Schema Property Coverage 100% Plan

> Plan Status: completed
> Last Reviewed: 2026-04-28
> Source: `scripts/check-schema-prop-coverage.mjs` baseline run (2026-04-28), `docs/logs/2026/04-28.md`
> Related: `docs/plans/143-unit-test-coverage-80-percent-target-plan.md`, `docs/plans/148-test-contract-gap-closure-plan.md`

## Purpose

确保所有 JSON 层面可见的 schema 属性（renderer 定义中声明的每一个可在 JSON 中配置的属性）都有至少一个测试覆盖，并将此约束固化为可自动化检查的 CI 门禁。

## Current Baseline

- **脚本已实现**：`scripts/check-schema-prop-coverage.mjs` 已落地，支持 `--verbose` 和 `--json` 输出。
- **覆盖模型已建立**：两层覆盖模型 — Layer 1 为 BaseSchema 通用属性（17 个，任一 renderer 测试中出现即覆盖）；Layer 2 为各 renderer 特有属性（163 个，必须在对应 renderer 类型的测试中出现）。
- **当前覆盖率**：180/180 = 100%。Phase 1（脚本开发）和 Phase 2（属性补测）已在 2026-04-28 同日完成并验证。
- **已有测试**：`packages/flux-compiler/src/schema-compiler-prop-coverage.test.ts` 包含 40 个编译器层测试，覆盖了之前缺失的属性。
- **已有行覆盖率计划**：Plan 143 目标是行覆盖率 80%，属于不同维度。本计划关注的是属性级别的契约覆盖，而非代码行覆盖。

## Goals

- 每个 JSON 层面可见的 schema 属性至少有一个测试覆盖（出现即覆盖标准）。
- 自动化检查脚本可运行且输出准确。
- 检查脚本可作为 CI 门禁（exit code 1 表示未达标）。
- 未来新增 renderer 或属性时，脚本自动检测并报告缺口。

## Non-Goals

- 不追求整体行覆盖率达到 90%（ROI 低，见 Phase 3 的说明）。
- 不修改 renderer 定义、schema 类型或编译器行为。
- 不重构现有测试文件结构。
- 不为每个属性编写行为断言测试（仅要求"出现即覆盖"）。

## Scope

### In Scope

- `scripts/check-schema-prop-coverage.mjs` — 覆盖率检查脚本
- `packages/flux-compiler/src/schema-compiler-prop-coverage.test.ts` — 属性覆盖测试
- CI 集成配置（如需要）
- `docs/logs/` 更新

### Out Of Scope

- 行覆盖率提升（Plan 143 的范畴）
- E2E 测试（Plan 148 的范畴）
- renderer 代码变更
- `docs/architecture/` 更新（本计划不涉及架构变更）

## Execution Plan

### Phase 1 - Coverage Check Script

Status: completed
Targets: `scripts/check-schema-prop-coverage.mjs`

- [x] 实现覆盖率检查脚本，支持两层覆盖模型
- [x] 扫描 16 个 renderer 定义文件提取声明属性
- [x] 扫描所有 `*.test.ts(x)` 文件提取测试中使用的属性
- [x] 正确处理带引号的键名（如 `'xui:actions'`、`'xui:imports'`）
- [x] 支持 `--verbose`（含已覆盖属性详情）和 `--json`（机器可读输出）
- [x] 未覆盖时 exit code 1（CI 门禁）

Exit Criteria:

- [x] 脚本可运行且输出准确的覆盖率报告
- [x] 正确区分 Layer 1（通用）和 Layer 2（renderer 特有）
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - Cover Missing Properties

Status: completed
Targets: `packages/flux-compiler/src/schema-compiler-prop-coverage.test.ts`

Phase 1 基线运行发现 40 个未覆盖属性，分布在 13 个 renderer 中：

| Renderer | 未覆盖属性 | 数量 |
|----------|-----------|------|
| crud | defaultParams, onQueryReset, onRowClick, onSelectionChange, selection, shape | 6 |
| dialog | actions, container, onClose, onOpen, showMask | 5 |
| drawer | actions, container, onClose, onOpen, showMask | 5 |
| recurse | indexName, itemData, itemName, keyBy, keyName | 5 |
| form | labelWidth, shape, statusPath, submitWhenHidden | 4 |
| table | loadingSlot, onFilterChange, onSelectionChange, onSortChange | 4 |
| tree | childrenKey, keyField, labelField | 3 |
| chart | onClick, onHover | 2 |
| variant-field | transformOutAction, validateValueAction | 2 |
| button | size | 1 |
| detail-field | viewer | 1 |
| loop | itemData | 1 |
| tabs | onChange | 1 |

- [x] 为所有 40 个未覆盖属性编写编译器层测试
- [x] 使用正确的字段分类（`ignored` 字段用"不抛错"断言，`event` 字段检查 `eventPlans`，`prop` 字段检查 `propsProgram.value`）
- [x] 所有测试使用静态值避免 `propsProgram` 变为 dynamic

Exit Criteria:

- [x] `node scripts/check-schema-prop-coverage.mjs` 报告 180/180 = 100%
- [x] `pnpm --filter @nop-chaos/flux-compiler test` 全部通过
- [x] `pnpm typecheck` 通过
- [x] `pnpm build` 通过
- [x] `pnpm --filter @nop-chaos/flux-compiler lint` 通过
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - Decision Record: No 90% Line Coverage

Status: completed

关于是否需要将整体行覆盖率提升至 90% 的决定：

**结论：不需要。**

理由：
1. **ROI 低** — 大量代码是防御性分支（错误处理、边界检查、类型守卫），强行覆盖意味着写大量低断言价值的测试
2. **维护负担** — 90% 行覆盖率门槛驱动开发者写"凑覆盖率"的测试，反而污染测试套件
3. **真正的覆盖目标** — JSON 属性 100% 覆盖是面向用户契约的覆盖：确保每个用户可配置的属性至少有一个测试验证它工作。这比追求行覆盖率数字更有价值

Exit Criteria:

- [x] 决定已记录并经讨论确认

## Validation Checklist

- [x] `node scripts/check-schema-prop-coverage.mjs` 报告 100% 覆盖
- [x] `pnpm typecheck` 通过
- [x] `pnpm build` 通过
- [x] `pnpm --filter @nop-chaos/flux-compiler lint` 通过
- [x] `pnpm --filter @nop-chaos/flux-compiler test` 全部通过（288 tests）
- [x] `pnpm --filter @nop-chaos/flux-core test` 全部通过（119 tests）
- [x] `docs/logs/2026/04-28.md` 已更新

## Closure

Status Note: 所有 3 个 Phase 均已完成。脚本已落地且 100% 覆盖率已验证。40 个未覆盖属性已补测试并通过。整体行覆盖率 90% 目标经评估后决定不纳入。

Closure Audit Evidence:

- Reviewer / Agent: plan author (self-audit; Plan 151 的 scope 是工具+测试落地，closure 条件是脚本输出 100% 且测试全绿，两者均为 repo-observable 事实)
- Evidence: `scripts/check-schema-prop-coverage.mjs` 输出 `180/180 = 100.0%`; `pnpm --filter @nop-chaos/flux-compiler test` 输出 `288 passed (288)`; `pnpm typecheck` 和 `pnpm build` 均通过

Follow-up:

- 未来新增 renderer 或 renderer 属性时，运行 `node scripts/check-schema-prop-coverage.mjs` 确认覆盖率不回退
- 可选：将脚本集成到 CI pipeline 中作为 PR 合并门禁
- 无其他 plan-owned 剩余工作

## Maintenance Notes

### 如何新增 renderer 属性的测试

1. 在 renderer 定义文件中声明新属性（`fields`、`propContracts`、`regions` 等）
2. 在 `packages/flux-compiler/src/schema-compiler-prop-coverage.test.ts` 中添加测试：
   - `kind: 'prop'` — 构造含该属性的 schema，断言 `root.propsProgram.value.<key>`
   - `kind: 'event'` — 构造含 `onXxx: { action: '...' }` 的 schema，断言 `root.eventPlans.onXxx`
   - `kind: 'ignored'` — 构造含该属性的 schema，断言 `expect(() => compileNode(...)).not.toThrow()`
   - `kind: 'region'` / `kind: 'value-or-region'` — 构造含子 schema 的 schema，断言 `root.regions.<key>`
   - 注意使用静态值（非 `${...}` 表达式），否则 `propsProgram` 变为 dynamic 导致 `.value` 为 undefined
3. 运行 `node scripts/check-schema-prop-coverage.mjs` 确认覆盖率维持 100%

### 脚本工作原理

1. **提取声明属性** — 解析 16 个 renderer 定义文件的 `fields`、`propContracts`、`propSchema`、`regions`、`defaultSchema`
2. **扫描测试使用** — 遍历所有 `*.test.ts(x)`，找含 `type: 'xxx'` 的对象字面量，用正则提取键名
3. **比较报告** — Layer 1 通用属性跨 renderer 合并覆盖，Layer 2 按 renderer 分开统计
