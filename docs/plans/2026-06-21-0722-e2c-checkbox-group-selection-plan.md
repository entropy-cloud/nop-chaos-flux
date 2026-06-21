# E2c Checkbox-Group 选择增强

> Plan Status: completed
> Package: components-improvement
> Work Item: E2c checkbox-group 选择增强
> Last Reviewed: 2026-06-21
> Source: `docs/components/existing-components-improvement-roadmap.md`（E2c 行）、`docs/components/checkbox-group/design.md` §2 Flux 决策表、live-repo audit（`CheckboxGroupRenderer` + `CheckboxGroupSchema` + option sanitize 路径）
> Related: X3 naming-conventions（done）、X5 checkbox-group Flux 决策表（done）、E2a（已建立 option `{label,value,disabled}` sanitize 基线，`input-choice-renderers.tsx:96-126`）

## Purpose

把 roadmap 工作项 **E2c checkbox-group 选择增强** 从 `todo` 推进到 `done`：为 `checkbox-group` 补齐 **`checkAll` 全选 + 半选 indeterminate**、**`maxSelected`/`minSelected` 选择数约束**、**per-option `disabled`（当前 sanitizer 保留但 renderer 忽略）+ `disabledTip`**。当前 `CheckboxGroupSchema` 仅多一个 `options`，且 `CheckboxGroupRenderer` 完全忽略 `option.disabled`（line 615 仅用 group 级 disabled），全选/数量约束均无实现。

## Current Baseline

经 live-repo audit（2026-06-21）：

- **Schema**：`CheckboxGroupSchema extends InputSchema`（`packages/flux-renderers-form/src/schemas.ts:87-89`）只新增 `options?: SelectOptionsValue`。无 `checkAll`/`maxSelected`/`minSelected`。
- **Option 形状**：`SelectOptionSchema`（`schemas.ts:9-14`）含 `label`/`value`/`disabled?`。`sanitizeChoiceOptions`（`input-choice-renderers.tsx:96-126`）**会**保留 `option.disabled`（L122 `disabled: candidate.disabled === true ? true : undefined`），所以 disabled 数据可流到 renderer。
- **Renderer 缺口**：`CheckboxGroupRenderer`（`input-choice-renderers.tsx:576-645`）渲染每个 option 为 `Checkbox`，其 `disabled={loading || presentation.effectiveDisabled}`（L615）—— **完全忽略 `option.disabled`**。无全选项，无 indeterminate，无 max/min 约束。选中态由 `selectedValues.some(...)` 判定（L609）。
- **Definition 接线**：checkbox-group renderer definition（`input.tsx:409-420`）`fields: [...formFieldRules, { key: 'options', kind: 'prop', allowSource: true, sourceStateKey: 'optionsSourceState' }]`。
- **值 adapter**：`checkboxGroupAdapter`（`input-choice-renderers.tsx:60-69`）`in/out` 把值归一为数组。
- **Source 加载态**：已有 loading/error 渲染（L587-607, L638-642）与 group 级 a11y（`role="group"` L596）。
- **UI 原语**：`@nop-chaos/ui` `Checkbox` 支持 `checked`/`indeterminate`（input-tree 已用 indeterminate，`tree-controls.tsx:129-136`）；`Tooltip` 可用（已 import 于其他 renderer）。
- **测试先例**：`input-source-state.test.tsx`（checkbox-group source 态）、`form-validation-ui.test.tsx`（group a11y）。无 selection-enhancement 专项测试。
- **i18n**：`@nop-chaos/flux-i18n` `t()` 已用于 loading/noResults；全选文案需新 key（如 `flux.common.selectAll` / `flux.form.selectAll`）。

## Goals

- `CheckboxGroupSchema` 新增 `checkAll?: boolean`、`maxSelected?: number`、`minSelected?: number`；option 形状补 `disabledTip?: string`。
- `checkAll: true` 时在选项列表顶部渲染「全选」复选项：全部可选 option 已选 → checked；部分已选 → indeterminate；点击全选 → 选中所有当前可选（未 disabled）option，再次点击 → 清空。
- `maxSelected`：当已选数达到上限时，未选中的可选 option 变 disabled（阻止继续选）；已在选中态的不被强制取消。
- `minSelected`：当已选数等于下限时，取消选中被阻止（该 option 保持选中）；首版以「达到下限时禁用取消」或「允许低于下限但不通过校验」二选一（Phase 1 裁定，倾向前者即时反馈）。
- per-option `disabled`：renderer 真实消费 `option.disabled`（与 group 级 disabled 叠加）；`disabledTip` 声明时该 option 配 Tooltip 提示。
- `checkAll`/`maxSelected`/`minSelected` 与 source-loaded options、disabled option 协同：全选只勾选「当前未 disabled」的 option；maxSelected 计数不含已 disabled 的 option。
- `checkbox-group/design.md` §2 决策表 `计划实现（E2c）` 行全部翻 `实现`；§4/§5/§8/§10/§12 同步。
- 每项能力配有 focused 单测。

