# 484 视觉质量 V9：Debugger 与代码编辑器视觉补齐 Plan

> Plan Status: active
> Last Reviewed: 2026-09-21
> Source: `docs/analysis/visual-quality/V9-debugger-code-editor.md`（独立核实 revised → 勘误回写后 pass，§6 勘误 E1-E5 已回写，本 plan 以其 Findings/R1-R8/A1-A5 裁决为准）、`docs/backlog/visual-quality-roadmap.md` V9 行、`docs/audits/visual-quality/debugger-code-editor.md`、`docs/components/code-editor/design.md`
> Related: `docs/plans/476-visual-quality-v6-spreadsheet-tokenization-plan.md`（--ss-\* dark 变体先例、未定义令牌 dangling 消费处置先例）、`docs/plans/477-visual-quality-v7-report-designer-plan.md`（视觉收口前置 work item，与本域零文件交集）

## Purpose

把路线图 V9 收口为研究报告 §3 裁决 A1-A5 的落地：debugger 注入式 CSS 令牌化与亮色宿主适配（注入机制不变）；code-editor 三能力补齐（searchKeymap 查找替换面板 / closeBrackets / highlightActiveLine）与 dark 块令牌映射；editorTheme 内核契约维持（自动跟随登记 Deferred）；两域 e2e 视觉断言补齐与 owner docs 补齐。

## Current Baseline

以下 file:line 均经起草时 live 复核（研究报告已独立核实 pass）。

**debugger 域（`packages/nop-debugger`）**

- 注入机制：全部样式为单文件模板字符串 `DEBUGGER_STYLES`（`panel/styles-css.ts:3-506`，恰 506 行）+ `DEBUGGER_STYLE_ID = 'nop-debugger-styles'`（:1）；注入器 `useInjectDebuggerStyles`（`panel/styles.ts:6-20`）`createElement('style')` + `head.appendChild`，按 id 查重幂等（:12-18）；`panel.tsx:191` 以 `chrome.enabled` 触发。运行时字符串注入——不进包 CSS 构建管线、不经 Tailwind `@source`，令牌化只能在字符串内完成。
- 令牌消费面 fallback-only：`var(--nop-debugger-*)` 消费 72 处、42 个不同令牌名（勘误 E1：含 ：13-14 跨行），全仓零定义，fallback 恒生效；唯一例外 ：29 `var(--nop-debugger-bg)` **无 fallback** 消费（sticky header 当前解析为 transparent）。fallback 全部为暗色 rgba/hex（`--nop-debugger-bg` 双层渐变 ：15-16、`--nop-debugger-text` #eef4fb :20、`--nop-debugger-eyebrow` #ffcf8b :55 等）。
- 裸值面 18 处（8 hex + 10 rgba）不经 var() 通道：styles-css.ts :225/:319-321/:346/:392/:396/:405/:406/:424/:425/:434/:444-445/:446/:477/:478。
- 亮色宿主混色机制：面板/launcher/minimized 三种根节点挂 `nop-theme-root`（`panel.tsx:309/:340/:365`），内部直接用 `@nop-chaos/ui` Button/Tabs（`panel.tsx:4`）——shadcn 件语义变量随宿主主题翻转，而注入 CSS 经 fallback 强制暗色，亮色宿主下同一面板两套色彩体系混色。
- 契约测试锁定现状：`panel/styles.test.ts:5-9`（:7 `toContain('background: var(')`、:8 `toContain('var(--nop-debugger-text, #eef4fb)')`）；:11-17 锚定内部选择器作用域。
- z-index 分层：面板 9999（:5-6）/ launcher 9998（:306）/ 拾取 overlay 10000（:332）；code-editor 全屏亦 9999（`code-editor-styles.css:83`）。

**code-editor 域（`packages/flux-code-editor`）**

