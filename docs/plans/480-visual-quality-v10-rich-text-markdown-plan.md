# 480 视觉质量 V10：富文本/Markdown 编辑器视觉增强 Plan

> Plan Status: completed
> Last Reviewed: 2026-09-21
> Source: `docs/analysis/visual-quality/V10-rich-text-markdown.md`（独立核实 pass——本 plan 的 Findings/候选/裁决逐项转写自该报告，不重新调研）、`docs/backlog/visual-quality-roadmap.md` V10 行（:29、章节 :100）、证据卡 `docs/audits/visual-quality/rich-text-markdown.md`、owner docs `docs/components/editor/design.md`、`docs/components/markdown-editor/design.md`、`docs/components/flux-renderers-ai/design.md`
> Related: `docs/plans/476-visual-quality-v6-spreadsheet-tokenization-plan.md`（V 系列 scope CSS + dark 双态断言 + closure 流程先例）、`docs/plans/470-visual-quality-v0-baseline-infra-plan.md`（visual-assert helpers 基建）

## Purpose

把路线图 V10 收口为单一 owner plan：按研究报告 §2/§3-A 的显式裁决落地 Tiptap 扩展子集（首批 Underline + Placeholder，零新下载；第二批 Image + Highlight，各 +1 依赖；Table/TextAlign 否决登记），修复两处占位符死面（R3/R4）与 Link 重复装配（R6），markdown autoGrow（A3），三面工具条一致性收敛（A5/R5/R7），三面内容排版 scope CSS（A6/R1/R2，不引 @tailwindcss/typography），e2e 三面计算样式断言补齐（A7），owner docs 与证据卡勘误回写（A8）。

## Current Baseline

> 行号为 2026-09-21 live 核对（研究报告已独立核实 pass；个别 ±1 行系文件尾行计数）。

- **三面定位**（勘误③后口径：三处富文本编辑面、两处 Tiptap）：form editor = `packages/flux-renderers-form-advanced/src/editor-renderer.tsx`、`editor-schemas.ts`（toolbar union 扩展）、`packages/flux-i18n/src/locales/{en-US,zh-CN}.ts`（editor 键）（474 行）+ `editor-schemas.ts`；ai tiptap-sender = `packages/flux-renderers-ai/src/rich-text/`（`tiptap-sender.tsx`、`components/tiptap-sender-surface.tsx`、`components/template-bar.tsx`）；markdown-editor = `packages/flux-renderers-form/src/renderers/markdown-editor-renderer.tsx`（313 行，**非 Tiptap**：Textarea + 运行时 registry 组合预览）。
- **F1 扩展集**：form editor = StarterKit（v3.27.1 内建 Underline/Link；`editor-renderer.tsx:235`）+ 显式 `Link.configure({protocols, validate, openOnClick:false, autolink:false})`（:236-241）——与 StarterKit 内建 Link 同名重复装配，运行期 dedupe 警告（R6）。ai sender = StarterKit（`tiptap-sender.tsx:147`）+ 自建 `aiSenderSubmitKeymap`（:152-153，priority 1000）+ 宿主 `options.extraExtensions`（:212）。
- **Placeholder 基建**：`@tiptap/extensions@3.27.1` 已作为 starter-kit 传递依赖在依赖树且导出 `Placeholder`，零新下载；直接 import 前须在 `flux-renderers-form-advanced` 与 `flux-renderers-ai` 两包 manifest 显式声明（pnpm 严格传递依赖）。
- **R3 死面**：editor 占位符只写 `data-placeholder` 手写属性（`editor-renderer.tsx:276`），无 Placeholder 扩展、无任何 CSS 消费（全仓 `[data-slot='editor-content']` 规则零命中）→ 占位符实际不可见。
- **R4 死面**：ai `src/styles.css:156-160` `[data-slot='ai-sender-tiptap-content'][data-placeholder]:empty::before` 疑似死规则——ProseMirror 内容根恒有 `<p>` 子节点，`:empty` 不命中 → 占位符实际不可见（先红后绿实测裁决）。
- **F2/A2**：12/12 工具条按钮已有 lucide 图标（`editor-renderer.tsx:140-153` TOOLBAR_ICONS；渲染端 :433 有图标即渲染图标），plan-0718（f053fdf68）已落地——本 plan 只剩 R7 死 label 清理与图标渲染断言，不再做图标化。
- **R7 死 fallback label**：`TOOLBAR_BUTTONS` 文本 label `'B'`（:47）、`'I'`（:56）、`'S'`（:63）、`'""'`（:103）、`'🔗'`（:110）在图标全覆盖下永不渲染，且 emoji/引号与图标体系不一致。
- **F3**：markdown 固定 `rows={8}`（:269）无 autoGrow（全文件无高度自适应逻辑）；`@nop-chaos/ui` Textarea 为 `min-h-16` 固定样式组件无 auto-resize；滚动同步零落地（owner doc `markdown-editor/design.md` §6 :44 列为方案项）；预览容器是滚动所有者（`.nop-markdown-editor-preview … overflow-auto` :291）；分屏仅 ≥768px 桌面生效（:258 `md:grid-cols-2` + `useIsMobile` 折叠）。
- **F4 工具条差距矩阵**：
  - form editor：`ghost` + `h-7 min-w-7 px-1.5`（:412-413、:426-430）、图标 size-3.5、`role="toolbar"`（:399）无 roving tabindex、`aria-pressed`+`data-active` 激活态（:416-418、:428）、onPointerDown+onMouseDown 防焦点抢占（:424-425）。
  - ai template-bar：`ghost` + `h-6 text-xs`（template-bar.tsx :29、:34）、模板 label 文本键、`role="toolbar"`（:22）无 roving、onMouseDown preventDefault（:32）。
  - markdown 工具条：`outline` + `size-8 p-0`（:239、:244）、图标 size-4（:65-80）、无 role（20-07 Decision 显式移除；守卫测试 `packages/flux-renderers-form/src/__tests__/markdown-editor-toolbar-a11y.test.tsx:49-51`）、分组分隔 `h-4 w-px bg-border`（:234）、无激活态（Textarea 语义）。
