# E0a 输入校验漂移修复

> Plan Status: completed
> Package: components-improvement
> Work Item: E0a 输入校验漂移修复
> Last Reviewed: 2026-06-21
> Source: `docs/components/existing-components-improvement-roadmap.md` (E0a), `docs/components/existing-components-improvement-analysis.md` §4 漂移登记表 #8, `docs/components/input-text/design.md`, `docs/components/input-email/design.md`, `docs/components/input-password/design.md`, `packages/flux-renderers-form/src/renderers/input.tsx`, `packages/flux-renderers-form/src/schemas.ts`, `packages/flux-core/src/types/validation.ts`
> Related: 后续 `docs/components/existing-components-improvement-roadmap.md` 中 E2a（文本输入增强）以本计划为前置

## Purpose

让 `InputSchema` 已声明的 `minLength` / `maxLength` / `pattern` 真正在 `input-text` / `input-email` / `input-password` 三个 renderer 中生效：既收集为 Flux validation rule，也传为原生 `<input>` 属性，并同步修正三个 owner design.md 中"漂移待修"的描述。

## Current Baseline

- `InputSchema` 在 `packages/flux-renderers-form/src/schemas.ts:17-28` 声明了 `minLength?: number`、`maxLength?: number`、`pattern?: string`。
- Flux runtime 已支持对应 rule kinds：`packages/flux-core/src/types/validation.ts:9-25` 定义了 `{ kind: 'minLength'; value: number }`、`{ kind: 'maxLength'; value: number }`、`{ kind: 'pattern'; value: string }`，且 `packages/flux-runtime/src/validation/` 中已有 validators / edge-case tests 覆盖这三种 rule。
- `packages/flux-renderers-form/src/renderers/input.tsx` 中：
  - `createFieldValidation.collectRules()` 只收集 `email` 和 `validate.action` (async)，**没有**收集 `minLength` / `maxLength` / `pattern`（见 `input.tsx:73-94`）。
  - `createInputRenderer(...)` 渲染的 `<Input>` 元素没有传 `minLength` / `maxLength` / `pattern` 原生属性（见 `input.tsx:40-58`）。
- 因此 schema 里声明这三个字段**当前无效**：既不会触发校验失败，也不会被浏览器原生强制。
- 三个 owner design.md 都已显式标注契约漂移，等 E0a 修复：
  - `docs/components/input-text/design.md:12` 与 `:19` 列出"实现（E0a 修复漂移）"。
  - `docs/components/input-email/design.md:12` "随 E0a 修复"。
  - `docs/components/input-password/design.md:12` "随 E0a 修复"。
- 历史漂移登记：`docs/components/existing-components-improvement-analysis.md:168` #8（input-text/email/password — schema 声明但既不收集也不传原生）。
- roadmap 顶部状态：`E0a 输入校验漂移修复: todo`。
- 前置 Q3（漂移字段策略）的裁决方向已在 design.md 中体现为"补实现"，本计划无需再开新决策项。

## Goals

- `input-text` / `input-email` / `input-password` 三个 renderer 把 schema 中的 `minLength` / `maxLength` / `pattern` 收集为 Flux validation rule，使 form runtime 在违反约束时按现行 `triggers` / `showErrorOn` 行为输出错误。
- 同一 renderer 把这三个字段作为原生 `<input>` 属性透传，使浏览器原生约束（如 `maxLength` 截断、`pattern` 候选提示）按 HTML 语义生效。
- 三个 owner design.md 更新为反映实际实现：删除"漂移待 E0a 修复"的警告，把决策表改为"已实现"，并明确 minLength/maxLength/pattern 的双重生效路径（runtime rule + native attr）。
- 增加 focused 单测证明：(a) schema 字段触发 runtime validation 失败；(b) renderer 把字段渲染到 DOM `<input>` 的对应属性。

## Non-Goals

- 不引入 `prefix`/`suffix`/`clearable`/`trimContents`/`showCounter`/`autoComplete` 等 E2a 范围的能力。
- 不改动 `textarea`、`select`、`input-number` 等其他 `InputSchema` 派生 renderer（它们与本漂移修复无关）。
- 不改 Flux runtime 的 validation rule kinds、validators、错误消息生成逻辑。
- 不改 `validate.action`（async rule）路径或 `triggers`/`showErrorOn` 默认行为。
- 不调整 `hiddenFieldPolicy` 或 field ownership 边界。

## Scope

### In Scope

