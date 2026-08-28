> Audit Status: closed（原 planned：3 条 P1 已路由 remediation plan `docs/plans/2026-08-25-0410-1-ai-bubble-math-delimiter-pipeline-remediation.md` 并于 2026-08-25 全部修复收口（P1-1 code 掩码统一 + fence 口径收敛 / P1-2 Decision (b) 渲染前货币消歧 / P1-3 `\(`/`\[` 配对映射渲染 + design.md §10.4 定界符语义表，proof 先红后绿，见该 plan Closure 节 + `docs/logs/2026/08-25.md`）；5 条 P2 已登记 `docs/backlog/audit-followups-2026-08-24-0803.md` 跟踪）
> Audit Type: open-ended
> Mission: ai-widgets-product

# Open-Ended Adversarial Audit — Mission `ai-widgets-product`

**Date:** 2026-08-25 · **Executor:** opencode（per `docs/skills/open-ended-adversarial-review-prompt.md`, mission-driver `2026-08-24-080355-mission-driver`）
**Scope:** mission 授权面 — `packages/flux-renderers-ai/`（D2/D3/D4/D6 触及的 renderers / adapters / schemas / styles / package.json / 新增测试）+ `apps/playground/src/{ai/,pages/ai-widgets-demo.tsx,styles.css}` + `tests/e2e/ai-widgets-*.spec.ts` + owner docs（`docs/components/flux-renderers-ai/{design,renderers,product-spec}.md`）。Mission diff base: `9f0a2299f^..HEAD`（D1–DG, +2777/−83）。
**Method:** 全量读 mission-changed 文件 + 交叉核对 `AGENTS.md` / `docs/skills/react19-best-practices-review.md` / `docs/backlog/ai-widgets-product-roadmap.md` / DG closure log（`docs/logs/2026/08-25.md`）；对 markdown 管线做了 **live probe 验证**（临时 vitest probe 于 `packages/ui/`，运行后已删——发现 1/2 均为运行证实而非纯静态推断）；机械门禁复核：`pnpm --filter @nop-chaos/flux-renderers-ai test` 764/764 pass、工作树 clean。
**去重基线:** `docs/audits/2026-08-10-2245-open-audit-ai-invariant-loop.md`（R1-F1 + 8×P2）、`2026-08-09-1826`、07-23/07-24/07-25 AI 审计批、`docs/bugs/166/167`（已登记不重报；bug 166 的 G10 半闭合注记在 DG closure log 中已如实记录）。本轮所有条目均为新发现。
**视角:** 契约考古学家（human-gate 裁定 vs 实装能力）+ 异常路径侦探（buffer 无流终止概念 → 完成态永久截断）+ 跨边界信使（peer-dep 治理 katex vs lowlight 不对称）+ 组合爆炸测试者（dark-OS × forced-light host）。

## Priority Summary

| Priority | Count | Drives remediation plan? |
| -------- | ----- | ------------------------ |
| **P0**   | 0     | —                        |
| **P1**   | **3** | **Yes**                  |
| **P2**   | 5     | No（follow-up backlog）  |

**Outcome:** audit has issues → remediation plan must cover the 3 P1s; the 5 P2s triage to follow-up backlog.

---

# P1 Findings (material — must fix)

## [P1-1][P1] `$$` 奇偶扫描把 fenced code 内的 `$$` 计入 math 定界符——含 `$$` 的**已完成**消息被永久截断（probe 实证）

_Justification: incorrect behavior on realistic, high-frequency input (bash `$$` PID / PHP `$$var` / Make `$$` escape are all common in AI code answers), permanent (the stateless buffer re-cuts completed messages on every render), and D6 introduced the exact masking utility (`maskCodeRegions`, "dollars inside code are literal") but wired it only into the single-`$` scanner — a same-family missed member inside the very function D6 extended._