- **F5 e2e 空白**：`w3d-editor.spec.ts`（3 test）、`w3d-markdown-editor.spec.ts`（2）、`ai-rich-text-sender.spec.ts`（5）合计 0 计算样式断言/0 截图；可复用 `tests/e2e/helpers/visual-assert.ts`（`getComputedStyleValue` :15、`expectComputedStyle` :22、`expectCssVarResolves` :37、`captureVisualEvidence` :81）与 `theme-switcher.spec.ts:40-54` light↔dark 翻转先例；路由 `#/w3d-advanced-input-family`（App.tsx :301）、`#/ai-rich-text`（:383，:117-120 懒加载主包零 Tiptap）已存在。
- **R2 排版空白**：`.nop-editor-content` / `.nop-ai-sender-tiptap-content` / `.nop-markdown` 全仓零排版 CSS；`prose max-w-none` 死类（`editor-renderer.tsx:268`、`tiptap-sender.tsx:219`；仓库未安装 @tailwindcss/typography，ai styles.css :174 注释自证）→ 三面内容 h1/ul/blockquote/code/table 全靠 UA 默认。先例：ai-bubble 自建 `[data-slot='ai-bubble-markdown']` scope CSS（ai styles.css :177-242，令牌驱动 + 双 dark 触发）+ 元素矩阵守卫测试（`markdown-content.test.tsx:279-331` 读 src/styles.css 断言）。
- **CSS 载体现状**：ai 包 `src/styles.css` 已挂 playground `@import` 链（`apps/playground/src/styles.css:10`）与包 exports；form 包 `form-renderers.css` 链已完整（exports `./form-renderers.css`、`src/index.tsx:1` side-effect import、`flux-bundle/src/style.css:2`）但零 editor/markdown-editor 规则；form-advanced **无任何包级 CSS**（package.json 无 css exports）。
- **R8 超限预警**：`editor-renderer.tsx` 474 行，逼近 `check:oversized-code-files` WARN*LINES=500（`scripts/check-oversized-code-files.mjs:11`）——加工具条按钮前必须先拆 `TOOLBAR*\*` 配置（硬约束）。
- **dark 现状**：三面 chrome 全 token 语义类、零硬编码浅色 hex（editor `border-input/bg-background/bg-accent`；markdown `border-border/bg-muted/30` :291；sender surface `border-input bg-background`）；dark 触发器统一属 V1 横切，本域不处理。
- **证据卡失实项**（勘误①②③，须回写）：V10-F2「未图标化」已失实；V10-F1「无 Underline」不成立（StarterKit 内建）；V10-F4「三处 Tiptap」措辞不准。

