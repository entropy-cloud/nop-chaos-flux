# [card] control:graph

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/graph-demo` ｜ **载体**: 域 demo 页（Graph Viewer：Trace Hierarchy dagre LR 卡 + Flow Layout 卡 + Malformed 卡 + Empty 卡；SVG/foreignObject DOM 渲染，非 canvas）
- **矩阵裁剪**: full（matrixReason：节点拖拽中/缩放平移/选中态/布局切换四项 FULL 必查全部程序化执行；G4/G6/G7 按 viewer 口径 n/a（无编辑会话）；弹层 n/a（页面无弹层载体）；loading/error 无异步源——Malformed/Empty 为静态 fixture）
- 本页实际裁掉的状态：弹层、编辑型设计器态（G6/G7）、glass 皮肤

## 1. 截图清单

| 状态                       | light                                                                        | dark（真 data-mode）                                                        |
| -------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 默认 1280×800              | `_tmp/visual-inspection-2026-09-25/r2-2c/graph/graph-default-light-1280.png` | `_tmp/visual-inspection-2026-09-25/r2-2c/graph/graph-default-dark-1280.png` |
| 默认 ~800 宽               | `_tmp/visual-inspection-2026-09-25/r2-2c/graph/graph-default-light-800.png`  | —（窄视口风险=布局折叠，light 已证 docOverX 0；dark 壳层与 1280 同令牌链）  |
| 节点选中态                 | `graph-node-selected-light-1280.png`                                         | —                                                                           |
| 节点拖拽进行中             | `graph-nodedrag-mid-light-1280.png`                                          | —（拖拽行为与主题无关）                                                     |
| 缩放 2 步后                | `graph-zoom2x-light-1280.png`                                                | —                                                                           |
| 布局切换（hierarchy→flow） | `graph-layout-flow-light-1280.png`                                           | —                                                                           |
| Focus Error Node 联动      | —                                                                            | `graph-focus-error-dark-1280.png`                                           |

## 2. A–H 维度勾选表

- A 交互：A1 pass（palette/hover 族 shadcn）A2 pass（rail 按钮 shadcn Button focus-visible 契约在；程序态 focus 无环属启发式伪影，按误报表不立）A3 pass（rail 全部 32×32；smallTargets=0）A4 n/a A5 pass（Empty 卡"暂无数据"、Malformed 卡悬垂边跳过不抛错）A6 pass（节点拖拽跟手、松手驻留：left 292→382 实测）A7 n/a A8 pass（Focus/布局/缩放均有按钮替代）A9 pass（focusNode 后视口 pan、选中→onSelectionChange 落 scope）
- B 颜色：B1 pass（light 正文对比正常）B2 pass B3 pass（level 语义色 light 同源：Policy=amber、API Call=red、Compose=green）B4 pass B5 **维持 R2-1c-B5-01**（dark 页头 1.19:1）+**维持 R2-1c-B5-02**（dark info badge 1.1:1；扩展证据：danger badge dark 3.62:1 亦低于 4.5）B6 pass
- C 布局：C1 pass（页级 docOverX/docOverY 0；react-flow viewport/edges/nodes 容器 overX 为 transform 层内部量测，白名单排除）C2 **维持 R2-1c-C2-01**（尾节点 61px 全幅落入 rail 区间 interX 61/interY 27）C3 pass C4 pass（800 宽单列 571/736、docOverX 0）C5 pass C6 n/a（SVG DOM 自适应，无 canvas）
- D 间隔：D1–D8 pass/n-a（卡片 gap-4 栅格）
- E 排布：E1 **维持 R2-1c-E1-01**（hierarchy 默认视图节点 61×27 不可读、卡面 ~80% 空白）E2 pass E3 pass E4 pass（flow 卡同列左缘对齐 ≤1px）E5 pass E6 pass（Empty 卡引导）
- F 一致性：F1 pass（两数据卡 rail 同构）F2 pass F3 pass（Empty/Malformed 空态模式与 pivot/map 页一致）F4 warn（rail aria"放大/缩小/适应视图"中文 vs 英文 demo = R2-2a-F4-11 族引用）F5 n/a
- G 设计器（viewer 口径）：G1 pass（选中态 level 色边框 rgba(239,67,67,.55)+投影，与 hover 可区分——error 节点选中边框即 level 红，语义一致）G2 **warn(R2-2c-G2-128)**（节点 cursor default，可拖但无 grab 光标）G3 n/a G4 pass G5 pass（rail 缩放 2 步 scale 0.328→0.472、节点 61→88px；fitView 按钮在列）G6 n/a G7 n/a G8 pass（dark 节点 248,250,252 on 15,23,41 = 15:1）
- H 弹层：n/a（全列）

## 3. 发现条目

### [R2-2c-G2-128] 图节点可拖拽但 cursor 为 default——拖拽可供性缺失（R2-1b-G2-01 拖拽光标族新域实例）

- **页面/路由**: `#/graph-demo`（四卡全部 `.nop-graph [data-slot="graph-node"]`；任何可拖 graph 实例同险）
- **主题/视口/状态**: light+dark / 1280 / hover
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/graph/graph-default-light-1280.png`（Flow 卡节点 hover 无光标变化）
- **目视描述**: 悬停节点时光标保持默认箭头；节点实际可拖（拖拽实测位移驻留），可供性零表达。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w4-graph.mjs` hoverCursor 段
  - 输出: `hoverCursor {cursor:"default"}`（hierarchy 与 flow 卡同值）；对照拖拽探针 `dragEnd {left:292→382, top:257→307}` 证明可拖。
