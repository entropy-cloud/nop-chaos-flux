# 维度 02: 模块职责与边界

> 审核日期: 2026-06-02
> 初审 agent: deep-audit
> 状态: Phase 1 完成，待独立复核

## 审核目标

验证 monorepo 内每个包的导出内容是否被包外按预期合理引用，发现职责错置、包边界泄漏、或包内模块放大（split candidate）的问题。

## Phase 1 结果

### 审计脚本数据

- `check:audit-suspects`: 280 suspects，按维度分发后本维度 92 条 oversized 文件警告
- 92 条 oversized 警告中，测试文件 47 条，纯声明/类型文件 8 条，单职责长文件 22 条，其他 15 条

### 有意义的大文件分析

| 文件                                                                   | 实际行数 | 职责性质                       | 建议                                  |
| ---------------------------------------------------------------------- | -------- | ------------------------------ | ------------------------------------- |
| `packages/spreadsheet-renderers/src/__tests__/grid-selection.test.tsx` | 796      | 单一焦点的 grid selection 测试 | 保留，单文件单焦点                    |
| `packages/flux-runtime/src/form-runtime-owner.ts`                      | 674      | form owner orchestrator        | 保留，单一职责编排器                  |
| `packages/flux-runtime/src/runtime-factory.ts`                         | 647      | 纯组装逻辑                     | 保留，组装序列不可分                  |
| `packages/flux-react/src/render-nodes.tsx`                             | 511      | region 树渲染                  | 中等拆分机会，可抽 `createRegionTree` |
| `packages/flow-designer-core/src/core.ts`                              | 616      | 自定义闭包状态+编排            | 已部分模块化 (core/ 子目录)           |
| `packages/flux-compiler/src/schema-compiler/node-compiler.ts`          | 690      | 节点编译                       | 拆分候选 (复核新增)                   |
| `packages/flux-action-core/src/action-dispatcher/action-execution.ts`  | 675      | action 执行管道                | 拆分候选 (复核新增)                   |
| `packages/report-designer-renderers/src/page-renderer.tsx`             | 665      | host/scope/渲染混杂            | 拆分候选 (复核新增)                   |

### 包边界职责检查

所有 25 个 package.json 均缺少 `description` 字段，无法验证声明职责。实际代码无跨越包边界的职责错置。

### 显著边界泄漏点

无。

### False positives 排除

- 初审报告的 acorn-outline-tree.tsx(856行)、sub-condition-view.tsx(577行)、basic-table-form-view.test.tsx(703行) 经复核确认文件不存在（幻觉）
- core.ts 实际 616 行而非 1200+，且已通过 core/ 子目录模块化
- render-nodes.tsx 实际 511 行而非 582

## 维度复核结论

独立复核发现初审存在显著质量问题：4/6 原始文件引用不存在（幻觉），2 处行数错误，且包边界检查基于不存在的 `description` 字段（所有 package.json 均无 description）。复核保留了无边界泄漏的结论，并新增 3 个真实拆分候选。

### 复核纠正

- acorn-outline-tree.tsx, sub-condition-view.tsx, basic-table-form-view.test.tsx: 文件不存在，驳回
- core.ts: 实际 616 行（非 1200+），已模块化
- render-nodes.tsx: 实际 511 行（非 582）
- 包边界检查: 25 个包均无 description，原断言失实

### 复核新增发现

- [02-N1] `flux-compiler/src/schema-compiler/node-compiler.ts` (690 行) — 拆分候选
- [02-N2] `flux-action-core/src/action-dispatcher/action-execution.ts` (675 行) — 拆分候选
- [02-N3] `report-designer-renderers/src/page-renderer.tsx` (665 行) — 拆分候选
- [02-N4] 所有 25 个包 `package.json` 缺少 `description` 字段 — P4 系统性问题

## 最终保留项

| 编号  | 严重程度 | 文件                           | 摘要                  |
| ----- | -------- | ------------------------------ | --------------------- |
| 02-N1 | P3       | `node-compiler.ts` (690 行)    | 拆分候选              |
| 02-N2 | P3       | `action-execution.ts` (675 行) | 拆分候选              |
| 02-N3 | P3       | `page-renderer.tsx` (665 行)   | 拆分候选              |
| 02-N4 | P4       | 全部 package.json              | 缺少 description 字段 |
