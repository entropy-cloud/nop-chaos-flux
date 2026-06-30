# B5.1 surface GC、markdown XSS 与远程 schema 本地化

> Plan Status: completed
> Last Reviewed: 2026-06-26
> Source: `docs/components/amis-bug-driven-improvement-roadmap.md` B5.1；signal docs `09-layout-surfaces.md` (L1/L7)、`10-data-display.md` (DD9/DD10)、`12-i18n.md` (I1)
> Related: predecessor B2.2（surface-owner 已 done，B5.1 在其 surface 运行时上补 GC 回归门）；同 wave B5.2（tabs/dynamic/chart/i18n I2-I4，依赖 B6.1，独立推进）；successor：本工作项裁定产出的 candidate future（markdown `src`、runtime schema-string i18n）归 roadmap B7。

## Purpose

把 B5.1 的五条 signal 收口到「已锁、已测、已裁定」状态：surface teardown GC 回归门落地；tabs 受控值语义锁定；markdown 内容/安全双契约显式化并裁定 `src` 为 content-only；远程 schema 本地化边界裁定为 loader 层职责并锁 message-key 半边。

## Current Baseline

> 经 live repo 核对（独立 sub-agent explore + 主 agent 复核关键 file:line）。

- **L1（surface GC）— impl + owner doc 已满足，GENUINE TEST-GAP。** `disposeEntry` 顺序释放 status / surface-root validation owner / child scope（`packages/flux-runtime/src/surface-runtime.ts:102-116`）；`close`/`closeTop`/`dispose` 都走 `disposeEntry`（同文件 `:182-196`）；root `runtime.dispose()` 驱动 `ownedSurfaceRuntimes`（`runtime-factory.ts:527-529`、`runtime-owned-factories.ts:277-288`）；React unmount 清理在 `packages/flux-renderers-basic/src/use-surface-renderer.ts:340-364`。owner doc 已声明该契约（`docs/architecture/surface-owner.md:277,411-417`）。**唯一缺口**：仅有单次 dispose 测试（`packages/flux-runtime/src/__tests__/runtime-dialogs-scope.drawer-and-dispose.test.ts:181-221`），无「反复 open/close 后无 retained scope/entry」回归门。
- **L7（tabs 受控值）— ALREADY-SATISFIED（LOCK）。** `useOwnedAxisValue` 显式区分 `local`/`controlled`/`scope` 三态（`packages/flux-renderers-basic/src/interaction-owner.ts:7-58`）；tabs 接线 `tabs.tsx:123-129,355-364`；index 与 string key 都经 `getItemValue` 归一（`tabs.tsx:37-40,141-144`）。owner doc §8.1-8.3 + §10 candidate-fix 规则已写（`docs/components/tabs/design.md:250-294`）。已有 scope-writeback 回归（`packages/flux-renderers-basic/src/__tests__/basic-page-and-tabs-status.test.tsx:127-162`）。**缺口**：无「numeric-index vs string-key 等价」「controlled+mutating bound expr 为唯一真源」的组合矩阵门。注意：默认 `local` 下 `value` 也充当初值（`interaction-owner.ts:32-34`），受控语义仅在 `valueOwnership:'controlled'` 时无歧义——design doc 已显式化，非隐藏耦合。
- **DD9（markdown src once）— GENUINE-GAP（能力缺失，循环按构造不可能）。** markdown 仅同步渲染 `content` 字符串，无 `src`/fetch/effect（`packages/flux-renderers-content/src/markdown.tsx:11-56`）；`MarkdownSchema` 无 `src` 字段（`packages/flux-renderers-content/src/schemas.ts:124-132`）。owner doc 未声明「content-only，无 src」（`docs/components/markdown/design.md:20,42`）。循环属性因能力缺失而 vacuously 成立，但「fetch once per distinct src」无法测试。
- **DD10（markdown sanitize）— PARTIAL。** (a) HTML 清洗已满足 + 已测（`markdown.tsx:35-41` 的 allowHtml 门 + `rehypeRaw`；`packages/flux-renderers-content/src/sanitize.ts:28-42` DOMPurify allowlist；`sanitize.test.ts:10-48` + `markdown.test.tsx:53-68`）。(b) 代码块逐字保留「按构造满足」（`markdown.tsx:51` 仅 `remarkGfm` + 条件 `rehypeRaw`，无转义插件），但**未测、未作为独立规则文档化**。owner doc 仅声明 (a)（`markdown/design.md:10-11`），未声明 (a)+(b) 双关注。
- **I1（locale for remote schema）— GENUINE-GAP（schema-string 半边）。** message-key 查找已满足 + 已测（`packages/flux-i18n/src/i18n.ts:58-97,122-125`、`hooks.ts:1-9`、`i18n.test.ts:42-50,77-101`）。**schema-string i18n（静态/schemaApi/dynamic 统一 + locale 切换重算）未实现**：`getMessageFormatter()` 全仓唯一生产消费者是校验消息（`packages/flux-runtime/src/validation/message.ts:9`）；`flux-formula` 无 `t` builtin；dynamic-renderer 加载 schema 无 i18n pass（`packages/flux-renderers-basic/src/dynamic-renderer.tsx:103-178`）。**架构将 i18n 归 Loader/组装层**（`docs/architecture/frontend-programming-model.md:116`）——Loader 层持有该职责，但 schema-string 翻译 pass 在 runtime 层从未设计、在 Loader 层亦尚未实现。无 owner doc 声明该边界。

