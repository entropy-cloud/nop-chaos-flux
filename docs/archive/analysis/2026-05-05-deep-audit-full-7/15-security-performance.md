# 维度 15：安全与性能红线

## 第1轮初审

- 安全红线：零发现。

### [维度15] Report Designer 首次字段源刷新失败被静默吞掉

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx:96-98`, `packages/report-designer-core/src/core.ts:329-335`
- **严重程度**: P1
- **类别**: 性能
- **规则编号**: P6
- **现状**: 首屏字段源加载失败被 `.catch(() => undefined)` 吞掉。
- **风险**: 派生刷新失败不可观测，字段面板可能长期空白/陈旧。
- **建议**: 对真实失败记录 monitor / 错误状态。

## 深挖第2轮追加

### [维度15] Spreadsheet 同步路径对每次文档变更执行整份 Report 文档 JSON 深拷贝

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx:113-115`, `packages/report-designer-core/src/core.ts:380-398`, `packages/report-designer-core/src/runtime/metadata.ts:10-12`
- **严重程度**: P1
- **类别**: 性能
- **规则编号**: P1
- **建议**: 仅复制 `spreadsheet` 子树或用结构共享更新。

## 深挖第3轮追加

### [维度15] Report Designer 每次元数据编辑都会把整份文档 JSON 深拷贝进 undo 栈

- **文件**: `packages/report-designer-core/src/core.ts:269-275`, `packages/report-designer-core/src/core-dispatch.ts:134-150`, `packages/report-designer-core/src/runtime/metadata.ts:10-12`
- **严重程度**: P1
- **类别**: 性能
- **规则编号**: P1
- **建议**: 改为 patch/command 级 undo 记录，或只快照受影响子树。

## 深挖第4轮追加

### [维度15] 字段源刷新为每次 provider 加载预先深拷贝整份设计器上下文

- **文件**: `packages/report-designer-core/src/runtime/field-sources.ts:42-49`, `packages/report-designer-core/src/runtime/adapter-context.ts:16-29`, `packages/report-designer-core/src/runtime/metadata.ts:10-12`
- **严重程度**: P1
- **类别**: 性能
- **规则编号**: P1
- **建议**: 优先传递只读快照/结构共享对象，避免每轮刷新前双拷贝整份文档。

## 深挖第5轮追加

### [维度15] Flow Designer 调色板在选择变更重渲染时对节点类型做重复线性查找

- **文件**: `packages/flow-designer-renderers/src/designer-palette.tsx:34-40,114-118`, `packages/flow-designer-renderers/src/designer-context.ts:161-168`
- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P2
- **建议**: 复用 `normalizedConfig.nodeTypes.get(id)` 或预建 `Map`。

## 深挖统计

- 第1轮发现数：1
- 第2轮新增：1
- 第3轮新增：1
- 第4轮新增：1
- 第5轮新增：1

## 维度复核结论

- 初审与深挖共 5 项，独立复核后保留 4 项、驳回 1 项。
- 安全红线继续零发现；性能侧最终保留的主项都集中在 report designer 的整份文档深拷贝热路径。

## 子项复核结论

- `[维度15] Report Designer 首次字段源刷新失败被静默吞掉`: 保留。真实失败被 `.catch(() => undefined)` 吃掉，导致字段面板失效且不可观测。
- `[维度15] Spreadsheet 同步路径对每次文档变更执行整份 Report 文档 JSON 深拷贝`: 保留。为取 `spreadsheet` 子树先 `cloneDocument(...)` 整份文档，属于高频同步路径上的真实重成本。
- `[维度15] Report Designer 每次元数据编辑都会把整份文档 JSON 深拷贝进 undo 栈`: 保留。`pushUndoEntry()` 每次都 `cloneDocument(current.document)`，会直接放大内存和序列化开销。
- `[维度15] 字段源刷新为每次 provider 加载预先深拷贝整份设计器上下文`: 保留。刷新前同时深拷贝 `document` 与 `designer.document`，而两者来自同一份文档，双拷贝问题成立。
- `[维度15] Flow Designer 调色板在选择变更重渲染时对节点类型做重复线性查找`: 驳回。`find()` 低效点存在，但发生在小规模 palette 渲染路径，证据不足以认定为性能红线。
