# E3 Input Autocomplete (Data-Source Async Suggestions)

> Plan Status: completed
> Last Reviewed: 2026-06-22
> Source: `docs/components/existing-components-improvement-roadmap.md`（E2a 行 `autoComplete` 决策表条目）、`docs/components/input-text/design.md` §2/§4、`docs/components/data-source/design.md` §4/§7/§8
> Mission: components-improvement
> Work Item: E2a `autoComplete` deferred successor（异步建议下拉）
> Related: `docs/plans/2026-06-21-0331-e2a-text-input-enhancement-plan.md`（deferred 本 successor）、`docs/plans/2026-06-21-1345-1-x4-data-source-request-layer-enhancement-plan.md`（X4 已落地，本 plan 复用其请求门控契约）、`docs/plans/2026-06-21-0255-x5-flux-decision-tables-plan.md`（input-text 决策表已含 `autoComplete` 行）

## Purpose

把 E2a 显式 Deferred 到 successor 的 `autoComplete`（异步建议下拉）能力收口：为 `input-text`/`input-email`/`input-password` 文本输入族增加「按用户输入触发远程建议、选中后回填字段值」的契约，**严格走 data-source + action composition 模式**，不在 renderer 内开 `api`/`initFetch` 短路径（X3 §1/§3、roadmap 设计原则 4）。

落地后，作者可以通过声明一个绑定了 `sendOn`（输入关键字）的 data-source + 受控建议列表渲染（每项支持 region 模板）+ 选中 action（写回字段值）实现类 GitHub Issue 标签、类 Google Search 自动补全等场景。

## Current Baseline

- **E2a 已 `done`**：`prefix`/`suffix`/`clearable`/`trimContents`/`showCounter`（`packages/flux-renderers-form/src/schemas.ts:60-64`）+ `nativeAutoComplete`（`schemas.ts:65`）+ `revealPassword`（`schemas.ts:66`）全部 live；三个 renderer definition（input-text/email/password）共享 `inputEnhancementFieldRules`（`renderers/input.tsx:87-101`，被 L405-435 三个 definition 消费）。
- **E2a `autoComplete` 显式 Deferred**：`docs/plans/2026-06-21-0331-e2a-...-plan.md` Deferred But Adjudicated 节裁定 `autoComplete`（data-source 异步建议下拉）= `optimization candidate`，`Successor Required: yes`，Successor Path「后续 autocomplete-suggestions plan（或随 data-source X4 增强一并收口）」。本 plan 即该 successor。
- **X4 已 `done`**：data-source 已具备 `sendOn`/`initFetch` gate + `onSuccess`/`onError` lifecycle event + `component:refresh`/`component:cancel` capability（`docs/components/data-source/design.md` §4/§7/§8、`packages/flux-runtime/src/data-source-controller.ts`）。`sendOn` 是 universal gate：任何请求（含手动 refresh）发出前都必须通过。
- **input-text 决策表已含 autoComplete 行**：`docs/components/input-text/design.md` §2 L30 `autoComplete 异步建议下拉 | 计划实现：走 data-source | amis 组件级 api/initFetch | 请求下沉 data-source + action，不在组件开 api（X3 §1/§3）`。本 plan 需要把该行从「计划实现」翻转为「实现」+ 写明所选 composition 模式。
- **input-text renderer 已具备 InputGroup + region 编译通道**：`createInputRenderer` 工厂 + `InputGroupFieldControl` 包装，为本 plan 提供挂载点（建议下拉浮层挂在 InputGroup 外层或 InputGroupInput 上方）。
- **`@nop-chaos/ui` Popover 已可用**（`packages/ui/src/components/ui/popover.tsx`、`packages/ui/src/index.ts:36`），可作为建议浮层底层（非强制，可在 design.md 决策时与 Combobox-like 自渲染比对）。
- **select 已有 option-template region 先例**（E1a + E3 select option-template region plan）：受控参数化 region + per-option scope 绑定（`renderComboboxItem` + `props.regions.optionTemplate`），本 plan 可参考其 region 绑定模式（`params: ['option', 'index']`）。
- **当前缺**：input-text 缺 `suggest` 相关字段（无 `suggestSource`/`suggestAction`/`suggestDebounce`/`suggestTemplate`）；缺建议浮层渲染逻辑；缺 focused 测试与 playground/e2e 示例。
- **owner-doc 漂移**：input-text/design.md §2 L30 标「计划实现：走 data-source」与 live baseline（未实现）一致，不算 drift；但本 plan 实施后必须翻转。

