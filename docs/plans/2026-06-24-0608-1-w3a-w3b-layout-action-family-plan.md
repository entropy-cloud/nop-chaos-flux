# W3a+W3b 布局与动作分组族（grid/collapse/button-group/dropdown-button）

> Plan Status: completed
> Last Reviewed: 2026-06-24
> Source: `docs/components/roadmap.md` W3a/W3b；`docs/components/{grid,collapse,button-group,dropdown-button}/design.md`（契约已立约）
> Related: W2a 已 bootstrap `flux-renderers-layout` 包（`wizard` 落地，roadmap 依赖图 `L0 → W3a/W3b`），本 plan 在同包内追加 4 个 renderer。
> Mission: components
> Work Item: W3a + W3b

## Purpose

把 roadmap W3a（布局组：`grid`/`collapse`）+ W3b（动作分组组：`button-group`/`dropdown-button`）从"design.md 已立约、代码 0%"推进到"4 个 renderer 实现 + 注册 + playground + e2e + roadmap W3a/W3b 标 done"。

W3a 与 W3b 合成一个 owner plan（遵循 guide Rule 26：同一组件级能力族优先合成 owner plan），理由：四者同属 `flux-renderers-layout` 包（W2a 已 bootstrap），同为结构性/动作编排 renderer，共享同一 `RendererDefinition` 注册路径、同一 proof path（marker 契约 + 嵌套 items region + focused 单测 + e2e）、同一 owner-doc obligation（4 份 design.md §3 归属 drift 收敛）。不拆成两个 one-capability micro-plan。

## Current Baseline

> 截至 2026-06-24 的 live repo 核查结论（read-only）：

- **目标包已 bootstrap**：`flux-renderers-layout` 已存在（W2a 落地 `wizard`），`src/layout-renderer-definitions.ts` 导出 `layoutRendererDefinitions` 数组，`src/index.ts` 导出 `registerLayoutRenderers(registry)`；alias + project ref + `package.json`（`sideEffects:["*.css"]`）就绪——4 个 renderer 直接追加，**无新包工作**。
- **4 个 renderer 均未实现**：`packages/flux-renderers-layout/src/` 无 grid/collapse/button-group/dropdown-button renderer；`amis-baseline-matrix.md` L69/L74/L86/L87 四组件均标 `targetContract`/wave 3；包内 grep 无对应 type 字符串。
- **ui primitives 已就绪**：`@nop-chaos/ui` 已导出 `Button`、`DropdownMenu` 族（Trigger/Content/Item）、`Collapsible`（CollapsibleTrigger/Content）、`Accordion`、`ButtonGroup`（`packages/ui/src/index.ts`）——4 个 renderer 复用这些 primitive，禁止裸 HTML（AGENTS.md 强制）。
- **嵌套 items region 模式可复用**：`wizard` 的 `deepFields`（`extractNestedSchemaRegions` + per-item scope `params:['step','index','key']`，见 `layout-renderer-definitions.ts:140-221`）提供 grid/collapse/button-group/dropdown-button 的 items 集合 region 编译范式。`list`/`cards`（W1c/W2a）的 `items`+`item` region + per-item scope 已落地可参照。
- **布局 renderer 样式契约**：`grid` 是 layout renderer（AGENTS.md：layout renderer 发出 marker + 从 schema 读布局值，不硬编码 `gap-4`/`grid` 等视觉类名）；`grid` 的 `columns`/`gap`/`autoFlow` 等从 schema props 读出并转化为 grid 布局。`collapse`/`button-group`/`dropdown-button` 是带交互的容器/动作控件，视觉层复用 ui primitive。
- **field/event 分类已立约**（design §5）：
  - `grid`：`columns`/`gap`/`items`/`autoFlow`/`alignItems`/`justifyItems` 全为 `value`；无事件。
  - `collapse`：`items`/`value`/`defaultValue`/`valueOwnership`/`valueStatePath`/`multiple`/`collapsible` 为 `value`，`onChange` 为 `event`。
  - `button-group`：`items`/`orientation`/`variant`/`size`/`selectionMode`/`value`/`defaultValue` 为 `value`，`onChange` 为 `event`。
  - `dropdown-button`：`label` 为 `value-or-region`，`icon`/`variant`/`size`/`items`/`trigger`/`disabled` 为 `value`。
- **owner-doc drift 存在**：4 份 design.md §3 均写"预期归属 `@nop-chaos/flux-renderers-basic`"，但 roadmap（权威包分配）将四者划归 `flux-renderers-layout`（见 `docs/components/package-splitting-strategy.md` L215-238：grid/collapse/button-group/dropdown-button 属 layout 包）。需收敛 §3 归属（同 W2a 处理模式）。
- **请求下沉约束**：四者均非数据组件，无挂载触发请求语义；不受 `initFetch`/`api` 下沉约束影响，但仍不得引入组件级请求字段。