- **Where:** `packages/flux-renderers-ai/src/renderers/ai-bubble/markdown-buffer.ts:102-107`（`findUnclosedMathCutoff` 的 `MATH_BLOCK` `matchAll` 裸扫全文本，含 fenced/inline code 区域）；`:110-124`（`\[` / `\(` 计数同样不屏蔽 code）；对照 `:146`（`maskCodeRegions` 仅被 `findUnclosedSingleDollarCutoff` 调用）。
- **What（live probe 证实）:** 对一条**已完成**的消息体

  ````
  To see the current shell process id, run:

  ```bash
  echo "PID=$$"
  ````

  That is all.

  ````

  `safeMarkdownSlice` 返回 61/82 字符，永久丢弃尾部 `` $$" ``` `` + `That is all.` —— 代码块内容、闭合 fence 与后续段落从渲染中消失。`$$` 奇偶为 1（odd）→ 在 code 内部的 `$$` 处截断；buffer 是 stateless 的、对完成态文本同样执行（"buffer 无流终止概念"，D6 plan 自己在单美元风险分析里用过的原话，`$$` 路径没有享受到同等口径）。
  ````

- **Why it matters:** 任何真实 LLM 回答包含 bash 脚本（`$$` = PID）、PHP（variable variables）、Makefile（`$$` 转义）时，回答尾部静默消失——无错误、无降级提示，用户只看到被腰斩的消息。这直接击穿本 mission 的产品级定位（富 markdown 展示是 G1/G6 的核心交付面），且 fixture/e2e 只用不含 `$$` 的 tsx 代码块，永不可能触发。
- **Root cause:** D6 的 Decision D-a 校准只覆盖单美元扫描器的免疫范围（fenced/inline code/`$$` run/`\$`），没有回填同函数上游的 `$$` / `\[` / `\(` 计数器——同一文件内两套 dollar 语义（masked vs unmasked）并存。
- **Fix direction:** 在 `findUnclosedMathCutoff` 里对 `MATH_BLOCK` / `MATH_BRACKET_OPEN` / `MATH_INLINE_OPEN` 的计数套用同一 `maskCodeRegions` 掩码（或先把 code 区域替换为占位符再计数）。顺带收敛两套 fence 识别的口径差：`findUnclosedFenceCutoffForKind` 的 `(^|\n)(`{3,})`不认 ≤3 空格缩进 fence，而`maskFencedCode`的`^ {0,3}`认——缩进 fence 在两个扫描器里一个不算 fence 一个算。回归测试：完成态`bash $$` / PHP `$$var` 消息全文渲染。
- **Confidence:** 确定（live probe：期望全文本，实得 61/82 截断）。

## [P1-2][P1] 单美元货币文本在**完成态**被 remark-math 渲染成乱码数学——D6 的防货币护栏只保护了错误的层（probe 实证）

_Justification: incorrect rendering on extremely common AI-chat content (any sentence with two dollar amounts), proven live: "The plan costs $5 today and $10 tomorrow." renders `$5 today and $` as a KaTeX formula (dollars eaten, prose set as math); the mission's anti-currency work all landed in the streaming-cut layer and its tests assert exactly that wrong layer, so the delivered final render is broken while the guard's tests stay green._

- **Where:** `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/markdown.tsx:49`（`remarkPlugins={[remarkGfm, remarkMath]}`，remark-math@6 默认 `singleDollarTextMath: true`）；护栏在 `markdown-buffer.ts:168-174`（open 守卫：`$` 后随非空白非数字才开候选）+ 测试 `markdown-buffer.test.ts:134,140`（"does not truncate currency text"——只断言 buffer 层不截断）。
- **What（live probe 证实）:** 完成态纯文本 `The plan costs $5 today and $10 tomorrow.` 渲染产出 `<span class="katex">…<annotation encoding="application/x-tex">5 today and </annotation>…` —— 两个 `$` 之间的整段散文被当作 TeX 排版（italic math 体、dollars 被吃掉）。buffer 侧（PROBE2b）确实保留了全文——护栏工作正常，但它只能"不截断"，管不住 remark-math 在完成态把 `$5…$` 配对成 math 节点（micromark 对 open 侧**没有**数字守卫——D6 执行裁定自己实测过"任意后续单 `$` 即闭合"，却没有推到这个结论的最终渲染后果）。
- **Why it matters:** 定价、预算、财务、经济类问答是 AI chat 最高频内容类型之一；本 mission 的 human gate 把 LaTeX 定为"产品级必须能力"，但当前实现让最常见的**非数学**文本先坏掉。更糟的是测试签名给人"货币安全已覆盖"的错觉——`markdown-d6-math-code.test.tsx` 无任何货币渲染层用例。
- **Root cause:** 防护落点与失败层错位：截断风险在 buffer（可守），误配对风险在 remark-math 语法（buffer 不可守）。D6 选了开箱默认的单美元解析而未评估 `singleDollarTextMath: false` 选项或渲染前货币消歧。
- **Fix direction（三选一，需 owner 裁定）：** (a) `remarkMath` 传 `singleDollarTextMath: false`，只保留 `$$`/`\(...\)` 形态（同时删除 buffer 单美元扫描器——两处语义必须同步）；(b) 渲染前预处理：对非 code 区域内 `$` 后随数字的形态转义为 `\$`（masking 基建已有）；(c) 保持现状但在 owner-doc 显式登记"两个美元金额的散文会渲染为公式"为已知限制——不推荐，这等于把 P1 记为 wont-fix。回归测试：完成态货币句渲染出普通 `<p>` 且无 `.katex`。
- **Confidence:** 确定（live render probe：输出含 `katex` + annotation `5 today and `）。

## [P1-3][P1] `\(...\)` / `\[...\]` —— 真实 LLM 最主流的公式定界符 —— 永远不渲染为数学；design.md §10.4 把 `\[` 边界写在 LaTeX 交付叙事里，owner-doc 与实装能力漂移

_Justification: contract drift vs the mission's own human-gate bar ("LaTeX 渲染为产品级 AI chat 实际应用必须能力")：remark-math@6 只解析 `$`/`$$`（D6 plan 自己 live 核实并写明"\[...\] 不会产出 math 节点"），buffer 却把 `\(`/`\[` 当 math 边界追踪、design.md:378 把"markdown-buffer.ts 扩展 \[ 块级公式边界"与 LaTeX 内置决策写在同一条裁定里——host 读 owner-doc 会认为 `\[` 公式可用，实际渲染为字面 `\[`。_

- **Where:** `markdown.tsx:49`（插件链仅 remark-math，无 `\(`/`\[` → `$`/`$$` 的预处理）；`markdown-buffer.ts:22-25,110-115`（`\(`/`\(`/`\[`/`\]` 被 buffer 当 math 定界追踪——完成后渲染为字面量，被持有的"保护"保护的只是一个最终不会成为数学的字符串）；`docs/components/flux-renderers-ai/design.md:378`（supersession 记录将 `\[` 边界扩写进 LaTeX 交付物清单，未注明"仅 buffer 边界、不渲染"）；`docs/plans/2026-08-24-2237-3-d6-latex-code-highlight.md:127`（Decision：fixture 不放 `\[`，因会以字面渲染"污染 showcase"）。
- **What:** OpenAI/Gemini 等主流模型按系统提示约定普遍输出 `\(...\)` / `\[...\]` 形态公式。当前包对这类输出渲染为字面 `\[E=mc^2\]`。D6 对此是知情的（plan:127 明确记录并因此**刻意不让 showcase 演出这个形态**），但该限制只活在 plan 文本里：design.md §10.4（DG 刚同步过的权威 owner-doc）未携带，renderers.md 也未说明支持定界符集合。
- **Why it matters:** 这是"展示面干净、产品面残缺"的典型：showcase 只喂 `$`/`$$` fixture，掩盖了真实接入后最常见输入形态失效。对以"产品级 AI chat"为立项理由的 mission，这属于目标态与交付态的实质落差，且文档层放大了误判风险。
- **Fix direction:** 渲染前预处理（在非 code 区域把 `\(`→`$`、`\[`→`$$`、`\)`→`$`、`\]`→`$$` 做定界符映射——`maskCodeRegions` 基建可直接复用）；或在 design.md §10.4 / renderers.md 显式登记"仅支持 `$`/`$$` 定界符"为契约边界并从 buffer 边界清单同步降级 `\(`/`\[`。二者取一，不能维持现状的模糊。
- **Confidence:** 确定（D6 plan:127 的 live 核实记录 + 插件链代码审读；design.md:378 原文比照）。

---

# P2 Findings (non-blocking — follow-up backlog)

## [P2-1][P2] D2 dark 双触发的 media 轨没有 light 强制出口——standalone host（未定义 token 集）在 dark-OS + `data-mode='light'` 下会得到近白前景色

_Justification: real hole but conditional: on token-defined hosts (playground) the dark media track is a no-op because every `hsl(var(--*, literal))` resolves to the forced-light var value, but a standalone host importing only the package `styles.css` with `data-mode='light'` + dark OS gets the literal dark fallbacks (e.g. `--ai-md-fg: hsl(210 40% 98%)`) on their own light page → near-invisible text; the roadmap's own alignment citation (theme-compatibility.md dual-axis) prescribes attribute-keyed override, which cannot lose to the media query._

- **File:** `packages/flux-renderers-ai/src/styles.css:277-301`（typography；同构问题 :332-344 avatar、:357-365 welcome）；`apps/playground/src/main.tsx:15`（playground 硬编码 `data-mode='light'`，注释自认 dark toggle 是 tech debt）；DV dark e2e（`ai-widgets-demo.spec.ts:252-259`）自己的注释承认"media 轨的 literal fallback 在 playground 永不生效"——即 media 轨在参考 host 上是死代码，在最小 host 上是误伤面。
- **Fix direction:** media 轨加 `:root:not([data-mode='light'])` 前缀（或等效 guard），让显式 light 永远获胜。
- **Confidence:** 确定（CSS 级联分析 + DV 测试注释互证）。

## [P2-2][P2] `lowlight` peer dep 未被参考 host 声明——mission 自己的"host 必须安装 peer"治理对 katex 执行了、对 lowlight 漏了

_Justification: governance drift with a concrete break vector: `flux-renderers-ai` peers on `lowlight@^3` and imports it (`markdown.tsx:7`), `apps/playground/package.json` only added `katex`; resolution today silently rides on pnpm auto-install-peers / transitivity through `flux-renderers-content`, whose own lowlight usage is registered-broken (bug 167) and a candidate for removal — remove it and the showcase's code highlight fails to resolve at build time for reasons nobody declared._

- **File:** `packages/flux-renderers-ai/package.json`（peerDeps 新增 `lowlight@^3.0.0`）vs `apps/playground/package.json:46`（仅 `katex`）；roadmap §D6 把"复用 content 包 lowlight、0 增量依赖"作为选型理由，但 peer 语义下"0 增量"成立的前提正是 host 显式安装——katex 得到了这个待遇，lowlight 没有。
- **Fix:** playground `dependencies` 补 `lowlight@^3`（一行）。
- **Confidence:** 确定（manifest 比对）。

## [P2-3][P2] `ai-feedback` 的 `voted` 本地镜像不从 `message.metadata.feedback` 播种——虚拟列表回收/分支切换重挂载后视觉态与 D4 写入的持久 metadata 脱钩

_Justification: the D4 "real side effect" writes `metadata.feedback` (persistent) while the visual mirror is unseeded local state: `ai-message-list` virtualizes above a threshold (`useVirtualizer`, A-8) and branch switches swap message sets, so a liked message that remounts renders un-liked while its metadata still says `like` — the two representations D4 deliberately coupled diverge on remount._

- **File:** `packages/flux-renderers-ai/src/renderers/ai-feedback.tsx:101`（`useState<'like'|'dislike'|null>(null)`，未读 `message.metadata.feedback`）vs `:71-76`（`writeFeedbackMetadata` 原地写 message 对象）。修复一行：`useState(() => (message?.metadata?.feedback as 'like'|'dislike'|null) ?? null)`。
- **Confidence:** 很可能（虚拟化/分支重挂载路径静态可证，未运行态复现）。

## [P2-4][P2] `component:setSenderDraft` 无法清空草稿——空 `text` 一律拒绝，`mode:'replace'` + `''` 也报错

_Justification: minor contract gap: replace 语义下空串是合法的"清空"意图，当前被与缺参一起拒绝（`ai-component-handle.ts:156-158`），host 没有任何经由 handle 清空输入框的路径（用户手删除外）。_

- **File:** `packages/flux-renderers-ai/src/adapters/ai-component-handle.ts:154-167`。
- **Confidence:** 确定。

## [P2-5][P2] mission 新增 3 处手写 `useMemo`——按 `docs/skills/react19-best-practices-review.md` 属冗余（Compiler 自动处理），记录备收敛

_Justification: react19 review doc 明确"不要为新代码引入手写 useMemo"；本批新增 `ai-chat.tsx:257`（draft store 工厂）、`ai-widgets-demo.tsx:198,200`（env/loader）。三处均延续所在文件的既有 AI-31 模式且带理由注释、`react-compiler` lint 无告警，故仅记为风格收敛项，不驱动 remediation。_

- **Confidence:** 确定（doc 条文 + diff 比对）。

---

# 总评（free-form）

这个 mission 的过程治理是近年批次里最扎实的（偏差注记 6/6、bug 166/167 如实登记、drift-guard 测试、fresh-session closure audit 链完整），但恰恰在它立项的核心卖点——"富 markdown 产品级渲染"——上，三条 P1 全部落在**同一根管线的层间错位**上：**buffer 层、remark 语法层、owner-doc 层三者对"什么算数学定界符 / 什么该被保护"各持一套口径**。`$$` 在 code 里被 buffer 当数学（P1-1）、货币美元被 remark-math 当数学而 buffer 管不着（P1-2）、`\[` 被 buffer 和 design.md 当数学而 remark-math 根本不认（P1-3）。D6 对单美元做了 micromark 级的语义校准，却把校准成果只装进了一个扫描器——这是"校准了模型、没校准系统"的形态。下一轮最值得做的不是逐个补丁，而是给这条管线立一张**单一事实表**（哪些定界符、在哪些层、各自的行为），让 buffer/插件配置/文档/测试四处从同一张表生成或对齐。

次级方向：peer-dep 治理出现了"同类不同判"（katex 显式安装、lowlight 隐式搭车），建议把"host 必须显式安装全部 hard peers"写进 DG 级 checklist 而不是靠 phase 内自觉。

# 本次审查的盲区自评

- **运行态盲区：** P1-1/P1-2 有 live probe 实证，但 P2-1（standalone host dark-OS 组合）与 P2-3（虚拟化重挂载脱钩）未起真实浏览器/长列表复现，结论依赖级联分析与代码路径推证。若下一轮验证，宜各补一个 playground 级集成用例。
- **未深挖面：** engine/adapters 未改动部分未做本轮重扫（07-23→08-11 四批审计已覆盖）；`product-spec.md` §7 断言矩阵与 14 个 e2e 面的逐行比对只做了抽查（closure log 自称 14/14，抽查未见虚报）；rich-text/tiptap 子路径按 roadmap 裁定独立 scope，本轮未入。
- **下一轮切入点：** 顺着 P1-3 的"展示面干净、产品面残缺"模式，最值得再探的是 fixture 关键词分发对**中文输入**的覆盖（`pickAiWidgetsFixture` 仅英文 keyword，中文提问全部落入 default preset——旗舰 demo 的中文用户永远看不到富 fixture；这与 G1"示例内容贫瘠"的原始痛点同构，本轮时间所限未及展开验证 e2e 层影响，留给下一轮）。

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
