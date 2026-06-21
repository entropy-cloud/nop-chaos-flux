# E2e Button 能力补齐

> Plan Status: completed
> Package: components-improvement
> Work Item: E2e button 能力补齐
> Last Reviewed: 2026-06-21
> Source: `docs/components/existing-components-improvement-roadmap.md`（E2e 行）、`docs/components/button/design.md` §2 Flux 决策表（L22-26 标 `计划实现（E2e）`）、live-repo audit（`ButtonRenderer` + `ButtonSchema` + `@nop-chaos/ui` Button/Tooltip/Spinner + `resolveLucideIcon`）
> Related: X3 naming-conventions（done）、X5 button Flux 决策表（done）、E2a（已建立 `resolveLucideIcon` + icon renderer 使用先例 `icon.tsx`）

## Purpose

把 roadmap 工作项 **E2e button 能力补齐** 从 `todo` 推进到 `done`：为 `button` 补齐 `icon`/`rightIcon`（图标）、`loading`（加载态）、`tooltip`/`disabledTip`（悬浮提示）、`block`（全宽）、`active`（toggle 态）五组能力。当前 `ButtonRenderer`（`packages/flux-renderers-basic/src/button.tsx`，28 行）仅消费 `label`/`variant`/`size`/`disabled`/`onClick`，design.md §2 已为全部五组能力裁定 Flux 决策（命名对齐 shadcn/ui Button），但实现完全缺失。

## Current Baseline

经 live-repo audit（2026-06-21）：

- **Schema**：`ButtonSchema`（`packages/flux-renderers-basic/src/schemas.ts:143-149`）仅含 `label`/`variant`/`size`/`disabled`。无 `icon`/`rightIcon`/`loading`/`tooltip`/`disabledTip`/`block`/`active`。
- **Renderer**：`ButtonRenderer`（`packages/flux-renderers-basic/src/button.tsx:10-28`）渲染 `<Button variant size className data-testid data-cid onClick disabled>`，children 仅 `label ? String(label) : null`。无图标插槽、无 loading Spinner、无 Tooltip 包裹、无全宽 class、无 active 态。
- **Definition**：button renderer definition（`packages/flux-renderers-basic/src/basic-renderer-definitions.ts:134-212`）`propContracts` 仅声明 `label`/`variant`/`size`/`disabled`；`fields` 仅 `[{ key: 'disabled', kind: 'meta' }, { key: 'onClick', kind: 'event' }]`（L207-211）。`label`/`variant`/`size` 有 propContracts 但不在 `fields` 数组——它们作为 raw props 透传（existing oddity，本 plan 不改）。
- **UI 原语**：`@nop-chaos/ui` `Button`（`packages/ui/src/components/ui/button.tsx`，基于 `@base-ui/react/button`）**无** 内置 `loading`/`icon`/`active` prop，但 size variants 的 CSS 已含 `[&_svg]:size-4` + `has-data-[icon=inline-start|inline-end]` padding 调整（L7,24-27），支持 icon 子元素 + `data-icon` attribute 约定（同 `badge.tsx`/`pagination.tsx`/`toggle.tsx`）。`Tooltip`/`TooltipTrigger`/`TooltipContent`/`TooltipProvider` 可用（`packages/ui/src/components/ui/tooltip.tsx`）。`Spinner` 可用（`packages/ui/src/components/ui/spinner.tsx`，渲染 `<Loader2Icon className="size-4 animate-spin" />`）。
- **Icon 解析**：`resolveLucideIcon(name)` 已从 `@nop-chaos/ui` 导出（`packages/ui/src/lib/icon-utils.ts`），`IconRenderer`（`packages/flux-renderers-basic/src/icon.tsx:24`）已建立使用先例（`resolveLucideIcon(icon)` → lucide 组件 + `data-icon` + `size=16` + `strokeWidth=1.8` + `aria-hidden`）。
- **Finite-prop-contracts guard**：`scripts/check-finite-prop-contracts.mjs:15-16` 当前覆盖 `button.variant` + `button.size`（finite select unions）。新增的 `icon`/`loading`/`tooltip`/`disabledTip`/`block`/`active` 不是 finite-union select（string/boolean），无需加入此 guard。
- **测试**：无 dedicated `button.test.tsx`。现有 button 覆盖散落在 `event-handler-contract.test.tsx`（onClick 触发 action）、`widget-markers-contract.test.tsx`（data-slot + testid 传递）、`basic-renderer-contracts.test.ts`（rendererClass + propContracts + eventContracts 静态断言）。无 icon/loading/tooltip/block/active 覆盖。
- **design.md**：`docs/components/button/design.md` §2 决策表 L22-26 已标 `计划实现（E2e）`（icon+rightIcon / loading+loadingOn / tooltip+disabledTip / block / active）。§7（L62-68）已裁定 `loading` 不在 button 内部静默自推断异步 action 态，而是由 owner 显式控制（local/controlled boolean 或 expression）。§10 已裁定 root 保留 `nop-button` marker，复用 ui Button variant/size，不引入 `btnLevel`/`buttonMode` 等平行命名。

