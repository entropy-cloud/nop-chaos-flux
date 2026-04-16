# 94 Spreadsheet Command Dispatch Pattern Refactor Plan

> Plan Status: completed
> Last Reviewed: 2026-04-16
> Source: live repo audit 2026-04-16, `packages/spreadsheet-core/src/core-dispatch.ts`
> Related: `docs/plans/84-oversized-code-file-elimination-plan.md`, `docs/architecture/report-designer/contracts.md`

## Purpose

将 `spreadsheet-core` 的巨型 switch 命令分发重构为命令处理器映射表模式，提高分发效率、改善代码可维护性、并使单元测试更容易针对单个命令编写。

## Architecture Alignment Check

本计划已与以下架构文档核对：

- `docs/architecture/report-designer/design.md` - Spreadsheet 总体架构
- `docs/architecture/report-designer/contracts.md` - 命令模型类型定义

### 架构要求确认

1. **Bridge 模式**：所有写操作必须通过 `SpreadsheetBridge.dispatch(command)` 提交，不直接修改 store
2. **命令类型系统**：`SpreadsheetCommand` 是 discriminated union，已有完整的类型定义
3. **Projection 原则**：schema 片段通过宿主 scope 读取只读快照，写操作通过 actions 提交

本重构**不改变**这些架构边界，仅优化 dispatch 函数内部实现。

## Current Baseline

`packages/spreadsheet-core/src/core-dispatch.ts` (527 行) 包含一个巨大的 `dispatchSpreadsheetCommand` 函数，使用 switch 语句处理 50+ 种命令类型。

问题分析：

1. **性能**：每次命令分发都需要线性扫描 case 分支直到匹配，O(n) 复杂度
2. **可维护性**：单文件 527 行，新增命令需要修改核心分发文件
3. **可测试性**：难以针对单个命令进行隔离测试
4. **扩展性**：无法动态注册命令处理器

现有命令已按功能分类到独立模块：
- `core/cell-operations.ts` - 单元格操作
- `core/clipboard-operations.ts` - 剪贴板操作
- `core/sheet-operations.ts` - 工作表操作
- `core/structure-operations.ts` - 行列结构操作
- `core/search-operations.ts` - 搜索替换操作

但分发逻辑仍集中在 switch 中。

**注意**：这是代码质量改进，不是架构违规修复。当前 switch 实现**已符合** bridge/projection 架构要求。

## Goals

- 将 switch 分发改为 Map 查找，O(1) 复杂度
- 减少 `core-dispatch.ts` 文件行数至 100 行以内
- 支持命令处理器的模块化注册
- 保持现有命令行为完全不变
- 提高单命令测试的可行性

## Non-Goals

- 不改变 `SpreadsheetCommand` 或 `SpreadsheetCommandResult` 类型定义
- 不改变外部 API (`dispatchSpreadsheetCommand` 签名)
- 不在本计划中添加新命令
- 不改变现有命令的实现逻辑

## Scope

### In Scope

- `packages/spreadsheet-core/src/core-dispatch.ts` - 重构分发逻辑
- `packages/spreadsheet-core/src/command-handlers/` - 新建命令处理器目录
- `packages/spreadsheet-core/src/command-handlers/index.ts` - 处理器注册表
- 现有测试文件验证

### Out Of Scope

- 命令实现逻辑的修改
- 新命令的添加
- 其他包的修改

## Execution Plan

### Phase 1 - Design Command Handler Interface

Status: completed
Targets: `packages/spreadsheet-core/src/command-handlers/types.ts`

- [x] 定义 `CommandHandler<T>` 接口
- [x] 定义 `CommandHandlerRegistry` 类型
- [x] 导出公共类型

```typescript
// 目标接口
export type CommandHandler<T extends SpreadsheetCommand = SpreadsheetCommand> = (
  store: SpreadsheetDispatchStore,
  command: T
) => Promise<SpreadsheetCommandResult>;

export type CommandHandlerRegistry = Map<string, CommandHandler>;
```

Exit Criteria:

- [x] 类型定义文件已创建
- [x] 类型可从 package 导出

### Phase 2 - Extract Command Handlers by Category

Status: completed
Targets: `packages/spreadsheet-core/src/command-handlers/`