## Goals

- **能力**：用户在 input-text/email/password 中键入文本，按可配置 debounce 触发 data-source（携带关键字作为参数），data-source `onSuccess` 把建议列表写入 scope，renderer 读取建议列表渲染浮层；用户选中后通过 action 把选中项写回字段值。
- **架构纪律**：renderer 不开 `api`/`initFetch`/`interval` 短路径；请求生命周期全归 data-source；renderer 只负责（a）触发（通过 `component:refresh` 或 action dispatch）+（b）渲染建议浮层 +（c）转发选中事件。
- **可配置性**：`suggestDebounce`（默认 ~300ms）、`suggestTrigger`（`'input'` 默认 / `'focus'` / `'manual'`）、`suggestMinInputLength`（默认 1，避免空输入触发）、`suggestTemplate`（per-suggestion region 模板）。
- **失败路径稳定**：data-source 请求失败 → 浮层显示空态或简短错误提示（不阻塞输入）；请求慢于 debounce → 后请求 abort/忽略前请求（依赖 data-source controller 现有 abort 语义）。
- **owner-doc 同步**：`input-text/design.md` §2 翻转 autoComplete 行 + 写明 composition 模式；§4 新增 suggest 字段定义；§5 字段分类；§6 region 约定（suggestTemplate）；§8 事件/句柄（如新增 `component:refresh` 转发）；§10 DOM marker；§12 风险（与 `nativeAutoComplete` 共存、abort 时序、空态）；`input-email/design.md`、`input-password/design.md` 文本输入族共享声明；`data-source/design.md` §9 接入点说明 input-suggest 消费模式（如本 plan 引入新约定）。
- **Playground + e2e**：在 `apps/playground/src/pages/` 增加 input-suggest 示例（mock data-source 模拟远程关键字过滤），在 `tests/e2e/` 增加覆盖键入 → 浮层出现 → 选中 → 写回的 e2e 用例。

## Non-Goals

- **select/combobox 异步搜索**：E1a select 已有 `searchable`，其异步建议属 select 工作项（不在本 plan scope）。
- **multi-value tags input（多值标签输入 + 异步建议）**：本 plan 只覆盖单值文本输入。multi-value tags 输入是独立组件（roadmap 主线未列）。
- **本地点过滤建议**（用 `options` 数组在 renderer 内 filter）：不在本 plan；本地过滤属静态 options 范式，应由 select 或字段 metadata 承担。
- **WebSocket / SSE 实时建议流**：归 X4 deferred WebSocket 后续独立 plan（roadmap 明确 ws 低优先）。
- **`nativeAutoComplete` HTML 属性扩展**：E2a 已落地，本 plan 不改其契约（共存即可，两者正交）。
- **input-mask 输入掩码**：input-text/design.md §2 已标 `暂不实现`，不属本 plan。
- **跨字段联动建议**（如根据其他字段值过滤建议）：data-source `sendOn` 表达式已支持，但本 plan 不专项验证；归 follow-up。

## Scope

### In Scope