## Goals

- `ButtonSchema` 新增 7 个字段：`icon?: string`、`rightIcon?: string`、`loading?: boolean | string`、`tooltip?: string`、`disabledTip?: string`、`block?: boolean`、`active?: boolean | string`。
- `ButtonRenderer` 消费全部新字段：
  - `icon`/`rightIcon` → 经 `resolveLucideIcon` 解析为 lucide 组件，以 `data-icon="inline-start"`/`"inline-end"` 渲染于 label 左右（复用 ui Button CSS 已有的 `[&_svg]` + `has-data-[icon]` padding 约定）。
  - `loading` → truthy 时渲染 `<Spinner>` 替换 left icon 位置，同时强制 `disabled`（`disabled || loading`）。
  - `tooltip`/`disabledTip` → `tooltip` 有值时用 `<Tooltip><TooltipTrigger render={<Button/>}><TooltipContent>{tooltip}</TooltipContent>` 包裹；`disabled` 且 `disabledTip` 有值时显示 `disabledTip` 替代 `tooltip`。
  - `block` → truthy 时 root className 追加 `w-full`。
  - `active` → truthy 时 root 追加 `data-active="true"` + `aria-pressed={true}`，视觉上应用 `data-[active]:` 样式。
- button renderer definition 的 `propContracts` + `fields` 补齐新字段声明。
- design.md §2 决策表 5 行 E2e 标记从 `计划实现（E2e）` 翻转为 `实现`；§4/§5/§7/§10 同步字段分类 + loading 状态归属 + DOM marker 约定。
- focused 单测覆盖全部新字段（含 icon 解析失败兜底、loading 强制 disabled、tooltip disabled 态切换、block class、active aria-pressed）。

## Non-Goals

- 不实现 `loadingOn` 独立字段——`loading?: boolean | string` 已通过 expression-string 子sume 条件加载态（`loading` 接受 expression 时由 runtime 求值为 boolean，等价于 amis `loadingOn`）。design.md §2 注明此裁定。
- 不实现 `href`/`target`（link 导航）——design.md §4 提及但不在 E2e 决策表行内，归后续增强。
- 不实现 amis `hotKey`/`countDown`/`isMenuItem`/`actionType`/`requireSelected`/`feedback`/`messages`/`payload`/`onMouseEnter`/`onMouseLeave`——design.md §2 已全部标 `不采纳`，本 plan 不重新评估。
- 不实现 `confirmText` 对话框确认语义——design.md §2 BY-DESIGN note 已裁定走 action 层。
- 不实现 `body` region（自定义内容）——design.md §6 已裁定优先升级 `label` 为 value-or-region。
- 不改动 `label`/`variant`/`size` 的 fields 注册方式（existing oddity，不在 E2e scope）。

## Scope

### In Scope

- `ButtonSchema` 新增 7 字段（`icon`/`rightIcon`/`loading`/`tooltip`/`disabledTip`/`block`/`active`）
- `ButtonRenderer` 实现全部 5 组能力
- button renderer definition `propContracts` + `fields` 补齐
- design.md §2/§4/§5/§7/§10 同步
- focused 单测

### Out Of Scope

- `href`/`target` link 模式（后续增强）
- `body` region 自定义内容（design.md §6 裁定走 label 升级）
- `loadingOn` 独立字段（由 expression-string `loading` 子sume）
- X1 doAction `component:focus`/`component:open` 句柄（E1a Non-Blocking Follow-ups 已路由到 X1）
- ui Button 组件本身的改造（不新增 `loading`/`icon`/`active` prop——renderer 层组合 Spinner + icon 子元素 + data 属性）

## Failure Paths