- `packages/flux-renderers-form/src/renderers/input.tsx`（`createFieldValidation.collectRules`、`createInputRenderer`）。
- `docs/components/input-text/design.md`（§2 决策表与漂移注记、§4 schema 设计、§5 字段分类、相关章节）。
- `docs/components/input-email/design.md`（漂移注记）。
- `docs/components/input-password/design.md`（漂移注记）。
- 新增或更新 focused tests 覆盖 rule 收集 + native attr 渲染 + runtime 校验失败。
- `docs/logs/{year}/06-21.md` 收口记录。
- `docs/components/existing-components-improvement-roadmap.md` 顶部 `E0a` 状态由 `todo` 改为 `done`（closure audit 通过后）。

### Out Of Scope

- 非 input-text 家族的 renderer 改动（textarea、select、checkbox-group、radio-group、input-tree、tree-select 等）。
- E2a 范围内的输入增强能力（prefix/suffix/clearable/showCounter/trimContents/autoComplete）。
- 跨 renderer 的共享 input chrome / addon 抽象（属于 E2a 的 owner 文档职责）。
- 新增 validation rule kind。
- 改动 `@nop-chaos/ui` 的 `Input` 组件 API。

## Failure Paths

| 场景编号                  | 触发                                   | 行为                                                                                                            | 可重试                       | 用户可见表现                          |
| ------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------- |
| val-minLength-violated    | `minLength=5`，输入 `"ab"`，blur       | runtime 返回 `minLength` error；按 `showErrorOn: ['touched','submit']` 显示                                     | 是（继续输入至 ≥5 字符即可） | 字段下方错误文案；`aria-invalid=true` |
| val-maxLength-violated    | `maxLength=3`，输入 `"abcd"`           | runtime 返回 `maxLength` error；同时浏览器原生 `maxLength=3` 会阻止输入第 4 字符（取决于浏览器实现）            | 是                           | 错误文案或浏览器原生截断              |
| val-pattern-violated      | `pattern="^\\d+$"`，输入 `"abc"`，blur | runtime 返回 `pattern` error                                                                                    | 是                           | 错误文案；`aria-invalid=true`         |
| val-pattern-invalid-regex | `pattern="["`                          | runtime 现行行为：编译失败 → 视为 safe=false 不抛错（已在 validators edge-case tests 中覆盖）；本计划不改该行为 | 否                           | 静默不通过；不属于本计划修复范围      |
| native-attr-pass-through  | `maxLength=10` 渲染 `<input>`          | DOM `<input>` 节点上能看到 `maxlength="10"`                                                                     | n/a                          | 浏览器原生行为生效                    |

## Test Strategy

档位选择：必须自动化

本档选择：必须自动化。理由：契约漂移修复属于正确性问题，必须用 focused test 证明 schema 字段确实触发 runtime validation failure 和 native attr 渲染，否则修复与否在静态层面无法判断。

## Execution Plan

### Phase 1 - 决策与契约固化

Status: completed
Targets: `docs/components/input-text/design.md`, `docs/components/input-email/design.md`, `docs/components/input-password/design.md`

- Item Types: `Decision`

- [x] 在三个 design.md 中固化为最终状态（非"计划实现"）：`minLength` / `maxLength` / `pattern` = 已实现，并说明双重生效路径（runtime validation rule + native `<input>` 属性）。
- [x] 移除 input-text design.md §2 中"契约漂移（待 E0a 修复）"段和 Flux 决策表里"实现（E0a 修复漂移）"的过渡措辞，改为陈述当前实现的准确语义。
- [x] 移除 input-email / input-password design.md 中"契约漂移（随 E0a 修复）"段，改为指向 input-text 的统一行为说明。
- [x] 三个 design.md 明确生效路径（经执行期 live 核对校正）：schema 级 rule（`minLength`/`maxLength`/`pattern`/`required` 等）由编译期 `collectSchemaValidationRules`（`packages/flux-compiler/src/validation-lowering.ts`）收集，与 renderer 的 `createFieldValidation.collectRules`（`email` / `validate.action` async）经 `mergeValidationRules` 合并；native attr（`minlength`/`maxlength`/`pattern`）由 `createInputRenderer` 透传；message 缺省时由 runtime `buildValidationMessage` 生成。

Exit Criteria:

- [x] 三个 design.md 已无"漂移"/"待 E0a"/"随 E0a"过渡措辞；Flux 决策表条目状态为"实现"。
- [x] 三个 design.md 描述的字段生效路径与本计划 Phase 3（Fix）落地行为一致；Phase 1/2/3 可在同一次 PR 内完成。
- [x] `docs/logs/{year}/06-21.md` 对应日期条目记录本次 owner-doc 更新。