## Goals

- `grid`：显式二维网格布局 renderer（`columns`/`gap`/`autoFlow`/`alignItems`/`justifyItems` + `items` 嵌套 region，每项带 `body`/`colSpan`/`rowSpan`），`nop-grid` marker；从 schema 读布局值，不硬编码视觉类名。
- `collapse`：折叠内容组 renderer（`items` 每项 `title`+`body` region + `value`/`defaultValue`/`valueOwnership`/`valueStatePath`/`multiple`/`collapsible` + `onChange`），`nop-collapse` marker；展开态经 valueOwnership 分层（local/controlled/scope），复用 ui Collapsible/Accordion。
- `button-group`：动作按钮组 renderer（`items` + `orientation`/`variant`/`size`/`selectionMode`/`value`/`defaultValue` + `onChange`），`nop-button-group` marker；普通动作组与 toggle-like 选中态分层，复用 ui ButtonGroup/Button。
- `dropdown-button`：带下拉菜单的动作按钮 renderer（`label` value-or-region + `icon`/`variant`/`size`/`items`/`trigger`/`disabled`），`nop-dropdown-button` marker；复用 ui Button + DropdownMenu。
- 4 个 `RendererDefinition` 合入 `layoutRendererDefinitions` 随 `registerLayoutRenderers` 注册；playground 演示页 + e2e（程序化断言，非截图）。
- roadmap W3a/W3b 标 done + amis-baseline-matrix 4 组件标 runtime；4 份 design.md §3 归属 drift 收敛。

## Non-Goals

- 不实现 W4b 的 `steps`/`timeline`（同属 layout 包但归 W4b，独立工作项）。
- 不重建布局引擎：`grid` 复用 CSS Grid（从 schema 值映射），不发明第二套布局 DSL；不替代 `flex`/`container`。
- 不实现 `collapse` 的 `statusPath` 摘要发布（design §7 标注为未来扩展）。
- 不实现 `button-group` 的 toggle-like 选中态的 scope 持久化增强（首版 local controlled）。
- 不实现 `dropdown-button` 的 `component:open`/`component:close` 句柄（design §8 标注首版重点在稳定 items contract）。
- 不把 `button-group` 做成通用导航菜单或复杂弹层 owner（design §12 风险：防与 dropdown/导航重叠）。
- 不实现 W3c（mapping/status，归 content 包，独立 plan）。

## Scope

### In Scope

- 4 个 renderer（grid/collapse/button-group/dropdown-button）实现，遵循 `RendererComponentProps`（读 `props.props`/`props.regions`/`props.events`/`props.meta`/`props.helpers`，不直接访问 store）。
- 4 个 `RendererDefinition` 合入 `layoutRendererDefinitions` 注册（含嵌套 items deepFields + per-item scope region）。
- valueOwnership 分层（local/controlled/scope）用于 collapse 展开态 + button-group 选中态。
- playground 演示页 + e2e + focused 单测。
- roadmap W3a/W3b 标 done + amis-baseline-matrix 4 组件 `targetContract→runtime` + 4 份 design.md §3 归属收敛。

### Out Of Scope

- steps/timeline（W4b）。
- collapse statusPath / component 句柄。
- button-group scope 持久化增强。
- W3c mapping/status。

## Failure Paths

> 涉及展开态、选中态、菜单弹层、嵌套 region 渲染的可测失败路径。

| 场景编号             | 触发                             | 行为                                     | 可重试 | 用户可见表现         |
| -------------------- | -------------------------------- | ---------------------------------------- | ------ | -------------------- |
| grid-colspan         | `colSpan`/`rowSpan` 超出网格     | 归一化到合法 span，不破坏网格            | 否     | 网格不错位           |
| grid-empty-items     | `items` 为空/缺省                | 渲染空网格（marker 仍存在），不抛错      | 否     | 空容器               |
| collapse-multiple    | `multiple:false` 多项展开请求    | 单选互斥（仅保留最后展开项）             | 否     | 同时只展开一项       |
| collapse-value-sync  | `valueOwnership:'scope'` 写回    | scope 路径更新 + `onChange` 派发         | 否     | 外部受控展开态同步   |
| button-group-toggle  | `selectionMode` toggle 选中      | local 选中态 + `onChange` 上报           | 否     | 选中项视觉高亮       |
| button-group-action  | item 无 action                   | 渲染按钮但不派发动作，不抛错             | 否     | 静态按钮             |
| dropdown-trigger     | `trigger:'hover'`/`'click'` 切换 | 菜单按指定 trigger 打开                  | 否     | 菜单按预期打开       |
| dropdown-item-action | 菜单项点击                       | 派发 item action 并关闭菜单              | 否     | 动作执行 + 菜单关闭  |
| nested-region-render | items 内 body/title region 渲染  | per-item scope（item/index/key）正确建立 | 否     | 子内容带 item 上下文 |

