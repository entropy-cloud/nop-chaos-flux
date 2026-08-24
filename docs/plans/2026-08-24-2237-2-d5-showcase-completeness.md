# 02 D5 Showcase 完整性（G7 收口：缩略卡 + 结构化 fixture 触发）

> Plan Status: completed
> Last Reviewed: 2026-08-25
> Source: `docs/backlog/ai-widgets-product-roadmap.md` D5；`docs/components/flux-renderers-ai/product-spec.md` §6（D0 产物，showcase 口径契约）
> Mission: ai-widgets-product
> Work Item: D5
> Related: `docs/plans/2026-08-24-1045-2-d1-rich-markdown-fixture.md`（fixture 结构化扩展 predecessor）；D3（执行顺序在前，welcome icon 缩略卡视觉与之无耦合）

## Purpose

让 `# /ai-widgets` 兑现「all widgets showcase」命名承诺：首屏可见 widget 计数从 6 提升到 ≥8（6 live + 2 张缩略卡），且 fixture 触发后对话区实际展示 tool-call 卡片、citations marker、reasoning 折叠面板三类当前缺席的 widget 能力。收口 G7。

## Current Baseline

（2026-08-24 live 核实）

- `apps/playground/src/pages/ai-widgets-demo.tsx:24-119`：6 个 live widget（welcome/prompts/token-usage/feedback/suggestions/voice-input）；beforeMessages 仅 welcome（`icon:'bot'`，:57）+ prompts；afterMessages 为 feedback/suggestions/voice-input；全部事件仍 `showToast`（D4 范围）
- fixture 模型纯文本：`AiWidgetsFixture = { id, content }`（`apps/playground/src/ai/ai-widgets-fixture.ts:41-44`）；mock stream 只发 `delta.content` chunk（`mock-ai-env.ts:65-93`）；widgets demo 已接 `{ delayMs: 200, fixtures: true }`（`ai-widgets-demo.tsx:137`）
- **引擎/渲染器能力全部已存在（live 核实，本 plan 零包内代码变更）**：
  - `mapOpenAIChunk` 原样透传 `delta.reasoning_content` 与 `delta.tool_calls`（`ai-connector-factory.ts:96-129`）→ mock stream 发这两种 chunk 即可触发
  - reasoning 折叠面板：thinking plugin + `[data-slot="ai-bubble-reasoning"]`（`renderers/ai-bubble/renderers/reasoning.tsx:49`）
  - tool-call 卡片：message-level tools renderer `[data-slot="ai-bubble-tools"]`（`renderers/ai-bubble/renderers/tools.tsx:31`）；agentic loop 接线先例 `ai-tools-demo.tsx:34-50`（`createMockToolStream` 覆盖 stream + `createAiImportLoader(connector, { tools, toolExecutor })`）+ schema 面 `tools`/`toolExecutor`/`maxToolRounds`（`AiChatSchema` 已有，`schemas.ts:51-58`；引擎默认 `maxToolRounds=8`，`create-engine.ts:75`）
  - tool mock 素材可复用：`apps/playground/src/ai/tool-mock.ts`（`mockToolSchemas` + `mockToolExecutor`，`get_weather` 场景）
  - citations：`ai-citations` 为 host 摆放 widget，sources 解析链 explicit prop > `message.metadata.sources` > `data-sources` part（`ai-citations.tsx:467-493`）；`[N]`/`[N,M]` marker 解析已实现。**限制**：mock chunk mapper 只映射 `model` → metadata（`ai-connector-factory.ts:124-126`），mock stream 无法给消息挂 `metadata.sources` → sources 须经 schema explicit prop 提供。**组合模型约束（review 发现）**：inline 模式会**全文重渲染** `message.content` 为 plain text（`ai-citations.tsx:92-123`），且其 Decision-C 明确「widget 与 ai-bubble 不得双渲染同一 slice」（:37-43）→ 绑定 live 最新 assistant 消息会在消息列表与输入框之间产生每条回复的 plain-text 副本；唯一 live 使用先例 `ai-citations-demo.tsx:29-51` 用的是静态 message + explicit sources 模式
  - `ai-chat` 将 `messages` 快照投影到 host scope（`ai-chat.tsx:273-404`，scopeLabel `'ai'`）→ afterMessages 内 schema 可读 `${messages}`（绑定 live 最新消息的候选路径）
