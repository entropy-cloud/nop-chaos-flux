# {2} Validation / I18n / Diagnostics / Contract-Honesty Anchor Honesty

> Plan Status: completed
> Last Reviewed: 2026-06-27
> Mission: amis-bug-driven-improvements
> Source: remediation bundle for the validation/i18n/diagnostics/contract-honesty anchor findings (G3/G4/G14/G15/M-02/M-06/M-08/M-09) of the 2026-06-26-1859 audit round (G16 verified false-positive, rejected — see Rejected Findings)
> Source Audits: audits/2026-06-26-1859-open-audit-amis-bug-driven-improvements.md, audits/2026-06-26-1859-multi-audit-amis-bug-driven-improvements.md
> Related: docs/plans/2026-06-26-0406-1-b12-validation-rule-semantics-expression-params-plan.md, docs/plans/2026-06-27-0007-3-async-lifecycle-abort-and-inflight-race-hardening-plan.md

## Purpose

收口本 mission 引入或触及的「正确性 / 诊断 / 契约诚实」锚定缝线：让校验消息开关、requiredRange 完整文档与 i18n、依赖再校验失败路由、异步错误诊断、契约扫描器的「能力句柄」匹配真正按其声明语义生效。统一主题是「这层安全网本应挡住正是本 mission 想退休的那类 drift——但它没挡，是戏剧性的」。把这些缝线从「存在」变为「按契约生效」。

## Current Baseline

核对自 HEAD `77bd50b6`（与两份审计快照一致）：

- **G3（rule.message 被静默丢弃）**：`packages/flux-runtime/src/validation/message.ts:12-19`——`required`(13)/`minLength`(17)/`maxLength`(19) 三 case **无** `rule.message ??` 守卫；同族 `minItems`(21)/`maxItems`(23) 及 mission 新增的 `requiredRange`(15) 都正确守卫。`ValidationRule`（`flux-core/src/types/validation.ts`）对三者都声明 `message?: string`。`required` 是最高频校验。
- **G14（requiredRange 无专属 i18n）**：`message.ts:14-15` 的 `requiredRange` 复用通用 `validation.required`；规则只在**部分**填写区间时触发，用户却读到「{{label}} is required」。两份 locale 均无 `validation.requiredRange` key。
- **M-02（owner-doc drift）**：`docs/architecture/form-validation.md:706` 断言 union 支持「exactly these」16 个 kind，遗漏 mission 新增的 `requiredRange`（`flux-core/src/types/validation.ts:11`，已在 union、`builtInValidators`、`createRangeFieldValidation()`→`date-range` 链路落地，M-R1 复核确认未失联）。
- **M-09（V18 收敛未完成）**：`form-runtime-owner.ts:~308-310` 的 `applyChangesAndRevalidate` 裸 `await revalidateDependents(path, reason)`，未套用 `executeSetValues`（`form-runtime-values.ts:147-153`）的 `attachDependentRevalidationFailureHandler(..., reportDependentRevalidationFailure)`。三条入口行为不一致：`validateForm`→诊断、`executeSetValues`→诊断+同步返回、`applyChangesAndRevalidate`→裸 reject。`form-validation.md:282-284` 要求依赖触发再校验失败经诊断缝上报。文件内注释（`~406-416`）声称已收敛，实际未覆盖该入口。
- **M-08（adaptor 错误路径裸 catch）**：`request-runtime.ts:404-421`——F3 的 fallback 正确保留后端消息，但 `catch {}` 完全裸：无 `env.monitor?.onError`、无 `console.warn`、无 `{ cause }`。写坏的 `responseAdaptor` 在每个错误响应静默吞掉；成功路径（`:432-440`）无 catch 直传，错误路径被静音——不对称。
- **M-06（dedup/cache 丢弃 caller signal）**：`runtime-action-helpers.ts:137-188`——共享 fetch 只用 `registrySignal`，caller `signal` 从未读；cache-hit 在 `:152-158` 直接返回 `{ok:true}` 不检查 `signal?.aborted`。**已裁定**：共享 fetch 不取消是文档化意图（`api-data-source.md:310`），故 P2→P3；唯一 residual 是「已 abort 的 caller 命中 cache 仍收 `{ok:true}`」。
- **G4（capability 扫描近似 no-op）**：`packages/flux-core/src/contract-honesty.ts:48-51`——`isCapabilityHandleReferenced` 仅为 `['"]${handle}['"]`，对任何带引号出现都 true。真实句柄是常用词（`'submit'`/`'validate'`/`'reset'`/`'setValue'`…），渲染器包里到处是带引号字面量（方法比较、action 类型、i18n key、错误消息）。一个静默丢弃 `submit` 实现的 ComponentHandle 仍能通过。其 JSDoc（`:43-47`）**自称**锚定到 `method === '<handle>'` / `listMethods` 数组，但正则未强制。现有测试只注入 `'injectedFakeCapability'`（全源不存在），只断言真负路径。
- **G15（blob 粒度 + 注释/字符串敏感）**：`contract-honesty.ts:62-103` 的 `findUnreferencedContracts` 对每包用单一 `sourceText`——渲染器 A 对 `events.onChange` 的使用会掩盖渲染器 B 未用的 `onChange`，`// events.onChange` 注释也算引用。该单一-blob 粒度对 **event key 与 capability handle 都成立**：例如 form 包的 `contract-honesty.test.ts` 把能力句柄对 `${formSource}\n${runtimeSource` 拼接 blob 检查，故 sibling 包对 `'submit'` 的任何引用都会掩盖本渲染器句柄实现的缺失（与 G4 的退出标准直接耦合，见 Phase 5）。
- **G16（死 i18n key）—— 经 live 核对为「误报」，移出本计划 scope**：审计称 `flux.queryFailed` 无人消费。live 核对：实际 key 是 `flux.common.queryFailed`（`en-US.ts:31`/`zh-CN.ts:31`），且**已被消费**于 `crud-renderer.tsx:420`（`t('flux.common.queryFailed')`，C-07 接线，见 `docs/logs/2026/06-25.md`/`06-26.md`）。非缺陷，归入下方 Rejected Findings。
- 绿基线：`pnpm typecheck`/`test`/`lint` 全过。

