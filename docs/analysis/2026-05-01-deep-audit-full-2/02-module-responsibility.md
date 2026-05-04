# 维度 02：模块职责与文件边界（初审）

## P1 发现（4个）

### [维度02-F1] use-table-controls.ts -- 5 个独立 hook 未拆分

- **文件**: `packages/flux-renderers-data/src/table-renderer/use-table-controls.ts` (500行)
- **现状**: 包含 useTablePagination(83行)、useTableSelection(137行)、useTableSort(75行)、useTableFilter(173行)、useTableExpand(19行)，完全独立
- **建议**: 拆分为 5 个独立文件 + barrel re-export

### [维度02-F2] flux-renderers-data/index.tsx -- 入口文件内联 240+ 行 CRUD 定义

- **文件**: `packages/flux-renderers-data/src/index.tsx` (326行)
- **现状**: CRUD propContracts/eventContracts 等约 233 行内联在 index.tsx 中
- **建议**: 提取到 data-renderer-definitions.ts 和 crud-renderer-definition.ts

### [维度02-F3] flux-renderers-basic/index.tsx -- 入口文件内联 270+ 行渲染器定义

- **文件**: `packages/flux-renderers-basic/src/index.tsx` (315行)
- **现状**: basicRendererDefinitions 数组含 button 等冗长 propContracts
- **建议**: 提取到 basic-renderer-definitions.ts

### [维度02-F4] flux-formula/index.ts -- 入口文件内联工厂函数实现

- **文件**: `packages/flux-formula/src/index.ts` (90行)
- **现状**: createExpressionCompiler() 约 60 行逻辑代码内联
- **建议**: 移到 expression-compiler.ts

## P2 发现（7个）

- schema-compiler.ts (632行) -- 编排器，已委托给 14 个子模块，暂不拆
- runtime-factory.ts (519行) -- 薄委托组装层，与文档一致
- form-runtime.ts (500行) -- 薄委托，已拆分到 form-runtime-\* 子模块
- reaction-runtime.ts (504行) -- 两个紧密耦合职责
- api-data-source-controller.ts (530行) -- 单一内聚复杂控制器
- spreadsheet-toolbar.tsx (607行) -- 重复 JSX 模式，可提取 ToolbarButton
- designer-xyflow-canvas.tsx (557行) -- 复杂第三方库集成

## P3

- parser.ts (507行) -- 经典递归下降解析器，单一内聚，无需拆

## index.ts 审计

24 个包中 3 个入口文件存在实现泄露（flux-formula、flux-renderers-basic、flux-renderers-data）。

## 文档一致性

所有 docs/architecture/flux-runtime-module-boundaries.md 记录的文件锚点均存在且职责一致。

## 复核状态: 未复核
