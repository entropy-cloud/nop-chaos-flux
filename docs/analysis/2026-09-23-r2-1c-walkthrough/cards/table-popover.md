# [card] page:table-popover

- **批次**: R2-1c ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/table-popover` ｜ **载体**: 域页面（table 列级 popOver fixture：click trigger + content region / copyable 共存 / onEmpty 空值兜底）
- **矩阵裁剪**: full −（裁掉项：glass 皮肤（本波统一裁剪）；A6 拖拽、A4 disabled、A5 异步态（同步 mock，spinner/skeleton=0 探针证实）；G n/a。H 维度按本页载体全量执行（单元格弹层专项），但 H1 宽度阶梯对 Popover 豁免——styling-system.md 明文"hover floaters (Popover/DropdownMenu/Tooltip) content-sized by design, deliberately outside the ladder"）

## 1. 截图清单（状态矩阵）

| 状态                                                         | light                                                                                        | dark                                         |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 默认 1280×800                                                | `_tmp/visual-inspection-2026-09-23/r2-1c/table-popover/table-popover-default-wide-light.png` | `…/table-popover-default-wide-dark.png`      |
| 弹层打开 #1（Note 列 placement=right，含 title+badge）       | `…/table-popover-popover-note-open-light.png`                                                | `…/table-popover-popover-note-open-dark.png` |
| 弹层打开 #2（Email 列 placement=top，与 copyable 共存）      | `…/table-popover-popover-email-open-light.png`                                               | —（dark 探针同构复测 badge 已另行取证）      |
| 弹层打开 #3（onEmpty=show emptyText 兜底，placement=bottom） | `…/table-popover-popover-empty-open-light.png`                                               | —                                            |
| 末行弹层视口边缘碰撞                                         | `…/table-popover-popover-last-row-light.png`                                                 | —                                            |
| 滚动容器 scrollLeft=40 后重开弹层（锚定）                    | `…/table-popover-popover-scrolled-anchor-light.png`                                          | —                                            |
| 默认 800×900 + 弹层                                          | `…/table-popover-default-narrow-light.png`、`…/table-popover-popover-narrow-light.png`       | `…/table-popover-popover-narrow-dark.png`    |
| hover/focus/disabled                                         | 未单独截帧（行 hover 同族复验；trigger hover bg-accent 程序化在源码级确认）                  | —                                            |
| 拖拽进行中 / loading/empty/error                             | n/a（无拖拽；同步数据无异步态；empty 态即弹层 #3 覆盖）                                      | n/a                                          |

## 2. A–H 维度勾选表

- A 交互：A1 ✔（trigger hover bg-accent） A2 ✔（同族按钮） A3 ✔（trigger 20×20/copy 20×20 = icon-xs 行内按钮豁免；列宽手柄 4px 归 R2-1c-A3-01 族不在本页重复立项） A4 n/a A5 ✔（empty 值有 emptyText 兜底非空白） A6 n/a A7 ✔（弹层打开态完整：Esc 可关、内容 record 作用域正确） A8 n/a A9 n/a
- B 颜色：B1 ✔（弹层文字 rgb(103,87,76) on rgb(251,250,249) ≈7.4:1；dark 同底 7.4:1） B2 ✔ B3 **fail(R2-1c-B5-01 引用)**（弹层内 status badge info→secondary 同令牌对破损：dark rgb(178,206,251)/rgb(203,186,252)=1.4:1） B4 ✔ B5 ✔（dark 弹层亮底 = 宿主 `--popover` 已知项豁免；弹层内文字对比 dark 下 7.4:1 可读） B6 ✔（badge info 语义非默认蓝裸奔——破损在令牌值见 B5-01）
- C 布局：C1 **fail(R2-1c-C2-01)**（表格容器内横向滚动 sw=1123/cw=886） C2 **fail(R2-1c-C2-01)**（最长 note 的 ⓘ 触发器被推出可视区） C3 ✔ C4 **fail(R2-1c-C1-01 同根因)**（800 视口页级 sw=1024/cw=800，224px 溢出） C5 ✔ C6 n/a
- D 间隔：D1 ✔（三表块距 gap-lg 24px） D2 ✔ D3 ✔（行高 43/40.5 一致） D4 n/a D5 n/a D6 ✔（分页条 12px 块距） D7 ✔ D8 ✔（弹层 padding 10px 均一）
- E 排布：E1 ✔ E2 ✔ E3 ✔（触发图标紧贴 cell 文本右缘符合惯例） E4 warn(R2-1a-E4-01 族扩面：ID 纯数值列 left 对齐) E5 ✔ E6 ✔（emptyText 即空态引导）
- F 一致性：F1 ✔（三弹层同 trigger 同图标） F5 ✔ F2/F3/F4 n/a
- G 设计器：n/a
- H 弹层：H1 ✔（Popover 内容 288px content-sized，阶梯豁免） H2 n/a H3 ✔（弹层 bottom ≤ vh−8 实测全过） H4 ✔（title 独立 data-slot、无重叠） H5 n/a（无 footer） H6 ✔（弹层内文本流 gap 一致） H7 ✔（padding 10px 三弹层一致） H8 ✔（内容不溢出弹层 scrollW=clientW=288） H9 ✔（800 视口弹层 415..703 入视口）

## 3. 发现条目

### [R2-1c-C2-01] 声明 width=160 的 Note 列被 nowrap 长文本撑到 943px：容器内横向滚动，最长 note 的 ⓘ 触发器不可达

- **页面/路由**: `#/table-popover`（表 1 Note 列，schema 声明 `width: 160`；Email 列同构 190→209）
- **主题/视口/状态**: light+dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/table-popover/table-popover-default-wide-light.png`（Alice 长注单行铺满并被容器右缘切字，行内无 ⓘ 可见；Bob 短注的 ⓘ 正常可见）
- **目视描述**: 页面 demo 自述目标是"popOver 触发器让用户按需查看全文而不撑宽列"，实际渲染中长 note 单行 nowrap 把列 min-content 撑到 943px、表格 1123px 超出 886px 容器出现横向滚动；最长内容的触发图标被推到可视区外，须先横向滚动才能打开其弹层。
- **程序化证据**:
  - 探针: 表格/容器宽度采样 + 触发器 census（`_tmp/r2-1c-probes/table-popover-out.json` wide-light.tables、triggerCensus、wide-light.overflow）
  - 输出: `table-container sw=1123 cw=886 ox=auto`；表 1 列宽 `ID 60 + Name 120 + Note 943.1 = 1123.1`（声明 160 被覆盖）；触发器分布 table0=2/table1=3/table2=2，Alice 行触发器在 943px 列尾即 ~1047px 处，超出 886px 容器视口
- **对照基准**: 检查提示词 C1（无意外溢出）/C2（无内容被浮层/裁切不可达）；"表格截断"误报豁免不适用——本案无 ellipsis 截断 affordance 且声明宽度失效
- **严重程度**: P3（fixture 页；但暴露 table 渲染器 nowrap min-content > 声明 width 的全局策略缺口）
- **用户影响**: demo 意图不可达（长内容恰是最需要弹层的）；产品面同类"宽文本列 + popOver/showOnOverflow"用法会复现。
- **修复方向**: table 渲染器 cell 默认文本截断策略（`truncate`/`overflow-hidden` + 声明 width 优先，popOver `showOnOverflow` 联动），或 schema fixture 为 note 列加 `className: "max-w-[160px] truncate"`；修复后以"触发器在容器可视区内"为复验判据。
- **归族**: local → R2-4 批（table 渲染器列宽/nowrap 策略；与 table-column-width 页宽度策略断言互补，不属其断言范围）
- **复核状态**: 未复核

### [R2-1c-C4-01] 800 视口页级横向溢出 224px（host section min-content 传播，R2-1c-C1-01 同根因）

- **页面/路由**: `#/table-popover`（`main.grid.place-items-center > section.max-w-[1000px].w-full` 壳层）
- **主题/视口/状态**: light / 800×900 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/table-popover/table-popover-default-narrow-light.png`
- **目视描述**: 800 视口下页面右缘被裁（section 壳层无法收缩到视口内），需横滚 224px。
- **程序化证据**:
  - 探针: overflow 链扫描（`table-popover-out.json` narrow.overflow）
  - 输出: `div(theme-root) sw=1024 cw=800`、`main sw=1024`；表格容器自身 sw=1123/cw=886 有意滚动容器除外；页级溢出源为 section min-content（同 performance-table 主机壳层结构）
- **对照基准**: 检查提示词 C4（窄视口不塌不挤）；briefing 已知族"窄视口 flex/固定壳层（R2-3c 候选）"
- **严重程度**: P3（fixture 页窄视口；与 R2-1c-C1-01 合并修复）
- **用户影响**: 移动/半窗场景需横滚才能读到右缘内容。
- **修复方向**: 同 R2-1c-C1-01（grid item `min-w-0` + 表格容器收口）；修复后 800 视口 C1 复跑。
- **归族**: systemic → R2-3 批（R2-1c-C1-01 同根因并案；R2-3c 窄视口候选族引用）
- **复核状态**: 未复核

### [R2-1a-E4-01 族扩面] ID 纯数值列左对齐

- **页面/路由**: `#/table-popover`（三表 ID 列）；table-column-width 页 ID 列同构（该卡引用）
- **主题/视口/状态**: light / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/table-popover/table-popover-default-wide-light.png`
- **目视描述**: ID 数字列与文本列同左对齐，位数增长后无法按位比较。
- **程序化证据**:
  - 探针: 首行各 td `textAlign` 采样（`table-popover-out.json` wide-light.tables firstCells）
  - 输出: ID 列 `align: "start"`（=left）
- **对照基准**: 检查提示词 E4（数字右对齐）；watch-pool `R2-1a-E4-01` 族（六页实例 + crud-views-export ID 列同型）
- **严重程度**: P3（既有族扩面实例，不另立新族）
- **用户影响**: 同既有族登记。
- **修复方向**: 同族既定方向（table 列定义补 `align: "number"` 档或 schema `text-right` 惯例）。
- **归族**: watch-only → 台账（并入 R2-1a-E4-01 既有族，随 R2-4 消化）
- **复核状态**: 未复核

### watch-only（不立项）

- 弹层锚定探针 `anchoredWithin=false` 为 radix 碰撞回退（placement=right 在视口右缘自动左翻，内容 755..1043 全在视口内、文本正确）——正确行为非缺陷，截图 `popover-scrolled-anchor-light.png` 目视确认。
- 3 行表格仍渲染完整分页条（每页行数+页码+范围）：组件一致性正确，密度属 fixture 取舍。

## 4. 误报排除记录

| 疑点                                 | 排除理由                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| dark 弹层亮底                        | 宿主 `--popover` 已知项（briefing 误报红线）                                           |
| Alice 行无 ⓘ 可见                    | 即 R2-1c-C2-01 本体（触发器被撑宽列推出），非渲染缺失（census 证实触发器存在）         |
| Carol 行无 ⓘ                         | note 为空 + 默认 `onEmpty: 'hide'`，符合 schema 语义；空值兜底由表 3 onEmpty=show 覆盖 |
| Popover 宽 288px 非 560/480/360 阶梯 | styling-system.md 明文 Popover content-sized by design，阶梯豁免                       |
| 滚动容器内弹层"移位"                 | radix 碰撞检测回退，弹层始终入视口（见 watch-only 第 1 条）                            |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本路径）；
- findings 归族：C2-01 → R2-4 local；C4-01 → R2-3 系统性批（与 R2-1c-C1-01 并案）；E4 族实例 → watch-pool 既有族；B5-01 引用 performance-table 卡（令牌级根因）；
- 批内复检通过后 → `verified`。