## Goals

- L1：落地「反复 open/close 后无 retained SurfaceEntry/scope/ detached DOM」回归门（P0 必须自动化）。
- L7：补 tabs 受控/默认值 + numeric-index-vs-key 组合回归矩阵，锁定 LOCK。
- DD9：裁定 markdown 为 content-only（无远程 `src` fetch），owner doc 显式化，使循环属性按构造锁定。
- DD10：owner doc 声明 sanitize 双策略 (a)+(b)，补代码块逐字保留回归锚。
- I1：裁定 schema-string runtime 翻译为 Loader/host 层职责（DESIGN-ACK），owner doc 显式化边界，锁 message-key 半边。

## Non-Goals

- 不实现 markdown 远程 `src` fetch 能力（裁定为 content-only；若未来产品需要，为 successor / B7）。
- 不实现 runtime schema-string i18n 翻译 pass（Loader 层职责；successor / B7）。
- 不覆盖 B5.2 的 tabs items/chart/dynamic-renderer/i18n I2-I4 signal（归 B5.2 plan）。
- 不重构 surface dispose 实现路径（已满足；只补回归门）。
- 不覆盖 condition-builder / cards / action-graph（归 B6.1 plan）。

## Scope

### In Scope

- L1 surface GC 反复周期回归门（新增测试）。
- L7 tabs 受控值组合回归矩阵（新增测试）。
- DD9 markdown content-only 裁定 + `markdown/design.md` 声明。
- DD10 `markdown/design.md` sanitize 双策略声明 + 代码块逐字保留回归锚。
- I1 schema-string i18n 边界裁定 + owner doc（`markdown` 不涉及；写到 i18n owner doc / `frontend-programming-model.md` 或新建 i18n 设计边界段）+ message-key 半边锁定。

### Out Of Scope

- markdown `src` / 远程 fetch 实现（successor）。
- runtime schema-string 翻译 pass 实现（Loader 层 successor）。
- B5.2 / B6.1 / B6.2 信号。

## Failure Paths

> 本计划以「锁定 + 裁定 + 回归门」为主，无新对外 API 契约或鉴权路径，failure paths 不适用（纯测试/文档/裁定）。

## Test Strategy

本档选择：**建议有测**（P0 锚点 L1 必须自动化回归门）。

- L1（P0）：必须自动化——新增反复周期 GC 回归门（弱引用/计数 gate）。
- L7（P0 LOCK）：建议有测——组合回归矩阵（验证正确结果，非 failing-test-first）。
- DD9（P0）：裁定项，无 failing-test（按构造锁定，doc-only）。
- DD10（P1）：建议有测——代码块逐字保留回归锚。
- I1（P0）：裁定项，message-key 半边已有测试；schema-string 半边为 DESIGN-ACK，无 runtime 测试（按构造锁定）。

## Execution Plan

### Phase 1 - Markdown 内容契约与安全双策略（DD9/DD10）

Status: completed
Targets: `packages/flux-renderers-content/src/markdown.tsx`、`packages/flux-renderers-content/src/sanitize.ts`、`docs/components/markdown/design.md`、新增 `markdown.test.tsx` 用例

- Item Types: `Decision | Proof`

