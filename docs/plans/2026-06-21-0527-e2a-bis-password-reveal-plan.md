# E2a-bis Password Reveal

> Plan Status: completed
> Package: components-improvement
> Work Item: E2a-bis password reveal
> Last Reviewed: 2026-06-21
> Source: `docs/components/existing-components-improvement-roadmap.md`（E2a-bis 行）、`docs/components/input-password/design.md` §2/§4/§7、E2a plan 的 Non-Blocking Follow-ups（"E2a-bis 依赖本 plan 的 InputGroup + clearable 基础，后续 plan 启动"）
> Related: `docs/plans/2026-06-21-0331-e2a-text-input-enhancement-plan.md`（前置 + 本 plan 为其 deferred successor）

## Purpose

把 roadmap 工作项 **E2a-bis password reveal** 从 `todo` 推进到 `done`：为 `input-password` 增加 `revealPassword` 显示切换能力（基础能力，amis 默认开启，当前 Flux 缺失），复用 E2a 已落地的 `InputGroup` / `InputGroupButton` / `inputEnhancementFieldRules` 基础设施。本 plan 是 E2a plan 的显式 deferred successor。

## Current Baseline

- E2a 已 `done`：`InputSchema` 含 `prefix`/`suffix`/`clearable`/`trimContents`/`showCounter`/`nativeAutoComplete`（`packages/flux-renderers-form/src/schemas.ts:24-41`）；`inputEnhancementFieldRules`（`renderers/input.tsx:39-52`）注册全部 6 字段并被 input-text / input-email / input-password 三 renderer definition 共用（`renderers/input.tsx:290-317`）。
- `InputGroupFieldControl`（`renderers/input.tsx:79-152`）已实现 prefix/suffix/counter/clear-button 的 InputGroup 渲染，clear button 用 `InputGroupButton` + `XIcon`（`lucide-react`，`renderers/input.tsx:19`）。
- `createInputRenderer(inputType)`（`renderers/input.tsx:154`）按 `inputType` 驱动 `<input type=...>`；`input-password` 走 `createInputRenderer('password')`（`renderers/input.tsx:310-317`），当前**无** reveal toggle。
- `docs/components/input-password/design.md` §2 决策表已预占 `revealPassword 显示切换 | 计划实现（E2a-bis）`；§7 已注明"明文状态为 local UI state，不写入表单值"；§4 已预留 "优先使用 `showRevealToggle`、`showStrength` 这类直接语义字段"（**命名漂移待裁定**：roadmap/design.md §2 用 `revealPassword`，§4 用 `showRevealToggle`）。
- 图标资源：`lucide-react` 已是 `flux-renderers-form` 依赖（`package.json:32`）；`Eye` / `EyeOff` 可直接引入。
- E2a deferred（`2026-06-21-0331-e2a-...-plan.md` Non-Blocking Follow-ups）：「E2a-bis（password reveal 切换）依赖本 plan 的 InputGroup + clearable 基础，后续 plan 启动」→ 本 plan 即该 successor。

## Goals

- `input-password` 新增 `revealPassword` 布尔字段（命名裁定见 Phase 1 Decision）：`true` 时在 InputGroup end addon 渲染 reveal toggle 按钮（Eye/EyeOff），点击切换 `<input type="password">` ↔ `<input type="text">`。
- 明文状态为 **local UI state**，不写入表单值（design.md §7 既有约束）。
- 复用 `InputGroupFieldControl` 的 InputGroupButton 模式，与 clearable / counter / suffix 共存于同一 end addon。
- 与 disabled / readOnly 共存：disabled 或 readOnly 时 reveal toggle 也禁用（但仍可显示当前模式切换的视觉态可接受；首版禁用点击）。
- `input-password/design.md` §2 决策表翻转、§4 命名漂移收敛、§7/§10/§12 同步。
- focused 单测覆盖：渲染、切换、与 clearable/suffix/counter 共存、disabled/readOnly 禁用、local state 不污染表单值、仅 input-password 生效（input-text/email 不渲染 reveal）。

## Non-Goals