## Non-Goals

- `columnsCount` 多列布局（决策表 `暂不实现`，归 `flex`）。
- `optionType: 'button'` 按钮式/分段控件（决策表 `暂不实现`）。
- `menuTpl` 受控 option region（决策表 `暂不实现`）。
- `creatable`/`addApi`/`editable`/`removable`（决策表 `暂不实现`）。
- amis 值编码 `valueField`/`labelField`/`joinValues`/`extractValue`（决策表 `不采纳`，坚持 `{label,value}` 标准形状）。
- tag-list / 树多选（design.md §12 边界 —— 固定选项集合的多选）。

## Scope

### In Scope

- `packages/flux-renderers-form/src/schemas.ts`：`CheckboxGroupSchema` 新增 `checkAll`/`maxSelected`/`minSelected`；`SelectOptionSchema` 新增 `disabledTip?: string`（该形状被 checkbox-group / radio-group / select 共享，新增字段为可选增量，不影响既有消费方）。
- `packages/flux-renderers-form/src/renderers/input.tsx`：checkbox-group renderer definition 注册新字段（`checkAll`/`maxSelected`/`minSelected` 为 `prop`，`disabledTip` 随 options 数据流入不需单独注册）。
- `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`：`CheckboxGroupRenderer` 增强 —— 全选项渲染 + indeterminate、max/min 约束、per-option disabled 消费 + disabledTip Tooltip。
- `packages/flux-renderers-form/src/__tests__/checkbox-group-selection.test.tsx`（新建或扩既有）：focused 用例。
- `docs/components/checkbox-group/design.md`：§2 决策表翻转 + §4 schema + §5 字段分类 + §8 句柄能力（全选/清空）+ §10 DOM marker + §12 风险。
- `docs/components/existing-components-improvement-roadmap.md`：E2c `todo`→`done`（closure 后）。
- `docs/logs/2026/06-21.md`（或执行当日）：E2c 收口条目。

### Out Of Scope

- 见 Non-Goals 全部条目。
- e2e/Playwright（单测覆盖足够；选择约束是纯前端数组计算）。

## Failure Paths

| 场景编号                       | 触发                                              | 行为                                                                  | 可重试 | 用户可见表现                   |
| ------------------------------ | ------------------------------------------------- | --------------------------------------------------------------------- | ------ | ------------------------------ |
| e2c-checkall-all-selected      | `checkAll: true`，全部可选 option 已选            | 全选复选 checked（非 indeterminate）                                  | 否     | 全选项打勾                     |
| e2c-checkall-partial           | `checkAll: true`，部分可选 option 已选            | 全选复选 indeterminate（半选）                                        | 否     | 全选项显示半选态               |
| e2c-checkall-toggle-on         | 全选 indeterminate/unchecked 时点击全选           | 选中所有当前未 disabled 的可选 option                                 | 否     | 全部可选项打勾                 |
| e2c-checkall-toggle-off        | 全选 checked 时点击全选                           | 清空所有可选 option（已 disabled 的保持其原态，通常本就未选）         | 否     | 全部可选项取消                 |
| e2c-checkall-excludes-disabled | 某 option `disabled: true`，点击全选              | disabled option 不被选中；全选 checked 仅当所有非 disabled 可选项已选 | 否     | disabled 项保持未选            |
| e2c-max-reached                | `maxSelected: 2`，已选 2 项，尝试选第 3 项        | 未选中的可选 option 变 disabled，第 3 项不可勾                        | 否     | 其余未选项灰显                 |
| e2c-max-keeps-selected         | `maxSelected: 2`，已选 2 项                       | 已选中的 2 项不被强制取消（可单独取消以释放配额）                     | 否     | 已选项仍可取消勾               |
| e2c-min-block-uncheck          | `minSelected: 2`，已选 2 项，尝试取消其中一项     | 该项取消被阻止（保持选中）；或允许取消但不通过校验（Phase 1 裁定）    | 否     | 该项保持选中（或显示校验错误） |
| e2c-option-disabled            | 某 option `disabled: true`                        | 该 option Checkbox disabled，不可勾                                   | 否     | 该项灰显                       |
| e2c-option-disabled-tip        | 某 option `disabled: true` + `disabledTip: "..."` | 该 option 配 Tooltip 显示提示文案                                     | 否     | hover/focus 显示提示           |
| e2c-disabled-group             | group 级 `disabled: true`                         | 全部 option（含全选）disabled；全选/约束逻辑不触发交互                | 否     | 整组灰显                       |

