# DG 收口：owner-doc 同步 + closure log + mission closeout

> Plan Status: completed
> Last Reviewed: 2026-08-25
> Source: `docs/backlog/ai-widgets-product-roadmap.md` §DG + D4/D5/D6 plans 的 Non-Blocking Follow-ups（DG 注记归属）
> Mission: ai-widgets-product
> Work Item: DG 收口：owner-doc 同步 + closure log + mission closeout
> Related: DV plan（`docs/plans/2026-08-25-0215-1-dv-full-verification-e2e.md`，前置依赖）；D0–D6 plans（全部 completed）

## Purpose

mission `ai-widgets-product` 的收口 plan：owner-doc 同步（design.md 新增 `ai-bubble-typography` 段收口 G11、renderers.md 补 avatar / `setSenderDraft` / `ai:regenerate` 章节）、登记 D6 遗留的 content 包 diff-view 高亮缺陷（bug 167）并路由 successor、写 closure log（G1–G12 闭合 checklist + 6 条措辞偏差注记）、roadmap DV/DG 翻 `done`、备齐 mission closeout 材料。本 plan 是 roadmap 最后一项；mission 是否 closeout 由 engine 依审计轮次决定，本 plan 只负责把材料备齐。

## Current Baseline

- **前置**：D0–D6 全 done；DV plan（`2026-08-25-0215-1`）已起草，本 plan 在 DV 完成后执行（依赖关系 DV → DG，roadmap Dependency Graph）。
- **design.md（live 核对）**：无任何 typography 章节（grep `typography` 0 命中）——G11 doc gap 待补（roadmap §DG：新增 `### ai-bubble-typography` 段，D2 已落地的自定义 CSS 方案 + 拒绝 `@tailwindcss/typography` 决策 + dark 双触发，设计输入 = product-spec §2）。§10.4 LaTeX/KaTeX 段已由 D6 回填实现 plan 链接（`design.md:378` 区域，supersession 链完整）。
- **renderers.md（live 核对）**：`setSenderDraft` **0 命中**（D4 落地的 ComponentHandle 方法未成文）；`ai-bubble-avatar` slot 只在结构草图出现（:217）+ `avatarRegion` 自定义位（:128），D3 的 lucide `<Bot/>`/`<User/>` 默认渲染 + 32×32 圆形规格 + `showAvatar` 转发链未成文；`ai` namespace 8 action 清单与 `ai:regenerate`（truncate-rerun 语义）未成文（:141 只写 `engine.regenerate`，:707 有 `ai:clear` 示例）。
- **bug 登记（live 核对）**：`docs/bugs/` 最高编号 **166**。D6 Non-Blocking Follow-ups 指定本 phase 登记 content 包缺陷并路由 successor：`packages/flux-renderers-content/src/diff-view/adapters/syntax-highlight.ts:7` 裸 `createLowlight()` 注册零 grammar，`highlight()` 每次经 catch 静默回退 `escapeHtml`（:44-76），三个 diff 视图（diff-split / diff-unified / diff-three-column）消费的语法高亮从未生效——**下一个编号为 167**。content 包不在 mission 授权目录（四处 = flux-renderers-ai + apps/playground + tests/e2e + docs/components/flux-renderers-ai），只登记不修复。
- **待注记偏差 6 条（D4/D5/D6 收口记录指定 DG 处置）**：
  1. D4：roadmap §D4 / product-spec §7「refresh → assistant 消息数 +1」措辞 vs live truncate-rerun（计数不变 + branchId 更新）——product-spec §7 行已由 DV 修正，本 plan 在 closure log 注记 roadmap 侧措辞差异。
  2. D4：roadmap §D4「失焦 / 显式触发时执行」draft-race 措辞被 D-race 裁定舍弃（append-保留 + dedupe 交付其意图）。
  3. D5：roadmap §D5「3 个缩略卡」vs 实装 2 卡 + reasoning 例外；「fixture A–F 每个 ≥1 种新 widget 触发」vs D-c 三类专属触发分布。
  4. D5：product-spec §6.1 form-1 字面规则（distinct slot 计数排除 4 常驻件）与其自述「现状 = 6」自相矛盾（嵌套 slot 实测基线 >8）——showcase spec (a) 按 §6.2 目标清单白名单为可执行口径。
  5. D6：supersession 链中 plan A3 指向从未起草的占位路径（`2026-08-23-0002-1-a7-d6-latex-impl.md`）——D6 plan 即真身，`design.md:378` 已回填 canonical 指针（按 plan guide Rule 21 不回写历史计划）。
  6. D6：roadmap §Cross-Cutting「try/catch dynamic require 缺失降级」措辞被 Decision D-b 按硬 peer 语义 supersede。