## Test Strategy

本档选择：**建议有测**

理由：4 个组件均为结构性/动作编排 renderer，无鉴权/对外 API 契约风险，按 tier 表属"建议有测"。但 collapse 的展开态分层（local/controlled/scope）、button-group 的 toggle 选中态、dropdown-button 的 trigger/菜单关闭、grid 的 colSpan 归一化是行为正确性关注点，必须 focused 单测覆盖（不仅是不报错）。e2e 覆盖 playground 演示页渲染 + 展开/选中/菜单交互 + region 渲染（程序化断言，非截图，遵循 AGENTS.md）。

## Execution Plan

### Phase 1 - `grid` + `collapse`（Proof + Fix）

Status: completed
Targets: `packages/flux-renderers-layout/src/{grid-renderer,collapse-renderer}.tsx`（新建，colocated `*.test.tsx`）；`src/schemas.ts`（既有，追加 `GridSchema`/`CollapseSchema`）；`src/layout-renderer-definitions.ts`（既有，追加 2 个 definition）

- Item Types: `Proof` + `Fix`

- [x] **Fix**：`grid-renderer.tsx`——`nop-grid` marker + `data-slot="grid-root|grid-item"`；从 `props.props` 读 `columns`/`gap`/`autoFlow`/`alignItems`/`justifyItems` 并映射为 CSS Grid（gridTemplateColumns/gap/gridAutoFlow/justifyItems/alignItems），**不硬编码视觉类名**（布局值来自 schema）；`items` 嵌套 region 经 `props.regions` 渲染，每项 `body` region + per-item scope（`item`/`index`/`key`），`colSpan`/`rowSpan` 归一化（超界 clamp 到合法 span）。
- [x] **Proof**：grid focused 单测——columns 映射、colSpan/rowSpan 归一化、空 items 不抛错、嵌套 body region 带 item 上下文渲染、marker 存在。
- [x] **Fix**：`collapse-renderer.tsx`——`nop-collapse` marker + `data-slot="collapse-root|collapse-item|collapse-trigger|collapse-content"`；`items` 每项 `title`+`body` region（per-item scope）；展开态经 `valueOwnership`（local useState / controlled / scope `valueStatePath`）分层；`multiple:false` 单选互斥；复用 ui `Collapsible`/`Accordion`；`onChange` 派发（payload：当前展开 value 集合）。
- [x] **Proof**：collapse focused 单测——multiple 单选互斥、valueOwnership local/controlled/scope 三态写回、onChange 派发、title/body region 渲染。
- [x] **Fix**：`layout-renderer-definitions.ts` 增 grid/collapse `RendererDefinition`（category `layout`；grid 全 value 字段无事件；collapse value 字段 + valueOwnership select + onChange event + items deepFields 含 title/body nestedRegions `params:['item','index','key']`）。

Exit Criteria:

- [x] grid/collapse 实现遵循 `RendererComponentProps`（grep 确认无 `flux-runtime|useStore|getStore` 直接访问），根节点 marker 齐全，只使用 `@nop-chaos/ui`（无裸 HTML）。
- [x] grid 从 schema 读布局值（无硬编码 `gap-*`/`grid` 视觉类名），colSpan/rowSpan 归一化成立。
- [x] collapse 展开态 valueOwnership 分层成立（local/controlled/scope 三态各有 focused 单测验证）。
- [x] 2 个 definition 合入注册（局部 typecheck 通过以解阻塞 Phase 2）。

### Phase 2 - `button-group` + `dropdown-button`（Proof + Fix）

Status: completed
Targets: `packages/flux-renderers-layout/src/{button-group-renderer,dropdown-button-renderer}.tsx`（新建，colocated `*.test.tsx`）；`src/layout-renderer-definitions.ts`（既有，追加 2 个 definition）

- Item Types: `Proof` + `Fix`