- 三能力缺失：`createBaseExtensions`（`extensions/base.ts:147-218`）keymap 仅 `indentWithTab`+`history`（:148），无 searchKeymap/closeBrackets/highlightActiveLine，imports（:1-33）零命中；全仓 grep 零命中。依赖不对称：`@codemirror/search` 不在 package.json（:20-46）且 pnpm-lock 零命中（唯一新增依赖）；`closeBrackets` 来自 `@codemirror/autocomplete`（:21 已有）；`highlightActiveLine`/`highlightActiveLineGutter` 来自 `@codemirror/view`（:37 已有，后两者零新依赖）。
- 运行时通道现成：`use-code-mirror.ts` `extensionsCompartment`（:27 声明、:42 载入、:134-141 reconfigure 热替换）；`use-merge-view.ts` :28 独立 compartment、:73-88 双侧装配共享 extensions——扩展装进 base 后 12 语言 + diff 双侧自动受益。
- 样式双轨：light 默认路径**已令牌化**（`code-editor-styles.css:1-46` 24 个 chrome 令牌 color-mix 派生自共享语义变量；契约守卫 `code-editor-styles.test.ts:17-28`，:25-26 `not.toContain` 禁裸值先例）；dark 覆盖块 ：53-78 共 24 个声明**全部 raw**（15 处 `rgba(255,255,255,x)` + 9 处 hex #777/#ccc/#999/#fff）；另两处 dark 表面 hex：全屏 `#1e1e1e`（:90）、colorize 容器 `#282c34`（:290）。
- 零定义令牌 5 个：`--nop-field-border/focus-ring/disabled-bg`（`base.ts:38/:45/:49`，fallback 为裸 hex 恒生效）+ `--nop-code-editor-surface`（css:86/:285，fallback 已是语义链 `hsl(var(--background))`，无害钩子）+ `--nop-code-editor-dark-surface`（:90/:290，fallback 为裸 hex，即 dark 残余本体）。
- editorTheme 契约：renderer 默认 `'light'`（`code-editor-renderer.tsx:107`），写容器 `data-theme`（:243/:271）、colorize 路径写 `data-colorize-theme`（`colorize.tsx:98`），**不读宿主 `data-mode`**；kernel `editorTheme:'dark'` → oneDark（`base.ts:163`）；`docs/components/code-editor/design.md:161`（§10 末条）明文"editorTheme 只负责编辑器内核/显式暗色覆盖路径"。playground 已有两个 `editorTheme:'dark'` 示例（`code-editor-page.tsx:278/:319`）。
- i18n：`flux.codeEditor` 命名空间已备（`zh-CN.ts:1140` 起 / `en-US.ts:1142` 起，勘误 E3）；debugger 命名空间已接（`zh-CN.ts:541` / `en-US.ts:543`，勘误 E5）——R7 已裁决非缺口，不立项。

**e2e 与基建**

- `tests/e2e/debugger.spec.ts`：15 test（describe :129）。唯一计算样式块 ：374-390 为纯布局几何（display/borderRadius/cursor/height），无色彩、无令牌、无 data-mode 断言；存在性/交互覆盖良好（launcher :130、4 tab :137、automation API :157/:213/:246、reload 持久化 ：341、拖拽 ：410、badge :446/:460）。
- `tests/e2e/code-editor.spec.ts`：18 active + 1 `test.skip`（:400，全文件唯一 `page.screenshot` :405，勘误 2——普查"3 处截图"为 grep 计数伪影）；`getComputedStyle` 零调用；dark 仅 2 处**属性值**断言（:112-113 `data-colorize-theme`、:393 `data-theme`），断 marker 不断视觉。
- 可复用资产：V0 helpers（`tests/e2e/helpers/visual-assert.ts` `getComputedStyleValue`/`元素级消费端计算值探针（getComputedStyleValue）`/`expectComputedStyle`）+ `theme-switcher.spec.ts:40-58` light↔dark 计算样式翻转先例 + playground 四态主题切换宿主（`main.tsx:15` `applyTheme`）+ DebuggerLabPage 宿主页。
- 门禁：两包均在 `RENDERER_PACKAGE_SCOPE`（`scripts/audit/find-ui-consistency-gaps.mjs:290`）外，三条 hardcoded 规则（:303/:319/:357，勘误 E4）不覆盖——令牌化无门禁摩擦亦无门禁保护，防回归靠包内契约测试。
- 主题令牌：theme-tokens 四块对称（`packages/theme-tokens/src/styles.css` :122/:182/:242/:302 = classic/glass × light/dark），`--background/--foreground/--muted*/--accent/--border/--ring/--card/--success/--warning/--destructive` 全在，且为 `:root[data-theme][data-mode]` 级变量——`position:fixed` 悬浮层 var 解析沿 DOM 直达 `:root`，消费语义链零新依赖、dark 宿主自动翻转。
- 前置：V6/V7 已分别以 plan 476/477 收口，与本域零文件交集；两域工作区零未提交改动（研究报告核实记录）。

