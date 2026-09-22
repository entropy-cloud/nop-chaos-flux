# [card] page:standard-crud

- **批次**: R2-1a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/standard-crud`（简报写 `#/<id>`，实际 playground 路由前缀为 `complex-pages/`） ｜ **载体**: complex-page（data-lists 域）
- **矩阵裁剪**: full（拖拽 A6/A8、G 设计器列本页无拖拽/画布，标 n/a；glass 皮肤未抽查——本波统一裁剪，双主题 × 双视口已全覆盖）

## 1. 截图清单（状态矩阵，逐张列路径）

| 状态                                                       | light                                                                                                                               | dark                                                                          |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 默认 1280×800                                              | `_tmp/visual-inspection-2026-09-23/r2-1a/standard-crud/standard-crud-default-light.png`                                             | `…/standard-crud-default-dark.png`                                            |
| 默认 800×900                                               | `…/standard-crud-default-light-narrow.png`                                                                                          | `…/standard-crud-default-dark-narrow.png`                                     |
| hover（表格行 / 行操作按钮）                               | `…/standard-crud-row-hover-light.png`、`…/standard-crud-action-hover-light.png`                                                     | dark 行 hover 以探针读值复核（`rowHoverDark`）                                |
| focus-visible                                              | `…/standard-crud-focus-light.png`                                                                                                   | —（探针双主题同构）                                                           |
| disabled（批量删除未选中态）                               | 含于 default-light 截图（淡粉 destructive 禁用态）                                                                                  | 含于 default-dark                                                             |
| 选中行（checkbox）                                         | `…/standard-crud-row-selected-light.png`                                                                                            | `…/standard-crud-row-selected-dark.png`                                       |
| 弹层打开（新增 Dialog / 删除 AlertDialog / 状态 Combobox） | `…/standard-crud-dialog-add-light.png`、`…/standard-crud-dialog-delete-confirm-light.png`、`…/standard-crud-combobox-open-dark.png` | `…/standard-crud-dialog-add-dark.png`、`…/standard-crud-dialog-edit-dark.png` |
| 长内容/矮视口弹层（H3/H8）                                 | —                                                                                                                                   | `…/standard-crud-dialog-add-shortvh-dark.png`（620px 视口高）                 |
| 分页区滚动                                                 | `…/standard-crud-pagination-scrolled-light.png`                                                                                     | —                                                                             |
| 操作后反馈（删除 toast）                                   | `…/standard-crud-after-delete-toast-light.png`                                                                                      | —                                                                             |
| 拖拽进行中                                                 | n/a（本页无拖拽）                                                                                                                   | n/a                                                                           |
| loading/empty/error                                        | n/a（mock 同步返回，未捕获到 loading 帧；翻页/删除均即时）                                                                          | n/a                                                                           |

## 2. A–H 维度勾选表