- [x] (Decision, DD9) 裁定 markdown 为 content-only：Flux markdown 不引入远程 `src` fetch（content 字段经 `kind:'prop'` 已支持表达式/source 绑定，远程内容应由 loader/组装层或 `content:"${...}"` 提供）。理由：本 roadmap 是「测试/文档边界债」非新功能；远程 md 拉取是 distinct feature，当前 vacuously 满足「不循环」。在 `markdown/design.md` 显式声明「renderer 仅渲染 `content`，不持有 `src`/fetch；远程内容由表达式/source 绑定经 loader 注入」，并顺带澄清 `markdown/design.md:42` 既有「content 支持表达式和 source-enabled value」措辞——「source-enabled 指 `content:"${...}"` 经 loader，非 renderer 持有 src」。若执行期/审阅认为应实现 `src`，升级为 successor feature plan（不在本边界债 plan 收口）。
- [x] (Proof, DD10) 补代码块逐字保留回归锚：markdown 含 ```代码块内`'`与`"` → 断言字面保留（无 entity 双转义）。
- [x] (Proof, DD10) 在 `markdown/design.md` 声明 sanitize 双策略：(a) allowHtml 开启时 DOMPurify allowlist 清洗后 `rehypeRaw` 渲染存活标签（已实现+已测，引 `sanitize.ts:28-42`）；(b) 代码块内容逐字保留、不做 entity 转义（按构造满足）。明确「两者是 distinct concerns」。

Exit Criteria:

- [x] `markdown/design.md` 含「content-only，无 src」声明（DD9）与 sanitize 双策略 (a)+(b) 声明（DD10），与 live `markdown.tsx:35-51` + `sanitize.ts:28-42` 行为一致，无「Proposed vs Current」叙事。
- [x] 新增代码块逐字保留回归锚通过（focused 单测绿）。

### Phase 2 - Surface teardown GC 回归门（L1）

Status: completed
Targets: `packages/flux-runtime/src/__tests__/`（新增 surface GC 回归测试）

- Item Types: `Proof`

- [x] (Proof, L1) 新增反复周期 GC 回归门：open 一个挂载重 owner（form + source）的 dialog，close，重复 N 次（如 50×），断言无 retained SurfaceEntry（entries 归零）、无残留 child scope（`disposeOwnedScope` 调用计数 / 弱引用 gate）。jsdom 无真实 DOM GC，故「detached DOM」以「无 leaked entry/scope 对象 retained」这一可证伪代理断言（entry 计数 + scope dispose 调用计数），不依赖 jsdom GC。复用 `runtime-dialogs-scope.drawer-and-dispose.test.ts` 的 runtime 搭建模式。
- [x] (Proof, L1) 覆盖两条 teardown 入径：单次 `close()`→`open()` 循环，与 root `runtime.dispose()` 后 entries 全清（既有单次用例的反复化，断言 `runtime-owned-factories.ts:288` 的 `ownedSurfaceRuntimes` 注册被驱动）。

Exit Criteria:

- [x] 反复周期 GC 回归门存在并绿（focused 单测，验证「retained scope/entry 为零」正确结果，非仅无报错）。
- [x] owner doc `surface-owner.md:277,411-417` 契约与 live `disposeEntry`（`surface-runtime.ts:102-116`）行为一致（无改动则仅复核确认）。

### Phase 3 - Tabs 受控值语义锁定（L7）

Status: completed
Targets: `packages/flux-renderers-basic/src/__tests__/`（新增 tabs 受控值矩阵测试）、`docs/components/tabs/design.md`

- Item Types: `Proof`

- [x] (Proof, L7) 补组合回归矩阵：(1) 仅 `defaultValue`；(2) `value` 绑表达式（`valueOwnership:'controlled'` + scope 变更 → 激活跟随）；(3) items 用 numeric index authoring vs string key authoring → 同一激活语义；(4) `valueStatePath` writeback 驱动激活（既有 `basic-page-and-tabs-status.test.tsx:127-162` 已覆盖此项，复核不重复）。
- [x] (Proof, L7) 复核 `tabs/design.md` §8.1-8.3 + §10 与 live `interaction-owner.ts:7-58` 一致；显式化「默认 `local` 下 `value` 充当初值；受控无歧义仅在 `valueOwnership:'controlled'`」若 doc 未点明则补一句。

Exit Criteria:

- [x] numeric-index vs string-key 等价 + controlled+mutating-expr 组合回归矩阵存在并绿。
- [x] `tabs/design.md` 受控/默认语义与 live 一致（无改动则仅复核确认）。

### Phase 4 - 远程 schema 本地化边界裁定（I1）

Status: completed
Targets: i18n owner doc（新建 i18n 设计边界段或写入 `docs/architecture/frontend-programming-model.md`）、`packages/flux-i18n/`、`docs/architecture/api-data-source.md`

