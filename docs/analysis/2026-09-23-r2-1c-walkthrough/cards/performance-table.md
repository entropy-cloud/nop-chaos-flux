# [card] page:performance-table

- **批次**: R2-1c ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/performance-table` ｜ **载体**: 域页面（性能测量 playground：1000 行分页表格 + 10 混合 cell 渲染器 + 场景切换 + 指标面板）
- **矩阵裁剪**: simplified（理由：机制/性能 fixture 页。裁掉项：glass 皮肤抽查（本波统一裁剪）；A6 拖拽（无拖拽面）；A7/H 弹层（无 Dialog/Sheet/Drawer）；A5 loading/empty（数据同步 mock 无异步态，探针 spinner/skeleton=0 证实）；G n/a（非画布页）；sticky 列 C2-02 族本页不适用（探针 sticky 元素=0，affix 表头/粘性列均未启用，实测证实而非假设））

## 1. 截图清单（状态矩阵）

| 状态                            | light                                                                                                | dark                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 默认 1280×800                   | `_tmp/visual-inspection-2026-09-23/r2-1c/performance-table/performance-table-default-wide-light.png` | `…/performance-table-default-wide-dark.png`             |
| 横向滚动到右缘（溢出取证）      | `…/performance-table-scrolled-right-wide-light.png`                                                  | —                                                       |
| 页面中部滚动（表头随滚离场）    | `…/performance-table-scrolled-mid-wide-light.png`                                                    | —                                                       |
| 翻页后（第 2 页 user_51）       | `…/performance-table-page2-wide-light.png`                                                           | —                                                       |
| pageSize=250 顶部               | `…/performance-table-pagesize250-top-light.png`                                                      | —                                                       |
| pageSize=250 滚动中间态         | `…/performance-table-pagesize250-scrolled-mid-light.png`                                             | `…/performance-table-pagesize250-scrolled-mid-dark.png` |
| pageSize=250 底部（分页条）     | `…/performance-table-pagesize250-bottom-light.png`                                                   | —                                                       |
| role badge dark 专拍            | —                                                                                                    | `…/performance-table-badges-zoom-wide-dark.png`         |
| 默认 800×900                    | `…/performance-table-default-narrow-light.png`                                                       | `…/performance-table-default-narrow-dark.png`           |
| Full Stress 场景                | `…/performance-table-fullstress-wide-light.png`                                                      | —                                                       |
| hover/focus/disabled            | 未单独截帧（行 hover 蓝 tint 同 R2-1a 表格族已程序化复验；focus 同族按钮 border+ring 已复验）        | 同左                                                    |
| 弹层打开 / 拖拽进行中 / loading | n/a                                                                                                  | n/a                                                     |

## 2. A–H 维度勾选表

- A 交互：A1 ✔（行 hover 蓝 tint 同族复验） A2 ✔（同族按钮 border+ring） A3 **warn(R2-1c-A3-01 族扩面)**（列宽手柄 4×39.5；全选 checkbox 16×16；icon-xs 触发器豁免） A4 n/a A5 n/a（无异步态） A6 n/a A7 n/a A8 ✔（列宽键盘 ArrowLeft/Right 10px/步可用） A9 n/a（无写操作面）
- B 颜色：B1 ✔（正文 12.6:1；dark 17.65:1） B2 ✔ B3 **fail(R2-1c-B5-01)**（info→secondary 徽章令牌对破损，dark 1.4:1 不可读） B4 ✔（badge 色可溯源 `--secondary` 族令牌——破损在令牌值本身） B5 **fail(R2-1c-B5-01)**（secondary 徽章 dark 不可读；其余 dark 平价通过 17.65:1） B6 ✔（editor=warning 琥珀、admin=success 绿语义正确，无默认蓝裸奔）
- C 布局：C1 **fail(R2-1c-C1-01)**（doc 级 sw=1359/cw=1280，79px 横向溢出可达） C2 ✔（无 sticky 面无重叠；R2-1a-C2-02 族本页不适用） C3 ✔（场景区/指标区/表格区三分清晰） C4 **fail(R2-1c-C1-01 同根因)**（800 视口 sw=1359/cw=800） C5 ✔（无固定元素） C6 n/a（无画布）
- D 间隔：D1 ✔（场景卡/指标卡 gap 24/12 全 4/8 栅格） D2 ✔ D3 **warn(R2-1c-D3-01)**（数据行高 583px 全表一致——tag-list 竖排 15 chips 驱动；Notes 列被压 58px 一字一行；滚动中间态渲染正确） D4 ✔ D5 n/a D6 ✔（分页条 top−table bottom = 12px = `--space-block-gap`；翻页/换页容量数据正确） D7 ✔（无 <4px 贴死） D8 ✔（卡片 p-5/p-6 统一）
- E 排布：E1 ✔（场景选择+指标+表格三问可答） E2 ✔（active 场景 default variant 强于 outline） E3 ✔ E4 n/a（无纯数值列——ID 内嵌于文本） E5 ✔ E6 n/a（无空态）
- F 一致性：F5 ✔（分页条构成/块距与 standard-crud 卡口径一致） F1/F2/F3/F4 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1c-C1-01] 页面 min-content 1333px：1280 视口 doc 级横向溢出 79px（Live Render Metrics 面板切边）

- **页面/路由**: `#/performance-table`（默认 table-only 模式即触发；宿主壳层 `main.grid.place-items-center > section.max-w-[1500px].w-full` 结构）
- **主题/视口/状态**: light+dark / 1280×800 与 800×900 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/performance-table/performance-table-default-wide-light.png`（右缘 Live Render Metrics "Average" 卡被切、介绍段落文本溢出视口）、`…/performance-table-scrolled-right-wide-light.png`（滚右后可见被裁内容）
- **目视描述**: 1280 标准视口首屏右侧被裁 79px，用户需横向滚动才能看到完整指标面板；800 窄视口下同根因放大（sw=1359 vs cw=800，559px 不可见）。
- **程序化证据**:
  - 探针: overflow 链扫描 + `window.scrollTo(300,0)` 可达性 + 最宽叶枚举（`_tmp/r2-1c-probes/performance-table-out.json` / `-out2.json` widestLeaves / `-out3.json` overflow.reachability）
  - 输出: `docScrollW=1359, docClientW=1280, scrollXAfter300=79`（可滚动可达，非 R2-1a-C1-01 的不可达死锁）；`div(theme-root) sw=1359 cw=1280`、`main sw=1359`；host section 实测 1333px（min-content 撑破 `w-full` 1232 应有值）；最宽叶为介绍段落/舞台容器 1253px
- **对照基准**: 检查提示词 C1（无意外溢出）/C4（1280 必查视口）；与 R2-1a-C1-01 同域不同根因（该案 flex item min-width:auto SVG 死锁不可达 P0；本案 min-content 传播仍可滚动 P2）
- **严重程度**: P2（高频入口页首屏信息被裁 + 意外横向滚动；内容可达故不及 P0）
- **用户影响**: 默认窗口打不开完整指标面板；窄视口需大幅横滚；与 R2-1a-C1-01 视觉症状相同但滚动条存在，用户易困惑"页面怎么是歪的"。
- **修复方向**: ① `main` 的 grid item（host section）加 `min-w-0` 打断 min-content 传播；② 表格 stage 容器（`mt-8 p-6 overflow-x-auto`）与分页条左侧 `whitespace-nowrap` 簇允许收缩（`min-w-0`/去 nowrap）；③ 修复后 800 视口 C1 复跑应仅剩表格容器内滚动。
- **归族**: systemic → R2-3 批（grid item min-width:auto 契约；table-popover 800 视口 sw=1024 同根因实例见该卡）
- **复核状态**: 未复核

### [R2-1c-B5-01] `--secondary`/`--secondary-foreground` 令牌对破损：info 徽章 dark 1.4:1 不可读、light 2.9:1 不达标（R2-1a-B5-02 根因改判）

- **页面/路由**: `#/performance-table`（Role Badge 列 viewer 行、Tags 列 chip）；table-popover 弹层内 status badge 同令牌实例（该卡引用）
- **主题/视口/状态**: light+dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/performance-table/performance-table-badges-zoom-wide-dark.png`（右上 viewer chip 近不可读）、`…/table-popover/table-popover-popover-note-open-dark.png`（弹层内 badge 同色值对）
- **目视描述**: dark 下 "viewer" 徽章浅紫底浅蓝字几乎读不出；light 下蓝字紫底可辨但对比不足。
- **程序化证据**:
  - 探针: `.nop-badge` computed 采样 + 全 className + CSS 变量溯源（`performance-table-out3.json` badge.viewerTrace）
  - 输出: badge variant=secondary（`bg-secondary text-secondary-foreground`，badge.tsx info→secondary 映射）；light `color=rgb(10,71,169) bg=rgb(166,137,250)` = **2.9:1**（12px 非大字，<4.5 阈值）；dark `color=rgb(163,194,243) bg=rgb(203,186,252)` = **≈1.4:1**；溯源 `theme-tokens/src/styles.css` classic light `--secondary: 255 92% 76%` / `--secondary-foreground: 217 89% 35%`、classic dark `--secondary: 255 92% 86%` / `--secondary-foreground: 217 89% 84%`（dark 双双提亮导致前景/背景同亮度域）
  - **新证据**: 实测色值对 rgb(203,186,252)/rgb(178,206,251) 与 R2-1a-B5-02 登记的宿主 pills 完全一致——证明该案根因是 theme-tokens 令牌本身而非"宿主 literal 类"，修复面应改判为令牌级
- **对照基准**: WCAG 1.4.3（正文 ≥4.5:1）；检查提示词 B3（语义色一致）/B5（dark 专有缺陷）；R2-1a-B5-02 既有登记
- **严重程度**: P2（dark 不可读级；secondary 徽章为全站通用 variant，跨页系统性）
- **用户影响**: dark 用户无法读 info 类徽章文字；light 用户对比吃力；R2-1a-B5-02 的修复方向（"改用语义令牌"）按本案证据将无效——pills 若本就走令牌则修令牌才能收口。
- **修复方向**: theme-tokens classic dark `--secondary-foreground` 改深色域（如 `217 89% 20%`）或 `--secondary` 改暗底（如 `217 30% 30%` 对齐 glass 案 `--secondary-surface` 做法）；light 对 `--secondary-foreground` 加深至 ≥4.5:1；同步更新 R2-1a-B5-02 裁决引用。
- **归族**: systemic → R2-4 dark 族核心项（终裁 token-level：--secondary 令牌对本征破损，theme-tokens dark 块一处修复；R2-1a-B5-02 族同根因）
- **复核状态**: 未复核

### [R2-1c-D3-01] 数据行高 583px（tag 列竖排 15 chips 驱动）+ Notes 列被压 58px 一字一行

- **页面/路由**: `#/performance-table`（默认 pageSize=50；pageSize=250 同分布）
- **主题/视口/状态**: light+dark / 1280×800 / 默认与滚动中间态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/performance-table/performance-table-scrolled-mid-wide-light.png`（chip 竖排+textarea 竖排一字一行）、`…/performance-table-pagesize250-scrolled-mid-light.png`、`…/performance-table-badges-zoom-wide-dark.png`（dark 同构）
- **目视描述**: 每个数据行 583px 高——Tags 列 15 个 chip 竖排占 560px；Notes textarea 仅 58px 宽，"Row 1 note" 逐字符竖排；行内其余控件顶部对齐后下方大面积空白。
- **程序化证据**:
  - 探针: 行高分布 + 逐 cell 高/宽度归因（`performance-table-out.json` rowInfo / `-out2.json` rowCellHeights、pagesize250.midScroll）
  - 输出: 行高 distinct=[583, 133(expanded)] 一致无随机离群；cell 归因 `tags cell innerH=560 / notes cell w=58 innerH=80`；pageSize=250 滚动中间态 `visibleRows=2, heights=[583], emptyRows=0`（无空态行/无塌陷，虚拟滚动中间态判据通过——本页为分页全挂载非虚拟滚动）；Notes 压缩与 Tags 撑高为同一列宽分配失衡的两面
- **对照基准**: 检查提示词 D3（数据密集面行高密度档、离群行）；demo schema 有意压力设计（10 混合渲染器）为背景豁免考量，但 Notes 一字一行属可读性损伤不在豁免范围
- **严重程度**: P3（机制/性能 fixture 页，非产品路径；行高一致性本身合格）
- **用户影响**: 演示观感失真（一屏不足 2 行），Notes 内容需逐字竖读；对性能测量无阻碍。
- **修复方向**: demo schema 层：tag-list 列限高（如 `max-h` + 展开兜底）或缩减 tags 数量；Notes 列设 `width` 下限（如 160）防挤压；渲染器层不动。
- **归族**: watch-only → 台账（fixture 页 demo schema 取舍；渲染器无缺陷证据）
- **复核状态**: 未复核

### [R2-1c-A3-01] 列宽拖拽手柄 4×39.5、全选/行选择 checkbox 16×16（<24×24）

- **页面/路由**: `#/performance-table`（表头各列；全站带 `nop-table` 且未关 columnResize 的表格同构）
- **主题/视口/状态**: light / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/performance-table/performance-table-default-wide-light.png`（手柄不可见态即问题一面）
- **目视描述**: 列宽手柄默认不可见（w-1 透明），hover 才现 primary/40 底色；checkbox 16px 小目标。
- **程序化证据**:
  - 探针: 可交互元素 min(w,h) 扫描（`performance-table-out.json` smallTargets）
  - 输出: `[data-slot="table-column-resize-handle"] 4×39.5`（role=separator + tabIndex=0 + 键盘步进 10px 可用）；`span[slot=checkbox] 全选 16×16`；icon 触发器 20×20 属 icon-xs 豁免不计
- **对照基准**: WCAG 2.5.8（24×24 目标）与 2.5.7（拖拽单指针替代——键盘替代已在）；R2-1a-A3 族（dashboard 卡已登记"列宽手柄 4×39.5"）
- **严重程度**: P3
- **用户影响**: 精准拖拽列宽困难（4px 命中带）；checkbox 点击容错小。
- **修复方向**: 手柄命中域扩大（视觉 1px + padding 热区 ≥12px，参考 ag-grid 8-12px 命中带）；checkbox 维持 ui size-4 默认可接受，td 已 40px 可考虑整格点击。
- **归族**: systemic → R2-3 批（R2-1a-A3 族扩面实例，与 table-column-width 卡同族合并裁决）
- **复核状态**: 未复核

### watch-only（不立项，记录待观察）

- dark 下 Primary 按钮（Table Only active）白字/亮蓝同 R2-1c-B1-01 族（data-verify 卡实测 3.26:1），本页同构不重复计量。
- 800 视口 intro 段落与场景按钮折行正常，无叠压；C1-01 修复后需复跑窄视口。

## 4. 误报排除记录

| 疑点                                    | 排除理由                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------ |
| 表头 sort 按钮 46×21.2 <24              | 按钮 h 视觉含表头行 padding，热区含 th 相邻区；且 sort 为辅助操作，A3 族已立案不逐实例重复 |
| `input 1×1` 命中                        | opacity-0 native select 覆盖层（ux-skill 登记误报模式）                                    |
| 首屏 "Commits 4 / Max 201.2ms" 数值跳动 | 性能测量页本职功能，非渲染缺陷                                                             |
| 无 sticky 表头                          | schema 未启用 affixHeader，属配置选择非缺陷；C2-02 族判据不适用                            |
| 滚动中间态 3 行可见时两侧空白           | 分页全挂载表格滚动到尾部正常现象，非虚拟化空洞（emptyRows=0）                              |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本路径）；
- findings 归族：C1-01/A3-01 → R2-3（窄视口族/A3 族）；B5-01 → R2-4 dark 族核心项（token-level）；D3-01 → watch 台账；
- 批内复检通过后 → `verified`。
