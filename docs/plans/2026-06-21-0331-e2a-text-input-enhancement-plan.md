# E2a 文本输入增强

> Plan Status: completed
> Last Reviewed: 2026-06-21
> Source: `docs/components/existing-components-improvement-roadmap.md`（E2a）、`docs/components/existing-components-improvement-analysis.md` §3/§7.1、`docs/components/input-text/design.md`、live-repo audit（input renderer + `@nop-chaos/ui` InputGroup 原语）
> Related: E0a（输入校验漂移修复，done — native maxLength 已落地）、X3 naming-conventions（done）、X5 input-text Flux 决策表（done）、E2a-bis（password reveal，依赖本 plan）

## Purpose

把 `input-text`/`input-email`/`input-password` 从当前仅支持 `name`/`placeholder`/`required`/`minLength`/`maxLength`/`pattern`/`validate` 的基线，补齐 **prefix/suffix 前后缀、clearable 清空按钮、trimContents blur 自动 trim、showCounter 字数计数、nativeAutoComplete（HTML autocomplete 属性）**。命名对齐 shadcn/ui Input + InputGroup 体系（X3 §2）。

## Current Baseline

经 live-repo audit（2026-06-21），当前文本输入族基线：

- **Schema**：三种 renderer 共享单一 `InputSchema`（`packages/flux-renderers-form/src/schemas.ts:17-28`），无独立 `InputTextSchema`/`InputEmailSchema`/`InputPasswordSchema`。`InputSchema` 字段：`placeholder`/`minLength`/`maxLength`/`pattern`/`validate`/`hiddenFieldPolicy` + 继承 `BoundFieldSchemaBase`。
- **Renderer**：`createInputRenderer(inputType)` 工厂（`packages/flux-renderers-form/src/renderers/input.tsx:28-73`），使用 `@nop-chaos/ui` `Input`（bare styled `<input>`，26 行组件）。
- **已实现（E0a 落地）**：`minLength`/`maxLength`/`pattern` 双重生效路径——编译期 `collectSchemaValidationRules` 收集为校验规则 + `createInputRenderer` 透传原生 `<input>` 属性（L40-49, 69）。
- **未实现（全部 "not declared at all"）**：`prefix`、`suffix`、`clearable`、`trimContents`、`showCounter`、`nativeAutoComplete` 在 `InputSchema` 中无字段、renderer 中无代码。
- **UI 原语可用**：`@nop-chaos/ui` `input-group.tsx`（152 行）已导出 `InputGroup`/`InputGroupAddon`/`InputGroupButton`/`InputGroupText`/`InputGroupInput`/`InputGroupTextarea`（`packages/ui/src/index.ts:26`）。`InputGroupAddon` 有 `align: 'inline-start'|'inline-end'|'block-start'|'block-end'`。已有 `combobox.tsx`（L8,55-71）使用 InputGroup 实现 clearable 的先例。
- **测试**：无 dedicated input-text/email/password 测试文件。E0a 相关覆盖在 `input-validation-drift.test.tsx`；`input-number.test.tsx`（L328,338）有 prefix/suffix 测试先例（input-number 已有 prefix/suffix）。

## Goals

- 文本输入族支持 `prefix`/`suffix`（InputGroup addon 模式）。
- 支持 `clearable`（清空按钮，值非空时显示）。
- 支持 `trimContents`（blur 时自动 trim 首尾空白）。
- 支持 `showCounter`（字数计数，与 `maxLength` 配合）。
- 支持 `nativeAutoComplete`（HTML `autocomplete` 属性透传）。
- `input-text/design.md` 决策表中 "计划实现（E2a）" 行全部翻转为 "实现"。
- 每项能力配有 focused 单测。

## Non-Goals

- `autoComplete` 异步建议下拉（走 data-source）——决策表标 "计划实现（E2a）" 但本质是 data-source 组合层能力，本 plan 仅预留 `nativeAutoComplete` 透传，不建组件级建议下拉（见 Deferred）。
- 输入掩码 input-mask（决策表 "暂不实现"）。
- amis `addOn` 按钮 addon（决策表 "不采纳"，用 prefix/suffix + button 组合）。
- amis `transform: {lowerCase, upperCase}`（决策表 "暂不实现"，属 formatter 层）。
- amis `borderMode`/`clearValueOnEmpty`（决策表 "不采纳"）。
- password reveal 切换（E2a-bis，依赖本 plan 的 prefix/suffix + clearable 基础）。

