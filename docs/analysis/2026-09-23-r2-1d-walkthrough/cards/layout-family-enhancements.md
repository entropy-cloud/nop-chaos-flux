# [card] page:layout-family-enhancements

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/layout-family-enhancements` ｜ **载体**: domain demo 页（`apps/playground/src/pages/layout-family-enhancements-demo.tsx` + `flux-renderers-basic/src/page.tsx` + flex/tabs renderer）
- **矩阵裁剪**: simplified（布局展示页，无弹层无拖拽；执行 light+dark × 1280/800、几何探针验证四个 flex 枚举、aside/body 布局实测、tabs 三态挂载行为、remark tooltip hover；裁掉：glass 皮肤、asideResizable/asideSticky 变体（demo schema 未启用）、page header mobile aside-toggle（isMobile 分支，桌面视口不可达））

## 1. 截图清单

| 状态                | light                                                                                       | dark                       |
| ------------------- | ------------------------------------------------------------------------------------------- | -------------------------- |
| 默认 1280×800       | `_tmp/visual-inspection-2026-09-23/r2-1d/layout-family-enhancements/default-light-1280.png` | `default-dark-1280.png`    |
| 默认 ~800 宽        | `default-light-800.png`                                                                     | `default-dark-800.png`     |
| page aside 区       | `page-aside-light-1280.png`                                                                 | `page-aside-dark-1280.png` |
| tabs 区（切换后）   | `tabs-area-light-1280.png`、`tab-settings-light-1280.png`、`tab-logs-light-1280.png`        | —                          |
| remark tooltip 打开 | `remark-tooltip-light-1280.png`                                                             | —                          |
| hover/focus         | —（tab 按钮 focus 边框转 primary 程序化判定）                                               | —                          |

## 2. A–H 维度勾选表

- A 交互：A1 pass（tab/remark 触发器 hover 变色） A2 pass（tab 按钮 focus 边框转 primary rgb(28,110,242) + 3px ring） A3 **warn（已知 A3 族确认：remark ⓘ 触发器 16×16，见 §3 族注）** A4 n/a A5 n/a A6 n/a A7 n/a（tooltip 属浮层，几何正常） A8 n/a A9 pass（tab 切换 mountOnEnter/unmountOnExit 生效，见族注）
- B 颜色：B1 pass B2 pass B3 pass B4 pass B5 pass（dark 全部令牌适配） B6 pass
- C 布局：C1 pass（800 视口无溢出；tabs 按钮 5px clipY 为内部可见溢出无视觉损伤 FP） C2 pass C3 **fail(C3-30：page aside 不与 body 并排，两栏布局缺失)** C4 pass C5 pass C6 n/a
- D 间隔：D1 **pass（正例：顶层 flex 子块 9 个间隙全部 24px 整）**；D2–D8 pass
- E 排布：E1 pass E2 fail→引用 R2-1d-E2-32（text-icon 卡，h2 标题层级同根因，本页 5 处复证） E3 pass E4 pass（evenly 三点 273.7/274.3px 等距） E5 pass E6 n/a
- F 一致性：F1–F5 pass
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1d-C3-30] page 渲染器 aside region 桌面端不与 body 并排，asidePosition 仅改变堆叠顺序

- **页面/路由**: `#/layout-family-enhancements`（「管理页」asidePosition=left 与「右侧 aside」asidePosition=right 两实例）；凡使用 page aside 的宿主页面同根因
- **主题/视口/状态**: light+dark / 1280 与 800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/layout-family-enhancements/page-aside-light-1280.png`（aside 文本行整宽压在 body 上/下方）、`page-aside-dark-1280.png`、`default-dark-800.png` 同证
- **目视描述**: 「侧边栏 aside（left）」与「主内容区 body」为上下两行整宽文本块，不是左右两栏；asidePosition=right 时 aside 块落到 body 下方——所谓"侧边栏"从未出现在侧边。
- **程序化证据**: 探针几何（嵌套 page 实例，`:scope` 限定）：left 实例 aside {x:147,w:986,y:698} / body {x:147,w:986,y:722}；right 实例 body y=826 / aside y=882；两实例 `stacked:true, sideBySide:false`。根因：`page.tsx` L300–309 aside 与 body 均为 `nop-page` section 的直接子节点、无 row 包裹层；`flux-react/src/default-spacing.css` L6–9 `.nop-page { display:flex; flex-direction:column }`——aside 只能按 source order 纵向堆叠，仓库内亦无任何 CSS 使二者成行。
- **对照基准**: C3 主轴结构（aside 语义 = 侧区域）；`page.tsx` 自带 asideResizable/asideSticky/asideMinWidth 等侧栏能力链路，均以"并排侧栏"为前提；demo schema（特性作者所写）未附加任何布局 className，说明预期默认即为两栏。
- **严重程度**: P1（E3 增强特性在默认配置下渲染结果与语义/预期完全不符，功能不可用）
- **用户影响**: asidePosition left/right 用户唯一可见差异是 aside 块在 body 上方还是下方；侧栏、属性面板类布局无法用 page aside 搭建。
- **修复方向**: page renderer 引入主区包裹层：`<div data-slot="page-main" className="flex flex-1 min-w-0">{asideNode}{body}</div>`（aside 按位置插前/插后），或 default-spacing.css 提供 `.nop-page:has(> [data-slot='page-aside'])` 下 `page-aside { width:var(--aside-w,240px); flex-shrink:0 }` 的行内规则（header/toolbar 仍需通栏，方案一更稳）；补 e2e 断言 aside.x ≠ body.x。
- **归族**: local → R2-4 批（page 渲染器单点缺陷，但属特性级，建议优先排期）
- **复核状态**: 未复核

**族注（记录）**: ①E2 跨页复证：本页 5 处 `tag:h2` 标题同样 16px/400 与正文不可辨，根因/修复方向见 **R2-1d-E2-32**（text-icon-visual-fields 卡），不重复立项。②D1 正例：顶层 flex 列 9 个相邻间隙全部 24.0px（gap-lg 令牌），无非栅格值；嵌套容器（page body → container → flex）间隔亦成体系。③flex 枚举几何全对：row-reverse（A 在最右 x=1025 vs C 970）、space-evenly（273.7/274.3px 等距）、baseline（标题与说明基线同为 454.3）、wrap+alignContent:center（96px 容器内垂直居中）——E3 flex 增强为正例。④tabs 行为验证：初始仅 overview 挂载 → 点设置后 settings 挂载（mountOnEnter=true）→ 离开日志后 logs 卸载（unmountOnExit=true）；badge（5 圆形/new 胶囊）与 icon 渲染完整，25px 触发器 ≥24 合规。⑤已知 A3 族确认：remark ⓘ 触发器 size-4（16×16）< 24px，tooltip 功能正常（打开 176px 内容浮层），并入已知 A3 小目标族。⑥误报排除：overflow 扫描 3 处 tab 按钮 `h-[calc(100%-1px)]` clipY 5px 为 badge 内联溢出且 overflow 可见，截图无裁切。

## 4. 台账回写

- 本卡完成后：ledger.md `layout-family-enhancements` 行 status → `carded`；findings 归族后 → `digested`。
