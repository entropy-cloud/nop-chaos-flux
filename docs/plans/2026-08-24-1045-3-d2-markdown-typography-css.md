# 03 D2 Markdown Typography 自定义 CSS

> Plan Status: completed
> Last Reviewed: 2026-08-24
> Source: `docs/backlog/ai-widgets-product-roadmap.md` D2；`docs/components/flux-renderers-ai/product-spec.md` 排版节奏表（D0 产物，数值输入）；`docs/architecture/theme-compatibility.md:165`（双轴主题基线）
> Mission: ai-widgets-product
> Work Item: D2
> Related: `docs/plans/2026-08-24-1045-1-d0-product-standard-baseline.md`（前置输入）、`docs/plans/2026-08-24-1045-2-d1-rich-markdown-fixture.md`（执行顺序在前，提供视觉抽查 substrate）

## Purpose

移除从未生效的 `prose` 类（`@tailwindcss/typography` 全仓 0 引入，样式是死的），以 `[data-slot="ai-bubble-markdown"]` scoped 自定义 CSS 取代，让 ai-bubble 内 markdown 元素获得产品级排版。收口 G2。

## Current Baseline

（2026-08-24 live 核实）

- `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/markdown.tsx:40`：`cn('prose prose-sm max-w-none break-words dark:prose-invert')`——`prose` 系类名无对应插件，0 样式产出；`@tailwindcss/typography` 全仓 0 引入（仅 mission 描述文本提及）
- `packages/flux-renderers-ai/src/styles.css` 126 行（流式光标等规则），无 typography 规则、无 `prefers-color-scheme` / `data-mode` 规则；build 经 `copy-build-assets.mjs` 拷贝 `src/styles.css → dist/styles.css`
- 测试基座：`packages/flux-renderers-ai/src/renderers/ai-bubble/__tests__/markdown-content.test.tsx` 存在（code-block copy 等既有断言）
- 排除项 live 核实：`packages/flux-renderers-ai/src/rich-text/tiptap-sender.tsx:219` `class: 'prose max-w-none focus:outline-none'` 属 rich-text opt-in 子路径（host 显式 import 才进 bundle），A6 P6 lineage 单独跟踪，本 plan 不动
- 主题基线：`docs/architecture/theme-compatibility.md:165` `:root[data-theme='classic'][data-mode='dark']` 双轴；roadmap 裁定 ai-bubble typography 走 `[data-mode='dark']` 单轴 + `prefers-color-scheme` 双触发（ai-bubble 不感知 theme variant）
- D0 product-spec 排版节奏表尚未产出（D0 plan 排序第一；本 plan 执行时以其为数值契约）

## Goals

- `markdown.tsx` 内 `prose` 字串 0 命中（保留 `max-w-none break-words` 工具类）
- `styles.css` 新增 typography 规则 ≤150 行，selector 统一以 `[data-slot="ai-bubble-markdown"]` 为前缀，覆盖 D0 spec 裁定的元素集（建议基线 h1–h6 / p / ul / ol / blockquote / pre / code / a / table / hr / img / strong / em），数值映射到既有 CSS variables
- dark 双触发：`@media (prefers-color-scheme: dark)` 与 `[data-mode='dark']` 两条路径都覆盖
- `markdown-content.test.tsx` 新增 ≥3 typography 断言全过；包级测试零破坏

## Non-Goals

- 不引入 `@tailwindcss/typography`（体积纪律，D0 已裁定）
- 不动 `rich-text/tiptap-sender.tsx:219` 的 `prose max-w-none`（独立 scope，见 Deferred But Adjudicated）
- 不做 LaTeX / 代码高亮样式（`.katex` 容器与 token 配色归 D6）
- 不回写 `design.md` / `renderers.md`（owner-doc 同步统一归 DG，含 G11 补 `ai-bubble-typography` 段）

## Scope

### In Scope