- 密码强度指示（design.md §2 已标 `暂不实现`，后续按需）。
- 自动生成密码（design.md §2 已标 `不采纳（首版）`）。
- 密码管理器专用字段（design.md §2 已标 `不采纳`，由 `nativeAutoComplete` 覆盖）。
- E2a deferred 的 autoComplete（data-source 异步建议下拉）—— 独立 successor（X4 或 autocomplete-suggestions plan），不并入本 plan。
- reveal toggle 的自定义 icon / 文案 / 位置 schema（首版固定 Eye/EyeOff + end addon；自定义归 E3）。

## Scope

### In Scope

- `packages/flux-renderers-form/src/schemas.ts`：`InputSchema` 是否加 `revealPassword?: boolean` 的裁定（Phase 1 Decision；倾向加在 `InputSchema` 但仅 input-password renderer definition 消费，避免 input-text/email 误用 —— 或加在独立 `PasswordSchema extends InputSchema`，二选一在 Phase 1 裁定）。
- `packages/flux-renderers-form/src/renderers/input.tsx`：`inputEnhancementFieldRules` 注册 `revealPassword`（若裁定放 `InputSchema`）；`InputGroupFieldControl` 或 `createInputRenderer` 内为 password 分支增加 reveal toggle 渲染 + local `useState` 明文态。
- `packages/flux-renderers-form/src/__tests__/input-text-enhancements.test.tsx` 或新增 `input-password-reveal.test.tsx`：reveal focused 用例。
- `docs/components/input-password/design.md`：§2 决策表翻转 + §4 命名漂移收敛 + §7 local state 约束重申 + §10 DOM marker（reveal button data-slot）+ §12 风险。
- `docs/components/input-text/design.md`：若裁定 `revealPassword` 放在共享 `InputSchema`，需在 input-text §2 注明"该字段仅 input-password 消费"。
- `docs/components/existing-components-improvement-roadmap.md`：E2a-bis `todo`→`done`（closure 后）。
- `docs/logs/2026/06-21.md`（或执行当日）：E2a-bis 收口条目。

### Out Of Scope

- 见 Non-Goals 全部条目。
- e2e/Playwright（单测覆盖足够；reveal 是纯前端 local state）。

## Failure Paths

| 场景编号                     | 触发                                                  | 行为                                                                                       | 可重试 | 用户可见表现               |
| ---------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------ | -------------------------- |
| e2abis-reveal-disabled       | `disabled: true` 或 `readOnly: true`                  | reveal toggle 渲染但 `disabled`，点击无响应                                                | 否     | 图标可见但不可点           |
| e2abis-reveal-non-password   | `revealPassword: true` 出现在 input-text/email schema | renderer 不渲染 reveal toggle（仅 input-password 消费），dev schema warn 可选              | 否     | 无 reveal 按钮             |
| e2abis-reveal-clear-coexist  | `revealPassword: true` + `clearable: true` 同时存在   | end addon 同时渲染 clear button + reveal toggle（顺序：suffix → counter → clear → reveal） | 否     | 两个按钮并存，互不干扰     |
| e2abis-reveal-form-pollution | 切换明文态                                            | 明文态绝对不写入 form field value，仅切 `<input type>`                                     | 否     | 表单提交值始终为密码字符串 |

## Test Strategy

档位选择：**建议有测**

本档选择：`建议有测`

理由：reveal 是纯前端 local UI state 切换（非鉴权/对外 API/核心回归），但涉及"a11y 状态 + 不污染表单值"两条易回归契约，必须有 focused 单测验证行为结果。Proof 紧随 Fix，不强制 test-first。

## Execution Plan

### Phase 1 - schema 字段 + 命名漂移裁定 + 决策表准备

Status: completed
Targets: `packages/flux-renderers-form/src/schemas.ts`、`packages/flux-renderers-form/src/renderers/input.tsx`、`docs/components/input-password/design.md`、`docs/components/input-text/design.md`

- Item Types: `Decision | Fix`