## Goals

- **A1 debugger 令牌化亮色适配**：42 个 `--nop-debugger-*` fallback 换语义令牌链（`:root[data-mode]` 自动翻转，绝大多数无需手写 dark 变体）；:29 无 fallback 消费点补 fallback；18 处裸值收敛进 var() 通道。注入机制与 `DEBUGGER_STYLE_ID` 不变；品牌强调色（琥珀 eyebrow/chip 族、6 组 badge）补显式 dark 变体；`styles.test.ts:7-8` 契约先红后绿改写。
- **A2 code-editor 三能力**：closeBrackets + highlightActiveLine(+Gutter) 零新依赖；searchKeymap + CM6 内置 `search()` 查找替换面板（新增 `@codemirror/search` 唯一依赖）；经 extensionsCompartment 通道装入 `createBaseExtensions` 一处（12 语言 + diff 双侧受益）；面板文案经 `EditorState.phrases` 接 `flux.codeEditor` i18n；`.cm-panel` 令牌化样式（R5）。
- **A3 kernel 主题契约维持**：`editorTheme` prop 不自动跟随宿主 data-mode（design.md §10 契约原文维持）；playground dark 示例核对；"kernel 自动继承宿主"登记 Deferred But Adjudicated。
- **A4 dark 块令牌映射**：`[data-theme='dark']` 24 个 raw 声明 + 2 处表面 hex 映射语义令牌链；field 三令牌定义或直连；`--nop-code-editor-dark-surface`/`--nop-code-editor-surface` 五个零定义令牌一并收敛（var 名保留、fallback 换语义链）；契约测试补 dark 禁裸 hex/裸白 rgba 守卫。
- **A5 两域 e2e 视觉断言**：debugger light/dark 双态面板背景/文字/边框计算样式 + 令牌解析 + launcher/overlay `position:fixed`/z-index 存在性；code-editor 三能力行为断言 + dark 令牌解析 + 现有属性断言至少 1 处升级为计算样式断言。
- **owner docs**：新建 `docs/components/debugger/design.md`；`docs/components/code-editor/design.md` §2/§10 增补；证据卡 `debugger-code-editor.md` 回写勘误与裁决；roadmap V9 流转；daily log。

## Non-Goals

- debugger 面板视觉语言重设计（玻璃拟态 + 琥珀品牌语言只做令牌化搬移与等价替换；品牌保真 watch-only）；UI 组件架构重构（shadcn 件 vs 注入 CSS 分工不动）。
- kernel 主题自动跟随宿主（A3 维持契约，Deferred 登记）；merge view diff 高亮 dark 修复（R6 watch-only）。
- minimap / per-language renderer type（design.md §2 已「暂不实现」，不翻案）；自研查找替换面板（用 CM6 内置）。
- 不新建 CSS 构建管线、不改 theme-tokens 包（V1 已收口资产，V9 只做消费层）；z-index 分层重排（R2 watch-only，叠加场景实测后再裁）；`RENDERER_PACKAGE_SCOPE` 扩围（属 V12a 域）。

## Scope

### In Scope

- `packages/nop-debugger`：`panel/styles-css.ts`（42 fallback、:29 补 fallback、18 裸值收敛、品牌色 dark 变体、R8 拆分评估）、`panel/styles.test.ts`（契约改写）。
- `packages/flux-code-editor`：`extensions/base.ts`（三能力装配 + field 令牌处置）、`package.json`（`@codemirror/search`）、`code-editor-styles.css`（dark 块 + 表面 + `.cm-panel`）、`code-editor-styles.test.ts`（守卫）。
- `packages/flux-i18n`：`locales/zh-CN.ts`/`en-US.ts`（search 面板文案键，对称新增）。
- `tests/e2e/debugger.spec.ts`、`tests/e2e/code-editor.spec.ts`（视觉断言；如需宿主页钩子，playground 现有宿主页最小改动）。
- owner docs：`docs/components/debugger/design.md`（新建）、`docs/components/code-editor/design.md`（§2/§10）、`docs/audits/visual-quality/debugger-code-editor.md`、`docs/backlog/visual-quality-roadmap.md`、`docs/logs/`。