- `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/markdown.tsx`（仅 line 40 className）
- `packages/flux-renderers-ai/src/styles.css`（新增 typography 规则段）
- `packages/flux-renderers-ai/src/renderers/ai-bubble/__tests__/markdown-content.test.tsx`（新增断言）

### Out Of Scope

- `packages/flux-renderers-ai/src/rich-text/` 全部（tiptap-sender 的 `prose` 不动）
- `apps/playground/src/styles.css`（无 katex/插件引入需求；playground 样式层归 D6 如需）
- `docs/components/flux-renderers-ai/design.md` / `renderers.md`

## Failure Paths

不适用：纯样式变更，无错误契约面。dark 模式两触发路径的兜底行为（attribute 缺失时 falls back to media query）作为 Phase 1 实现口径。

## Test Strategy

档位选择：`必须自动化`。typography 是 ai-bubble 视觉 public contract 变化（G2 收口面），需 committed 回归断言防回退。按 AGENTS.md Test Strategy Tiers 与 plan guide「When Drafting #12」，**Proof 先于 Fix**：断言先以 red 状态锁定（现状 prose 类在 / typography 规则缺），实现后转绿。断言形式为 **CSS 源文本断言**（jsdom 不加载包级 stylesheet；repo 先例：`packages/ui/src/mobile-styles.test.ts`、`theme-tokens/src/styles.test.ts`）；roadmap 字面的「计算样式测试」由 DV e2e 的 `getComputedStyle` 断言落实（见 D0 spec DV 断言清单）。

## Execution Plan

### Phase 1 - typography 断言先行（red 锁定）

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-bubble/__tests__/markdown-content.test.tsx`

- Item Types: `Proof`

- [x] ≥3 组断言先行落盘：(a) 渲染输出 `[data-slot="ai-bubble-markdown"]` 容器 className 不含 `prose`；(b) `styles.css` 源文本包含覆盖矩阵 selector（标题/段落/列表/引用/代码/表格至少各 1 条，且前缀为 `[data-slot="ai-bubble-markdown"]`）；(c) dark 双触发两规则存在（`prefers-color-scheme` 与 `[data-mode='dark']` 各 ≥1 处）
- [x] 对当前 repo 跑一次并记录 red 证据（(a) 因 prose 类仍在而失败、(b)(c) 因规则缺失而失败——预期失败即预期锁定）

Exit Criteria:

- [x] 新增断言 ≥3 组已落盘且当前为 red（red 运行证据记 daily log 或 plan 内备注）

Red 证据（2026-08-24 执行 session）：`markdown-content.test.tsx` 落盘 4 个断言组（(a)/(b)/(c1)/(c2)）。red 运行：`Tests 4 failed | 9 passed (13)`——(a) `container drops the dead prose family`、(b) `element matrix under the ai-bubble-markdown scope`、(c1) `prefers-color-scheme media query`、(c2) `[data-mode] attribute trigger` 四个全 red，既有 9 个用例（copy-timer / safeMarkdownSlice wiring / XSS regression）全绿；包级其余 79 个测试文件全过（`706 passed`）。预期失败即预期锁定，转绿归 Phase 2。

### Phase 2 - scoped typography CSS 与 prose 移除

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/markdown.tsx`、`packages/flux-renderers-ai/src/styles.css`

- Item Types: `Fix | Decision`