## Goals

- `buildValidationMessage` 对所有 kind 一致尊重 `rule.message`（含 required/minLength/maxLength）。
- `requiredRange` 拥有专属 i18n key 且 owner-doc 的「exactly these」列表包含它，doc 与 live code 一致。
- 三条依赖再校验入口（`validateForm`/`executeSetValues`/`applyChangesAndRevalidate`）对失败均经诊断缝上报；收敛注释如实列出已覆盖入口。
- `responseAdaptor` 错误路径 catch 提供结构化诊断（monitor/console）并可带 `cause`，与成功路径对称。
- dedup/cache 的 cache-hit 路径在 caller 已 abort 时返回 cancelled 结果（消除 M-06 残留）。
- `isCapabilityHandleReferenced` 锚定到真实句柄接线上下文（`method === '<handle>'`、`invoke`/`hasMethod`/`listMethods` 邻近、method 数组字面量内）；扫描器对「移除真实句柄实现」可触发。
- 扫描器粒度对 event key 与 capability handle 都至少按渲染器定义隔离（消除 sibling masking）并对注释/字符串更稳健。
- 上述每条均有 focused 测试。

## Non-Goals

- 不改 dedup 共享 fetch 的「单订阅 abort 不取消共享 fetch」文档化意图（只补 cache-hit-on-aborted 边）。
- 不重写契约扫描器为 AST 分析（用收紧的正则锚定 + per-definition 粒度即可达成契约）。
- 不动 table/composite/data-lifecycle 簇（归 Plan {1}/{3}）。

## Scope

### In Scope

- `packages/flux-runtime/src/validation/message.ts`（G3、G14）
- `packages/flux-runtime/src/form-runtime-owner.ts`（M-09）
- `packages/flux-runtime/src/async-data/request-runtime.ts`（M-08）
- `packages/flux-runtime/src/runtime-action-helpers.ts`（M-06 cache-hit 边）
- `packages/flux-core/src/contract-honesty.ts`（G4、G15）
- `packages/flux-i18n/src/locales/{en-US,zh-CN}.ts`（G14 新增 `validation.requiredRange` key）
- `docs/architecture/form-validation.md`（M-02、M-09 收敛注释）
- 相关 `__tests__`

### Out Of Scope

