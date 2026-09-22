# [card] page:business-document

- **批次**: R2-1a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/business-document` ｜ **载体**: complex-page（complex-forms 域，业务单据）
- **矩阵裁剪**: full（G 画布 n/a；拖拽 n/a；弹层 H n/a——本页无 Dialog，订单日期字段 date-range popover 与 advanced-query 同组件，引用其卡不重复截图深查；loading n/a 纯前端公式）

## 1. 截图清单

| 状态                          | light                                                                                           | dark                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 默认 1280×800                 | `_tmp/visual-inspection-2026-09-23/r2-1a/business-document/business-document-default-light.png` | `…/business-document-default-dark.png`        |
| 默认 800×900                  | `…/business-document-default-light-narrow.png`                                                  | `…/business-document-default-dark-narrow.png` |
| 联动中态（数量 2→5 全表重算） | `…/business-document-qty-changed-light.png`                                                     | —                                             |
| 弹层 / 拖拽 / loading         | n/a（订单日期 popover 同 advanced-query 已capture）                                             | n/a                                           |

## 2. A–H 维度勾选表

- A 交互：A1 ✔ A2 ✔ A3 warn（表头数字输入步进钮 24×16，归族 R2-1a-A3-01） A4 n/a A5 n/a A6 n/a A7 n/a A8 n/a A9 ✔（数量 2→5：行金额 36000→90000、应付合计 48364→109384 实时重算，无静默更新）
- B 颜色：B1 ✔（dark 表格 17.08:1） B2 ✔ B3 ✔ B4 ✔ B5 ✔（dark 页面本体合规；无弹层） B6 ✔
- C 布局：C1 fail(R2-1a-C4-07，窄视口输入框值滚出可视区) C2 ✔ C3 ✔（表头 fieldset→明细表→合计卡三级清晰） C4 fail(R2-1a-C4-07) C5 ✔ C6 n/a
- D 间隔：D1 ✔ D2 ✔ D3 ✔（行高 55 均匀） D4 ✔ D5 ✔（表头字段组间距与 fieldset 惯例一致） D6 n/a（本页无分页条） D7 ✔ D8 ✔
- E 排布：E1 ✔（单据三问可答） E2 ✔（应付合计 16px/700 强于小计 14px/400） E3 warn(R2-1a-E3-01) E4 fail(R2-1a-E4-03) E5 ✔（卡片/留白分组一致） E6 n/a
- F 一致性：F1 ✔（新增行 outline、层级符合惯例） F5 n/a
- G 设计器：n/a
- H 弹层：n/a（订单日期 popover 同 advanced-query 已 capture）

## 3. 发现条目

### [R2-1a-E4-03] 金额(元)列与合计区数值全部左对齐（R2-1a-E4-01 同族第 3 实例，本页为单据核对主场景）

- **页面/路由**: `#/complex-pages/business-document`
- **主题/视口/状态**: light / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/business-document/business-document-default-light.png`（金额列 36000/6800 左对齐；合计卡"小计：42800 元"等全部左对齐）
- **目视描述**: 只读"金额(元)"计算列数值左对齐；单价/数量输入框内数值同样左对齐；金额合计卡各行为左对齐文本行，数值未纵向对齐。
- **程序化证据**:
  - 探针: 金额/单价/数量列 textAlign + x 坐标采样（`_tmp/r2-1a-probes/w6-business-doc.mjs` → `money`）
  - 输出: `amount: ta="start", x=907.8`（两行同 x 但左对齐）；`price/qty inputTa="start"`；合计行 `ta="start"`
- **对照基准**: E4「数字右对齐」；单据/财务表单行业惯例（发票、ERP 单据金额列均右对齐 + 千分位）
- **严重程度**: P2（≥3 页系统性升级；本页为金额核对核心场景，影响最直接）
- **用户影响**: 核对采购单金额时无法纵向比对数量级，单价×数量心算校验困难；大额单据差错风险上升。
- **修复方向**: input-table 金额列只读公式单元格右对齐 + `tabular-nums` + 千分位格式化；合计卡数值列改右对齐两栏布局（label 左 value 右）。并入 R2-1a-E4-01 修复批。
- **归族**: systemic → R2-3 批（并入 E4-01）
- **复核状态**: 未复核

### [R2-1a-C4-07] 窄视口明细行输入框宽度塌缩，输入值横向滚出可视区（同族最重表现）

- **页面/路由**: `#/complex-pages/business-document`
- **主题/视口/状态**: light / 800×900 / 默认（数量单元格 focus 态）
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/business-document/business-document-default-light-narrow.png`（数量输入框有焦点环但内容不可见）
- **目视描述**: 800px 下商品名称输入只剩"服务/交换"两字，数量/单价输入框塌缩后值完全不可见——聚焦的数量框仅显空白+步进箭头。
- **程序化证据**:
  - 探针: 溢出扫描（`w6-business-doc.mjs` → `narrowC1`）
  - 输出: 明细行文本输入 `sw=136 cw=49`（内容 136px 装在 49px 盒内，value 横向滚出视口）；对照 1280 下同输入框 cw≈200
- **对照基准**: C1（文本溢出容器）/C4（视口弹性）；P0 判据边缘——本页为"编辑中的关键值不可读"
- **严重程度**: P1（归族 C4-01 系统性；本页表现升格为"编辑值不可见"）
- **用户影响**: 分屏用户编辑明细行时看不到正在输入的数量/单价，直接导致录单错误。
- **修复方向**: 同族 flex 收缩修复 + input-table 单元格设 `min-w-[4rem]` 并在窄屏将行操作钮折行/悬浮。
- **归族**: systemic → R2-3 批
- **复核状态**: 未复核

### [R2-1a-E3-01] 页面级提交按钮"提交采购单"位于内容左下，与表单动作右对齐契约相悖

- **页面/路由**: `#/complex-pages/business-document`
- **主题/视口/状态**: light / 1280×800 / 页面底部
- **截图**: `…/business-document-default-light.png`（按钮在首屏下方，探针坐标为准）
- **目视描述**: 主提交按钮 primary 蓝落在表单内容左下角，不在右下主位。
- **程序化证据**:
  - 探针: 按钮 rect + variant 类（`w6-business-doc.mjs` → `primaryBtn`）
  - 输出: `x=296（内容左缘）、y=912、w=92、variant=bg-primary`——左对齐确证