- [x] `markdown.tsx:40` 移除 `prose prose-sm dark:prose-invert`，保留 `max-w-none break-words`（Decision：横向溢出防护工具类与死插件类无关，保留）
- [x] `styles.css` 新增 `[data-slot="ai-bubble-markdown"]` scoped 规则：元素集与 token 数值以 product-spec.md 排版节奏表裁定为契约（建议基线 h1–h6 / p / ul / ol / blockquote / pre / code / a / table / hr / img / strong / em；任务列表归 D0 最终裁定）；总新增 ≤150 行；颜色/间距优先引用 CSS variables（`--muted` / `--muted-foreground` / `--border` / `--background` 等）
- [x] Decision——dark 双轨实现：主题 variables 经 `:root` + `[data-theme][data-mode]` 解析（`packages/theme-tokens/src/styles.css`），var-only 的 media-query 块在无 attribute 的 standalone host 中无法生效暗色；因此暗色规则采用「CSS variables + 包级自定义属性 fallback（字面暗色值）」双轨，与 `flux-renderers-mobile/src/styles.css:49-59` 既有 dark pattern 对齐；两条触发路径 `@media (prefers-color-scheme: dark)` 与 `[data-mode='dark']` 都覆盖
- [x] 视觉抽查（playground hardcode `data-mode='light'`，见 `apps/playground/src/main.tsx:15`）：亮态直接看 widgets demo（D1 fixture 提供富内容）；暗态用 devtools `prefers-color-scheme: dark` 模拟 + 手动改根元素 `data-mode` 属性两法各抽查一次，markdown 元素均有样式、无浏览器裸默认残留（结果记 daily log）

Exit Criteria:

- [x] `grep -c "prose" packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/markdown.tsx` 输出 0
- [x] `styles.css` 新增段 ≤150 行且 selector 前缀统一（grep 可核对）
- [x] rich-text 路径零触碰（`git diff` 不含 `src/rich-text/`）
- [x] Phase 1 断言全部转绿；`pnpm --filter @nop-chaos/flux-renderers-ai test` 全过（既有 markdown-content / markdown-buffer 断言零破坏）

执行证据（2026-08-24 执行 session）：

- `markdown.tsx:38` 现为 `<div data-slot="ai-bubble-markdown" className="max-w-none break-words">`；`rg -c prose` 0 命中（exit 1）。
- `styles.css` 新增 150 行（`git diff --numstat` = 150/0，红线 ≤150）：`--ai-md-*` 包级自定义属性 8 项 + mono 栈，元素集覆盖 h1–h6 / p / ul / ol / li+`::marker` / GFM 任务列表（`.task-list-item` + `input[type='checkbox']` accent-color）/ blockquote / pre（radius `var(--radius-sm, 8px)`）/ 行内 code（`:not(pre) > code`，0.85em）/ a（underline + offset 2px + hover thickness 2px）/ table th/td / hr / img / strong / em；dark 双触发 = `@media (prefers-color-scheme: dark)` 块 + `[data-mode='dark']` 后代选择器，两块内 fallback 字面值换成 classic-dark 轴（var() 优先、字面值兜底，theme host 不被字面值钉死）。
- 视觉抽查（programmatic，AGENTS.md 口径，`_tmp/d2-typography-inspect.mjs` 于 playground dev server 实跑，25/25 PASS）：亮态 18 项——容器 14px/23.8px、h2 20px/600（非浏览器默认 1.5em）、p margin-bottom 7px（首子元素 margin-top 0）、ul padding-left 21px、blockquote/th/行内 code bg `rgb(241,245,249)`（muted 生效）、a `rgb(28,110,242)` primary + underline offset 2px（非浏览器蓝 rgb(0,0,238)）、table collapse、td border `rgb(225,231,239)`、pre radius 8px + overflow-x auto + mono 13px、hr 1px、strong 600、em italic；暗态双法——(1) `colorScheme: 'dark'` 模拟：样式仍在（h2 20px），playground 显式 light-pin 经 var-first 轨胜出（ink 仍 `rgb(2,8,23)`，符合「host 显式选择优先于 OS」设计）；(2) 手动 `data-mode='dark'`：ink 翻 `rgb(248,250,252)`、a → `rgb(77,141,245)`、pre/blockquote/th bg → `rgb(31,42,61)`（theme dark muted 轴），h2 保持 20px。无浏览器裸默认残留。

## Draft Review Record