- `packages/flux-renderers-form/src/schemas.ts`：`InputSchema` 新增 suggest 相关字段（命名待 Phase 1 裁定，候选：`suggestSource?: string` / `suggestAction?: ActionSchema` / `suggestDebounce?: number` / `suggestTrigger?: 'input' | 'focus' | 'manual'` / `suggestMinInputLength?: number` / `suggestTemplate?: BaseSchema[]` / `suggestEmpty?: BaseSchema | string`）。
- `packages/flux-renderers-form/src/renderers/input.tsx`：
  - 字段注册：`fields` 加 suggest 相关 entries（`kind: 'prop'`/`'region'`）。
  - 建议浮层渲染：基于 `@nop-chaos/ui` Popover（或自渲染绝对定位浮层，Phase 1 裁定）+ Combobox-like keyboard navigation（上下箭头/Enter/Esc）。
  - 触发逻辑：`useEffect` 监听 `inputValue` 变化 + debounce + `suggestMinInputLength` gate → 调用 `suggestAction`（dispatch action）或 `component:refresh` 目标 data-source。
  - 选中回填：点击/Enter 选中建议 → `handlers.onChange(suggestion.value)` + 关闭浮层。
- `packages/flux-renderers-data`/`packages/flux-runtime`：**预计无改动**（data-source 已具备 sendOn/initFetch/onSuccess/component:refresh）。如发现需要 data-source 层补能力（如新 source kind），Phase 1 裁定是否升级 X4 或本 plan 范围。
- `docs/components/input-text/design.md`：§2 决策表 autoComplete 行翻转 + composition 模式说明；§4 suggest 字段；§5 字段分类；§6 suggestTemplate region；§8 句柄/事件（如新增）；§10 DOM marker（`data-slot="input-suggest-*"`）；§12 风险。
- `docs/components/input-email/design.md`、`docs/components/input-password/design.md`：文本输入族共享 suggest 字段声明（小节引用 input-text 主表）。
- `docs/components/data-source/design.md` §9 接入点：补充「input-suggest 消费 data-source 的标准 composition 模式」一行（如果引入新约定；否则只引用既有 sendOn/initFetch 契约）。
- `docs/components/existing-components-improvement-roadmap.md`：E2a autoComplete 子项 ✅ done 注记（Phase Status 不变，E2a 已 done；本 plan 是其 deferred successor 的收口）。
- `docs/components/amis-baseline-matrix.md`：input-text autoComplete retained 决策同步。
- `docs/logs/2026/06-22.md` 或执行当日：收口条目。
- `apps/playground/src/pages/`：新增或扩展 input 示例页（mock data-source 模拟远程）。
- `tests/e2e/`：新增 input-suggest 用例（程序化断言：键入 → 浮层 → 选中 → 写回，不依赖截图诊断）。
- 新增 focused 单测：`packages/flux-renderers-form/src/__tests__/input-suggest.test.tsx`（覆盖 trigger 模式、debounce、minInputLength gate、选中回填、空态/错误态、disabled/readOnly 不触发、与 nativeAutoComplete 共存）。

### Out Of Scope

- 见 Non-Goals 全部条目。
- select/combobox 异步搜索、tags-input、WebSocket 实时建议、本地点过滤、input-mask、跨字段联动建议验证。

## Failure Paths

> Renderer 不开请求短路径，但建议浮层本身有用户可见失败路径。每条都需有 focused test 或可观测的 dev-warn/空态。

| 可测场景编号                   | 触发                                            | 行为                                                                                       | 可重试                 | 用户可见表现                                     |
| ------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------- | ------------------------------------------------ |
| `suggest-source-fetch-failed`  | data-source `onError` 触发（请求 4xx/5xx）      | 浮层显示空态或简短错误提示（不抛错；console.warn）                                         | 是（下次输入重新触发） | 浮层内显示「无建议」或错误文案；输入框值不受影响 |
| `suggest-source-slow-aborted`  | 新输入使前请求被 data-source controller abort   | 前请求结果被忽略；浮层等新请求结果                                                         | 是                     | 浮层保持上一次内容或 loading，新结果到达后刷新   |
| `suggest-input-too-short`      | 输入长度 < `suggestMinInputLength`（默认 1）    | 不触发 data-source；浮层关闭                                                               | 是                     | 浮层不显示                                       |
| `suggest-disabled-or-readonly` | 字段 `disabled` 或 `readOnly`                   | 不触发；浮层不显示                                                                         | 否                     | 字段保持禁用/只读视觉                            |
| `suggest-template-region-fail` | `suggestTemplate` region 编译抛错               | 浮层降级为默认 suggestion.label 文本；console.warn（参考 select option-template 失败路径） | 是                     | 浮层显示纯文本建议                               |
| `suggest-no-source-configured` | 声明了 `suggestDebounce` 但未配置 source/action | dev-warn，浮层不显示                                                                       | 否                     | 浮层不显示                                       |

