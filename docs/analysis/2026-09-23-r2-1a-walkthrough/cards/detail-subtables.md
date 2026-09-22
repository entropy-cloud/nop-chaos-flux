# [card] page:detail-subtables

- **批次**: R2-1a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/detail-subtables` ｜ **载体**: complex-page（master-detail 域，只读详情页）
- **矩阵裁剪**: full（G 画布 n/a；拖拽 n/a；loading 帧未捕获；弹层 H n/a——本页零弹层，订单切换走 select 而非弹层）

## 1. 截图清单

| 状态                    | light                                                                                         | dark                                         |
| ----------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 默认 1280×800           | `_tmp/visual-inspection-2026-09-23/r2-1a/detail-subtables/detail-subtables-default-light.png` | `…/detail-subtables-default-dark.png`        |
| 默认 800×900            | `…/detail-subtables-default-light-narrow.png`                                                 | `…/detail-subtables-default-dark-narrow.png` |
| Tab 切换（第 2 个 tab） | `…/detail-subtables-tab2-light.png`                                                           | —                                            |
| 拖拽 / 弹层 / loading   | n/a                                                                                           | n/a                                          |

## 2. A–H 维度勾选表

- A 交互：A1 ✔（tab hover/切换正常） A2 ✔ A3 ✔（仅列宽手柄同族项，引用 A3-01） A4 n/a A5 fail(R2-1a-F5-01，分页每页行数选择器空壳) A6 n/a A7 n/a A8 n/a A9 ✔（切换 tab/订单内容联动）
- B 颜色：B1 ✔ B2 ✔ B3 ✔ B4 ✔ B5 ✔（dark 复检通过，无弹层不受 --popover 影响） B6 ✔
- C 布局：C1 ✔（1280 无页面级溢出；唯一命中为 opacity-0 隐藏 input 白名单项） C2 ✔ C3 ✔（详情卡→tabs 子表→堆叠子表分区清楚） C4 warn(R2-1a-C4-06) C5 ✔ C6 n/a
- D 间隔：D1 ✔ D2 ✔ D3 ✔（行高 39.6 均匀） D6 ✔ D7 ✔ D8 ✔
- E 排布：E1 ✔ E2 ✔（订单详情 16px/600 > 子表标题 14px/600 > 正文 14px/400，金额合计强调层级成立） E3 ✔ E4 fail(R2-1a-E4-02，单价列左对齐，同族 E4-01) E5 ✔ E6 ✔（"暂无付款记录/暂无物流信息"空态文案明确）
- F 一致性：F1 ✔ F5 fail(R2-1a-F5-01)
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1a-F5-01] 分页条"每页行数"选择器渲染为空壳（0 个选项、无值）

- **页面/路由**: `#/complex-pages/detail-subtables`（订单明细子表分页条）
- **主题/视口/状态**: light+dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/detail-subtables/detail-subtables-default-light.png`（"每页行数:"后为空白下拉框）
- **目视描述**: 分页条左侧每页行数下拉框显示为空白盒子（对照 standard-crud/tree-crud 显示"10"）。
- **程序化证据**:
  - 探针: 枚举页面全部 select 读 value/options（`_tmp/r2-1a-probes/w6-ds-mini2.mjs`）
  - 输出: 可见分页 select `value=""`, `options.length=0`, `w=64`；对照页 standard-crud 同位置 select 有 10/20/50/100 四个选项
- **对照基准**: A5（控件应有有意义内容非空壳）、F5（同语义分页条控件构成跨页一致）
- **严重程度**: P2（控件空壳 + 跨页不一致；高频列表路径可见）
- **用户影响**: 用户无法调整子表每页行数，且空白下拉观感像"坏了"；与其它 CRUD 页同类控件不一致。
- **修复方向**: pagination-renderer/子表分页条在未配置 pageSizeOptions 时落默认 `[10,20,50,100]`（与 CrudListPagination 一致），或在无选项时隐藏该控件。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1a-E4-02] 子表单价/金额列左对齐（R2-1a-E4-01 同族第 2 实例）

- **页面/路由**: `#/complex-pages/detail-subtables`
- **主题/视口/状态**: light / 1280×800 / 默认
- **截图**: `…/detail-subtables-default-light.png`（订单明细表 440.25 左对齐）
- **目视描述**: 单价列数值左对齐，与 E4-01 同根因。
- **程序化证据**:
  - 探针: 表头/单元格 textAlign 采样（`w6-detail-subtables.mjs` → `tables`）
  - 输出: 订单明细表 `单价 ta=left`、行尾单元格 `440.25 ta=start`；付款记录表"金额"列同 left
- **对照基准**: 同 R2-1a-E4-01
- **严重程度**: P2（归族，≥3 页系统性）
- **用户影响**: 同族。
- **修复方向**: 同 R2-1a-E4-01（number 列默认右对齐 + tabular-nums）。
- **归族**: systemic → R2-3 批（并入 E4-01）
- **复核状态**: 未复核

### [R2-1a-C4-06] 窄视口表格与详情字段挤压（同族复现，引用 R2-1a-C4-01）

- **页面/路由**: `#/complex-pages/detail-subtables`
- **主题/视口/状态**: light / 800×900 / 默认
- **截图**: `…/detail-subtables-default-light-narrow.png`
- **目视描述**: 订单详情字段竖排折行（"金额：1280.5"折两行），明细表只露 3 列，单价列值"440"被裁半。
- **程序化证据**: narrowC1 扫描无页面级溢出命中（内容由内层横滚承接）；塌缩为列宽分配问题。
- **对照基准**: C4 视口弹性
- **严重程度**: P2（归族 C4-01）
- **用户影响**: 同族。
- **修复方向**: 同族修复方案；本页详情摘要字段建议 `sm:grid-cols-2` 降级。
- **归族**: systemic → R2-3 批
- **复核状态**: 未复核

## 4. 误报排除记录

| 疑点                                | 排除理由                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| C1 命中 `INPUT sw=16 cw=1`          | opacity-0 隐藏原生 input（combobox 内部），白名单模式，非可见缺陷                                                  |
| 订单明细表"只见 4 列无小计"疑列缺失 | 探针证实本页子表 schema 就只有 SKU/商品/数量/单价 4 列（与 master-detail 的 6 列 CRUD 子表为不同展示配置），非截断 |
| 操作日志/收货地址表 th 宽度=0       | 位于未激活 tab 内（display:none），切换后正常渲染（tab2 截图）                                                     |
| 每页行数空白疑为"未加载数据"        | select options=0 为静态 DOM 事实（非异步未达），1 行数据下分页信息"第 1-1 条，共 1 条"正常，仅该控件空壳           |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；
- findings 归族：F5-01 → R2-4 local；E4-02 → R2-3（并入 E4-01）；C4-06 → R2-3（同族）；
- 批内复检通过后 → `verified`。
