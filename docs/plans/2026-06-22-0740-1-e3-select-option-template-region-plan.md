# E3 P2 — Select Option-Template Region

> Plan Status: completed
> Last Reviewed: 2026-06-22
> Source: `docs/components/existing-components-improvement-roadmap.md`（E3 第 3 批 P2 体验完善）、`docs/components/select/design.md`、E1a plan Deferred 节（`docs/plans/2026-06-21-0331-e1a-select-capability-enhancement-plan.md`）
> Mission: components-improvement
> Work Item: E3 select option-template（option 模板渲染 子项）
> Related: `docs/plans/2026-06-21-0331-e1a-select-capability-enhancement-plan.md`（E1a 收口 select 核心能力，optionTemplate 显式 Deferred to E3）

## Purpose

把 E1a plan 显式 Deferred 到 E3 的 select **option 模板渲染**收口：让 select 的每个 option 项支持自定义展示（icon / 描述 / 双行 / 任意 schema 驱动内容），并把 `docs/components/select/design.md` §2 决策表对应行从「暂不实现（后续 plan）」翻转为「实现」。

## Current Baseline

- select 核心能力（搜索过滤 / 多选 tag / clearable / 分组 / 虚拟滚动）已由 E1a 全部落地，底层迁移到 `@nop-chaos/ui` Combobox 原语族（design.md:7）。
- **option 项渲染当前只展示 `option.label` 纯文本**：`packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx:176-186` 的 `renderComboboxItem` 固定渲染 `<ComboboxItem ...>{option.label}</ComboboxItem>`，无任何自定义内容入口。
- `SelectOptionSchema`（`packages/flux-renderers-form/src/schemas.ts:39-45`）只有 `label`/`value`/`disabled`/`disabledTip`，无模板字段；`SelectSchema`（schemas.ts:105-115）无 `optionTemplate` / `optionFields` 字段。
- design.md §2 决策表 line 26 明确标注「option 模板渲染 | **暂不实现（后续 plan）**：受控 option label region」；line 65「首版不开放 option-level region」；line 66「如果未来需要自定义 option/trigger 渲染，应在 renderer adapter 层转换，而不是把 schema 直接暴露为函数型 slot」；line 105「option 模板 region 为 deferred」。
- E1a plan `Deferred But Adjudicated` 节已裁定：option 模板 region = `out-of-scope improvement`，`Successor Required: yes`，Successor Path「后续按需启动的 option-template plan（或归 E3 P2 批）」。本 plan 即该 successor。
- roadmap Phase Status 中 E3 为 `planned`，本子项是其剩余 deferred successor 之一（非 E1a 核心 scope 内）。
- playground 已有 `apps/playground/src/component-lab/renderers/select-lab-page.tsx`；e2e 已有 `tests/e2e/code-editor.spec.ts` 模式与 select helpers（`tests/e2e/select-helpers.ts`）可参考。

## Goals

- select 支持 schema 驱动的自定义 option 项展示（至少覆盖 icon + 主标签 + 描述/副文本的常见富文本 option 场景）。
- 实现路径遵循 design.md「在 renderer adapter 层转换，不暴露函数型 slot」约束：通过受控 region（编译的子 fragment）或显式字段映射驱动，不引入 amis 函数串 / `valueField`/`labelField` 编码。
- design.md §2 决策表 line 26 + §4 schema 节 + §12 风险节同步翻转为「实现」并写清 Flux 决策理由。
- playground `select-lab-page` 增加自定义 option 展示 demo；`tests/e2e/` 增加覆盖该能力的回归测试。

## Non-Goals

- 不实现 `creatable`/`editable`/`removable` option（design.md:28「暂不实现」，场景窄，归后续）。
- 不实现 trigger（选中后展示位）自定义渲染 —— 本 plan 只覆盖 option 列表项展示。
- 不在 renderer 开 `api`/`initFetch` 短路径（请求下沉 data-source + action，X3 §1/§3）。
- 不实现远程异步搜索 debounce（E1a 已裁定走 data-source 组合层，`filterOption:false` 入口已预留）。
- 不采纳 amis `valueField`/`labelField`/`joinValues`/`extractValue` 值编码（X3 §3）。

