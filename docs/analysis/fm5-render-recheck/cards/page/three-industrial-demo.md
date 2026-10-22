# [card] page:three-industrial-demo

- **批次**: FM-5 渲染面复检 · shard1（新增页全量，重点审：3D/数据源） ｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/three-industrial-demo`（domain 路由） ｜ **载体**: 域页面（plan 534 D2 数据源演示页）
- **矩阵裁剪**: simplified（matrixReason：default 视图四态矩阵 + live 数值流探针；"模拟断线"重连路径与 3D 联动场景归复检轮。裁掉：元素态、弹层、拖拽）

## 1. 截图清单

| 状态          | light                                                                                | dark                                                                                |
| ------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-10-18/three-industrial-demo-default-1280x800-light.png` | `_tmp/visual-inspection-2026-10-18/three-industrial-demo-default-1280x800-dark.png` |
| 默认 800×900  | `_tmp/visual-inspection-2026-10-18/three-industrial-demo-default-800x900-light.png`  | `_tmp/visual-inspection-2026-10-18/three-industrial-demo-default-800x900-dark.png`  |

## 2. A–H 维度勾选表

- A 交互：A1 n/a A2 pass A3 pass(模拟断线按钮达标) A4 pass A5 pass("—" 为首帧前占位，实测 ≤3s 出数) A6 n/a A7 n/a A8 n/a A9 pass(数值持续刷新)
- B 颜色：B1 pass B2 pass B3 pass(connected 语义正常) B4 pass B5 pass B6 n/a
- C 布局：C1 pass C2 pass C3 pass(单卡居中，demo 形态) C4 pass C5 pass C6 n/a
- D 间隔：D1 pass D2 pass D3 pass D4 pass D5 pass(三指标卡等距) D6 n/a D7 pass D8 pass
- E 排布：E1 pass E2 pass E3 pass E4 pass E5 pass E6 pass(空值有占位符)
- F 一致性：F1 pass F2 pass F3 pass F4 warn(FM5-S1-F-2) F5 n/a
- G 设计器：n/a ｜ H 弹层：n/a

## 3. 发现条目

### [FM5-S1-F-2] 页面标题与描述嵌入内部计划编号与 Non-Goals 裁定文案

- **页面/路由**: `#/three-industrial-demo`
- **主题/视口/状态**: light + dark / 全视口 / 默认
- **截图**: `_tmp/visual-inspection-2026-10-18/three-industrial-demo-default-1280x800-light.png`
- **目视描述**: 标题 "three-industrial 数据源演示页（plan 534 D2）"，描述含 "（ReconnectionManager retryCount 为 private——plan 534 Non-Goals 裁定，观测走 demo 侧合成源）"。
- **程序化证据**: 截图文字辨识 [visual-only]（受众意图归 plan 534 作者）
- **对照基准**: F4 术语与文案一致；面向受众的内容质量
- **严重程度**: P3（页面自述为"演示页"，开发受众可接受）
- **用户影响**: 非计划 534 参与者难以理解标题编号与裁定引用。
- **修复方向**: 标题去掉 "（plan 534 D2）" 或改为"重连可观测演示"；Non-Goals 说明移至页面下方折叠说明或 plan 文档。
- **归族**: local
- **复核状态**: 未复核

### 误报排除记录（本页）

- 矩阵四张截图三个指标卡均显示 "—"：live 探针（`_tmp/fm5-walk1-industrial-probe.mjs`）实测 t≈3s 起 `dataSources.temp=23→78.1→58.9`、`running=true`、`count=69→4→91` 持续刷新——截图采集早于合成 openSocket 首帧，非数据缺陷；"—" 为规范空值占位。
- 页面为纯数据源观测卡（无 3D 画布），与"重点审 3D canvas"预期不同属设计如此（3D 场景在 three-gallery）。

## 4. 台账回写

- 本卡完成：ledger 对应行 → `carded`（card = `docs/analysis/fm5-render-recheck/cards/page/three-industrial-demo.md`）。
