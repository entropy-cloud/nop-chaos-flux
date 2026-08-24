# 03 D6 LaTeX 公式渲染 + 代码高亮 + 流式边界扩展（G5 + G6 收口）

> Plan Status: completed
> Last Reviewed: 2026-08-25
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

Status: completed
Targets: `packages/flux-renderers-ai/package.json`、`apps/playground/package.json`、测试文件

- Item Types: `Fix | Proof | Decision`

- [x] ai 包 `peerDependencies` + `devDependencies` 增 `remark-math@^6` / `rehype-katex@^7` / `katex@^0.16` / `lowlight@^3`；playground `dependencies` 增 `katex`；`pnpm install`（lockfile 入库）
- [x] Decision D-b：静态 import（弃 roadmap Cross-Cutting 的「try/catch dynamic require 缺失降级」措辞）——supersession 已裁硬 peer（`design.md:378`「host 必须安装」），运行时降级路径与硬 peer 语义矛盾；以 design.md 为准并在此记录裁定（2026-08-25 执行裁定：`markdown.tsx` 以静态 import 接入四依赖，无任何 dynamic require / 运行时探测路径）
- [x] unit 断言落盘：(a) markdown-content：`$E=mc^2$` 渲染产出含 `.katex` 元素、`$$...$$` 产出 `.katex-display`；(b) markdown-content：带语言 fenced code 产出 `.tok-*` token span、未知语言回退纯文本；(c) markdown-buffer：未闭合 `$\frac{1}{` cut、未闭合 `\[` cut、货币文本（`costs $5 today`）不截断、未闭合 fence cut（回归）
- [x] e2e 断言落盘（`ai-widgets-demo.spec.ts` 新增 2 测试）：`formula` 触发 → `span.katex` ≥2（块级+行内）；`code` 触发 → `[data-slot="ai-bubble-code"]` 内 `.tok-*` ≥1
- [x] 对当前 repo（依赖已装、插件未接线）跑一次记录 red 证据（2026-08-25：unit red = `markdown-d6-math-code.test.tsx` 4 例 + `markdown-buffer.test.ts` D6 新行为 3 例共 7 failed / 729 passed；e2e red = `ai-widgets-demo.spec.ts` D6 2 测试 failed（formula 无 `.katex`、code 无 `.tok-*`）；guard 型断言（货币不截断 / 未知语言回退 / fence 回归）green-by-construction，Phase 2 后必须保持 green）

Exit Criteria:

- [x] 依赖声明 + lockfile 更新落地；`pnpm --filter @nop-chaos/flux-renderers-ai typecheck` 过（新依赖可解析；实测 remark-math@6.0.0 / rehype-katex@7.0.1 / katex@0.16.47 / lowlight@3.3.0）
- [x] 新断言全部落盘且当前为 red（red 证据记 plan 内备注或 daily log）

### Phase 2 - math / highlight 接线与缓冲扩展

Status: completed
Targets: `markdown.tsx`、`markdown-buffer.ts`

- Item Types: `Fix | Decision | Proof`

- [x] `markdown.tsx`：`remarkPlugins=[remarkGfm, remarkMath]`、`rehypePlugins=[rehypeRaw, rehypeKatex]`；`code` override 接 lowlight（单例 + **Decision D-c grammar 注册**：起草倾向 `import { createLowlight, common } from 'lowlight'` 后 `createLowlight(common)`（v3 无 subpath exports，`common` 为根命名导出，~37 常用语言）而非 `all`（~200+ 语言，体积违背 design.md 体积纪律）；fixture 用到的语言必须在注册集内——`tsx` 不在 common 集（仅 `typescript`），执行时按 fixture 语言清单核对并 `register()` 增补（如 `typescript` 别名处理）；hast children → 受控 React 元素映射 `.tok-*`；未知语言/异常回退纯文本，对齐 content 包 `syntax-highlight.ts:44-76` 容错口径但不复用其 `hl-*` HTML 串路径与零注册缺陷）
  - 执行裁定（2026-08-25 live 核实）：`createLowlight(common)` 后 `lowlight.registered('tsx') === true`——highlight.js common bundle 为 `typescript` 注册了 `ts`/`tsx` 别名，fixture 的 `tsx` fence 无需额外 `register()`；token 映射为 4 语义类调色板（`tok-key/tok-str/tok-num/tok-bool`，映射表在 `markdown.tsx` `HLJS_SCOPE_TO_TOK`），表外 scope 渲染为无 class span（体积纪律）
