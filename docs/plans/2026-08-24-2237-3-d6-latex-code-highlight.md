# 03 D6 LaTeX 公式渲染 + 代码高亮 + 流式边界扩展（G5 + G6 收口）

> Plan Status: active
> Last Reviewed: 2026-08-24
> Source: `docs/backlog/ai-widgets-product-roadmap.md` D6；`docs/components/flux-renderers-ai/design.md:378`（2026-08-23 human gate supersession：LaTeX 内置）；`docs/components/flux-renderers-ai/product-spec.md` §2.4 注记 / §7（D0 产物）
> Mission: ai-widgets-product
> Work Item: D6
> Related: `docs/plans/2026-08-24-1045-3-d2-markdown-typography-css.md`（markdown.tsx 同文件 predecessor，D2 已移除 prose）；D5（执行顺序在前，formula/code preset 纯度由 D5 保护）

## Purpose

给 ai-bubble markdown 渲染补上行业 AI chat 基线能力：LaTeX 公式渲染（`remark-math` + `rehype-katex`，supersession 已裁定内置）与 fenced code 语法高亮（复用 lowlight），并同步扩展流式安全缓冲的单美元 / `\[` 边界。收口 G5 + G6。

## Current Baseline

（2026-08-24 live 核实）

- `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/markdown.tsx:38-47`：插件链仅 `remarkPlugins=[remarkGfm]` + `rehypePlugins=[rehypeRaw]`；className 已是 `max-w-none break-words`（D2 完成，prose 0 命中）；sanitize 先行（:36 `sanitizeHtml(source)` 于 markdown 解析前）——roadmap 已裁定：rehype-katex 输出不经过 sanitize（string 级前置 sanitize 只碰 plain markdown 文本），无需动 allowlist
- `packages/flux-renderers-ai/src/renderers/ai-bubble/markdown-buffer.ts`：`findUnclosedMathCutoff`（:98-113）只跟踪 `$$` + `\(` + `\)`；**单 `$` 与 `\[`/`\]` 未跟踪**；fence 切割已存在（:70-92，A-2 落地，D6 只需在新高亮路径下补测试）
- 依赖面：`remark-math` / `rehype-katex` / `katex` 全仓 package.json 0 命中（2026-08-24 grep）；`lowlight@^3.1.0` 已是 `flux-renderers-content` 真依赖（`packages/flux-renderers-content/package.json:27`），但其 `syntax-highlight.ts` 适配器（`hl-*` HTML 串）未从 content 包 index 导出——本 plan 在 ai 包直接集成 lowlight（roadmap 明示），token 以 `.tok-*` class 渲染为受控 React 元素（不用 `dangerouslySetInnerHTML`，对齐 XSS 纪律）。**round 1 review 发现（live 核实）**：裸 `createLowlight()` 注册**零** grammar（lowlight@3 `lib/index.d.ts`：grammars 参数 optional；未注册语言 `highlight()` 抛 Unknown language）——content 包适配器正是因此静默失效（每次调用落入 catch→`escapeHtml` 回退，`syntax-highlight.ts:44-76`）。本 plan 必须显式注册 grammar 集（Decision D-c），否则 `.tok-*` 断言永红
- `packages/flux-renderers-ai/src/styles.css` 301 行：`.nop-ai-tool-call .tok-*` 调色板已存在（:65-79）但 scope 限于 tool-call——markdown 高亮需在 `[data-slot='ai-bubble-markdown']` scope 下补 `.tok-*` 规则；`.katex` / `.katex-display` 容器排版规则缺
- `apps/playground/src/styles.css:1-19` @import 链——katex CSS 需 host 显式引入（design.md:378 约束：不内嵌包 styles.css）；playground `package.json` 现无 `katex` 依赖
- peer dep 模式先例：`react-markdown`/`rehype-raw`/`remark-gfm` 均为 peer + devDependencies 双声明（ai 包 `package.json:33-65`）——workspace 内 dev/build 经包自身 devDeps 解析，外部 host 经 peer 自动安装
- formula fixture 已携带 `$$` 块级 + `$...$` 行内源定界符（`ai-widgets-fixture.ts:117-134`）；`ai-widgets-fixture.spec.ts:56` 断言 `md` 含字面 `$$`——**D6 落地后该断言按设计失效**（定界符被 KaTeX 渲染消费），D1 plan 已显式预埋此迁移（「`formula` 断言公式源定界符文本…不断言 `.katex`（D6 范围）」）；本 plan 执行将该断言迁移为 `.katex` 存在性断言（计划内、非静默弱化）
- supersession 链三处已应用（`design.md:378` / `improvement-analysis.md:209` / plan A3 Deferred）；`design.md:378` 显式预埋回填请求：「实现 plan 待起草，起草后在此回填 plan 链接」
- 单美元风险（live 分析）：`findUnclosedSingleDollarCutoff` 若按裸计数实现，货币文本（如 `costs $5 today`，1 个 `$`）会被判定未闭合而**永久截断**（buffer 无流终止概念，对完整文本同样切割）——`$$` 已接受此权衡，单 `$` 碰撞面大得多，必须带防误切口径；`MarkdownContentRenderer` 持有 `message.loading`（`markdown.tsx:33`），流态门控可行

