# 2 fixture 中文关键词分发 + e2e 货币/`\(` 数学增强

> Plan Status: completed
> Last Reviewed: 2026-08-25
> Mission: ai-widgets-product
> Work Item: fixture-zh-dispatch-e2e-math
> Source: `docs/plans/2026-08-25-0410-1-ai-bubble-math-delimiter-pipeline-remediation.md` Non-Blocking Follow-ups（e2e 层货币 / `\(` fixture 增强，"随后续批次"）+ `docs/backlog/audit-followups-2026-08-24-0803.md` 备注（源审计盲区自评：`pickAiWidgetsFixture` 仅英文 keyword，中文提问全部落入 default preset）
> Related: `docs/plans/2026-08-25-0440-1-audit-p2-remediation-batch.md`（先行执行；本 plan 依赖其收敛后的稳定渲染器面，无代码级依赖）

## Purpose

把 showcase fixture 的两条延后增强收口：(a) `pickAiWidgetsFixture` 支持中文关键词分发——中文旗舰 demo 里中文提问全部落入 default preset，弱化 fixture 演示价值；(b) formula preset 补货币句与 `\(...\)` 行内数学，把 0410 plan 已修的货币消歧 / paren-math 行为从 unit 层提升到 e2e 层可观测。

## Current Baseline

（2026-08-25 live 核对）

- `apps/playground/src/ai/ai-widgets-fixture.ts:197-212`：`KEYWORD_ORDER` 5 个英文关键词（`weather` / `code` / `formula` / `reasoning` / `citation`），`pickAiWidgetsFixture` 对 last user text 做 case-insensitive `includes` 匹配，未命中回落 `default`。**无中文别名**——中文输入（如"今天天气怎么样"）全部回落 default。
- 分发链：`mock-ai-env.ts:84` `fixtures: true` 时 `pickAiWidgetsFixture(userText)`；`ai-widgets-demo.tsx` 以 `createMockAiEnv({ delayMs: 200, fixtures: true })` 启用。
- formula preset（`ai-widgets-fixture.ts:140-158`）当前含 `$$...$$` 块级 + `$...$` 行内 + blockquote；**无货币句、无 `\(...\)` / `\[...\]` 定界符**。
- 0410 plan 已落地渲染侧行为：货币消歧（`$5 ... $10` 渲染为普通段落文本，无 `.katex`）+ `\(...\)` / `\[...\]` 配对映射渲染（`.katex` / `.katex-display`），unit 层 proof 齐备（`markdown-d6-math-code.test.tsx`），e2e 层无覆盖。
- e2e `tests/e2e/ai-widgets-fixture.spec.ts` 6 测试（每关键词 1 + default 回落 1），formula 用例断言 `blockquote` + `span.katex` + `.katex-display`；另有 `tests/e2e/ai-widgets-demo.spec.ts:183-193`（G5）同样分发 formula preset 并断言 `span.katex` ≥ 2 + `.katex-display`——两 spec 同属本 plan 零回归面；`apps/playground` 有 vitest（`"test": "vitest run"`，colocate 先例 `src/pages/*.test.tsx`，共享 include 覆盖 `src/ai/`），`src/ai/` 下无 unit 测试。
- fixture 内容契约 owner：`docs/components/flux-renderers-ai/product-spec.md` §4（6 preset + 关键词 + 11 元素矩阵 + §4.3 `formula` 命名裁定）。fixture 头注约束：关键词不得出现在其他 preset / default 首句（echo-collision 防护）；`default` / `code` / `formula` 保持纯 markdown。

## Goals

- 中文提问可按语义命中对应 preset（天气→weather、代码→code、公式→formula、推理→reasoning、引用→citation），优先级与英文分发一致，未命中仍回落 default。
- formula preset 追加货币句 + `\(E = mc^2\)` 行内数学（append-only，既有断言零破坏）。
- e2e 层新增断言：货币句以普通文本渲染（所在段落无 `.katex`、`$5` 字面可见）+ paren 数学渲染为 `.katex` + 中文关键词触发 formula preset。
- product-spec §4 关键词契约补中文别名表。