- table / chart / composite-field / list / tree / picker / upload（Plan {1}/{3}）

## Failure Paths

| 场景                              | 触发                                             | 行为                      | 可重试 | 用户可见表现                 |
| --------------------------------- | ------------------------------------------------ | ------------------------- | ------ | ---------------------------- |
| custom-required-message (G3)      | `required` 规则带 `message`                      | 显示自定义 message        | 否     | 自定义文案                   |
| requiredRange-partial (G14)       | 区间部分填写触发                                 | 显示专属区间文案          | 否     | 范围专属提示                 |
| adaptor-error-silent (M-08)       | `responseAdaptor` 在错误响应抛错                 | 结构化诊断 + 保留后端消息 | 否     | 后端消息仍展示，dev 可见告警 |
| dependent-revalidate-throw (M-09) | `applyChangesAndRevalidate` 内依赖校验抛非 Abort | 经诊断缝上报              | 否     | 表单级错误，无未捕获 reject  |
| capability-handle-dropped (G4)    | ComponentHandle 静默丢弃某句柄实现               | 契约扫描器在测试期失败    | 否     | CI 失败，可定位              |

## Test Strategy

档位选择：**必须自动化**。

理由：这些正是「为已落地行为提供的必要 focused verification」（Non-Degradable）。G4/G15 是 mission 为退休一类 drift 而新增的护栏，护栏失效属硬门禁失败项。每条 Proof 先于 Fix。

## Execution Plan

### Phase 1 - 校验消息一致性与 requiredRange 完整化（G3 + G14 + M-02）

Status: completed
Targets: `message.ts`, `locales/{en-US,zh-CN}.ts`, `docs/architecture/form-validation.md`

- Item Types: `Proof` / `Fix`

- [x] **Proof**：为 `required`/`minLength`/`maxLength` 各加「带 `rule.message` 返回自定义」用例（先失败）；为 `requiredRange` 加「部分填写触发专属文案」用例（先失败）。
- [x] **Fix (G3)**：三 case 前缀 `rule.message ??`。
- [x] **Fix (G14)**：两份 locale 新增 `validation.requiredRange`（区间感知占位，如 `{ label }` + 范围说明）；`message.ts:14-15` 改用该 key。
- [x] **Fix (M-02)**：`form-validation.md:706` 的「exactly these」列表加入 `requiredRange`，附一行说明（区间感知 required 变体；部分填→失败；全空→由通用 `required` 处理）。
- [x] **Proof**：全部转绿；i18n 占位在两 locale 一致。

Exit Criteria:

- [x] 三类规则的自定义 `message` 生效（测试断言）。
- [x] `validation.requiredRange` 存在于两 locale 且被消费（测试 + grep）。
- [x] `form-validation.md:706` 列表与 `validation.ts` union 完全一致（doc-code 抽查）。

### Phase 2 - 依赖再校验失败路由收敛（M-09）

Status: completed
Targets: `form-runtime-owner.ts`, `docs/architecture/form-validation.md`

- Item Types: `Proof` / `Fix`

- [x] **Proof**：测试——在 `applyChangesAndRevalidate` 内令依赖再校验抛非 Abort 错误，断言经诊断缝上报（表单级错误），无未捕获 reject（先失败）。
- [x] **Fix**：用 `attachDependentRevalidationFailureHandler(path, revalidateDependents(...), reportFailure)` 包裹（对齐 `executeSetValues`），或 try/catch 进表单级错误（对齐 `validateFormPath`）。
- [x] **Fix**：收紧 `~406-416` 收敛注释，如实列出三条入口。

Exit Criteria:

- [x] 三入口对依赖再校验失败均经诊断缝上报（测试断言 + 注释如实）。

### Phase 3 - responseAdaptor 错误诊断对称化（M-08）

Status: completed
Targets: `request-runtime.ts`

- Item Types: `Proof` / `Fix`

- [x] **Proof**：测试——`responseAdaptor` 在错误响应抛错时，断言有诊断（`env.monitor?.onError` 或 console）且 `createApiResponseError` 仍带后端消息（先失败）。
- [x] **Fix**：catch 内 `env.monitor?.onError?.({ phase:'adaptor', error, details:{url,status} })`（或 `console.warn`），并可选 `cause: caughtError` 附在抛出的错误上；保留现有 `errorPayload = response.data` fallback。

