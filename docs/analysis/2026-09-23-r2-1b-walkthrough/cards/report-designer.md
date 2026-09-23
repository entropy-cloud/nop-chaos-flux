# [card] page:report-designer

- **批次**: R2-1b ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/report-designer` ｜ **载体**: 域页面（WorkbenchShell + SpreadsheetToolbar + ReportFieldPanel + SpreadsheetGrid/SheetTabBar + report-inspector-shell）
- **矩阵裁剪**: full（裁剪项：glass 皮肤未抽查——本波统一裁剪；G5 n/a——本页无缩放控件，DOM 检索 zoom 控件数=0；A5/异步三态 n/a——无异步数据面；浮动调试面板默认关闭未走查——归 debugger-lab 卡）

## 1. 截图清单（状态矩阵）

| 状态                              | light                                                                                            | dark                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| 默认 1280×800                     | `_tmp/visual-inspection-2026-09-23/r2-1b/report-designer/report-designer-default-wide-light.png` | `…/report-designer-default-wide-dark.png`        |
| 默认 800×900                      | `…/report-designer-default-narrow-light.png`                                                     | `…/report-designer-default-narrow-dark.png`      |
| 选中单元格（C3 + 工具栏地址）     | `…/report-designer-cell-selected-light.png`、`…/report-designer-cell-selected-toolbar-light.png` | `…/report-designer-cell-selected-dark.png`       |
| 行头选中                          | `…/report-designer-row-selected-light.png`                                                       | —（同探针 dark 复检见 JSON）                     |
| 字段拖拽 dragover                 | `…/report-designer-drag-over-light.png`                                                          | —（HTML5 DnD，dark 同构）                        |
| 拖拽落位后（绑定单元格）          | `…/report-designer-field-dropped-light.png`                                                      | —                                                |
| 加粗→undo                         | `…/report-designer-bold-before-undo-light.png`、`…/report-designer-after-undo-light.png`         | —                                                |
| dark 网格文字样本                 | —                                                                                                | `…/report-designer-dark-grid-text-sample.png`    |
| 弹层打开（sheet 删除确认 Dialog） | `…/report-designer-sheet-delete-dialog-light.png`                                                | `…/report-designer-sheet-delete-dialog-dark.png` |
| 拖拽进行中                        | 见 dragover/字段拖拽行（HTML5 原生 drag image，无自定义 ghost 可截帧）                           | —                                                |

## 2. A–H 维度勾选表

- A 交互：A1 ✔（字段行 hover 白→slate-50 tint + label span cursor:grab，探针 before/after diff） A2 ✔（Button 族 focus-visible:ring-3 类在 DOM；flux 按钮 ring 已由 R2-1a 程序化复验） A3 **fail(R2-1b-A3-01)**（列/行头按钮 h=21.2/23px<24） A4 ✔（未选中时 复制/剪切/粘贴/清除 disabled=true 且置灰，选中后启用） A5 n/a A6 ✔（dragover 即时出现 `data-cell-drop-target` 虚线框+浅蓝底，落位即绑定） A7 ✔（删除确认弹层：遮罩/关闭钮/取消删除序完整） A8 ✔（每个字段行有独立"插入"按钮=非拖拽等价路径，design.md §7 明文） A9 ✔（加粗/落位/undo 画布即时可见）
- B 颜色：B1 ✔（dark 网格文字 rgb(230,236,243) on 合成底 ≈10.64:1） B2 ✔ B3 ✔（选中态绿=--ss-active 双主题成对；destructive 红） B4 ✔（网格走 --ss-\* 令牌双主题块） B5 **fail(R2-1b-B5-01)**（dark 工具栏外围白带） B6 ✔
- C 布局：C1 **fail(R2-1b-C1-01)**（800 视口 workbench 1137px 被裁、无滚动可达） C2 ✔ C3 ✔ C4 **fail(R2-1b-C1-01 同根因)** C5 ✔（网格 2120×2422 在内部滚动容器内，属有意滚动） C6 n/a（DOM 表格非 canvas 元素）
- D 间隔：D1 ✔（面板标题区 px-4 py-3、字段行距一致） D2 ✔ D3 ✔（行高 21–27 连续无离群） D4 ✔ D5 n/a D6 n/a（无分页条） D7 ✔（无 <4px 组合） D8 ✔
- E 排布：E1 ✔（左字段源/中网格/右检查器 3 秒可答） E2 ✔ E3 ✔ E4 ✔ E5 ✔（分区用边框+留白，不混用） E6 ✔（空网格=spreadsheet 100×26 可编辑基线，非空壳；inspector 空选中有引导文案）
- F 一致性：F1/F5 n/a F2 warn（见 watch：与本域 host 页工具栏形态不同代际，属页面定位差异不立项） F3 ✔ F4 warn（见 watch：检查器标题 EN/正文 CN 混排）
- G 设计器：G1 ✔ G2 ✔ G3 ✔（附注） G4 ✔ G5 n/a（无缩放控件，已检索证实） G6 ✔ G7 ✔ G8 ✔
- H 弹层：H1 ✔（560=base 档） H2 n/a H3 ✔（146px 高 ≤ 视口） H4 ✔ H5 ✔（justify-end + gap 8px=--overlay-anatomy-footer-gap；[取消,删除] 序正确） H6 n/a（弹层内无表单字段） H7 ✔（body padding-x 24px=--overlay-anatomy-body-padding-x） H8 n/a（短内容无滚动） H9 n/a（未在 800 视口复开弹层——裁剪）

## 3. 发现条目

### [R2-1b-B5-01] dark 模式工具栏外围一圈白带：demo header 包装层亮底 literal 未做 dark 适配

- **页面/路由**: `#/report-designer`（头部工具栏区，整宽）
- **主题/视口/状态**: dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/report-designer/report-designer-default-wide-dark.png`（工具栏上下/左右可见白带框）
- **目视描述**: dark 下整个工具栏周围有一圈明显的白色条带（上 8px/左右 12px/下缘），像未渲染完的残块。
- **程序化证据**:
  - 探针: 祖先链 computed background 采样（`_tmp/r2-1b-probes/report-designer-supplement.json` → darkStrip/darkStripChain）
  - 输出: `[data-slot="report-demo-header"]` dark 下 `backgroundColor: rgb(248,250,252)`（内层 `[data-slot="spreadsheet-toolbar"]` 已正确切到 `rgb(15,23,42)`=--ss-toolbar-bg dark）；根因定位 `apps/playground/src/styles.css:251-257` `[data-slot='report-demo-header'] { background: rgb(248,250,252); border-bottom: 1px solid rgb(226,232,240) }` 为 light-only literal，无 dark 覆写
- **对照基准**: 检查提示词 B5（dark 专有缺陷：纯白底块）；theme-compatibility.md（CSS 变量主题化规约）
- **严重程度**: P2（高频必经的工具栏区，dark 下整条视觉残缺）
- **用户影响**: dark 用户每次进入页面都在主工具栏看到一圈白底，观感为"页面坏了"；非纸面区的硬白块。
- **修复方向**: `apps/playground/src/styles.css` 该规则改语义令牌（`background: hsl(var(--muted))`、`border-color: hsl(var(--border))`），或补 `[data-mode='dark']` 覆写；同文件 256/294/335/488/539 行同款 literal 一并核对。
- **归族**: local → R2-4 批（playground demo 样式层）
- **复核状态**: 未复核

### [R2-1b-C1-01] 800 宽视口下右侧检查器被整体裁掉且无任何滚动可达路径

- **页面/路由**: `#/report-designer`
- **主题/视口/状态**: light+dark / 800×900 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/report-designer/report-designer-default-narrow-light.png`（右缘网格被切、检查器不可见）、`…/report-designer-default-narrow-dark.png`
- **目视描述**: 800 视口下只剩字段面板+部分网格，右侧检查器整块不可见，页面无横向滚动条。
- **程序化证据**:
  - 探针: workbench 区块 scrollWidth/clientWidth + html/body 可滚动性测试（`report-designer-out.json` → scanNarrow；`report-designer-supplement.json` → narrow）
  - 输出: `section.flex.h-full sw=1137 cw=800`（ox=visible）；`htmlScrollWidth=800=clientWidth`、`window.scrollTo(200,0) 后 scrollX=0`、`main` 为 `overflow-hidden`——内容被裁剪且不可滚动到达；折叠面板可手动省宽但仍不足以完整容纳三区
- **对照基准**: 检查提示词 C1（无意外溢出）/C4（~800 视口不塌不挤，设计器页必查）；WCAG 内容可达性
- **严重程度**: P2（检查器整面板不可达；1280 主视口不受影响故不到 P1）
- **用户影响**: 窄窗口用户看不到也无法调出属性检查器，等于设计器三区缺一区。
- **修复方向**: WorkbenchShell 在容器宽度 < 阈值（如 <1024px）时默认折叠左/右面板（已有 collapse 状态可复用），或给 workbench 根加 `min-w-*` + 外层 `overflow-x-auto` 兜底；demo 页 `main` 的 overflow-hidden 改为允许横向应急滚动。
- **归族**: local → R2-4 批（WorkbenchShell 响应式折叠基线；R2-3 批需对 flow-designer/taskflow-designer 同壳页面做同模式排查）
- **复核状态**: 未复核

### [R2-1b-A3-01] 行/列头按钮高度 21–23px，低于 WCAG 2.5.8 最小 24×24 目标

- **页面/路由**: `#/report-designer`（spreadsheet 网格行头/列头）；report-designer-host、spreadsheet 页同组件
- **主题/视口/状态**: light+dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/report-designer/report-designer-default-wide-light.png`（列头 A–H）
- **目视描述**: 列头字母按钮与行头数字按钮视觉扁窄，命中区明显小于常规可点击目标。
- **程序化证据**:
  - 探针: 可交互元素 `getBoundingClientRect` 短边分布扫描（`report-designer-out.json` → scanLight.smallTargets）
  - 输出: `[data-testid="spreadsheet-header-button"]` 列头 79×21.2、行头 39×23、角头 39×21.2，双主题一致；共 25+ 个 <24px 目标
- **对照基准**: WCAG 2.5.8（可点击目标最小 24×24 CSS px）；R2-1a-A3-01 已登记的"设计器密集目标"族（列宽手柄 4×39.5）同族
- **严重程度**: P3（Excel 式密度是有意设计且 hover tooltip 存在，误触代价低；但横切判据确实低于标准）
- **用户影响**: 触屏/高龄用户点行列头（选中整行/整列的高频操作）命中率低。
- **修复方向**: 行列头按钮加透明外扩命中区（`::after` inset -2px 或 `min-h-6`），保持视觉密度不变；并入 R2-1a-A3-01 既有族统一收敛。
- **归族**: systemic → R2-3 批（R2-1a-A3-01 既有族扩面：设计器密集目标）
- **复核状态**: 未复核

### watch-only（不立项，记录待观察）

- 工具栏 `cell-editor.tsx`（地址 Label + 值 Input）在 `SpreadsheetToolbarGroups` 中未挂载：`[data-slot="spreadsheet-cell-value-input"]` 数=0、toolbar 内 input 数=0；地址状态 `[data-slot="spreadsheet-toolbar-status"]` 随选中即时同步（C3），值编辑仅能走双击行内编辑。Excel 式"公式栏编辑值"入口缺失，属功能入口裁剪而非渲染缺陷。
- 检查器标题 "Inspector"（EN，demo schema 作者写死）与正文中文混排（F4 观察项，demo schema 层）。
- dark 截图工具栏白带内 padding（8px 12px）与工具栏自身 padding 叠加形成双层 chrome，随 B5-01 一并收敛即可。

## 4. 误报排除记录

| 疑点                            | 排除理由                                                                                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| dark 下网格仍为浅色块           | 实测网格随 data-mode 切换为深色底（--ss-\* dark 块生效），非纸面恒白；纸面豁免不适用亦不需要                                                             |
| G8 纸面恒白嫌疑                 | 本页网格 dark 文字对比 10.64:1，双主题均达标，非缺陷                                                                                                     |
| 拖拽无自定义 ghost 截帧         | HTML5 原生 DnD drag image 由浏览器渲染并保证跟手（判据"ghost 偏移<5px"由浏览器实现满足）；自定义 ghost 不存在故无可截帧对象                              |
| 落位后单元格显示 `fx${orderId}` | "fx" 为绑定单元格的公式指示前缀（data-cell-bound 虚线框配套），非文案缺陷                                                                                |
| 弹层 dark 下亮底                | `report-designer-sheet-delete-dialog-dark.png` 实测 `rgb(251,250,249)` 亮底——即宿主 --popover 已知项，本卡确认影响面（sheet 删除确认弹层命中），不另立项 |
| H5 footer 左对齐嫌疑            | 实测 `justify-content: flex-end`、gap 8px，未命中 R2-1a 首批左对齐族                                                                                     |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本路径）；
- findings 归族：B5-01/C1-01 → R2-4 local 批；A3-01 → R2-3 系统性批（R2-1a-A3-01 既有族扩面）；
- 批内复检通过后 → `verified`。
