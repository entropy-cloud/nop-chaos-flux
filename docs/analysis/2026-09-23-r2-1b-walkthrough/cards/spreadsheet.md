# [card] page:spreadsheet

- **批次**: R2-1b ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/spreadsheet`（根级 hash 路由） ｜ **载体**: 设计器域页面（standalone spreadsheet host：SpreadsheetDemo + 页头壳；spreadsheet-core/renderers）
- **矩阵裁剪**: full（裁剪项：glass 皮肤未抽查——本波统一裁剪；G4/G5 裁剪——网格按文档占用恒非空、无空态概念，runtime viewport 支持 zoom 但本页无任何缩放 UI（owner doc §6/§8：zoom 仅 host contract 可达），无从取证；A4 裁剪——本页未提供 readonly 切换入口，无 disabled 控件可采样；loading 帧未捕获——纯本地同步文档无异步面）

## 1. 截图清单（状态矩阵，逐张列路径）

| 状态                     | light                                                                                    | dark                                       |
| ------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------ |
| 默认 1280×800            | `_tmp/visual-inspection-2026-09-23/r2-1b/spreadsheet/spreadsheet-default-wide-light.png` | `…/spreadsheet-default-wide-dark.png`      |
| 默认 800×900             | `…/spreadsheet-default-narrow-light.png`                                                 | `…/spreadsheet-default-narrow-dark.png`    |
| 单元格选中（G1）         | `…/spreadsheet-cell-selected-light.png`                                                  | `…/spreadsheet-cell-selected-dark.png`     |
| 加粗面板→画布（G7）      | `…/spreadsheet-bold-applied-light.png`                                                   | —                                          |
| 列宽拖拽中（G3）         | `…/spreadsheet-col-resize-mid-light.png`                                                 | —                                          |
| 填充柄拖拽中（G3/G6）    | `…/spreadsheet-fill-drag-mid-light.png`、`…/spreadsheet-fill-applied-light.png`          | —                                          |
| undo 后（G6）            | `…/spreadsheet-after-undo-light.png`                                                     | —                                          |
| 行选中（G1 变体）        | `…/spreadsheet-row-selected-light.png`                                                   | —                                          |
| 右键菜单                 | `…/spreadsheet-context-menu-light.png`                                                   | —                                          |
| 查找替换面板开           | `…/spreadsheet-find-replace-open-light.png`                                              | `…/spreadsheet-find-replace-open-dark.png` |
| 行高 Dialog（H1/H5）     | `…/spreadsheet-row-height-dialog-light.png`                                              | —                                          |
| 网格滚动 sticky（C5）    | `…/spreadsheet-grid-scrolled-sticky-light.png`                                           | —                                          |
| 键盘 focus-visible（A2） | `…/spreadsheet-kbd-focus-toolbar-light.png`                                              | —                                          |

探针：`_tmp/r2-1b-probes/spreadsheet-phase{1,2,3,4}.mjs` → 同名 `-out.json`（重画布页单脚本 8.5–13.2s，远低于 60s 上限，无超时放宽需要）。

## 2. A–H 维度勾选表

- A 交互：A1 ✔（单元格 hover `cursor: cell`；工具栏按钮 hover 生效） A2 ✔（键盘 Tab 后 `matches(':focus-visible')=true`，3px oklab ring，探针坐实） A3 **warn(R2-1b-A3-01)**（corner/列头/行头按钮 21px 高 <24） A4 n/a（裁剪，见上） A5 n/a（无异步） A6 ✔（列宽拖拽 mid 帧跟手、宽度 80→140 精确；填充柄拖拽 `data-fill-dragging=true` + 序列填充 B1:B3=42/43/44） A7 ✔（行高 Dialog：close 钮、遮罩、focus 落入弹层、Esc 关闭均探针坐实） A8 ✔（行高/列宽 Dialog 替代拖拽、向下填充按钮替代填充柄、冻结有工具栏钮） A9 ✔（底部 log 面板逐条回显 Selected/Undo/Series fill/Formula set）
- B 颜色：B1 ✔（cell 12.61:1、colHeader 7.58:1） B2 ✔（选中框 `--ss-active` 2px） B3 ✔ B4 ✔（`--ss-*` 令牌双主题对称，canvas-styles.css :root/:root[data-mode=dark]） B5 ✔（dark 全套令牌平价：cell 15.01:1、选中框 rgb(52,211,153)、swatch 色经 `--ss-warn/ok/drop-bg` 变体仍可辨色相） B6 ✔
- C 布局：C1 ✔（唯一 clipY 为虚拟化 spacer（sy=22）且位于滚动容器内） C2 **warn(R2-1b-C2-01)**（查找替换面板浮于视口左上角遮宿主页头） C3 ✔（页头/工具栏/网格/tab 栏/日志五区可辨） C4 ✔（800px 下工具栏 overflow-x:auto 可滚动，白名单有意滚动；网格自适应多显示行） C5 ✔（thead sticky，滚动 600px 后表头仍在位，滚动容器仅 1 个无双滚动条） C6 n/a（DOM table 非 canvas）
- D 间隔：D1 ✔（工具栏组内 gap 6×20 均一、页级块距 12px 栅格） D2 ✔ D3 ✔（行高 24px×27 全一致，仅虚拟化 spacer 4152px 例外——非用户可见行） D4 ✔（工具栏 p-2/gap-1 均一） D5 n/a D6 n/a（无分页条） D7 ✔（工具栏↔网格有 border 分隔） D8 ✔
- E 排布：E1 ✔ E2 ✔ E3 ✔ E4 ✔（列头/行头对齐探针无偏差） E5 ✔ E6 ✔
- F 一致性：F1 ✔（撤销/重做/查找替换等图标语义常规） F2 ✔（工具栏上/网格中/tab 栏下结构与 report-designer spreadsheet canvas 同构） F3 ✔ F4 ✔ F5 n/a
- G 设计器：G1 ✔ G2 ✔ G3 ✔ G4 n/a（裁剪） G5 n/a（裁剪：无缩放 UI） G6 ✔ G7 ✔（双向） G8 ✔
- H 弹层：H1 ✔（行高/列宽 Dialog 480px = `--overlay-size-sm` 档） H2 n/a（无 Sheet/Drawer） H3 ✔（maxH 未超视口） H4 ✔（关闭钮独立于标题无重叠） H5 ✔（取消 x=712 → 确认 x=792 右对齐、次/主位正确） H6 ✔（单输入 + label 上置） H7 ✔ H8 n/a（短内容无滚动） H9 ✔（maxWidth calc(100%-32px) 契约在）——注：查找替换为内嵌 panel 非 Dialog/Sheet，H2/H8 不适用

## 3. 发现条目

### [R2-1b-A3-01] 网格 corner/列头/行头按钮高度 21px 低于 24px 最小可点击目标

- **页面/路由**: `#/spreadsheet`（spreadsheet-grid 表头区，选中任意状态复现）
- **主题/视口/状态**: light+dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/spreadsheet/spreadsheet-default-wide-light.png`（表头区放大可辨）
- **目视描述**: 全选角按钮与 A–Z 列头按钮、行号按钮均为 21px 高的 ghost 小按钮，明显薄于周边工具栏按钮（28px）。
- **程序化证据**:
  - 探针: `__P.targetScan(24)`（phase1）+ 行头按钮 rect 复测（phase3）
  - 输出: corner「选择整个工作表」39×21；列头 A–N 各 79×21；行头按钮 39×21——min 边 21 < 24（WCAG 2.5.8）
- **对照基准**: WCAG 2.5.8 最小目标 24×24 CSS px；检查提示词 A3
- **严重程度**: P3（Excel/Sheets 桌面端列头亦为 ~20px 薄条，行业密度惯例在侧；但本项目以 24px 为判据，且 R2-1a 已有同族在案）
- **用户影响**: 触屏/高龄用户点选整列整行易误触；鼠标用户影响小。
- **修复方向**: `spreadsheet-grid/table-shell.tsx` 表头 Button 增高至 24px（列头 h-6、行头 w-6 起），或给按钮加 `after:` 扩展命中区至 24px 保持视觉 21px；与 R2-1a-A3-01（列宽手柄 4px）家族一并收敛。
- **归族**: systemic → R2-3 批（小命中目标家族，R2-1a-A3-01 同族第 2 例， designer 域确认扩展）
- **复核状态**: 未复核

### [R2-1b-C2-01] 查找替换面板钉死视口左上角 (8,8)，遮压宿主页头而非锚定工具栏

- **页面/路由**: `#/spreadsheet`（工具栏「查找替换 Ctrl+F」开关）
- **主题/视口/状态**: light+dark / 1280×800 / 查找替换面板打开
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/spreadsheet/spreadsheet-find-replace-open-light.png`、`…/spreadsheet-find-replace-open-dark.png`
- **目视描述**: 面板（357×90）浮在视口最左上角，盖住宿主「Spreadsheet Playground」页头与左上 host chip，与工具栏查找按钮（y≈156）完全不锚定。
- **程序化证据**:
  - 探针: 面板 rect（phase2）：`{x:8, y:8, w:357, h:90}`；工具栏 rect y≈140
  - 输出: 面板 fixed 于视口原点附近，与触发钮距离 >130px，且与宿主页头 text 求交重叠
- **对照基准**: 检查提示词 C2（浮层压内容）/A7（弹层落点）；NN/g 查找面板应近触发源出现
- **严重程度**: P3（功能完整可关闭；遮挡的是静态页头文案，高频编辑路径不受阻）
- **用户影响**: 打开查找时页面头部被突兀遮挡，观感未完成；嵌入 report-designer 宿主时同款面板会遮其他 chrome（同一组件多宿主放大）。
- **修复方向**: `spreadsheet-toolbar/find-replace-panel.tsx` 的定位改为相对工具栏根 `position:absolute; top:100%`（或挂在工具栏下方文档流内，同 comment input 模式），删除 fixed 视口坐标。
- **归族**: local → R2-4 批（spreadsheet-toolbar 组件定位缺陷；多宿主复用面，修复一次收 report-designer 宿主）
- **复核状态**: 未复核

## 4. 已知项确认（不重复立项）与误报排除

| 项                                                 | 处理                                                                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 「Set Formula on selected cell」后单元格仍显示原值 | owner doc `docs/architecture/spreadsheet/design.md` §8 明示公式为存储型无求值引擎——设计限制非缺陷，不报             |
| 无公式栏/无缩放控件                                | 同 §8/§6：cell editor UI 已移除（DR-4 裁决）、zoom 仅 host contract 可达——不报缺失                                  |
| 800px 下工具栏 scrollW 1113 > clientW 766          | overflow-x:auto 有意滚动容器（C1 白名单）；右缘按钮截断即滚动可供性，不报                                           |
| 虚拟化 spacer 行 4152px                            | viewport 窗口实现细节，非用户可见行，不按 D3 离群行报                                                               |
| dark 下黄/绿/蓝填充 swatch 变暗                    | `--ss-warn-bg/ok-bg/drop-bg` dark 变体（20% 透明度 tint），色相仍可辨、对比合规——令牌有意设计，不报                 |
| 宿主悬浮 classic/light 切换器                      | 本页浮于日志区右端空白处未遮功能目标（R2-1a-C2-01 家族在本页无新受害点），不另立                                    |
| 行选中 `data-cell-selected` 计数为 0               | 行高亮经 `data-range-highlight`/行头 `data-row-header-active` 生效（截图可见整行 tint），探针属性名口径问题，非缺陷 |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本路径）；findings 已归族（A3-01 systemic / C2-01 local）→ 对应批 digest 后 `digested`；批内复检通过后 → `verified`。
