# [card] page:advanced-query

- **批次**: R2-1a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/advanced-query` ｜ **载体**: complex-page（data-lists 域）
- **矩阵裁剪**: full（G 画布 n/a；拖拽 n/a；H 弹层面按本页弹层族谱覆盖：date-range 日历 popover + 状态/角色 combobox 下拉，无 Dialog/Sheet）

## 1. 截图清单

| 状态                | light                                                                                     | dark                                       |
| ------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------ |
| 默认 1280×800       | `_tmp/visual-inspection-2026-09-23/r2-1a/advanced-query/advanced-query-default-light.png` | `…/advanced-query-default-dark.png`        |
| 默认 800×900        | `…/advanced-query-default-light-narrow.png`                                               | `…/advanced-query-default-dark-narrow.png` |
| 查询区折叠态        | `…/advanced-query-query-collapsed-real-light.png`                                         | —                                          |
| date-range 日历打开 | `…/advanced-query-daterange-open-light.png`                                               | `…/advanced-query-daterange-open-dark.png` |
| combobox 下拉打开   | `…/advanced-query-combobox-open-light.png`                                                | —（同族 known --popover 覆盖）             |
| 重置后              | `…/advanced-query-after-reset-light.png`                                                  | —                                          |
| 拖拽 / loading      | n/a                                                                                       | n/a                                        |

## 2. A–H 维度勾选表

- A 交互：A1 ✔ A2 ✔ A3 warn（"增加"步进钮 24×16、表头排序钮 20.3px 高，归族 R2-1a-A3-01） A4 n/a A5 n/a A6 n/a A7 ✔（日历 popover 点击外区/Esc 可关） A8 n/a A9 ✔（重置有表单清空反馈；空条件搜索前后数据不变属预期，非静默失败）
- B 颜色：B1 ✔ B2 ✔ B3 ✔ B4 ✔ B5 warn（dark 弹层亮底 = 宿主 `--popover` 覆盖已知项，本页确认一句：date-range 日历在 dark 下白底，见 daterange-open-dark 截图；页面本体 dark 合规） B6 ✔（日历"今天"圈选、范围选中用主题色）
- C 布局：C1 fail(R2-1a-C4-04，窄视口) C2 ✔（日历 popover 压表格属有意 overlay） C3 ✔ C4 fail(R2-1a-C4-04) C5 ✔ C6 n/a
- D 间隔：D1 ✔（字段间隙 8px h/v 一致，4pt 栅格） D2 ✔ D3 ✔（行高 40.1 均匀） D4 ✔ D5 warn-注（查询字段间隙 8px 低于 16px 表单惯例，但与 standard-crud 查询区一致，属 crud-query 密度档，不立项） D6 ✔（12px） D7 ✔ D8 ✔
- E 排布：E1 ✔ E2 ✔（搜索 primary、重置 outline） E3 ✔ E4 ✔ E5 ✔ E6 ✔
- F 一致性：F1 ✔（搜索/重置与 standard-crud 同 variant 同位置） F5 ✔
- G 设计器：n/a
- H 弹层：H1 ✔（日历 popover 228px content-sized——popover 类按 anatomy 约定有意不在阶梯） H2 n/a H3 ✔（日历 bottom 579 ≤ 792） H4 n/a H5 n/a（无 footer） H6 n/a H7 n/a H8 ✔ H9 ✔（anchor 宽度自适应，未溢出视口）

## 3. 发现条目

### [R2-1a-C4-04] 窄视口查询表单溢出裁切（同族复现，本页为最重页面级溢出）

- **页面/路由**: `#/complex-pages/advanced-query`
- **主题/视口/状态**: light+dark / 800×900 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/advanced-query/advanced-query-default-light-narrow.png`
- **目视描述**: 800px 下查询区字段挤压、卡片右缘裁切约 20px；创建时间输入框贴边截断。
- **程序化证据**:
  - 探针: 全页溢出扫描（`_tmp/r2-1a-probes/w6-advanced-query-probes.json` → `narrowC1`）
  - 输出: `SECTION.nop-page sw=516 cw=480`、`.nop-card sw=532 cw=512`（overflow-hidden 实裁 20px）、`.nop-crud sw=500 cw=448`、`SECTION.nop-form sw=432 cw=414`、`LABEL.nop-field` 系列 sw>cw
- **对照基准**: C1 无意外溢出 / C4 视口弹性；与 standard-crud `narrowC1` 输出逐层同构（同根因）
- **严重程度**: P1（与 R2-1a-C4-01 同级同族；查询区是本页唯一主操作面）
- **用户影响**: 分屏用户查询条件输入/读取受限，卡片边缘内容被裁不可达。
- **修复方向**: 同 R2-1a-C4-01（`nop-crud-query` 行容器 `flex-wrap` + 页面最小宽度策略）。
- **归族**: systemic → R2-3 批
- **复核状态**: 未复核

### 折叠功能验证（非缺陷，记录供复核）

折叠钮（查询卡右上 chevron）点击后查询区高度 234px→46px，表格仍在（探针 `w6-aq-collapse.mjs` 输出 before=234 / after=46 / tableH=485）。首跑误点"重置"得出"折叠无效"为脚本定位错误，已复验排除。

## 4. 误报排除记录

| 疑点                                                                      | 排除理由                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 打开日历后目视发现"状态列被压成 20px、日期左截断、部门列消失"疑似重排缺陷 | 专项探针对比开/关日历的 th 宽度序列与容器 scroll：**完全一致**（ID 73/姓名 125/邮箱 240/角色 104/状态 94/部门 115/创建时间 177，scrollParents 无位移）。目视所见为日历 popover 白色面板右缘叠压表格造成的裁切错觉——popover 本是有意 overlay。整体证伪 |
| 空条件点"搜索"表格无变化                                                  | 空条件查询结果相同属预期；重置有表单清空反馈（截图 after-reset），非静默失败                                                                                                                                                                          |
| 数字区间输入框出现 24×16"增加"钮                                          | 为 input-number 步进器，归 A3-01 系统族，已立案不重复                                                                                                                                                                                                 |
| dark 日历白底                                                             | 宿主 `--popover` 覆盖已知 P1 项，本卡 B5 仅作确认                                                                                                                                                                                                     |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；
- findings 归族：C4-04 → R2-3（与 C4-01 同族）；其余无新立项；
- 批内复检通过后 → `verified`。