### Out Of Scope

- `packages/theme-tokens`（四块对称变量零改动）、CSS 构建管线、playground 主题基建（V1 资产直接复用）。
- merge diff 色（R6）、z-index 重排（R2）、面板重设计、UI 架构重构、kernel 自动跟随（A3 Deferred）。
- `flux-renderers-*`、一致性门禁脚本、V12 一致性治理域。

## Failure Paths

| 场景                  | 触发                                          | 行为                                                                                                                                                                                        | 可重试                   | 用户可见表现   |
| --------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | -------------- |
| host-without-tokens   | 宿主未加载 theme-tokens（语义变量未定义）     | `var(--nop-debugger-bg, hsl(var(--background)))` 链整体 invalid-at-computed-value → 面板退化（transparent/继承）；令牌化后宿主前提 = 已引入共享主题变量（本仓宿主均成立，语义链是裁决方向） | 是（宿主引入令牌即恢复） | 面板发白/透明  |
| search-panel-in-diff  | diff 双侧编辑器同装 search 扩展               | CM6 面板按 view 实例生效，与单编辑器一致；若实测相互干扰，e2e 锚定单侧行为，多侧行为登记 follow-up                                                                                          | 是                       | 查找替换可用性 |
| phrases-missing-key   | 新增 locale 键遗漏或 CM6 内置短语无对应键     | `EditorState.phrases` 缺键回退 CM6 内置英文字面（不抛错）；zh/en 键对称由 i18n 校验兜底                                                                                                     | 是                       | 面板局部英文   |
| dark-surface-override | 宿主显式覆盖 `--nop-code-editor-dark-surface` | var 名保留，宿主覆盖优先于 fallback 语义链（既有钩子语义不变）                                                                                                                              | 否                       | 宿主自定义表面 |

## Test Strategy

档位选择：**必须自动化**——两包均在一致性门禁扫描集外，防回归只能靠包内契约测试（`panel/styles.test.ts`/`code-editor-styles.test.ts` 先红后绿是守卫主体）；三能力为用户可感知交互变更；e2e 双态断言复用 V0 工具链。对应 Proof 项一律在 Fix 之前。

## Execution Plan

### Phase 1 - debugger 令牌化亮色适配（A1）

Status: completed
Targets: `packages/nop-debugger/src/panel/styles-css.ts`、`panel/styles.test.ts`、`docs/components/debugger/design.md`（新建）

- Item Types: `Proof | Fix | Decision`