- **roadmap 状态区**：Work Item Status 表是全文件唯一动态区；DV/DG 翻 `done` 须在各自 closure-audit 通过后。roadmap Rule 另要求：本图 closure 时由 **human gate 显式签字承认「双向范围独立声明」的单向性**（反向 ack 留待 ai-invariant-loop 下一轮修订）。
- **mission closeout 决策权**：归 engine（依审计轮次），本 plan 不自行宣布。

## Goals

- design.md 新增 `### ai-bubble-typography` 段（G11 收口：scoped 自定义 CSS + 体积决策 + dark 双触发 + D2/D6 落地事实）。
- renderers.md 补齐三块：ai-bubble avatar 章节（lucide 默认 + 32×32 圆 + `avatar` ReactNode 扩展位 + `showAvatar` 转发链）、`setSenderDraft` 段（append/replace mode + dedupe 语义 + cid 隔离）、`ai` namespace action 清单 + `ai:regenerate` 段（truncate-rerun 语义）。
- bug 167 登记（content 包 diff-view 高亮零注册）+ successor 路由注记。
- closure log 写入 daily log：G1–G12 逐条闭合 checklist（gap → 闭合 phase → 证据锚点）+ 各 phase 收口摘要 + 6 条偏差注记。
- roadmap DV/DG 翻 `done`；human gate 签字项（单向声明）显式登记为待签；mission closeout 材料备齐。

## Non-Goals

- 不修复 content 包 diff-view 缺陷本体（越权目录；只登记 bug 167 + 路由 successor）。
- 不回写 `docs/analysis/2026-08-23-ai-widgets-vs-tiny-robot-comparison.md` 与历史 plans（plan guide Rule 21；A3 占位差异只在 closure log 注记）。
- 不改 roadmap 相位正文措辞（roadmap Rule：动态区仅 Work Item Status 表；措辞差异走 closure log 注记）。
- 不宣布 mission closeout（engine 依审计轮次决定）。
- 无代码行为变更（纯文档 + 收口 plan；typecheck/build/lint/test 按 plan guide 模板从 Closure Gates 豁免）。

## Scope

### In Scope

- `docs/components/flux-renderers-ai/design.md`：新增 `### ai-bubble-typography` 段。
- `docs/components/flux-renderers-ai/renderers.md`：ai-bubble avatar 章节更新 + `setSenderDraft` 段 + `ai:regenerate` / namespace action 清单段。
- `docs/bugs/167-*.md`：新 bug note（按 `docs/bugs/00-bug-fix-note-writing-guide.md` 格式）。
- `docs/logs/{year}/{month}-{day}.md`：closure log。
- `docs/backlog/ai-widgets-product-roadmap.md`：仅 Work Item Status 表 DV/DG `todo → done` 翻转。

### Out Of Scope

- 一切 `packages/` 与 `apps/` 源码、`tests/` 测试代码。
- product-spec §7 refresh 行（DV 已修）；§6.1 form-1 字面规则仅注记不改文。

## Test Strategy

本档选择：**不适用：纯文档 + 收口登记，无代码行为变更**；可验证性由 Closure Gates 的 grep / 文件存在性 / 独立 closure-audit 承担。

## Execution Plan

### Phase 1 - owner-doc 同步（design.md + renderers.md）

Status: completed
Targets: `docs/components/flux-renderers-ai/design.md`、`docs/components/flux-renderers-ai/renderers.md`

- Item Types: `Fix`

- [x] design.md 新增 `### ai-bubble-typography` 段：scoped `[data-slot="ai-bubble-markdown"]` 自定义 CSS（h1-h6 / p / 列表 / blockquote / pre / code / a / table / hr / img）、拒绝 `@tailwindcss/typography` 的体积依据（tarball ~25-30KB / unpacked ~78KB / gzip ~17KB）、dark 双触发（`prefers-color-scheme` + `[data-mode='dark']`）、D6 增量（`.katex` 容器排版 + `.tok-*` token 配色）。内容以 product-spec §2 为设计输入、以 live `styles.css` / `markdown.tsx` 为事实基准（只写最终设计状态，不写 Proposed vs Current）。
- [x] renderers.md ai-bubble 章节：avatar 段——lucide `<Bot/>`（assistant）/ `<User/>`（user）默认渲染 + `data-role` + 32×32 圆形 token 规格 + `avatar?: ReactNode` 扩展位 + `showAvatar` 从 ai-chat / ai-message-list 的转发链。
- [x] renderers.md 新增 `setSenderDraft` 段：`component:setSenderDraft` ComponentHandle 方法（args `{ text, mode?: 'append' | 'replace' }`，默认 append；`\n` join 保留键入、同值 dedupe、cid 隔离、缺 text 拒绝）。
- [x] renderers.md 新增 `ai` namespace action 清单段：8 action（send / abort / clear / createConversation / switchConversation / deleteConversation / renameConversation / **regenerate**）+ `ai:regenerate` 的 truncate-rerun 语义（丢弃尾部 assistant 轮次重新请求、计数不变、`branchId` 更新、busy 拒绝）。