- A 交互：A1 ✔ A2 ✔（焦点以边框变蓝指示，见排除记录） A3 warn(R2-1a-A3-01) A4 ✔（批量删除禁用淡粉、选中后启用） A5 n/a A6 n/a A7 ✔（弹层有关闭钮/遮罩/焦点落点） A8 n/a A9 ✔（删除/翻页有 toast 与数据变化）
- B 颜色：B1 ✔（正文 20.01:1，主按钮 4.6:1 ≥4.5） B2 ✔ B3 ✔（删除红/新增蓝语义正确） B4 ✔（computed 值均可溯源令牌） B5 warn（dark 平价：页面本体通过；弹层受宿主 `--popover` 覆盖已知 P1 影响，见第 3 节尾条） B6 ✔（选中行蓝 tint、destructive 红不裸奔）
- C 布局：C1 fail(R2-1a-C4-01，窄视口) C2 warn(R2-1a-C2-01) C3 ✔ C4 fail(R2-1a-C4-01) C5 ✔（sticky 表头不遮内容） C6 n/a
- D 间隔：D1 ✔（crud 块间隙 16/16，栅格值） D2 ✔ D3 ✔（行高中位 55px，10 行一致，仅一行 54.5px 为边框取整） D4 ✔（工具栏 pad 0 / gap 8px） D5 ✔（查询表单字段间隙 8px，与 advanced-query 一致） D6 ✔（分页条 top−表格 `<table>` bottom = 12px = `--space-block-gap`） D7 ✔（无 <4px 贴死） D8 ✔
- E 排布：E1 ✔ E2 ✔（新增 primary 强于批量删除 destructive-outline） E3 ✔（删除确认弹层：取消 outline 72px 在左、确认 primary 72px 在右，footer justify-end） E4 ✔（各列 left 坐标方差 0） E5 ✔ E6 ✔（空态文案完整）
- F 一致性：F1 ✔ F5 ✔（每页行数左/页码中/共 N 条右，与 tree-crud 等一致）
- G 设计器：n/a（非画布页）
- H 弹层：H1 ✔（新增/编辑 Dialog 560px=`--overlay-size-base`；AlertDialog 480px=`sm` 档，均在阶梯） H2 n/a H3 ✔（620px 视口高下 content bottom 372.6 ≤ 612，maxH 随视口收缩 588px） H4 fail(R2-1a-H4-01) H5 fail(R2-1a-H5-01，表单弹层；AlertDialog 合规) H6 ✔ H7 ✔（body pad 16/24 = anatomy 令牌） H8 ✔（body `overflow-y:auto`，sh=ch 无假滚动） H9 ✔（`max-w-[calc(100%-2rem)]` 窄视口回退）

## 3. 发现条目

### [R2-1a-C4-01] 窄视口（~800px）查询区与表格挤压塌陷

