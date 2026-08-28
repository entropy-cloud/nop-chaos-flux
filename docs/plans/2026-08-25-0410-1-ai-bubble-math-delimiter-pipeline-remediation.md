# 1 ai-bubble Markdown 数学定界符管线收敛（P1×3 remediation）

> Plan Status: completed
> Last Reviewed: 2026-08-25
> Source: `docs/audits/2026-08-24-0803-open-audit-ai-widgets-product.md`（P1-1 / P1-2 / P1-3，均 live-probe 或代码比照证实）
> Related: `docs/backlog/ai-widgets-product-roadmap.md`（D6 phase）、`docs/plans/2026-08-24-2237-3-d6-latex-code-highlight.md`（D6 实现 plan，已完成）、`docs/backlog/audit-followups-2026-08-24-0803.md`（本审计 P2 backlog）

## Purpose

把 `ai-bubble` markdown 管线对"数学定界符"的三层口径（buffer 截断层、remark 渲染层、owner-doc 层）收敛到同一张语义表，修复 2026-08-24 open-audit 的 3 条 P1：code 内 `$$` 截断完成态消息（P1-1）、完成态货币美元被 remark-math 渲染为乱码数学（P1-2）、`\(...\)` / `\[...\]` 主流定界符永不渲染且 owner-doc 漂移（P1-3）。

## Current Baseline

（2026-08-25 live 核对：`markdown-buffer.ts`、`renderers/markdown.tsx`、`design.md` §10.4、`markdown-buffer.test.ts` / `markdown-d6-math-code.test.tsx`、`packages/flux-renderers-ai/package.json`）

- `safeMarkdownSlice`（`markdown-buffer.ts:36`）三段式：UTF-16 安全 → fence 奇偶（`:72-94`）→ math 奇偶（`:102-125`）；`maskCodeRegions`（`:201-204`，fenced + inline code 掩码）**只**被 `findUnclosedSingleDollarCutoff`（`:143-182`）使用。
- `findUnclosedMathCutoff` 对 `$$` / `\[` / `\(` 的计数是**裸 matchAll**，不屏蔽 code 区域 → P1-1：完成态消息 fenced code 内的 `$$`（bash PID / PHP `$$var`）被当 math 定界符截断尾部（audit live probe：82 字符被截为 61）。
- fence 识别口径分裂：`findUnclosedFenceCutoffForKind` 的 `(^|\n)({ch}{3,})` 不认 ≤3 空格缩进 fence；`maskFencedCode` 的 `^ {0,3}` 认 → 同一缩进 fence 在两套扫描器里身份不同。
- 渲染层 `markdown.tsx:49` `remarkPlugins={[remarkGfm, remarkMath]}`，remark-math@6 默认 `singleDollarTextMath: true` 且 open 侧无数字守卫 → P1-2：完成态 `The plan costs $5 today and $10 tomorrow.` 的 `$5…$10` 被 micromark 配对为 math，整段散文被 KaTeX 排版（audit live render probe 证实）。buffer 层的防货币护栏（`:168-174` open 守卫 + `markdown-buffer.test.ts:134,140`）只保护截断层，管不住渲染层。
- 插件链无 `\(`/`\[` 预处理 → P1-3：`\(...\)` / `\[...\]` 渲染为字面文本；而 buffer 把 `\(`/`\[` 当 math 边界追踪（`:22-25,110-115`）、`design.md:378` 把"`markdown-buffer.ts` 扩展 `\[` 块级公式边界"写在 LaTeX 内置交付叙事里（owner-doc 与实装能力漂移）。D6 plan `2026-08-24-2237-3` 的 Decision（fixture 不放 `\[`）已 live 核实该限制但未落进 owner-doc。
- 既有测试基线：`pnpm --filter @nop-chaos/flux-renderers-ai test` 764/764 pass（audit 时点）；`markdown-d6-math-code.test.tsx` 覆盖 `$...$` / `$$...$$` 渲染与 math-parse-error 失败路径，无货币渲染层用例、无 `\(`/`\[` 用例。