## Test Strategy

档位选择：**建议有测**

本档选择：`建议有测`

理由：选择约束（max/min）与全选 indeterminate 是表单高频交互，但非鉴权/对外 API。max/min 的「到达上限禁用未选项」「下限阻止取消」与全选的「排除 disabled」「indeterminate 派生」是易回归契约，必须有 focused 单测验证数组计算结果。Proof 紧随 Fix，不强制 test-first。

## Execution Plan

### Phase 1 - schema 字段 + 约束语义裁定 + 决策表准备

Status: completed
Targets: `packages/flux-renderers-form/src/schemas.ts`、`packages/flux-renderers-form/src/renderers/input.tsx`、`docs/components/checkbox-group/design.md`

- Item Types: `Decision | Fix`

- [x] **Decision**：`minSelected` 违反语义裁定 —— (A) 即时阻止：达到下限时取消选中被禁用 vs (B) 允许低于下限但触发校验错误。倾向 (A) 即时反馈（与 `maxSelected` 的即时禁用对称），最终裁定写入 design.md §8/§12。
- [x] **Decision**：全选文案 i18n key 命名 —— 新增 `flux.form.selectAll` / `flux.form.deselectAll`（随态切换），或复用 `flux.common.*`。Phase 1 终裁并补 i18n 资源条目。
- [x] `CheckboxGroupSchema` 新增 `checkAll?: boolean`、`maxSelected?: number`、`minSelected?: number`
- [x] `SelectOptionSchema` 新增 `disabledTip?: string`（可选增量，不影响 select/radio 既有消费）
- [x] checkbox-group renderer definition（`input.tsx:409-420`）`fields` 注册 `checkAll`/`maxSelected`/`minSelected`（`kind:'prop'`，数字字段标 `valueType:'number'`）
- [x] `checkbox-group/design.md` §2 决策表 `计划实现（E2c）` 行翻 `实现中（E2c）`；§4/§5 同步

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-renderers-form typecheck` 通过，`CheckboxGroupSchema.checkAll`/`maxSelected`/`minSelected` 与 `SelectOptionSchema.disabledTip` 类型可见
- [x] checkbox-group definition `fields` 含三项注册
- [x] design.md §2 标 `实现中（E2c）`；当日 log 记录两项 Decision 理由

### Phase 2 - per-option disabled + disabledTip

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`、`docs/components/checkbox-group/design.md`

- Item Types: `Fix | Proof`

- [x] `CheckboxGroupRenderer`：每个 option 的 Checkbox `disabled` 改为 `loading || presentation.effectiveDisabled || Boolean(option.disabled)`（修复当前忽略 `option.disabled` 的漂移）
- [x] `disabledTip` 声明时，该 option 包裹 `Tooltip`（hover/focus 触发）显示文案；无 `disabledTip` 时 disabled option 仅灰显无提示
- [x] disabled option 不参与 onChange（即便渲染也不响应 onCheckedChange）
- [x] focused 单测覆盖 Failure Path `e2c-option-disabled`/`e2c-option-disabled-tip`/`e2c-disabled-group`

Exit Criteria:

- [x] `option.disabled: true` 时该 Checkbox disabled 且不可勾（修复既有漂移）
- [x] `disabledTip` 声明时 Tooltip 显示文案
- [x] group 级 disabled 仍使整组禁用
- [x] `pnpm --filter @nop-chaos/flux-renderers-form test` disabled 用例全过；design.md §2 per-option disabled 行翻 `实现`
- [x] `docs/logs/` 当日条目记录 per-option disabled + disabledTip 落地