## Goals

- `markdown.tsx`：`remarkPlugins` 追加 `remarkMath`、`rehypePlugins` 追加 `rehypeKatex`（静态 import，与既有插件同栈同治理）；自定义 `code` component override 接 lowlight（**显式注册 grammar 集**——Decision D-c；hast → 受控 React 元素，`.tok-*` class；未知语言 / plaintext 回退无高亮）
- `markdown-buffer.ts`：新增 `findUnclosedSingleDollarCutoff`（防货币误切口径，Decision D-a）+ `\[`/`\]` 块级公式边界（与既有 `$$`/`\(` 对齐）；fence 切割行为不变、补流式断言
- 依赖：ai 包 peer + devDependencies 增 `remark-math@^6` / `rehype-katex@^7` / `katex@^0.16` / `lowlight@^3`；playground dependencies 增 `katex`（CSS import 解析）+ `apps/playground/src/styles.css` 增 `@import 'katex/dist/katex.min.css'`
- `styles.css`：`.katex` / `.katex-display` 容器基础排版（仅排版，颜色/字体靠 katex 自身 CSS）+ `[data-slot='ai-bubble-markdown']` scope 下 `.tok-*` 规则（对齐 :65-79 调色板）
- e2e：`formula` 触发后 `span.katex` 存在（块级 + 行内）；`code` 触发后 `[data-slot="ai-bubble-code"]` 内含 `.tok-*` token span；`ai-widgets-fixture.spec.ts` formula 断言迁移（源定界符 → `.katex`）；unit 覆盖流式边界（未闭合 `$\frac{1}{` / `\[` / fence cut）+ 货币文本不截断
- `design.md:378` 回填本 plan 链接（owner-doc 显式预埋的一行回填请求；其余 owner-doc 同步仍归 DG）

## Non-Goals

- 不引入 streamdown / shiki（design.md:376 已裁定路径 C 保留）
- 不动 sanitize allowlist（管线顺序已裁定无需调整）
- 不动 `rich-text/tiptap-sender.tsx`（独立 scope，D2 裁定沿用）
- 不新增 `check:*` 门禁（roadmap 明示非强制；沿用既有全跑过即可）
- 不回写 `renderers.md` / G11 补段（DG 统一）

## Scope

### In Scope

- `packages/flux-renderers-ai/package.json`（peer + devDependencies）
- `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/markdown.tsx`（插件 + code override）
- `packages/flux-renderers-ai/src/renderers/ai-bubble/markdown-buffer.ts`（边界扩展）
- `packages/flux-renderers-ai/src/renderers/ai-bubble/__tests__/`（markdown-content / markdown-buffer 新断言）
- `packages/flux-renderers-ai/src/styles.css`（katex 容器 + markdown tok 规则）
- `apps/playground/package.json`（katex 依赖）+ `apps/playground/src/styles.css`（@import）
- `apps/playground/src/ai/ai-widgets-fixture.ts`（formula preset 增 `\[ ... \]` 块级形态，可选 Decision）
- `tests/e2e/ai-widgets-fixture.spec.ts`（formula 断言迁移，计划内）+ `tests/e2e/ai-widgets-demo.spec.ts`（新增 2 测试）
- `docs/components/flux-renderers-ai/design.md:378`（一行 plan 链接回填）

### Out Of Scope

- `packages/flux-renderers-content`（lowlight 适配器不复用不改；hl-_ → tok-_ 不对齐）
- pnpm lockfile 之外的 workspace 清单变更（`vite.workspace-alias.ts` / tsconfig references 不涉及）
- 其余 demo / mock 节奏（D1 契约保持）