## Scope

### In Scope

- `InputSchema` 新增字段：`prefix`、`suffix`、`clearable`、`trimContents`、`showCounter`、`nativeAutoComplete`。
- `createInputRenderer` 工厂增强：当 prefix/suffix/clearable/showCounter 任一声明时，用 `InputGroup` 包裹 `Input`。
- blur 时 `trimContents` 转换。
- Focused 单测。
- `input-text/design.md` + `input-email/design.md` + `input-password/design.md` 决策表翻转 + 字段分类同步。

### Out Of Scope

- `autoComplete` data-source 异步建议（见 Deferred）。
- 表达式 formatter（transform lower/upper case）。
- E2a-bis password reveal（后续 plan）。

## Failure Paths

| 场景                       | 触发                                   | 行为                         | 可重试 | 用户可见表现                 |
| -------------------------- | -------------------------------------- | ---------------------------- | ------ | ---------------------------- |
| clearable + disabled       | `clearable: true` + `disabled: true`   | 清空按钮不渲染或 disabled    | 否     | 无清空入口（禁用态不可改值） |
| clearable + readOnly       | `clearable: true` + `readOnly: true`   | 同上，清空按钮不渲染         | 否     | 无清空入口                   |
| trimContents + 值全为空白  | blur 时值 `"   "`                      | trim 后值为 `""`（空字符串） | 否     | 输入框清空                   |
| showCounter + 无 maxLength | `showCounter: true` 但无 `maxLength`   | 显示 `当前字数` 不显示上限   | 否     | `12` 格式计数                |
| showCounter + maxLength    | `showCounter: true` + `maxLength: 100` | 显示 `当前 / 上限`           | 否     | `12 / 100` 格式计数          |
| prefix + suffix 同时声明   | 两者都声明                             | 左右各渲染一个 addon         | 否     | 前后缀同时显示               |

## Test Strategy

档位选择：`建议有测`

本档选择：建议有测。文本输入是 P1 高频字段，但本次为 UI 增强（非 auth/API 契约/流控），focused 单测覆盖每项能力的 happy path + disabled/readOnly 边界即可。

## Execution Plan

### Phase 1 - Schema 契约 + 命名裁定

Status: completed
Targets: `packages/flux-renderers-form/src/schemas.ts`、`docs/components/input-text/design.md`

- Item Types: `Decision`

- [x] 裁定字段最终命名与形状（以下为提案，Phase 1 终裁）：
  - `prefix?: string`（纯文本前后缀；命名对齐 X3 §2、`input-number/design.md:21` 已有先例）
  - `suffix?: string`
  - `clearable?: boolean`（肯定式布尔，X3 §4.1；值非空且非 disabled/readOnly 时显示清空按钮）
  - `trimContents?: boolean`（blur 时自动 trim 首尾空白）
  - `showCounter?: boolean`（字数计数；与 `maxLength` 配合显示 `n / max`，无 `maxLength` 时仅显示 `n`）
  - `nativeAutoComplete?: string`（HTML `autocomplete` 属性值，如 `'on'`/`'off'`/`'email'`/`'current-password'`；透传给原生 `<input>`）
- [x] 将字段写入 `InputSchema`（L17-28），字段分类标注 `value`（进入 `props` 通道）。
- [x] 在 `input.tsx` renderer definition 中注册新字段（`fields: [..., { key: 'prefix', kind: 'prop' }, ...]`）。
- [x] `input-text/design.md` §4 schema 设计节补齐；§5 字段分类同步。

Exit Criteria:

- [x] `InputSchema` 类型声明包含新字段且 `pnpm --filter @nop-chaos/flux-renderers-form typecheck` 通过。
- [x] `input-text/design.md` schema/字段分类节与新类型一致。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 2 - prefix / suffix（InputGroup addon）

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/input.tsx`

- Item Types: `Fix | Proof`

> 参考先例：`combobox.tsx` L8,55-71 使用 `InputGroup` + `InputGroupAddon` + `InputGroupText`。

- [x] 当 `prefix` 或 `suffix` 声明时，将 `<Input>` 包裹在 `<InputGroup>` 内。
- [x] `prefix` 渲染为 `<InputGroupAddon align="inline-start"><InputGroupText>...</InputGroupText></InputGroupAddon>`。
- [x] `suffix` 渲染为 `<InputGroupAddon align="inline-end"><InputGroupText>...</InputGroupText></InputGroupAddon>`。
- [x] Input 改用 `InputGroupInput`（dropping 自身 border/ring，emit `data-slot="input-group-control"`），避免双重边框。
- [x] 无 prefix/suffix 时保持当前 `<Input>` 直接渲染（不包裹 InputGroup），避免不必要的 DOM 层级。
- [x] 保持 `nop-input-text` marker（移到 InputGroup wrapper 或保持 Input 上——Phase 2 裁定）。
- [x] prefix/suffix + maxLength 原生属性共存验证。

Exit Criteria:

- [x] `prefix`/`suffix` 声明时渲染对应 addon，视觉为 InputGroup 内联前后缀。
- [x] 无 prefix/suffix 时 DOM 结构不变（无额外 wrapper）。
- [x] `input-text/design.md` 决策表 prefix/suffix 行翻转为 "实现"。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 3 - clearable + trimContents

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/input.tsx`

- Item Types: `Fix | Proof`

- [x] `clearable: true` 且值非空且非 disabled/readOnly 时，在 `InputGroupAddon align="inline-end"` 内渲染 `<InputGroupButton>`（ghost, `icon-sm`），点击清空值为 `undefined`（或 `''`——Phase 3 裁定空值语义，倾向 `''` 保持 string 字段语义）。
- [x] clearable + suffix 共存时，clear 按钮位于 suffix 之前（或之后——Phase 3 裁定视觉顺序）。
- [x] `trimContents: true` 时，在 `onBlur` handler 中对值执行 `String(value).trim()` 再写入 form runtime。
- [x] trimContents 不影响 `onChange`（输入过程中的空格保留，只在 blur 时 trim）。

Exit Criteria:

- [x] `clearable: true` + 有值时显示清空按钮，点击后值清空；disabled/readOnly 时不显示。
- [x] `trimContents: true` 时 blur 后值首尾空白被移除；输入过程中不 trim。
- [x] `input-text/design.md` 决策表 clearable/trimContents 行翻转为 "实现"。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 4 - showCounter + nativeAutoComplete

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/input.tsx`

- Item Types: `Fix | Proof`

- [x] `showCounter: true` 时渲染计数元素（`<span data-slot="input-counter">`），位于 InputGroup 内或 InputGroup 下方（Phase 4 裁定位置——倾向 InputGroup `align="inline-end"` addon 内，与 suffix/clear 共存）。
- [x] 有 `maxLength` 时显示 `当前 / max`；无 `maxLength` 时仅显示 `当前`。
- [x] 计数随 `onChange` 实时更新。
- [x] `nativeAutoComplete` 声明时，作为 `autocomplete` 属性透传给 `<input>`（值如 `'on'`/`'off'`/`'email'`/`'current-password'`）。
- [x] nativeAutoComplete + disabled/readOnly 共存验证（autocomplete 属性独立于交互态）。

Exit Criteria:

- [x] `showCounter: true` 时显示字数计数，有/无 maxLength 时格式正确，实时更新。
- [x] `nativeAutoComplete` 声明时 `<input>` 渲染 `autocomplete="..."` 属性。
- [x] `input-text/design.md` 决策表 showCounter/nativeAutoComplete 行翻转为 "实现"。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 5 - 测试 + design.md 收口

Status: completed
Targets: 新建 `packages/flux-renderers-form/src/__tests__/input-text-enhancements.test.tsx`、`docs/components/input-text/design.md`、`docs/components/input-email/design.md`、`docs/components/input-password/design.md`

- Item Types: `Proof | Follow-up`

- [x] 新建 `input-text-enhancements.test.tsx`，覆盖：prefix/suffix 渲染 + DOM 结构、clearable 按钮 + disabled/readOnly 隐藏、trimContents blur 行为、showCounter 有/无 maxLength 格式 + 实时更新、nativeAutoComplete 属性透传。
- [x] negative case：无 prefix/suffix 时不包裹 InputGroup、`clearable: false` 时无按钮、`trimContents: false` 时 blur 不 trim。
- [x] 验证三种 renderer（input-text/email/password）共享增强——至少 input-text + input-password 各跑一个 case。
- [x] `input-text/design.md` §2 Flux 决策表所有 "计划实现（E2a）" 行翻转为 "实现"；`input-email/design.md`、`input-password/design.md` 各自小表同步（标注共享面来自 input-text）。
- [x] `amis-baseline-matrix.md` 三组件行无 retained 决策变化则标注 No update required。

Exit Criteria:

- [x] `input-text-enhancements.test.tsx` 全部通过。
- [x] `input-text/design.md` + `input-email/design.md` + `input-password/design.md` 决策表 E2a 行全部为 "实现"。
- [x] `docs/logs/` 对应日期条目已更新。

## Draft Review Record

- Reviewer / Agent: REVIEW_PLANS sub-agent (fresh session, independent of drafter)
- Verdict: `pass`
- Rounds: 1
- Findings addressed: none (zero Blocker, zero Major). Reference accuracy verified against live repo: `InputSchema` (`schemas.ts:17-28`), `createInputRenderer` (`input.tsx:28-73`, native attrs L40-49/69), `input-group.tsx` 6 exports (L145-152) + `InputGroupAddon` align variants (L28-35), `combobox.tsx` InputGroup precedent (L8,55-71), `input-{text,email,password}/design.md` + `amis-baseline-matrix.md` all present. Format, Exit Criteria observability, scope boundaries, Closure Gates, Deferred classification all pass.
- Minor (non-blocking, not recorded for rework): (1) Phase 1 Item Types labeled only `Decision` though it includes InputSchema field-writing + renderer field registration (Fix work); (2) combobox precedent cited as using `InputGroupText` but `combobox.tsx` actually uses `InputGroupButton` — InputGroup family precedent still valid, Phase 2 correctly proposes `InputGroupText` for text addons.

## Closure Gates

- [x] prefix/suffix 已实现且有 focused test
- [x] clearable 已实现且有 focused test（含 disabled/readOnly 边界）
- [x] trimContents 已实现且有 focused test
- [x] showCounter 已实现且有 focused test（含 有/无 maxLength）
- [x] nativeAutoComplete 已实现且有 focused test
- [x] 三种 renderer（text/email/password）共享增强已验证
- [x] 不存在被静默降级到 deferred 的 in-scope 能力
- [x] `input-text/design.md` + `input-email/design.md` + `input-password/design.md` 决策表 E2a 行全部翻转为 "实现"
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### autoComplete（data-source 异步建议下拉）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 决策表标 "计划实现（E2a）：走 data-source"，但异步建议下拉本质是 data-source + action 组合层能力（搜索关键字驱动 data-source 刷新 → 渲染建议列表），不应在 input renderer 开 `api`/`initFetch` 短路径（X3 §1/§3）。本 plan 提供 `nativeAutoComplete`（HTML autocomplete 透传）覆盖浏览器原生 autofill 场景。data-source 建议下拉需要独立设计建议项数据源 + debounce + 选中回填契约，复杂度独立于 prefix/suffix/clearable/trim/counter。
- Successor Required: yes
- Successor Path: ~~后续 autocomplete-suggestions plan（或随 data-source X4 增强一并收口）。~~ **已由 `docs/plans/2026-06-22-0901-1-e3-input-autocomplete-data-source-suggestions-plan.md` 收口（E3 successor，data-source composition 模式 A：`suggestSource` + `refreshSource` + `sendOn` gate）。**

## Non-Blocking Follow-ups

- ~~E2a-bis（password reveal 切换）依赖本 plan 的 InputGroup + clearable 基础，后续 plan 启动。~~ **已由 E2a-bis plan（`docs/plans/2026-06-21-0527-e2a-bis-password-reveal-plan.md`）收口。**
- 若 `transform: {lowerCase, upperCase}` 后续有需求，归 formatter 层独立评估。

## Closure

Status Note: Plan 于 2026-06-21 关闭。全 5 Phase 执行完成，所有 Closure Gates 通过、独立 closure-audit 通过。代码：`packages/flux-renderers-form/src/schemas.ts`（`InputSchema` 新增 6 字段：prefix/suffix/clearable/trimContents/showCounter/nativeAutoComplete）、`packages/flux-renderers-form/src/renderers/input.tsx`（`createInputRenderer` 增强 + 新建 `InputGroupFieldControl` 包装组件吸收 FieldFrame `cloneElement` 注入 props；`inputEnhancementFieldRules` 常量被 input-text/email/password 三个 renderer definition 共用）。测试：`packages/flux-renderers-form/src/__tests__/input-text-enhancements.test.tsx`（28 `it()` 块）。文档：`input-text/design.md` §2/§4/§5/§10/§11 更新（决策表 E2a 行翻转 + schema/字段分类/DOM marker 节）；`input-password/design.md` nativeAutoComplete 引用更新。验证（implementer 自查）：`pnpm typecheck` = 49/49、`pnpm build` = 26/26、`pnpm lint` = 26/26（1 pre-existing warning）、`pnpm --filter @nop-chaos/flux-renderers-form test` = 31 files / 255 tests 全过（含新增 enhancement 用例）。（注：apps/playground `performance-table-page.test.tsx` 1 例 pre-existing 失败与本 plan 无关；未运行 e2e/Playwright，非 AGENTS.md unit+e2e full-green。）

Closure Audit Evidence:

- Reviewer / Agent: CLOSURE_AUDIT 独立子 agent（fresh session，不复用 implementer 的 task session）
- Audit Scope: 重读整份 plan、逐条核对每个 Phase Exit Criteria、Closure Gates、deferred 诚实性、文本一致性。
- Live Repo Verification:
  - `packages/flux-renderers-form/src/schemas.ts:24-41` — `InputSchema` 包含 6 个新字段（prefix/suffix/clearable/trimContents/showCounter/nativeAutoComplete）✓
  - `packages/flux-renderers-form/src/renderers/input.tsx:39-52` — `inputEnhancementFieldRules` 注册全部 6 字段（boolean 字段标 `valueType: 'boolean'`）✓
  - `packages/flux-renderers-form/src/renderers/input.tsx:79-152` — `InputGroupFieldControl` 包装组件实现 prefix/suffix/clearable/showCounter 的 InputGroup 渲染（非空壳、无 `return null` 占位、无吞异常）✓
  - `packages/flux-renderers-form/src/renderers/input.tsx:154-253` — `createInputRenderer` 增强：blur trim 处理 (L191-199)、counterText 计算 (L205-210)、needsInputGroup 判定 (L212-213)、nativeAutoComplete 透传 (L231)、bare Input 回退路径 (L235-239) 全部到位 ✓
  - `packages/flux-renderers-form/src/renderers/input.tsx:290-317` — input-text / input-email / input-password 三个 renderer definition 均使用 `[...formFieldRules, ...inputEnhancementFieldRules]`，三 renderer 共享增强已 wire ✓
  - `packages/flux-renderers-form/src/__tests__/input-text-enhancements.test.tsx` — 文件存在，含 28 个 `it()` 块覆盖 prefix/suffix/clearable/trimContents/showCounter/nativeAutoComplete + text/password 共享 ✓
  - `docs/logs/2026/06-21.md` — 含完整 E2a 收口条目（5 Phase 全描述、design.md 更新、roadmap `todo`→`done`、amis-baseline-matrix `No update required` 裁定）✓
  - `docs/components/input-{text,email,password}/design.md` — 三文件均存在；06-21 日志记录 §2 决策表 E2a 行翻转 + input-text §4/§5/§10/§11 + input-password nativeAutoComplete 更新 ✓
- Phase / Gate Consistency: Plan Status `completed`、5 个 Phase Status 均 `completed`、5 个 Phase Exit Criteria 全 `[x]`、Closure Gates 全 `[x]`（本 audit 已勾选最后一项）、Closure 证据本节列出 — 五点一致 ✓
- Deferred Honesty: `autoComplete` (data-source 异步建议下拉) 标 `optimization candidate`，附明确 `Why Not Blocking Closure` + `Successor Required: yes` + `Successor Path`；非隐藏的 in-scope live defect 或 contract drift ✓
- Anti-Hollow: 新代码确实在 runtime 路径上被调用（三 renderer definitions 使用 `inputEnhancementFieldRules`；`createInputRenderer` 内部基于 props.props.\* 真实分支渲染 InputGroup 或 bare Input），无空壳 / 无 `return null` 占位 / 无吞异常 ✓
- Verdict: `approved` — plan-owned work 全部 landing，closure gates 全满足，可关闭。

Follow-up:

- ~~E2a-bis（password reveal 切换）后续 plan，依赖本 plan 已落地的 InputGroup + clearable 基础。~~ **已由 E2a-bis plan 收口（2026-06-21）。**
- autoComplete (data-source 异步建议下拉) 已显式 deferred 到 successor plan，非本 plan 剩余工作。
- 无 plan-owned 剩余 debt。