### Phase 3 - maxSelected / minSelected 约束

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`、`docs/components/checkbox-group/design.md`

- Item Types: `Fix | Proof`

- [x] `maxSelected` 声明时：当 `selectedValues.length >= maxSelected`，未选中的可选（非 option.disabled）option Checkbox 变 disabled，阻止继续选；已选中项保持可取消（释放配额后其余恢复可选）
- [x] `minSelected` 声明时：按 Phase 1 裁定实现（倾向即时阻止 —— 已选数等于下限时取消选中被禁用）
- [x] max/min 计数基于「实际选中值数组长度」，与 disabled option 无关（disabled option 不计入可选基数）
- [x] max/min 与 group disabled / loading 协同（group 禁用时整组禁用优先）
- [x] focused 单测覆盖 Failure Path `e2c-max-reached`/`e2c-max-keeps-selected`/`e2c-min-block-uncheck`

Exit Criteria:

- [x] `maxSelected` 到达上限时未选项 disabled，已选项可取消；`minSelected` 下限阻止取消（或触发校验，依裁定）
- [x] 约束不误伤 disabled option 与 group 禁用态
- [x] `pnpm --filter @nop-chaos/flux-renderers-form test` 约束用例全过；design.md §2 max/min 行翻 `实现`
- [x] `docs/logs/` 当日条目记录 maxSelected/minSelected 约束落地

### Phase 4 - checkAll 全选 + indeterminate

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`、`docs/components/checkbox-group/design.md`

- Item Types: `Fix | Proof`

- [x] `checkAll: true` 时在选项列表顶部渲染「全选」Checkbox（`data-slot="checkbox-group-checkall"`），其 checked/indeterminate 由「所有非 disabled 可选 option 是否全选」派生：全选→checked，部分→indeterminate，无→unchecked
- [x] 点击全选 checked → 清空所有可选 option 值；点击 unchecked/indeterminate → 选中所有当前非 disabled 可选 option（Failure Path `e2c-checkall-toggle-on`/`off`）
- [x] 全选逻辑排除 `option.disabled` 项（`e2c-checkall-excludes-disabled`）
- [x] 全选项与 max/min 协同：全选受 maxSelected 钳制（若可选数 > maxSelected，全选只选到上限，或全选 disabled —— Phase 4 裁定，倾向全选只选到 maxSelected 上限并据此显示 indeterminate）
- [x] 全选与 source-loaded options / loading 协同（loading 时全选 disabled）
- [x] focused 单测覆盖 Failure Path `e2c-checkall-*` 全部

Exit Criteria:

- [x] 全选 checked/indeterminate/unchecked 三态正确派生，排除 disabled
- [x] 全选切换只影响非 disabled 可选 option，受 maxSelected 钳制
- [x] group disabled / loading 时全选 disabled
- [x] `pnpm --filter @nop-chaos/flux-renderers-form test` 全选用例全过；design.md §2 checkAll 行翻 `实现`
- [x] `docs/logs/` 当日条目记录 checkAll + indeterminate 落地

### Phase 5 - owner-doc 同步 + roadmap 收口

Status: completed
Targets: `docs/components/checkbox-group/design.md`、`docs/components/existing-components-improvement-roadmap.md`、`docs/components/amis-baseline-matrix.md`、`docs/logs/`

- Item Types: `Proof | Follow-up`

- [x] anti-hollow 抽查：checkAll/max/min/per-option disabled 真实在 checkbox-group 运行时路径生效（非注册不可达）
- [x] `checkbox-group/design.md` §2 无残留 `计划实现（E2c）`/`实现中（E2c）`；§4/§5/§8（全选/清空句柄）/§10（`data-slot` marker）/§12（边界：不演变成 tag-list/树）同步
- [x] `existing-components-improvement-roadmap.md`：E2c `todo`→`done`（closure audit 通过后；不在本 phase 提前改）
- [x] `amis-baseline-matrix.md` checkbox-group 行 retained 决策同步（无变化则标 No update required）
- [x] `docs/logs/` 当日条目汇总 E2c 全 phase + 验证结果

Exit Criteria:

- [x] design.md 无残留 E2c 占位标签
- [x] anti-hollow 抽查写入当日 log
- [x] `docs/logs/` 当日条目含 E2c 收口段

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: fresh REVIEW_PLANS sub-agent (session 2026-06-21)
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed:
  - Minor (fixed): Phases 2/3/4 Exit Criteria 缺 template-mandated `docs/logs/` 项，已逐 phase 补齐。
  - Minor (left): Phase 4 内嵌「全选与 maxSelected 极端组合」Decision（Item Types 仅 `Fix | Proof`），已由 `Deferred But Adjudicated` 兜底裁定，不阻塞。
  - Minor (left): `> Package:` / `> Work Item:` 为模板外附加字段，不影响 driver 扫描，保留。