## Failure Paths

| 场景                     | 触发                                | 行为                                                                                            | 可重试                       | 用户可见表现                                      |
| ------------------------ | ----------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------- |
| math-peer-missing        | host 未装 peer deps                 | 构建期报错（peer 硬依赖，与 react-markdown 同治理；不做运行时降级——Decision D-b）               | 否（host 补装后重建）        | host 构建失败提示缺依赖，而非运行时半渲染         |
| lang-unknown             | fenced code 语言未注册/未知         | 回退无高亮纯文本（代码块功能不变）                                                              | —                            | 无 token 配色的代码块                             |
| math-parse-error         | 公式闭合但语法非法（如 `$\frac{$`） | rehype-katex 渲染 in-band 错误文本（KaTeX `throwOnError:false` 口径），不崩溃不中断整条消息渲染 | 是（模型重发合法公式即恢复） | 公式位置显示 KaTeX 错误色文本，其余 markdown 正常 |
| currency-single-dollar   | 完整文本含奇数个 `$`（货币语境）    | 不截断（D-a 防误切口径）                                                                        | —                            | `$5 today` 完整显示，无消失尾部                   |
| math-unclosed-streaming  | 流中 `$\frac{1}{` / `\[` 未闭合     | buffer cut 至定界符起点                                                                         | —                            | 无 broken math 半渲染，闭合 chunk 到达后完整渲染  |
| fence-unclosed-streaming | 流中 ``` 未闭合                     | 既有 cut 行为（:70-92）保持                                                                     | —                            | 无 broken fence / 高亮闪烁                        |

## Test Strategy

档位选择：`必须自动化`。LaTeX 渲染 + code highlight 是 markdown public contract 变化（roadmap §D6 完成判定明示），流式边界是回归敏感面。按 AGENTS.md Tiers 与 plan guide「When Drafting #12」，**Proof 先于 Fix**：依赖安装后（前置 Phase 1）断言先以 red 锁定（插件未接线 → 无 `.katex` / 无 `.tok-*`；buffer 未扩展 → 边界 case 失败），实现后转绿。

## Execution Plan

### Phase 1 - 依赖引入 + 断言先行（red 锁定）

Status: planned
Targets: `packages/flux-renderers-ai/package.json`、`apps/playground/package.json`、测试文件

- Item Types: `Fix | Proof | Decision`

- [ ] ai 包 `peerDependencies` + `devDependencies` 增 `remark-math@^6` / `rehype-katex@^7` / `katex@^0.16` / `lowlight@^3`；playground `dependencies` 增 `katex`；`pnpm install`（lockfile 入库）
- [ ] Decision D-b：静态 import（弃 roadmap Cross-Cutting 的「try/catch dynamic require 缺失降级」措辞）——supersession 已裁硬 peer（`design.md:378`「host 必须安装」），运行时降级路径与硬 peer 语义矛盾；以 design.md 为准并在此记录裁定
- [ ] unit 断言落盘：(a) markdown-content：`$E=mc^2$` 渲染产出含 `.katex` 元素、`$$...$$` 产出 `.katex-display`；(b) markdown-content：带语言 fenced code 产出 `.tok-*` token span、未知语言回退纯文本；(c) markdown-buffer：未闭合 `$\frac{1}{` cut、未闭合 `\[` cut、货币文本（`costs $5 today`）不截断、未闭合 fence cut（回归）
- [ ] e2e 断言落盘（`ai-widgets-demo.spec.ts` 新增 2 测试）：`formula` 触发 → `span.katex` ≥2（块级+行内）；`code` 触发 → `[data-slot="ai-bubble-code"]` 内 `.tok-*` ≥1
- [ ] 对当前 repo（依赖已装、插件未接线）跑一次记录 red 证据

Exit Criteria:

- [ ] 依赖声明 + lockfile 更新落地；`pnpm --filter @nop-chaos/flux-renderers-ai typecheck` 过（新依赖可解析）
- [ ] 新断言全部落盘且当前为 red（red 证据记 plan 内备注或 daily log）

### Phase 2 - math / highlight 接线与缓冲扩展

Status: planned
Targets: `markdown.tsx`、`markdown-buffer.ts`

- Item Types: `Fix | Decision | Proof`

- [ ] `markdown.tsx`：`remarkPlugins=[remarkGfm, remarkMath]`、`rehypePlugins=[rehypeRaw, rehypeKatex]`；`code` override 接 lowlight（单例 + **Decision D-c grammar 注册**：起草倾向 `import { createLowlight, common } from 'lowlight'` 后 `createLowlight(common)`（v3 无 subpath exports，`common` 为根命名导出，~37 常用语言）而非 `all`（~200+ 语言，体积违背 design.md 体积纪律）；fixture 用到的语言必须在注册集内——`tsx` 不在 common 集（仅 `typescript`），执行时按 fixture 语言清单核对并 `register()` 增补（如 `typescript` 别名处理）；hast children → 受控 React 元素映射 `.tok-*`；未知语言/异常回退纯文本，对齐 content 包 `syntax-highlight.ts:44-76` 容错口径但不复用其 `hl-*` HTML 串路径与零注册缺陷）
- [ ] `markdown-buffer.ts`：`findUnclosedSingleDollarCutoff`——Decision D-a 防误切口径，起草倾向：仅当 `$` 后随非空白非数字（且无配对闭合 `$`）才视为 math-open 候选（remark-math 单美元语法规约：open 后无空白、close 前无空白）；执行时以货币反例用例集校准（`$5` / `$ 5` / `US$` 等），必要时叠加流态门控（`message.loading` 已可用于 renderer 侧）；新扫描器对 `$$` 配对与行内 code span（`` ` ``）内容免疫；`\[`/`\]` 块级边界与既有 `\(` 对齐
- [ ] Proof：streaming 语义核对——闭合 chunk 到达后被 cut 的内容恢复完整渲染（既有 `$$` 行为等价；Phase 1 (c) 断言即证）

Exit Criteria:

- [ ] Phase 1 (a)(b)(c) 断言转绿；既有 markdown-content / markdown-buffer 断言零破坏
- [ ] `pnpm --filter @nop-chaos/flux-renderers-ai test` 全过

### Phase 3 - 样式与 host CSS

Status: planned
Targets: `packages/flux-renderers-ai/src/styles.css`、`apps/playground/src/styles.css`

- Item Types: `Fix | Decision`

- [ ] `styles.css` 增 `.katex` / `.katex-display` 容器排版（overflow-x 处理 + display 居中，仅排版）+ `[data-slot='ai-bubble-markdown']` scope `.tok-key/.tok-str/.tok-num/.tok-bool` 规则（复用 :65-79 调色板值，var-first + dark fallback 双轨对齐 D2 先例）；新增段 ≤60 行
- [ ] `apps/playground/src/styles.css` 增 `@import 'katex/dist/katex.min.css'`（置于既有 @import 链，:1-19 区域）
- [ ] Decision（可选）：formula preset 增一条 `\[ ... \]` 块级形态以 e2e 覆盖新边界——采纳与否记录于 plan，不采纳则 `\[` 边界仅 unit 覆盖

Exit Criteria:

- [ ] `rg -n "katex" packages/flux-renderers-ai/src/styles.css apps/playground/src/styles.css` 双命中；markdown tok 规则 scope 前缀正确
- [ ] playground dev 实跑：`formula` 触发渲染公式（块级+行内）、`code` 触发高亮、暗态抽查一次（结果记 daily log）

### Phase 4 - e2e 转绿、断言迁移与回归

Status: planned
Targets: `tests/e2e/ai-widgets-fixture.spec.ts`、`tests/e2e/ai-widgets-demo.spec.ts`、`docs/components/flux-renderers-ai/design.md`

- Item Types: `Proof | Fix`

- [ ] Phase 1 e2e 2 测试转绿；`ai-widgets-fixture.spec.ts:50-59` formula 测试断言迁移：`toContainText('$$')` → `.katex` 存在（计划内迁移，D1 预埋；blockquote 断言保持）
- [ ] 回归：17 个 ai spec 全过（formula 迁移后 6/6；其余零断言修改）
- [ ] `design.md:378` 回填本 plan 链接（一行，替换「实现 plan 待起草，起草后在此回填 plan 链接」占位）

Exit Criteria:

- [ ] e2e 新增 2 测试 + fixture spec 6/6 全过；17 个 ai spec 全过
- [ ] `design.md:378` 含本 plan 路径（grep 可核对）

## Draft Review Record

- Reviewer / Agent: round 1 fresh session `ses_fcba0dc41ffeaYzmHdoSDtYYBE`（2026-08-24，verdict `fail` 1 Major）；round 2 fresh session `ses_fcb912742ffeOQSxo9wBOPMbrt`（2026-08-24，verdict `pass` 0 Blocker / 0 Major / 2 Minor）
- Verdict: `pass`（round 2 共识达成）
- Rounds: 2
- Findings addressed: 【Major】① lowlight grammar 注册缺失——裸 `createLowlight()` 注册零 grammar（lowlight@3 `lib/index.d.ts` optional 参数），照原稿 `.tok-*` 断言永红；已补 Current Baseline 零注册发现（含 content 适配器因此静默失效的 live 缺陷记录）+ Phase 2 Decision D-c（`import { createLowlight, common } from 'lowlight'` 后 `createLowlight(common)`，~37 语言；fixture `tsx` 不在 common 集需 `register()` 增补）。【Minor，已修正】② ai spec 计数 16→17（两处）；③ Failure Paths 补可重试列 + math-parse-error 行（rehype-katex in-band 错误文本，不崩溃）；④ Phase 2 Item Types 补 Proof（streaming 语义核对项）；⑤ A3 悬空占位路径差异记 Non-Blocking Follow-ups（Rule 21 不回写历史计划）；round 2——⑥ `lowlight/common` 措辞修正为根命名导出 import（v3 无 subpath exports）；⑦ content diff-view 高亮零注册缺陷补 successor 归属（DG 登记 bug 路由 content 包 successor）

## Closure Gates

- [ ] G5 收口：`formula` 触发渲染 `span.katex`（块级+行内，e2e 断言）
- [ ] G6 收口：fenced code lowlight 高亮（`.tok-*` span，e2e 断言）；未知语言回退不破坏代码块功能
- [ ] 流式边界：未闭合 `$`-inline / `\[` / fence 流中 cut、货币文本不截断（unit 断言）
- [ ] peer deps 治理与 supersession 一致（硬 peer + host 显式 import katex CSS；D-b 裁定记录在案）
- [ ] `ai-widgets-fixture.spec.ts` formula 断言迁移为计划内显式记录（非静默弱化）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [ ] owner-doc：`design.md:378` plan 链接回填完成；其余（renderers.md / G11 段）统一归 DG
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### content 包 `syntax-highlight` 适配器复用

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 适配器输出 `hl-*` HTML 串（`dangerouslySetInnerHTML` 路径）且未从 content 包 index 导出；D6 需要的是受控 React 元素 + `.tok-*` 语义，直接集成 lowlight 是 roadmap 明示方案。未来若统一高亮适配层，可另行评估。
- Successor Required: `no`
- Successor Path: 无

## Non-Blocking Follow-ups

- supersession 链中 plan A3（`docs/plans/2026-07-24-1400-1-a3-...md:245`）仍指向一个从未起草的占位路径（`2026-08-23-0002-1-a7-d6-latex-impl.md`）——本 plan 即该 LaTeX 实现的真身；按 plan guide Rule 21 不回写历史计划，`design.md:378` 回填本 plan 链接即建立 canonical 指针，DG 收口 log 注记 A3 占位差异
- roadmap Cross-Cutting「try/catch dynamic require 缺失降级」措辞已被 Decision D-b 按硬 peer 语义 supersede（以 design.md:378 为准）——DG 收口 log 注记对齐
- **content 包 diff-view 高亮零注册缺陷（pre-existing live defect，round 2 确认）**：`packages/flux-renderers-content/src/diff-view/adapters/syntax-highlight.ts:7` 裸 `createLowlight()` 注册零 grammar，`highlight()` 每次调用经 catch 静默回退 `escapeHtml`（:44-76），三个 diff 视图（`diff-split-view.tsx:6` / `diff-unified-view.tsx:5` / `diff-three-column-view.tsx:7`）消费的语法高亮实际从未生效。out of D6 scope（content 包独立 owner surface）；successor 归属 = DG 收口时按 `docs/bugs/00-bug-fix-note-writing-guide.md` 登记 bug 并路由 content 包 successor plan（如 ai-invariant-loop 或独立修复 plan）

## Closure

Status Note:

Closure Audit Evidence:

- Auditor / Agent:
- Evidence:

Follow-up:

-