- [x] Proof：`panel/styles.test.ts` 契约先红——改写 ：5-9 断言为令牌化形态（:7-8 旧 fallback 字面断言翻转）：①42 令牌 fallback 均为语义令牌链形态（`hsl(var(--…))`/color-mix 派生）；②禁裸 hex fallback（#eef4fb/#ffcf8b 等不再出现）；③禁裸白 `rgba(255,255,255,x)` 直出；④:29 消费点具 fallback（断言 `var(--nop-debugger-bg,` 存在）；改断言后、改 CSS 前跑出红并记录（2026-09-21 执行记录：改断言后、改 CSS 前 4 failed / 126 passed，红在①②③④四条新断言）
- [x] Fix：42 令牌 fallback 换语义令牌链（`--card`/`--border`/`--muted-foreground`/`--success`/`--warning`/`--destructive` 等，color-mix 派生仿 `code-editor-styles.css:1-46` 同构先例）——`position:fixed` 层 var 解析直达 `:root[data-theme][data-mode]`，dark 宿主自动翻转；:29 补 fallback；18 处裸值（:225/:319-321/:346/:392/:396/:405/:406/:424/:425/:434/:444-445/:446/:477/:478）收敛进 var() 通道。**机制裁决（review M1，取 option a）**：dark 块与两处表面以「包级 dark 令牌、定义保留 raw 暗值」收敛——host 无关，editorTheme 契约语义真正未变；弃语义链映射（其按宿主 data-mode 翻转，会在亮色宿主 + editorTheme:'dark' 路径把 chrome 翻亮而 kernel 仍 oneDark）（落地形态：raw 暗值保留在 `--nop-debugger-dark-*` fallback-only 钩子的 fallback 内、经 `:root[data-mode='dark']` 后代选择器消费，宿主可同名覆写，var() 通道外零裸值）
- [x] Fix：品牌强调色（琥珀 eyebrow/chip 族、6 组 badge 品牌色、json 4 色）在注入 CSS 头部以 `:root[data-mode='dark']` 后代选择器（或等效机制）为 `.nop-debugger`/`.nop-debugger-launcher` 两根类补显式 dark 变体；**保真裁决**：亮色宿主换浅色等价物、接受视觉语言变化（方向已裁定，品牌保真登记 Deferred）（落地：eyebrow/chip 族/highlight/json 4 色/6 组 badge 全部落 `:root[data-mode='dark'] .nop-debugger …` 显式变体；launcher 徽标为 destructive 语义、两态均成立，无需品牌变体）
- [x] Decision：R8 拆分评估二选一落地——令牌定义独立文件（如 `styles-tokens.ts`）或维持单文件；若维持，506 行 WARN 现状与理由登记 design.md（纯结构调整非行为项，WARN 不阻断）（裁决：维持单文件，理由与 WARN 登记见 `docs/components/debugger/design.md` §6）
- [x] Fix：新建 `docs/components/debugger/design.md`——组件定位、4 tab（overview/timeline/network/node）+ 拾取 overlay + eval 面板结构、注入式样式契约与 42 令牌表、亮/暗宿主矩阵、z-index 分层约定（9998/9999/10000）；只写最终设计状态

Exit Criteria:

- [x] 契约测试先红后绿有记录；fallback 形态/禁裸值/:29 具 fallback 断言全绿；`styles.test.ts:11-17` 选择器作用域断言零回归
- [x] 注入机制未变：`DEBUGGER_STYLE_ID` 与 `styles.ts:12-18` 幂等逻辑零改动（grep 证：styles.ts 在本 Phase 零 diff，`createElement('style')`/id 查重/`head.appendChild` 原样）
- [x] nop-debugger 包 focused 测试零回归（130/130 全绿）；`docs/components/debugger/design.md` 与 live 一致

### Phase 2 - code-editor 三能力补齐（A2）

Status: in progress
Targets: `packages/flux-code-editor`（`extensions/base.ts`、`package.json`、`code-editor-styles.css`）、`packages/flux-i18n/src/locales/`、`docs/components/code-editor/design.md` §2

- Item Types: `Proof | Fix | Decision`

- [ ] Proof：三能力断言先红——base 装配单测（最小 EditorState/EditorView 实例）断言：①searchKeymap 键位可触发（Mod-f 打开 `.cm-panel.cm-search`）；②输入 `(` 自动补出 `)`（closeBrackets）；③`.cm-activeLine`/`.cm-activeLineGutter` 存在；装配前跑出红，e2e 行为断言由 Phase 4 兜底
- [ ] Fix：`package.json` 新增 `@codemirror/search` 直接依赖（唯一新增，lockfile 落地）；`extensions/base.ts` `createBaseExtensions` 一处装配 `search()` + `searchKeymap` + `closeBrackets` + `highlightActiveLine`/`highlightActiveLineGutter`（extensionsCompartment 通道现成，`use-code-mirror.ts`/`use-merge-view.ts` 预期零改动，12 语言 + diff 双侧自动受益）
- [ ] Fix：查找替换面板文案经 `EditorState.phrases` 接 `flux.codeEditor` i18n（zh-CN/en-US 对称新增）；`code-editor-styles.css` 补 `.cm-panel` 令牌化样式（R5，防 dark 白底破相）
- [ ] Decision：三能力全局启用、不新增 schema 面（对齐 design.md §2 minimap「暂不实现」:40 克制口径）；design.md §2 决策表补 searchKeymap/closeBrackets/highlightActiveLine 三行记录

Exit Criteria:

- [ ] `@codemirror/search` 落 package.json + pnpm-lock；flux-code-editor focused typecheck/测试过（新依赖可解析）
- [ ] 三能力单测断言绿；`.cm-panel` 样式规则存在且消费语义令牌
- [ ] i18n 键 zh/en 对称；design.md §2 三行已补