- 目标路由已存在：`# /ai-tools`（`App.tsx:351`）、`# /ai-citations`（`App.tsx:361`）
- 静态锚点卡可用原语：content 包 `html` renderer（sanitize 门控，`packages/flux-renderers-content/src/html.tsx:37`），widgets demo 已注册 content renderers（`ai-widgets-demo.tsx:17`）
- e2e 基线：`ai-widgets-demo.spec.ts` 10 测试（roadmap 保护面，不得破坏）；`ai-widgets-fixture.spec.ts` 6 测试（`ASSISTANT_MD` 链式 locator 对多 bubble 天然兼容——tool 轮的 tool_calls carrier bubble 渲染 `ai-bubble-tools` 不含 markdown、`role:'tool'` bubble 为 `data-role="tool"`，故链式定位仍单命中；default 测试 `:85-86` 用单匹配 `assistantBubble` locator——**default preset 必须保持纯 content 单 bubble**，否则 strict mode 破坏）；ai spec 家族 17 个文件全绿
- product-spec §6 契约：首屏计数口径（distinct 可见 slot + 卡各计 1、排除 chat/message-list/sender/bubble 常驻件）+ 2 张缩略卡位置（beforeMessages，welcome 与 prompts 之间）+ reasoning 例外（无路由无卡，经 fixture 触发展示）+ 触发后口径（tool 卡 + citations marker + reasoning 折叠）

## Goals

- beforeMessages welcome 与 prompts 之间新增 2 张静态缩略卡（Tool Call → `# /ai-tools`、Citations → `# /ai-citations`），首屏可见 widget ≥8（§6.1 口径，Playwright locator 程序化计数）
- fixture 结构化扩展：`AiWidgetsFixture` 增可选结构化字段（`reasoning?: string` 前导思考、`toolRound?: boolean` 工具轮），分发关键词不变；触发分布（Decision D-c）：`weather` → tool 轮（get_weather）+ 原 content；`reasoning` preset → `reasoning_content` 前导 + 原 content；`citation` preset → content 增 `[N]` marker；`default`/`code`/`formula` 保持纯 markdown
- widgets demo 接线 `tools`/`toolExecutor`（复用 `tool-mock.ts` 素材）
- citations marker 在对话区可见（Decision D-a 机制：静态 sources + demo message 绑定为**首选**，组合模型合规，见 Phase 3）
- 新 e2e `tests/e2e/ai-widgets-showcase.spec.ts` ≥5 测试全过（首屏计数 ≥8 / 卡路由链接 / reasoning 折叠 / tool 卡 / citations marker）；既有 10+6 测试零破坏

## Non-Goals

- 不改 `packages/flux-renderers-ai` 包内任何文件（引擎 + 渲染器能力已齐；本 plan 全部落在 playground host 层）
- 不做真实按钮副作用（toast → action 改造归 D4）
- 不做 LaTeX 渲染 / 代码高亮（D6）；`formula` preset 维持源定界符
- 不给 `App.tsx` 顶层 nav 增项（缩略卡是 in-content link，roadmap 明确）
- 不回写 owner docs（DG 统一）

## Scope

### In Scope

- `apps/playground/src/ai/ai-widgets-fixture.ts`（结构化字段 + citation 内容 `[N]` marker）
- `apps/playground/src/ai/mock-ai-env.ts`（fixture 模式 stream 发 `reasoning_content` / `tool_calls` chunk）
- `apps/playground/src/pages/ai-widgets-demo.tsx`（tools/toolExecutor 接线、2 张缩略卡、citations 实例）
- `tests/e2e/ai-widgets-showcase.spec.ts`（新）
- 既有 e2e 的语义保持性修正（仅当多 bubble strict mode 需要 `.first()` 类修正时，断言语义不变并记录 Decision——D1 先例）

### Out Of Scope

- `packages/flux-renderers-ai/src/**`（零改动）
- 其余 12 处 `createMockAiEnv` 调用点与默认行为
- `ai-tools-demo.tsx` / `ai-citations-demo.tsx` 既有完整 demo 页（只链接不改）

## Failure Paths

