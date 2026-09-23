# [card] page:taskflow-designer

- **批次**: R2-1b ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/taskflow-designer` ｜ **载体**: 域页面（TaskFlow 可视化设计器：Graph/Tree 双模式 tabs、nop-task DSL Export/Import/Save、palette、xyflow 画布、属性面板）
- **矩阵裁剪**: simplified（理由：① Tree 模式按 design.md §17.7 非自由拖拽设计，G3 拖拽以 Graph 模式 palette→canvas 为准，Tree tab 仅默认态抽查；② 长内容弹层：本页走查期间未发现 Dialog/Sheet（Export/Import/Save 未触发弹层证据，H 按本页可见弹层标记 n/a）；③ glass 未抽查（与 flow-designer 同主题壳））

## 1. 截图清单

| 状态                   | light                                                                                           | dark                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 默认 1280×800（Graph） | `_tmp/visual-inspection-2026-09-23/r2-1b/taskflow-designer/taskflow-designer-default-light.png` | `taskflow-designer-default-dark.png`       |
| 默认 ~800 宽           | `taskflow-designer-default-light-narrow800.png`                                                 | —                                          |
| hover（节点抽样）      | `taskflow-designer-node-hover-light.png`                                                        | —                                          |
| focus-visible          | pass（工具栏按钮 focus-visible ring 正常；画布节点同 R2-1b-A2-01 watch 项）                     | —                                          |
| 选中                   | `taskflow-designer-node-selected-light.png`                                                     | `taskflow-designer-node-selected-dark.png` |
| 弹层打开               | n/a（见裁剪理由 ②）                                                                             | —                                          |
| 拖拽进行中/落图        | `taskflow-designer-after-palette-drop-light.png`（HTML5 DnD 落图后）                            | —                                          |
| 面板编辑               | `taskflow-designer-g7-write-light.png`、`taskflow-designer-g7-write2-light.png`                 | —                                          |
| 缩放后选中             | `taskflow-designer-g5-zoomed-light.png`                                                         | —                                          |
| Tree 模式抽查          | `taskflow-designer-tree-default-light.png`                                                      | —                                          |

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 pass（工具栏 ring 正常；画布节点焦点环缺失同 R2-1b-A2-01 watch）A3 pass（toolbar 按钮 ≥26px；palette 加号 28px）A4 pass（Redo 初始禁用正确）A5 pass A6 pass（palette 拖拽落图成功、undo/redo 可逆）A7 n/a（无弹层）A8 pass（palette 点击"添加X"为拖拽替代路径）A9 pass
- B 颜色：B1 pass（dark 节点/画布文字可读）B2 pass B3 pass B4 pass B5 pass（画布本体 dark 良好；节点工具栏 pill 白底同 R2-1b-B5-01 systemic）B6 pass
- C 布局：C1 pass（仅 xyflow 常态裁切）C2 warn（调试器 chip 压页头标题，见 F4-03 注/flow 卡 C2-01 同源；本页 Back 在右侧未被盖，功能无阻）C3 pass C4 pass（800 宽正常）C5 pass C6 n/a
- D 间隔：D1 pass D2 pass D3 n/a D4 pass（toolbar 右组间距一致）D5 pass（表单间距成栅格）D6 n/a D7 pass D8 pass
- E 排布：E1 pass（TaskFlow 设计器/Export-Import-Save 主操作/Graph-Tree 模式 3 秒可答）E2 pass E3 pass（Back 在左、Export/Import/Save/Undo/Redo 成组在右）E4 pass E5 pass E6 pass
- F 一致性：F1 pass F2 pass（palette 238 / inspector 与 flow-designer 同档）F3 pass F4 warn(R2-1b-F4-03) F5 n/a
- G 设计器：G1 fail(→ R2-1b-G1-01 systemic，本页复现同证) G2 pass（cursor=grab）G3 pass（palette HTML5 DnD 7→8 节点；指针拖拽为同桥接实现）G4 n/a（模板常载）G5 pass（zoom 0.565→0.814，选中框/手柄零漂移 hx 0→0）G6 pass（Undo 8→7、Redo 即时启用且 7→8 正确重放）G7 **fail(R2-1b-G7-02)** G8 pass（dark 画布可读；工具栏 pill 归 B5-01）
- H 弹层：n/a（本页未见 Dialog/Sheet/Drawer 弹层；Export/Import/Save 为工具栏动作，未见弹层形态）

## 3. 发现条目

### [R2-1b-G7-02] 属性面板双向断链：字段不回填节点数据、写入不落盘

- **页面/路由**: `#/taskflow-designer`（Graph 模式，选中 Script 节点 validateInput）
- **主题/视口/状态**: light / 1280×800 / 选中节点后面板编辑
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/taskflow-designer/taskflow-designer-g7-write-light.png`、`taskflow-designer-g7-write2-light.png`
- **目视描述**: 选中节点后面板字段（Name/Display Name/Language/Source）全部为空，不回填节点现有值；"当前选中"摘要卡显示原始 id（script-1）而非节点名（validateInput）；在 Name 字段输入后画布不变。
- **程序化证据**:
  - 探针 1（读方向）: 选中 `validateInput`（Script 节点）→ `input[name="step.common.name"]` value=`""`（应为节点名）；摘要卡文本 `["当前选中","script-1","script-1"]`（title 与副标题均为 id）
  - 探针 2（写方向）: `fill(step.common.name, "renamedViaPanel")` → 输入框本地保留但 800ms 后画布 innerText 仍 `validateInput|…`；点击节点工具栏"编辑节点"后再写（`"renamedEdit"`）→ 画布仍不变
  - 对照组: 同页 Undo/Redo/拖拽落图均走 core 正常（排除断链为全局），断点限定 inspector 表单 ↔ 节点 data 绑定层；flow-designer 钉钉 tab 同类 tree inspector 写路径正常（R2-1b-G7-01 对照）
- **对照基准**: 检查提示词 G7（双向同步 + DOM 断言）；design.md §9.1 属性面板直接使用 schema 片段驱动
- **严重程度**: P1
- **用户影响**: 属性面板既不显示所选节点的任何属性，也无法把编辑写入节点——设计器"选中→查看→修改"闭环完全不可用，且无任何错误提示。
- **修复方向**: 排查 taskflow 页 inspector 表单初值绑定（`step.common.*` 字段未从 `activeNode.data` 回填——疑 snapshot 字段映射缺失或字段名错位）与提交链（onChange 未 dispatch `designer:updateNodeData` 或 dispatch 未接入 taskflow core）；摘要卡改用 `data.label ?? id`。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1b-F4-03] 工具栏术语中英混用（与 flow-designer 同语义操作不同语言）

- **页面/路由**: `#/taskflow-designer`（顶部工具栏）vs `#/flow-designer`
- **主题/视口/状态**: light / 1280×800 / 默认态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/taskflow-designer/taskflow-designer-default-light.png`
- **目视描述**: 同一设计器域内，taskflow 工具栏为 Back/Export/Import/Save/Undo/Redo（英文），flow-designer 为 返回/保存/撤销/重做（中文）；且 taskflow 页内快捷键提示卡又是中文（"Ctrl+Z 撤销"），页内自相混用。
- **程序化证据**:
  - 探针: 工具栏按钮 innerText 枚举 `["Back","Export","Import","Save","Undo","Redo"]`（recon 输出）；对照 `#/flow-designer` `["返回","自动布局","撤销","重做","恢复","JSON","保存"]`；同页快捷键卡为中文文案