- **页面/路由**: `#/complex-pages/standard-crud`（advanced-query / master-detail / business-document 同根因复现，见各卡）
- **主题/视口/状态**: light+dark / 800×900 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/standard-crud/standard-crud-default-light-narrow.png`
- **目视描述**: 800px 宽下查询表单不换行，"关键字"输入框塌缩为约 30px 残条；表格邮箱列文本与右侧 sticky 操作列（编辑/删除按钮）相互叠压；整卡右缘被裁切。
- **程序化证据**:
  - 探针: 全页 `scrollWidth>clientWidth` 扫描 + 字段矩形采样（`_tmp/r2-1a-probes/w6-standard-crud-out.json` → `narrowC1`）
  - 输出: `SECTION.nop-page sw=516 cw=480`、`.nop-card sw=532 cw=512`（卡片 overflow-hidden 裁切 20px）、`.nop-crud sw=500 cw=448`、`LABEL.nop-field sw=194 cw=133`、`.nop-select-wrapper sw=98 cw=37`（状态选择器仅剩 37px）
- **对照基准**: 检查提示词 C1（无意外溢出）/C4（视口弹性：~800px 不塌不挤，工具栏折叠、表格滚动合理）
- **严重程度**: P1（CRUD 高频主路径 + 多页复现，系统性升一级）
- **用户影响**: 窄窗口/分屏用户无法正常输入查询条件、无法读清邮箱列，需依赖被裁切invisible的横向滚动；任务可完成但体验明显破损。
- **修复方向**: `nop-crud-query` 表单行容器加 `flex-wrap`（或 `sm:grid-cols-*` 栅格降级）；`.nop-page`/`.nop-card` 在 `max-width` 断点下放开最小宽度约束；表格容器保持 `overflow-x-auto` 并给 sticky 操作列加实体底色防透叠。归 R2-3 系统性修复批。
- **归族**: systemic → R2-3 批
- **复核状态**: 未复核

### [R2-1a-H5-01] 新增/编辑表单弹层 footer 动作左对齐，偏离 plan 490 解剖学契约

- **页面/路由**: `#/complex-pages/standard-crud`（新增、编辑弹层；master-detail 子表弹层、business-document 页面级提交同根因）
- **主题/视口/状态**: light / 1280×800 / Dialog 打开
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/standard-crud/standard-crud-dialog-add-light.png`
- **目视描述**: "取消/保存"按钮成对出现在弹层左下角，而非右下主位；按钮明显偏小。
- **程序化证据**:
  - 探针: 弹层 anatomy 探针读 actions 容器 computed style 与按钮 rect（`_tmp/r2-1a-probes/w6-standard-crud-followup.mjs` → `dialogAlign`）
  - 输出: actions 容器 `justify-content: normal`（左对齐）、`gap: 12px`、`margin-top: 16px`；取消 left=384→434（w=50）、保存 left=446→496（w=50）；弹层右缘 920（按钮距右缘 424px）。对照同页删除 AlertDialog：footer `justify-content: flex-end`、按钮 w=72、gap=8px，合规。
- **对照基准**: styling-system.md「Overlay Size Ladder And Anatomy」`--overlay-anatomy-footer-gap: 8px`、`--overlay-anatomy-footer-button-min-width: 72px`；「Dialog / Form Action Button Convention」actions 右对齐（`form-actions` 默认 `flex justify-end gap-2`）
- **严重程度**: P1（P2 明显不一致，位于 CRUD 新增/编辑高频主路径，按规则升 P1）
- **用户影响**: 确认/取消落点违反桌面惯例，与删除确认弹层的按钮位置互相矛盾，高频误点；与系统其余弹层视觉不一致。
- **修复方向**: `nop-dialog` 表单弹层的 actions 渲染模板补默认 `justify-end gap-2`（或给按钮容器套 `--overlay-anatomy-footer-gap` 与 `min-width: var(--overlay-anatomy-footer-button-min-width)`），使 ui Dialog footer 与 AlertDialog footer 同构；排查 flux-renderers form actions 默认 `actionsClassName` 是否被覆盖为空。
- **归族**: systemic → R2-3 批
- **复核状态**: 未复核

### [R2-1a-H4-01] 弹层标题左缩进 16px 与 body 24px 不对齐

- **页面/路由**: `#/complex-pages/standard-crud`（ui Dialog 通用；master-detail 弹层同现）
- **主题/视口/状态**: light / 1280×800 / Dialog 打开
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/standard-crud/standard-crud-dialog-add-light.png`（"新增用户"与下方"姓名"label 左缘错位肉眼可辨）
- **目视描述**: 弹层标题比表单字段左缘缩进少 8px，标题不与内容对齐。
- **程序化证据**:
  - 探针: `titleLeft / firstLabelLeft / firstInputLeft` 采样（`w6-standard-crud-followup.mjs` → `dialogAlign`）
  - 输出: titleLeft=376（header padding 16px），firstLabelLeft=384、firstInputLeft=384（body padding-x 24px），偏差 8px
- **对照基准**: styling-system.md plan 490 anatomy（`--overlay-anatomy-body-padding-x: 24px`）；H4「标题/描述/关闭钮基线与内边距统一」
- **严重程度**: P3
- **用户影响**: 细节层级瑕疵，用户偶有感知但不影响任务。
- **修复方向**: ui Dialog header 水平 padding 改用 `--overlay-anatomy-body-padding-x`（16px→24px），或 header/title 单独 `px-6`；一次改动全量弹层生效。
- **归族**: systemic → R2-3 批（ui 组件层根因）
- **复核状态**: 未复核

### [R2-1a-A3-01] 表格内交互目标短边 <24px（排序钮 20.3px 高、复选框 16px、列宽手柄 4px 宽）

- **页面/路由**: `#/complex-pages/standard-crud`（inline-edit-table / advanced-query / business-document 同族）
- **主题/视口/状态**: light / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/standard-crud/standard-crud-default-light.png`（表头排序钮区域）
- **目视描述**: 表头"姓名/创建时间"排序按钮、行首复选框、列宽拖拽手柄均小于 24×24。
- **程序化证据**:
  - 探针: 可交互元素 `min(w,h)<24` 全扫（`P.a3Targets`）
  - 输出: 共 4 项全部在表格内：排序按钮 35.6×20.3 / 61.2×20.3；`nop-checkbox` 16×16（外层 td 可点，缓解）；列宽手柄 4×39.5（拖拽专用，有列头整体可点缓解）
- **对照基准**: WCAG 2.5.8 最小目标 24×24 CSS px；检查提示词 A3
- **严重程度**: P3（数据密集表格密度档 + 部分有大热区缓解；跨 4 页同根因整体升一级至 P2 归族）
- **用户影响**: 触屏/高龄用户误触率上升；鼠标用户影响小。
- **修复方向**: 表头排序按钮最小高度提到 24px（th 内 padding 补偿）；列宽手柄加透明 hit-area（`::before` 扩展 12px）；checkbox 保持视觉 16px 但确保 label 包裹热区 ≥24px。
- **归族**: systemic → R2-3 批
- **复核状态**: 未复核

### [R2-1a-C2-01] 宿主悬浮主题切换器遮压分页条右端

- **页面/路由**: 全站宿主元素，`#/complex-pages/standard-crud` 分页区复现
- **主题/视口/状态**: light / 1280×800 / 滚动至分页条
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/standard-crud/standard-crud-pagination-scrolled-light.png`（classic/light 切换器盖住页码"4"与下一页钮区域）
- **目视描述**: 右下角固定悬浮的 classic/light 下拉压在分页控件上。
- **程序化证据**: [visual-only] 截图目视 + 元素层级（fixed 定位 z 高于内容）；切换器 rect 与分页条 rect 求交目视判定重叠。
- **对照基准**: C2 无意外重叠；WCAG 2.4.11 焦点/操作不得被遮挡
- **严重程度**: P3（宿主 shell 层，非 flux 渲染面；重叠面积小且可滚动避开）
- **用户影响**: 该滚动位置下点击页码 4/下一页可能误触主题切换器。
- **修复方向**: playground 宿主切换器加 `bottom-offset` 或滚动联动隐藏；或缩小组件尺寸/加半透明底。归 R2-4 local 批（宿主侧）。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### 已知项确认（不重复立项）

宿主 `:root` 覆盖 `--popover` 导致 dark 模式所有弹层亮底（已知 systemic-local P1）：本页新增/编辑 Dialog、状态 Combobox 下拉、删除 AlertDialog 在 dark 下均为白底（`standard-crud-dialog-add-dark.png`、`standard-crud-combobox-open-dark.png`）。**加重影响确认**：白底叠 dark 前景令牌 → 弹层内表单 label、placeholder 在 dark 下近乎不可读（白底白字，见 `standard-crud-dialog-add-dark.png` 中 label 仅剩红色必填星号），比"亮底"本身更影响可用性，建议该已知项修复时以 label 可读性为验收口径之一。

## 4. 误报排除记录

| 疑点                                                     | 排除理由                                                                                                                           |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Tab 聚焦后"无 focus 环"（outline none / boxShadow 透明） | combobox 触发器 focus-visible 时 border 变为主题蓝 rgb(60,130,241)（探针 `focus.before/after`），A2 以边框变色指示，非缺陷         |
| C1 扫描命中 `nop-checkbox` sw26/cw14、TD sw43/cw40       | opacity-0 原生 checkbox 叠放模式（registered 误报白名单），非可见溢出                                                              |
| 窄视口表格 `sw>cw` 多条命中                              | 实际滚动容器为内层 `overflow-x-auto`（tree-crud follow-up 已证同构），外层命中非可达性缺陷；窄视口真问题是查询区塌缩（已立 C4-01） |
| 主按钮对比度 4.6:1 "偏低"                                | ≥4.5:1 达标（正文阈值），不报                                                                                                      |
| 截图中 hover 态缺失                                      | 用 `page.hover()` 强制态复验（row-hover/action-hover 截图 + computed bg 变化）                                                     |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本路径）；
- findings 归族：C4-01/H5-01/H4-01/A3-01 → R2-3 系统性批；C2-01 → R2-4 local 批；
- 批内复检通过后 → `verified`。