| 场景                   | 触发                                           | 行为                                                                                    | 可重试     | 用户可见表现                                                                            |
| ---------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------- |
| keyword-echo 碰撞      | 用户消息含结构化触发关键词的回显               | 按关键词分发（现状语义）                                                                | 是         | 可能提前触发 tool/reasoning——若破坏断言，修 fixture 关键词避让而非断言（D1 硬规则沿用） |
| tool 轮超时            | tool 轮 + 后续 content 流在 200ms/chunk 下拉长 | e2e anchor 等待走 30s timeout 预算（fixture spec 现值）；超预算即测试失败（非静默通过） | 是（重跑） | 表格/卡片断言仍在预算内（tool 轮 chunk 数少，实测记录于 daily log）                     |
| citations 静态绑定弱化 | D-a 首选静态绑定下 marker 与触发解耦           | 计划内双路径之一，非失败                                                                | —          | citations widget 常显 marker + 卡片（showcase 语义达成；live 绑定副本问题见 D-a 裁定）  |
| default 退化           | default preset 被加结构化字段                  | 禁止——default 必须纯 content 单 bubble                                                  | 否         | 保护 `ai-widgets-demo.spec.ts:110-111` strict locator + `Hello` 10s 预算                |

## Test Strategy

档位选择：`必须自动化`。showcase completeness 是 demo public surface（roadmap §D5 完成判定明示），且「不破坏既有 10+6 e2e」是硬规则。按 AGENTS.md Tiers 与 plan guide「When Drafting #12」，**Proof 先于 Fix**：新 spec 先以 red 锁定（现状无卡、无 tool 卡、无 reasoning 折叠、无 citations marker），实现后转绿。

## Execution Plan

### Phase 1 - e2e 预期先行（red 锁定）

Status: completed
Targets: `tests/e2e/ai-widgets-showcase.spec.ts`（新）

- Item Types: `Decision | Proof`

- [x] Decision D-b（卡片原语，执行时定案）：**裁 `link` renderer（content 包）+ flex structural 组合**。执行时 live 注册面核实 `registerContentRenderers` 同时注册 `html` 与 `link`（`content-renderer-definitions.ts:131/213`）：`link` renderer 输出真 `<a data-slot="link" href>` 且带 `isSafeNavigationUrl` 协议门（`link.tsx:29-34`，`#/ai-tools` 相对 URL 通过），与 html 锚点卡同等的 `<a>` 语义与安全门，且避免在 schema 里维护原始 HTML 字符串（DOMPurify allowlist 会随卡视觉迭代漂移）。测试 (a)(b) 的 `a[href="#/ai-tools"]` / `a[href="#/ai-citations"]` 锚点选择器**不变**（断言语义「卡存在且指向目标路由」保持）
- [x] 新 spec ≥5 测试落盘：(a) 首屏可见 widget 计数 ≥8——**计数集显式钉死**（review 修正：`[data-slot^="ai-"]` 裸匹配会把嵌套 slot 一并计入导致基线即 ≥8、red 不成立）：只计 showcase 条目根 slot 白名单（`ai-welcome` / `ai-prompts` / `ai-token-usage` / `ai-feedback` / `ai-suggestions` / `ai-voice-input`，各 `toBeVisible` 后计 1）+ 缩略卡 `a[href="#/ai-tools"]` / `a[href="#/ai-citations"]` 各计 1（若 Phase 3 落地 live `ai-citations` 实例，则白名单 + `ai-citations` 计 9，断言 ≥8 不变）；基线 = 6 < 8（red 成立），实装后 = 8–9。**注**：测试 (a)(b) 的卡 href 选择器耦合 Decision D-b 的 html 锚点卡形态——D-b 若在执行时改裁 structural 形态，(a)(b) 选择器随 D-b 定案同步调整为该形态的等价锚点断言（断言语义「卡存在且指向目标路由」不变）——D-b 定案 `link` renderer，锚点选择器无需调整；(b) 两张卡分别链接 `#/ai-tools`、`#/ai-citations`，另加 §6.2 摆放断言（welcome 与 prompts 之间，DOM order）；(c) 发送 `reasoning` 关键词 → `[data-slot="ai-bubble-reasoning"]` 可见；(d) 发送 `weather` 关键词 → `[data-slot="ai-bubble-tools"]` 卡片可见且后续 content 表格仍出现；(e) citations marker：`[data-slot="ai-citations"]` 内 `sup`（`data-citation-index`）marker 可见（D-a 首选静态绑定下初始即在场，断言钉在 widget 内 marker 结构而非触发时序）
- [x] 对当前 repo 跑一次记录 red 证据（无卡、计数 6 < 8、三类 widget 元素均 not found）——2026-08-25 实跑：5/5 red；(a) 计数证据 `found: ai-welcome, ai-prompts, ai-token-usage, ai-feedback, ai-suggestions, ai-voice-input`（= 6 < 8）；(b) 两卡 locator not found；(c) `ai-bubble-reasoning` not found；(d) `ai-bubble-tools` not found；(e) `ai-citations` not found

Exit Criteria:

- [x] 新 spec ≥5 测试落盘且当前为 red（red 证据记 plan 内备注或 daily log）——`tests/e2e/ai-widgets-showcase.spec.ts` 5 测试，2026-08-25 red 实跑证据见上条

### Phase 2 - fixture 结构化扩展与 stream 发射

Status: completed
Targets: `apps/playground/src/ai/ai-widgets-fixture.ts`、`apps/playground/src/ai/mock-ai-env.ts`

- Item Types: `Fix | Decision`

- [x] Decision D-c（触发分布裁定）：按「tool / citation / reasoning 三类各 ≥1 个专属触发 preset」落地（weather→`toolRound`、reasoning→`reasoning` 前导、citation→content 内 `[N]` marker）；`default`/`code`/`formula` 保持纯 markdown（无结构化字段，chunk 序列与 D1 基线逐 chunk 等价）。执行期无 review 裁定要求逐 preset 覆盖，分布按计划落地
- [x] `AiWidgetsFixture` 增 `reasoning?: string`、`toolRound?: boolean` 可选字段（缺省无结构化——其余 preset 与 default 行为按构造不变）
- [x] mock stream fixture 模式：`reasoning` 字段 → 先发 `delta.reasoning_content` chunk 流再发 content；`toolRound` → 首轮发 `delta.tool_calls`（get_weather，参数 `{"city":"Hangzhou"}` 与 `tool-mock.ts` executor 匹配——executor 按 function name 分发不校验 city 值）+ `finish_reason:'tool_calls'`，工具结果消息在场时（次轮，trailing `role:'tool'` 判定，复用 `createMockToolStream` 的轮次判定模式）发正常 content
- [x] `citation` preset content 增 `[1]`/`[2]`/`[1,2]` marker（保留既有 `ol li a` 代表锚点——fixture spec :71-79 断言不动）

Exit Criteria:

- [x] fixture 文件结构化字段 + 分发不变（6 关键词映射零改动）可 grep 核对——2026-08-25 grep：`KEYWORD_ORDER` 5 关键词 + default fallback 零改动；`toolRound:` 仅 weather（:89）、`reasoning:` 字段仅 reasoning preset（:161）
- [x] `default`/`code`/`formula` preset 输出 chunk 序列与 D1 基线逐 chunk 等价（无结构化字段即无新 chunk 类型）——代码结构核实：无字段 → generator 走原 content 循环 + stop marker，无新增 chunk；live 回归在 Phase 4 fixture spec 全量复跑确认；`apps/playground` 局部 typecheck 通过

### Phase 3 - demo 接线（tools / 卡 / citations 实例）

Status: completed
Targets: `apps/playground/src/pages/ai-widgets-demo.tsx`

- Item Types: `Fix | Decision`

- [x] `createAiImportLoader(connector, { tools: mockToolSchemas, toolExecutor: mockToolExecutor })` 接线（`ai-widgets-demo.tsx:196-199`）；ai-chat schema 增 `tools: '${$ai.tools}'` / `toolExecutor: '${$ai.toolExecutor}'`（:32-33）。Decision（maxToolRounds）：**显式 `2`**——fixture tool 轮恰好需要 2 轮（tool_calls 轮 + content 轮），比引擎默认 8 更紧的确定性上界（mock 失控时 showcase 最多 2 轮即终止；先例 `ai-tools-example.json` 用 5）
- [x] beforeMessages welcome 与 prompts 之间插入 2 张缩略卡（D-b 定案 `link` renderer + flex row，`ai-widgets-demo.tsx:65-85`；卡内标注 Tool Call / Citations，href `#/ai-tools` / `#/ai-citations`）
- [x] Decision D-a（citations marker 机制，首选落地）：afterMessages 末尾 `ai-citations`（inline）实例（:146-150），绑 `pageData` 静态 demo message（`CITATION_MESSAGE` content 含 `[1]`/`[2]` marker）+ `sources` explicit prop（`CITATION_SOURCES`，`ai-citations-demo.tsx:29-51` canonical 用法 + `feedbackMsg` 先例）——组合模型合规（widget 不与 ai-bubble 双渲染 live 消息）。`${messages}` live 绑定弃用理由（inline 全文重渲染 plain-text 副本问题）按 plan 记录，裁定与理由记 daily log
- [x] dev 实跑抽查（2026-08-25，programmatic probe `_tmp/d5-showcase-inspect.mjs` 对 live dev server，遵守 AGENTS.md 禁截图判读）：`weather` → `get_weather` tool 卡 + 后续表格（toolRoundThenTable=true）；`reasoning` → 折叠面板可见、默认折叠、点击展开渲染 reasoning markdown body（expandedAfterClick=true）；citations 实例 2 个 `[N]` marker 常显、点击打开 source 卡片（title+snippet，portal）；pageErrors=[]。结果记 daily log