Exit Criteria:

- [x] `grep -n "ai-bubble-typography" docs/components/flux-renderers-ai/design.md` ≥ 1 段命中。
- [x] `grep -n "setSenderDraft\|ai:regenerate" docs/components/flux-renderers-ai/renderers.md` 各 ≥ 1。
- [x] renderers.md avatar 段含 32×32 / lucide / showAvatar 三个关键词。
- [x] 新段落与 live 行为零矛盾抽查：`ai-action-provider.ts` 的 `AI_NAMESPACE_ACTIONS` 8 项字面清单、`ai-component-handle.ts` 的方法面、`ai-bubble/index.tsx` avatar 默认渲染——文档清单与代码逐一对应。

### Phase 2 - bug 167 登记 + successor 路由

Status: completed
Targets: `docs/bugs/167-diff-view-lowlight-zero-grammar-registration.md`（新文件）

- Item Types: `Fix | Follow-up`

- [x] 按 `docs/bugs/00-bug-fix-note-writing-guide.md` 格式登记：根因（`syntax-highlight.ts:7` 裸 `createLowlight()` 零 grammar 注册）、影响面（`packages/flux-renderers-content/src/diff-view/components/diff-{split,unified,three-column}-view.tsx` 三视图（imports :6/:5/:7）高亮从未生效、catch 静默回退掩盖）、发现来源（ai-widgets-product D6 执行期 cross-package 复核）、修复方向（`createLowlight(common)` 或按需 register——参考 D6 `markdown.tsx` 同款接法）。
- [x] successor 路由注记：归属 content 包 owner（候选 = ai-invariant-loop 轮次或独立修复 plan），明确不属本 mission scope。

Exit Criteria:

- [x] `docs/bugs/167-*.md` 存在且含 file:line 锚点 + 修复方向 + successor 路由。
- [x] bug note 不含本 mission 已修的虚假范围（content 缺陷与本 mission 代码零交叠）。

### Phase 3 - closure log + roadmap 翻转 + closeout 材料

Status: completed
Targets: `docs/logs/{year}/{month}-{day}.md`、`docs/backlog/ai-widgets-product-roadmap.md`

- Item Types: `Follow-up | Decision`

- [x] closure log：G1–G12 逐条闭合 checklist（gap 描述 → 闭合 phase → 证据锚点 file:line / spec / test 名），G5 注记 human gate supersession 链。
- [x] 各 phase 收口摘要（D0–D6 + DV）+ full-green 验证状态（引用 DV 收口记录）。
- [x] 6 条偏差注记逐条落档（Current Baseline 所列 1–6，措辞差异不回写 roadmap / 历史计划原文）。
- [x] roadmap Work Item Status 表：DV / DG 按 roadmap 状态机流转（`todo → planned`：draft review 通过时；`planned → done`：各自 closure-audit 通过后，不得提前；本 plan 自身的 `done` 在本 plan closure-audit 后）。
- [x] human gate 待签项登记：双向范围独立声明的单向性签字（roadmap Rule 明示要求，本 plan 不代签）。
- [x] mission closeout 材料核对单：roadmap 全 phase done 状态 + closure log 完整 + 偏差注记齐备 + bug 167 已路由——供 engine 决策引用。

Exit Criteria:

- [x] daily log 含 G1–G12 全闭合 checklist（12/12，每条有证据锚点）。
- [x] 6 条偏差注记全部落档（可 grep 到关键词：truncate-rerun / D-race / 缩略卡 / §6.1 / A3 占位 / D-b）。
- [x] roadmap Work Item Status 表 DV/DG 状态与各 plan closure-audit 状态一致（无提前翻转）。

## Draft Review Record

- Reviewer / Agent: fresh session `ses_fcafea945ffeUK7jifCcCM3YXY`
- Verdict: `pass`（round 1：0 Blocker / 0 Major / 3 Minor）
- Rounds: 1
- Findings addressed（Minor 一并修正）：
  - roadmap 翻转措辞补全状态机 `todo → planned → done`（原只写 `todo → done`）。
  - Closure Gates 的 `setSenderDraft` grep 目标明确为 `renderers.md`（原缺目标文件，源码侧字串 trivially 命中会误判通过）。
  - content 包三消费者路径补全 `diff-view/components/` 段（bug note 锚点精确性）。
  - 审计核实：D4/D5/D6 follow-up 全覆盖（6 注记 + bug 167，无漏项；D4 refresh schema 显式覆盖已裁定无 successor，正确排除）；mission 授权目录外文档治理（bugs/logs/backlog）有 roadmap §DG 使命指派 + D6 收口裁定 + AGENTS.md daily-log 义务三重依据，判合理。