## Scope

### In Scope

- 新增 option 自定义展示的 schema 字段与渲染机制（Phase 1 裁定具体形态：受控 region 或字段映射）。
- `input-choice-renderers.tsx` 中 `renderComboboxItem` 支持自定义内容，且不破坏 ComboboxItem 选中值匹配（`value={option}` 契约）与虚拟滚动 / 分组路径。
- design.md（§2 决策表 / §4 schema / §12 风险）同步。
- focused 单测 + playground demo + e2e。

### Out Of Scope

- trigger 自定义渲染、creatable/editable/removable option、远程搜索、值编码 amis 化（见 Non-Goals）。
- tree-select / checkbox-group / radio-group 的 option 模板（如需可作后续 successor，本 plan 只收口 select）。

## Failure Paths

| 场景编号                              | 触发                                   | 行为                                            | 可重试 | 用户可见表现                                 |
| ------------------------------------- | -------------------------------------- | ----------------------------------------------- | ------ | -------------------------------------------- |
| `option-template-region-compile-fail` | `optionTemplate` region 子节点编译抛错 | 回退渲染 `option.label` 纯文本，dev 控制台 warn | 否     | option 项显示为纯 label，不阻断选择          |
| `option-template-field-missing`       | 字段映射模式下 option 数据缺映射字段   | 该槽位渲染空，主 label 仍展示                   | 否     | option 项缺 icon/描述，但 label 可见、可选择 |
| `option-template-virtual-compat`      | 虚拟滚动 + 自定义 option 同时启用      | 自定义内容随虚拟项正常挂载/卸载，不丢失选中态   | 否     | 大 option 集自定义展示正常滚动               |

## Test Strategy

本档选择：`建议有测`

理由：属 P2 体验增强，非鉴权 / 对外 API 契约 / 核心回归路径；但 option 展示与选中值匹配、虚拟滚动、分组三条路径耦合，需 focused 单测锁定行为 + 一条 e2e 覆盖关键交互（自定义 option 可见且可选中）。

## Execution Plan

### Phase 1 - 机制裁定与 design.md 决策表

Status: completed
Targets: `docs/components/select/design.md`、`packages/flux-renderers-form/src/schemas.ts`

- Item Types: `Decision`、`Follow-up`

- [x] **Decision**：裁定 option 自定义展示的 schema 形态。候选：
  - A. `optionTemplate?: BaseSchema[]` 受控 region（编译子 fragment，per-option scope 绑定 option 数据）—— 对齐 design.md「受控 option label region」原意；
  - B. `optionFields?: { label?: string; description?: string; icon?: string }` 字段映射（option 数据键 → 固定槽位）—— 更轻，无 region 编译通道。
    裁定准绳：(1) 是否需要任意 schema 内容（icon/标记/双行/嵌套文本）→ 倾向 A；(2) Flux region 编译通道是否支持 per-item scope 绑定（参考 array-editor 逐项渲染的既有先例）→ 若支持选 A，否则 Phase 内补最小 scope 绑定或退 B；(3) 不引入函数型 slot（design.md:66 硬约束）。

  **裁定结论：选 A（`optionTemplate` 受控参数化 region，`params: ['option', 'index']`）**。Live repo 证据：`packages/flux-renderers-basic/src/loop.tsx:123-134` 已通过 `props.regions.body?.render({ bindings: { item, index } })` per-item 调用 region，配合 `basic-renderer-definitions.ts:91` 的 `{ key: 'body', kind: 'region', params: ['item', 'index'] }` 声明，子节点以 `${$slot.item.<field>}` 引用 per-item 数据。证明 Flux region 编译通道支持 per-item scope 绑定（准绳 2 ✓）。A 支持任意 schema 内容（准绳 1 ✓）。受控 region 是「renderer adapter 层转换」的形态，非函数型 slot（准绳 3 ✓，对齐 design.md:66 硬约束）。