- [x] `markdown-buffer.ts`：`findUnclosedSingleDollarCutoff`——Decision D-a 防误切口径，起草倾向：仅当 `$` 后随非空白非数字（且无配对闭合 `$`）才视为 math-open 候选（remark-math 单美元语法规约：open 后无空白、close 前无空白）；执行时以货币反例用例集校准（`$5` / `$ 5` / `US$` 等），必要时叠加流态门控（`message.loading` 已可用于 renderer 侧）；新扫描器对 `$$` 配对与行内 code span（`` ` ``）内容免疫；`\[`/`\]` 块级边界与既有 `\(` 对齐
  - 执行裁定（2026-08-25，micromark-extension-math@3.1 源码 + parse 实测校准）：close 规约实为「任意后续单 `$` 即闭合（空格 padding 合法）」，故配对模型取「open 守卫（后随非空白非数字）+ 下一未屏蔽单 `$` 闭合」；额外免疫范围在起草要求（`$$` run / 行内 code span）之上补齐 fenced code 区域与 `\$` 转义（balanced fence 内 `$HOME`/`$5` 不截断，完整文本零误切）；货币用例集（`$5`/`$ 5`/`US$`/`the total is $5 today only`）全部不截断
- [x] Proof：streaming 语义核对——闭合 chunk 到达后被 cut 的内容恢复完整渲染（既有 `$$` 行为等价；Phase 1 (c) 断言即证；`restores the full render once the closing $ arrives` 断言 + Phase 1 全部断言转绿）

Exit Criteria:

- [x] Phase 1 (a)(b)(c) 断言转绿；既有 markdown-content / markdown-buffer 断言零破坏（包内 82 文件 736 tests 全过，Phase 1 时为 729 pass + 7 red）
- [x] `pnpm --filter @nop-chaos/flux-renderers-ai test` 全过（736/736）；跨包变更追加 `pnpm typecheck` 全仓 37/37 过

### Phase 3 - 样式与 host CSS

Status: completed
Targets: `packages/flux-renderers-ai/src/styles.css`、`apps/playground/src/styles.css`

- Item Types: `Fix | Decision`

- [x] `styles.css` 增 `.katex` / `.katex-display` 容器排版（overflow-x 处理 + display 居中，仅排版）+ `[data-slot='ai-bubble-markdown']` scope `.tok-key/.tok-str/.tok-num/.tok-bool` 规则（复用 :65-79 调色板值，var-first + dark fallback 双轨对齐 D2 先例）；新增段 ≤60 行（实际 ~40 行：key/num 复用 `--ai-md-primary`（自动随 D2 双轨暗色切换），str/bool 用 `hsl(var(--success/destructive, 字面回退))`）
- [x] `apps/playground/src/styles.css` 增 `@import 'katex/dist/katex.min.css'`（置于既有 @import 链，:1-19 区域；紧随 `flux-renderers-ai/styles.css` 之后）
- [x] Decision（可选）：formula preset 增一条 `\[ ... \]` 块级形态以 e2e 覆盖新边界——**不采纳**（2026-08-25 live 核实：remark-math@6 只解析 `$`/`$$` 定界符，`\[...\]` 不会产出 math 节点——写入 fixture 会以字面 `\[` 渲染而非 KaTeX，污染 showcase；`\[` 与既有 `\(` 同为 buffer-only 边界）。`\[` 边界按 plan 约定仅 unit 覆盖（markdown-buffer D6 describe 3 例）

Exit Criteria:

- [x] `rg -n "katex" packages/flux-renderers-ai/src/styles.css apps/playground/src/styles.css` 双命中；markdown tok 规则 scope 前缀正确（`[data-slot='ai-bubble-markdown'] .tok-*` 4 规则 + tool-call 既有规则不动）
- [x] playground dev 实跑：`formula` 触发渲染公式（块级+行内）、`code` 触发高亮、暗态抽查一次（结果记 daily log；2026-08-25 程序化 probe `_tmp/d6-dev-spot-check.mjs` 4/4 PASS：katex=4 span + display 居中/overflow auto、tok 18 个、暗态 tok 色 rgb(28,110,242)→rgb(77,141,245) 走 theme-tokens 暗轨、公式暗态不破）

### Phase 4 - e2e 转绿、断言迁移与回归

Status: completed
Targets: `tests/e2e/ai-widgets-fixture.spec.ts`、`tests/e2e/ai-widgets-demo.spec.ts`、`docs/components/flux-renderers-ai/design.md`

- Item Types: `Proof | Fix`

- [x] Phase 1 e2e 2 测试转绿；`ai-widgets-fixture.spec.ts:50-59` formula 测试断言迁移：`toContainText('$$')` → `.katex` 存在（计划内迁移，D1 预埋；blockquote 断言保持；测试名 `...renders blockquote and LaTeX source delimiters` → `...renders blockquote and KaTeX math`，文件头注释同步）
- [x] 回归：17 个 ai spec 全过（formula 迁移后 6/6；其余零断言修改）（2026-08-25 live：`npx playwright test ai-` = **120 passed / 0 failed**（18 个 ai spec 文件，含 D6 新增 2 测试；fixture spec 6/6））
- [x] `design.md:378` 回填本 plan 链接（一行，替换「实现 plan 待起草，起草后在此回填 plan 链接」占位 → 「实现 plan：`docs/plans/2026-08-24-2237-3-d6-latex-code-highlight.md`」）

Exit Criteria:

- [x] e2e 新增 2 测试 + fixture spec 6/6 全过；17 个 ai spec 全过（120/120，文件数 live 为 18——plan 起草时计数 17，执行期 ai-branches-linkage 等在册文件全量跑过，零失败）
- [x] `design.md:378` 含本 plan 路径（grep 可核对，2026-08-25 grep 命中）

## Draft Review Record

- Reviewer / Agent: round 1 fresh session `ses_fcba0dc41ffeaYzmHdoSDtYYBE`（2026-08-24，verdict `fail` 1 Major）；round 2 fresh session `ses_fcb912742ffeOQSxo9wBOPMbrt`（2026-08-24，verdict `pass` 0 Blocker / 0 Major / 2 Minor）
- Verdict: `pass`（round 2 共识达成）
- Rounds: 2
- Findings addressed: 【Major】① lowlight grammar 注册缺失——裸 `createLowlight()` 注册零 grammar（lowlight@3 `lib/index.d.ts` optional 参数），照原稿 `.tok-*` 断言永红；已补 Current Baseline 零注册发现（含 content 适配器因此静默失效的 live 缺陷记录）+ Phase 2 Decision D-c（`import { createLowlight, common } from 'lowlight'` 后 `createLowlight(common)`，~37 语言；fixture `tsx` 不在 common 集需 `register()` 增补）。【Minor，已修正】② ai spec 计数 16→17（两处）；③ Failure Paths 补可重试列 + math-parse-error 行（rehype-katex in-band 错误文本，不崩溃）；④ Phase 2 Item Types 补 Proof（streaming 语义核对项）；⑤ A3 悬空占位路径差异记 Non-Blocking Follow-ups（Rule 21 不回写历史计划）；round 2——⑥ `lowlight/common` 措辞修正为根命名导出 import（v3 无 subpath exports）；⑦ content diff-view 高亮零注册缺陷补 successor 归属（DG 登记 bug 路由 content 包 successor）

## Closure Gates

- [x] G5 收口：`formula` 触发渲染 `span.katex`（块级+行内，e2e 断言）（`ai-widgets-demo.spec.ts` G5 测试 + `ai-widgets-fixture.spec.ts` formula 迁移断言双覆盖，120/120 绿）
- [x] G6 收口：fenced code lowlight 高亮（`.tok-*` span，e2e 断言）；未知语言回退不破坏代码块功能（G6 e2e + unit 未知语言回退断言含 copy button 存活）
- [x] 流式边界：未闭合 `$`-inline / `\[` / fence 流中 cut、货币文本不截断（unit 断言）（markdown-buffer D6 两 describe 13 例全绿）
- [x] peer deps 治理与 supersession 一致（硬 peer + host 显式 import katex CSS；D-b 裁定记录在案）（ai 包 peer+devDeps 双声明 + playground `katex` dep + `@import 'katex/dist/katex.min.css'`）
- [x] `ai-widgets-fixture.spec.ts` formula 断言迁移为计划内显式记录（非静默弱化）（迁移落在 plan Phase 4 item + D1 plan 预埋引用 + 本 plan Current Baseline 记录）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（Deferred 区仅 content 包适配器复用 = out-of-scope improvement，successor=no；content diff-view 零注册缺陷为 pre-existing、out of D6 scope、DG 登记 bug 路由 successor——round 2 review 已裁定）
- [x] owner-doc：`design.md:378` plan 链接回填完成；其余（renderers.md / G11 段）统一归 DG
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（auditor `ses_fcb30af23ffeyZjbRptL7F0foE`，2026-08-25，verdict **approved**——证据见 Closure Audit Evidence；执行 session 未参与该审计）
- [x] `pnpm typecheck`（37/37 tasks）
- [x] `pnpm build`（37/37 tasks）
- [x] `pnpm lint`（37/37 tasks；执行中修复 2 处 eslint：`react/no-array-index-key` → 内容派生 key、unused `rest`）
- [x] `pnpm test`（68/68 tasks；ai 包 82 files / 736 tests；ai e2e 家族 18 spec 文件 120/120，lint 修复后 demo+fixture 复跑 20/20；`pnpm check` exit 0 零新增红）

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

Status Note: 4 Phase 全部执行完毕（Phase 1 red 锁定 → Phase 2 接线 → Phase 3 样式 → Phase 4 转绿迁移），G5+G6 收口，流式边界扩展落地，design.md:378 回填完成；独立 closure-audit approved 后关闭。三个执行期 Decision（D-b 静态 import / D-c common 注册 + tsx 别名核实 / D-a 防误切口径校准 + fixture `\[` 不采纳）均记录在对应 Phase 备注。

Closure Audit Evidence:

- Auditor / Agent: fresh sub-agent session `ses_fcb30af23ffeyZjbRptL7F0foE`（2026-08-25，非执行 session，仅输入 plan + diff summary + 验证输出三件套）
- Evidence: verdict **approved**（0 Blocker / 0 Major / 3 Minor）。独立复核：plan 全 checklist 核对；live code 逐文件核对（markdown.tsx 插件栈与 lowlight 单例、markdown-buffer.ts 扫描器守卫与免疫面、package.json peer+dev 双声明、双 styles.css、design.md:378）；独立复跑 `pnpm --filter @nop-chaos/flux-renderers-ai test` = 82 files / 736 tests pass、`npx playwright test ai-widgets-demo.spec.ts ai-widgets-fixture.spec.ts` = 20/20 pass、包级 typecheck + lint clean；断言语义核对（`.katex`/`.tok-*` 证明真实渲染而非字面源、buffer 断言 exact-string 全覆盖新边界、fixture 迁移与 D1 预埋一致且 diff append-only 零弱化）；deferred 诚实性核对（content 包缺陷为 pre-existing out-of-scope + DG 路由，零静默降级）；Minor：① `_tmp` probe 清理漂移（已删除 `d6-dev-spot-check.mjs`/`d6-math-probe.mjs`）② 收口动作（本节即执行：gates 全勾 + Status flip + roadmap done）③ ai-welcome/ai-prompts 冷载 15s 超时环境 flake（watch-only，D6 无关，重试稳定）

Follow-up:

- content 包 diff-view 高亮零注册缺陷 → DG 收口时按 bug 指南登记并路由 content 包 successor（见 Non-Blocking Follow-ups）
- A3 占位路径差异 / roadmap Cross-Cutting try/catch 措辞对齐 → DG 收口 log 注记（见 Non-Blocking Follow-ups）
- 其余无 plan-owned 剩余工作