Exit Criteria:

- [x] widgets demo schema 含 tools 接线 + 2 卡 + citations 实例（文件内可直接核对——`apps/playground/src/pages/ai-widgets-demo.tsx` :32-34 tools/toolExecutor/maxToolRounds、:65-85 两卡、:146-150 citations 实例；`apps/playground` 局部 typecheck 通过）
- [x] dev 抽查三类触发全部可见（daily log 记录——见上条 probe 结果，2026-08-25 log）

### Phase 4 - 转绿与回归

Status: completed
Targets: `tests/e2e/ai-widgets-showcase.spec.ts` + 既有 ai spec 家族

- Item Types: `Proof`

- [x] Phase 1 新 spec 全部转绿（≥5 测试）——2026-08-25：`ai-widgets-showcase.spec.ts` 5/5 绿（(a) 计数 9：6 live slot + 2 卡 + 1 live `ai-citations` 实例）
- [x] 回归：17 个 ai spec 文件全过——2026-08-25 全家族实跑 116 passed + 2 flaky（`ai-attachments.spec.ts` 文件上传用例，并行 worker 环境 flake；单文件复跑 2/2 稳定通过，与本 plan 改动无涉——attachments demo 走 `createMockAiEnv()` legacy 路径，未被本 plan 触及）。重点保护面：`ai-widgets-demo.spec.ts` 12 测试全绿（live 计数 12 = D1 基线 10 + D3 增 2，plan 文本沿用 D1 期计数；default 路径单 bubble + `Hello` 断言原样通过）与 `ai-widgets-fixture.spec.ts` 6 测试全绿（weather 多 bubble 下链式 locator 仍单命中；**未发生任何 strict mode 违规，零既有断言修改**）

Exit Criteria:

- [x] 新 spec ≥5 测试全过
- [x] 17 个 ai spec 文件全过；任何既有断言修改均为语义保持型且在 plan 内逐条记录——记录：零修改（未触发 strict mode 修正路径，D1 先例预案未用上）

## Draft Review Record

- Reviewer / Agent: round 1 fresh session `ses_fcbc547f1ffeGev4QQMa2aK7qJ`（2026-08-24，verdict `fail` 2 Major）；round 2 fresh session `ses_fcba12daaffeBgtr7Nw4DfMB9k`（2026-08-24，verdict `pass` 0 Blocker / 0 Major / 4 Minor）
- Verdict: `pass`（round 2 共识达成）
- Rounds: 2
- Findings addressed: 【Major】① 计数测试 (a) 基线即绿（`[data-slot^="ai-"]` 裸匹配计入嵌套 slot，现状 distinct 可见值已 15–20）——已改为 showcase 条目根 slot 白名单 + 卡 href 钉死计数集，基线 6 < 8 red 成立；② D-a 首选 `${messages}` live 绑定违背 ai-citations 组合模型（inline 全文重渲染 message.content 为 plain text，`ai-citations.tsx:92-123`，Decision-C :37-43 禁双渲染）——首选/次选反转：静态 message + explicit sources（`ai-citations-demo.tsx:29-51` canonical 用法）为首选，live 绑定降级并记录双渲染 tradeoff。【Minor，已修正】③ ai spec 计数 16→17；④ `resolveSources` 行引用改 :467-493；⑤ roadmap §D5 文本偏差记入 Non-Blocking Follow-ups 供 DG 注记；⑥ Failure Paths 补可重试列；⑦ 测试 (e) 断言钉在 widget 内 marker 结构；round 2——⑧ §6.1 字面规则 vs 白名单 operationalization 差异补入 Non-Blocking Follow-ups；⑨ 计数括号口径钉死（live `ai-citations` 实例入白名单计 9）；⑩ (a)(b) 选择器与 D-b 的耦合显式声明（D-b 改形态则断言随定案等价调整）；⑪ tool 轮超时行「行为」列改为可判定语义

## Closure Gates