### Phase 3 - code-editor dark 令牌映射（A4）

Status: planned
Targets: `code-editor-styles.css`（:53-78/:90/:290）、`extensions/base.ts`（:38/:45/:49）、`code-editor-styles.test.ts`、`docs/components/code-editor/design.md` §10

- Item Types: `Proof | Fix`

- [ ] Proof：`code-editor-styles.test.ts` 守卫先红——沿 ：25-26 `not.toContain` 先例新增「dark 块禁裸 hex（#777/#ccc/#999/#fff/#1e1e1e/#282c34）/ 禁裸白 rgba(255,255,255,x)」断言 + field 三令牌 fallback 禁裸 hex 断言；改 CSS 前跑出红并记录
- [ ] Fix：dark 块 24 个声明（15 rgba + 9 hex）映射语义令牌链——#777/#999/#ccc 三档灰 → `--muted-foreground`/`--foreground` color-mix 降档；rgba(255,255,255,x) 边框/底 → `--border`/`--accent`/`--muted` color-mix；light 路径 ：1-46 为同构先例
- [ ] Fix：两处表面——`--nop-code-editor-dark-surface` var 名保留、fallback 换 `hsl(var(--background))` 链（:90/:290）；`--nop-code-editor-surface` 钩子语义不变（:86/:285）；field 三令牌（`--nop-field-border/focus-ring/disabled-bg`，`base.ts:38/:45/:49`）定义或改直连语义令牌（V6 R1 同型缺陷先例，二选一裁决记录进 design.md §10）
- [ ] Fix：design.md §10 dark 契约重述——dark 块令牌映射后，"editorTheme 只负责内核/显式暗色覆盖路径"契约原文与映射后事实对齐（不写演进叙事）

Exit Criteria:

- [ ] 契约守卫先红后绿；dark 块与表面零裸值；五个零定义令牌逐一收敛（定义或直连，逐一可 grep）
- [ ] editorTheme 契约语义未变：renderer :107 默认 light、`data-theme` 写点 ：243/:271 零改动（grep 证）
- [ ] code-editor focused 测试零回归；design.md §10 与 live 一致

### Phase 4 - e2e 视觉断言 + 裁决落卡 + owner docs 收口（A5/A3）

Status: planned
Targets: `tests/e2e/debugger.spec.ts`、`tests/e2e/code-editor.spec.ts`、`docs/audits/visual-quality/debugger-code-editor.md`、roadmap、daily log

- Item Types: `Proof | Fix | Decision`

- [ ] Proof（A5 debugger）：light/dark 宿主双态断言——面板背景/文字/边框 `getComputedStyle`（切宿主 data-mode 后值翻转，复用 visual-assert helpers + `theme-switcher.spec.ts:40-58` 先例）+ `--nop-debugger-*` 令牌解析断言（`元素级消费端计算值探针（getComputedStyleValue）`）+ launcher/overlay `position:fixed` 与 z-index 存在性断言（9998/9999/10000）。**断言机制（review M2）**：42 令牌为 fallback-only 钩子（documentElement 上解析为空），禁用 expectCssVarResolves——debugger 域断言消费端计算值随宿主 data-mode 翻转（+宿主 --background/--foreground 解析）；code-editor dark 域用 getComputedStyleValue(locator, '--nop-code-editor-\*') 元素级读取
- [ ] Proof（A5 code-editor）：三能力行为断言——closeBrackets 输入开括号断言补全 DOM、highlightActiveLine 断言 `.cm-activeLine` 存在 + 背景计算样式、search 面板打开后 `.cm-panel` 可见 + Esc 关闭 + i18n 文案；dark 令牌解析断言（dark 块 `--nop-code-editor-*` 值随 `data-theme` 翻转）；现有 ：393 `data-theme` 属性断言至少 1 处升级为计算样式断言
- [ ] Decision（A3）：editorTheme 契约维持落卡——playground dark 示例核对（`code-editor-page.tsx:278/:319`）确认覆盖现状；「kernel 主题自动继承宿主 data-mode」登记 Deferred But Adjudicated（本 plan Deferred 区），design.md §10 契约原文维持
- [ ] Fix：owner docs 收口——证据卡 `debugger-code-editor.md` 回写（勘误 1/2：F3 定性修正为 dark 覆盖路径残余 ：53-78+:90+:290、截图"3 处"计数伪影实为 1 处且在 test.skip；F1-F4 裁决与状态 open → closed；Owner plan 填 484）；roadmap V9 行状态流转；daily log（测试计数 + full-green 状态）