- [x] **Fix**：`button-group-renderer.tsx`——`nop-button-group` marker + `data-slot="button-group-root|button-group-item"`；`items` 值配置（每项 label/action，per-item scope）；`orientation`/`variant`/`size` 从 schema 读；`selectionMode`（none/single/multiple）toggle 选中态 local controlled + `onChange` 上报；无 action 的 item 渲染静态按钮不抛错；复用 ui `ButtonGroup`/`Button`。
- [x] **Proof**：button-group focused 单测——selectionMode none/single/multiple 三态、onChange 上报选中集合、无 action item 不抛错、orientation/variant 投影。
- [x] **Fix**：`dropdown-button-renderer.tsx`——`nop-dropdown-button` marker + `data-slot="dropdown-button-root|dropdown-button-trigger|dropdown-menu-item"`；`label` value-or-region；`items` 菜单项（每项 label/action）；`trigger`（click/hover）；菜单项点击派发 action 并关闭菜单；`disabled` 禁用 trigger；复用 ui `Button` + `DropdownMenu`（Trigger/Content/Item）。
- [x] **Proof**：dropdown-button focused 单测——trigger click/hover 打开、菜单项点击派发 action + 关闭、disabled 禁用、label value-or-region 渲染。
- [x] **Fix**：`layout-renderer-definitions.ts` 增 button-group/dropdown-button `RendererDefinition`（category `layout`；button-group value 字段 + selectionMode select + onChange event + `items` 为纯 value prop——design §6 首版只用 items 值配置，不开放 nestedRegions；dropdown-button label value-or-region + value 字段 + `items` 纯 value prop）。注意：仅 grid/collapse 的 items 含 nestedRegions（body/title），button-group/dropdown-button 的 items 无 nestedRegions。

Exit Criteria:

- [x] button-group/dropdown-button 实现遵循 `RendererComponentProps`，marker 齐全，只使用 `@nop-chaos/ui`。
- [x] button-group selectionMode 三态 + onChange 行为成立；dropdown-button trigger/菜单关闭行为成立。
- [x] 4 个 definition 全部合入注册（grid/collapse/button-group/dropdown-button）。

### Phase 3 - playground + e2e + owner-doc 同步

Status: completed
Targets: `apps/playground/src/`；`tests/e2e/`；`docs/components/{grid,collapse,button-group,dropdown-button}/design.md`；`docs/components/roadmap.md`；`docs/components/amis-baseline-matrix.md`

- Item Types: `Fix` + `Proof` + `Follow-up`

- [x] **Fix**：playground 增 W3a/W3b 演示页（grid colSpan 演示、collapse multiple/单选 + scope 受控、button-group selectionMode toggle、dropdown-button trigger/菜单）并注册路由（route-model.ts/App.tsx）；确认 `registerLayoutRenderers` 已接入 playground。
- [x] **Proof**：e2e（`tests/e2e/w3a-w3b-layout-action-family.spec.ts`）——程序化断言：grid 列映射 + 嵌套 region 渲染、collapse 展开/单选互斥（`page.evaluate` 读 scope）、button-group toggle 选中 + onChange、dropdown-button 菜单打开/项点击关闭。**不靠截图**（遵循 AGENTS.md）。
- [x] **Fix**：4 份 design.md §3 归属 `flux-renderers-basic`→`flux-renderers-layout` 收敛（owner-doc drift——已确认 drift 属 `Fix`，不降级为 Follow-up，见 guide Rule 15）。
- [x] **Follow-up**：roadmap W3a/W3b 标 done（closure 阶段）+ amis-baseline-matrix L69/L74/L86/L87 四组件 `targetContract→runtime`。

Exit Criteria:

- [x] playground W3a/W3b 演示页可访问、4 组件交互可用。
- [x] e2e 通过（程序化断言，非截图）。
- [x] 4 份 design.md §3 归属收敛为 `flux-renderers-layout`。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见本 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: Round 1 `ses_10975f70effe7tLWRzDEXa4mQi`（fresh session 初评，pass-with-minors）；Round 2 复核 `ses_109720315ffeHJknzZluesfAKy`（fresh session 复核，pass）
- Verdict: `pass`（零 Blocker / 零 Major；经 2 轮达成共识）
- Rounds: 2
- Findings addressed:
  - Round 1 发现 Phase 3 design.md §3 owner-doc drift 收敛项误标 `Follow-up`，违反 guide Rule 15（owner-doc drift 不可降级）。已改为 `Fix`（roadmap/matrix 状态记录项保留 `Follow-up`——前者是已确认 drift，后者是 closure 时状态簿记，区分成立）。
  - Round 1 发现 button-group/dropdown-button `items` deepFields 与 design §6（首版只 items 值配置、不开放 region）的歧义。Phase 2 definition 项已澄清：仅 grid/collapse items 含 nestedRegions（body/title），button-group/dropdown-button items 为纯 value prop 无 nestedRegions。