## Closure Gates

- [x] G11 owner-doc gap 收口：design.md `ai-bubble-typography` 段存在且与 live `styles.css` 一致。
- [x] renderers.md 三块补齐（avatar / setSenderDraft / ai:regenerate）且与代码清单逐一对应。
- [x] bug 167 已登记并路由 successor（content 包缺陷不残留为无主 debt）。
- [x] grep 验证（roadmap §DG 完成判定）：`prose prose-sm` 字串在 `packages/flux-renderers-ai` 的 `markdown.tsx` 0 命中（**rich-text/tiptap-sender.tsx 的 `prose max-w-none` 独立 scope 不计入**）；`setSenderDraft` 字串在 `docs/components/flux-renderers-ai/renderers.md` ≥ 1；`ai-bubble-typography` 段在 `design.md` 存在。
- [x] closure log 写入（G1–G12 checklist + phase 摘要 + 6 条偏差注记 + full-green 引用）。
- [x] 6 条 D4/D5/D6 follow-up 注记全部处置（无静默丢失）。
- [x] roadmap DV/DG 翻转与 closure-audit 状态一致；human gate 待签项已登记（不代签）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] 纯文档计划：`pnpm typecheck` / `build` / `lint` / `test` 按模板注释豁免（无代码变更；若执行中意外产生代码 diff 则取消豁免并全量跑）。

## Deferred But Adjudicated

### product-spec §6.1 form-1 字面规则的自相矛盾修文

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: showcase 可执行口径已由 §6.2 目标清单白名单钉死（showcase spec (a) 按此落地且绿）；§6.1 字面规则是 D0 起草期计数口径描述，本 mission 的 DV 断言不依赖它。修文属 product-spec 文字打磨，非 owner-doc 与 live 行为的 contract drift（§6.2 才是执行契约）。
- Successor Required: `no`
- Successor Path: 无（closure log 注记 operationalization 差异即闭环）

### content 包 diff-view 高亮缺陷修复本体

- Classification: `watch-only residual`
- Why Not Blocking Closure: 预存在缺陷（早于本 mission），发现于 D6 cross-package 复核；content 包不在 mission 授权目录，修复属 successor plan 职责。登记 bug 167 + 路由后即完成本 mission 侧义务。
- Successor Required: `yes`
- Successor Path: bug 167 note 内路由注记（content 包 owner plan / ai-invariant-loop 轮次）

## Non-Blocking Follow-ups

- roadmap §Cross-Cutting「不新增 check:\* 门禁」的既有承诺维持——若未来需 `check:ai-bubble-math-peer-dep` 类门禁，由 ai-invariant-loop 图评估（非本 mission）。
- `_tmp/ai-widgets-product-snapshot.png` 耐久归宿（承 DV plan 同名 follow-up）。

## Closure

Status Note: 纯文档收口 plan 全部完成——G11 owner-doc gap 闭合（design.md §10.7 + renderers.md §3.1c/§13b/§13c，与 live 代码零矛盾）、bug 167 登记并路由 successor、closure log（G1–G12 12/12 + phase 摘要 + 6 条偏差注记 + full-green 引用）写入 `docs/logs/2026/08-25.md`、roadmap 状态机无提前翻转、human gate 待签项与 mission closeout 材料备齐。唯一 Minor（design.md「≤150 行红线」措辞可误读为全文件上界）已按审计建议修正为「D2 增量 150 行贴红线」。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent session `ses_fcac4369fffemymHQo7dvU0v9n`（非执行 session，三件套 fresh-context 输入：plan + diff 摘要 + 验证输出）
- Evidence: verdict **approved**（0 Blocker / 0 Major / 1 Minor non-blocking）——7 门逐项 PASS：plan checklist 一致性（audit 项审计时未勾）、Phase 1 live-code 零矛盾抽查（`AI_NAMESPACE_ACTIONS` 8 项 / `AI_COMPONENT_METHODS` 7 项 / setSenderDraft 语义 / avatar 默认渲染 / styles.css 双 dark 触发与 `.katex`/`.tok-*` 逐项命中）、bug 167 锚点 live 核实（:7 裸构造 + 三消费视图 + 参照修复 :112）、closure log 6 关键词 grep、roadmap DG 未提前翻转、deferred 诚实性、`git status` 仅 docs diff + 审计独立复跑 `pnpm check` exit 0。Minor 见 Status Note（已修正）。

Follow-up:

- bug 167（content 包 diff-view 高亮零注册）已路由 successor（content 包 owner：ai-invariant-loop 轮次或独立修复 plan），非本 plan-owned work。
- human gate 待签：双向范围独立声明的单向性签字（roadmap Rule，engine/human 处置）。
- mission closeout 决策归 engine（依审计轮次）；材料核对单已备（closure log）。
- 无其他剩余 plan-owned work。