- **对照基准**: 检查提示词 G2（可拖元素 hover 有 cursor 变化）；watch-pool R2-1b-G2-01（flow palette 无 grab 光标——同根因族跨设计器/图组件复现）。R2-1c 页单元 G2 记 pass 与本波实测冲突，以本波探针为准提请复核改判。
- **严重程度**: P3
- **用户影响**: 可拖性只能靠尝试发现；与 dashboard-editor 面板（R2-2c-G2-127）同族，系统性收一组修复成本低。
- **修复方向**: `flux-renderers-graph/src/graph-node.tsx` 节点容器加 `cursor-grab`（拖拽中 `cursor-grabbing`，React Flow 拖拽态可经 className 切换）。
- **归族**: watch-only → 台账（并入 R2-1b-G2-01 拖拽光标族；与 R2-2c-G2-127 同批修）
- **复核状态**: 已复核（驳回，review-b 2026-09-25）："拖拽驻留"实为 viewport pan（节点 rect 与 transform 同步 +90/+50 后驻留）；源码 `nodesDraggable={false}`（xyflow-canvas.tsx L107）与 owner-doc 只读定位一致，不存在可拖实例；原卡提请的 R2-1c pass 改判不成立，cursor-grab 修复方向属有害修复

## 4. R2-1c 页单元裁定复检对照（本波现状，均"维持"，不重复立项）

| R2-1c 条目                                            | 现状探针值（2026-09-25）                                                                                                                    | 结论                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| R2-1c-E1-01 hierarchy 默认视图节点 61×27 不可读（P1） | `nodeSizes 61×27 ×6`、fitView 实际运行（viewport scale 0.328——缩太远是节点固有宽 61px 所致，node 内容 overX 3 = min-w-40 量测丢失症状仍在） | **维持**                                               |
| R2-1c-C2-01 尾节点滑入控制条下（P2）                  | rail `{x:360,w:79}` vs 尾节点 `{x:372,w:61}` → interX 61 / interY 27 全遮                                                                   | **维持**                                               |
| R2-1c-B5-01 dark 页头 bg-white 1.07:1（P2）           | 本波实测 headerBg rgb(255,255,255)、h1 1.19:1（dark，真 data-mode）                                                                         | **维持**                                               |
| R2-1c-B5-02 dark info badge 前后景同浅色（P2）        | info badge `rgb(178,206,251) on rgb(203,186,252)` = 1.1:1；扩展：danger badge dark 3.62:1（<4.5）、warning 9.21 / success 9.78 正常         | **维持**（danger 低于 4.5 作为该族新证据并入，不另立） |

## 5. 已知族命中（引用，不另立项）

- i18n zh-CN 回退（R2-2a-F4-11 族）：rail aria"放大/缩小/适应视图/切换布局"、搜索 placeholder"搜索节点…"。
- 拖拽光标族（R2-1b-G2-01）：本波新域实例 R2-2c-G2-128。
- 宿主 dark 残留：页脚 classic/light 宿主下拉 dark 亮底（页级引用）。

## 6. 交互键（上报主 session 合并）

`graph-demo` 无既有键，上报新键：

```json
{
  "graph-demo": [
    { "action": "waitFor", "selector": ".nop-graph", "ms": 2000 },
    { "action": "clickText", "text": "Focus Error Node" },
    { "action": "waitFor", "ms": 800 }
  ]
}
```

## 7. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `graph`（control）→ carded；
  R2-2c-G2-128 → watch（拖拽光标族）；四处 R2-1c 维持项不改判原裁定；归族后 → digested。
