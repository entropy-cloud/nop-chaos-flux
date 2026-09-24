# [card] control:table

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/table` ｜ **载体**: lab 页（MultiScenarioLabPage，7 场景：sortable text columns / empty state / header search+filter / responsive expand baseline（fixed left + breakpoint 1400）/ host quick-edit+save+echo（bug 73）/ host tree lazy fail+retry（P1-3）/ host selection+pagination echo）
- **矩阵裁剪**: **full**（控件六属性复杂面。已做：排序交互态（asc/desc/aria-sort/指示器特写）、筛选/搜索弹层开态+应用态、sticky 固定列与表头、行选择态（单选/全选/选中底色）、展开行（chevron + 详情行）、横向滚动与固定列（800 视口）、分页交互（页码切换 + D6 落栅格）、双主题（真 data-mode）+ 像素采样、800 窄视口、长内容（whitespace-nowrap 策略核对）、空态。裁剪项及理由：①**loading overlay**（`table-loading-overlay` 槽位存在但 fixture 无慢速异步源，无法触发）→ 裁剪；②**列设置弹层**（`table-column-settings` 槽位存在，7 个 fixture 均未配 toolbar/columnSettings 入口，无触发器可查）→ 裁剪；③**单元格截断 tooltip**（`table-cell-popover` 槽位存在，fixture 无超长内容触发截断，email 列 718px 未截断）→ 裁剪；④**行拖拽排序/列宽拖拽把手中 4px 视觉本体**（`use-row-drag-sort`/`use-column-resize` 未在 fixture 启用 dragSort；resize handle 存在但拖拽全链路超出本波窗口）→ 裁剪并登记 A3 观察。）
- **重叠说明**: table 的 demo **页面**（standard-crud/performance-table/table-popover/table-column-width 等）已在 R2-1a/R2-1c 走查；本卡为 **lab 载体控件面**独立台账单元，命中同根因一律引用原条目（E4-01 族、sticky 透明底族、--popover dark 族等均引用）。
- **runner dark 列作废声明**：同前——dark 全部真 data-mode 自采。

## 1. 截图清单

| 状态                                  | light                                                                                                                                                                                                                                       | dark（真 data-mode，自采）                                                                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 默认 1280（整页）                     | `_tmp/visual-inspection-2026-09-24/r2-2b/table/default-1280-light-full.png`                                                                                                                                                                 | `_tmp/visual-inspection-2026-09-24/r2-2b/table/default-1280-dark-fullpage.png`                                                                                           |
| 排序表头特写（默认/asc）              | `_tmp/visual-inspection-2026-09-24/r2-2b/table/s1-sort-head-default-light.png` / `_tmp/visual-inspection-2026-09-24/r2-2b/table/s1-sort-head-asc-light.png`                                                                                 | `_tmp/visual-inspection-2026-09-24/r2-2b/table/s1-sort-head-default-dark.png` / `_tmp/visual-inspection-2026-09-24/r2-2b/table/s1-sort-head-asc-dark.png`                |
| 排序 asc/desc 全场景                  | `_tmp/visual-inspection-2026-09-24/r2-2b/table/s1-sorted-asc-light-1280.png` / `_tmp/visual-inspection-2026-09-24/r2-2b/table/s1-sorted-desc-light-1280.png`                                                                                | —（aria/像素同 light 探针双主题复跑）                                                                                                                                    |
| 行 hover                              | `_tmp/visual-inspection-2026-09-24/r2-2b/table/s1-row-hover-light-1280.png`                                                                                                                                                                 | —（hover 色 token 双主题探针复跑）                                                                                                                                       |
| 空态                                  | `_tmp/visual-inspection-2026-09-24/r2-2b/table/s2-empty-light-1280.png`                                                                                                                                                                     | —                                                                                                                                                                        |
| 搜索弹层开                            | `_tmp/visual-inspection-2026-09-24/r2-2b/table/s3-search-open-light-1280.png`                                                                                                                                                               | `_tmp/visual-inspection-2026-09-24/r2-2b/table/s3-search-open-dark-1280.png`（白底，已知族）                                                                             |
| 筛选弹层开/应用后                     | `_tmp/visual-inspection-2026-09-24/r2-2b/table/s3-filter-open-light-1280.png` / `_tmp/visual-inspection-2026-09-24/r2-2b/table/s3-filter-applied-light-1280.png`                                                                            | —（弹层 dark 同搜索）                                                                                                                                                    |
| 展开行开                              | `_tmp/visual-inspection-2026-09-24/r2-2b/table/s4-expanded-light-1280.png`                                                                                                                                                                  | `_tmp/visual-inspection-2026-09-24/r2-2b/table/s4-expanded-dark-1280.png`                                                                                                |
| 800 横向滚动/响应展开                 | `_tmp/visual-inspection-2026-09-24/r2-2b/table/s4-narrow-scrolled-light-800.png` / `_tmp/visual-inspection-2026-09-24/r2-2b/table/s4-narrow-scrolled2-light-800.png`                                                                        | `_tmp/visual-inspection-2026-09-24/r2-2b/table/s4-narrow-scrolled-dark-800.png` / `_tmp/visual-inspection-2026-09-24/r2-2b/table/s4-narrow-dark-800.png`                 |
| quick edit 打开/回车出现保存条/保存后 | `_tmp/visual-inspection-2026-09-24/r2-2b/table/s5-quickedit-open-light-1280.png` / `_tmp/visual-inspection-2026-09-24/r2-2b/table/s5-savebar-light-1280.png` / `_tmp/visual-inspection-2026-09-24/r2-2b/table/s5-after-save-light-1280.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/table/s5-quickedit-open-dark-1280.png` / `_tmp/visual-inspection-2026-09-24/r2-2b/table/s5-quickedit-after-enter-dark-1280.png` |
| lazy 失败态/重试成功                  | `_tmp/visual-inspection-2026-09-24/r2-2b/table/s6-lazy-error-light-1280.png` / `_tmp/visual-inspection-2026-09-24/r2-2b/table/s6-lazy-retried-light-1280.png`                                                                               | `_tmp/visual-inspection-2026-09-24/r2-2b/table/s6-lazy-error-dark-1280.png` / `_tmp/visual-inspection-2026-09-24/r2-2b/table/s6-lazy-retried-dark-1280.png`              |
| 行选中/全选/翻页后                    | `_tmp/visual-inspection-2026-09-24/r2-2b/table/s7-row-selected-light-1280.png` / `_tmp/visual-inspection-2026-09-24/r2-2b/table/s7-select-all-light-1280.png` / `_tmp/visual-inspection-2026-09-24/r2-2b/table/s7-page2-light-1280.png`     | `_tmp/visual-inspection-2026-09-24/r2-2b/table/s7-row-selected-dark-1280.png` / `_tmp/visual-inspection-2026-09-24/r2-2b/table/s7-page2-dark-1280.png`                   |
| 默认 800（整页）                      | `_tmp/visual-inspection-2026-09-24/r2-2b/table/default-800-light-fullpage.png`                                                                                                                                                              | —                                                                                                                                                                        |

## 2. A–H 维度勾选表

- A 交互：A1 pass（行 hover `--table-hover-bg` primary/6 tint 生效，`rowHover.changed: true`）A2 pass（排序表头按钮键盘 focus-visible 3px oklab ring——`focusVisible.boxShadowFull` 第 4 影实证；此前截断读取造成的“无 ring”判读已修正为误报）A3 **已知族命中**（排序按钮 22×21、选择列 checkbox 16×16、resize handle 视觉 4×40、树展开钮 20×20，见 §4）A4 n/a（fixture 无 disabled 列）A5 pass（空态渲染配置文案 `No users found…`，colspan 行）A6 n/a（dragSort 未启用）A7 pass（搜索/筛选弹层有关闭路径、Esc 生效、几何 224px 在档）A8 n/a A9 pass（lazy fail→重试闭环、quick-edit 保存→`quickSaveItemAction` echo `{"username":"alice-edited","id":1}`、翻页 aria-current 迁移、全选状态同步——四条交互反馈链全部程序化坐实）；**A9 fail(R2-2b-A9-126) 单列：stripe 声明无呈现**（见发现）
- B 颜色：B1 pass（正文 `rgb(33,53,71)`/`rgb(230,236,243)` 双主题 ≥12:1）B2 pass（focus ring）B3 pass（选中 primary tint、错误语义未涉及）B4 pass（`--table-hover-bg`/`--table-selected-bg` 令牌）B5 pass（dark 表头 `rgb(2,8,23)` **实底**、行文本翻转、展开详情行面板 dark 正常；搜索弹层 dark 白底 = 已知族引用）B6 pass（选中态 primary/10 非“默认蓝一键切”，走 `--table-selected-bg`）
- C 布局：C1 **误报排除**（`th overX 30 / sticky td overX 30`：scrollWidth 计量含 sticky left 补偿，1280 与 800 双视口截图均无可见溢出/裁切，见 §4 误报表）C2 pass（弹层不压表体）C3 pass（工具区/表体/分页条分区清晰）C4 pass（800 下 responsive-expand 生效：表宽 438 = 容器宽，无横向滚动条、副列入展开行；展开模式在 1280 同样生效因 breakpoint 1400）C5 pass（容器 `overflow-x auto` 单一滚动面，无双滚动条；sticky th 实底不透行）C6 n/a
- D 间隔：D1 pass（行高 41×5 一致，head 40）D2 pass D3 pass（行高离群扫描零命中，无 triple-height 行）D4 pass（分页条元素间距一致）D5 n/a D6 **pass（锚点复检通过）**：S1 gap **12px**、S7 gap **12px**（`paginationRect.top − tableRect.bottom`，= `--space-block-gap` plan490 锚点值）；分页条行高 32px 不挤 D7 pass（stage 兄弟块 gap [8]）D8 pass（容器 20px padding 内边距一致）
- E 排布：E1 pass E2 pass（排序/筛选触发器次级、行主内容主导）E3 pass（分页左“每页行数”右“第 x-y 条”惯例布局）E4 **已知族命中**（ID 数值列 `textAlign: start` 左对齐 = R2-1a-E4-01 族新实例，见 §4）E5 pass（stripe 语义除外——见 A9-126）E6 pass（空态有任务引导文案）
- F 一致性：F1 pass（分页/筛选/排序控件形态与 crud 载体一致）F2 n/a F3 pass（空态模式一致）F4 **已知族命中**（“每页行数/第 1-5 条，共 5 条/筛选/取消/保存/调整列宽/展开/全选/选择行”zh-CN——i18n 回退族）F5 pass（分页条结构与 D6 锚点同源）
- G 设计器：n/a
- H 弹层：H1 pass（搜索/筛选弹层 224×52/224×124 在档）H2 n/a H3 pass H4 pass（弹层内边距统一）H5 n/a（无 footer 按钮组）H6 pass（搜索弹层 input 全宽）H7 pass（弹层 padding/border 走令牌）H8 n/a H9 pass（800 下未复现弹层，几何无溢出风险）

## 3. 发现条目

### [R2-2b-A9-126] `stripe: true` 声明的斑马纹零视觉呈现：`data-striped` 落 DOM 但无任何 CSS 消费（双主题）

- **页面/路由**: `#/lab/table`（场景 1 sortable text columns fixture `stripe: true`；所有声明 stripe 的 table 同险）
- **主题/视口/状态**: light + dark（真 data-mode）/ 1280 / 默认态
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/table/default-1280-light-full.png`（5 行同底色无斑马纹）、`_tmp/visual-inspection-2026-09-24/r2-2b/table/default-1280-dark-fullpage.png`
- **目视描述**: fixture 声明 `stripe: true`，表格 5 行背景完全一致，无奇偶行交替底色；与 AMIS/主流表格的斑马纹预期不符。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w4-table4.mjs` stripe 段（逐行读 `data-striped` 属性 + computed backgroundColor）
  - 输出: `[{"striped":"true","bg":"rgba(0,0,0,0)"},{"striped":null},{"striped":"true","bg":"rgba(0,0,0,0)"},{"striped":null},{"striped":"true","bg":"rgba(0,0,0,0)"}]`——偶数行 `data-striped="true"` 属性已由 `table-body-row-rendering.tsx` L285 写入 DOM，但行 className 仅含 `hover:bg-[var(--table-hover-bg)] data-[state=selected]:bg-[var(--table-selected-bg)]` 等，无 `data-[striped]` 变体类，computed bg 全透明；双主题同构。