- **对照基准**: 检查提示词 F4（同一概念不混用两种叫法）
- **严重程度**: P3
- **用户影响**: 跨设计器切换时操作词汇不统一；页面内部按钮语言与帮助文案不一致。
- **修复方向**: 统一 taskflow 工具栏按钮文案到中文（或全站设计器统一英文），并与快捷键卡对齐；建议进 designer 域术语矩阵（F1）一并收敛。
- **归族**: watch-only → 台账（单一页面文案层，无功能性影响；若其他设计器页复检同现英文化则升 systemic）
- **复核状态**: 未复核

### 共享族引用（不重复立项，证据已在本页复现）

- **R2-1b-G1-01（systemic）**: 画布节点选中无视觉标识——本页 `selected` 态 `border rgb(225,231,239)`/`boxShadow none` 与未选一致，`aria-pressed=true` 正常（截图 `taskflow-designer-node-selected-light.png`）。
- **R2-1b-B5-01（systemic → R2-3b 既有族）**: dark 下节点快捷工具栏 `bg-popover/96` 仍近白（`oklab(0.985…)`）——本页 dark 实测同值（截图 `taskflow-designer-node-selected-dark.png`）。
- **R2-1b-C2-01（systemic 候选）**: 固定调试器 chip (24,24,68×28) 在本页压住页头 "TaskFlow (Graph)" 标题（Back 按钮位于右侧未被盖，故本页影响为视觉层）。

## 4. 台账回写

- 本卡完成后：`ledger.md` `page:taskflow-designer` 行 status → `carded`（card 列填本路径）；
  findings 归族：G7-02 → local（R2-4 批）；F4-03 → watch-only；G1/B5/C2 → 引用 flow-designer 卡 systemic 族；
  批内复检通过后 → `verified`。