- **对照基准**: styling-system.md「Dialog / Form Action Button Convention」actions 右对齐（虽条文针对弹层，form-actions 默认同为 justify-end）；E3 按钮落点惯例
- **严重程度**: P3（单页、无弹层上下文，惯例冲突但无障碍性受损小；与 H5-01 同根因——actions 容器缺 `justify-end` 默认）
- **用户影响**: 与弹层保存/确认按钮位置心智不一致。
- **修复方向**: form-actions 默认类补 `justify-end`（同 H5-01 根因修复，页面级 actions 一并受益）。
- **归族**: systemic → R2-3 批（并入 H5-01）
- **复核状态**: 未复核

## 4. 误报排除记录

| 疑点                                     | 排除理由                                                                                              |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 明细行 ^ v 排序钮 + 垃圾桶删行钮疑 <24px | A3 扫描未命中（≥24px 热区），仅步进器 16px 命中（归 A3-01 族）                                        |
| 窄视口金额列"36000/6800"仍可见           | 只读文本列可读；不可见的是可编辑输入框内值（已立 C4-07），二者区分                                    |
| 合计卡在 dark 下强调不足疑               | dark 复检：应付合计 16px/700 保持，对比度 17:1，层级成立                                              |
| 订单日期 popover 未单独深查              | 与 advanced-query 同一 date-range 组件同态（advanced-query 卡已含 light/dark 打开态取证），不重复立项 |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；
- findings 归族：E4-03 → R2-3（并入 E4-01）；C4-07 → R2-3（同族）；E3-01 → R2-3（并入 H5-01）；
- 批内复检通过后 → `verified`。
