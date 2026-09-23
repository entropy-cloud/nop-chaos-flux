# [card] page:tree-display-ux

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/tree-display-ux` ｜ **载体**: 域 demo 页（`apps/playground/src/pages/tree-display-ux-demo.tsx`，tree 四实例：搜索/图标/引导线/三能力叠加）
- **矩阵裁剪**: simplified + 交互中间态全查（搜索过滤/自动展开/高亮/空态、折叠展开、节点选中、dark、800；无弹层无拖拽）

## 1. 截图清单

| 状态                             | light                                                      | dark                                                     |
| -------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| 默认 1280（首屏/页尾）           | `default-light-1280.png` / `default-light-1280-bottom.png` | `default-dark-1280.png` / `default-dark-1280-bottom.png` |
| 全页长图                         | `full-light-1280.png` / `full-dark-1280.png`               | 同左                                                     |
| 搜索过滤（Home → 自动展开+高亮） | `search-filter-light.png`                                  | —                                                        |
| 搜索空态                         | `search-empty-light.png` / `search-empty2-light.png`       | —                                                        |
| 折叠分支后                       | `collapsed-branch-light.png`                               | —                                                        |
| 节点选中                         | `node-selected-light.png`                                  | —                                                        |
| ~800 宽                          | `default-light-800.png` / `full-800-light.png`             | —                                                        |

## 2. A–H 维度勾选表

- A 交互：A1 pass（行 hover/chevron 可点）A2 pass（搜索框 focus 环可见）A3 **warn（展开/折叠钮 20×20，14 处 → A3 小目标族实例）** A4 n/a A5 **pass（空态「无匹配节点」非空白；搜索空态即时）** A6 n/a A7 n/a A8 n/a A9 pass（折叠/展开/选中/过滤即时可见）
- B 颜色：B1 pass（dark 节点文字 `rgb(230,236,243)`，17:1 级）B2 pass B3 pass（高亮 amber=warning/30，搜索标记语义可接受）B4 pass（高亮走 warning 令牌）B5 pass（dark 引导线/图标/文字全适配）B6 pass
- C 布局：C1 pass C2 pass C3 pass C4 pass（800 单列无挤压）C5 pass C6 n/a
- D 间隔：D1 pass（行高一致，无离群行）D2–D8 pass
- E 排布：E1 pass（四节三问可答）E2 pass E3 pass E4 **pass（缩进步进一致：同级节点 label 左缘对齐，深度步进 ~36px 均匀，探针 x 坐标序列 + 截图确认）** E5 pass E6 pass
- F 一致性：F1–F5 pass（四个实例同一树视觉语言统一）
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（本页无 P0–P2 新发现；三能力全部程序化通过。）

**能力验证记录（`_tmp/r2-1d-probes/w5-tree-out.json`）**:

- 搜索过滤: 输入 "Home" → 自动展开 `src → pages → HomePage` 祖先链，匹配子串以 `<mark>` 高亮（`bg-warning/30 px-0.5`，amber 底）✔；输入 "zzzz" → 「无匹配节点」✔；清空恢复 ✔
- 节点图标: showIcon + iconField → icon 树 16 个 svg（folder/file-text 分级渲染）✔；guide 树未配置图标则仅 chevron（5 svg）✔
- 引导线: showGuideLine → 各深度垂直引导线渲染（border 实现，类名扫描为 0 属实现方式，视觉确认存在）✔
- 折叠/展开: chevron 点击收起分支（Button.tsx 隐藏）再展开 ✔
- 选中态: 点击 Button.tsx → 行底色 `rgb(241,245,249)`（slate-100，light 下偏淡但可辨）✔
- dark: 文字/图标/引导线全适配，无亮块残留 ✔

**观察（P3 级，随族观察不立项）**: ① 引导线无水平枝线（leaf 与垂直线间无横向连接刻痕，VSCode 式树有），层级回溯依赖纯缩进；② 20×20 chevron → A3 小目标族（R2-1a-A3 族 / R2-1d-A3 已裁定口径）；③ 选中底色 slate-100 在 light 偏淡（选中 vs hover 区分度低），dark 态选中样式未单独采样（复核可补）。

## 4. 台账回写

- 本卡完成后：ledger.md `tree-display-ux` 行 status → `carded`；本页无需 digested findings。