## Goals

- G1（P1-1）：code 区域（fenced + inline）内的 `$$` / `\(` / `\[` 不再参与 math 截断计数；含 `$$` 的**完成态**消息全文渲染。
- G2（P1-2）：完成态货币文本（两个及以上 `$`+数字）渲染为普通段落文本，无 `.katex` 节点、无美元被吞。
- G3（P1-3）：`\(...\)` / `\[...\]` 定界符在非 code 区域渲染为数学（`.katex` / `.katex-display`）；owner-doc（design.md §10.4 / renderers.md）如实登记支持的定界符集合与边界语义。
- G4（审计总评建议）：buffer 扫描器、渲染预处理、插件配置、owner-doc、测试五处共享同一张定界符语义表（落在 design.md，作为后续演进的单一事实源）。

## Non-Goals

- 不重开 D6 的依赖裁定（remark-math/rehype-katex/katex peer-dep 结构不变，不引入 streamdown）。
- 不处理本审计 P2 项（dark media guard、lowlight peer、ai-feedback 播种、setSenderDraft 清空、useMemo 收敛）——已登记 `docs/backlog/audit-followups-2026-08-24-0803.md`。
- 不改 sanitize 管线顺序与 `sanitizeHtml` 契约（DOMPurify 仍在 KaTeX 树之前作用于 markdown 源）。
- 不做 fixture 中文 keyword 分发（audit 盲区项，非 finding）。

## Scope

### In Scope

- `packages/flux-renderers-ai/src/renderers/ai-bubble/markdown-buffer.ts`（math 计数掩码化 + fence 识别口径收敛）。
- `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/markdown.tsx`（渲染前定界符预处理接线）。
- 新增预处理模块（建议 `ai-bubble/math-delimiter-preprocess.ts`，或等效位置）及掩码基建的导出/复用。
- `docs/components/flux-renderers-ai/design.md` §10.4、`docs/components/flux-renderers-ai/renderers.md`（定界符契约表）。
- `markdown-buffer.test.ts`、`markdown-d6-math-code.test.tsx`（或新增同级 focused 测试文件）。

### Out Of Scope

- `apps/playground/` fixture / e2e 改动（unit 渲染层证明足够 closure；e2e 增强随 backlog）。
- engine / adapters / 其他 renderers。

## Failure Paths

| 场景编号                     | 触发                                 | 行为                                                                           | 可重试           | 用户可见表现                                  |
| ---------------------------- | ------------------------------------ | ------------------------------------------------------------------------------ | ---------------- | --------------------------------------------- |
| code-dollar-literal          | fenced/inline code 内出现 `$$` / `$` | 字面渲染，不截断、不配对 math                                                  | 否（确定性）     | 代码块完整可见                                |
| currency-no-math             | 非码区 `$` 后随数字（如 `$5`）       | 预处理转义为 `\$`，字面美元                                                    | 否               | 普通文本，无 italic 数学体、无 `.katex`       |
| paren-bracket-math           | 非码区 `\(...\)` / `\[...\]`         | 映射为 `$...$` / `$$...$$` 后由 remark-math 解析                               | 否               | 行内/块级 `.katex`                            |
| math-parse-error             | 闭合但非法的 LaTeX                   | 既有行为保持：KaTeX in-band error（throwOnError:false 语义），其余内容继续渲染 | 否               | 公式位置显示 KaTeX 错误文案，消息其余部分正常 |
| unclosed-delimiter-streaming | 流式进行中 `\(`/`\[`/`$$`/`$` 未闭合 | buffer 照常截断到安全前缀（掩码化后语义不变）                                  | 是（下个 chunk） | 暂缺尾部，chunk 到齐后补全                    |

## Test Strategy

本档选择：**必须自动化**（P1 均为已证实的产品级渲染回归路径；audit 已 live-probe 复现，回归测试先红后绿）。各 Phase 的 Proof 项排在 Fix 项之前。

## Execution Plan

