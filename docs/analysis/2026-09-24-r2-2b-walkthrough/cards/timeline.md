# [card] control:timeline

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/timeline` ｜ **载体**: lab 页（2 场景：basic vertical left（level: default/success/primary）/ host display modes（left / alternate / reverse / horizontal，C5.2））
- **矩阵裁剪**: simplified（matrixReason：display-only 无 owner state/事件——无交互态/值态；矩阵聚焦节点-轴线对齐（E4）、模式几何、level 语义色（B3/B6）、dark；裁掉：right mode（fixture 未布，与 alternate 共用布局路径）、icon 自定义项（fixture 未布）、glass 皮肤）

## 1. 截图清单

| 状态                                            | light                                                                     | dark（真 data-mode，自采）                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 默认 1280×800（basic left）                     | `_tmp/visual-inspection-2026-09-24/r2-2b/timeline/default-1280-light.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/timeline/default-1280-dark.png` |
| 默认 800×900                                    | `_tmp/visual-inspection-2026-09-24/r2-2b/timeline/default-800-light.png`  | —                                                                        |
| 四模式同屏（left/alternate/reverse/horizontal） | `_tmp/visual-inspection-2026-09-24/r2-2b/timeline/modes-1280-light.png`   | `_tmp/visual-inspection-2026-09-24/r2-2b/timeline/modes-1280-dark.png`   |

## 2. A–H 维度勾选表

- A 交互：A1–A9 n/a（display-only，`smallTargetScan` 无交互元素命中佐证）
- B 颜色：B1 pass（time/title/detail 文本对比正常）B2 n/a B3 pass（level 语义色正确：default=muted-foreground `rgb(72,86,106)`、success=`rgb(16,183,127)`、primary=`rgb(28,110,242)`，dark 侧同语义翻转为亮档 `rgb(175,189,207)/rgb(38,217,157)/rgb(77,141,245)`）B4 pass（`bg-success`/`bg-primary`/`bg-muted-foreground` 令牌）B5 pass（dark 节点/轴线/文本复检无专有缺陷；轴线 dark `rgb(31,42,61)` 语义正确）B6 pass（语义色未裸奔）
- C 布局：C1 pass（1280/800/dark 三轮 docOverX=0；horizontal 模式 `overflow-x: auto` 为有意滚动容器白名单）C2 **fail(R2-2b-E4-157)**（alternate 模式轴线与节点几何断裂，见条目）C3 pass C4 pass（800 窄视口 left 模式正常）C5 n/a C6 n/a
- D 间隔：D1 pass（垂直 item 高 60px 等距；horizontal item 30px+gap 1rem 等距）D2–D8 n/a
- E 排布：E1 pass E2 n/a E3 pass（reverse 模式 DOM 序翻转正确 3→2→1）E4 **fail(R2-2b-E4-157)**（同条目；left/reverse 模式 dot cx=axis cx=314 精确对齐为正向基线）E5–E6 n/a
- F 一致性：F1 pass F2–F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2b-E4-157] alternate 模式几何断裂：中轴悬空无节点，节点/内容被推至容器两外缘，右侧内容贴边右对齐

- **页面/路由**: `#/lab/timeline`（场景 2 host display modes 的 alternate 实例；一切 `mode:'alternate'` 用法同险）
- **主题/视口/状态**: light + dark（真 data-mode）复现 / 1280 / 默认态
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/timeline/modes-1280-light.png`（alternate 段：中线悬空、Alt-A 左缘、Alt-B 右缘贴边）、`modes-1280-dark.png`
- **目视描述**: alternate 模式下一条垂直轴线孤悬在容器水平中点（x≈762）且其上没有任何节点；两个节点的圆点分别贴在容器最左（cx 307）与最右（cx 1213）边缘，Alt-B 的 "10:00 Alt-B" 内容右对齐挤在容器右缘，左中右三套元素互不相连，无法读出"中轴时间线、内容左右交替"的预期结构。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w5-timeline.mjs`（逐 item dot/axis/content rect 采样）
  - 输出: alternate 两 item：dot cx 307 / 1213，item x 均 301、w 918；对照 left 模式 dot cx=axis cx=314 逐点对齐。轴线渲染于容器中线（root 301–1219 中点 760，截图中线段位于 x≈762 y340–420），与任一 dot 均无交叠。行业基准（Ant Design Timeline alternate）：所有节点应落在中轴上，内容向左右两侧交替展开。
- **对照基准**: 检查提示词 E4（元素对齐）/ C2（无意外错位）；Ant Design/Arco Timeline alternate 模式惯例
- **严重程度**: P2（文档化公开 mode 的核心结构失效——模式存在的意义即中轴交替布局；显示型控件不阻断任务故不升 P1）
- **用户影响**: 使用 alternate 模式的时间线呈现为三段漂浮元素，用户无法建立时间与轴的对应关系，模式不可用。
- **修复方向**: `packages/flux-renderers-layout/src/timeline-renderer.tsx` alternate 分支重写布局：容器相对定位 + 单条中轴（left: 50%），每 item `width: 50%` 交替 `padding-right`/`padding-left` + `text-align`，dot 绝对定位于 `left: 50%` 平移居中（对齐 Ant Design 实现骨架），而非依赖逐 item 独立 axis span。
- **归族**: local → R2-4 批（单模式布局重写）
- **复核状态**: 已复核（保留 P2，review-b 2026-09-24）：行级根因补齐 timeline-renderer L321–327 alternate 分支未给 dot 任何中轴定位

## 4. 已知族命中（引用，不另立项）

- 无族命中。left/reverse/horizontal 三模式与 dark 平价为正向基线（dot/轴对齐 0px 偏差、reverse 序翻转正确、horizontal 46px 等距）。

## 交互键登记

- 无注册交互键：display-only 无交互态（closure audit F2 补录 2026-09-24）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-timeline` → carded（卡列填本路径）；findings 归族后 → digested。