## Goals

- **首批扩展**（零新下载）：editor 增 Underline 工具条按钮（能力已在：StarterKit 内建 + Mod-u，只缺 UI 入口）；两处 Tiptap 面装配 Placeholder 扩展并修复 R3/R4 死面（editor 手写 `data-placeholder` 委托扩展；ai `:empty` 死规则删除，先红后绿实测裁决）。
- **R6 去重**：editor 改 `StarterKit.configure({ link: {...} })` v3 子配置透传，移除显式 `Link.configure`；`javascript:` 拒绝红线（`editor-link.test.tsx`）原样通过。
- **R8 硬约束先行**：`TOOLBAR_*` 配置拆出 `editor-renderer.tsx` 至独立模块，回落 <500 行后再增按钮。
- **第二批扩展**（各 +1 依赖 `@tiptap/extension-image/highlight@^3.27.1`）：Image 走 URL prompt（复用 link 交互先例 `editor-renderer.tsx:113-123` + src scheme 守卫扩展 `data:image` 判定；上传通道否决）；Highlight 一键；sanitize round-trip 白名单断言（`<u>/<mark>/<img>`）；form-advanced 首次新增包级 CSS（img max-width 兜底）并登记 exports + playground @import 链。
- **A5 工具条一致性**：三面统一 Button 规格 + R5 角色对齐（沿 20-07 决策移除 editor/template-bar 的 `role="toolbar"`，不做 roving）+ R7 死 label 清理。
- **A3 autoGrow**：markdown 渲染器内 JS 自适应（input 时 height=scrollHeight 夹紧 min/max），`rows=8` 保持初始/最小高度语义。
- **A6 排版**：R1 死类移除；三面内容排版最小矩阵 scope CSS（h1-h3/ul/ol/blockquote/code/a/img，令牌驱动 + 双 dark 触发，沿 ai-bubble-markdown 先例），不引 @tailwindcss/typography。
- **A7 e2e**：三 spec 补计算样式断言（工具条规格/激活态 token/占位符可见性/autoGrow 几何/dark 双态），三面零回归。
- **A8 docs**：两份 editor/markdown-editor design.md + `flux-renderers-ai/design.md` + 证据卡勘误回写 + roadmap 措辞勘误 + daily log。

## Non-Goals

- Table/TextAlign 扩展（研究报告 §2 否决，登记 Deferred But Adjudicated）；图片上传/宿主上传协议（无协议面）；协同编辑（普查 §10 排除维持）；roving tabindex 实现（A5 只做角色对齐）；@tailwindcss/typography 引入（A6 走 scope CSS 先例）；word-editor（V8b 域）/code-editor（V9 域）；运行时主题切换与 dark 触发器统一（V1 横切）；ai sender Link `openOnClick` 收敛（R9 watch-only，见 Follow-ups）。

## Scope

### In Scope

- `packages/flux-renderers-form-advanced/src/`：`editor-renderer.tsx`（StarterKit link 透传、Placeholder、Underline/Image/Highlight 按钮、role 移除、prose 死类）、新增工具条配置模块（R8 拆分）、新增包级 `styles.css`（img 兜底 + `.nop-editor-content` 排版）、`package.json`（依赖 + css exports）、对应 `__tests__/`（`editor-link.test.tsx`、`editor-renderer.test.tsx` 及新增守卫）。
- `packages/flux-renderers-ai/src/rich-text/`：`tiptap-sender.tsx`（Placeholder、role 移除、prose 死类）、`components/template-bar.tsx`（规格收敛、role 移除）、`src/styles.css`（`:empty` 死规则删除 + `.nop-ai-sender-tiptap-content` 排版）、`package.json`（显式声明 `@tiptap/extensions`）、单测。
- `packages/flux-renderers-form/src/`：`renderers/markdown-editor-renderer.tsx`（autoGrow、工具条规格收敛）、`form-renderers.css`（`.nop-markdown` 排版）、`__tests__/`（含 toolbar-a11y 守卫同步修订）。
- `packages/flux-renderers-content/src/sanitize.test.ts`：`<u>/<mark>/<img>` 白名单断言扩展（门禁本体不动）。
- e2e：`tests/e2e/w3d-editor.spec.ts`、`w3d-markdown-editor.spec.ts`、`ai-rich-text-sender.spec.ts` 计算样式断言扩展。
- owner docs：`docs/components/editor/design.md`、`docs/components/markdown-editor/design.md`、`docs/components/flux-renderers-ai/design.md`、证据卡 `docs/audits/visual-quality/rich-text-markdown.md`、`docs/backlog/visual-quality-roadmap.md`、daily log。