## Non-Goals

- 不做 demo UI 文案中文化（prompts / suggestions 示例仍为英文；本 plan 只做 dispatch 层中文支持）。
- 不改 `createMockAiEnv` 默认 `delayMs` / 流式节奏（roadmap Rule：13 个既有 e2e 的节奏兼容）。
- 不动 markdown pipeline / `math-delimiter-preprocess.ts` 代码（0410 已收口；本 plan 只加 fixture 内容与 e2e 断言）。
- 不给 `\[...\]` 块级 paren 加 fixture 展示（0410 follow-up 原文只登记货币 + `\(`；`\[` 的 unit 层 proof 已存在）。

## Scope

### In Scope

- `apps/playground/src/ai/ai-widgets-fixture.ts`（KEYWORD_ORDER 中文别名 + formula preset 追加内容）
- `apps/playground/src/ai/ai-widgets-fixture.test.ts`（新 colocated unit 测试）
- `tests/e2e/ai-widgets-fixture.spec.ts`（新增/扩展用例）
- `docs/components/flux-renderers-ai/product-spec.md` §4（中文别名表）

### Out Of Scope

- `mock-ai-env.ts` 分发机制与 connector 行为。
- `ai-widgets-demo.tsx` schema / UI 文案。
- 其他 preset 内容改写（append-only 原则仅作用于 formula）。

## Failure Paths

| 场景编号           | 触发                          | 行为                                                    | 可重试 | 用户可见表现     |
| ------------------ | ----------------------------- | ------------------------------------------------------- | ------ | ---------------- |
| zh-no-match        | 不含任何中英关键词的中文输入  | 回落 default preset（既有行为不变）                     | 是     | default 富内容   |
| zh-multi-keyword   | 同时含两个关键词（中英混出）  | 按 KEYWORD_ORDER 既定顺序首个命中者胜（与英文分发同序） | 否     | 对应 preset 内容 |
| currency-paragraph | formula preset 货币句         | 普通段落文本，无 `.katex`、`$5` 字面可见                | 否     | 美元金额不变形   |
| paren-math         | formula preset `\(E = mc^2\)` | 渲染为行内 `.katex`                                     | 否     | 行内公式排版     |

## Test Strategy

本档选择：**必须自动化**。fixture 是 showcase 真实内容 substrate（D1 先例同档）；dispatch 是 fixture public 契约变化，e2e 断言是 0410 行为的产品级 proof。Phase 1 的 unit Proof 与 Phase 2 的 e2e Proof 均先红后绿、排在对应 Fix 之前（Phase 2 e2e 断言对未追加的 preset 内容天然红）。

## Execution Plan

### Phase 1 - 中文关键词分发（unit 层）

Status: completed
Targets: `apps/playground/src/ai/ai-widgets-fixture.ts`、`apps/playground/src/ai/ai-widgets-fixture.test.ts`（新）

- Item Types: `Proof | Fix`

- [x] Proof（先红）：新建 colocated unit 测试 `ai-widgets-fixture.test.ts`——中文输入命中断言（`'今天天气怎么样'` → weather、`'帮我看看这段代码'` → code、`'解释一下质能公式'` → formula、`'说说你的推理过程'` → reasoning、`'给我几篇引用文献'` → citation）；中英混合（`'weather 天气'` → weather，顺序优先级与 KEYWORD_ORDER 一致）；无关键词中文 → default；英文分发回归（5 关键词 + default）。现状：中文全部回落 default → 中文断言组先红。
- [x] Fix：`KEYWORD_ORDER` 条目扩为多关键词（如 `{ keywords: ['weather', '天气'], id: 'weather' }` 或等效别名结构），匹配循环对每个别名做 includes；顺序语义不变。
- [x] Fix：echo-collision 约束核验——中文别名不得出现在任何 preset / default 内容中（fixture 内容为英文，天然满足；在 fixture 头注约束清单补一行中文别名说明）。

Exit Criteria:

- [x] Phase 1 Proof 全部转绿（`pnpm --filter @nop-chaos/flux-playground test -- ai-widgets-fixture`）；英文分发断言零回归。
- [x] `pickAiWidgetsFixture` 对中文输入的命中语义与 KEYWORD_ORDER 顺序一致（测试覆盖混合优先级）。

### Phase 2 - formula fixture 增强 + e2e 断言

Status: completed
Targets: `apps/playground/src/ai/ai-widgets-fixture.ts`（formula preset）、`tests/e2e/ai-widgets-fixture.spec.ts`、`docs/components/flux-renderers-ai/product-spec.md` §4

- Item Types: `Proof | Fix`

- [x] Proof（先红）：`ai-widgets-fixture.spec.ts` formula 用例追加断言 + 新增 1 个中文分发用例——(a) 含 `$5` 的段落内无 `.katex` 且 `$5` 文本可见（货币字面）；(b) `\(E = mc^2\)` 渲染为行内 `span.katex`（`.katex-display` 不新增——paren 行内不产生块级）；(c) 新用例：发送 `'解释一下质能公式'` → formula preset 标志物（blockquote）可见。断言沿用既有 30s 超时与 `assertTrackedPageErrors` 模式；对未追加的 preset 内容 / 未实现的中文分发，三支断言现状全红。（执行注记：Phase 1 先落地使 (c) 在 Phase 2 Proof 时已绿，其先红证据记录于 Phase 1 Proof 运行（中文断言组 2 failed）；(a)/(b) 在 fixture 追加前实测红——currency 段落定位超时。）
- [x] Fix：formula preset 内容**末尾追加**（append-only，`"Where it shows up"` 列表与 blockquote 之间或其后）：货币句一段（`A premium plan costs $5 today and $10 tomorrow.`）+ 行内 paren 数学句（`In inline form, \(E = mc^2\) holds for every inertial frame.`）。既有 blockquote / `$$` 块 / `$...$` 行内不动（既有 e2e 断言面零破坏）。
- [x] Fix：product-spec §4 同步——关键词契约补中文别名表（5 中文名 + 顺序语义 + 未命中回落 default 不变；§4.3 `formula` 命名裁定不受影响）；§4.1/§4.2 的 formula 条目描述补货币句 + `\(...\)` 行内定界符；`ai-widgets-fixture.ts` 头注约束清单同步（formula 不再只有 `$` / `$$` 源定界符）。

Exit Criteria:

- [x] e2e 追加断言与新用例全绿；既有 fixture e2e 零回归（`ai-widgets-fixture.spec.ts` 6 用例 + `ai-widgets-demo.spec.ts` G5 formula 断言，append-only 验证）。
- [x] product-spec §4 与 live dispatch 行为一致（含中文别名）。

## Draft Review Record

- Reviewer / Agent: fresh sub-agent session `ses_fca7b0f8affeOspu7F4GnJypgc`（非起草 session）
- Verdict: `pass`
- Rounds: 1
- Findings addressed: 0 Blocker / 0 Major / 4 Minor——① Phase 2 Proof/Fix 次序调整为先红后绿 + Test Strategy 措辞覆盖 e2e 分支（已修正）；② owner-doc 覆盖扩至 product-spec §4.1/§4.2 formula 条目 + fixture 头注（已修正）；③ playground 包名占位符钉死为 `@nop-chaos/flux-playground`（已修正）；④ 零回归面登记补 `ai-widgets-demo.spec.ts` G5（已修正）。

## Closure Gates

- [x] 中文分发 unit Proof 先红后绿，英文分发零回归。
- [x] formula preset append-only 增强 + e2e 货币/paren/中文三分支断言全绿，既有 fixture e2e（`ai-widgets-fixture.spec.ts` + `ai-widgets-demo.spec.ts` G5）零回归。
- [x] product-spec §4 中文别名表与 live 一致。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（exit 0，零新增红）

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- `\[...\]` 块级 paren 的 fixture 展示（unit 层 proof 已存在于 `markdown-d6-math-code.test.tsx`；如后续 showcase 需要块级 paren 演示再追加）。