- Reviewer / Agent: fresh session `ses_fce51a8fcffe1E192HNgQ6lMR9`（2026-08-24）
- Verdict: `pass`
- Rounds: 1
- Findings addressed: （全部 Minor，不阻塞；①②③⑤ 已采纳修正）① Proof/Fix 顺序——已重构为 Phase 1 断言先行 red 锁定；② 暗态抽查机制——已写明 devtools media 模拟 + 手动改根 `data-mode` 两法（playground hardcode light，`main.tsx:15`）；③ var-only media-query 在 standalone host 无法生效暗色——已落 Decision「CSS variables + 包级字面暗色 fallback」双轨（对齐 `flux-renderers-mobile/src/styles.css:49-59` 先例）；④ 元素集以 D0 spec 裁定为契约（已显式写明）；⑤ roadmap 字面「计算样式测试」——已注明以 CSS 源文本断言落实（repo 先例 mobile-styles.test.ts 等），computed-style 归 DV e2e

## Closure Gates

- [x] G2 收口：prose 死类移除 + 自定义 typography 生效（断言 + dev 实跑抽查记录）
- [x] ≤150 行 CSS 红线未超；selector 前缀统一
- [x] `src/rich-text/` 零触碰（独立 scope 未被越界修改）
- [x] focused verification：新增 typography 断言全过 + 包级测试全绿
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] owner-doc：无需逐 phase 更新（G11 补段与 typography 段落统一归 DG；按 plan guide Rule 17，本 plan 不改架构语义）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（37/37 tasks）
- [x] `pnpm build`（37/37 tasks）
- [x] `pnpm lint`（37/37 tasks）
- [x] `pnpm test`（68/68 workspace 任务；flux-renderers-ai 710/710）

## Deferred But Adjudicated

### rich-text / tiptap-sender 的 `prose max-w-none`

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: rich-text 是 opt-in 子路径（host 显式 import 才进 bundle），Tiptap 由 A6 P6 plan 单独 ownership 跟踪；roadmap D2 明确排除以免越界耦合。本 plan 只收口 ai-bubble markdown 公共路径。
- Successor Required: `no`
- Successor Path: 无（rich-text scope 由其 lineage 独立跟踪；如未来需要由彼时 owner plan 处理）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 执行完成（2026-08-24）。Phase 1 断言先行 red 锁定（4 断言组 red，既有 9 用例零破坏）→ Phase 2 落地 prose 移除 + 150 行 scoped typography（红线内）+ dark 双轨双触发；4 断言组转绿；视觉抽查 programmatic 25/25（亮态 + media 模拟 + 手动 data-mode 三态）；workspace typecheck/build/lint/test/check 全绿；ai 面 e2e 89 用例全绿（ai-widgets-demo 10 + ai-widgets-fixture 6 + bubble-content/chat/chat-states/rich-text-sender/coverage-widgets 73）。证据详见各 Phase 执行证据节与 `docs/logs/2026/08-24.md`。

Closure Audit Evidence:

- Auditor / Agent: fresh session `ses_fcbe229a9ffehH6ArhZF8ran77`（2026-08-24，general sub-agent，非执行 session）
- Evidence: verdict `pass`，8/8 checklist 亲核：①`rg -c prose markdown.tsx` 0 命中；②styles.css diff `150 0`（红线内）+ 全部新增 selector 前缀统一（含两 dark trigger 块，var-first + classic-dark 字面 fallback）；③`git diff --name-only` 无 `src/rich-text/`，`tiptap-sender.tsx:219` `prose max-w-none` 原样；④独立复跑包级测试 80 files / 710 tests 全绿 + 4 个 typography 断言逐个 ✓（13/13）；⑤CSS 数值对照 product-spec §2.4 节奏表全 match（含 dark 字面值对照 `theme-tokens/src/styles.css:172-216` classic-dark 轴逐项核对）；⑥双 dark trigger 存在且 scoped；⑦plan/roadmap 一致性（唯二 `[ ]` 为本审计门 + Closure 占位，roadmap 仅 D2 行 `planned→done`）；⑧无静默降级（Deferred 仅 pre-adjudicated rich-text 项，Follow-ups `无`）。非阻塞观察：`_tmp/` 临时探针已按 AGENTS.md 清理（结果记录于本 plan 与 daily log）。
- Follow-up: no remaining plan-owned work