## Test Strategy

档位选择：`必须自动化`

本档选择：**必须自动化**

理由：input-suggest 是表单输入契约（用户可见行为 + 字段值写回 + 与 form runtime 集成），覆盖核心表单输入回归路径。Failure paths 多（fetch fail / abort / 输入过短 / disabled / template fail / no-source），每条都需 focused 单测固定。Playground demo + e2e 覆盖端到端交互（键入 → 浮层 → 选中 → 写回）。

对应 Proof 项在 Fix/Implement 项之前：先写 focused test 描述预期行为，再实现。

## Execution Plan

### Phase 1 - Composition 模式裁定 + design.md 决策表翻转

Status: completed
Targets: `docs/components/input-text/design.md`、`docs/components/data-source/design.md`、`docs/components/input-email/design.md`、`docs/components/input-password/design.md`

- Item Types: `Decision | Fix`

- [x] **Decision**：裁定 composition 模式 —— 「input-suggest 如何触发 data-source」三选一裁定（live repo 证据：X4 已落地 `sendOn`/`initFetch`/`onSuccess`/`component:refresh`）：
  - **A**：input renderer 持有 data-source 引用（`suggestSource: <sourceName>`）+ 调用 `component:refresh` 触发刷新（最贴合 Flux component handle vocabulary，但要求 source 是命名 data-source renderer）。
  - **B**：input renderer 通过 `suggestAction: ActionSchema`（action graph）触发任意 action（最灵活，包括 dispatch 到 data-source 或调用其他 action）。
  - **C**：input renderer 内联 `suggestApi`（违反 X3 §1/§3 + roadmap 设计原则 4，**否决**）。
  - 裁定倾向 A 或 B，写明理由（参考 X4 component:refresh / sendOn gate 现有契约）。Phase 1 只裁定，实现归 Phase 3。
  - **裁定结果**：采用模式 A 变体 —— renderer 派发 `refreshSource { action: 'refreshSource', targetId: suggestSource }`（`RefreshSourceActionSchema.targetId` = source name）。理由：`refreshSource` 按 source **name** 寻址（= data-source 写入 scope 的 key），单标识符同时作 refresh target 与 scope 读路径，约定大于配置；`sendOn` universal gate 仍生效。模式 B 降级为后续按需；模式 C 否决（违反请求下沉）。
- [x] **Decision**：裁定浮层渲染底层 —— A) `@nop-chaos/ui` Popover（已可用）vs B) 自渲染绝对定位 div + keyboard nav。倾向 Popover（shadcn/ui 对齐，复用现有 a11y、portal、escape handling）。
  - **裁定结果**：A) `@nop-chaos/ui` Popover（`packages/ui/src/components/ui/popover.tsx`，base-ui Portal + a11y + escape handling）。
- [x] **Decision**：裁定字段命名 —— `suggestSource`/`suggestAction`/`suggestDebounce`/`suggestTrigger`/`suggestMinInputLength`/`suggestTemplate`/`suggestEmpty` 是否过 X3 命名基线（`docs/references/naming-conventions.md` §2/§3）。
  - **裁定结果**：`suggestSource`/`suggestDebounce`/`suggestTrigger`/`suggestMinInputLength`/`suggestTemplate`/`suggestEmpty` 过 X3 基线（`*Source` suffix 有 `searchSource`/`childrenSource` 先例；肯定式/语义命名；无 amis 化）。模式 A 不需要 `suggestAction`（移除）。
