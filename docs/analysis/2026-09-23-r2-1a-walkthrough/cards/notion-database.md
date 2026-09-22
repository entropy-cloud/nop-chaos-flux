# [card] page:notion-database

- **批次**: R2-1a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/notion-database` ｜ **载体**: complex-page（外部应用复刻 · Notion 多视图数据库）
- **矩阵裁剪**: full（五视图 + peek 双形态 + View settings + 新建记录/列头菜单均程序化覆盖；拖拽为"已接线但非本波视觉焦点"，未做拖帧——卡片明示此裁剪）

## 1. 截图清单

| 状态                              | light                                                                                                      | dark                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 默认 1280×800                     | `_tmp/.../r2-1a/notion-database/notion-database-default-1280x800-light.png`                                | `.../notion-database-default-1280x800-dark.png`（+ 300ms/1800ms 复检图） |
| 行 hover（OPEN 浮现）             | `.../notion-database-row-hover-1280x800-light.png`                                                         | —                                                                        |
| 记录 peek 抽屉（长内容）          | `.../notion-database-peek-1280x800-light.png`                                                              | `.../notion-database-peek-1280x800-dark.png`                             |
| View settings 面板                | `.../notion-database-settings-1280x800-light.png`                                                          | `.../notion-database-settings-1280x800-dark.png`                         |
| 列头菜单 dialog                   | `.../notion-database-col-menu-1280x800-light.png`                                                          | —                                                                        |
| 新建记录 dialog                   | `.../notion-database-new-record-dialog-1280x800-light.png`                                                 | `.../notion-database-new-record-dialog-1280x800-dark.png`                |
| board / gallery / calendar / list | `.../notion-database-board-1280x800-light.png` 等 4 张                                                     | `.../notion-database-board-1280x800-dark.png`                            |
| 800×900                           | `.../notion-database-narrow-table-800x900-light.png`、`.../notion-database-narrow-board-800x900-light.png` | —                                                                        |

探针脚本：`_tmp/r2-1a-probes/notion-interact.mjs` + 后续 REPL 复核（settings/新建 dialog/色值）。

## 2. A–H 勾选

- A 交互：A1 ✓（行 hover OPEN opacity 1）A2 fail(A2-01) A3 warn(A3-04) A4 n/a A5 n/a A6 n/a（拖拽已接线未拖帧，见裁剪说明）A7 ✓（四弹层均有 Esc/关闭钮，焦点回落正常）A8 n/a A9 ✓（五视图切换全部生效，tab 选中态更新）
- B 颜色：B1 fail(B1-03, B1-04) B2 ✓ B3 ✓（分类/状态标签语义色系一致）B4 ✓ B5 fail(B5-03) B6 ✓
- C 布局：C1 ✓（TH `工作量` sw90/cw79 11px 头格溢出、calendar 事件条硬裁切 → P3 记录）C2 ✓ C3 ✓ C4 fail(C4-02) C5 ✓ C6 n/a
- D 间隔：D1 ✓ D2 ✓ D3 ✓（table 视图行高分布 {33:10}，无离群行）D4 ✓ D5 n/a D6 ✓（分页条 gap=12px = --space-block-gap，plan 490 锚点复检通过）D7 ✓ D8 ✓
- E 排布：E1 ✓ E2 ✓（新建蓝主钮 > 工具钮；board 聚合 chip 层级清晰）E3 ✓ E4 ✓ E5 ✓（五视图分组语言统一）E6 ✓
- F 一致性：✓（replica 豁免；横切已查）
- G：n/a
- H 弹层：pass（H1 全部落梯：peek/settings 抽屉 480=sm、新建记录/列头菜单 dialog 560=base；H3/H8 ✓——settings body sh1359/ch762、peek body sh894/ch762 均 body 滚动 header 固定；H4 关闭钮不压标题；H5 新建记录单一主钮左下=Notion 惯例（replica 豁免注记）；H7 header 16/16/0、body 16/24 一致）

## 3. 发现条目

### [R2-1a-B1-03] dark 下表格表头深底配洗白文字，列名不可读

- **页面/路由**: `#/complex-pages/notion-database` table 视图表头
- **主题/视口/状态**: dark / 1280×800 / 默认
- **截图**: `_tmp/.../r2-1a/notion-database/notion-database-dark-1800ms-recheck.png`（300ms 复检同态）
- **目视描述**: 表头变成深藏青横带，"名称/分类/状态/负责人/工量"列名隐约发灰。
- **程序化证据**:
  - 探针: dark 下读 `th` computed bg/color 及最近非透明底祖先
  - 输出: th bg = `rgb(2,8,23)`（dark surface 令牌），th color = `rgba(55,53,47,0.45)`（Notion 字面色 45% 透明）→ 合成对比度 ≈1.2:1（需 ≥4.5:1）
