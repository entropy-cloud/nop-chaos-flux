# 第二轮 P2 路由裁决表（round2-dr-adjudication）

> 生成：2026-08-08，来源 plan `docs/plans/2026-08-08-0900-1-round2-d31-flow-designer-surface-audit.md` Phase 4（flow-designer 大面审计 P2 路由登记）
> 方法：13 面审计卡（`docs/audits/host-surface/fd-*.md`）发现分级 → P2 显式路由 DR；每条目含缺陷、`文件:行`、路由 DR
> 用途：DR 跨面集中修复（roadmap DR 行）的登记基线。零悬挂：卡内 P2 清单 = 本表条目。
> 先例：`docs/audits/round2-p3-adjudication.md`（P3 裁决表结构先例，D2 交付）
> 联动：roadmap DR 行（跨面集中修复与裁决）依赖本登记；D3.2–D3.4（spreadsheet/report-designer/word-editor）后续 P2 路由追加登记到本表。

## 零登记基线（2026-08-08 建表时刻）

- D0/D1/D2 已登记 P2 = **0 条**（D1 plan completed 零登记项；D2 P3 裁决轮无 P2 路由）。
- 本表为 D3.x 首个写入者；建表后写入 flow-designer 大面 P2 路由条目（§1）。

## 计数汇总（live 2026-08-08）

| 分类     | 条数  | 说明                                                                                              |
| -------- | ----- | ------------------------------------------------------------------------------------------------- |
| P2 路由  | 2     | DR-1（fd-7 错误消息 i18n）+ DR-2（fd-2 默认标签 i18n）                                            |
| 卡内 P3  | 9     | 卡内记录不路由（fd-1 ×2 / fd-2 ×1 / fd-3 ×1 / fd-4 ×1 / fd-5 ×1 / fd-6 ×1 / fd-11 ×1 / fd-12 ×1） |
| **合计** | **2** | 与 13 卡发现清单逐条对齐（卡内 P2 零悬挂）                                                        |

## 1. P2 路由条目（2 条）

| ID   | 面   | 缺陷                                                            | `文件:行`                                                                                                    | 路由 DR      | 说明                                                                                |
| ---- | ---- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------ | ----------------------------------------------------------------------------------- |
| DR-1 | fd-7 | 命令适配器错误消息硬编码英文 9 处（用户可见 via env.notify）    | `designer-command-adapter.ts:85/:128/:193/:214/:222/:232/:278` + `designer-command-adapter-graph.ts:61/:146` | 跨面集中修复 | i18n 化 + 复用既有 `flux.flowDesigner.*` t() key 族；非阻断（英文可读，无功能损失） |
| DR-2 | fd-2 | DEFAULT_NODE_TYPE_META 默认节点标签硬编码中文 15 条（用户可见） | `designer-node-appearance.ts:3-20`（消费点 `designer-canvas.tsx:177-186`、`designer-inspector.tsx:74`）      | 跨面集中修复 | i18n key 化 + 动态 typeId 解析；host 配置 label 时不受影响；非阻断                  |

## 2. 卡内 P3 记录（9 条，不路由）

| 面    | 编号 | 内容                                                       | `文件:行`                                               |
| ----- | ---- | ---------------------------------------------------------- | ------------------------------------------------------- |
| fd-1  | P3-1 | canvas 根 aria-label 硬编码英文 "Flow designer canvas"     | designer-canvas.tsx:409、designer-xyflow-canvas.tsx:276 |
| fd-1  | P3-2 | 测试专用 window 事件监听 nop-designer:test-start-reconnect | designer-canvas.tsx:138-169                             |
| fd-2  | P3-1 | nodeAriaLabel "Selected Node …" 硬编码英文                 | designer-xyflow-node.tsx:175                            |
| fd-3  | P3-1 | "Edge actions for …" aria-label 硬编码英文                 | designer-xyflow-edge.tsx:146                            |
| fd-4  | P3-1 | "Empty branch slot for …" aria-label 硬编码英文            | designer-xyflow-node.tsx:225                            |
| fd-5  | P3-1 | generic 字段用数据 key 作 Label（数据驱动）                | designer-inspector.tsx:91,403                           |
| fd-6  | P3-1 | "Tree host input rejected: …" 英文诊断消息                 | designer-tree-mode.tsx:126                              |
| fd-11 | P3-1 | copy 仅取 selectedNodeIds[0]（多选复制丢弃其余）           | core.ts:357、shell-state.ts:71                          |
| fd-12 | P3-1 | minimap/pan/zoom 无键盘等价路径（ReactFlow 原生限制）      | designer-xyflow-canvas.tsx:289-297                      |

## 3. 维护

- D3.2–D3.4 审计发现的 P2 按同模板追加登记（ID 顺延 DR-3+）；DR 集中修复（roadmap DR 行）消费本表后逐条勾销。
- 本表零悬挂声明：13 卡 P2 清单（fd-2 P2-1 / fd-7 P2-1）已全部登记，卡内无未登记 P2。
