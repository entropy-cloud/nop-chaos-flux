# [card] page:approval-tasks

- **批次**: R2-1a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/approval-tasks` ｜ **载体**: complex-page（主从详情域：CRUD + 处理 Dialog + confirmText AlertDialog）
- **矩阵裁剪**: full（裁剪项：glass 皮肤未抽查——本波统一裁剪；H3/H8 长内容弹层 n-a——本页弹层为固定字段集，无长内容弹层可开，已用实测高度 522<792 验证 H3、body 无假滚动验证 H8；disabled 态无独立样张——本页无 disabled 控件）

## 1. 截图清单（状态矩阵，逐张列路径）

| 状态                                   | light                                                                                                                                  | dark                                         |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 默认 1280×800                          | `_tmp/visual-inspection-2026-09-23/r2-1a/approval-tasks/approval-tasks-default-wide-light.png`                                         | `…/approval-tasks-default-wide-dark.png`     |
| 默认 800×900                           | `…/approval-tasks-default-narrow-light.png`                                                                                            | `…/approval-tasks-default-narrow-dark.png`   |
| 窄视口表格滚动（sticky 透字取证）      | `…/approval-tasks-narrow-table-narrow-light.png`                                                                                       | —                                            |
| hover（表格行）                        | `…/approval-tasks-row-hover-wide-light.png`                                                                                            | —（探针双主题同构）                          |
| focus-visible（处理按钮）              | `…/approval-tasks-focus-visible-wide-light.png`                                                                                        | —（探针 border rgb(28,110,242)+ring3px）     |
| 弹层打开（审批处理 Dialog 560）        | `…/approval-tasks-dialog-open-wide-light.png`                                                                                          | `…/approval-tasks-dialog-open-wide-dark.png` |
| 弹层 2（驳回 confirm AlertDialog 480） | `…/approval-tasks-confirm-reject-alert-wide-light.png`、`…/approval-tasks-confirm-invisible-behind-wide-light.png`（取证：被压不可见） | —                                            |
| 窄视口弹层（H9）                       | `…/approval-tasks-dialog-open-narrow-light.png`（560 fits 800，maxW 回退生效）                                                         | —                                            |
| 滚动至分页条（D6）                     | `…/approval-tasks-pagination-scrolled-wide-light.png`                                                                                  | —                                            |
| 操作后反馈（通过 toast + 行状态刷新）  | `…/approval-tasks-after-approve-wide-light.png`                                                                                        | —                                            |
| 拖拽进行中                             | n/a（本页无拖拽）                                                                                                                      | n/a                                          |
| loading/empty/error                    | 弹层内 form loadAction 异步过快未捕获 loading 帧（mock 即时）；列表同步返回                                                            | n/a                                          |

## 2. A–H 维度勾选表

- A 交互：A1 ✔（行 hover 蓝 tint） A2 ✔（focus border 变蓝 rgb(28,110,242) + ring 3px oklab/0.5，探针坐实） A3 warn(R2-1a-A3-01 同族：列宽手柄 4×39.5) A4 n/a A5 ✔（列表同步；弹层表单异步过快，无空白帧） A6 n/a A7 **fail(R2-1a-A7-01)** A8 n/a A9 ✔（通过 → toast"已通过" + Dialog 关闭 + 行状态即时刷新"待审批"→"已通过"）
- B 颜色：B1 ✔（正文深色/白底高对比；搜索主按钮 4.6:1 同族实测） B2 ✔ B3 **fail(R2-1a-B3-01)**（状态 chip 三态同色） B4 ✔ B5 warn（flux 面通过；弹层 dark 受宿主 `--popover` 覆盖已知 P1 影响——dark 弹层白底、textarea placeholder 近不可读，见第 3 节尾条） B6 ✔（驳回 bg-destructive 红语义正确、通过 primary 蓝）
- C 布局：C1 ✔（1280 无溢出；800 下表格经内部 `overflow-x-auto` 滚动，属有意滚动容器） C2 **fail(R2-1a-C2-02)**（sticky 操作列透字） C3 ✔ C4 warn（窄视口关键字输入 placeholder 截断为"标题 / 申"，R2-1a-C4-01 家族确认） C5 ✔（sticky 表头不遮内容） C6 n/a
- D 间隔：D1 ✔（crud 块间隙 16、查询表单字段 8） D2 ✔ D3 ✔（行高 55×9+54.5×1，1 行为边框取整） D4 ✔ D5 ✔ D6 ✔（分页条 top−内层 `<table>` bottom = 12px = `--space-block-gap`） D7 ✔ D8 ✔
- E 排布：E1 ✔ E2 ✔（通过 primary 强于驳回 destructive-outline 层级清楚） E3 warn(R2-1a-H5-02：按钮序正确但整体左对齐非主位) E4 warn(R2-1a-E4-01：金额列左对齐，dashboard 卡已立) E5 ✔ E6 ✔
- F 一致性：F1 ✔（处理按钮同 variant 同位） F5 ✔（分页条构成与 standard-crud 一致）
- G 设计器：n/a（非画布页）
- H 弹层：H1 ✔（Dialog 560=`--overlay-size-base`；AlertDialog 480=`sm` 档，均在阶梯） H2 n/a H3 ✔（content bottom 582 ≤ 792） H4 warn（标题左 376 vs fieldset 内容左 384/label 左 401——R2-1a-H4-01 家族确认 + fieldset 二级缩进） H5 **fail(R2-1a-H5-02)** H6 ✔（fieldset 内字段节奏一致） H7 ✔（body pad 24 = anatomy 令牌） H8 ✔（无假滚动） H9 ✔（800 视口 560 fits，`max-w-[calc(100%-2rem)]` 回退生效）

## 3. 发现条目

### [R2-1a-A7-01] confirmText 确认 AlertDialog 被审批 Dialog 压在下方：不可见且不可点击，驳回流程默认配置下无法完成

- **页面/路由**: `#/complex-pages/approval-tasks`（行内"处理"→ 审批 Dialog → 点"驳回"触发 `confirmText` 二次确认；所有"Dialog 内 confirmText"场景同根因嫌疑）
- **主题/视口/状态**: light / 1280×800 / 审批 Dialog 打开态点击驳回后
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/approval-tasks/approval-tasks-confirm-reject-alert-wide-light.png`（DOM 中 AlertDialog 已 open，画面上完全看不到）、`…/approval-tasks-confirm-invisible-behind-wide-light.png`（同态复拍）
- **目视描述**: 点击"驳回"后画面无任何变化——确认弹层没有出现；用户既看不到"确认驳回该申请？"也点不到任何确认按钮。
- **程序化证据**:
  - 探针: 双弹层 z-index 链 + `elementFromPoint` 命中测试 + 真实点击尝试（`w4-approval-stack-out.json`、`w4-approval-out.json` → rejectConfirm）
  - 输出: AlertDialog content `position:fixed z-index:2002`；审批 Dialog surface `position:fixed z-index:2004` —— 确认层比发起它的弹层低 2 级被整体覆盖；取消(704,424,w72)/确认(784,424,w72) 两按钮中心 `elementFromPoint` 均命中下层 Dialog 的 TEXTAREA（下层 portal `data-base-ui-inert` 已标 inert 但 `pointer-events:auto`，仍拦截命中）；Playwright 真实点击"取消"重试 3s 超时（`subtree intercepts pointer events`）；Escape 可依次关闭（先隐形的 confirm 后 Dialog），键盘焦点落点为不可见按钮。宽高契约本身合规：AlertDialog w=480=`sm` 档、按钮 72px 右对齐。
- **对照基准**: 检查提示词 A7（弹层打开态基本完整性：遮罩/可见性/焦点落点）、H 专项（弹层堆叠）；WCAG 2.4.11
- **严重程度**: P0（"驳回该申请"这一任务在默认配置下无可见可点的完成路径：确认层不可见、鼠标不可点、键盘确认等于盲操作；安全性二次确认形同虚设）
- **用户影响**: 审批工作流的驳回分支完全不可用：用户点击驳回后以为无响应，重复点击或误关弹层；极端情况下盲按 Enter 会在看不见确认文案的情况下完成破坏性操作。
- **修复方向**: 统一 overlay z 阶梯：nop Dialog surface（z 2004）不得高于 ui AlertDialog（z 2002）——将 flux-renderers dialog surface 的 z 收敛到与 ui 弹层同源令牌（或 AlertDialog 群组 z 提到 dialog 之上）；同时给 inert portal 补 `pointer-events:none`，保证下层弹层即使存在也不拦截命中。修复后回归场景：任意 Dialog 内 `confirmText` 二次确认。
- **归族**: systemic → R2-3 批（弹层 z 阶梯契约缺失；同族嫌疑：business-document、complex-form 等一切弹层内 confirm 场景）
- **复核状态**: 未复核

### [R2-1a-H5-02] 审批 Dialog 动作按钮（驳回/通过）左对齐置于 body 内，偏离 footer 解剖学契约

- **页面/路由**: `#/complex-pages/approval-tasks`（审批处理 Dialog；standard-crud 已立 R2-1a-H5-01 同族，本页为第 4 处确认）
- **主题/视口/状态**: light / 1280×800 / Dialog 打开
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/approval-tasks/approval-tasks-dialog-open-wide-light.png`（左下角"驳回/通过"两枚小按钮）
- **目视描述**: "驳回（destructive 红）/通过（primary 蓝）"出现在弹层内容区左下角，按钮明显偏小，与同页 AlertDialog 右下角 72px 大按钮的排布互相矛盾。
- **程序化证据**:
  - 探针: 弹层 anatomy 采样（`w4-approval-out.json` → dialogOpen）
  - 输出: 驳回 `x=384 w=50 h=32`（=body 左缘，即容器左对齐起点）、通过 `x=442 w=50 h=32`；`footerSlots=0`（无 footer 槽，按钮由 schema body 内 container 渲染）；对照本页 AlertDialog：取消/确认 `w=72`、右对齐、gap 8px 合规
- **对照基准**: styling-system.md「Overlay Size Ladder And Anatomy」footer 8px gap / 72px min-width；「Dialog / Form Action Button Convention」actions 右对齐（次位左、主位右——本页按钮左右序正确，仅对齐与尺寸违约）
- **严重程度**: P1（P2 明显不一致；审批通过/驳回为该页高频主路径，按规则升 P1；与 R2-1a-H5-01 合并计数后跨 ≥4 页，系统性维持）
- **用户影响**: 确认动作落点违反桌面惯例、与同页其他弹层位置冲突，高频误点驳回/通过；按钮过小降低可点性。
- **修复方向**: openDialog+form 模板的 actions 渲染层默认套 `flex justify-end gap-2` 与 `--overlay-anatomy-footer-button-min-width:72px`（与 R2-1a-H5-01 同一修复面：flux-renderers form actions 默认 `actionsClassName`）；schema 侧无需改动。
- **归族**: systemic → R2-3 批（与 H5-01 同根因合并）
- **复核状态**: 未复核

### [R2-1a-C2-02] sticky 操作列 td 无底色：窄视口横向滚动时下层列文字从操作列透出

- **页面/路由**: `#/complex-pages/approval-tasks`（800×900 视口；standard-crud R2-1a-C4-01 修复方向已预告"sticky 操作列加实体底色"，本页坐实为独立根因）
- **主题/视口/状态**: light / 800×900 / 表格横向滚动中
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/approval-tasks/approval-tasks-narrow-table-narrow-light.png`（Alice 行"处理"按钮右侧透出"司"字——部门列"华南分公司"）
- **目视描述**: 窄视口下表格横向滚动，右侧固定的"操作"列下方持续透出滚动经过的单元格文字，与"处理"按钮叠压。
- **程序化证据**:
  - 探针: sticky 单元格 computed bg + cell/button rect 采样（`w4-tabs-crud-out.json` → apNarrowSticky；thead th 对照 `w4-approval-out.json` → stickyOp）
  - 输出: `thead th` sticky 有实体底色 `rgb(255,255,255)`；但 `tbody td` sticky 全部 `background: rgba(0,0,0,0)`（透明）；操作列 cell 宽 110、按钮右缘 694、cell 右缘 744——按钮右侧 50px 透明区直接透出滚动内容
- **对照基准**: 检查提示词 C2（无意外重叠）；C4（~800px 视口表格滚动合理）
- **严重程度**: P2（窄视口/分屏高频出现，文字叠压直接损害可读性；表格渲染器层根因，同族表格页均嫌疑）
- **用户影响**: 窄窗口用户在滚动表格时操作按钮与数据文字互相叠加，难以辨认行内容与操作目标。
- **修复方向**: table 渲染器给 `[data-fixed="right"]`/sticky td 补实体底色令牌（`bg-background` 或行底色跟随 `data-row-alt`），与 thead th 同构；同时给 th/td 左缘加 1px 分隔阴影以提示覆盖关系。
- **归族**: systemic → R2-3 批（table 渲染器 sticky 底色契约）
- **复核状态**: 未复核

### [R2-1a-B3-01] 状态列三态（待审批/已通过/已驳回）视觉完全同色，无语义色编码

- **页面/路由**: `#/complex-pages/approval-tasks`（dashboard 两表状态列、crud-views-export 启用/禁用列同现——≥3 页同根因）
- **主题/视口/状态**: light+dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/approval-tasks/approval-tasks-default-wide-light.png`（状态列 6 行全部同款灰 chip）
- **目视描述**: 待审批、已通过、已驳回渲染为完全相同的灰边框灰字 chip，扫一眼无法区分哪些行待处理。
- **程序化证据**:
  - 探针: 状态单元格 computed bg/border/color（`w4-tabs-crud-out.json` → apChipBg）
  - 输出: 6 行采样 `bg: rgba(0,0,0,0)`、`border: rgb(225,231,239)`、`color: rgb(2,8,23)` 全部一致——三种状态零视觉差
- **对照基准**: 检查提示词 B3（颜色语义：绿=成功、黄=警示、红=破坏性）；E2（关键状态层级）
- **严重程度**: P2（审批页的首要决策信息无状态编码；跨 ≥3 页同根因按规则自 P3 升 P2）
- **用户影响**: 审批人员需逐行阅读文字才能挑出待审批行，扫视效率明显下降；误判已处理行风险上升。
- **修复方向**: 为 `status_label` 类列提供语义 chip 映射（flux-guide 表格章节新增 cell `badge` 类型：已通过→success、待审批→warning、已驳回→destructive；启用→success、禁用→muted），令牌走 `--nop-status-*` 语义色。
- **归族**: local → R2-4 批（schema cell 类型 + 渲染器能力，跨页批量套用）
- **复核状态**: 未复核

### 已知项确认（不重复立项）

宿主 `:root` 覆盖 `--popover` 致 dark 弹层亮底（已知 systemic-local P1）：本页审批 Dialog、confirm AlertDialog 在 dark 下均白底（`approval-tasks-dialog-open-wide-dark.png`）。**加重影响确认**：dark 下 textarea 底色与 placeholder"填写审批意见（可选）"近乎同色，意见输入框在 dark 弹层内几乎不可辨认，建议该已知项修复时以弹层内表单控件可读性为验收口径。

## 4. 误报排除记录

| 疑点                                                 | 排除理由                                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 已通过/已驳回行仍显示"处理"按钮                      | schema 有意设计：点击后弹层展示"该任务已处理"占位文案（状态门控在弹层内），非缺陷     |
| 弹层"驳回/通过"按钮宽 50px 偏小                      | 已归入 H5-02 立项，不重复计数                                                         |
| confirm 截图里右下角 toast"已通过"                   | 取证脚本前序步骤（approve 流程）的合法残留，与本发现无关                              |
| 窄视口表格 `nop-crud-table sw=466 cw=448` 等 C1 命中 | 真实滚动容器为内层 `overflow-x-auto`（有意滚动容器白名单），可达性问题已按 C2-02 立项 |
| 查询面板顶部 ~57px 空白                              | 为折叠开关行（filterTogglable chevron）+面板 padding 的正常结构占位，D2 分组间距合规  |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本路径）；
- findings 归族：A7-01/H5-02/C2-02 → R2-3 系统性批；B3-01 → R2-4 local 批；
- 批内复检通过后 → `verified`。