| 场景              | 触发                                                             | 行为                                                          | 可重试 | 用户可见表现                       |
| ----------------- | ---------------------------------------------------------------- | ------------------------------------------------------------- | ------ | ---------------------------------- |
| icon-name-invalid | `icon: 'nonExistentIcon'`                                        | `resolveLucideIcon` 返回 `null` → 不渲染 icon，label 正常显示 | 否     | button 无左图标，其余正常          |
| loading-active    | `loading: true` 且 `onClick` 触发                                | button `disabled` → `onClick` 不触发                          | 否     | button 显示 Spinner + 灰色不可点击 |
| tooltip-disabled  | `disabled: true` + `tooltip: '提示'` + `disabledTip: '禁用提示'` | 显示 `disabledTip`（`'禁用提示'`），不显示 `tooltip`          | 否     | 悬浮显示"禁用提示"                 |

## Test Strategy

档位选择：`建议有测`

本档选择：`建议有测`。button 是 P1 交互控件，E2e 为能力补齐（非契约漂移修复）。icon/loading/tooltip/block/active 均为新增 UI 表现层能力，focused 单测可充分验证（DOM 属性、class、disabled 联动），无需 Proof-before-Fix 强制顺序。

## Execution Plan

### Phase 1 - Schema + Definition 契约

Status: completed
Targets: `packages/flux-renderers-basic/src/schemas.ts`、`packages/flux-renderers-basic/src/basic-renderer-definitions.ts`

- Item Types: `Fix | Decision`

- [x] `ButtonSchema`（`schemas.ts:143-149`）新增：`icon?: string`、`rightIcon?: string`、`loading?: boolean | string`、`tooltip?: string`、`disabledTip?: string`、`block?: boolean`、`active?: boolean | string`
- [x] **Decision**：`loading` 用 `boolean | string`（expression-gated，子sume `loadingOn`），不新增 `loadingOn` 独立字段——裁定理由写入 design.md §2 + §7
- [x] button renderer definition（`basic-renderer-definitions.ts:134-212`）`propContracts` 补齐 7 字段（`icon`/`rightIcon`/`tooltip`/`disabledTip` shape `'string'`；`loading`/`block`/`active` shape `'boolean'`）
- [x] definition `fields` 数组补齐：`{ key: 'loading', kind: 'prop', valueType: 'boolean' }`（**裁定修正**：原 plan 写 `kind: 'meta'`，但 `META_FIELDS` 是 8-key 闭集（`id`/`className`/`frameClassName`/`when`/`visible`/`hidden`/`disabled`/`testid`），非闭集内 key 用 `kind: 'meta'` 会被 `node-compiler.ts:271` 静默丢弃；改用 `kind: 'prop', valueType: 'boolean'` 走正常 prop 编译通道 + 布尔规范化）、`{ key: 'active', kind: 'prop', valueType: 'boolean' }`、`{ key: 'block', kind: 'prop', valueType: 'boolean' }`、`{ key: 'icon', kind: 'prop' }`、`{ key: 'rightIcon', kind: 'prop' }`、`{ key: 'tooltip', kind: 'prop' }`、`{ key: 'disabledTip', kind: 'prop' }`

Exit Criteria:

- [x] `pnpm typecheck` 通过（`ButtonSchema` 新字段类型正确）
- [x] `scripts/check-finite-prop-contracts.mjs` 仍通过（新字段不是 finite-union，无需加入 curated list）
- [x] No owner-doc update required（design.md 更新在 Phase 4）

### Phase 2 - Renderer 实现

Status: completed
Targets: `packages/flux-renderers-basic/src/button.tsx`

- Item Types: `Fix`

- [x] `ButtonRenderer` 增加 `resolveLucideIcon` import（from `@nop-chaos/ui`）、`Spinner` import、`Tooltip`/`TooltipTrigger`/`TooltipContent` import
- [x] icon/rightIcon 渲染：解析 `props.props.icon`/`props.props.rightIcon`，lucide 组件以 `<svg data-icon="inline-start"|"inline-end" aria-hidden size={16} strokeWidth={1.8}>` 渲染于 label 左右；解析失败（`null`）则不渲染
- [x] loading 渲染：`props.props.loading` truthy 时，left icon 位置渲染 `<Spinner />` 替代 `icon`，且 button `disabled = disabled || loading`
- [x] block 渲染：`props.props.block` truthy 时，className 追加 `'w-full'`
- [x] active 渲染：`props.props.active` truthy 时，Button 追加 `data-active="true"` + `aria-pressed={true}`
- [x] tooltip 包裹：`props.props.tooltip` 或 `props.props.disabledTip` 有值时，用 `<TooltipProvider><Tooltip><TooltipTrigger render={<Button .../>}><TooltipContent>{disabled ? (disabledTip ?? tooltip) : tooltip}</TooltipContent></Tooltip></TooltipProvider>` 包裹；两者均无值时不包裹（保持 bare Button）