- **对照基准**: WCAG 1.4.3；B5（dark 令牌泄漏到钉亮表面）
- **严重程度**: P2（列名不可读但数据行可读，任务可勉强继续）
- **用户影响**: dark 用户无法识别列语义，需逐行猜字段。
- **修复方向**: 表头行底色在钉白卡面下去掉 `dark:` 变体（锁 light 表头 `rgb(241,241,239)` 档），或列名颜色改用 dark 底配 white/70。
- **归族**: local → R2-4 批（页面级令牌混配；与 B5-03 同族不同表现）
- **复核状态**: 已复核（保留 P2，review-replicas.md #9）

### [R2-1a-B1-04] View settings 面板 dark 下开关标签对比度 1.00:1

- **页面/路由**: `#/complex-pages/notion-database` 工具栏「设置」→ 视图设置抽屉
- **主题/视口/状态**: dark / 1280×800 / 面板打开
- **截图**: `_tmp/.../r2-1a/notion-database/notion-database-settings-1280x800-dark.png`
- **目视描述**: 面板亮底（已知宿主 `--popover` 覆盖），但"名称/状态/负责人/工量"等属性行标签完全隐形，只剩开关和"关"字。
- **程序化证据**:
  - 探针: dark 下打开面板，读面板 bg 与空白文本节点 label color，算 WCAG 对比度
  - 输出: panel bg `rgb(251,250,249)`；label color `rgb(248,250,252)` → **1.00:1**
- **对照基准**: WCAG 1.4.3；简报已知事实（宿主 `:root` 覆盖 `--popover` → dark 弹层亮底，P1 systemic-local 已注册）——本条按简报要求"确认影响面"并实测一个读数，不重复立项，但 dark 前景跟随泄漏的机制值得并入该已知项的修复范围
- **严重程度**: P2（已知根因的新增实测影响面）
- **用户影响**: dark 用户看不到每个开关控制哪个属性。
- **修复方向**: 随已知 `--popover` 覆盖项一并修复：弹层亮底时前景/次级文本同样锁 light 档（宿主覆盖层补 `--foreground`/`--muted-foreground` light 值）。
- **归族**: systemic → R2-3 批（并入已注册宿主 --popover 项）
- **复核状态**: 未复核

### [R2-1a-A2-01] 「设置」入口不是 button，键盘不可达

- **页面/路由**: `#/complex-pages/notion-database` 视图工具栏右侧
- **主题/视口/状态**: light+dark / 1280×800 / 默认
- **截图**: `.../notion-database-settings-1280x800-light.png`（功能可达性以探针为证）
- **目视描述**: "设置"（sliders 图标+文字）外观与相邻按钮一致，但无按钮语义。
- **程序化证据**:
  - 探针: `el.closest('button')` 为 null（是可点击 text 容器）；`getByRole('button', {name:'设置'})` 命中 0 个该元素；直接对 text 元素 `.click()` 可打开面板（功能已接线，仅语义/键盘缺失）
  - 输出: 点击后 `[data-testid^=notion-settings]` 节点出现（面板渲染 ✓）；元素无 tabindex、无 focus-visible 可能
- **对照基准**: WCAG 2.1.1 键盘可达；A2 focus 可达性前置条件；renderer marker 契约（交互元素应为 button/role=button）
- **严重程度**: P2
- **用户影响**: 键盘用户与读屏用户无法打开 View settings（鼠标用户可用）。
- **修复方向**: schema 中该入口由 `container+icon+text` 改为 `button`（或补 `role="button"` + `tabindex=0` + Enter/Space 处理）。
- **归族**: local → R2-4 批
- **复核状态**: 已复核——**驳回**（review-replicas.md #12：当前构建触发器有 role=button+tabindex=0、focus 有环、Enter 实测可开设置面板，键盘链路完整可用；原探针 closest('button') 语义误测，非 button 命中目标漏判）

### [R2-1a-C4-02] 800px 下视图 tab 条被裁切且无滚动提示

- **页面/路由**: `#/complex-pages/notion-database`
- **主题/视口/状态**: light / 800×900 / 默认（table）
- **截图**: `_tmp/.../r2-1a/notion-database/notion-database-narrow-table-800x900-light.png`
- **目视描述**: 左起第一个 tab「全部记录」只剩一个"录"字；「封面墙/排期月历/进行清单」不可见。
- **程序化证据**:
  - 探针: 读 `.nop-tabs.nt-tabs` 与内层 `scrollWidth/clientWidth`
  - 输出: tabs 容器 sw540 / cw368（溢出 172px）；nop-table sw500/cw288（表格列同样被裁，仅剩名称列）；容器 overflow 有滚动但无视觉暗示（滚动条隐藏）