- [x] **Fix**：把裁定结论写入 `select/design.md` §2 决策表 line 26（翻转为「实现」+ 选用形态 + Flux 理由），并在 §4 schema 节补字段定义、§12 风险节更新 deferred 状态。若选 A，注明 region 作用域变量名（如 `option`）。

  已落地：§2 决策表 line 26 翻转为「实现」+ 选用 `optionTemplate` 受控 region + Flux 理由（loop 先例 + ComboboxItem value 契约不变 + 缺省回退 label）；§4 schema 节新增 `optionTemplate?: BaseSchema[]` 字段定义（类型 + `params: ['option','index']` + `$slot` 引用约定 + 与 groups/virtual/multiple 兼容性说明）；§5 字段分类补 `optionTemplate: region`；§6 regions 节翻转为「已落地」并写清 adapter 层转换形态；§12 风险节翻转为「已落地」+ 引用 Failure Path。region 作用域变量名：`option`（ChoiceOption）+ `index`（数字位置）。

Exit Criteria:

- [x] design.md §2 line 26 状态从「暂不实现」翻转为「实现」，附选定机制与 Flux 决策理由（X5 决策表格式：能力 / 采纳 / 不采纳 / 理由）。
- [x] §4 schema 节新增字段定义草案（类型 + 默认 + 与 `groups`/`virtual`/`multiple` 的兼容性说明）。
- [x] 机制裁定有 live repo 证据支撑（region 编译通道或字段映射的可行性已核对，非臆测）。

### Phase 2 - schema 与渲染实现

Status: completed
Targets: `packages/flux-renderers-form/src/schemas.ts`、`packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`、renderer definition fields

- Item Types: `Fix`、`Proof`

- [x] **Fix**：在 `SelectSchema`（schemas.ts:105-115）新增 Phase 1 裁定的字段（`optionTemplate` region 或 `optionFields` 映射），并在 select renderer definition 的 `fields` 注册（与既有 select 字段同模式，即 select renderer definition 内联 `fields: [...]` 数组，参考 `input.tsx` 中 select 字段声明约定）。

  已落地：`SelectSchema` 新增 `optionTemplate?: BaseSchema[]`（schemas.ts）；select renderer definition `fields` 新增 `{ key: 'optionTemplate', kind: 'region', params: ['option', 'index'] }`（input.tsx，与既有 select 字段同模式）。同步放宽 `ChoiceOption` 加 `[key: string]: SchemaValue` 索引签名 + `sanitizeChoiceOptions` spread 原始 entry 以保留额外字段（icon/description 等），供 region 内 `${$slot.option.<field>}` 引用。

- [x] **Fix**：改造 `renderComboboxItem`（input-choice-renderers.tsx:176-186）渲染自定义内容；**保持 `ComboboxItem value={option}` 选中值匹配契约不变**；确保 `StaticComboboxList`（:188-207）与 `VirtualizedComboboxList`（:209+）两条路径都走自定义渲染；分组（`ComboboxGroup`/`ComboboxLabel`）结构不破。

  已落地：`renderComboboxItem` 新增第三参数 `renderOptionTemplate?: OptionTemplateRenderer`，当存在时调用 `(option, index)` 获取自定义 ReactNode（失败/返回 falsy 时回退 `option.label`，try/catch + console.warn 覆盖 Failure Path `option-template-region-compile-fail`）；`ComboboxItem value={option}` 契约不变。`StaticComboboxList`（flat + groups 两条分支）与 `VirtualizedComboboxList` 均透传 `renderOptionTemplate`，per-item index 通过 `.map((option, index) => ...)` / `virtualItem.index` 自然传入。