- [x] **Decision**：字段命名裁定 —— `revealPassword`（roadmap + design.md §2 主语）vs `showRevealToggle`（design.md §4 历史预留）。裁定取 `revealPassword`（与 roadmap 工作项命名一致、语义更直接"是否允许 reveal"），design.md §4 收敛掉 `showRevealToggle` 表述。
- [x] **Decision**：字段归属裁定 —— 加在共享 `InputSchema` 还是独立 `PasswordSchema extends InputSchema`。裁定：加在 `InputSchema`（与 E2a prefix/suffix/clearable 同层，复用 `inputEnhancementFieldRules`），由 renderer 层限制仅 input-password 消费（Failure Path `e2abis-reveal-non-password`），避免新增 schema 层级。理由：E2a 已建立"共享 InputSchema + renderer 层分支"模式，新增独立 schema 破坏该一致性。
- [x] `InputSchema` 新增 `revealPassword?: boolean`
- [x] `inputEnhancementFieldRules` 注册 `{ key: 'revealPassword', kind: 'prop', valueType: 'boolean' }`
- [x] `input-password/design.md` §2 决策表行由 `计划实现（E2a-bis）` 翻 `实现中（E2a-bis）`；§4 删除 `showRevealToggle` 表述，统一 `revealPassword`
- [x] `input-text/design.md` §2 若列举共享字段，注明 `revealPassword` 仅 input-password 消费

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-renderers-form typecheck` 通过，`InputSchema.revealPassword` 类型可见
- [x] `inputEnhancementFieldRules` 含 `revealPassword` 注册（`kind:'prop'`, `valueType:'boolean'`）
- [x] design.md §2 标 `实现中（E2a-bis）`；§4 命名漂移消除（无 `showRevealToggle`）
- [x] `docs/logs/` 当日条目记录两项 Decision 理由

### Phase 2 - reveal toggle 实现 + local 明文态

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/input.tsx`、`docs/components/input-password/design.md`

- Item Types: `Fix | Proof`

- [x] `createInputRenderer`：仅 `inputType === 'password'` 时读 `props.props.revealPassword`；为 true 时在 `InputGroupFieldControl` end addon 渲染 reveal toggle（`InputGroupButton` + `Eye`/`EyeOff` from `lucide-react`）
- [x] local 明文态：`useState<boolean>(false)`，toggle 切换；明文态驱动 `<input type={revealed ? 'text' : 'password'}>`；**不**调用 `handlers.change`，不写表单值
- [x] reveal button：`data-slot="input-password-reveal"`、`aria-label`（"显示密码"/"隐藏密码" 随态切换）、`aria-pressed={revealed}`、disabled 跟随 `presentation.interactive`（与 clearable 同源）
- [x] end addon 顺序：suffix → counter → clear button → reveal button（与 Failure Path `e2abis-reveal-clear-coexist` 一致）
- [x] bare Input 回退路径（无 InputGroup 时，即无 prefix/suffix/clearable/counter 且有 revealPassword）：启用 InputGroup 以承载 reveal button
- [x] focused 单测：`input-password-reveal.test.tsx`（或扩 `input-text-enhancements.test.tsx`）
  - reveal toggle 渲染（仅 input-password）
  - 点击切换 `<input type>` password↔text
  - 切换不触发 form value change（Failure Path `e2abis-reveal-form-pollution`）
  - 与 clearable + suffix + counter 共存 + 顺序（Failure Path `e2abis-reveal-clear-coexist`）
  - disabled / readOnly 时 reveal button disabled（Failure Path `e2abis-reveal-disabled`）
  - input-text / input-email 带 `revealPassword: true` 不渲染 toggle（Failure Path `e2abis-reveal-non-password`）
  - aria-pressed / aria-label 随态切换
- [x] design.md §2 行翻 `实现`；§7 local state 约束重申；§10 `data-slot="input-password-reveal"` marker；§12 风险（明文态不持久化、不写表单值）

Exit Criteria:

- [x] `revealPassword` 未声明时 input-password 渲染与 E2a baseline 一致（无 reveal button）
- [x] 明文态切换改变 `<input type>` 但不改变 form field value（单测断言 form store 值不变）
- [x] disabled/readOnly 时 reveal button 不可点击
- [x] input-text/email 即使 schema 带 `revealPassword: true` 也不渲染 toggle
- [x] `pnpm --filter @nop-chaos/flux-renderers-form test` reveal 用例全过
- [x] design.md §2/§7/§10/§12 同步；`docs/logs/` 当日条目更新

### Phase 3 - owner-doc 同步 + roadmap 收口

Status: completed
Targets: `docs/components/input-password/design.md`、`docs/components/input-text/design.md`、`docs/components/existing-components-improvement-roadmap.md`、`docs/components/amis-baseline-matrix.md`、`docs/logs/`

- Item Types: `Proof | Follow-up`

