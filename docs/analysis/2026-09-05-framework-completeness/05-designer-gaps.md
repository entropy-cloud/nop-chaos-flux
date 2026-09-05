# 各 designer family 独立能力缺口

> 本文件分析每个 designer family 的能力现状和缺口。

## 文档共识审查记录（本文件）

> 依据项目文档共识审查惯例，本文件定稿前须经独立子 agent（fresh session）反复审查直到共识（判据：连续一轮 0 新增修正项；≤3 轮，超限升级人工）。记录如下：

- **Round 1（2026-09-05，fresh session 独立子 agent，batch 2）**：判定 `AGREE`——0 Blocker / 0 Major / 0 Minor / 0 Nit。事实准确性验证全部通过：SCADA hostContract 缺失、extractPanelFields 六类分组、DomainBridge 对齐度、跨设计器通用缺口均与 live repo 一致。
- **Round 2（2026-09-05，fresh session 独立子 agent，batch 2 确认轮）**：判定 `AGREE`——0 新增修正项。**达成共识**（共识循环：R1 修正 0 轮 + R2 确认轮，未超轮次上限）。

---

## 1. 设计器 Host Protocol 层

### 1.1 DomainBridge 显式对齐

`docs/architecture/complex-control-host-protocol.md` 定义了 `DomainBridge<TSnapshot, TCommand, TResult>` 接口。但各 designer 的 bridge 实现程度不同：

| Designer        | Bridge 实现                        | 是否显式 extends DomainBridge |
| --------------- | ---------------------------------- | ----------------------------- |
| Flow Designer   | `DesignerCore`                     | 结构兼容，未显式声明          |
| Report Designer | `SpreadsheetBridge`                | 结构兼容，未显式声明          |
| Word Editor     | `CanvasEditorBridge + editorStore` | 组合模式，未显式声明          |
| SCADA Editor    | 内部 engine adapter                | 未实现 DomainBridge           |

`WorkbenchSessionState`（dirty/busy/canUndo/canRedo/leaveGuardActive）仍然是 protocol-level reserved types，不是每个 host family 都已经统一接线到同一份运行时状态对象。

### 1.2 dirty/leave-guard 统一行为

| Designer        | dirty 语义                            | leave-guard |
| --------------- | ------------------------------------- | ----------- |
| Flow Designer   | `isDirty` 基于 document revision 比较 | 有          |
| Report Designer | `designer.dirty` 有独立 baseline      | 有          |
| Word Editor     | dirty 与 autosave/save commit 绑定    | 有          |
| SCADA Editor    | `workingCopy !== lastSaved`           | 有          |

虽然都有 dirty/leave-guard，但语义深度不同。

### 1.3 建议

1. 为每个 designer family 创建一个 `*BridgeAdapter` 类，显式 `implements DomainBridge`
2. 在 `complex-control-host-protocol.md` 中明确 dirty 比较的最低标准（如：至少基于 JSON snapshot 深比较）
3. Host manifest 的静态验证工具链（参见 `02-host-contract-manifest.md` §2 Gap 3）

---

## 2. Flow Designer 缺口

| 能力                            | 状态 | 说明                                                   |
| ------------------------------- | ---- | ------------------------------------------------------ |
| graph mode + tree mode          | ✅   | DingFlow 风格 chain + branch + implicit merge          |
| port 级连接模型                 | ✅   |                                                        |
| 节点类型系统                    | ✅   | nodeType + ports + edgeType + inspector + quickActions |
| undo/redo + transaction         | ✅   |                                                        |
| palette/canvas/inspector 三区域 | ✅   |                                                        |
| **协同编辑**                    | ❌   | 缺 CRDT/OT                                             |
| **版本对比/merge**              | ❌   | 缺 diagram diff                                        |
| **node type 运行时动态注册**    | ❌   | config 静态声明                                        |

协同编辑建议：先做调研，产出技术选型文档（Yjs vs Automerge vs 自研），评估与现有 undo/redo 栈和 snapshot 模型的集成成本。

---

## 3. Report Designer 缺口