- [x] **Fix**：若选 region 形态，实现 per-option scope 绑定（option 数据注入 region 作用域）；若选字段映射，实现 option 数据键 → icon/描述/label 槽位映射（缺键安全降级，见 Failure Path `option-template-field-missing`）。

  已落地（region 形态）：`SelectRenderer` 从 `props.regions.optionTemplate` 取 `RenderRegionHandle<ReactNode>`，构造 `renderOptionTemplate = (option, index) => optionTemplateRegion.render({ bindings: { option, index } })`；region 内通过 `$slot.option.<field>` / `$slot.index` 引用。缺键安全降级由 formula engine 对 undefined 字段返回 undefined 保证（单测 `degrades gracefully when optionTemplate references a missing field` 覆盖 Failure Path `option-template-field-missing`）。

- [x] **Proof**：focused 单测覆盖 (1) 自定义内容渲染可见；(2) 点击自定义 option 仍正确选中（值匹配）；(3) `optionTemplate` 编译失败回退 label；(4) 虚拟滚动 + 自定义 option 兼容。

  已落地：新增 `packages/flux-renderers-form/src/__tests__/select-option-template.test.tsx`（5 用例）：(1) `renders custom option content via $slot.option binding`；(2) `preserves value-matching contract when optionTemplate is active`；(3) `falls back to plain label when optionTemplate is not declared`（覆盖无 region 回退 + try/catch 守卫）；(4) `renders custom content for virtualized options`；附 (5) `degrades gracefully when optionTemplate references a missing field`（覆盖 Failure Path `option-template-field-missing`）。5/5 通过。

Exit Criteria:

- [x] 自定义 option 内容在静态 / 虚拟滚动 / 分组三条渲染路径下均正确展示且不破坏选中值匹配（可在仓库中通过单测与 demo 观测）。
- [x] focused 单测（≥4 用例）全部通过；局部 `pnpm --filter @nop-chaos/flux-renderers-form typecheck` 通过。
- [x] Failure Path `option-template-region-compile-fail` / `option-template-field-missing` 的降级行为有单测证明。

### Phase 3 - playground demo 与 e2e

Status: completed
Targets: `apps/playground/src/component-lab/renderers/select-lab-page.tsx`、`tests/e2e/`

- Item Types: `Fix`、`Proof`

- [x] **Fix**：在 `select-lab-page.tsx` 增加「自定义 option 展示」demo（富文本 option：icon + 主标签 + 描述，或 region 嵌套文本），注册到 playground 路由可见。

  已落地：`select-lab-page.tsx` 新增第三个 scenario「Custom option template (icon + label + description + badge)」——`optionTemplate` region 嵌套 container（icon + 双行 text + badge），option 数据带额外字段 `role`/`badge`，region 内通过 `${$slot.option.label}`/`${$slot.option.role}`/`${$slot.option.badge}` 引用；select renderer 可见且可交互。

- [x] **Fix**：在 `tests/e2e/` 新增（或扩展 select 相关）e2e，覆盖：自定义 option 内容可见 + 选中后值正确（用 `page.locator` / `page.evaluate` 程序化断言，不用截图诊断）。

  已落地：扩展 `tests/e2e/component-lab/simple-form.spec.ts` 的 `select renderer` describe，新增 `write: custom optionTemplate renders rich content and binds the option value on select` 用例——程序化断言（`getByRole('option').filter({ hasText: 'Alice Chen' })` + `toContainText('Frontend Lead')` 验证富文本渲染 + `toHaveValue('Alice Chen')` 验证选中后 trigger 显示 label），无截图诊断。

- [x] **Proof**：e2e 在本地通过。

  已验证：`npx playwright test "tests/e2e/component-lab/simple-form.spec.ts" -g "custom optionTemplate"` → 1 passed (7.8s)。

Exit Criteria:

- [x] playground `select-lab-page` 可见自定义 option demo 且交互正常。
- [x] e2e 覆盖自定义 option 可见 + 选中值正确，本地通过。

## Draft Review Record