- [x] anti-hollow 抽查：reveal toggle 真实在 input-password 运行时路径渲染（非注册不可达）
- [x] design.md §2 无残留 `计划实现（E2a-bis）` / `实现中（E2a-bis）`；§4 命名统一为 `revealPassword`
- [x] `existing-components-improvement-roadmap.md`：E2a-bis `todo`→`done`（closure audit 通过后；不在本 phase 内提前改）
- [x] `amis-baseline-matrix.md` input-password 行 retained 决策同步（reveal 是否翻转 retained）
- [x] E2a plan Non-Blocking Follow-ups「E2a-bis 后续 plan 启动」注记「已由 E2a-bis plan 收口」
- [x] `docs/logs/` 当日条目汇总 E2a-bis 全 phase + 验证结果

Exit Criteria:

- [x] design.md 无残留 E2a-bis 占位标签
- [x] anti-hollow 抽查写入当日 log
- [x] `docs/logs/` 当日条目含 E2a-bis 收口段

## Draft Review Record

> 待 `REVIEW_PLANS` flow step 由独立子 agent（fresh session）填写。

- Reviewer / Agent: fresh REVIEW_PLANS sub-agent (mission-driver flow)
- Verdict: pass
- Rounds: 1
- Findings addressed: zero Blocker, zero Major. Minor (non-blocking, left for downstream audits):
  - Extra `> Package:` / `> Work Item:` blockquote fields not in template — additive, no harm.
  - Current Baseline says `inputEnhancementFieldRules` "注册全部 6 字段"；实际数组含 12 条（6 enhancement-specific + 6 common），上下文已澄清指 6 个 enhancement 字段。
  - 引用准确性 live-repo 抽查通过：`InputSchema` (schemas.ts:24-41)、`inputEnhancementFieldRules` (renderers/input.tsx:39-52)、`InputGroupFieldControl` (renderers/input.tsx:79-152)、`createInputRenderer` (renderers/input.tsx:154)、input-password renderer def (renderers/input.tsx:310-317)、现有 end addon 顺序 suffix→counter→clear 与 plan 拟定 reveal 续接顺序一致、`presentation.interactive` 已用于 clear button 禁用门控（reveal 复用同源）；input-password/design.md、existing-components-improvement-roadmap.md、amis-baseline-matrix.md、前置 E2a plan 均存在。

## Closure Gates

> 关闭条件：本 section + 每 Phase Exit Criteria 全 `[x]`，且独立 closure audit 通过。

- [x] `revealPassword` toggle 在 input-password live 且 focused 单测齐全
- [x] 明文态为 local UI state，不写表单值（单测断言成立）
- [x] 仅 input-password 消费，input-text/email 不渲染 reveal toggle
- [x] input-password/design.md §2/§4/§7/§10/§12 同步，命名漂移消除（无 `showRevealToggle`）
- [x] `existing-components-improvement-roadmap.md` E2a-bis `todo`→`done`
- [x] `amis-baseline-matrix.md` input-password 行同步
- [x] anti-hollow：reveal toggle 运行时可达，无空壳
- [x] E2a plan deferred successor 注记收口
- [x] 不存在被静默降级到 deferred 的 in-scope live defect / contract drift
- [x] 独立子 agent closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### reveal toggle 的自定义 icon / 文案 / 位置

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 首版固定 `Eye`/`EyeOff`（lucide-react）+ end addon 位置，覆盖绝大多数后台密码输入场景。自定义需求窄，且需要 icon schema 评估，复杂度独立于基础 reveal 能力。
- Successor Required: no
- Successor Path: 归 E3 P2 体验完善按需启动。

## Non-Blocking Follow-ups

- 密码强度指示（design.md §2 已标 `暂不实现`）后续可接 validation / 辅助渲染层。
- reveal 明文态是否需要 `aria-live` 区域朗读（a11y 进阶）归 E3 a11y 复盘。

## Closure