- Item Types: `Decision | Proof`

- [x] (Decision, I1) 裁定 schema-string i18n 边界：Flux 的 i18n 契约是「renderer 层 message-key 查找（`t('flux.*')`）经 `useFluxTranslation`/`t()` 解析，reactive 于组件渲染」；**schema-string 的 locale 解析（对 schemaApi-fetched / dynamically-injected schema 的字符串翻译）属 Loader/组装层职责**（引 `frontend-programming-model.md:116`），runtime 不在渲染期对任意 schema 字符串做翻译 pass。理由：本 roadmap 是测试/文档边界债；runtime schema-string 翻译 pass 是 distinct feature（涉及编译期/加载期 i18n pass），当前未实现且架构未如此设计。若产品判断需 runtime schema-string 翻译，升级为 successor（B7）。
- [x] (Proof, I1) 锁 message-key 半边：复核既有 `i18n.test.ts:42-50,77-101`（message-key + reactive 组件字符串）覆盖「renderer 层 message-key 查找 reactive 于 locale」；如缺「remote/dynamic schema 的 renderer-owned `t()` 字符串随 locale 重算」可证的窄路径，补一个 focused 锚（验证 renderer-owned 默认字符串经 `t()` 在 locale 切换后重算）。
- [x] (Proof, I1) owner doc 显式化：在 i18n owner doc 写明「locale 解析覆盖：renderer message-key 半边（Flux runtime 契约，已锁）；schema-string 翻译半边（Loader/host 层职责，DESIGN-ACK，successor B7）」，并引 `getMessageFormatter` 唯一消费者为校验消息（`validation/message.ts:9`）作为证据。

Exit Criteria:

- [x] i18n owner doc 含 I1 边界裁定声明，与 live（`i18n.ts:58-97`、`validation/message.ts:9` 唯一消费者、无 `t` formula）一致。
- [x] message-key 半边回归锚存在并绿（既有或新增 focused 锚）。

## Draft Review Record

- Reviewer / Agent: fresh-session `general` sub-agent（task `ses_0fe0fbc6bffe3exk522EJ6B8ZD`，独立复核，不复用起草上下文）
- Verdict: `pass-with-minors`（零 Blocker / 零 Major）
- Rounds: 1
- Findings addressed:
  - 全部 L1/L7/DD9/DD10/I1 引用 file:line 经 live repo 核对准确（disposeEntry 链、tabs ownership、markdown content-only、sanitize、i18n sink 唯一消费者、无 `t` formula、无 i18n owner doc）。
  - DD9/I1 裁定诚实（genuinely-absent amis-parity feature Flux 从未声称，非 live defect/contract drift；successor + non-blocking 理由充分）。
  - Minor 已处理：`runtime-owned-factories.ts` 引用收窄到 `:288` 注册行；`dynamic-renderer.tsx` 补 `packages/flux-renderers-basic/src/` 前缀；I1 phrasing 改为「runtime 层从未设计；Loader 层持有职责但 schema-string pass 尚未实现」；L1 detached-DOM 改为可证伪代理（entry/scope retain 计数，不依赖 jsdom GC）；`design.md` source-enabled 措辞澄清并入 Phase 1。

## Closure Gates

