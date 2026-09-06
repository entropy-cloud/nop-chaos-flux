# 建议的下一步行动

> 本文件列出基于分析结果的可立即执行的下一步行动。

## 文档共识审查记录（本文件）

> 依据项目文档共识审查惯例，本文件定稿前须经独立子 agent（fresh session）反复审查直到共识（判据：连续一轮 0 新增修正项；≤3 轮，超限升级人工）。记录如下：

- **Round 1（2026-09-05，fresh session 独立子 agent，batch 2）**：判定 `AGREE`——0 Blocker / 0 Major / 0 Minor / 0 Nit。行动项可执行性验证通过：manifest 文件路径正确、SCADA hostContract 补齐描述与现状一致、时间线与里程碑对齐。
- **Round 2（2026-09-05，fresh session 独立子 agent，batch 2 确认轮）**：判定 `AGREE`——0 新增修正项。**达成共识**（共识循环：R1 修正 0 轮 + R2 确认轮，未超轮次上限）。

---

## 1. 立即可执行

### 1.1 创建 SCADA hostContract 补齐 plan

在 `docs/plans/` 中创建 execution plan，内容：

- 在 `packages/flux-renderers-industrial/src/editor/` 中为 `scada-editor-canvas` renderer definition 补充 `hostContract` 声明
- 参考其他四个 family 的 manifest 实现（`designer-manifest.ts`, `report-designer-manifest.ts`, `spreadsheet-manifest.ts`, `word-editor-manifest.ts`）
- 定义 SCADA Editor 的 projection fields（symbols, config, mode, viewport 等）和 capability methods（addSymbol, removeSymbol, updateSymbol, save, load 等）
- 添加 `capabilityPublication` 声明
- 补充测试

### 1.2 补充 docs/index.md 路由

在 `docs/index.md` 的 "Read This First" 表格中添加：

```
| Review framework completeness gaps and designer improvement opportunities | `docs/analysis/2026-09-05-framework-completeness/README.md` | `docs/archive/analysis/2026-04-26-flux-architecture-improvement-opportunities.md` |
```

### 1.3 更新 daily dev log

在 `docs/logs/2026/09-05.md` 中记录本次分析产出。

---

## 2. 本周可启动

### 2.1 source-location diagnostics 设计文档

在 `docs/architecture/` 中创建 `source-location-diagnostics.md`，内容：

- `xui:location` 类型定义
- Loader 保留 location 的规则
- 编译器 diagnostics 使用 location 的方式
- nop-debugger 集成方案

### 2.2 SelectionInspector 共享组件设计

在 `docs/architecture/` 中创建 `designer-selection-inspector.md`，内容：

- 共享组件 API 设计
- 各 family 的 adapter 模式
- 与 workbench shell 的集成点

---

## 3. 本月可启动

### 3.1 manifest validation CLI prototype

在 `packages/flux-compiler/src/` 中实现 standalone CLI：

```bash
pnpm validate:host-contract <schema-file> [--family designer] [--version 1.0]
```

### 3.2 编译期 simple expression optimizer

在 `packages/flux-compiler/src/` 中实现 simple expression scope path 推断。

---

## 4. 下季度可启动

- 协同编辑技术选型（Yjs vs Automerge vs 自研）
- Formula 引擎调研（formula-parser + 自定义求值器）
- SchemaCodec 接口定义和 BPMN/Excel 首批 codec 实现
