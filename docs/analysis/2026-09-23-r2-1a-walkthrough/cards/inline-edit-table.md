# [card] page:inline-edit-table

- **批次**: R2-1a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/inline-edit-table` ｜ **载体**: complex-page（data-lists 域）
- **矩阵裁剪**: full（G 画布 n/a；弹层 H n/a——本页零弹层，行内编辑不走 Dialog；glass 未抽查）

## 1. 截图清单

| 状态                           | light                                                                                           | dark                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 默认 1280×800                  | `_tmp/visual-inspection-2026-09-23/r2-1a/inline-edit-table/inline-edit-table-default-light.png` | `…/inline-edit-table-default-dark.png`        |
| 默认 800×900                   | `…/inline-edit-table-default-light-narrow.png`                                                  | `…/inline-edit-table-default-dark-narrow.png` |
| 编辑态（单元格 focus）         | `…/inline-edit-table-cell-editing-light.png`                                                    | —（border 色探针双主题同构）                  |
| 脏值态（改 40→88）             | `…/inline-edit-table-cell-dirty-light.png`                                                      | —                                             |
| 保存后反馈（toast + 合计刷新） | `…/inline-edit-table-after-save-light.png`                                                      | —                                             |
| 失焦态                         | `…/inline-edit-table-cell-blurred-light.png`                                                    | —                                             |
| 弹层打开                       | n/a（quickEdit 常驻输入框，无弹层）                                                             | n/a                                           |
| 拖拽                           | n/a                                                                                             | n/a                                           |
| loading/empty                  | n/a                                                                                             | n/a                                           |

## 2. A–H 维度勾选表

- A 交互：A1 ✔（行 hover tint 探针证实 `color(srgb 0.11 0.43 0.95 / 0.06)`） A2 ✔（编辑态输入框 border→rgb(28,110,242)，fv=true） A3 warn（步进器按钮 24×16，归族 R2-1a-A3-01 不重复立项） A4 n/a A5 n/a A6 warn(R2-1a-A6-01) A7 n/a A8 n/a A9 ✔（保存 toast「保存成功」+ 年度合计 205→253 实时刷新）
- B 颜色：B1 ✔（20:1） B2 ✔ B3 ✔ B4 ✔ B5 ✔（dark 表格 17–19:1） B6 ✔
- C 布局：C1 ✔（1280 全页零溢出） C2 ✔ C3 ✔ C4 warn(R2-1a-C4-03) C5 ✔ C6 n/a
- D 间隔：D1 ✔ D2 ✔ D3 ✔（行高 55px ×9+1，均匀） D6 ✔（12px） D7 ✔ D8 ✔
- E 排布：E1 ✔ E2 ✔ E3 ✔ E4 fail(R2-1a-E4-01) E5 ✔ E6 n/a
- F 一致性：F1 warn(R2-1a-F1-01) F5 ✔
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1a-E4-01] 数值列（年度合计）左对齐，违反数字右对齐惯例

- **页面/路由**: `#/complex-pages/inline-edit-table`（detail-subtables / master-detail 子表 / business-document 同根因，≥3 页）
- **主题/视口/状态**: light / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/inline-edit-table/inline-edit-table-default-light.png`（"年度合计"列 205/280/355 左缘对齐）
- **目视描述**: 只读计算列"年度合计"数值全部左对齐，多位数与少位数视觉重心不齐，无法纵向比大小。
- **程序化证据**:
  - 探针: 逐列 textAlign + left 坐标采样（`_tmp/r2-1a-probes/w6-ie-mini.mjs`）
  - 输出: `col5（年度合计）: aligns=["start"], lefts=[976]`——6 行数值全部 start 对齐；可编辑输入框列同样 `inputTa="start"`
- **对照基准**: 检查提示词 E4「数字右对齐」；财务/数据表格行业惯例（GAAP 报表、AntD Table number 列默认 right）
- **严重程度**: P3（单页细节；系统性 ≥3 页同根因整体升 P2）
- **用户影响**: 预算核对场景需逐行读数，扫读效率低；业务单据页金额核对受影响最明显。
- **修复方向**: table renderer 对 schema 标记为数字/金额的列（或 `type: "number"` 字段列）默认 `text-align: right` + 等宽数字 `font-variant-numeric: tabular-nums`；输入框内数值同步右对齐。归 R2-3 系统性批。
- **归族**: systemic → R2-3 批
- **复核状态**: 未复核

### [R2-1a-F1-01] 行操作列表头空置（本页无"操作"列头，standard-crud 有）

- **页面/路由**: `#/complex-pages/inline-edit-table`
- **主题/视口/状态**: light / 1280×800 / 默认
- **截图**: `…/inline-edit-table-default-light.png`（最右列表头空白）vs `…/standard-crud/standard-crud-default-light.png`（"操作"列头）
- **目视描述**: 悬停出现的 取消/保存 按钮列没有列头，与其他 CRUD 表格的"操作"列头不一致。
- **程序化证据**:
  - 探针: thead 文案枚举（`w6-ie-mini.mjs`）
  - 输出: `head[6] = { t: "" }`（空列头）；对照 standard-crud 同位置 `t: "操作"`