- [x] L1 反复周期 surface GC 回归门已落地并绿。
- [x] L7 tabs 受控值组合回归矩阵已落地并绿。
- [x] DD9 markdown content-only 裁定已文档化（owner doc 与 live 一致）。
- [x] DD10 sanitize 双策略 (a)+(b) 已文档化 + 代码块逐字保留回归锚绿。
- [x] I1 schema-string i18n 边界裁定已文档化 + message-key 半边回归锚绿。
- [x] 不存在被静默降级到 deferred/follow-up 的 in-scope live defect 或 contract drift（DD9/I1 的 successor 均为「distinct feature / Loader 层职责」，附带 non-blocking 理由）。
- [x] 受影响 owner docs（`markdown/design.md`、`surface-owner.md`、`tabs/design.md`、i18n owner doc）已同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`（workspace 55 tasks 全绿）
- [x] `pnpm build`（workspace 全绿）
- [x] `pnpm lint`（workspace 29 tasks 全绿）
- [x] `pnpm test`（workspace 55 tasks 全绿）

## Deferred But Adjudicated

### markdown 远程 `src` fetch（DD9 successor）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 当前 markdown 仅渲染 `content`（`markdown.tsx:11-56`、`schemas.ts:124-132` 无 `src`），循环属性 vacuously 成立；远程 md 拉取是 distinct feature，Flux 从未声称。`content` 已支持表达式/source 绑定（`kind:'prop'`）覆盖多数远程内容场景。本工作项锁定 content-only 契约。
- Successor Required: `yes`
- Successor Path: `docs/components/amis-bug-driven-improvement-roadmap.md` B7（如产品判断需 markdown `src`，开独立 feature plan）。

### runtime schema-string i18n 翻译 pass（I1 successor）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 架构将 i18n 归 Loader/组装层（`frontend-programming-model.md:116`）；runtime 不在渲染期翻译任意 schema 字符串；`getMessageFormatter` 唯一消费者为校验消息（`validation/message.ts:9`）。message-key 半边（renderer `t()`）已满足+已测。schema-string 统一翻译 pass 是 distinct feature（编译期/加载期 i18n），Flux 从未声称在 runtime 做。
- Successor Required: `yes`
- Successor Path: `docs/components/amis-bug-driven-improvement-roadmap.md` B7（如产品判断需 runtime schema-string 翻译，评估为 Loader 层 feature 工作项）。

## Non-Blocking Follow-ups

- （DD9 的 `design.md` source-enabled 措辞澄清已并入 Phase 1 DD9 Decision item，不再单列。）
- markdown 远程 `src` 若未来产品需要 → successor B7（见 Deferred）。

## Closure

Status Note: 全部 4 个 Phase 已执行并勾选；workspace `pnpm typecheck`/`build`/`lint`/`test` 全绿。closure-audit 由独立 fresh-session `general` 子 agent 完成，verdict `pass`（零 Blocker/Major/Minor），证据见下。

Closure Audit Evidence:

- Auditor / Agent: fresh-session `general` sub-agent（task `ses_0fddd6ebeffesgzRUitvSnwDiO`，独立 closure audit，不复用执行上下文）
- Verdict: `pass`（零 Blocker / 零 Major / 零 Minor）
- Evidence:
  - Phase 1（DD9/DD10）：`markdown.tsx:11-56` 确无 `src`/fetch/effect；`schemas.ts:124-132` 无 `src` 字段；`sanitize.ts:28-42` + `markdown.tsx:40-41,51` 仅 `remarkGfm`+条件 `rehypeRaw`；`markdown/design.md` §5/§9/§12 与 live 一致无 Proposed-vs-Current；`markdown.test.tsx` 代码块逐字保留锚 spot-run 绿（断言字面保留 + `not.toContain` entity 双转义）。
  - Phase 2（L1）：`surface-runtime.ts:102-116` disposeEntry 释放 status→validationOwner.dispose+release→disposeOwnedScope；`close`/`closeTop`/`dispose`（`:182-196`）均经 disposeEntry；`runtime-factory.ts:527-529` + `runtime-owned-factories.ts:278-288` 驱动 ownedSurfaceRuntimes；`surface-teardown-gc.test.ts` spot-run 绿（50× entries 归零 + disposeScope=50 + root dispose 清栈）；`surface-owner.md` 未改动（git 确认 test-only）。
  - Phase 3（L7）：`interaction-owner.ts:32-34`=`defaultValue ?? value ?? fallbackValue`、`:38-40` controlled=value 单一真源；`tabs.tsx:37-40,123-129` 接线；`tabs-controlled-value-matrix.test.tsx` spot-run 绿（local+defaultValue / numeric vs string-key 等价 / controlled+mutating-expr）；`tabs/design.md:250-258` §8.1 与 live 一致。
  - Phase 4（I1）：`getMessageFormatter` grep 唯一生产消费点 `validation/message.ts:2,9`；flux-formula 无 `t` builtin；`frontend-programming-model.md` 新 i18n 边界段与 live 一致；`i18n.test.ts` I1 双向 locale 锚 spot-run 绿（保存→Save→保存）。
  - No-silent-downgrade：DD9 `src` / I1 schema-string 翻译均为 legitimately-absent distinct feature（Flux 从未声称），正确路由 successor B7 + non-blocking 理由，非隐藏 live bug。
  - Scope integrity：`git diff --stat` 仅 docs + 测试文件（无生产源码改动），匹配「lock+adjudicate+回归门，无新 runtime feature」范围。

Follow-up:

- closure-audit 已由 fresh-session 子 agent 完成（pass），对应 gate 已勾选。
- 候选 successor（roadmap B7）：markdown 远程 `src` fetch、runtime schema-string i18n 翻译 pass（均 distinct feature / Loader 层职责，见 Deferred But Adjudicated）。