- [x] **Decision**：裁定 renderer 读取建议列表的 binding —— A) 隐式命名约定（data-source name = `suggestSource` → renderer 默认订阅 `<scope>.<suggestSource>.data`，少 1 个字段）vs B) 显式 path 字段（`suggestItemsPath?: string`，作者声明任意 scope path，更灵活但多 1 个字段）。倾向 A（约定大于配置），Phase 1 写明选择 + 默认 path 约定；Phase 2 schema 按裁定加字段（或保持隐式）。
  - **裁定结果**：A) 隐式约定 —— renderer 读 `scope[suggestSource]`（须为数组，项形状 `{label, value}`）。不引入 `suggestItemsPath`。
- [x] **Fix**：`docs/components/input-text/design.md` §2 L30 翻转为「实现（E3 successor）」+ composition 模式说明列；§4 加 suggest 字段定义；§5 字段分类；§6 suggestTemplate region（如采用受控 region，参考 select optionTemplate 模式）；§8 句柄/事件节（如新增）；§10 DOM marker（`data-slot="input-suggest-trigger"` / `"input-suggest-list"` / `"input-suggest-item"` / `"input-suggest-empty"`）；§12 风险（与 nativeAutoComplete 共存、abort 时序、空态、template fail 降级）。
- [x] **Fix**：`docs/components/data-source/design.md` §9 接入点节加 input-suggest consumption 模式条目（如裁定模式 A）。
- [x] **Fix**：`docs/components/input-email/design.md`、`docs/components/input-password/design.md` 共享 suggest 字段声明小节（引用 input-text §2 主表）。

Exit Criteria:

- [x] design.md 决策表 autoComplete 行已从「计划实现」翻转为「实现」+ composition 模式说明（含裁定选项 A/B/C 的取舍理由）
- [x] 字段命名经 X3 命名基线核对（无 amis 化命名）
- [x] input-text §4/§5/§6/§8/§10/§12 同步落地 suggest 字段/分类/region/事件/marker/风险
- [x] composition 模式（A 或 B）已裁定并写明 → Phase 2/3 可继续

### Phase 2 - Schema + renderer definition 字段声明 + focused 测试先写

Status: completed
Targets: `packages/flux-renderers-form/src/schemas.ts`、`packages/flux-renderers-form/src/renderers/input.tsx`、`packages/flux-renderers-form/src/__tests__/input-suggest.test.tsx`

- Item Types: `Proof | Fix`

- [x] **Proof**：先写 `input-suggest.test.tsx` failing test 描述（至少 8 用例覆盖：trigger='input' 默认 / trigger='focus' / trigger='manual' / debounce 触发 / minInputLength gate / disabled 不触发 / 选中回填 / template region fail 降级）。可先 skip/mark incomplete 但 case 草稿要 commit。
- [x] **Fix**：`schemas.ts` `InputSchema` 加 suggest 字段（按 Phase 1 裁定命名）。
- [x] **Fix**：`renderers/input.tsx` `fields` 加 suggest entries（`{ key: 'suggestSource'|'suggestAction', kind: 'prop' }` 等；`suggestTemplate: { kind: 'region', params: ['suggestion', 'index'] }` 如采用 region）。

Exit Criteria:

- [x] schema 字段已声明 + 类型推导通过（局部 typecheck）
- [x] fields entries 注册到 input-text/email/password 三个 renderer definition（在共享的 `inputEnhancementFieldRules` 数组（`input.tsx:87-101`）追加 suggest entries，三个 definition 自动覆盖）
- [x] focused test 草稿已 commit（failing/skip 可接受，Phase 3 转绿）