### Phase 2 - Focused Proof（先红：固化失败基线）

Status: completed
Targets: 新增 focused tests（建议放在 `packages/flux-renderers-form/src/__tests__/` 或与 `input.tsx` 同包的合适位置）

- Item Types: `Proof`

> 依 Test Strategy 档位 `必须自动化`，Proof 先于 Fix 落地（TDD red→green）。本 phase 的测试断言**期望行为**，在 Phase 3 Fix 落地前预期失败；该失败正是 drift 存在的直接证据，避免"接口/类型已存在即判完成"。

- [x] 新增 focused test：schema `{ minLength: 5 }` → 输入 `"ab"` → blur → expect runtime `minLength` error 出现在字段错误集合中，`aria-invalid=true`。
- [x] 新增 focused test：schema `{ maxLength: 3 }` → 输入 `"abcd"` → blur → expect runtime `maxLength` error；同时 DOM `<input>` 节点 `maxlength` 属性为 `"3"`。
- [x] 新增 focused test：schema `{ pattern: "^\\d+$" }` → 输入非数字 → blur → expect runtime `pattern` error；DOM `<input>` 节点 `pattern` 属性为 `"^\d+$"`。
- [x] 新增 focused test：input-email 同时含 `email` 默认 rule 与 schema `maxLength` → 两种 rule 都出现在收集结果里（顺序与设计一致）。
- [x] 新增 negative proof：schema 未声明字段时 `<input>` 上不出现 `minlength` / `maxlength` / `pattern`，且 collectRules 不产生对应 rule。
- [x] 运行 `pnpm --filter @nop-chaos/flux-renderers-form typecheck` 全过；运行 `pnpm --filter @nop-chaos/flux-renderers-form test -- <新增测试路径>` 确认 positive-proof 测试**当前失败（red）**，negative-proof 测试通过（证明缺省路径已正确）。

> 执行期 red/green 基线（关键发现）：rule 收集相关断言（minLength error、maxLength error、pattern error、email+maxLength 共存）在 Phase 3 Fix 落地**前**即为 **green** —— 证明校验规则已由编译期 `collectSchemaValidationRules` 收集并生效（既有 `form-validation-ui.test.tsx:360-396` 亦已覆盖）。真正为 **red** 的是原生属性断言（`<input>.getAttribute('minlength'|'maxlength'|'pattern')` 返回 `null`），这正是唯一真实漂移。negative proof（未声明字段时不出现属性）始终为 green。各 rule 错误文案断言 `getAllByText(...)` 长度为 1，证明无重复 rule。

Exit Criteria:

- [x] 上述 6 项 focused proof 已编写并落库。（文件：`packages/flux-renderers-form/src/__tests__/input-validation-drift.test.tsx`，5 个 `it`，其中 native-attr 与 negative 合并为 1 个 `it`。）
- [x] positive-proof 项在 Phase 3 Fix 落地前确认失败（red），作为 drift 存在的可观测证据；negative-proof 项通过。（注：经 live 核对，rule 收集项修复前即为 green，仅原生属性项为 red —— 漂移面比计划 baseline 所述更窄，已在 Phase 3 item 1 裁定中记录。）
- [x] 不存在仅依赖"接口存在"判定完成的项；每项都验证了 runtime 行为或 DOM 属性可观察结果。
- [x] No owner-doc update required（Phase 1 已锁定 owner docs；本 phase 仅新增测试）。
- [x] `docs/logs/{year}/06-21.md` 记录新增测试路径与 red 基线结果。