- **对照基准**: C4 视口弹性；C1 有意滚动容器需可发现
- **严重程度**: P2
- **用户影响**: 窄窗口用户不知道还有 4 个视图与多列字段，视图切换功能被隐藏。
- **修复方向**: tabs 条允许横向滚动时加渐隐遮罩/滚动提示（`mask-image` 或 chevron），或 `<640px` 收纳为下拉；表格保持 h-scroll（可接受）但补滚动阴影。
- **归族**: systemic → R2-3 批（复刻页窄视口同根因族）
- **复核状态**: 未复核

### [R2-1a-B5-03] peek/设置面板 dark 下输入控件"灰板"（与 cal-confirm 同根因）

- **页面/路由**: `#/complex-pages/notion-database` 记录 peek（OPEN）与 View settings
- **主题/视口/状态**: dark / 1280×800 / peek 打开
- **截图**: `_tmp/.../r2-1a/notion-database/notion-database-peek-1280x800-dark.png`
- **目视描述**: peek 抽屉亮底（已知 `--popover` 覆盖），"编辑属性"区标题输入框成深灰实心板，与相邻白色 select 形成同屏两种控件底色。
- **程序化证据**:
  - 探针: dark 下 peek 内 input/select computed bg 对比
  - 输出: 标题 input bg 为 dark 变体（与 cal-confirm `oklab(0.285/0.3)` 同族）合成亮底成灰板；select 为亮底 → 同面板控件不一致
- **对照基准**: B5 dark 平价；H6 弹层内控件一致性
- **严重程度**: P2
- **用户影响**: dark 用户在 peek 内编辑时控件观感破损、输入文字可读性差。
- **修复方向**: 同 B1-01 根因批：弹层亮底时内部控件锁 light 档（input 底色、边框、文字一并）。
- **归族**: systemic → R2-3 批
- **复核状态**: 未复核

### [R2-1a-A3-04] OPEN / 列宽手柄 / 属性头目标偏小

- **页面/路由**: `#/complex-pages/notion-database`
- **主题/视口/状态**: light / 1280×800
- **截图**: `.../notion-database-row-hover-1280x800-light.png`
- **目视描述**: 行尾 OPEN 钮、列边界拖拽手柄、peek 属性头行高度均低于 24px 档。
- **程序化证据**:
  - 探针: A3 短边遍历
  - 输出: OPEN `40.8×22`；列宽手柄 `4×39.5`（`cursor-col-resize`，hover 有 `bg-primary/40` 反馈）；`nt-prop-head 21.1px`
- **对照基准**: WCAG 2.5.8（列宽手柄属行业惯例窄热区，酌情豁免）
- **严重程度**: P3
- **用户影响**: 触屏误触；桌面影响有限。
- **修复方向**: OPEN 钮 h 提到 24+；手柄热区加宽至 8-10px（视觉线保持 4px）。
- **归族**: watch-only → 台账
- **复核状态**: 未复核

## 4. 误报排除记录

- A2-01（设置入口键盘不可达）——独立复核驳回：触发器实为 role=button + tabindex=0 且 Enter 可开面板（review-replicas.md #12；closure audit 独立复测第三次确认）。

- **phase1 dark 截图下半区发暗/分页区 dark 化**：复检（fresh goto → dark 300ms 与 1800ms 双拍）均稳定为钉白卡面，phase1 图为主题切换瞬态+前置探针干扰的采样伪影，按误报红线（画布/瞬态以复验判据为准）排除，不作发现。
- **phase1 初跑所有页面落 home**：hash 路由实际为 `#/complex-pages/<id>`（简报 `#/<id>` 为简写），修正后全量重跑，非页面缺陷。
- 五视图切换后 board 顶部 "看板聚合 Count/Percent 随会话刷新（P5b 裁定）…" 等灰字：schema 自带裁定注记（静态复刻文档），非浮动层缺陷。
- calendar 事件条无省略号硬裁切：watch-only P3（Notion 对齐项，不单独立项）。
- board 列间 dark 竖带：并入 B5-03/根因族描述，不单独立项。

## 5. 台账回写提示

ledger.md 本行 status → `carded`；B1-04/B5-03/C4-02 归族 R2-3、B1-03/A2-01 经复核驳回（不入 R2-4） 后 `digested`。

## 6. 弹层注册表扩面素材

- 视图设置抽屉：480px（sm 档）、右侧滑入、触发=工具栏「设置」（非 button，（A2-01 已复核驳回，设置入口键盘可达））、`data-testid=notion-settings-form`。
- 新建记录 dialog：560px（base 档）、主钮「创建」左下、`notion-new-record-trigger`。
- 列头菜单 dialog：560×490、th 点击触发（移动对话框/属性选项/重命名/筛选/排序/隐藏/冻结静态条目）。
- 记录 peek 抽屉：480px、行 hover OPEN / 行点击触发、body 滚动 894/762。