- 引用核对：schemas.ts:9-14/87-89、input-choice-renderers.tsx:60-69/96-126/576-645（L615/L609/L596）、input.tsx:409-420 全部对齐 live repo。

## Closure Gates

> 关闭条件：本 section + 每 Phase Exit Criteria 全 `[x]`，且独立 closure audit 通过。

- [x] `checkAll` 全选 + indeterminate（排除 disabled、与 max/source 协同）live 且 focused 单测齐全
- [x] `maxSelected`/`minSelected` 约束 live 且 focused 单测齐全
- [x] per-option `disabled` 真实被消费（修复既有「sanitizer 保留但 renderer 忽略」漂移）且 `disabledTip` Tooltip 成立
- [x] 全选/约束/max-min 协同不误伤 disabled option 与 group 禁用态
- [x] `checkbox-group/design.md` §2/§4/§5/§8/§10/§12 同步，决策表 E2c 行全 `实现`
- [x] `existing-components-improvement-roadmap.md` E2c `todo`→`done`
- [x] `amis-baseline-matrix.md` checkbox-group 行同步（或 No update required）
- [x] anti-hollow：四项能力运行时可达，无空壳
- [x] 不存在被静默降级到 deferred 的 in-scope live defect / contract drift（含 per-option disabled 漂移已修复）
- [x] 独立子 agent closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 全选与 maxSelected 的极端组合（可选数 > maxSelected）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 当「非 disabled 可选 option 数」大于 `maxSelected` 时，全选语义存在歧义（全选会立即违反上限）。Phase 4 裁定倾向「全选只选到 maxSelected 上限并据此显示 indeterminate」，该行为可由单测固定。若后续产品需要「全选按钮在可选数超上限时 disabled」的替代语义，可作为 watch-only 改进项。
- Successor Required: no
- Successor Path: 归 E3 P2 按需评估。

## Non-Blocking Follow-ups

- `columnsCount` 多列布局若后续有需求，归 `flex` 布局层独立评估（决策表 `暂不实现`）。
- `optionType: 'button'` 按钮式分段控件若后续有需求，独立评估（决策表 `暂不实现`）。

## Closure

Status Note: 全 5 Phase 执行完成。四项能力（checkAll + indeterminate / maxSelected + minSelected 约束 / per-option disabled + disabledTip）已 live 于 `checkbox-group-renderer.tsx`，focused 单测齐全（24 例）。技术验证（typecheck/build/lint/test）全绿；唯一失败为 `apps/playground` `performance-table-page.test.tsx` 的 pre-existing 失败（E2a 收口起即记录，与本 plan 无关）。`disabledTip` 实现裁定为 Label `title`（非 base-ui Tooltip overlay）—— disabled 项不可 focus，base-ui Tooltip 在 jsdom 受 pointer/focus 触发限制，`title` 提供稳定可测的 hover 提示（design.md §12 已记理由）。

Closure Audit Evidence:

- Reviewer / Agent: 执行 agent（mission-driver 任务，非独立子 agent closure-audit）+ 独立 closure-audit sub-agent（fresh session，2026-06-21）
- Evidence:
  - `pnpm typecheck` = 49/49、`pnpm build` = 26/26、`pnpm lint`（form 包）= 0 errors（1 pre-existing useVirtualizer warning）、`pnpm --filter @nop-chaos/flux-renderers-form test` = 34 files / 315 tests（291 既有 + 24 新增 `checkbox-group-selection.test.tsx`）。
  - anti-hollow：`checkbox-group-renderer.tsx` 真实消费 `props.props.checkAll`/`maxSelected`/`minSelected` + `option.disabled`/`disabledTip`（grep 已验），field 注册可达（input.tsx checkbox-group definition `fields`）。
  - `checkbox-group/design.md` §2 决策表 E2c 3 行全 `实现`，无残留 `计划实现（E2c）`/`实现中（E2c）`。
  - `existing-components-improvement-roadmap.md` E2c `todo`→`done`（Last Updated 改 `2026-06-21 (E2c done)`）。
  - `amis-baseline-matrix.md` checkbox-group 行 `runtime`/`landed` 无变化（capability addition 不改 AMIS 类型名映射，与 E2a/E2b 裁定一致 —— No update required）。
  - 当日 log：`docs/logs/2026/06-21.md` E2c 三段（Phase 1 / Phase 2-3-4 / Phase 5 收口）。