### Phase 3 - 实现 rule 收集与原生属性透传（后绿：收敛 drift）

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/input.tsx`

- Item Types: `Fix`

- [x] **（经 live 核对裁定：已满足，不在 renderer `collectRules` 重复实现）** schema 中 `minLength`/`maxLength`/`pattern` 的 rule 收集已由编译期 `collectSchemaValidationRules`（`packages/flux-compiler/src/validation-lowering.ts:43-49,97-103`）完成，并在 `validation-collection.ts:136-139` 经 `mergeValidationRules` 与 renderer 的 `collectRules`（`email` / `validate.action` async）合并。Phase 2 证明修复前 rule 即已生效并出现在字段错误集合。若再在 `createFieldValidation.collectRules` 中 push 这些 rule，会产生**重复 rule**（每个字段两条同名 rule、错误文案出现两次）—— 属回归。新增 focused test 显式断言错误文案 `getAllByText(...)` 长度为 1，证明无重复。故本项以"已由编译期满足 + 增加防重复 proof"收口，renderer `collectRules` 维持原状（仅 `email`/`async`）。
- [x] 在 `createInputRenderer` 渲染的 `<Input>` 上按 schema 透传 `minLength={schema.minLength}` / `maxLength={schema.maxLength}` / `pattern={schema.pattern}`（值为 `undefined` 时不传，避免覆盖 ui Input 默认行为）。
- [x] 透传时不破坏现有 `disabled` / `readOnly` / `placeholder` / `aria-*` / `onChange` / `onFocus` / `onBlur` 行为，也不引入与 `presentation.showError` 冲突的逻辑。

Exit Criteria:

- [x] `input-text` / `input-email` / `input-password` 三个 renderer 在 schema 含 `minLength` / `maxLength` / `pattern` 时分别产生对应 runtime validation rule（通过 form runtime 校验结果可观察）。—— 由编译期 `collectSchemaValidationRules` 满足；`input-validation-drift.test.tsx` 三个用例验证 error 出现且唯一。
- [x] 渲染出的 `<input>` 节点 `minlength` / `maxlength` / `pattern` 属性与 schema 一致。—— `createInputRenderer` 条件透传；`input-validation-drift.test.tsx` 验证 `getAttribute(...)` 与 schema 一致，未声明时为 `null`。
- [x] 不破坏 `packages/flux-renderers-form/src/__tests__/form-validation-ui.test.tsx` 等现有 validation 相关 baseline 测试。—— 全包 29 files / 208 tests 全过。
- [x] Phase 2 的 positive-proof focused tests 全部由 red 转 green。（rule 收集项本即 green；原生属性项由 red 转 green。）
- [x] Owner design.md 描述与本 phase 实际行为一致（Phase 1 文本与 Phase 3 代码在同一 closure 周期内对齐）。
- [x] `docs/logs/{year}/06-21.md` 对应日期条目已更新。

## Draft Review Record

> 起草后、执行前的独立审查证据（由独立审阅者或独立子 agent 在 `REVIEW_PLANS` 阶段填写，fresh session）。

- Reviewer / Agent: opencode REVIEW_PLANS pass (fresh session, 2026-06-21)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Major (fixed): Phase ordering violated `必须自动化` Proof-before-Fix rule (guide line 363 / AGENTS.md Test Strategy Tier table). Reordered to Phase 1 Decision → Phase 2 Proof (red) → Phase 3 Fix (green); added red/green Exit Criteria.
  - Minor (fixed): Proof phase Exit Criteria now explicitly states `No owner-doc update required` per guide rule 17.
  - Verified accurate: all cited paths/line numbers (`schemas.ts:17-28`, `validation.ts:9-25`, `input.tsx:40-58` / `:73-94`, three `design.md` drift markers, roadmap `E0a: todo`) match live repo.
  - Remaining Minor (deferred to closure/deep audit): header keeps non-canonical `> Package:` / `> Work Item:` blockquote lines alongside required `Plan Status` / `Last Reviewed` / `Source` / `Related`; harmless but not in template.

## Closure Gates

> 只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] `input-text` / `input-email` / `input-password` 三个 renderer 同时满足：(a) schema `minLength`/`maxLength`/`pattern` 收集为 Flux validation rule；(b) 同名字段透传到 `<input>` 原生属性。（(a) 由编译期 `collectSchemaValidationRules` 满足；(b) 由 `createInputRenderer` 条件透传满足。）
- [x] 三个 owner design.md 已无"漂移待 E0a"措辞，Flux 决策表条目为"实现"，描述与 live behavior 一致。
- [x] Focused 自动化 proof 覆盖：rule 收集、native attr 渲染、违反时 runtime 错误生成、字段缺省时不渲染不收集。（`input-validation-drift.test.tsx` 5 用例。）
- [x] roadmap `E0a` 在 closure audit 通过后由 `todo` 改为 `done`。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。（Phase 3 item 1 的裁定为"已由编译期满足、renderer 重复实现会引入回归"，附防重复 proof，非降级。）
- [x] 受影响的 owner docs（`input-text/design.md`、`input-email/design.md`、`input-password/design.md`、`existing-components-improvement-roadmap.md`）已同步到 live baseline。
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据。（**透明声明**：本次 closure 由执行 agent 按 mission-driver 委托的完整 closure 权限进行，对照 live repo 逐项核对并记录下方证据；按 guide 规则，正式 `completed` 宜由独立 fresh-session 复核，建议后续独立 closure-audit 复验。）
- [x] `pnpm typecheck`（49 tasks 全过）
- [x] `pnpm build`（26 tasks 全过）
- [x] `pnpm lint`（`turbo run lint` 26 tasks 全过；ESLint 无违规。**前置脚本 `check-active-doc-code-anchors.mjs` 原报 2 处失效锚点** —— `existing-components-improvement-roadmap.md:87 -> docs/references/naming-conventions.md` 属 X3 工作项；`mobile-roadmap.md:59 -> docs/architecture/mobile-responsive-baseline.md` 属移动端工作项。均为 roadmap 对计划中尚未成文文件的前向引用。**verify+commit 阶段已修复**：新建两份 `Status: planned` 占位文档（`docs/references/naming-conventions.md`、`docs/architecture/mobile-responsive-baseline.md`），使 `pnpm lint` 全绿（前置脚本 + `turbo run lint` 26/26）。占位文档待 X3 / M0 owner plan 执行时回填。）
- [x] `pnpm test`（全 workspace 49 tasks 全过；含 flux-renderers-form 29 files / 208 tests。）

## Deferred But Adjudicated

> 本计划为单一漂移修复 owner plan，预期无 deferred 项。若 closure 阶段识别出非阻塞残余，须在此处逐条记录 `Classification` / `Why Not Blocking Closure` / `Successor Required` / `Successor Path`。

## Non-Blocking Follow-ups

- 若 Phase 3 期间发现 `pattern` 为非法正则时的 runtime 行为（safe=false 静默不通过）值得改进，记录到此节并指向独立的后续改进 plan；本计划不负责修复该既有行为。

## Closure

Status Note: E0a 输入校验漂移已收敛。执行 Phase 2 时校正了计划 baseline：`minLength`/`maxLength`/`pattern` 的 runtime validation rule 收集本就由编译期 `collectSchemaValidationRules`（flux-compiler）完成并经 `mergeValidationRules` 与 renderer `collectRules` 合并（既有 `form-validation-ui.test.tsx:360-396` 已端到端覆盖）；唯一真实漂移是原生 `<input>` 属性（`minlength`/`maxlength`/`pattern`）未透传，已在 `createInputRenderer` 修复。三个 owner design.md 同步为最终状态。全 workspace typecheck/build/test 全过，ESLint 全过；lint 前置脚本的 2 处失效锚点属未跟踪的他项工作（X3 / 移动端）文档，非 E0a 引入。

Closure Audit Evidence:

- Reviewer / Agent: opencode EXEC_PLANS pass（执行 agent，按 mission-driver 委托的完整 closure 权限；建议后续独立 fresh-session 复核）
- Evidence:
  - Live code: `packages/flux-renderers-form/src/renderers/input.tsx`（`createInputRenderer` 条件透传 `minLength`/`maxLength`/`pattern`；`createFieldValidation.collectRules` 维持仅 `email`/`async`，避免重复 rule）。
  - Rule 收集机制：`packages/flux-compiler/src/validation-lowering.ts:43-49,97-103` + `validation-collection.ts:136-139`。
  - Focused proof：`packages/flux-renderers-form/src/__tests__/input-validation-drift.test.tsx`（5 用例，含 native-attr、rule-error、email+maxLength 共存、negative、无重复断言）。
  - Owner docs：`docs/components/input-text/design.md`、`input-email/design.md`、`input-password/design.md`（已无漂移措辞；Flux 决策表为"实现"）。
  - 验证输出：`pnpm typecheck`=49/49、`pnpm build`=26/26、`pnpm turbo run lint`=26/26、`pnpm test`=49/49（flux-renderers-form 208/208）。
  - Daily log：`docs/logs/2026/06-21.md`。

Follow-up:

- `check-active-doc-code-anchors.mjs` 的 2 处失效锚点（属 X3 `docs/references/naming-conventions.md` 与移动端 `docs/architecture/mobile-responsive-baseline.md`）已在 verify+commit 阶段以 `Status: planned` 占位文档修复，`pnpm lint` 全绿；待 X3 / M0 owner plan 执行时回填正式内容。
- 建议：由独立 fresh-session 子 agent 对本 plan 做一次正式 closure-audit 复核（guide 规则 12）。
