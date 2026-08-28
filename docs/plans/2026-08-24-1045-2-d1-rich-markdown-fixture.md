# 02 D1 Mock Connector 富 markdown Fixture

> Plan Status: completed
> Last Reviewed: 2026-08-24
> Source: `docs/backlog/ai-widgets-product-roadmap.md` D1；`docs/components/flux-renderers-ai/product-spec.md` fixture 章节（D0 产物，内容输入）；`docs/analysis/2026-08-23-ai-widgets-vs-tiny-robot-comparison.md` §6.1
> Mission: ai-widgets-product
> Work Item: D1
> Related: `docs/plans/2026-08-24-1045-1-d0-product-standard-baseline.md`（前置输入）；D5（fixture 结构化扩展 successor）

## Purpose

让 `# /ai-widgets` 的 mock 回复从 8 词 canned reply 变为 6 个富 markdown preset，为 D2 typography、D3 avatar、D6 LaTeX/高亮提供真实展示 substrate；同时把 widgets demo 的流式节奏调到肉眼可见的 200ms。收口 G1（内容贫瘠）与 G10（节奏不可见）。

## Current Baseline

（2026-08-24 live 核实）

- `apps/playground/src/ai/mock-ai-env.ts:25` `CANNED_REPLY_WORDS` 8 词；`createMockAiStream(delayMs = 15)` 产出 OpenAI 形态 chunk（`choices[0].delta.content` + 末尾 `finish_reason: 'stop'`）；`createMockAiEnv()` 无参数
- `createMockAiEnv` 全 playground 13 处调用点（12 个 `pages/ai-*-demo.tsx` + `component-lab/renderers/data-c8-1-host.ts:31`）均零参（live grep 核实，不含 `mock-ai-env.ts` 内的定义）——任何默认行为变化都会波及全部 demo；其中 `ai-tools-demo.tsx:34` 调用后即用 `createMockToolStream()` 覆盖 `stream`
- `apps/playground/src/pages/ai-widgets-demo.tsx:137` 与 `ai-chat-demo.tsx:26` 均 `createMockAiEnv()` 零参
- e2e 现状：13 个 `tests/e2e/ai-*.spec.ts` 全绿。关键既有断言：
  - `ai-widgets-demo.spec.ts:98-114`：发送 `'widgets test'` → 断言回复含 `'Hello'`（无关键词命中 → 走 default preset，default preset 开头词必须为 `Hello`）
  - `ai-chat.spec.ts:18,35,133`：断言含 `'Hello'`——该 demo 不启用 fixtures，行为不变，天然兼容
- `ai-widgets-fixture.ts` 尚不存在；D0 product-spec.md 尚未产出（D0 plan 排序在前，本 plan 执行时以其 fixture 章节为内容契约）

## Goals

- 新文件 `apps/playground/src/ai/ai-widgets-fixture.ts`：6 个 preset（关键词 `weather` / `code` / `formula` / `reasoning` / `citation` / default）+ 关键词分发器，内容遵循 D0 spec fixture 大纲（11 元素全集覆盖每元素 ≥1）
- `createMockAiEnv(options?: { delayMs?: number; fixtures?: boolean })`：默认 `{ delayMs: 15, fixtures: false }`，默认行为与现签名完全等价
- `ai-widgets-demo.tsx` 显式传 `{ delayMs: 200, fixtures: true }`（收口 G10）；其余 12 处调用点零改动
- 新 e2e `tests/e2e/ai-widgets-fixture.spec.ts` ≥6 测试全过；既有 13 个 spec（含 widgets 10 测试）全部不破坏、零断言修改

## Non-Goals

- 不做 LaTeX 渲染 / 代码高亮（D6）——`formula` preset 在本 plan 只产出公式**源文本**（`$...$` / `$$...$$`），e2e 断言定界符存在而非 `.katex` span
- 不做结构化 widget 触发（`reasoning_content` 字段 / tool-call chunk / citations metadata 注入 fixture）——归 D5
- 不改 `AI_NAMESPACE_ACTIONS` / ComponentHandle / schema（D4）
- 不动其他 demo 的流式节奏（默认 15ms 保持不变）