| 能力                                              | 状态 | 说明                                                      |
| ------------------------------------------------- | ---- | --------------------------------------------------------- |
| spreadsheet core + 字段拖拽 + inspector + preview | ✅   |                                                           |
| 多 sheet 编辑                                     | ✅   |                                                           |
| nop-report 适配器                                 | ✅   |                                                           |
| **公式执行引擎**                                  | ❌   | 关键缺口，"不追求完整 Excel 兼容"但公式计算是复杂报表所需 |
| **协作编辑**                                      | ❌   | 同 Flow Designer                                          |
| **chart 嵌入**                                    | ❌   | chart renderer 已有但与 report designer 集成不完整        |

公式引擎建议：调研轻量 formula 引擎（如 formula-parser + 自定义求值器），评估与 `flux-formula` 包的集成路径。

---

## 4. Word Editor 缺口

| 能力                                         | 状态 | 说明           |
| -------------------------------------------- | ---- | -------------- |
| canvas-editor 集成 + 模板表达式 + 数据集管理 | ✅   |                |
| 模板标签（`<c:for>`, `<c:if>`, `<c:out>`）   | ✅   |                |
| **协作编辑**                                 | ❌   | 同上           |
| **track changes**                            | ❌   | 缺修订追踪     |
| **目录/书签/交叉引用**                       | ❌   | 高级结构化能力 |

---

## 5. SCADA Editor 缺口

| 能力                                       | 状态 | 说明                                           |
| ------------------------------------------ | ---- | ---------------------------------------------- |
| 编辑态/运行态双态隔离                      | ✅   |                                                |
| 端点吸附连线 + 多选/框选 + group/ungroup   | ✅   |                                                |
| undo-redo diff 命令栈                      | ✅   |                                                |
| 工具箱（对齐/分布/层级/复制粘贴/导入导出） | ✅   |                                                |
| 24 内置图元 + 拖拽放置                     | ✅   |                                                |
| 属性面板（六类分组 + validate）            | ✅   |                                                |
| 连线声明（pipe-junction + connections）    | ✅   |                                                |
| **hostContract 声明**                      | ❌   | 见 `02-host-contract-manifest.md` §2 Gap 1     |
| **动画编辑**                               | ❌   | runtime 支持 `when:'always'` 动画但编辑器缺 UI |
| **脚本/表达式编辑器**                      | ❌   | 绑定表达式只有简单输入框                       |
| **图层管理面板**                           | ❌   | 缺列表/搜索/可见性切换                         |

---

## 6. 跨设计器通用能力缺口

| 能力                   | 现状                                | 建议                         |
| ---------------------- | ----------------------------------- | ---------------------------- |
| schema 导入/导出标准化 | 各 family 各自实现                  | 定义 `SchemaCodec` 接口      |
| 撤销/重做统一          | 各 family 各自实现                  | 定义 `UndoRedoProtocol` 接口 |
| 预览/渲染分离          | 各 family 各自实现                  | 定义 `PreviewHost` 共享组件  |
| 版本控制集成           | JSON snapshot 可序列化但无 Git 集成 | 定义 schema diff viewer      |

### 6.1 SchemaCodec 接口建议

```typescript
interface SchemaCodec<ExternalFormat> {
  encode(schema: FluxSchema): ExternalFormat;
  decode(external: ExternalFormat): FluxSchema;
  readonly formatName: string;
  readonly fileExtension: string;
}
```

优先覆盖：BPMN（Flow Designer）和 Excel（Report Designer）。

### 6.2 UndoRedoProtocol 接口建议

```typescript
interface UndoRedoProtocol {
  push(entry: UndoEntry): void;
  undo(): UndoEntry | undefined;
  redo(): UndoEntry | undefined;
  canUndo(): boolean;
  canRedo(): boolean;
}
```

各 family 实现此接口但保留内部 diff 策略。

### 6.3 PreviewHost 共享组件建议

各 designer 都有 preview 能力，但预览的 schema 注入、scope 隔离、性能优化各走各路。建议定义一个 `PreviewHost` 组件，统一处理：

- schema 注入和 scope 创建
- 运行态渲染（只读，无编辑能力）
- loading/error 状态
- 性能优化（如 iframe 隔离、虚拟化）