### Out Of Scope

- `flux-core`/`flux-runtime`/`ui` 包变更（ui Textarea 保持现状，autoGrow 在渲染器层做）；`sanitizeHtml` 门禁本体与 `sanitize:false` 逃生口（不开放给 editor 路径）；flux-bundle 主包 Tiptap 隔离边界（懒加载不动）；宿主上传协议；markdown-editor 滚动同步（Deferred But Adjudicated）。

## Failure Paths

| 场景                     | 触发                                                | 行为                                                                                                                              | 可重试 | 用户可见表现                           |
| ------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------- |
| placeholder-invisible    | ProseMirror 内容根恒有 `<p>`，`:empty` 不命中       | R4 先红断言实证占位符不可见 → Placeholder 扩展落地后可见、删旧规则；若实测 `:empty` 偶然命中则改判勘误、仅做收敛（plan 内记录）   | 是     | 空内容无占位提示（现状）/ 有（修复后） |
| link-dedupe-drift        | StarterKit link 子配置与原显式 configure 语义差异   | `editor-link.test.tsx` 全量原样通过为门禁；`javascript:` 拒绝红线不降，失败即回退为移除 StarterKit link、单保留一份显式 configure | 否     | CI 红                                  |
| image-unsafe-src         | Image URL prompt 输入 `javascript:` 等不安全 scheme | src 守卫拒绝，不插入节点（复用 `isSafeLinkUrl` 模式 + `data:image` 判定）                                                         | 是     | 无变化，可重新输入                     |
| sanitize-escape          | `<u>/<mark>/<img>` round-trip 经 DOMPurify          | 白名单断言：标签保留、`onerror` 剥离；不放开 `sanitize:false` 逃生口                                                              | 否     | CI 红                                  |
| autogrow-overflow        | 超长内容输入                                        | 高度夹紧 max 后内部滚动，不无限撑高、不破坏分屏布局                                                                               | 是     | 编辑区内部滚动                         |
| css-carrier-unregistered | form-advanced styles.css 未登记 exports/@import     | `check:package-css-exports` 红；样式不加载 → 必须同 PR 挂 playground @import 链并核对 flux-bundle 链                              | 否     | CI 红 / 样式缺失                       |

## Test Strategy

档位选择：**必须自动化**——占位符死面是 live defect（R4 先红后绿）；扩展落地为既有 sanitize 属性补契约 pin（门禁本体不变）（白名单断言）；工具条一致性与排版是样式契约（守卫单测 + e2e 计算样式断言）；autoGrow 是用户可感知几何行为（e2e 几何断言）。各 Phase 内 Proof 项先于对应 Fix。

## Execution Plan