- **对照基准**: F1（同语义操作跨页同表现）
- **严重程度**: P3
- **用户影响**: 轻微不一致；空列头在宽表中对齐感稍差。
- **修复方向**: quickEdit 表格模板给操作列补默认列头"操作"（与 crud 行操作列头对齐），或明确 design.md 记录空列头为有意密度选择。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1a-A6-01] 行编辑脏值无持久指示，保存后按钮残留

- **页面/路由**: `#/complex-pages/inline-edit-table`
- **主题/视口/状态**: light / 1280×800 / 修改 Q1=88 后
- **截图**: `…/inline-edit-table-cell-dirty-light.png`（脏行无标记）、`…/inline-edit-table-after-save-light.png`（保存成功后行尾仍挂 取消/保存）
- **目视描述**: 单元格改值后除输入框本身外无任何"未保存"标记（无圆点/行色变化）；点击保存、toast「保存成功」后取消/保存按钮仍显示在行尾。
- **程序化证据**:
  - 探针: fill 前后行 className/computed bg diff（`w6-inline-edit.mjs` → `dirtyState`）
  - 输出: 脏行 `rowBg` 仅为 hover tint（鼠标在其上），行类无 dirty/data-modified 标记；保存成功后按钮仍 enabled 且可见
- **对照基准**: A6/A9（编辑态进入退出反馈、操作后状态清晰）；AMS/antd 可编辑表格惯例（脏行标记 + 保存后退出编辑态）
- **严重程度**: P3
- **用户影响**: 多行编辑时难以记住哪些行未保存；保存后不确定是否还需点击（可能重复提交）。
- **修复方向**: 行 draft 脏值时加 `data-dirty` → 行首显圆点或行底色 `primary/5`；quickSaveItemAction 成功后清除 draft 态并隐藏行内保存/取消钮（保留常驻输入框）。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1a-C4-03] 窄视口表格挤压（同族复现，引用 R2-1a-C4-01）

- **页面/路由**: `#/complex-pages/inline-edit-table`
- **主题/视口/状态**: light / 800×900 / 默认
- **截图**: `…/inline-edit-table-default-light-narrow.png`
- **目视描述**: 800px 下表格可横向滚动（内层 overflow-x-auto），列可达但一屏仅见 2-3 列；查询/工具栏区正常。
- **程序化证据**: 探针 `.nop-crud sw=466 cw=448`（轻微 18px 由分页条 flex-col 回退承接）；输入单元格无 <24px 交互塌缩。
- **对照基准**: C4 视口弹性
- **严重程度**: P2（归族 C4-01 系统性；本页表现最轻）
- **用户影响**: 同族：横滚成本高。
- **修复方向**: 同 R2-1a-C4-01 修复方向（列显隐/最小列宽策略）。
- **归族**: systemic → R2-3 批
- **复核状态**: 未复核

## 4. 误报排除记录

| 疑点                                        | 排除理由                                                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| "编辑态无反馈"初判                          | 输入框 focus 时 border 变主题蓝 + fv=true（探针证实），反馈存在；发现改立为"脏值无持久指示"（A6-01），非"无反馈" |
| after-save 截图行内按钮"未消失"疑似保存失败 | toast「保存成功」+ 年度合计 205→253 + 行值 88 持久，保存确已生效；按钮残留单独立项（A6-01）                      |
| 行 2 无 取消/保存 按钮                      | 按钮为 hover/draft 触发显示（innerText 不含 display:none 文本），非常驻缺失，非缺陷                              |
| C1 命中 `nop-checkbox` sw26/cw14            | opacity-0 原生控件白名单                                                                                         |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；
- findings 归族：E4-01 → R2-3（系统性）；C4-03 → R2-3（与 C4-01 同族）；A6-01 / F1-01 → R2-4 local；
- 批内复检通过后 → `verified`。