## Scope

### In Scope

- `apps/playground/src/ai/ai-widgets-fixture.ts`（新）
- `apps/playground/src/ai/mock-ai-env.ts`（工厂 option 化 + fixture 分发）
- `apps/playground/src/pages/ai-widgets-demo.tsx`（传 option）
- `tests/e2e/ai-widgets-fixture.spec.ts`（新）

### Out Of Scope

- 其余 12 处 `createMockAiEnv` 调用点（零改动）
- `packages/flux-renderers-ai` 包内任何文件（mock 属 playground host 层，引擎不变式 14 不破）
- `ai-widgets-demo.spec.ts` 既有断言（零修改；若关键词碰撞，修 fixture 内容而非断言）

## Failure Paths

不适用：mock 数据与 demo 接线，无错误契约面。keyword 未命中回 default preset 的回退行为作为 Phase 1 决策项记录。

## Test Strategy

档位选择：`必须自动化`。fixture 是 showcase 真实内容 substrate，且「不破坏既有 13 个 e2e」是 roadmap 硬规则——按 AGENTS.md Test Strategy Tiers 与 plan guide「When Drafting #12」，**Proof 先于 Fix**：新 e2e spec 先行落盘并以 red 状态锁定预期，实现后再转绿。

## Execution Plan

### Phase 1 - e2e 预期先行（red 锁定）

Status: completed
Targets: `tests/e2e/ai-widgets-fixture.spec.ts`（新）

- Item Types: `Decision | Proof`

- [x] 前置检查：D0 产物 `docs/components/flux-renderers-ai/product-spec.md` fixture 章节已落地（未落地则本 plan 阻塞，不启动）
- [x] Decision：fixture 分发 opt-in——`createMockAiEnv` 增加 `fixtures?: boolean` option（默认 `false`），保证 13 处既有调用点与 13 个既有 e2e 行为**按构造**不变（「不破坏既有 e2e」硬规则的构造性保证，替代靠运气的关键词避让）
- [x] 按 product-spec.md fixture 大纲（D0 产物）author 新 spec ≥6 测试，先行锁定预期：每个关键词 1 个（发送关键词 → 对话区出现该 preset 代表性元素，如 `code` → `[data-slot="ai-bubble-pre"]` 围栏代码块）+ 无关键词 default 1 个（断言含 `Hello` 的富内容而非旧 8 词 canned reply——**注意**：旧 canned reply 本身含 `Hello`，该测试必须同时断言富内容代表元素（如 markdown 标题/列表），否则 red 阶段会假绿）
  - `formula` 断言公式**源定界符**文本（`$$` / `$`）存在，不断言 `.katex`（D6 范围）
  - `reasoning` 断言 markdown 代表元素（如 blockquote），不断言折叠面板（结构化字段属 D5）
- [x] 对当前 repo 跑一次新 spec 并记录 red 证据（全部新测试失败——fixtures 尚不存在，预期失败即预期锁定）

Exit Criteria:

- [x] 新 spec ≥6 测试已落盘，断言只依赖 D0 spec 大纲层面的代表元素（不依赖未实现的 fixture 文本细节）
- [x] red 运行证据记录在案（daily log 或 plan 内备注）

> Red 证据（2026-08-24 执行轮）：`npx playwright test tests/e2e/ai-widgets-fixture.spec.ts --retries=0` → **6 failed / 6 total**（weather/code/formula/reasoning/citation/default 全部 `element(s) not found`——现状 canned reply 无任何富 markdown 元素；default 测试中 `Hello` 断言通过但 `h2` 断言失败，证明防假绿设计生效）。预期已锁定。

### Phase 2 - fixture 模块与分发器

Status: completed
Targets: `apps/playground/src/ai/ai-widgets-fixture.ts`（新）

- Item Types: `Fix`

- [x] 6 preset 落地：`weather` / `code` / `formula` / `reasoning` / `citation` / default，内容按 product-spec.md fixture 大纲；11 元素覆盖矩阵满足「每元素在 6 preset 全集上 ≥1」（矩阵表内嵌文件头注释，可逐项核对）
- [x] default preset 开头词为 `Hello`（兼容 `ai-widgets-demo.spec.ts:111` 断言，live 核实）
- [x] 分发器 `pickAiWidgetsFixture(lastUserText: string)`：关键词大小写不敏感匹配，未命中回 default preset；关键词用 `formula`（非 `math`）

