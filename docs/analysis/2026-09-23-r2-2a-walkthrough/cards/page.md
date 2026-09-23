# [card] control:page

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/page` ｜ **载体**: lab 页（2 场景：title+header+body+footer 全区 / body-only）
- **矩阵裁剪**: simplified（matrixReason：结构类容器——按 styling-system「marker classes only」契约核对 + 槽位排布实测；无弹层（aside sheet 未演示）→ H n/a；无拖拽/异步 → A6/A8/A5 n/a；裁掉 glass、~375 档）
- **runner dark 列作废声明**：runner dark 为 light 渲染（探针坐实：emulateMedia dark 下 `data-mode` 仍 `light`、正文色 rgb(29,49,68)）；dark 证据以 `_tmp/visual-inspection-2026-09-23/r2-2a/page/full-*-dark.png` 为准。

## 1. 截图清单

| 状态          | light                                                                   | dark（自采）                                                             |
| ------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 默认 1280×800 | `_tmp/visual-inspection-2026-09-23/lab-page-default-1280x800-light.png` | `_tmp/visual-inspection-2026-09-23/r2-2a/page/full-1280-dark.png`        |
| 默认 800×900  | `_tmp/visual-inspection-2026-09-23/lab-page-default-800x900-light.png`  | `_tmp/visual-inspection-2026-09-23/r2-2a/page/full-800-dark.png`（自采） |

## 2. A–H 维度勾选表

- A 交互：A1–A9 全 n/a（本页无可交互控件；区域排布为静态面）
- B 颜色：B1 pass（dark 标题/正文/footer 17.66:1）B2 n/a B3 pass（badge success/danger 语义正确）B4 pass（computed 色走令牌）**B5 fail(R2-2a-B5-34)**（runner 假主题，证据基建级，见发现）B6 pass
- C 布局：C1 pass（1280/800 overflow 零命中）C2 pass C3 pass（header/body/footer 分区可辨）C4 pass（800 不塌）C5 n/a C6 n/a
- D 间隔：D1 pass（body 内 section gap 24px）D2 pass D3–D6 n/a **D7 warn(R2-2a-D7-25)**（title↔header 0px、body↔footer 0px 结构间隙）D8 pass（body padding 16px）
- E 排布：**E2 fail(R2-2a-E2-24)**（页标题与正文同字号同字重，层级消失）E1/E3–E6 pass/n-a
- F 一致性：F1–F5 n/a
- G 设计器：n/a
- H 弹层：n/a（mobile aside sheet 本页未演示，fixture 未覆盖，归疑点）

## 3. 发现条目

### [R2-2a-E2-24] page 标题零层级：`<h2>` 16px/400 与正文完全同权重

- **页面/路由**: `#/lab/page`（场景 1 "Team Dashboard"；任何带 title 的 page schema 复现）
- **主题/视口/状态**: 双主题 / 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/lab-page-default-1280x800-light.png`（"Team Dashboard" 与下行正文视觉同重）
- **目视描述**: 页面标题 "Team Dashboard" 与 "Welcome to the team dashboard." 字号字重完全一致，页头没有视觉锚点，首屏三问中"这页是干什么的"失去答案载体。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w2-page-result.json` title 字段
  - 输出: h2 `fontSize:16px fontWeight:400` vs body `.nop-text` `16px/400`，`sameAsBody: true`。根因：`packages/flux-renderers-basic/src/page.tsx` L262 输出裸 `<h2>` 无排版类，Tailwind preflight 将标题归零为继承——渲染契约层缺一行标题排版基线。
- **对照基准**: 检查提示词 E2（标题强于正文）；styling-system.md marker-only 契约的配位要求——layout renderer 的槽位基线应落在 `@layer base` 槽位 CSS（现有 `page-heading` 只定义 flex，无排版）
- **严重程度**: P2（最基础的容器控件层级缺失，全部带标题页面复现）
- **用户影响**: 所有 page schema 页面标题与正文混排，扫读时无法快速定位页面身份。
- **修复方向**: `packages/flux-renderers-basic/src/styles.css` `@layer base` 增加 `.nop-page [data-slot='page-header'] h2 { font-size: var(--nop-text-title, 1.25rem); font-weight: 600; }`（或给 L262 h2 加 `data-slot="page-title"` + 基线类）。
- **归族**: local → R2-4 批（单文件根因，全部 page 使用面受益）
- **复核状态**: 已复核（保留 P2，review-a 2026-09-24）