Exit Criteria:

- [x] adaptor 错误路径有结构化诊断且后端消息仍展示（测试断言）。

### Phase 4 - dedup/cache 已-aborted 边（M-06）

Status: completed
Targets: `runtime-action-helpers.ts`

- Item Types: `Proof` / `Fix`

- [x] **Proof**：测试——caller 传入已 aborted `signal` 且命中 cache，断言返回 cancelled 结果（`signal.reason`），非 `{ok:true}`（先失败）。
- [x] **Fix**：cache-hit 路径检查 `signal?.aborted`，返回 `createCancelledResult(signal.reason)`；共享 fetch 不取消（保留文档化意图）。

Exit Criteria:

- [x] cache-hit-on-aborted 返回 cancelled（测试断言）；共享 fetch 行为不变。

### Phase 5 - 契约扫描器锚定与粒度（G4 + G15，二者强耦合，必须同 phase 收口）

Status: completed
Targets: `contract-honesty.ts`，各包 `contract-honesty.test.ts`（含 form 包对 `${formSource}\n${runtimeSource}` 拼接 blob 的现状调用点）

- Item Types: `Proof` / `Fix`

> 耦合说明：G4 的退出标准（「移除真实句柄实现可被检出」）只有在 G15 把 capability-handle 检查从「整包拼接 blob」收敛到「per-renderer/per-definition 源」之后才可达。否则即使收紧正则，sibling 包对 `'submit'` 的任意引用仍会掩盖本渲染器句柄的缺失。故两项必须同 phase。

- [x] **Proof (G4)**：测试——从真实渲染器的真实 ComponentHandle 移除某真实句柄实现（如某 form handle 的 `'submit'` case），断言扫描器**对该渲染器源**报告该句柄未引用（先失败）。同时保留现有真负用例。
- [x] **Fix (G4)**：`isCapabilityHandleReferenced` 锚定到真实接线——要求 `method === '<handle>'` / `'<handle>'` 出现在 method 数组字面量内 / `invoke`、`hasMethod`、`listMethods` 邻近上下文；使正则与其 JSDoc（`:43-47`）一致。
- [x] **Fix (G15)**：`findUnreferencedContracts` 改为 **per-definition / per-renderer 源**隔离——对 event key **与** capability handle 都不再用整包拼接 blob 检查（form 包现有 `${formSource}\n${runtimeSource}` 调用需改为按渲染器源分别检查）；并过滤注释行引用（`//`/`/*`）。这一步是 G4 退出标准成立的前提。
- [x] **Proof**：移除实现用例转绿；现有「events.onChange」类 event 匹配不因粒度调整而退化（无 sibling 掩盖、注释不算引用）。

Exit Criteria:

- [x] 移除真实句柄实现可被扫描器检出（per-renderer 源，测试断言）。
- [x] event key 与 capability handle 都不再被 sibling 渲染器使用所掩盖（测试断言）。

## Rejected Findings（不进入 scope）

- **G16（误报）**：审计称 `flux.queryFailed` 为无人消费的死 key。live 核对推翻：实际 key 是 `flux.common.queryFailed`（`packages/flux-i18n/src/locales/en-US.ts:31`、`zh-CN.ts:31`），且**已被消费**于 `packages/flux-renderers-data/src/crud-renderer.tsx:420`（`t('flux.common.queryFailed')`，C-07 接线；见 `docs/logs/2026/06-25.md` 与 `06-26.md` 的 C-07 记录）。非缺陷，从 scope 移除，不计入 deferred（无可裁定项）。

## Draft Review Record