- [x] G7 收口：首屏可见 widget ≥8（§6.1 程序化计数——showcase spec (a) 白名单计数 = 9：6 live slot + 2 卡 + 1 live `ai-citations` 实例）+ 触发后对话区含 tool-call 卡片 + citations marker + reasoning 折叠面板（e2e 三断言 = spec (d)(e)(c)，5/5 绿）
- [x] 缩略卡为 playground-local in-content link（`App.tsx` nav 零新增项——`git status` 无 App.tsx 改动；卡为 beforeMessages 内 `link` renderer `<a>`）
- [x] `packages/flux-renderers-ai` 包零改动（`git diff` 不含该包路径——改动面仅 `apps/playground/src/**` + 新 e2e spec + 本 plan）
- [x] 既有 10+6 e2e 零破坏（`ai-widgets-demo.spec.ts` 12/12、`ai-widgets-fixture.spec.ts` 6/6 全绿）；既有断言修改为零（无语义保持型修正被触发）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（Deferred 区为空；Non-Blocking Follow-ups 三条均为 doc-alignment / future-need 治理项，经 closure-audit 复核诚实）
- [x] owner-doc：无需更新（mock/demo 属 playground host 层，不改包公共契约；owner-doc 同步统一归 DG）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项——audit session `ses_fcb529d07ffeMGH4kDjbl0IwXQ`（2026-08-25，非执行 session）：verdict `issues → approved`，唯一 Blocker 为 daily log 缺失（docs-only，审计明示补写后 flip，见 `docs/logs/2026/08-25.md` D5 条目）；代码/测试面全验证通过（含独立复跑 23/23 绿）
- [x] `pnpm typecheck`（37/37）
- [x] `pnpm build`（37/37）
- [x] `pnpm lint`（37/37）
- [x] `pnpm test`（68/68 tasks；playground 26 files / 175 tests；ai e2e 家族 18 文件 116 passed + 2 flaky 环境性通过——单文件复跑稳定，见 Phase 4）

## Deferred But Adjudicated

（无——D-a 双路径均属计划内决策，不是 deferred）

## Non-Blocking Follow-ups

- roadmap §D5 文本与实装的 2 处偏差（「3 个缩略卡」vs 实装 2 卡 + reasoning 例外；「fixture A–F 每个 ≥1 种新 widget 触发」vs D-c 三类专属触发分布）——DG 收口 log 注记对齐，不改本 plan 判定
- product-spec §6.1 form-1 字面规则（distinct `[data-slot^="ai-"]` 仅排除 4 常驻件）与其自述「现状 = 6」自相矛盾（嵌套 slot 实测使基线已 >8）——本 plan 测试按 §6.2 目标清单钉死白名单为可执行口径；DG 收口 log 注记 §6.1 字面规则的 operationalization 差异
- `${messages}` live 绑定 citations 的 live 性需求（须先解决与 ai-bubble 的双渲染问题）——如未来有真实需求，另立 successor 评估

## Closure

Status Note: 4 Phase 全部 `completed` 且 Exit Criteria 全勾；G7 showcase 契约（product-spec §6）兑现——首屏白名单计数 9 ≥ 8，fixture 触发后对话区含 tool-call 卡 + citations marker + reasoning 折叠；改动面全部在 playground host 层（`packages/flux-renderers-ai` 零改动）；既有 widgets demo/fixture e2e 零破坏、零断言修改；Closure Gates 全过（typecheck/build/lint/test/check + 独立 closure-audit approved）。

Closure Audit Evidence:

- Auditor / Agent: fresh sub-agent session `ses_fcb529d07ffeMGH4kDjbl0IwXQ`（2026-08-25，非执行 session，三件套输入：plan + diff summary + 验证输出）
- Evidence: verdict `issues → approved`——唯一 Blocker 为 D5 daily log 缺失（docs-only；补写 `docs/logs/2026/08-25.md` D5 条目后 flip approved，D3 closure 同型先例）；审计核实：fixture/mock/demo 逐行 live 核对（结构化字段、分发零改动、legacy 路径不变、tools 接线、卡与 citations 实例位置）、spec 断言与真实 renderer data-slot 面一致（reasoning/tools/tool-call/citations slot + 路由）、`git status` 零 `packages/flux-renderers-ai` diff / 零 App.tsx diff、独立复跑 23/23 绿（showcase 5 + demo 12 + fixture 6）、follow-ups 分类诚实；Minor（roadmap D5 未翻转）为收口后 bookkeeping，本 Closing 已同步完成。

Follow-up:

- 见 Non-Blocking Follow-ups 三条（roadmap §D5 文本 2 处偏差、product-spec §6.1 operationalization 差异——均归 DG 收口注记；`${messages}` live 绑定 citations 为 successor 候选）。无 plan-owned 剩余工作。