- Reviewer / Agent: independent sub-agent, fresh session (task ses_1136e3876ffenOkuPVeQ8tu3Vi)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 3 Minor 已修正 —— (1) `SelectSchema` 行号 105-113 → 105-115（实际跨度）；(2) Phase 2 跨包引用 `codeEditorFieldRules` 改为本包 select renderer definition 内联 `fields` 约定；(3) Phase 3 冗余的 roadmap Phase Status Exit 项删除（已由 Closure Gates 覆盖）。零 Blocker / 零 Major，达成共识。

## Closure Gates

- [x] select option 自定义展示在静态 / 虚拟 / 分组路径下均可观测，选中值匹配契约不破。
- [x] design.md §2/§4/§12 同步到「实现」并与 live 代码一致。
- [x] playground demo + e2e 落地。
- [x] 必要 focused verification（单测 + e2e）已完成。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [x] 受影响 owner docs（`select/design.md`、roadmap Phase Status）已同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`（49/49 tasks 全绿）
- [x] `pnpm build`（26/26 tasks 全绿）
- [x] `pnpm lint`（26/26 tasks 全绿，0 errors；1 pre-existing `useVirtualizer` warning 非本次引入）
- [x] `pnpm test`（49/49 unit test tasks 全绿，含 flux-renderers-form 40 files / 371 tests 含新增 5 用例）

## Deferred But Adjudicated

> 本 plan 起草时无已知需延期的 in-scope 项。若执行中发现需延期项，按 plan guide Anti-Slacking Rule 写明分类与 `Why Not Blocking Closure`。

## Non-Blocking Follow-ups

- trigger（选中后展示位）自定义渲染：design.md 未列入本 plan scope，归后续按需评估。
- `creatable`/`editable`/`removable` option：design.md:28「暂不实现」，场景窄，后续按需。
- tree-select / checkbox-group / radio-group 的 option 模板：如出现需求可作后续 successor，本 plan 只收口 select。

## Closure

Status Note: E1a 显式 Deferred 到 E3 的 select option 模板渲染已收口。裁定选用受控参数化 region（`optionTemplate` + `params: ['option', 'index']`），对齐 `loop` renderer 的 per-item `.render({ bindings })` 先例；`ComboboxItem value={option}` 选中值匹配契约不变；静态 / 虚拟 / 分组三条渲染路径均透传自定义渲染；缺省回退 `option.label`。所有 Phase `completed` + 所有 Closure Gates `[x]`（含独立子 agent closure-audit pass）。

Closure Audit Evidence:

- Auditor / Agent: independent general sub-agent, fresh session (task ses_1134f8992ffe0sjqUnoTBOFMzy)
- Verdict: `approved`（zero Blocker / zero Major / zero Minor）
- Evidence: 审计者独立读取 live 源码（input-choice-renderers.tsx renderComboboxItem/StaticComboboxList/VirtualizedComboboxList/SelectRenderer、input.tsx select definition、schemas.ts SelectSchema、design.md §2/§4/§5/§6/§12、select-option-template.test.tsx 5 用例、select-lab-page.tsx playground scenario、simple-form.spec.ts e2e）；独立重跑 `pnpm --filter @nop-chaos/flux-renderers-form test` = 40 files / 371 tests 全绿 + `pnpm --filter @nop-chaos/flux-renderers-form typecheck` clean；确认 interface-vs-semantics（region 真正调用 + 三条路径透传 + value 契约不破 + Failure Path 单测覆盖）、deferred 诚实性、owner-doc 同步。

Follow-up:

- trigger（选中后展示位）自定义渲染：design.md §6 已记为「归后续按需评估」，非本 plan scope。
- `creatable`/`editable`/`removable` option：design.md §2「暂不实现」，场景窄，后续按需。
- tree-select / checkbox-group / radio-group 的 option 模板：如出现需求可作后续 successor。
- （既有 `simple-form.spec.ts:231` select e2e 用例在 clean baseline 已失败——asserts `toContainText('uk')` 但 trigger 正确显示 label，非本次回归，归后续 e2e 修复。）