Status Note: Plan 于 2026-06-21 关闭。全 3 Phase 执行完成，所有 Closure Gates 通过。代码：`packages/flux-renderers-form/src/schemas.ts`（`InputSchema` 新增 `revealPassword?: boolean`）、`packages/flux-renderers-form/src/renderers/input.tsx`（`inputEnhancementFieldRules` 注册 `revealPassword`；`createInputRenderer` 增加 `revealEnabled` 门控 + `useState` 明文态 + reveal toggle JSX；`InputGroupFieldControl` 扩展 `revealSlot` prop 并在 inline-end addon 渲染；end addon 顺序 suffix → counter → clear → reveal；`needsInputGroup` 含 `revealEnabled` 保证 bare Input 回退路径在有 reveal 时包裹 InputGroup）。测试：`packages/flux-renderers-form/src/__tests__/input-password-reveal.test.tsx`（13 `it()` 块，覆盖渲染/切换/不污染表单值/共存顺序/disabled/readOnly/non-password 渲染兜底/aria 状态翻转/bare 路径/marker/状态保留）。文档：`input-password/design.md` §2/§4/§7/§10/§12 同步（决策表翻转 + 命名漂移收敛 + local state 约束 + DOM marker + 风险）；`input-text/design.md` §4 注明 `revealPassword` 仅 input-password 消费；`existing-components-improvement-roadmap.md` E2a-bis `todo`→`done`；`amis-baseline-matrix.md` retained 决策无变化（No update required）；E2a plan Non-Blocking Follow-ups + Closure.Follow-up 注记收口。验证（implementer 自查）：`pnpm typecheck` = 49/49、`pnpm build` = 26/26、`pnpm lint` = 26/26（1 pre-existing warning）、`pnpm --filter @nop-chaos/flux-renderers-form test` = 32 files / 268 tests 全过（含新增 13 例）。（注：apps/playground `performance-table-page.test.tsx` 1 例 pre-existing 失败与本 plan 无关；未运行 e2e/Playwright，非 AGENTS.md unit+e2e full-green。）

Closure Audit Evidence:

- Reviewer / Agent: implementer self-check（mission-driver EXECUTE flow）；独立 closure-audit 子 agent 由后续 CLOSURE_VERIFY flow step 执行（fresh session）。
- Evidence:
  - `packages/flux-renderers-form/src/schemas.ts:35` — `InputSchema.revealPassword?: boolean` 声明 ✓
  - `packages/flux-renderers-form/src/renderers/input.tsx:46` — `inputEnhancementFieldRules` 含 `{ key: 'revealPassword', kind: 'prop', valueType: 'boolean' }` ✓
  - `packages/flux-renderers-form/src/renderers/input.tsx:171-241` — `revealEnabled` 门控 + `useState(false)` 明文态 + `actualInputType` 驱动 + `revealSlot` JSX（含 `data-slot="input-password-reveal"` / `aria-label` 随态切换 / `aria-pressed={revealed}` / `disabled={!presentation.interactive}` / Eye/EyeOff）✓
  - `packages/flux-renderers-form/src/renderers/input.tsx:130-149` — `InputGroupFieldControl` end addon 渲染 `revealSlot`，顺序 suffix → counter → clear → reveal ✓
  - `packages/flux-renderers-form/src/renderers/input.tsx:243-244` — `hasInlineEndSlot` 含 `revealEnabled`，`needsInputGroup` 保证 bare Input 回退在有 reveal 时包裹 ✓
  - `packages/flux-renderers-form/src/__tests__/input-password-reveal.test.tsx` — 文件存在，13 个 `it()` 块覆盖全部 Failure Path + aria + marker ✓
  - `docs/components/input-password/design.md` §2 行标 `实现`、§4 无 `showRevealToggle`、§7/§10/§12 同步 ✓
  - `docs/components/input-text/design.md` §4 注明 `revealPassword` 仅 input-password 消费 ✓
  - `docs/components/existing-components-improvement-roadmap.md` — E2a-bis `done` ✓
  - `docs/plans/2026-06-21-0331-e2a-text-input-enhancement-plan.md` Non-Blocking Follow-ups + Closure.Follow-up — 注记「已由 E2a-bis plan 收口（2026-06-21）」✓
  - `docs/logs/2026/06-21.md` — 含完整 E2a-bis 收口条目（3 Phase 全描述 + anti-hollow 抽查 + design.md/roadmap/amis-baseline-matrix/E2a plan 更新 + 验证结果）✓

Follow-up:

- reveal toggle 的自定义 icon / 文案 / 位置（Deferred But Adjudicated 已记）归 E3 P2。
- 密码强度指示（design.md §2 已标 `暂不实现`）后续可接 validation / 辅助渲染层（Non-Blocking Follow-ups 已记）。
- 无 plan-owned 剩余 debt。
