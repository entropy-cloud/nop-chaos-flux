# [card] page:diff-view

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/diff-view` ｜ **载体**: 域页面（diff-renderer demo）
- **矩阵裁剪**: full（波指定重点页：E4 对齐 / B3+B6 语义色 / D3 行高 + 工具栏四控件交互 + dark）

## 1. 截图清单

| 状态                      | light                                                                      | dark                       |
| ------------------------- | -------------------------------------------------------------------------- | -------------------------- |
| 默认 1280（split）        | `_tmp/visual-inspection-2026-09-23/r2-1d/diff-view/default-1280-light.png` | `default-1280-dark.png`    |
| 默认 800×900              | `default-800x900-light.png`                                                | `default-800x900-dark.png` |
| Unified 视图              | `unified-1280-light.png`                                                   | —                          |
| Hunk 折叠态               | `hunk-collapsed-light.png`（"已折叠 13 行"条）                             | —                          |
| Mode 切换后（死控件取证） | `mode-threecol-2.5s.png` / `mode2-1280-light.png` / `mode2-1280-dark.png`  | —                          |
| View Type select 后       | `viewtype-select-unified.png`                                              | —                          |
| Inline Diff off 后        | `inlinediff-unchecked.png`                                                 | —                          |
| 工具栏 dark 特写          | —                                                                          | `toolbar-dark.png`         |

## 2. A–H 勾选

- A: A1✔(行 hover CSS 存在 :hover 变体) A2✔ A3 族确认（Inline Diff/Line Numbers 原生 checkbox 13×13→已知 A3 小目标族，不新立） A7 n/a **A9✖(A-47 四控件静默失效)**
- B: B3✔(add=oklch(96% .03 145) 绿 / del=oklch(96% .03 25) 红 / context 透明，语义正确) B6✔(非默认蓝裸奔) **B5✖(B-48 dark 全页不可读)**
- C: **C1 warn(C-49 页面级 12px 纵向溢出)** C4✔(800 无横向溢出)
- D: **D3✔(全部行高恰 24px，split 50 行/unified 25 行 heightHist={24:all})** 其余✔
- E: **E4✔(gutter x=1/640 两 pane 各自严格对齐；content x=49/688；偏差 0px)**
- F: F1✔(与 diff-perf-scale 同渲染器同表现)
- G n/a ｜ H n/a（无弹层）

## 3. 发现条目

### [R2-1d-A-47] 演示工具栏 4 控件全部静默失效（Mode/View Type/Inline Diff/Line Numbers）

- **页面/路由**: `#/diff-view`（页面自绘工具栏，schema 内联驱动）
- **主题/视口/状态**: light / 1280 / selectOption+checkbox 操作后各等 0.8–2.5s
- **截图**: `viewtype-select-unified.png`（select 已选 Unified、视图仍 split）、`mode-threecol-2.5s.png`（Mode=Three-Column Compare、DOM 无 three-col pane）、`inlinediff-unchecked.png`
- **目视描述**: 任何工具栏控件操作后 diff 渲染面零变化；唯一生效的是渲染器 header 自带的"统一视图/分栏视图"按钮。
- **程序化证据**: 探针=操作前后 DOM 快照；输出=四次操作后 `.nop-diff-view[data-view]` 恒为 "split"、panes=2、lines=50、threeColPane=0；View Type select、Inline Diff checkbox、Mode→three-column（等 2.5s 过 debounce）、Mode→cross-file 全部无效。根因指向 SchemaRenderer 挂载后 schema prop 变更未达已编译渲染树（schema-renderer.tsx `CompiledSchemaTree` useMemo 链；编译器目录未见 cache，传播断点待修排查）。
- **对照基准**: A9（非静默更新/控件必须有效）；同根因跨页证据=flux-basic/event-prevention（R2-1d-A-51）。
- **严重程度**: P1（demo 页主控面板整体失效）
- **用户影响**: 页面宣称的三种模式/两种视图/两个开关全部点不动，功能面=0。
- **修复方向**: 修复 SchemaRenderer 对 schema 变更的重编译/重挂载传播（或 demo 侧用 key={mode} 强制重挂载）；补 e2e：切换四控件各断言一个 DOM 变化。
- **归族**: systemic → R2-3 批（SchemaRenderer 动态 schema 传播）
- **复核状态**: 未复核

### [R2-1d-B-48] dark 模式整页不可读（light-only token + 宿主文字反转）

- **页面/路由**: `#/diff-view`（diff-view.css 全部 651 行 token 无 dark 覆写 + diff-demo.tsx L173/179 `bg-white`/`bg-gray-50` 页面 chrome）
- **主题/视口/状态**: dark / 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/diff-view/default-1280-dark.png`
- **目视描述**: diff 面保持白底，但行文字/工具栏标签/标题已切 dark 前景（浅灰白），白底上白字，正文全部近乎不可见。
- **程序化证据**: 探针=getComputedStyle 抽样；输出=`.nop-diff-line color rgb(230,236,243)`（dark token）叠 `--nop-diff-*` light 底；工具栏 `bg: rgb(255,255,255)` / `oklch(0.985 …)` 恒亮；grep diff-view.css `data-mode|\.dark|prefers-color-scheme` = 0 处。对比度约 1.1–1.3:1。
- **对照基准**: WCAG 1.4.3；B5 dark 平价；R2-4 dark 平价族。
- **严重程度**: P1（dark 下关键信息不可读=页面级失效）
- **用户影响**: dark 主题用户完全无法使用该 demo。
- **修复方向**: diff-view.css 增加 `[data-mode='dark']` token 块（add/del/context/gutter/header 全套暗色值）；diff-demo.tsx 页面 chrome 改语义 surface token。
- **归族**: systemic → R2-4 批（dark 平价；diff-perf-scale 同渲染器同象，不另立）
- **复核状态**: 未复核

### [R2-1d-C-49] 页面级纵向溢出 12px 形成双滚动（P3）

- **页面/路由**: `#/diff-view`（`h-screen flex flex-col` 壳 + 两条工具栏）
- **主题/视口/状态**: light+dark / 1280×800 / 默认
- **截图**: `default-1280-light.png`（右缘可见页面滚动条痕迹）
- **目视描述**: 视口 800 高时内容 812px，页面出现 12px 滚动，与 diff 区自身滚动并存。
- **程序化证据**: 探针=OVERFLOW_SNIPPET；输出=`clipY: h-screen flex flex-col overflow 12`（light/dark 一致）。
- **对照基准**: C1/C5（意外滚动、双滚动条）。
- **严重程度**: P3
- **用户影响**: 轻微滚动噪声。
- **修复方向**: 工具栏改 `shrink-0` 且 diff 区 `flex-1 min-h-0 overflow-auto` 已有，检查壳层高度合计（border 宽度）或用 `h-dvh`。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

## 4. 误报排除 / 通过项存档

- E4/D3/B3/B6 light 全 pass（探针数值见勾选表），波重点三项专项通过。
- 折叠/展开链路：折叠按钮生效（nop-diff-hunk-expanded 0/1，"已折叠 13 行"条出现）；已折叠条点击展开复测时因页面初始为展开态未完成取样，复核补。
- demo 内容将地址串按字符硬切行（"北京市朝阳"+"区"）属演示数据简化，不报。