### Phase 1 - Buffer 层 code 掩码统一（P1-1）

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-bubble/markdown-buffer.ts`、`markdown-buffer.test.ts`（或新增 focused 文件）

- Item Types: `Proof | Fix`

- [x] Proof（先红）：新增 buffer 层回归用例——完成态文本 `To see the current shell process id, run:\n\n\`\`\`bash\necho "PID=$$"\n\`\`\`\n\nThat is all.` 期望 `safeMarkdownSlice` 返回全文；同族 PHP `$$var` fenced 用例；inline code `` `$$` `` 用例；掩码后 `$$`奇偶（非码区未闭合`$$` 仍截断）不回归用例。
- [x] Fix：`findUnclosedMathCutoff` 的 `$$`（MATH_BLOCK）、`\[`、`\(` 计数改为只统计 `maskCodeRegions` 未掩码的匹配（复用 Uint8Array 掩码，或先将 code 区域替换为等长占位符再计数，取实现更简者）。
- [x] Fix：收敛 fence 识别口径——`findUnclosedFenceCutoffForKind` 的 `(^|\n)({ch}{3,})` 与 `maskFencedCode` 的 `^ {0,3}` 对齐（统一允许 CommonMark 的 ≤3 空格缩进 fence；截断下标计算须把缩进计入 fence 起点，与 `:92` 的 `fenceStart` 口径一致），并为缩进 fence 补一条两扫描器行为一致的 focused 用例。

Exit Criteria:

- [x] 上述 Proof 用例全部转绿（`pnpm --filter @nop-chaos/flux-renderers-ai test -- markdown-buffer`），且既有 buffer 用例（currency / `$$` / fence 奇偶 / UTF-16）零回归。
- [x] `markdown-buffer.ts` 内不存在对同一文本的"掩码 / 非掩码"两套 dollar 语义（`$$` / `\[` / `\(` 与单 `$` 共用 `maskCodeRegions`）。