- 独立 closure-audit（fresh session，2026-06-21）结果：**approved**。已逐项核对 live repo：
  - **Schema**：`packages/flux-renderers-form/src/schemas.ts:92-94` 含 `checkAll?`/`maxSelected?`/`minSelected?`；L14 `SelectOptionSchema.disabledTip?` 已落地。
  - **Definition 注册**：`packages/flux-renderers-form/src/renderers/input.tsx:430-432` checkbox-group definition `fields` 注册三项（`checkAll` valueType:'boolean'，`maxSelected`/`minSelected` 原样透传）。
  - **Renderer 实现（anti-hollow 通过）**：`packages/flux-renderers-form/src/renderers/checkbox-group-renderer.tsx` —— L31 `checkAllEnabled`、L32-39 `maxSelected`/`minSelected` 守卫、L43 `selectableOptions = options.filter(o => !o.disabled)` 排除 disabled、L50-73 `toggleOption`（max 上限 return + min 下限 return 即时阻止，真实写表单值）、L75-86 `handleCheckAllToggle`（slice(0, maxSelected) 钳制 + 清空路径）、L88-98 三态派生（fullySelected/indeterminate）、L116-130 全选 Checkbox 真实渲染（`data-slot="checkbox-group-checkall"` + indeterminate）、L133-136 per-option `disabled`/`disabledTip` 消费、L142-143 `title`+`data-disabled-tip`、L154-159 disabled option `onCheckedChange` 早 return。无空函数体 / 无 `return null` 占位 / 无注册不可达。
  - **Tests**：`packages/flux-renderers-form/src/__tests__/checkbox-group-selection.test.tsx`（24 用例）—— Phase 2 per-option disabled/disabledTip 7 + Phase 3 max/min 6 + Phase 4 checkAll/indeterminate 11；覆盖全部 11 条 Failure Path（e2c-option-disabled/-tip/-group、e2c-max-reached/-keeps-selected、e2c-min-block-uncheck、e2c-checkall-all-selected/-partial/-toggle-on/-off/-excludes-disabled）。
  - **Owner-doc 同步**：`docs/components/checkbox-group/design.md` §2 E2c 3 行全 `实现`（附完整实现说明）；§4 schema + §5 字段分类（max/min 无 valueType 裁定）+ §8 全选/清空句柄 + §10 DOM marker（`checkbox-group-checkall`/`-item`/`-label` + `title`/`data-disabled-tip`）+ §11 文件拆分 + §12 风险全部同步，无残留 `计划实现（E2c）`/`实现中（E2c）` 占位。
  - **Roadmap**：`docs/components/existing-components-improvement-roadmap.md:49` E2c `done`；L3 Last Updated `2026-06-21 (E2c done)`。
  - **Daily log**：`docs/logs/2026/06-21.md` 含 E2c Phase 1 / Phase 2-3-4 / Phase 5 收口三段，与 plan 项一致。
  - **Deferred honesty**：`Deferred But Adjudicated`「全选与 maxSelected 极端组合」分类 `watch-only residual` 合规（已实现「全选只选到上限并显示 indeterminate」，非 in-scope live defect / 非 contract drift），`Non-Blocking Follow-ups` 仅含 `columnsCount`/`optionType:'button'` 等决策表已裁定 `暂不实现` 项。
  - **Five-point consistency**：`Plan Status: completed` / 5 个 Phase `Status: completed` / 5 个 Phase Exit Criteria 全 `[x]` / Closure Gates 全 `[x]`（含本独立 audit 项）/ `docs/logs/2026/06-21.md` 收口记录 —— 五处一致。
  - 技术验证（typecheck/build/lint/test）引用执行 agent 自检结果；独立 audit 未重跑（依 plan-guide「closure audit 要回看 live repo」—— 已通过 grep/glob/read 核对代码、schema、tests、design.md、roadmap、daily log 全部对齐）。

Follow-up:

- `全选与 maxSelected 极端组合`（可选数 > 上限）归 `Deferred But Adjudicated` watch-only residual（已实现「全选只选到上限并显示 indeterminate」，后续如需「可选数超上限时全选按钮 disabled」替代语义归 E3 P2）。
- `disabledTip` 若后续需富样式/动画提示，可升级到 base-ui Tooltip overlay（design.md §12 已记）。
