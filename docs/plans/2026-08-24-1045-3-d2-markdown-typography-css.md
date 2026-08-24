# 03 D2 Markdown Typography 自定义 CSS

> Plan Status: active
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

Status: planned
Targets: `packages/flux-renderers-ai/src/renderers/ai-bubble/__tests__/markdown-content.test.tsx`

- Item Types: `Proof`

- [ ] ≥3 组断言先行落盘：(a) 渲染输出 `[data-slot="ai-bubble-markdown"]` 容器 className 不含 `prose`；(b) `styles.css` 源文本包含覆盖矩阵 selector（标题/段落/列表/引用/代码/表格至少各 1 条，且前缀为 `[data-slot="ai-bubble-markdown"]`）；(c) dark 双触发两规则存在（`prefers-color-scheme` 与 `[data-mode='dark']` 各 ≥1 处）
- [ ] 对当前 repo 跑一次并记录 red 证据（(a) 因 prose 类仍在而失败、(b)(c) 因规则缺失而失败——预期失败即预期锁定）

Exit Criteria:

- [ ] 新增断言 ≥3 组已落盘且当前为 red（red 运行证据记 daily log 或 plan 内备注）

### Phase 2 - scoped typography CSS 与 prose 移除

Status: planned
Targets: `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/markdown.tsx`、`packages/flux-renderers-ai/src/styles.css`

- Item Types: `Fix | Decision`

- [ ] `markdown.tsx:40` 移除 `prose prose-sm dark:prose-invert`，保留 `max-w-none break-words`（Decision：横向溢出防护工具类与死插件类无关，保留）
- [ ] `styles.css` 新增 `[data-slot="ai-bubble-markdown"]` scoped 规则：元素集与 token 数值以 product-spec.md 排版节奏表裁定为契约（建议基线 h1–h6 / p / ul / ol / blockquote / pre / code / a / table / hr / img / strong / em；任务列表归 D0 最终裁定）；总新增 ≤150 行；颜色/间距优先引用 CSS variables（`--muted` / `--muted-foreground` / `--border` / `--background` 等）
- [ ] Decision——dark 双轨实现：主题 variables 经 `:root` + `[data-theme][data-mode]` 解析（`packages/theme-tokens/src/styles.css`），var-only 的 media-query 块在无 attribute 的 standalone host 中无法生效暗色；因此暗色规则采用「CSS variables + 包级自定义属性 fallback（字面暗色值）」双轨，与 `flux-renderers-mobile/src/styles.css:49-59` 既有 dark pattern 对齐；两条触发路径 `@media (prefers-color-scheme: dark)` 与 `[data-mode='dark']` 都覆盖
- [ ] 视觉抽查（playground hardcode `data-mode='light'`，见 `apps/playground/src/main.tsx:15`）：亮态直接看 widgets demo（D1 fixture 提供富内容）；暗态用 devtools `prefers-color-scheme: dark` 模拟 + 手动改根元素 `data-mode` 属性两法各抽查一次，markdown 元素均有样式、无浏览器裸默认残留（结果记 daily log）

Exit Criteria:

- [ ] `grep -c "prose" packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/markdown.tsx` 输出 0
- [ ] `styles.css` 新增段 ≤150 行且 selector 前缀统一（grep 可核对）
- [ ] rich-text 路径零触碰（`git diff` 不含 `src/rich-text/`）
- [ ] Phase 1 断言全部转绿；`pnpm --filter @nop-chaos/flux-renderers-ai test` 全过（既有 markdown-content / markdown-buffer 断言零破坏）

## Draft Review Record

- Reviewer / Agent: fresh session `ses_fce51a8fcffe1E192HNgQ6lMR9`（2026-08-24）
- Verdict: `pass`
- Rounds: 1
- Findings addressed: （全部 Minor，不阻塞；①②③⑤ 已采纳修正）① Proof/Fix 顺序——已重构为 Phase 1 断言先行 red 锁定；② 暗态抽查机制——已写明 devtools media 模拟 + 手动改根 `data-mode` 两法（playground hardcode light，`main.tsx:15`）；③ var-only media-query 在 standalone host 无法生效暗色——已落 Decision「CSS variables + 包级字面暗色 fallback」双轨（对齐 `flux-renderers-mobile/src/styles.css:49-59` 先例）；④ 元素集以 D0 spec 裁定为契约（已显式写明）；⑤ roadmap 字面「计算样式测试」——已注明以 CSS 源文本断言落实（repo 先例 mobile-styles.test.ts 等），computed-style 归 DV e2e

## Closure Gates

- [ ] G2 收口：prose 死类移除 + 自定义 typography 生效（断言 + dev 实跑抽查记录）
- [ ] ≤150 行 CSS 红线未超；selector 前缀统一
- [ ] `src/rich-text/` 零触碰（独立 scope 未被越界修改）
- [ ] focused verification：新增 typography 断言全过 + 包级测试全绿
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [ ] owner-doc：无需逐 phase 更新（G11 补段与 typography 段落统一归 DG；按 plan guide Rule 17，本 plan 不改架构语义）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### rich-text / tiptap-sender 的 `prose max-w-none`

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: rich-text 是 opt-in 子路径（host 显式 import 才进 bundle），Tiptap 由 A6 P6 plan 单独 ownership 跟踪；roadmap D2 明确排除以免越界耦合。本 plan 只收口 ai-bubble markdown 公共路径。
- Successor Required: `no`
- Successor Path: 无（rich-text scope 由其 lineage 独立跟踪；如未来需要由彼时 owner plan 处理）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link>>

Follow-up:

- 明确写 no remaining plan-owned work