Exit Criteria:

- [x] fixture 文件存在，导出 6 preset 与分发器；覆盖矩阵表可逐项核对
- [x] `formula` 关键词命名落地（grep 无 `math` 关键词分发残留）

### Phase 3 - env 工厂 option 化与 demo 接线

Status: completed
Targets: `apps/playground/src/ai/mock-ai-env.ts`、`apps/playground/src/pages/ai-widgets-demo.tsx`

- Item Types: `Fix`

- [x] `createMockAiEnv(options?: { delayMs?: number; fixtures?: boolean })`；不传 options 时行为与现状逐 chunk 等价（15ms + echo + CANNED_REPLY_WORDS）
- [x] `fixtures: true` 时 stream 按 `pickAiWidgetsFixture(extractLastUserText(...))` 选 preset，chunk 形态沿用 `{ choices: [{ delta: { content } }] }`，末尾 `finish_reason: 'stop'` 不变（流式兼容 markdown-buffer 既有边界处理）
- [x] `ai-widgets-demo.tsx` 传 `{ delayMs: 200, fixtures: true }`（收口 G10）；其余 12 处调用点（含 `ai-chat-demo.tsx`、`component-lab/renderers/data-c8-1-host.ts`）零改动
- [x] playground dev 实跑抽查 6 路触发（5 关键词 + 无关键词）均出对应 preset 内容，200ms 节奏肉眼可见（结果记 daily log）

Exit Criteria:

- [x] live 可核对（调用点层面，不含 `mock-ai-env.ts` 内定义）：`grep -rn "createMockAiEnv(" apps/playground/src/pages apps/playground/src/component-lab` 仅 widgets demo 一处带 options，其余全部零参
- [x] widgets demo 流式节奏 200ms 生效（dev 抽查记录）

> Dev 抽查证据（2026-08-24，headless Chromium × 真实 dev server，daily log `docs/logs/2026/08-24.md` D1 节）：6 路（weather/code/formula/reasoning/citation/default）全部命中对应 preset；200ms/chunk 生效实证 = 流全程时长 7.9s–20.5s ≈ token 数 × 200ms（default 38 token ≈ 7.9s）。**注**：token 级逐帧节奏受 `docs/bugs/166`（ai-chat context 不随 chunk 重渲染，pre-existing）限制，内容在流尾一次性上屏——该缺陷属 `flux-renderers-ai` 包（本 plan Out Of Scope），已登记并路由 successor；duration 级节奏（秒级流式过程 + spinner）已可见。

### Phase 4 - e2e 转绿与回归

Status: completed
Targets: `tests/e2e/ai-widgets-fixture.spec.ts`

- Item Types: `Proof`

- [x] Phase 1 的新 spec 全部转绿（≥6 测试 pass）
- [x] 回归：既有 13 个 `ai-*.spec.ts` 全过（重点 `ai-widgets-demo.spec.ts` 10 测试 + `ai-chat.spec.ts` 3 处 `Hello` 断言）

Exit Criteria:

- [x] 新 spec ≥6 测试全过（Playwright，程序化断言，无截图判定）
- [x] 13 个既有 ai spec 全过且零断言修改；若出现关键词碰撞，修 fixture 内容并在 plan 内记录 Decision

> 回归证据（2026-08-24）：live ai spec 家族已增至 16 个（plan 基线 13 + 后续 mission 新增 3），全部跑过：16 个 `ai-*.spec.ts` + `playground-entry-pages.spec.ts` smoke = **179 passed**（`ai-attachments` 2 例 flaky 重试通过，上传用例与本改动无因果）。重点 `ai-widgets-demo.spec.ts` **10/10**（streaming 用例 9.0s，`Hello` ~7.9s 上屏 < 10s 断言预算）+ `ai-chat.spec.ts` **10/10**（零参 env 行为不变）。`playground-entry-pages.spec.ts:490` route inventory 失败为 **stash 实证 pre-existing**（干净树同样红，属工作区另一未提交 mission 的清单 drift，非 ai spec、非本 plan 范围）。零关键词碰撞（无需 Decision）。实现侧修正 2 处 Playwright strict mode 多元素违规（`.first()`，断言语义不变，非既有断言修改）。