- 引用准确性：全部经 live repo 核对通过（`flux-renderers-layout` 已 bootstrap——`index.ts:8` `registerLayoutRenderers`、`layout-renderer-definitions.ts:5` `layoutRendererDefinitions`、wizard deepFields L140-221；ui Button/ButtonGroup/DropdownMenu 族/Collapsible/Accordion/Badge 均导出；4 份 design.md §3 均 `flux-renderers-basic` drift；4 组件未实现；amis-baseline-matrix L69/L74/L86/L87 targetContract wave 3；roadmap W3a/W3b→`flux-renderers-layout` todo）。

## Closure Gates

> 关闭条件：本 section 及每个 Phase Exit Criteria 全部 `[x]` 后才能 `Plan Status: completed`。全量验证归此处（plan 收口跑一次），非每 Phase 默认项。

- [x] 4 个 W3a/W3b renderer 实现并注册，遵循 `RendererComponentProps`（无直接 store 访问）。
- [x] **grid 布局契约成立**：从 schema 读布局值，不硬编码视觉类名（grep 确认无硬编码 `gap-4`/`grid-cols-*` 等固定视觉类）；colSpan/rowSpan 归一化。
- [x] **collapse 展开态分层成立**：valueOwnership local/controlled/scope 三态（不混成单一宽状态）。
- [x] button-group selectionMode 三态 + onChange 行为落地。
- [x] dropdown-button trigger/菜单关闭行为落地。
- [x] 4 个 focused 单测 + e2e 通过（验证行为，非仅不报错）。
- [x] owner-doc drift 收敛（4 份 design.md §3 归属）。
- [x] roadmap W3a/W3b 标 done + amis-baseline-matrix 4 组件标 runtime。
- [x] 不存在被静默降级到 deferred 的 in-scope 项（尤其 grid 布局契约、collapse 状态分层不得降级）。
- [x] 受影响的 owner docs 已同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 无。本 plan scope 聚焦布局/动作族单一结果面，无确认的 live defect / contract drift 需延期（4 份 design.md §3 归属 drift 在 Phase 3 收敛，非延期）。

## Non-Blocking Follow-ups

- collapse `statusPath` 只读摘要发布（design §7 标注为未来扩展）——optimization candidate。
- button-group toggle 选中态的 scope 持久化增强（首版 local controlled）——optimization candidate。
- dropdown-button `component:open`/`component:close` 句柄（design §8 首版未含）——optimization candidate。
- `button-toolbar` 由 `button-group` + 自然 toolbar region 承接的语义评估（design §2）——watch-only residual。

## Closure

Status Note: W3a（grid/collapse）+ W3b（button-group/dropdown-button）4 个 renderer 全部落地于 `flux-renderers-layout` 包。grid 遵循 layout renderer 布局契约（schema→CSS Grid inline style，不硬编码视觉类名）；collapse valueOwnership local/controlled/scope 三态分层成立；button-group selectionMode none/single/multiple toggle + onChange；dropdown-button trigger click/hover + 菜单项 action 派发 + 关闭。4 focused 单测（5+6+7+6=24）+ e2e 5 程序化断言全通过。4 份 design.md §3 归属 drift 收敛；roadmap W3a/W3b→done；amis-baseline-matrix 4 组件→runtime。

Closure Audit Evidence:

- Auditor / Agent: fresh session `ses_10953e7c4ffealxOzwT6FrY3YL`（independent closure audit，非执行 session）
- Evidence: 12/12 items PASS against live repo——零 store-access leaks（grep 确认）；grid `buildGridStyle` schema→inline style 无硬编码视觉类（grid-renderer.tsx:36-61）；collapse `useCollapseValue` 三态独立分支（collapse-renderer.tsx:44-107）；4 definitions 注册（layout-renderer-definitions.ts:243/356/501/611）；grid/collapse nestedRegions + button-group/dropdown-button 纯 value prop 分割正确；单测计数 5/6/7/6 验证行为；e2e 5 程序化断言非截图；design.md §3 + roadmap + matrix 全收敛；无 in-scope drift 被静默降级。Verdict: `approved`。

Follow-up:

- collapse `statusPath` 只读摘要发布（design §7 未来扩展）——optimization candidate
- button-group toggle 选中态 scope 持久化增强（首版 local controlled）——optimization candidate
- dropdown-button `component:open`/`component:close` 句柄（design §8 首版未含）——optimization candidate
- `button-toolbar` 由 `button-group` + 自然 toolbar region 承接语义评估（design §2）——watch-only residual