Exit Criteria:

- [x] `pnpm typecheck` 通过
- [x] `pnpm build` 通过
- [x] playground 中 button schema 含 `icon: 'check'`/`loading: true`/`tooltip: '提示'`/`block: true`/`active: true` 可正确渲染（手动验证）
- [x] No owner-doc update required（design.md 更新在 Phase 4）

### Phase 3 - Focused Tests

Status: completed
Targets: `packages/flux-renderers-basic/src/__tests__/button-enhancements.test.tsx`（新建）

- Item Types: `Proof`

- [x] icon 渲染：`icon: 'check'` → DOM 含 `data-icon="inline-start"` svg 元素；`rightIcon: 'x'` → 含 `data-icon="inline-end"`
- [x] icon 解析失败兜底：`icon: 'nonExistent'` → 不渲染 svg，label 正常显示
- [x] loading 态：`loading: true` → DOM 含 Spinner（`role="status"`），button `disabled` 属性为 true，`onClick` 不触发
- [x] loading + 显式 disabled 共存：`loading: true, disabled: false` → 仍 disabled
- [x] tooltip 渲染：`tooltip: '提示文字'` → Tooltip content 含该文字
- [x] disabledTip 切换：`disabled: true, tooltip: '正常提示', disabledTip: '禁用提示'` → Tooltip content 显示 `'禁用提示'`
- [x] block 全宽：`block: true` → root className 含 `w-full`
- [x] active 态：`active: true` → root 含 `data-active="true"` + `aria-pressed="true"`
- [x] 回归：`label`/`variant`/`size`/`disabled`/`onClick` 原有行为不受影响

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-renderers-basic test` 全过（含新增用例）
- [x] 新测试覆盖全部 7 个新字段
- [x] No owner-doc update required（design.md 更新在 Phase 4）

### Phase 4 - Owner-Doc Sync + Roadmap

Status: completed
Targets: `docs/components/button/design.md`、`docs/components/existing-components-improvement-roadmap.md`、`docs/logs/2026/06-21.md`、`docs/components/button/example.json`

- Item Types: `Follow-up`

- [x] `docs/components/button/design.md` §2 决策表 5 行 E2e 标记从 `计划实现（E2e）` 翻转为 `实现`
- [x] design.md §2 `loading` 行注明 `loadingOn` 由 expression-string `loading` 子sume（不新增独立字段）
- [x] design.md §4 schema 设计补齐新字段列表；§5 字段分类补 `icon`/`rightIcon`/`tooltip`/`disabledTip`（value）、`loading`/`block`/`active`（value/meta）
- [x] design.md §7 运行期状态归属补 loading 状态归属说明（owner 显式控制，非 action 自推断）
- [x] design.md §10 样式与 DOM marker 约定补 `data-active` + `data-icon` 约定
- [x] `docs/components/button/example.json` 补充含 icon/tooltip/block 的示例
- [x] `docs/components/existing-components-improvement-roadmap.md` E2e `todo`→`done`
- [x] `docs/components/amis-baseline-matrix.md` retained 决策无变化（No update required — 全部新字段为新增能力，无 retained 漂移）
- [x] `docs/logs/2026/06-21.md` 新增 E2e 收口条目

Exit Criteria:

- [x] design.md §2 无残留 `计划实现（E2e）` 行
- [x] roadmap E2e 标为 `done`
- [x] daily log 含 E2e 条目
- [x] `docs/architecture/` 无需更新（No architecture doc update required — button 行为变更不涉及架构边界）

## Draft Review Record

- Reviewer / Agent: <<待 REVIEW_PLANS 填写>>
- Verdict: `<<pass | pass-with-minors | revised | degraded>>`
- Rounds: <<≤2>>
- Findings addressed: <<待填>>

## Closure Gates

- [x] `ButtonSchema` 7 新字段全部定义且 propContracts/fields 接线
- [x] `ButtonRenderer` 正确消费全部 5 组能力（icon/rightIcon/loading/tooltip+disabledTip/block/active）
- [x] icon 解析失败兜底不崩溃
- [x] loading 强制 disabled 联动正确
- [x] tooltip/disabledTip disabled 态切换正确
- [x] focused 单测覆盖全部新字段
- [x] design.md §2/§4/§5/§7/§10 同步到 live baseline
- [x] 不存在被静默降级到 deferred 的 in-scope live defect 或 contract drift
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### `href`/`target` link 导航模式

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: design.md §4 提及但不在 E2e 决策表行内。link 导航与 action 触发是不同交互语义（design.md §12 已注明需清晰区分导航 action 与 click action）。当前 `variant: 'link'` 已提供 link 视觉，真正的 `href` 导航走 action 层。
- Successor Required: no
- Successor Path: 若后续需要原生 `<a>` 渲染（非 action 导航），独立评估。

## Non-Blocking Follow-ups

- `component:focus`/`component:open` 句柄归 X1（doAction 命令族统一）——E1a Non-Blocking Follow-ups 已路由。**已由 X1 plan 收口**（`docs/plans/2026-06-21-2146-1-x1-doaction-command-family-unification-plan.md` Phase 2）：button renderer definition 已发布 `componentCapabilityContracts: ['focus']`，通过 `useInputComponentHandle` 注册 handle（`component:open` 不属于 button 范围，已由 select / dialog / drawer 落地）。
- `loadingOn` 若后续需要与 `loading` 并存的独立 expression gate（当前由 expression-string `loading` 子sume），归后续增强评估。

## Closure

Status Note: 全 4 Phase 执行完成，Plan Status 置 `completed`。技术验证项（typecheck/build/lint/test/design sync/roadmap/no-silent-defect）全 `[x]`；`pnpm typecheck` = 49/49、`pnpm build` = 26/26、`pnpm lint` = 26/26、`pnpm test` = 49/49。Closure Gates 全部 `[x]` —— 独立 closure-audit 已由 fresh-session 子 agent 完成（见 Closure Audit Evidence）。

Closure Audit Evidence:

- Auditor / Agent: independent closure-audit sub-agent (fresh session, distinct from executor task session)
- Evidence:
  - **Schema**：`packages/flux-renderers-basic/src/schemas.ts:143-156` 确认 7 个新字段全部定义（`icon`/`rightIcon`/`loading`/`tooltip`/`disabledTip`/`block`/`active`）。
  - **Renderer**：`packages/flux-renderers-basic/src/button.tsx:36-93` 确认消费全部 5 组能力 —— `resolveLucideIconStrict` 解析 icon/rightIcon（`data-icon="inline-start"|"inline-end"`）；`loading` truthy 渲染 `<Spinner>` 并强制 `disabled={disabled || loading}`；`block` 追加 `w-full`；`active` 写入 `data-active="true"` + `aria-pressed`；tooltip 用 `<Tooltip><TooltipTrigger render={button}/><TooltipContent>` 包裹，`disabled` 态切换 disabledTip。无空壳、无 `return null` 占位、无吞异常。
  - **Definition**：`packages/flux-renderers-basic/src/basic-renderer-definitions.ts:142-261` 确认 propContracts 7 字段 shape/displayName/description/editorType 完整，fields 7 项 `kind: 'prop'`（boolean 三项带 `valueType: 'boolean'`）。
  - **Focused tests**：`packages/flux-renderers-basic/src/__tests__/button-enhancements.test.tsx` 16 用例覆盖 icon 左/右/无效名兜底、loading Spinner+强制 disabled+onClick 不触发、tooltip/disabledTip 切换、block w-full、active aria-pressed、回归。
  - **design.md**：grep `计划实现（E2e）` 在 `docs/components/button/design.md` 无匹配（§2 决策表 5 行已翻 `实现`）。
  - **Roadmap**：`docs/components/existing-components-improvement-roadmap.md:51` E2e = `done`；L3 Last Updated = `2026-06-21 (E2e done)`。
  - **Daily log**：`docs/logs/2026/06-21.md` 含 E2e 收口条目（全 4 Phase + 21 files / 260 tests 全过）。
  - **Deferred honesty**：仅 `href`/`target`（out-of-scope improvement，design.md §12 已留 successor path）与 `loadingOn`（Non-Blocking Follow-up，由 expression-string `loading` subsume）—— 均非 in-scope live defect。
  - **五点一致性**：Plan Status `completed` = 4 个 Phase Status `completed` = 所有 Exit Criteria `[x]` = Closure Gates 全 `[x]` = daily log 收口条目，彼此一致。

Follow-up:

- 无剩余 plan-owned 工作（independent closure audit 已通过）。
- `href`/`target` link 导航归后续增强（Deferred But Adjudicated）。
- `loadingOn` 独立 expression gate 归后续评估（Non-Blocking Follow-ups）。
