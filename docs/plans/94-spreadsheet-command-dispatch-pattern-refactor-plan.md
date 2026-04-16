# 94 Spreadsheet Command Dispatch Pattern Refactor Plan

> Plan Status: planned
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

Status: planned
Targets: `packages/spreadsheet-core/src/command-handlers/types.ts`

- [ ] 定义 `CommandHandler<T>` 接口
- [ ] 定义 `CommandHandlerRegistry` 类型
- [ ] 导出公共类型

```typescript
// 目标接口
export type CommandHandler<T extends SpreadsheetCommand = SpreadsheetCommand> = (
  store: SpreadsheetDispatchStore,
  command: T
) => Promise<SpreadsheetCommandResult>;

export type CommandHandlerRegistry = Map<string, CommandHandler>;
```

Exit Criteria:

- [ ] 类型定义文件已创建
- [ ] 类型可从 package 导出

### Phase 2 - Extract Command Handlers by Category

Status: planned
Targets: `packages/spreadsheet-core/src/command-handlers/`

- [ ] 创建 `cell-handlers.ts` - 单元格命令处理器
- [ ] 创建 `clipboard-handlers.ts` - 剪贴板命令处理器
- [ ] 创建 `sheet-handlers.ts` - 工作表命令处理器
- [ ] 创建 `structure-handlers.ts` - 结构命令处理器
- [ ] 创建 `search-handlers.ts` - 搜索命令处理器
- [ ] 创建 `selection-handlers.ts` - 选择命令处理器
- [ ] 创建 `history-handlers.ts` - 撤销/重做命令处理器

Exit Criteria:

- [ ] 所有命令处理器已提取到独立文件
- [ ] 每个处理器文件导出处理器注册函数

### Phase 3 - Create Handler Registry

Status: planned
Targets: `packages/spreadsheet-core/src/command-handlers/index.ts`

- [ ] 创建 `createCommandHandlerRegistry()` 工厂函数
- [ ] 注册所有命令处理器
- [ ] 导出 registry

Exit Criteria:

- [ ] Registry 包含所有 50+ 命令处理器
- [ ] 可通过命令类型字符串查找处理器

### Phase 4 - Refactor Dispatch Function

Status: planned
Targets: `packages/spreadsheet-core/src/core-dispatch.ts`

- [ ] 替换 switch 为 Map 查找
- [ ] 保留只读命令检查逻辑
- [ ] 保留错误处理
- [ ] 验证文件行数降至 100 行以内

```typescript
// 目标实现
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

- [ ] switch 语句已完全移除
- [ ] `core-dispatch.ts` 行数 < 100
- [ ] 所有现有测试通过

### Phase 5 - Verification and Documentation

Status: planned
Targets: tests, docs

- [ ] 运行完整测试套件
- [ ] 验证所有命令行为不变
- [ ] 更新 dev log

Exit Criteria:

- [ ] `pnpm --filter @nop-chaos/spreadsheet-core test` 通过
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过

## Architecture Preservation Checklist

重构必须保持以下架构边界不变：

- [ ] `dispatchSpreadsheetCommand` 签名不变
- [ ] `SpreadsheetCommand` / `SpreadsheetCommandResult` 类型定义不变
- [ ] Bridge dispatch 路径（`SpreadsheetBridge.dispatch(command)`）不变
- [ ] 所有写操作仍通过 command dispatch 完成，不直接修改 store
- [ ] 宿主 scope 仍只暴露只读快照（`getSnapshot()`）

## Validation Checklist

- [ ] switch 语句已移除
- [ ] `core-dispatch.ts` 行数 < 100
- [ ] 所有 50+ 命令正常工作
- [ ] 命令分发性能保持或改善
- [ ] 架构边界保持不变（见 Architecture Preservation Checklist）
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过
- [ ] `pnpm lint` 通过
- [ ] `pnpm test` 通过
- [ ] 独立子 agent closure-audit 已完成并记录证据

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Reviewer / Agent: <<独立审阅者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<剩余工作归属>>