### Phase 2 - 渲染层定界符预处理（P1-2 + P1-3 实装半）

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/markdown.tsx`、新增 `math-delimiter-preprocess.ts`（或等效模块）、`markdown-d6-math-code.test.tsx`

- Item Types: `Decision | Proof | Fix`

- [x] Decision（裁定 P1-2 修复方向，三选一）：选 **(b) 渲染前货币消歧**——非 code 区域内 `$` 后随数字的形态转义为 `\$`（`maskCodeRegions` 基建复用）。理由：(a) `singleDollarTextMath: false` 会移除已交付的 `$...$` 行内数学能力（`product-spec.md:174,185` 的 fixture 契约与 D6 测试/e2e 均依赖），等于用另一个 contract break 修本条；(c) 登记"两美元金额渲染为公式"为已知限制 = 把 P1 记 wont-fix，不可接受。选 (b) 的附带契约（写入 G3 的语义表）：**原文本中** `$` 后随数字不保持 `$` 语义（与 buffer 单美元 open 守卫 `:168-174` 同口径、与 `$$`-run 免疫 `:158-161` 同语义；差异注记：buffer 只约束 open 侧，本预处理对 close 侧 `$`+数字同样转义，即 `$x$5` 全字面——语义表如实登记此差异），数字开头的公式用 `$$` / `\(` 形态表达（经映射生成的 `$` 定界符不受货币转义影响）。
- [x] Proof（先红）：`markdown-d6-math-code.test.tsx` 新增渲染层用例——完成态 `The plan costs $5 today and $10 tomorrow.` 期望普通 `<p>`、全文美元字面可见、`container.querySelector('.katex')` 为 null；`\(E = mc^2\)` 行内与 `\[E = mc^2\]` 块级各渲染出 `.katex` / `.katex-display`；**数字开头公式逃生口**：`\(3 \times 10^8\)` 与 `$$5x + 1$$` 均渲染出 `.katex`（前者经映射、后者经 `$$`-run 免疫，二者均不得被货币转义破坏）；code 区域内 `\(` 与 `$5` 保持字面；已转义的 `\$5` 不被二次转义；孤立闭定界符（无前置未闭合 `\[` 的 `a \] b`）不得配对出数学——断言口径为"无 `.katex` 且 `]` 字符可见"（CommonMark 反斜杠转义会消耗 `\`，不断言原始 `\]` 字面）。
- [x] Fix：新增预处理模块（建议 `math-delimiter-preprocess.ts`），对非 code 区域（复用掩码基建，需从 `markdown-buffer.ts` 导出或提取共享）按**固定两遍顺序**执行：**第 ① 遍（货币转义）只作用于原文本的 `$`**——`$` 后随数字、且不属于 `$$`+ run、且未被 `\` 转义、且未被掩码时转义为 `\$`；**第 ② 遍（定界符映射）**——`\(`→`$`、`\)`→`$`、`\[`→`$$`、`\]`→`$$`，仅映射**配对成功**的定界符（自左向右配对，孤立闭定界符保持字面；`\\(`/`\\)` 属反斜杠转义的 `\(` 字面，不参与映射——该退化类登记进语义表即可，不设 proof），映射生成的 `$` 不回头参与第 ① 遍。顺序不可颠倒：先映射后转义会把数字开头的 `\(...\)` 公式错误转义成字面文本。实现须跳过掩码区与既有 `\$`。
- [x] Fix：`MarkdownContentRenderer` 接线——对 `safeMarkdownSlice` 产物先跑预处理再进 `sanitizeHtml` / ReactMarkdown（与 Failure Paths 表中 code-dollar-literal / currency-no-math / paren-bracket-math 行为一致）。

Exit Criteria:

- [x] Phase 2 Proof 用例全部转绿；`$...$` / `$$...$$` / math-parse-error 既有 D6 用例零回归（局部 `pnpm --filter @nop-chaos/flux-renderers-ai test -- markdown-d6`）。
- [x] 预处理为纯字符串函数（无 React / DOM / IO，INV-1 口径不变），掩码基建单一定义点（markdown-buffer 与预处理不各持一份 code 区域识别）。

### Phase 3 - Owner-doc 语义表同步（P1-3 文档半 + G4）

Status: completed
Targets: `docs/components/flux-renderers-ai/design.md` §10.4、`docs/components/flux-renderers-ai/renderers.md`

- Item Types: `Fix`

- [x] Fix：design.md §10.4 增加定界符语义表（buffer 截断层 / 渲染预处理层 / remark-math 层三列），至少覆盖：code 区域字面、`$$` 块级（含 `$$`-run 不受货币转义影响）、`$` 行内（含"原文 `$`+数字不开数学、数字开头公式用 `$$` / `\(` 表达"契约）、`\(...\)` / `\[...\]` 配对映射渲染（孤立闭定界符保持字面）、`\$` 字面；修正 :378 将 `\[` 边界扩写进 LaTeX 交付叙事的漂移（由"仅 buffer 边界"改为与实装一致的"映射后渲染"）。
- [x] Fix：renderers.md 登记支持定界符集合（`$` / `$$` / `\(` / `\[`，及各自的字面例外），消除 host 无从得知定界符契约的现状。

Exit Criteria:

- [x] design.md §10.4 语义表与 Phase 1/2 落地行为逐行一致（含"数字开头公式用 `$$` / `\(` 表达"的限制语）；renderers.md 定界符集合与语义表同源一致。
- [x] 本 plan 改动的 live 行为面（预处理模块、buffer 掩码语义）在 owner-doc 均有对应描述，无新增未记录契约。

## Draft Review Record

- Reviewer / Agent: fresh sub-agent session `ses_fca9a232affeoRI2U1IhYANiRk`（round 1）、fresh sub-agent session `ses_fca96df45ffeRIkR3iLWrHH0eE`（round 2）
- Verdict: `pass-with-minors`（round 2；round 1 为 `revised`）
- Rounds: 2
- Findings addressed:
  - R1-M1 Phase 2 预处理遍序未钉死且自相矛盾（先映射后转义会破坏数字开头 `\(...\)` 公式）→ 已修订为固定两遍顺序（① 原文 `$` 货币转义 → ② 配对映射），并补 `\(3 \times 10^8\)` proof。
  - R1-M2 货币转义缺 `$$`-run 免疫（`$$5x$$` 会被毁）→ 已加 `$$`+ run 豁免条款（对齐 `markdown-buffer.ts:158-161`）并补 `$$5x + 1$$` proof。
  - R2 minors（非阻塞，promote 时顺手采纳）：孤立闭定界符 proof 断言口径改为"无 `.katex` 且 `]` 可见"；Decision 的"同语义"表述补 close 侧差异注记；`\\(` 转义类登记进语义表说明。

## Closure Gates

- [x] 3 条 P1 的 Proof 用例（Phase 1/2 列出的全部）存在且绿：完成态 code 内 `$$` 全文渲染（P1-1）、完成态货币句无 `.katex`（P1-2）、`\(`/`\[` 渲染为数学（P1-3）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope P1 项；本审计 5 条 P2 均已登记 `docs/backlog/audit-followups-2026-08-24-0803.md` 且与本 plan closure surface 不同源。
- [x] 定界符语义表落在 design.md §10.4，buffer / 预处理 / 插件配置 / 文档 / 测试五处口径一致（G4）。
- [x] 受影响 owner docs（design.md §10.4、renderers.md）同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无延期项。）

## Non-Blocking Follow-ups

- e2e 层货币 / `\(` fixture 增强（audit 指出 fixture 只用不含 `$$` 的 tsx 块；unit 渲染层已足 closure，e2e 随后续批次）。

## Closure

Status Note: 3 Phase 全部完成并通过独立 closure-audit。P1-1（code 掩码统一 + fence 口径收敛）、P1-2（Decision (b) 渲染前货币消歧）、P1-3（`\(`/`\[` 配对映射渲染 + owner-drift 修正）全部落地，proof 先红后绿；G4 语义表落在 design.md §10.4 作为定界符单一事实源。全仓 typecheck/build/lint 37/37、`pnpm test` 68/68 tasks、`pnpm check` exit 0 零新增命中。本 plan 无延期项。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent session（task `ses_fca885420ffes1M0fk69RPyr4s`，非执行 session，三件套 fresh-context 输入：plan + diff summary + verification output）
- Evidence: verdict **approved**（0 Blocker / 0 Major / 2 Minor 非阻塞：① `$x$5` close 侧差异注记无独立 proof 用例——与 plan Decision 的"差异注记"scoping 一致，successor 可补一行测试；② design.md `$$` 行 buffer 列未重述掩码免疫——表前导语与 code 行已覆盖，不误导）。审计核对：3 Phase 全 `[x]` 且 live 核实；proof 测试真实断言 P1 行为（含 red-before 推演）；两遍顺序/`$$`-run 免疫/掩码跳过/`\$` 免疫与 Decision 逐条一致；掩码单一定义点（`computeCodeRegionMask` 导出于 markdown-buffer.ts:214，cut 层 :112 与预处理模块 :36 消费，全仓无重复 code 扫描器）；fence 口径对齐（regex `:86` + 行起点截断 `:95` vs `maskFencedCode` `:244`）；语义表 8 行 × 3 层与 live 行为逐行一致（含数字开头公式限制语与 close 侧差异注记）；P2 deferred 诚实（followups backlog :10-14 + 不同源注记 :18）；独立复跑 50/50 proof 绿 + 84 files/781 tests 与执行者声称一致；执行 log `docs/logs/2026/08-25.md` 如实（含 1 例 indented-fence 用例本绿的诚实注记）。

Follow-up:

- `docs/backlog/audit-followups-2026-08-24-0803.md`（5 条 P2 + 1 条盲区切入点）。
- e2e 层货币 / `\(` fixture 增强（Non-Blocking Follow-ups 登记，随后续批次）。
