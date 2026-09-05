# 优先级矩阵与建议实施路径

> 本文件汇总所有改进方向的优先级排序和里程碑路径。

## 文档共识审查记录（本文件）

> 依据项目文档共识审查惯例，本文件定稿前须经独立子 agent（fresh session）反复审查直到共识（判据：连续一轮 0 新增修正项；≤3 轮，超限升级人工）。记录如下：

- **Round 1（2026-09-05，fresh session 独立子 agent，batch 2）**：判定 `AGREE`——0 Blocker / 0 Major / 0 Minor / 0 Nit。优先级合理性验证全部通过：P1/P2/P3 分档与既有分析一致，M1/M2/M3 里程碑拆解合理。
- **Round 2（2026-09-05，fresh session 独立子 agent，batch 2 确认轮）**：判定 `AGREE`——0 新增修正项。**达成共识**（共识循环：R1 修正 0 轮 + R2 确认轮，未超轮次上限）。

---

## 1. 优先级矩阵

| 优先级 | 方向                                    | ROI  | 理由                                                                         |
| ------ | --------------------------------------- | ---- | ---------------------------------------------------------------------------- |
| **P1** | hostContract manifest 工具链闭环        | 极高 | 已有 manifest 设计 + 编译器 action validation，只差消费路径统一和 SCADA 补齐 |
| **P1** | source-location diagnostics 回溯链      | 高   | 前后端生产线的关键闭环                                                       |
| **P1** | designer 共享 SelectionInspector helper | 中高 | 减少 4 个 family 重复实现                                                    |
| **P2** | 编译期依赖推断                          | 中   | 性能优化，对大 schema 场景影响显著                                           |
| **P2** | 协同编辑框架调研                        | 中   | 设计器核心竞争力                                                             |
| **P2** | formula 执行引擎                        | 中   | Report Designer 能力提升关键                                                 |
| **P3** | 公式编辑器集成                          | 低中 | 编辑体验提升                                                                 |
| **P3** | 统一 undo/redo 协议层                   | 低中 | 减少跨 family 重复                                                           |
| **P3** | schema 导入/导出标准化                  | 低   | 降低外部生态对接成本                                                         |

---

## 2. 建议里程碑路径

```
M1 (短期): SCADA hostContract 补齐 + 消费路径统一 + SelectionInspector helper
M2 (中期): source-location 回溯链 + 编译期依赖推断 + manifest CLI 工具
M3 (长期): 协同编辑调研 + formula 引擎 + schema codec 框架
```

### 2.1 M1 详细拆解

| 工作项                            | 包                          | 预估   |
| --------------------------------- | --------------------------- | ------ |
| SCADA Editor hostContract 声明    | flux-renderers-industrial   | 1-2 天 |
| 消费路径统一（nop-debugger + CI） | nop-debugger, flux-compiler | 2-3 天 |
| SelectionInspector 共享组件       | flux-react 或 ui            | 3-5 天 |
| workbench keyboard 导航标准文档   | docs/architecture           | 1 天   |

### 2.2 M2 详细拆解

| 工作项                                | 包                       | 预估   |
| ------------------------------------- | ------------------------ | ------ |
| `xui:location` 类型定义 + Loader 保留 | flux-core                | 2-3 天 |
| 编译器 diagnostics 使用 location      | flux-compiler            | 2-3 天 |
| nop-debugger 跳转到 schema 源         | nop-debugger             | 2-3 天 |
| Simple expression scope path 推断     | flux-compiler            | 3-5 天 |
| Manifest validation CLI               | flux-compiler, flux-core | 3-5 天 |

### 2.3 M3 详细拆解

| 工作项                    | 包                                 | 预估    |
| ------------------------- | ---------------------------------- | ------- |
| 协同编辑技术选型文档      | docs/analysis                      | 3-5 天  |
| Formula 引擎调研          | flux-formula, report-designer-core | 5-10 天 |
| SchemaCodec 接口定义      | flux-core                          | 2-3 天  |
| UndoRedoProtocol 接口定义 | flux-core                          | 1-2 天  |

---

## 3. 与既有分析文档的关系

本报告与以下既有文档的关系：

| 文档                                                                              | 关系                                                                                                       |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `docs/archive/analysis/2026-04-26-flux-architecture-improvement-opportunities.md` | 本报告的 §3（diagnostics）和 §4（hostContract）延续其 §1-4 的四个改进方向，增加了代码级 gap 分析和实施路径 |
| `docs/architecture/capability-projection-manifest.md`                             | 本报告的 hostContract 分析详细审计了该文档设计的工具链落地状态                                             |
| `docs/architecture/complex-control-host-protocol.md`                              | 本报告的 DomainBridge 分析审计了该文档定义的协议在各 family 的实现对齐度                                   |
| `docs/architecture/designer-workbench-shell.md`                                   | 本报告的 workbench shell 深化分析审计了共享 shell 的改进方向                                               |
| `docs/components/roadmap.md`                                                      | 本报告的组件覆盖分析基于其全部 wave done 的状态确认基线                                                    |
| `docs/components/roadmap-industrial-hmi-editor.md`                                | 本报告的 SCADA 缺口分析基于其 E0-E10 全 done 的状态识别剩余缺口                                            |