### [R2-2a-D7-25] page 槽位结构零间隙：标题↔header 槽 0px、body↔footer 0px

- **页面/路由**: `#/lab/page`（场景 1）
- **主题/视口/状态**: light / 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/lab-page-default-1280x800-light.png`（"Team Dashboard" 与 "Acme Corp v2.4.1" 贴行；footer "Last updated" 紧贴 body 区块）
- **目视描述**: 标题行与 header 槽（Acme Corp + badge）上下贴死；footer 文本与 body 底部零结构间隙（仅靠 body 自身 padding 撑开 16px）。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w2-page-result.json` regions 字段
  - 输出: h2 bottom=256 / toolbar top=256（gap 0）；body bottom=502 / footer top=502（gap 0），footerPadding `0px`；对照 headerToBodyGap=24、body sectionGap=24px——page-footer/page-toolbar 槽自身无垂直 padding/gap。
- **对照基准**: 检查提示词 D7（功能异组兄弟块 <4px 进复验，白名单需 design.md 依据——`flux-renderers-basic/src/styles.css` 与 `flux-react/src/default-spacing.css` 均未给 footer/toolbar 定义间距）
- **严重程度**: P3
- **用户影响**: 页面底栏时间戳等内容与正文粘连；header 行与标题拥挤，观感粗糙不阻断任务。
- **修复方向**: `default-spacing.css` 给 `.nop-page > [data-slot='page-toolbar']` 加 `padding-block: var(--space-section-gap-half, 8px)` 或 `margin-top: 8px`；给 `[data-slot='page-footer']` 加 `padding-top: var(--space-section-gap)`（与 body 的 24px section gap 同源令牌）。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-2a-B5-34] capture runner dark 截图为 light 渲染：data-mode 未随 emulateMedia 翻转（证据基建）

- **页面/路由**: 全部 lab 路由（`#/lab/*`）+ runner 覆盖的所有路由
- **主题/视口/状态**: runner dark 档 / 全视口 / 截图产出即失真
- **截图**: 对照样本 `_tmp/visual-inspection-2026-09-23/lab-icon-default-1280x800-dark.png`（实为 light 画面）vs `_tmp/visual-inspection-2026-09-23/r2-2a/icon/full-1280-dark.png`（真 dark）
- **目视描述**: runner 产出的 `*-dark.png` 与 light 完全同画面（主题切换器仍显示 light）。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w2-misc-result.json` fakeDark 字段；`apps/playground/src/theme.ts` L34-40（dark 仅由 `data-mode` 属性驱动、localStorage 初始化，无 matchMedia 同步）
  - 输出: `emulateMedia(colorScheme:'dark')` 后 `dataMode:'light'`、标题色 rgb(29,49,68)（light 墨色）。runner（`scripts/visual-quality/capture-visual-matrix.mjs` L142）只调 emulateMedia，从未 setAttribute `data-mode`。
- **对照基准**: 检查提示词 B5（dark 平价复检）与「环境与入口」明文——脚本切换须先 `document.documentElement.setAttribute('data-mode','dark')`
- **严重程度**: P2（证据基建失效：本波及此前所有 runner dark 档截图不构成 dark 证据，dark 回归检出率为零）
- **用户影响**: 不直接影响终端用户；直接影响质量门禁——dark 缺陷全部漏检。
- **修复方向**: `capture-visual-matrix.mjs` 在 theme 循环内 emulateMedia 之后补 `page.evaluate(m => { document.documentElement.setAttribute('data-mode', m); localStorage.setItem('flux.theme', JSON.stringify({theme:'classic', mode:m})) }, theme)` 并等一帧；历史 R2-1 系列 dark 列证据建议按此口径复验。
- **归族**: systemic → R2-3 批（视觉证据基建，波内全路由复现）
- **复核状态**: 已复核（保留 P2，review-a 2026-09-24）。状态更新：runner data-mode 修复已在工作区（capture-visual-matrix.mjs，plan 496 wave1 后补），HEAD 版确只有 emulateMedia；本卡作废声明对 HEAD 基线成立

## 4. 疑点（不计发现）

- page 的 mobile aside（Sheet）与 breadcrumb/aside 槽 lab 未演示——H2 类走查缺口，建议 fixture 补 `aside` schema。
- 注入的 scope-debug 面板出现在 body 内（footer 之前），使 footer 间距实测含调试面噪声；口径上已按"页面 chrome 注入物"排除。

## 5. 台账回写

- 主 session 统一翻转 `lab-page` → carded。