- **对照基准**: 检查提示词 A9/E5（声明状态应可见；分组视觉语言）；schema 契约“声明即生效”预期
- **严重程度**: P2（schema 键静默失效——作者声明斑马纹被静默忽略，长表格可读性设计目标落空；无任何诊断）
- **用户影响**: 依赖 stripe 提升宽表逐行可读性的页面渲染不出预期效果，且无从排查（属性在 DOM 上“看起来成功了”）。
- **修复方向**: table 渲染层为 `[data-striped="true"]` 行补消费类（如 `data-[striped]:bg-[var(--table-stripe-bg)]`，theme-tokens 增补 `--table-stripe-bg` light/dark 两档）；并在 `data-schema-validation` 对 stripe 值做存在性核对。
- **归族**: systemic → R2-3 候选（schema 静默缺口族——A9-42/A9-60/E6-123 同根因第 7 例；本例为“属性落 DOM 但 CSS 未消费”变体）
- **复核状态**: 已复核（保留 P2，根因修正，review-b 2026-09-24）：CSS 消费规则存在（table.css L28），断点=--table-striped-bg: transparent 占位值（theme-tokens L98 一行值修复）

## 4. 已知族命中（引用，不另立项；附新实例证据）＋ 误报排除

**族命中**

- **表格 sticky 列透明底（R2-1a #5 族：td 无实体 background）**：新实例证据——S4 responsive-expand 场景 Username 固定左列 `td.nop-table-sticky-edge-left` computed `position: sticky; left: 40px; background: rgba(0,0,0,0); z-index: 2`（对照 sticky `th` 实底 `rgb(255,255,255)`/dark `rgb(2,8,23)`）。本载体 7 个 fixture 均无横向溢出（1280 表宽 918=容器、800 响应展开后 438=容器），缺陷呈**潜伏态**无肉眼破损（`_tmp/visual-inspection-2026-09-24/r2-2b/table/s4-narrow-scrolled-light-800.png` / `_tmp/visual-inspection-2026-09-24/r2-2b/table/s4-narrow-scrolled2-light-800.png` / `_tmp/visual-inspection-2026-09-24/r2-2b/table/s4-narrow-scrolled-dark-800.png` / `_tmp/visual-inspection-2026-09-24/r2-2b/table/s4-narrow-dark-800.png` 无叠影）；一旦列宽超出容器即复现 R2-1a 原破损面。引用原条目不另立项，修复验证时须以“容器 < 表宽”态复检。
- **数值列左对齐（R2-1a-E4-01 族，八处后新实例）**：ID 列（数值）首格 `textAlign: "start"` 左对齐（`w4-table1.json S1.structure.firstCells[0]`），Amount 类数值列同构。引用族，随组件级右对齐档收口。
- **A3 小目标 <24px（R2-2a A3-100/A3-103 族）**：排序表头按钮 22×21；选择列 checkbox 16×16；列宽 resize handle 视觉 4×40（aria-label“调整列宽”在位）；树展开钮 20×20。引用族。
- **`--popover` dark 亮底（宿主已知族）**：表头搜索弹层 dark 整面浅底 `rgb(251,250,249)`（`w4-table2.json darkPopover`，`_tmp/visual-inspection-2026-09-24/r2-2b/table/s3-search-open-dark-1280.png`）。引用，修复后 H7/B5 复检。
- **i18n zh-CN 回退（dialog F4-11 族）**：分页条“每页行数：”“第 1-2 条，共 7 条”、筛选触发 aria“筛选”、quick-edit 保存条“取消/保存”、resize aria“调整列宽”、树展开钮 aria“展开/折叠”、选择列 aria“全选/选择行”。引用族（playground `initFluxI18n` 一处收口）。
- **lab 载体与环境基建族**：notify no-op 使 S7 `onSelectionChange: toast:echo` 静默（选择反馈仅剩行底色）；scope-debug“调试/折叠”面板逐场景渲染。
- **D6 分页锚点复检通过（plan490）**：S1/S7 分页条 top − 表格 bottom 均 **12px**（`--space-block-gap`），分页锚 a 元素 32×32、`aria-current="page"` 随翻页迁移、首页“上一页”opacity 0.5 禁用态可辨——锚点保持，无回归。

**误报排除（不立项）**

- `th / td overX 30`（S4 fixed 160px 列）：1280/800 双视口截图无可见溢出、无相邻列渗色；30px 为 sticky `left` 补偿参与 scrollWidth 计量的 accounting 差——按误报表“表格截断/计量类”排除，留存探针数值供复核。
- quick-edit 场景非编辑行的 Username 呈 input 外观框：可编辑可供性设计（`quickEdit: true` 列全列输入化），非样式错乱。
- quick-edit 保存条独占第四列且表头为空：保存条槽位列（`table-row-save-bar`），有意 flush，非 D8 缺陷。
- 分页条在未配置 pagination 的场景也渲染（每页行数 + 单页码）：table 默认开启分页 UI 的产品行为，非布局缺陷；如需收敛归 F1 跨页约定观察。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-table` → carded（卡列填本路径）；findings 归族后 → digested。
