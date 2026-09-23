# [card] page:table-column-width

- **批次**: R2-1c ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/table-column-width` ｜ **载体**: 域页面（列宽策略宿主 fixture：无 width 列拉伸填满 / rowSelection 控制列 40px 钉住）
- **矩阵裁剪**: full −（裁掉项：glass 皮肤（本波统一裁剪）；A4 disabled、A5 异步态（同步 mock，spinner/skeleton=0）；A7/H 弹层（无）；G 设计器 overlay 专项按"拖拽手柄类判据"降维执行——本页非画布页但含指针拖拽面，G2/G3 判据照常取证；empty 态无（恒 4 行数据））

## 1. 截图清单（状态矩阵）

| 状态                               | light                                                                                                  | dark                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| 默认 1280×800                      | `_tmp/visual-inspection-2026-09-23/r2-1c/table-column-width/table-column-width-default-wide-light.png` | `…/table-column-width-default-wide-dark.png`   |
| 列宽手柄 hover（cursor+微高亮）    | `…/table-column-width-handle-hover-light.png`                                                          | —（hover 类切换与主题无关，dark 默认同构）     |
| 拖拽进行中（+60px 中间态列宽实测） | `…/table-column-width-drag-mid-light.png`                                                              | —                                              |
| 拖拽落位后（+120px）               | `…/table-column-width-drag-after-light.png`                                                            | —                                              |
| 行 hover                           | `…/table-column-width-row-hover-light.png`                                                             | —                                              |
| 默认 800×900                       | `…/table-column-width-default-narrow-light.png`                                                        | `…/table-column-width-default-narrow-dark.png` |
| focus-visible                      | 未单独截帧（手柄 `focus-visible:ring-2 ring-ring` 源码级 + 键盘步进探针间接证实焦点可达）              | —                                              |
| 弹层打开 / loading/empty/error     | n/a                                                                                                    | n/a                                            |

## 2. A–H 维度勾选表

- A 交互：A1 ✔（行 hover 蓝 tint `color(srgb 0.11 0.43 0.95 / 0.06)`、手柄 hover primary/40） A2 ✔（手柄 focus-visible ring-2 + 键盘可达） A3 **warn(R2-1c-A3-01 族扩面)**（手柄 4×39.5；全选/行选择 checkbox 16×16） A4 n/a A5 n/a A6 **✔（列宽拖拽全链路：按下→中间态实时跟手→落位保持，无 ghost 需求）** A7 n/a A8 ✔（ArrowLeft/Right 10px/步单指针替代） A9 ✔（拖拽落位宽度即时持久反映）
- B 颜色：B1 ✔（th 20:1、td 12.6:1；dark 19.1:1/14:1） B2 ✔（手柄 hover/focus 边界 ≥3:1 走 primary 令牌） B3 n/a（无状态语义色面——status 列为纯文本） B4 ✔（全部 computed 值走 `--table-*`/primary 令牌） B5 ✔（dark 全样本 13.96–19.12:1） B6 n/a
- C 布局：C1 ✔（1280 与 800 均无页级溢出；checkbox sw=26/cw=14、select-cell td 3px 内部微溢出不可见见误报排除） C2 ✔ C3 ✔（两表上下分区清晰） C4 ✔（800 视口 tableW=containerW=638 拉伸保持） C5 ✔ C6 n/a
- D 间隔：D1 ✔（两表块距 gap-lg 24px） D2 ✔ D3 ✔（行高 41/40.5 一致） D4 n/a D5 n/a D6 ✔（分页条 12px 块距） D7 ✔ D8 ✔
- E 排布：E1 ✔（fixture 两断言一眼可读） E2 ✔ E3 ✔ E4 warn(R2-1a-E4-01 族扩面：ID 列 left) E5 ✔ E6 n/a
- F 一致性：F5 ✔（分页条构成与同波各卡口径一致） F1/F2/F3/F4 n/a
- G 设计器：G2 ✔（手柄 hover `cursor: col-resize` + primary/40 微高亮） G3 ✔（拖拽中间态列宽实时跟手，见发现前量化） G1/G4–G8 n/a（非画布页）
- H 弹层：n/a

## 3. 发现条目

### [R2-1c-A3-01] 列宽拖拽手柄 4×39.5、选择 checkbox 16×16（<24×24，R2-1a-A3 族扩面）

- **页面/路由**: `#/table-column-width`（表 2 全选列 + 行选择列；全站默认开启 columnResize 的 nop-table 同构）
- **主题/视口/状态**: light / 1280×800 / 默认与 hover 态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/table-column-width/table-column-width-handle-hover-light.png`
- **目视描述**: 手柄仅 4px 宽且默认透明，hover 才现色；checkbox 16px 见方。
- **程序化证据**:
  - 探针: 可交互元素 min(w,h) 扫描 + hover computed（`_tmp/r2-1c-probes/table-column-width-out.json` smallTargets、resizeHandle.hoverState）
  - 输出: `[data-slot="table-column-resize-handle"] w=4 h=39.5`（role=separator/tabIndex=0/键盘 10px 步进可用，A8 合规）；`span[slot=checkbox] 全选 16×16`、`选择行 16×16`
- **对照基准**: WCAG 2.5.8（24×24）+ 2.5.7（替代途径已在）；R2-1a-A3 族（dashboard 卡同实例"列宽手柄 4×39.5"）
- **严重程度**: P3
- **用户影响**: 精准命中手柄困难；checkbox 点击容错小（td 40px 但点击 td 不切换）。
- **修复方向**: 手柄命中域扩至 ≥12px（视觉 1px + 透明 padding 热区）；checkbox 可考虑整 td 点击（与 R2-3 触控目标契约批合并裁决）。
- **归族**: systemic → R2-3 批（R2-1a-A3 族扩面，与 performance-table 卡实例合并）
- **复核状态**: 未复核

### [R2-1a-E4-01 族扩面] ID 纯数值列左对齐

- **页面/路由**: `#/table-column-width`（表 1 ID 列）
- **主题/视口/状态**: light / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/table-column-width/table-column-width-default-wide-light.png`
- **目视描述**: ID 数字列左对齐，与文本列无异。
- **程序化证据**:
  - 探针: 首行 td `textAlign` 采样（`table-column-width-out.json` wide-light.tables firstCells）
  - 输出: ID 列 `align: "start"`
- **对照基准**: 检查提示词 E4；watch-pool `R2-1a-E4-01` 既有族
- **严重程度**: P3（既有族实例）
- **用户影响**: 同既有族。
- **修复方向**: 同族既定方向。
- **归族**: watch-only → 台账（并入 R2-1a-E4-01）
- **复核状态**: 未复核

### G3 专项量化（pass，作为发现面空白期的正向取证记录）

- **拖拽中间态列宽实时跟手**: before `[117,200,190,170,209]`（sum 886）→ 指针 +60px 中间态 `[180,181,182,153,190]`（ID +63，其余列补偿收缩）→ +120px 落位 `[240,163,174,137,172]`（sum 886 守恒）；截图 `drag-mid-light.png` 目视确认拖拽中列宽已变化且无布局抖动。
- **键盘步进**: ArrowRight×2 → ID 240→260（10px/步，`COLUMN_RESIZE_KEYBOARD_STEP`）。
- **hover 可供性**: `cursor: col-resize`、bg `oklab(.../0.4)`（primary/40）。
- **宽度策略断言全过**: 表 1 `headerSum 886 = tableW 886`（无 width 列拉伸填满 w-full）；表 2 selection 列 `th=40 td=40` 钉住；800 视口两表 `tableW=containerW=638`。

## 4. 误报排除记录

| 疑点                                                                        | 排除理由                                                                                            |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| C1 扫描命中 `span.checkbox sw=26 cw=14`、`td table-select-cell sw=43 cw=40` | checkbox 内部指示符/3px padding 微溢出，overflow visible 无裁切无视觉影响（目视确认），非可达性缺口 |
| 拖拽无 ghost/drop-indicator                                                 | 列宽 resize 是连续增量操作（列边界即实时反馈），NN/g ghost 语义针对拖放落位类任务，不适用           |
| `input 1×1` 命中                                                            | opacity-0 native select（登记误报模式）                                                             |
| 800 视口两表均 638px 无横向滚动                                             | 4 行短文本 min-content < 容器，拉伸策略正常工作                                                     |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本路径）；
- findings 归族：A3-01 → R2-3 系统性批（R2-1a-A3 族扩面）；E4 实例 → watch-pool 既有族；
- 批内复检通过后 → `verified`。