## Closure

Status Note: 两条延后增强收口。① 中文关键词分发：`KEYWORD_ORDER` 扩为英文+中文别名组（weather/天气、code/代码、formula/公式、reasoning/推理、citation/引用），`keywords.some(includes)` 匹配，KEYWORD_ORDER 顺序语义与 default 回落不变；colocated unit 测试 `ai-widgets-fixture.test.ts` 先红（中文组 2 failed——全部回落 default）后绿，英文分发回归零破坏。② formula preset append-only 增强：末尾追加货币句 `A premium plan costs $5 today and $10 tomorrow.`（渲染普通段落、无 `.katex`、`$5` 字面可见）+ 行内 paren 句 `In inline form, \(E = mc^2\) holds for every inertial frame.`（渲染 `span.katex`、`.katex-display` 计数保持 1）；既有 blockquote / `$$` 块 / `$...$` 行内字节不动。e2e `ai-widgets-fixture.spec.ts` formula 用例追加 (a)/(b) 两支断言（fixture 追加前实测红——currency 段落定位超时）+ 新增中文分发用例（发送 `'解释一下质能公式'` → blockquote；其先红证据在 Phase 1 Proof 运行）。product-spec §4 同步：中文别名表 + 别名分发语义（顺序优先级 / default 回落 / echo-collision）、§4.1/§4.2 formula 条目补货币句与 `\( ... \)` 定界符；fixture 头注同步（中文别名 echo-collision 行 + formula 定界符说明）。验证：playground 27 files/181 tests 全绿；e2e fixture 家族 `ai-widgets-fixture.spec.ts`（7 测）+ `ai-widgets-demo.spec.ts`（17 测，G5 在内）全过（首轮 2 例 dev-server 冷启动延迟 flaky、重试通过、复跑稳定——登记于 playwright.config.ts 的既有环境模式）；`pnpm typecheck`/`build`/`lint` 37/37、`pnpm test` 68/68 tasks、`pnpm check` exit 0。0410 plan 的 e2e 层 follow-up（货币 / `\(`）与本 plan 的审计盲区切入点（中文分发）均收口。

Closure Audit Evidence:

- Auditor / Agent: fresh sub-agent session `ses_fca5c6f0bffeWwhBs93xTXyt4w`（非执行 session）
- Evidence: Verdict `approved`，0 Blocker / 0 Major / 1 Minor（closure 时序 bookkeeping——8 项非审计 gate 当时未勾，属本节勾选前的预期状态）/ 1 Nit（链式断言沿用文件既有默认 expect 超时惯例，无需动作）。10 项 live-repo 核对全过：① plan 文本一致性（Phase 全 `[x]` + `completed`）；② KEYWORD_ORDER 5 别名组顺序 + `keywords.some` 匹配 + lowercase + default 回落 + 头注两处；③ git diff 证 append-only（仅 header / KEYWORD_ORDER / formula 末尾两段，其余 preset 字节一致）；④ 中文别名零碰撞（仅头注与 KEYWORD_ORDER 出现）；⑤ unit 测试覆盖 plan 指定 5 中文输入 + 混合 + 优先级 + 回落 + 英文回归；⑥ e2e 三分支 + 新用例 + `ai-widgets-demo.spec.ts` 零改动；⑦ product-spec §4.2 别名表与 live 一致、§4.1/§4.2 formula 描述同步、§4.3 未动；⑧ `\[` deferral 正当（unit proof 存在于 `markdown-d6-math-code.test.tsx:139`）；⑨ focused 复跑 27 files/181 tests 与执行者声称一致；⑩ demo 路径可达（`mock-ai-env.ts:83-84` `pickAiWidgetsFixture(userText)`，fixtures 模式无 echo）。

Follow-up:

- 0410 plan 的 e2e 层 follow-up（货币 / `\(`）与本 plan 的审计盲区切入点（中文分发）均由本 plan 收口，无剩余 plan-owned work。