### Phase 1 - 首批扩展：Underline + Placeholder + 死面修复 + Link 去重

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/`（editor-renderer.tsx、新工具条配置模块、package.json）、`packages/flux-renderers-ai/src/rich-text/`（tiptap-sender.tsx、package.json）、`src/styles.css`（ai）、`flux-renderers-content/src/sanitize.test.ts`

- Item Types: `Fix | Proof`

- [x] Fix：R8 硬约束先行——`TOOLBAR_BUTTONS`/`TOOLBAR_ICONS`/`toolbarButtonTitle`（:44-183）拆至独立模块（如 `editor-toolbar-config.ts`），`editor-renderer.tsx` 回落 <500 行后才进入按钮添加项
- [x] Proof：R4 先红——新增 ai sender 占位符可见性断言（现状：空内容占位符不可见，实证 `:empty` 死规则）；同口径为 editor 补现状断言（R3 死面）
- [x] Proof：`sanitize.test.ts` 先红——`<u>` 白名单 round-trip 断言（标签保留）
- [x] Fix：R6——`StarterKit.configure({ link: { protocols, validate: isSafeLinkUrl, openOnClick: false, autolink: false } })` 透传（v3 子配置），删除显式 `Link.configure`（:236-241）；运行期同名 dedupe 警告消除
- [x] Fix：Underline 工具条按钮（1 键 + TOOLBAR_ICONS 一行 + i18n 静态键，沿 `toolbarButtonTitle` :156-183 模式，`check:i18n-keys` 可验证）；Placeholder 两面装配（`@tiptap/extensions` 双包 manifest 显式声明 + 空态 `::before` CSS，令牌驱动），editor 手写 `data-placeholder`（:276）委托扩展
- [x] Fix：R3/R4 收尾——两面占位符可见；ai `:empty` 死规则（styles.css :156-160）删除；若先红实测证明 `:empty` 偶然命中，改判勘误仅做收敛并在 plan 内记录

Exit Criteria:

- [x] `editor-renderer.tsx` <500 行（拆分后含新按钮）；`check:oversized-code-files` 无本包新命中
- [x] 先红后绿有记录：两面占位符可见断言绿、`<u>` sanitize 断言绿、`editor-link.test.tsx` 全量原样通过（`javascript:` 拒绝红线未降）
- [x] form-advanced 与 ai 包 focused 单测 + 局部 typecheck 绿；两包既有单测零回归

### Phase 2 - 三面工具条一致性收敛（A5/R5/R7）

Status: completed
Targets: `editor-toolbar-config.ts`、`editor-renderer.tsx`、`markdown-editor-renderer.tsx`、`template-bar.tsx`、三包 `__tests__/`

- Item Types: `Decision | Fix`

- [x] Decision：统一规格裁决（研究报告 A5 二选一授权，plan 定一版、不双改）——**取 editor 侧基线 `ghost` + `h-7 min-w-7 px-1.5` + 图标统一 `size-4`**，不取 `ghost + size-8 p-0`：template-bar 是文本 label 键（`h-6 text-xs`），`p-0` 方形图标规格不适配文本键；editor 基线的 `min-w-7 px-1.5` 对图标/文本键双兼容；改面最小（markdown 仅 `outline→ghost` + 尺寸对齐，template-bar 仅高度对齐，editor 仅图标 3.5→4）。`aria-pressed` 激活态仅 editor 有（Tiptap 激活态语义），不强加于无状态面
- [x] Fix：markdown 工具条 `outline→ghost`（:239）+ `size-8 p-0→h-7 min-w-7 px-1.5`（:244）；template-bar `h-6→h-7`（:34，文本键保留 `text-xs` 字号）；editor 图标 `size-3.5→size-4`（:433）
- [x] Fix：R5——移除 editor `role="toolbar"`（:399）与 template-bar `role="toolbar"`（template-bar.tsx :22），沿 20-07 决策（APG toolbar 须 roving tabindex，否则结构失配；不做 roving 实现）
- [x] Fix：R7——死 fallback label 全删：`'B'`/`'I'`/`'S'`/`'""'`/`'🔗'`（:47、:56、:63、:103、:110；12/12 图标覆盖下永不渲染，纯字母 fallback 一并删——裁决：label 域随之移除，渲染端 `{Icon ? <Icon/> : config.label}` 退化为直渲染 `<Icon/>`）
- [x] Proof：守卫测试——沿 `markdown-editor-toolbar-a11y.test.tsx:49-51` 模式为 editor/template-bar 新增「无 `role="toolbar"`」守卫；新增三面工具条规格一致性守卫（读 src 断言 variant/几何类/图标类一致，沿 `markdown-content.test.tsx` 读 src 模式）

Exit Criteria:

- [x] 三面 Button variant=`ghost`、几何类一致、图标统一 size-4（守卫测试绿）；三面均无 `role="toolbar"`（守卫绿）
- [x] `markdown-editor-toolbar-a11y.test.tsx` 同步修订后绿；form/form-advanced/ai 包既有单测零回归

### Phase 3 - 第二批扩展：Image + Highlight + 包级 CSS 载体

Status: completed
Targets: `packages/flux-renderers-form-advanced/`（package.json、工具条配置模块、editor-renderer.tsx、新 `src/styles.css`）、`flux-renderers-content/src/sanitize.test.ts`、`apps/playground/src/styles.css`

- Item Types: `Fix | Proof`

- [x] Proof：先红——`<mark>/<img>` sanitize round-trip 白名单断言（`onerror` 剥离、标签保留）；schema 拒绝断言（落地前编辑器丢弃 img/mark 输入，落地后通过）；Image src 守卫单测（`javascript:` 拒绝、`data:image`/http(s) 放行判定）
- [x] Fix：`@tiptap/extension-image@^3.27.1` + `@tiptap/extension-highlight@^3.27.1` 显式声明并装配（执行偏差：`^3.27.1` 解析到 3.31.3 且 unmet peer，已改精确 pin `3.27.1` 保 peer 树一致——closure audit MINOR-1 补注） + 工具条按钮（Image 走 URL prompt，复用 link 交互先例 `editor-renderer.tsx:113-123` 模式 + src 守卫；Highlight 一键 + i18n 静态键）；上传通道不做
- [x] Fix：form-advanced 首次新增包级 `src/styles.css`（img max-width 兜底）+ `package.json` exports `"./styles.css"` + playground `styles.css` `@import` 挂链（沿 ai styles.css :10 先例）；核对 flux-bundle 链登记（`check:flux-bundle-pack` 门禁）

Exit Criteria:

- [x] sanitize `<mark>/<img>` 白名单断言绿（先红后绿有记录）；Image src 守卫单测绿
- [x] `check:package-css-exports` 绿；editor 内容 img 超宽有 max-width 兜底（单测或 e2e 抽查）；form-advanced 既有单测零回归

### Phase 4 - autoGrow + 三面排版 scope CSS + e2e 断言 + docs 回写

Status: completed
Targets: `markdown-editor-renderer.tsx`、三面 CSS 载体、三 spec、owner docs、证据卡、roadmap、daily log

- Item Types: `Proof | Fix`

- [x] Fix：A3 autoGrow——`markdown-editor-renderer.tsx` 渲染器内 JS 自适应（input 时 `height=scrollHeight` 夹紧 min/max，沿 `pendingSelection` effect 先例 :190-201 模式）；`rows={8}` 保持初始/最小高度语义；`field-sizing-content` 登记为备选（Safari 支持缺口，本 plan 不取，见 Follow-ups）
- [x] Fix：R1——`prose max-w-none` 死类移除（`editor-renderer.tsx:268`、`tiptap-sender.tsx:219`），排版由 scope CSS 承接
- [x] Fix：A6——三面内容排版最小矩阵 scope CSS：`.nop-editor-content`（form-advanced styles.css，Phase 3 载体扩展）+ `.nop-ai-sender-tiptap-content`（ai styles.css）+ `.nop-markdown`（form 包 `form-renderers.css`，链已登记）；令牌驱动 + 双 dark 触发，沿 `[data-slot='ai-bubble-markdown']` 先例（ai styles.css :177-242）；覆盖 h1-h3/ul/ol/blockquote/code/a/img；不引 @tailwindcss/typography
- [x] Proof：元素矩阵守卫测试三面覆盖（读 src/styles.css 断言排版规则存在，沿 `markdown-content.test.tsx:279-331` 模式）
- [x] Proof：A7 e2e——三 spec 补计算样式断言：工具条按钮几何/variant、editor 激活态 `bg-accent` token、两面占位符可见、autoGrow 高度单调增 + max 夹紧、light↔dark 翻转（`visual-assert.ts` helpers + theme-switcher 先例 data-mode 切换）；`w3d-editor`（3）/`w3d-markdown-editor`（2）/`ai-rich-text-sender`（5）/`composite-editor-handles`/`flux-bundle-built-dist` editor 路径零回归
- [x] Fix：A8 owner docs——`editor/design.md` §12/§W3d 记录子集裁决（Table/TextAlign 否决理由 + Image/Highlight 落地）；`markdown-editor/design.md` §6 滚动同步改述 adjudicated-deferred + autoGrow 行为补记；`flux-renderers-ai/design.md` tiptap-sender 段（Placeholder/内容排版）；证据卡 F1/F2/F4 勘误回写 + 裁决落卡；roadmap V10 行「三处 Tiptap」措辞勘误 + 状态更新；daily log

Exit Criteria:

- [x] autoGrow e2e 几何断言绿（输入前后高度单调增、受 max 夹紧；`rows=8` 初始）
- [x] 三面排版矩阵守卫测试绿；`prose` 死类全仓零残留（grep 可验）
- [x] e2e 三 spec 计算样式断言绿且既有用例零回归；owner docs 与 live 一致、证据卡无 pending 裁决残留

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent（fresh session）填写。

- Reviewer / Agent: 独立子 agent（fresh session，2026-09-21，retroactive plan review）
- Verdict: `pass-with-minors`（0 Blocker / 0 Major / 6 Minor，全部不阻塞留档）
- Rounds: 1（回溯补录轮）
- Findings addressed:
  - 流程注记（回溯补录）：本 plan 在 Draft Review Record 空置、plan-level 状态预标 `active` 的情况下已先行执行四个 Phase，违反 guide「draft 经独立审查后方可 active/执行」的次序；本记录为执行后补做的独立 draft review（对照 guide §Plan Review Rule 四项 + live repo HEAD 33135a45a 逐条核对），不重新验证执行本身（closure audit 另行进行）。
  - 四项检查结论：可想象性通过（四 Phase 全部可对照 HEAD 代码走通：StarterKit v3 内建 Underline/Link、`@tiptap/extensions` 导出 Placeholder、三面 CSS 载体与 check 门禁均实证存在）；格式完整性通过（模板必填字段齐全）；内容稳健性通过（无 in-scope live defect 降级，R9 watch-only 理由经 getText() 实证成立）；引用准确性基本通过（约 35 处引用 30+ 精确命中，4 处行号错误 + 1 处行数误挂，均为 Minor）。
  - Minor①：Current Baseline「三面定位」条目「（474 行）」误挂到 flux-i18n locales（实际 1547/1550 行；474 属 editor-renderer.tsx），同条目「+ editor-schemas.ts」重复——书写错误，不影响设计。
  - Minor②：R7 死 label 行号 `'I'`(:56)/`'S'`(:63) 实际为 :54/:61（±2），其余 :47/:103/:110 准确。
  - Minor③：App.tsx 路由行号有误——w3d-advanced-input-family 实际 :384（非 :301）、ai-rich-text case 实际 :118/懒加载定义 :303-305（非 :383）；路由存在与主包零 Tiptap 隔离的实质结论均成立。
  - Minor④：roadmap「章节 :100」实际 V10 节在 :102（:100 为 V9 详情行）；V10 行 :29 准确。
  - Minor⑤：In Scope 未枚举 `packages/flux-i18n/src/locales/`，但 Phase 1/3 的 i18n 静态键与 `check:i18n-keys` 门禁隐含其必改——枚举遗漏，非设计缺口。

## Closure Gates

- [x] 全部 in-scope 交付落地（Phase 1–4 Exit Criteria 全勾）
- [x] in-scope confirmed live defects 已修复：R3 editor 占位符死面、R4 ai `:empty` 死规则、R6 Link 重复装配、R7 死 fallback label、R8 超限预警回落
- [x] in-scope contract drifts 已收敛：三面工具条角色矛盾（R5）、规格漂移（A5）、三面内容排版空白（R2）、prose 死类（R1）
- [x] 行为/契约结果已达成：首批（Underline/Placeholder）与第二批（Image/Highlight）在两处 Tiptap 面可用且 sanitize round-trip 安全；autoGrow 生效；Table/TextAlign 否决显式落卡
- [x] 必要 focused verification 已完成：先红后绿单测、role 移除守卫、规格一致性守卫、元素矩阵守卫、e2e 计算样式断言
- [x] e2e 红线零回归：`w3d-editor`（3）、`w3d-markdown-editor`（2）、`ai-rich-text-sender`（5）、`composite-editor-handles`、`flux-bundle-built-dist` editor 路径；ui 包 textarea 与 `markdown-editor*` 单测（含 toolbar-a11y 守卫）零回归或同步修订
- [x] 硬约束未破：`sanitizeHtml` 门禁不动（`flux-renderers-content/src/sanitize.ts:41-44`，逃生口不开放）、`isSafeLinkUrl` 红线测试原样通过、i18n 静态键纪律（`check:i18n-keys`）、`@tiptap/extensions` 与新扩展 manifest 显式声明、新增包级 CSS 过 `check:package-css-exports` 并挂 playground @import 链、`editor-renderer.tsx` <500 行
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响 owner docs 已同步：`editor/design.md`、`markdown-editor/design.md`、`flux-renderers-ai/design.md`、证据卡 `rich-text-markdown.md`、roadmap、daily log
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（零新增命中：关注 `check:package-css-exports`、`check:i18n-keys`、`check:oversized-code-files`、`check:flux-bundle-pack`、`check:audit-ui-consistency-gaps` 豁免不增）

## Deferred But Adjudicated

### Table WYSIWYG 编辑扩展

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 研究报告 §2 否决——UI 面成本不成比例（插入 + 行/列操作按钮组 ≥4-6 键 + 内容表格 CSS，工具条体量翻倍且叠加 R8 超限）；`editor/design.md` §W3d :79 显式把表格编辑归 successor 渐进引入，无提前介入的契约基础；表格式内容已由 markdown-editor 工具条 table 键（:80）覆盖，仓库内零 WYSIWYG 表格需求证据
- Successor Required: `no`（真实需求出现时按 design.md §W3d successor 路径立项）
- Successor Path: —

### TextAlign 扩展

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 研究报告 §2 否决——以 inline `style="text-align"` 落盘与 styling contract（视觉 schema/token 驱动）方向冲突，落盘即成豁免池新债；表单字段级段落对齐需求仓库内零证据；DOMPurify style 属性 round-trip 语义未实测、纯增风险
- Successor Required: `no`
- Successor Path: —

### 编辑/预览滚动同步（研究 A4/R10）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 收益面仅 ≥768px 桌面分屏（`useIsMobile` 折叠 :255-260）；预览容器可同步（overflow-auto :291）但仓库内零需求证据、零反馈记录；`markdown-editor/design.md` §6 已在 A8 改述为 adjudicated-deferred
- Successor Required: `no`
- Successor Path: —（触发条件：真实使用反馈或 W3d 分屏使用量证据出现再立项）

### 协同编辑

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 普查 §10 显式排除、不纳入路线图（editor 域边界引 `editor/design.md` :79）；无契约基础
- Successor Required: `no`
- Successor Path: —

## Non-Blocking Follow-ups

- R9：ai sender 内容内 Link `openOnClick` 默认 true——watch-only：sender 输出为 `getText()`，链接不持久化，影响小；若后续 sender 支持富文本输出再收敛为 `openOnClick: false` 透传。
- `field-sizing-content`（Tailwind v4 工具类）替代 autoGrow JS：浏览器支持缺口（Safari 未全量），A3 已裁决 JS 方案先行；待基线浏览器矩阵升级后可复查替换。
- DocPreviewPage 孤儿组件处置（未 barrel 导出、全仓无消费点）：属 V8b word-editor 域（`docs/analysis/visual-quality/V8b-word-editor.md` R7、plan 478 所辖），非本域 surface，仅在此登记跨域指针避免遗失。
- 证据卡视觉证据区（图标化工具条 L1 / autoGrow L2 几何 / 工具条一致性 L3）在 A7 e2e 断言落地后回填证据（经 OSS 链接引用，不入库二进制截图，遵守 `tests/e2e/artifacts/` 治理规则）。

## Closure

Status Note: 四 Phase 全部落地；closure audit 首轮 `issues`（唯一 Major：form-advanced styles.css 漏挂 flux-bundle style.css @import，执行期「不在 bundle 打包子集」核对结论失实；MINOR-1 精确 pin 未在 plan 内加注）——两项均已修复：bundle 链补挂 + 重建（dist/style.css 含 22 处 form-advanced 规则含 .is-editor-empty 占位符，`check:flux-bundle-pack` 绿）+ plan 内偏差补注 + daily log 勘误回写；按审计「MAJOR-1 修复后即可收口」的判据完成闭环。四 Phase exit criteria 其余全部经审计 CONFIRMED（两 focused 套件 form-advanced 1103/1103、ai 810/810 审计独立复跑绿）。

Closure Audit Evidence:

- Auditor / Agent: （独立 closure auditor，fresh sub-agent session）
- Evidence: verdict `issues`→修复闭环——MAJOR-1（bundle CSS 链断裂）修复证据：`packages/flux-bundle/src/style.css` 补挂 form-advanced @import、重建后 dist 含占位符/排版规则、`check:flux-bundle-pack` 绿；daily log 勘误。MINOR-1（pin 偏差）plan 内补注。

Follow-up:

- （只记录 non-blocking follow-up；confirmed live defect 不得出现在这里）
- （或明确写 no remaining plan-owned work）