Exit Criteria:

- [ ] 新增断言全绿；debugger 15 + code-editor 18 active test 零回归（e2e 红线）
- [ ] 证据卡裁决逐条落卡无 pending；roadmap/daily log 已更新
- [ ] 快照政策合规：判据全部程序化（getComputedStyle/令牌解析），无新增截图基线入库

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent:
- Verdict:
- Rounds:
- Findings addressed:

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。全量验证归此处，Phase 内只做局部验证。

- [ ] 全部 in-scope 交付落地（Phase 1-4 Exit Criteria 全勾）
- [ ] in-scope confirmed live defects / contract drifts 已收敛：42 fallback-only 令牌、:29 无 fallback 消费、18 处裸值、dark 块 24 raw + 2 表面 hex、field 三令牌、三能力缺失、亮色宿主双体系混色
- [ ] 硬约束守住：运行时 `<style>` 注入与 `DEBUGGER_STYLE_ID` 未变；`@codemirror/search` 为唯一新增 npm 依赖；不新建 CSS 构建管线；theme-tokens 包零改动
- [ ] 显式裁决落卡（A3 契约维持、品牌保真 / R2 / R6 watch-only、R8 二选一），非静默 deferred
- [ ] 行为/契约结果已达成：三能力、亮色宿主自适应、dark 令牌解析在契约单测与 e2e 成立
- [ ] 必要 focused verification 已完成（两契约测试先红后绿 + e2e 双态断言）
- [ ] e2e 红线：debugger 15 + code-editor 18 active test 零回归
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响 owner docs 已同步到 live baseline：debugger/design.md（新建）、code-editor/design.md、证据卡、roadmap、daily log
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`（零新 hit，不超出注册红名单）

## Deferred But Adjudicated

### kernel 主题自动继承宿主 data-mode（R4/A3 残余）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `editorTheme` 契约为 design.md §10 明文现状，自动跟随属契约变更（需 owner doc 修订 + 人工门禁）；playground 已有 `editorTheme:'dark'` 示例路径，当前 supported baseline 无静默失效
- Successor Required: `no`（如翻案：新 plan + design.md §10 修订 + 人工门禁）

### 品牌保真（深色玻璃 + 琥珀语言）（A1 保真裁决）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 路线图 V9 已裁定方向为「亮色宿主适配」，浅色等价替换非缺陷；语义链 + 显式 `[data-mode='dark']` 变体已保品牌强调色
- Successor Required: `no`

### z-index 分层冲突（R2）

- Classification: `watch-only residual`
- Why Not Blocking Closure: launcher 9998/面板 9999/code-editor 全屏 9999/overlay 10000 的冲突场景（debugger 开启 + 全屏叠加）未证实实际破相；Phase 4 z-index 存在性断言后回归有守卫，实测触发再裁
- Successor Required: `no`

### merge view diff 高亮 dark 适配（R6）

- Classification: `watch-only residual`
- Why Not Blocking Closure: diff 为低频路径且 `@codemirror/merge` 默认 diff 色未证实 dark 破相；本 plan 内核对登记
- Successor Required: `no`

## Non-Blocking Follow-ups

- search 面板在 diff 双侧的实测行为（面板按 view 实例生效）：如发现相互干扰，登记 follow-up 并锚定单侧行为断言。
- styles-css.ts 拆分若 Phase 1 裁决维持单文件，506 行 WARN 状态随 design.md 常驻；未来触及 ERROR 线（700，`scripts/check-oversized-code-files.mjs:11-12`）必须拆分。

## Closure

Status Note: （closure audit 通过后填写）

Closure Audit Evidence:

- Auditor / Agent: （独立子 agent fresh session 填写）
- Evidence: （task id / daily log link / findings 摘要）

Follow-up:

- （closure 时填写，或写 no remaining plan-owned work）