### Phase 3 - 浮层渲染 + 触发逻辑 + 选中回填实现

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/input.tsx`、`packages/flux-renderers-form/src/renderers/input-suggest.tsx`（新增，如抽出浮层组件）、`packages/flux-renderers-form/src/__tests__/input-suggest.test.tsx`

- Item Types: `Fix | Proof`

- [x] **Fix**：触发逻辑：`useEffect` 监听 `inputValue` + debounce（默认 300ms 或 `suggestDebounce`）+ `suggestMinInputLength` gate → dispatch `suggestAction`（模式 B）或调用目标 data-source 的 `component:refresh` capability（模式 A）。disabled/readOnly 不触发。
- [x] **Fix**：建议浮层渲染：基于 `@nop-chaos/ui` Popover（Phase 1 裁定）+ Combobox-like keyboard nav（ArrowDown/ArrowUp/Enter/Escape）。`data-slot="input-suggest-list"`/`"input-suggest-item"` marker。
- [x] **Fix**：`suggestTemplate` region 渲染（参考 select option-template `renderOptionTemplate` + try/catch + console.warn 降级 Failure Path `suggest-template-region-fail`）。无 `suggestTemplate` 时降级为 `suggestion.label` 文本。
- [x] **Fix**：选中回填：点击/Enter 选中建议 → `handlers.onChange(suggestion.value)` + 关闭浮层（如需要同时写其他字段，使用 form scope action，不在 renderer 内直接写）。
- [x] **Fix**：空态/错误态：data-source 请求失败或建议数组空 → 浮层显示 `suggestEmpty` 内容或默认「无建议」。
- [x] **Proof**：转绿 Phase 2 写的 failing tests，并补足 Failure Path 用例（`suggest-source-fetch-failed` / `suggest-source-slow-aborted` / `suggest-input-too-short` / `suggest-disabled-or-readonly` / `suggest-template-region-fail` / `suggest-no-source-configured`）。

Exit Criteria:

- [x] 实现路径上无空壳：触发 → 浮层 → 选中 → 写回完整 live
- [x] 所有 Phase 2/3 focused test 全绿（至少 14 用例覆盖 trigger/debounce/minInputLength/disabled/选中/template-fail/empty/no-source）
- [x] 6 个 Failure Path 都有对应 focused test 或可观测 dev-warn
- [x] 局部 typecheck 通过（`pnpm --filter @nop-chaos/flux-renderers-form typecheck`）

### Phase 4 - Playground demo + e2e + roadmap/log 同步 + closure 准备

Status: completed
Targets: `apps/playground/src/pages/`、`tests/e2e/`、`docs/components/existing-components-improvement-roadmap.md`、`docs/components/amis-baseline-matrix.md`、`docs/logs/2026/`

- Item Types: `Fix | Follow-up`

- [x] **Fix**：`apps/playground/src/pages/` 扩展现有 input 示例页或新增 input-suggest 页：mock data-source 模拟远程关键字过滤（如水果列表 / 国家列表），注册到 playground 路由。
- [x] **Fix**：`tests/e2e/` 新增 input-suggest 用例：程序化断言（`page.locator`/`page.evaluate`，不依赖截图）：键入字符 → `[data-slot="input-suggest-list"]` 可见 → 选中第一项 → input 值更新 → 浮层关闭。
- [x] **Fix**：`docs/components/existing-components-improvement-roadmap.md`：E2a autoComplete 子项 successor ✅ done 注记（Phase Status E2a 已 done；E3 autoComplete 子项 ✅ done）。
- [x] **Fix**：`docs/components/amis-baseline-matrix.md`：input-text autoComplete retained 决策同步。
- [x] **Fix**：`docs/logs/2026/06-22.md` 或执行当日：E2a autoComplete successor 收口条目。
- [x] **Follow-up**：E2a plan `Deferred But Adjudicated` autoComplete 条目注记「已由本 plan 收口」。

Exit Criteria:

- [x] playground demo 可交互（键入 → 浮层 → 选中 → 写回）
- [x] e2e 用例程序化断言通过
- [x] roadmap / amis-baseline-matrix / daily log 同步
- [x] E2a plan deferred 条目已注记收口

## Draft Review Record

- Reviewer / Agent: ses_113237874ffeYr13FrxBuZkPCg（fresh general sub-agent，未参与起草）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Minor（已 fix）：Current Baseline `schemas.ts:65` 引用不精确（仅 nativeAutoComplete）→ 已扩为 `schemas.ts:60-66` + `inputEnhancementFieldRules:87-101` + `input.tsx:405-435` 三 definition 共享。
  - Minor（已 fix）：Phase 2 Exit Criteria 「共享 `createInputRenderer` 工厂自动覆盖」措辞模糊 → 改为显式 `inputEnhancementFieldRules` 数组追加。
  - Minor（已 fix）：renderer→scope 读取建议列表的 binding 未列为 Decision 项 → Phase 1 新增第 5 项 Decision（隐式命名约定 vs 显式 `suggestItemsPath`），写明倾向。
  - Minor（已确认无需 fix）：X5 plan path 与 E2a plan Related 一致。
- Blocker / Major：零

## Closure Gates

> 关闭前必须全 `[x]`。

- [x] input-suggest 触发/浮层/选中/写回行为完整 live（接口存在 ≠ 行为完成，必须经 focused test + 抽查 live path）
- [x] 6 个 Failure Path 全部有 focused test 或可观测 dev-warn 覆盖
- [x] 字段命名经 X3 命名基线核对
- [x] renderer 未开 `api`/`initFetch`/`interval` 短路径（请求下沉纪律）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响 owner docs（input-text/design.md §2/§4/§5/§6/§8/§10/§12、input-email/design.md、input-password/design.md、data-source/design.md §9）已同步到 live baseline
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 本 plan 是 E2a deferred 的 successor，本身预计无新增 deferred；如执行中发现独立优化项需延后，按 guide Anti-Slacking Rule 处理。

## Non-Blocking Follow-ups

- **跨字段联动建议验证**：data-source `sendOn` 表达式已支持基于其他字段值过滤建议，本 plan 不专项验证，归后续按需。
- **multi-value tags input**：本 plan 只覆盖单值；如未来需要 tags 输入 + 异步建议（独立组件），独立 plan 评估。
- **建议缓存**：data-source controller 已有 cache（X4），本 plan 不在 renderer 层重复缓存。
- **键盘 a11y 细化**：Combobox-like keyboard nav 首版覆盖 ArrowUp/Down/Enter/Escape；Home/End/Type-ahead 等细化归 follow-up。

## Closure

Status Note: Plan 于 2026-06-22 执行完成并由独立子 agent（fresh session）closure-audit 通过。全 4 Phase 执行完毕，所有 Closure Gates（含独立审计项）通过。代码：`packages/flux-renderers-form/src/schemas.ts`（`InputSchema` 新增 6 suggest 字段）、`packages/flux-renderers-form/src/renderers/input.tsx`（`inputEnhancementFieldRules` 追加 6 suggest entries + `createInputRenderer` 集成 `useInputSuggest` hook）、`packages/flux-renderers-form/src/renderers/input-suggest.tsx`（新增 332 行 hook + Popover 浮层）。测试：`packages/flux-renderers-form/src/__tests__/input-suggest.test.tsx`（14 cases 全绿）。Playground：`apps/playground/src/pages/input-suggest-demo.tsx`（新增 demo 页，2 scenarios：plain suggest + suggestTemplate region）。E2e：`tests/e2e/input-suggest.spec.ts`（3 cases 全绿，程序化断言不依赖截图）。文档：`input-text/design.md` §2/§4/§5/§6/§8/§10/§12、`input-email/design.md`、`input-password/design.md`、`data-source/design.md` §9 同步。E2a plan Deferred autoComplete 条目注记收口。Roadmap E3 P2 加 input autocomplete ✅ done 子项。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit 子 agent（fresh session，未参与执行）。审计范围：非信任 `[x]` 标记，直接读 live repo 逐项核对。
- Evidence:
  - **Phase 1（design.md 决策表翻转）**：`input-text/design.md` §2 L30 autoComplete 行已翻转为「实现（E3 successor）」+ composition 模式 A（`suggestSource` + `refreshSource`）裁定说明（模式 B 降级、模式 C 否决）；§4 L59-66 6 suggest 字段定义 + 建议项形状约定；§5 L75 字段分类（5 prop + 1 region）；§6 L81 suggestTemplate region 约定 + fail 降级；§8 L97 触发链路（refreshSource → sendOn gate → onSuccess → scope）；§10 L110-113 DOM markers（`input-suggest-list`/`item`/`empty`）；§12 L124-129 6 个 Failure Path。`data-source/design.md` §9 L111-115 input-suggest consumption 模式。`input-email/design.md` L17/L37、`input-password/design.md` L18/L39 共享 suggest 字段声明引用。全部与 live 代码一致。
  - **Phase 2（schema + definition）**：`schemas.ts:73-78` `InputSchema` 含 6 suggest 字段（`suggestSource`/`suggestDebounce`/`suggestTrigger`/`suggestMinInputLength`/`suggestTemplate`/`suggestEmpty`）。`input.tsx:102-107` `inputEnhancementFieldRules` 追加 6 entries（`suggestTemplate: { kind: 'region', params: ['suggestion', 'index'] }`），L444/L454/L464 三个 definition（input-text/email/password）共享覆盖。`input-suggest.test.tsx` 14 cases 草稿存在。
  - **Phase 3（实现）**：`input-suggest.tsx`（332 行，非空壳）—— `useInputSuggest` hook：trigger 逻辑（`useEffect` 监听 inputValue + debounce（默认 300ms）+ `suggestMinInputLength` gate → `helpers.dispatch({ action: 'refreshSource', targetId })`）；`'input'`/`'focus'` 触发分支；`useScopeSelector` 读 `scope[suggestSource]`；Popover 受控 `open && (suggestions.length > 0 || attemptedFetch)`；keyboard nav ArrowDown/Up/Enter/Escape；`suggestTemplate` region `.render({ bindings: { suggestion, index } })` + try/catch + console.warn 降级；empty state（`suggestEmpty`/默认「No suggestions」）；disabled/interactive gate；no-source dev-warn；`data-slot="input-suggest-list/item/empty"` markers。`input.tsx` L264 `useInputSuggest` 集成 + L369/374/377 onFocus/onBlur/onKeyDown + L384/389 `suggest.wrap(element)`。**请求下沉纪律确认**：无 `api`/`initFetch`/`interval` 短路径，触发走 `refreshSource` action。
  - **Phase 4（playground + e2e + 同步）**：`input-suggest-demo.tsx`（mock fetcher 80ms 延迟水果列表，2 scenarios，route `/#/input-suggest`）。`input-suggest.spec.ts` 3 cases（typing→popover→select→writeback / suggestTemplate / Escape）。`existing-components-improvement-roadmap.md` L58 E3 P2 input autocomplete ✅ done。`amis-baseline-matrix.md` input-text 行 `landed` 状态 + 指向 design.md（autoComplete 为 amis property 级决策，归 input-text/design.md §2 决策表，非 matrix 组件类型级条目；matrix 结构只记录组件类型 retained/not-retained，autoComplete 决策的正确 owner doc 已同步）。`docs/logs/2026/06-22.md` 收口条目 L3-24。E2a plan Deferred autoComplete 条目注记收口。
  - **Anti-hollow 抽查**：实现路径触发→浮层→选中→写回完整 live，无 `return null`/空函数体/swallowed exception。region 渲染失败有 try/catch + console.warn + 降级。请求失败走 empty 文案不抛错。
  - **Deferred honesty**：Non-Goals / Out Of Scope（select 异步搜索、tags-input、WebSocket、本地过滤、input-mask、跨字段联动验证）均为明确 out-of-scope 或 follow-up，无 in-scope live defect 隐藏在 deferred。
  - **五点一致**：Plan Status `completed` / 4 Phase 全 `completed` / Exit Criteria 全 `[x]` / Closure Gates 全 `[x]`（含审计项）/ `docs/logs/2026/06-22.md` 记录一致。

Follow-up:

- 跨字段联动建议验证（data-source `sendOn` 已支持，本 plan 不专项验证，归后续按需）。
- multi-value tags input（独立组件评估，Non-Goals 明确）。
- 键盘 a11y 细化（Home/End/Type-ahead，首版覆盖 ArrowUp/Down/Enter/Escape）。
- 无 confirmed live defect 残留；无 remaining plan-owned work。