- [x] 创建 `cell-handlers.ts` - 单元格命令处理器 (24 handlers)
- [x] 创建 `clipboard-handlers.ts` - 剪贴板命令处理器 (4 handlers)
- [x] 创建 `sheet-handlers.ts` - 工作表命令处理器 (16 handlers)
- [x] 创建 `structure-handlers.ts` - 结构命令处理器 (4 handlers)
- [x] 创建 `search-handlers.ts` - 搜索命令处理器 (4 handlers)
- [x] 创建 `selection-handlers.ts` - 选择命令处理器 (5 handlers)
- [x] 创建 `history-handlers.ts` - 撤销/重做命令处理器 (5 handlers)

Exit Criteria:

- [x] 所有命令处理器已提取到独立文件
- [x] 每个处理器文件导出处理器注册函数

### Phase 3 - Create Handler Registry

Status: completed
Targets: `packages/spreadsheet-core/src/command-handlers/index.ts`

- [x] 创建 `createCommandHandlerRegistry()` 工厂函数
- [x] 注册所有命令处理器
- [x] 导出 registry 和 `readOnlyCommands` 集合

Exit Criteria:

- [x] Registry 包含所有 62 命令处理器
- [x] 可通过命令类型字符串查找处理器

### Phase 4 - Refactor Dispatch Function

Status: completed
Targets: `packages/spreadsheet-core/src/core-dispatch.ts`

- [x] 替换 switch 为 Map 查找
- [x] 保留只读命令检查逻辑
- [x] 保留错误处理
- [x] 验证文件行数降至 100 行以内 (实际: 32 行)

```typescript
// 实现结果
export async function dispatchSpreadsheetCommand(
  store: SpreadsheetDispatchStore,
  command: SpreadsheetCommand
): Promise<SpreadsheetCommandResult> {
  const state = store.getState();

  if (state.readonly && !readOnlyCommands.has(command.type)) {
    return { ok: false, changed: false, error: 'Document is readonly' };
  }

  const handler = commandHandlers.get(command.type);
  if (!handler) {
    return { ok: false, changed: false, error: `Unknown command: ${command.type}` };
  }

  try {
    return await handler(store, command);
  } catch (error) {
    return { ok: false, changed: false, error: String(error) };
  }
}
```

Exit Criteria:

- [x] switch 语句已完全移除
- [x] `core-dispatch.ts` 行数 < 100 (实际: 32 行)
- [x] 所有现有测试通过 (225 tests)

### Phase 5 - Verification and Documentation

Status: completed
Targets: tests, docs

- [x] 运行完整测试套件
- [x] 验证所有命令行为不变
- [x] 更新 dev log (pending closure audit)

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/spreadsheet-core test` 通过 (225 tests)
- [x] `pnpm typecheck` 通过
- [x] `pnpm build` 通过
- [x] `pnpm --filter @nop-chaos/spreadsheet-core lint` 通过

## Architecture Preservation Checklist

重构必须保持以下架构边界不变：

- [x] `dispatchSpreadsheetCommand` 签名不变
- [x] `SpreadsheetCommand` / `SpreadsheetCommandResult` 类型定义不变
- [x] Bridge dispatch 路径（`SpreadsheetBridge.dispatch(command)`）不变
- [x] 所有写操作仍通过 command dispatch 完成，不直接修改 store
- [x] 宿主 scope 仍只暴露只读快照（`getSnapshot()`）

## Validation Checklist

- [x] switch 语句已移除
- [x] `core-dispatch.ts` 行数 < 100 (实际: 32 行)
- [x] 所有 62 命令正常工作
- [x] 命令分发性能保持或改善 (O(n) → O(1))
- [x] 架构边界保持不变（见 Architecture Preservation Checklist）
- [x] `pnpm typecheck` 通过
- [x] `pnpm build` 通过
- [x] `pnpm --filter @nop-chaos/spreadsheet-core lint` 通过
- [x] `pnpm --filter @nop-chaos/spreadsheet-core test` 通过 (225 tests)
- [x] 独立子 agent closure-audit 已完成并记录证据

## Closure

Status Note: Plan completed successfully. All 5 phases executed. 62 command handlers extracted to modular files. `core-dispatch.ts` reduced from 539 lines to 32 lines. All 225 tests pass.

Closure Audit Evidence:

- Reviewer / Agent: Independent closure audit subagent (task ses_2697be714ffeAsqqbL7uh5dMDZ)
- Evidence: 
  - `core-dispatch.ts`: 32 lines (goal < 100)
  - Handler files: 9 files in `command-handlers/` directory
  - Total handlers: 62 registered
  - Tests: 225 passed
  - Verification commands: typecheck ✓, build ✓, lint ✓, test ✓
  - All validation checklist items verified PASS

Follow-up:

- None. Plan scope fully completed.