## Draft Review Record

- Reviewer / Agent: round 1 fresh session `ses_fce51d64effe5fFDsCg87yswMQ`；round 2 fresh session `ses_fce3e519fffeLwa4K10MGNabIh`（2026-08-24）
- Verdict: round 1 `fail` → 修订后 round 2 `pass`
- Rounds: 2
- Findings addressed: 【Major】① Test Strategy 声明 `必须自动化` 但原 Phase 排序 Fix 先于 Proof，违反 AGENTS.md Tiers / plan guide「When Drafting #12」——已重构为 Phase 1 e2e 预期先行（red 锁定）→ Phase 2/3 Fix → Phase 4 转绿回归。【Minor，已顺手修正】② 调用点计数 14→13、pages 数 8→12；③ Phase 3 grep 判定收窄到调用点（pages/ + component-lab/，排除 mock-ai-env.ts 定义行）；④ Phase 1 补 D0 前置检查项；⑤ default 测试标注「须同时断言富内容代表元素」防 red 阶段假绿

## Closure Gates

- [x] G1（mock 只回 8 词）与 G10（流式节奏不可见）收口：live 可核对 6 preset 文件 + widgets demo `delayMs=200`（G10 注记：200ms/chunk 已生效，流全程秒级可见；token 级逐帧节奏受 pre-existing `docs/bugs/166` 限制，已登记路由 successor——该缺陷在 `flux-renderers-ai` 包内，属本 plan Out Of Scope，非静默降级）
- [x] 既有 e2e 零破坏：13 个 `ai-*.spec.ts` 全过（live 已增至 16 个全过，见 Phase 4 证据），且未修改任何既有断言
- [x] focused verification：`ai-widgets-fixture.spec.ts` ≥6 测试全过（6/6）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（bug 166 非 in-scope：包文件属 Out Of Scope，已登记 + 路由）
- [x] owner-doc：无需更新（mock 属 playground host 层，不改包公共契约；owner-doc 同步统一归 DG；发现项按 `docs/bugs/00-bug-fix-note-writing-guide.md` 落 `docs/bugs/166`）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——结构化 widget 触发属 D5 successor 的 by-design scope 划分，见 Non-Goals，不是本 plan 的 deferred 项）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 4 Phase 全部落地并勾选——6 preset fixture + 关键词分发器（D0 spec §4 契约逐项兑现）、`createMockAiEnv` option 化（零参逐 chunk 等价，13 处既有调用点按构造不变）、widgets demo `delayMs=200` 接线、新 e2e 6/6 绿 + 16 个既有 ai spec 零破坏零断言修改。G1 全收口；G10 duration 级收口（200ms/chunk 实证、流全程秒级），token 级逐帧节奏受 pre-existing `docs/bugs/166` 限制（包内缺陷，本 plan Out Of Scope，已登记路由 successor，非静默降级）。结构化 widget 触发归 D5 successor（by-design scope 划分）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh session `ses_fcc052afaffesMjE6tnyF1MOBx`（2026-08-24，verdict **approved**，0 Blocker / 0 Major / 0 Minor / 3 Informational）
- Evidence: 审计 session 独立复核 A–I 全 PASS——live 逐格核对 11×6 覆盖矩阵、首句关键词避让、零参等价 `git diff` 字节级比对、调用点 grep（13 处仅 widgets 带 options）、独立复跑 e2e（fixture spec **6 passed**、widgets-demo + chat **20 passed**）、bug 166 登记与路由诚实性、plan/log 文本一致性；证据摘要见 `docs/logs/2026/08-24.md` D1 节。

Follow-up:

- no remaining plan-owned work（结构化 fixture 扩展归 D5 successor；ai-chat 流式逐帧渲染缺陷归 `docs/bugs/166` successor，均已显式路由，无 in-scope 遗留）