- Reviewer / Agent: 两轮独立 fresh-session general 子 agent（R1: ses_0faa62b4dffel0t05riXayTsIa；R2: ses_0fa9c4210ffeMiLuaOHz6mwVJb），均独立通读 + live repo 核对。
- Verdict: R1 `revised`（2 Major）→ R2 `pass-with-minors`（零 Blocker、零 Major）。
- Rounds: 2。
- Findings addressed:
  - R1-Major1（G16 幻影缺陷）：live 核对推翻——实际 key 是 `flux.common.queryFailed`（`en-US.ts:31`/`zh-CN.ts:31`），已被 `crud-renderer.tsx:420` 消费（C-07）。已把 G16 移出 scope/baseline/goals/closure-gates，并入「Rejected Findings」节（非 deferred）。bundle 8 项。
  - R1-Major2（G4 退出标准不可达）：G4 与 G15 强耦合——能力句柄检查当前对 `${formSource}\n${runtimeSource}` 拼接 blob 做，sibling 对 `'submit'` 的引用会掩盖。已把 G15 收紧为对 event key **与** capability handle 都做 per-renderer/per-definition 源隔离，G4 退出标准改为 per-renderer 源可检出，并显式标注 form 包 blob 调用点。R2 确认技术上成立。
  - Minor（R2）：form 渲染器把 ComponentHandle 委托给 flux-runtime 工厂，Phase 5 per-renderer 源解析需把句柄源解析到工厂位置；执行期解决，watch-only。
  - 引用准确性：所有 baseline 项经 R1/R2 live 核对（HEAD `77bd50b6`）一致。
- 共识：达成。Plan 状态 `draft` → `active`。

## Closure Gates

- [x] G3：required/minLength/maxLength 尊重 `rule.message`（focused 测试）。
- [x] G14：`validation.requiredRange` 存在且被消费（测试 + grep）。
- [x] M-02：`form-validation.md` kind 列表与 code union 一致。
- [x] M-09：三入口依赖再校验失败经诊断缝（focused 测试 + 注释如实）。
- [x] M-08：adaptor 错误路径结构化诊断（focused 测试）。
- [x] M-06：cache-hit-on-aborted 返回 cancelled（focused 测试）；共享 fetch 意图不变。
- [x] G4：移除真实句柄实现可被扫描器检出（per-renderer 源，focused 测试）。
- [x] G15：event key 与 capability handle 都不被 sibling 掩盖；注释不算引用（focused 测试）。
- [x] 不存在被静默降级到 deferred 的 in-scope live defect / 硬门禁失败项。
- [x] owner docs（`form-validation.md`，及若契约扫描器行为变更则相关 architecture）已同步。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

- **M-06「合并 caller+registry signal 使单订阅 await reject」**（超出 cache-hit 边的可选增强）
  - Classification: optimization candidate
  - Why Not Blocking Closure: 共享 fetch 不取消是 `api-data-source.md:310` 文档化意图；本计划已消除唯一 residual（cache-hit-on-aborted）。合并 signal 属行为扩展，无证据表明当前调用方需要单订阅 await reject。
  - Successor Required: no

## Non-Blocking Follow-ups

- 若 Phase 5 发现 AST 级契约扫描收益更高，作为 watch-only 记录；当前收紧正则已满足契约。

## Closure

Status Note: 八条 in-scope anchor findings 全部按契约生效落地（G16 已在 draft 期裁定为误报并移出 scope）。`buildValidationMessage` 对所有 kind 一致尊重 `rule.message`；`requiredRange` 拥有专属 i18n key 且 owner-doc「exactly these」列表与之同步；三条依赖再校验入口（validateForm / executeSetValues / applyChangesAndRevalidate）对失败均经诊断缝上报；responseAdaptor 错误路径提供结构化诊断且保留后端消息；dedup/cache 的 cache-hit-on-aborted 边返回 cancelled；契约扫描器锚定到真实句柄接线且 per-definition 隔离 + 注释过滤。每条均有 focused 测试（Proof 先于 Fix）。唯一 deferred（M-06 合并 caller+registry signal）为已裁定 optimization candidate，无 successor。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session general 子 agent（ses_0fa4f062affekogSMQyZ93Pe6S）。
- Verdict: `approved`（零 defect）。
- Evidence: 通读 plan + live repo 逐条核对（file:line 引证见 audit 返回），并重跑 `pnpm typecheck`（55/55）、`pnpm build`（29/29）、`pnpm lint`（29/29）与聚焦包测试（flux-core / flux-runtime / flux-renderers-form 全绿）。执行者据该审批进行 plan 文本收口机械编辑（Plan Status → completed、Closure Gates 勾选）；执行 session 未自审、未自勾 audit gate。

Follow-up:

- no remaining plan-owned work。watch-only：若未来 AST 级契约扫描收益更高可单开（见 Non-Blocking Follow-ups）。
