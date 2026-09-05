# 当前实现状态总览

> 本文件是 `README.md` 的 §3，详细描述项目当前的实现基线。

## 文档共识审查记录（本文件）

> 依据项目文档共识审查惯例，本文件定稿前须经独立子 agent（fresh session）反复审查直到共识（判据：连续一轮 0 新增修正项；≤3 轮，超限升级人工）。记录如下：

- **Round 1（2026-09-05，fresh session 独立子 agent，batch 1）**：判定 `REVISE`——0 Blocker / 1 Major（M-1）/ 0 Minor / 1 Nit。**M-1** 渲染器依赖链线性表示不准确——`content`/`layout`/`mobile`/`industrial`/`scheduling` 均直接依赖 `flux-core`，非线性串联；已修正为并行分支拓扑图。**n-1** §2 引用标注建议增强（Nit 级，接受但不阻塞）。修正后全文复扫 0 新增。
- **Round 2（2026-09-05，fresh session 独立子 agent，batch 1 确认轮）**：判定 `AGREE`——M-1 修正项真实落地（§1 拓扑图正确展示并行分支，经 `flux-renderers-content/package.json` + `flux-renderers-layout/package.json` 验证均仅依赖 flux-core），0 新增修正项。**达成共识**（共识循环：R1 修正 1 轮 + R2 确认轮，未超轮次上限）。

---

## 1. 包结构与依赖层

项目为 pnpm workspace monorepo，核心依赖链：

```
flux-core → flux-formula → flux-compiler → flux-action-core → flux-runtime → flux-react
```

渲染器层（非线性，多条并行分支）：

```
flux-core
├── flux-renderers-basic → flux-renderers-data
├── flux-renderers-form ─┐
├── flux-renderers-content → flux-renderers-ai
├── flux-renderers-layout（独立）
├── flux-renderers-mobile（独立）
├── flux-renderers-industrial（独立）
└── flux-renderers-scheduling（独立）

flux-renderers-form-advanced ← form + data + content
```

设计器层：

```
flow-designer-core + flow-designer-renderers
report-designer-core + report-designer-renderers
spreadsheet-core + spreadsheet-renderers
word-editor-core + word-editor-renderers
```

基础设施：`ui`（shadcn/ui 组件）/ `tailwind-preset` / `theme-tokens` / `nop-debugger` / `i18n`

---

## 2. 核心原语与 DSL VM 定位

`docs/architecture/frontend-programming-model.md` 定义了七个 Flux 原语：

| 原语              | 语义                                   |
| ----------------- | -------------------------------------- |
| `Template`        | authoring 时元信息容器，运行时边界只读 |
| `ScopeRef`        | 运行时直接读取 Lexical Scope           |
| `Value`           | 运行时表达式求值                       |
| `Resource`        | 运行时数据获取                         |
| `Reaction`        | 运行时响应式副作用                     |
| `Capability`      | 运行时唯一写操作通道                   |
| `Host Projection` | 运行时 Host 快照只读读取               |

`docs/architecture/flux-dsl-vm-extensibility.md` 明确：**Flux 是 DSL VM，不是 authoring 平台**。扩展发生在加载期，不是运行期。浏览器端拿到的 schema 必须是最终执行模型。

---

## 3. 组件覆盖现状

| 类别            | 已实现                                                                  | 状态             |
| --------------- | ----------------------------------------------------------------------- | ---------------- |
| 通用渲染器      | ~55 个（结构/布局/表单/数据/内容/反馈）                                 | 全部 `runtime`   |
| 设计器 renderer | designer-page, report-designer-page, spreadsheet-page, word-editor-page | 全部 `runtime`   |
| 复合值字段      | object-field, array-field, variant-field, detail-field                  | 全部 `runtime`   |
| 移动端组件      | pull-refresh, infinite-scroll, swipe-cell, countdown, notice-bar        | 全部 `runtime`   |
| AI 对话渲染器   | message-bubble, streaming-output, conversation, tool-call, HITL         | 全部 `runtime`   |
| 工业 HMI/SCADA  | leafer-editor 引擎 + 24 内置图元 + 属性面板 + 连线 + undo-redo + 工具箱 | M1/M2/M3 全 done |
| 企业调度        | Gantt, Kanban, Calendar, BarcodeInput                                   | 全部 done        |
| Wave W1a-W4c    | 43 个组件全部 `runtime`                                                 | done             |

---

## 4. 设计器家族现状

| 设计器          | 核心包                                           | hostContract                                                   | 状态                                      |
| --------------- | ------------------------------------------------ | -------------------------------------------------------------- | ----------------------------------------- |
| Flow Designer   | flow-designer-core + flow-designer-renderers     | `designerHostContract` (family: `designer`, v1.0)              | 完整（graph + tree + DingFlow）           |
| Report Designer | report-designer-core + report-designer-renderers | `reportDesignerHostContract` (family: `report-designer`, v1.0) | 完整（spreadsheet + inspector + preview） |
| Spreadsheet     | spreadsheet-core + spreadsheet-renderers         | `spreadsheetHostContract` (family: `spreadsheet`, v1.0)        | 完整（可独立使用）                        |
| Word Editor     | word-editor-core + word-editor-renderers         | `wordEditorHostContract` (family: `word-editor`, v1.0)         | 完整（canvas-editor + 模板 + 数据集）     |
| SCADA Editor    | flux-renderers-industrial/src/editor/ (subpath)  | **缺失**（未显式声明 hostContract）                            | M1/M2/M3 done                             |
