# W3c 值映射组（mapping/status）

> Plan Status: completed
> Last Reviewed: 2026-06-24
> Source: `docs/components/roadmap.md` W3c；`docs/components/{mapping,status}/design.md`（契约已立约）
> Related: `flux-renderers-content` 包已 bootstrap（W1b/W1a/W2a 落地）；roadmap 依赖图 `L0 → W3c`。本 plan 与 W3a/W3b（layout 包，独立 plan）分离，因二者归属不同包、不同结果面（值映射展示 vs 布局/动作）。
> Mission: components
> Work Item: W3c

## Purpose

把 roadmap W3c（值映射组：`mapping`/`status`）从"design.md 已立约、代码 0%"推进到"2 个 renderer 实现 + 注册 + playground + e2e + roadmap W3c 标 done"。

`mapping` 与 `status` 合成一个 owner plan（遵循 guide Rule 26：同一组件级能力族优先合成 owner plan），理由：二者同属 `flux-renderers-content` 包，同为值→展示结果的映射展示 renderer，共享同一 `RendererDefinition` 注册路径、同一 proof path（值映射归一化 + marker 契约 + focused 单测 + e2e）、同一 owner-doc obligation（2 份 design.md §3 归属 drift 收敛）。design §12 各自标注的最大风险正是"mapping 与 status/badge 重复建模"，合成一个 plan 利于在实现时一次性厘清三者边界，避免 contract 碎片化。

## Current Baseline

> 截至 2026-06-24 的 live repo 核查结论（read-only）：

- **目标包已 bootstrap**：`flux-renderers-content` 已存在（W1b/W1a/W2a 落地 separator/spinner/progress/empty/card/link/image/json-view/markdown/html/cards/alert 共 12 个 renderer），`src/content-renderer-definitions.ts` 导出 `contentRendererDefinitions` 数组，`src/index.ts` 导出 `registerContentRenderers(registry)`；alias + project ref + `package.json` 就绪——2 个 renderer 直接追加，**无新包工作**。
- **2 个 renderer 均未实现**：`packages/flux-renderers-content/src/` 无 mapping/status renderer；`amis-baseline-matrix.md` L100/L101 两组件均标 `targetContract`/wave 3；包内无对应 type 字符串。
- **ui primitives 已就绪**：`@nop-chaos/ui` 已导出 `Badge`（`packages/ui/src/index.ts`），`status` 可投影到 `Badge`（design §10）；`mapping` 命中项可为文本/标签/badge 片段。`text`/`badge`（L0）已落地可复用其展示语义。
- **展示型 renderer 模式可复用**：`badge`（L0 runtime）、`separator`/`empty`（content 包已落地）提供纯展示 renderer 的 `RendererComponentProps` 消费范式（读 `props.props` 渲染，无 owner 状态）。
- **field 分类已立约**（design §5）：
  - `mapping`：`value`/`map`/`placeholder`/`defaultLabel` 为 `value`，`item` 为 `region`（命中项可选模板区）。无事件。
  - `status`：`value`/`labelMap`/`levelMap`/`iconMap`/`placeholder` 全为 `value`。无事件、无自由 region。
- **owner-doc drift 存在**：2 份 design.md §3 均写"预期归属 `@nop-chaos/flux-renderers-basic`"，但 roadmap（权威包分配）将二者划归 `flux-renderers-content`（见 `docs/components/package-splitting-strategy.md` L174-175/L203-204：mapping/status 属 content 包）。需收敛 §3 归属。
- **请求下沉约束**：二者均为纯展示组件，无数据请求语义，不受 `initFetch`/`api` 下沉约束影响。
- **与 badge 边界已立约**（design §1）：`badge` 是基础视觉 primitive（L0 runtime），`status` 是更强业务语义层（value→label+level+icon 映射），`mapping` 是值→展示结果（文本/badge/模板）的通用映射——三者职责分层已在 design 立约，本 plan 实现时遵循该分层，不重复建模。

## Goals

- `mapping`：值到展示结果的映射 renderer（`value`/`map`/`placeholder`/`defaultLabel` + `item` region），`nop-mapping` marker；命中 `map` 项渲染文本/badge/模板，未命中渲染 `defaultLabel` 或 `placeholder`。
- `status`：业务状态展示 renderer（`value`/`labelMap`/`levelMap`/`iconMap`/`placeholder`），`nop-status` marker；投影到 `Badge`（带 level 语义色）+ label + 可选 icon，强业务语义层（区别于基础 `badge`）。
- 2 个 `RendererDefinition` 合入 `contentRendererDefinitions` 随 `registerContentRenderers` 注册；playground 演示页 + e2e（程序化断言，非截图）。
- roadmap W3c 标 done + amis-baseline-matrix 2 组件标 runtime；2 份 design.md §3 归属 drift 收敛。
- 实现时厘清 mapping/status/badge 三者边界（design §12 风险），不产生重复建模。

## Non-Goals

- 不把 `status` 退化为 `badge` 的别名（design §1：status 是更强业务语义层）。
- 不实现 `mapping` 的"任意值渲染逻辑 escape hatch"（design §12 风险：失去稳定 contract）；`item` region 仅作为命中项的可选模板，不替代 map 查找。
- 不引入 `map` 作为第二个 canonical type（design §2：只保留 `mapping` 名称）。
- 不实现 mapping/status 的 loader/远程 map 装配（design §9 标注可由表达式/loader 产出，但首版聚焦静态 map + 表达式 value）。
- 不实现 W3a/W3b（grid/collapse/button-group/dropdown-button，归 layout 包，独立 plan）。

## Scope

### In Scope

- 2 个 renderer（mapping/status）实现，遵循 `RendererComponentProps`（读 `props.props`/`props.regions`/`props.meta`/`props.helpers`，不直接访问 store，无 owner 状态）。
- 2 个 `RendererDefinition` 合入 `contentRendererDefinitions` 注册。
- 值映射归一化（命中/未命中/defaultLabel/placeholder 分流）+ status level→Badge 语义色投影。
- playground 演示页 + e2e + focused 单测。
- roadmap W3c 标 done + amis-baseline-matrix 2 组件 `targetContract→runtime` + 2 份 design.md §3 归属收敛。

### Out Of Scope

- mapping 远程 loader/动态 map 装配。
- status 的非标准样式枚举扩散（design §2：不复制历史样式枚举）。
- W3a/W3b（layout 包）。

## Failure Paths

> 涉及值映射命中/未命中、level 投影的可测失败路径。

| 场景编号            | 触发                          | 行为                                            | 可重试 | 用户可见表现   |
| ------------------- | ----------------------------- | ----------------------------------------------- | ------ | -------------- |
| mapping-hit         | `value` 命中 `map` 键         | 渲染命中项（文本/badge/模板）                   | 否     | 映射结果       |
| mapping-miss        | `value` 未命中                | `defaultLabel` 优先，否则 `placeholder`         | 否     | 默认/占位文本  |
| mapping-item-region | `item` region 配置            | 命中项经 item region 模板渲染（带命中项上下文） | 否     | 自定义模板结果 |
| status-level        | `levelMap` 映射到 badge level | Badge 语义色（success/warning/destructive 等）  | 否     | 带色状态徽标   |
| status-icon         | `iconMap` 映射                | 渲染对应 icon                                   | 否     | 带图标状态     |
| status-miss         | value 未命中 labelMap         | placeholder 兜底                                | 否     | 占位文本       |
| null-value          | value 为 null/undefined       | placeholder 兜底，不抛错                        | 否     | 占位文本       |

## Test Strategy

本档选择：**建议有测**

理由：2 个组件均为纯展示型 renderer，无鉴权/对外 API 契约风险，按 tier 表属"建议有测"。但值映射归一化（命中/未命中/defaultLabel/placeholder 优先级）、status level→Badge 语义色投影、mapping item region 命中项上下文是行为正确性关注点，必须 focused 单测覆盖（不仅是不报错）。e2e 覆盖 playground 演示页渲染 + 映射命中/未命中（程序化断言，非截图，遵循 AGENTS.md）。

## Execution Plan

### Phase 1 - `mapping` + `status` 实现（Proof + Fix）

Status: completed
Targets: `packages/flux-renderers-content/src/{mapping,status}.tsx`（新建，colocated `*.test.tsx`）；`src/schemas.ts`（既有，追加 `MappingSchema`/`StatusSchema`）；`src/content-renderer-definitions.ts`（既有，追加 2 个 definition）

- Item Types: `Proof` + `Fix`

- [x] **Fix**：`mapping.tsx`——`nop-mapping` marker + `data-slot="mapping-root|mapping-item"`；从 `props.props` 读 `value`/`map`/`placeholder`/`defaultLabel`；映射归一化（`map[value]` 命中→渲染文本/badge 片段；未命中→`defaultLabel`→`placeholder` 兜底）；`item` region（命中时经 `props.regions.item.render()` 渲染，带命中项上下文）；无 owner 状态。
- [x] **Proof**：mapping focused 单测——命中渲染、未命中 defaultLabel 优先、placeholder 兜底、item region 命中项模板、null/undefined value 不抛错。
- [x] **Fix**：`status.tsx`——`nop-status` marker + `data-slot="status-root"`；从 `props.props` 读 `value`/`labelMap`/`levelMap`/`iconMap`/`placeholder`；投影到 ui `Badge`（levelMap→语义色 success/warning/destructive/info 等）+ labelMap→文本 + iconMap→icon；未命中 placeholder 兜底；强业务语义层（不退化成 badge 别名）。
- [x] **Proof**：status focused 单测——labelMap 文本、levelMap→Badge 语义色、iconMap icon、未命中 placeholder、null value 不抛错。
- [x] **Fix**：`content-renderer-definitions.ts` 增 mapping/status `RendererDefinition`（category `content`；mapping value/map/placeholder/defaultLabel value + item region + 无事件；status value/labelMap/levelMap/iconMap/placeholder value + 无事件）；`index.ts` 导出 `MappingRenderer`/`StatusRenderer` + schema 类型；schemas.ts 追加 `MappingSchema`/`StatusSchema`。

Exit Criteria:

- [x] mapping/status 实现遵循 `RendererComponentProps`（grep 确认无 `flux-runtime|useStore|getStore` 直接访问），根节点 marker 齐全，只使用 `@nop-chaos/ui`（无裸 HTML）。
- [x] mapping 命中/未命中/defaultLabel/placeholder 优先级成立；status levelMap→Badge 语义色投影成立。
- [x] mapping/status/badge 三者边界清晰（status 不退化成 badge 别名，mapping 不变成任意值 escape hatch）。
- [x] 2 个 definition 合入注册（局部 typecheck 通过以解阻塞 Phase 2）。

### Phase 2 - playground + e2e + owner-doc 同步

Status: completed
Targets: `apps/playground/src/`；`tests/e2e/`；`docs/components/{mapping,status}/design.md`；`docs/components/roadmap.md`；`docs/components/amis-baseline-matrix.md`

- Item Types: `Fix` + `Proof` + `Follow-up`

- [x] **Fix**：playground 增 W3c 演示页（mapping 命中/未命中/defaultLabel/placeholder + item region 模板、status labelMap/levelMap→Badge 语义色/iconMap）并注册路由（route-model.ts/App.tsx）；确认 `registerContentRenderers` 已接入 playground。
- [x] **Proof**：e2e（`tests/e2e/w3c-value-mapping.spec.ts`）——程序化断言：mapping 命中渲染对应文本、未命中 placeholder、status level 投影到 Badge 语义色（`page.evaluate` 读 DOM/Badge class）、icon 渲染。**不靠截图**（遵循 AGENTS.md）。
- [x] **Fix**：2 份 design.md §3 归属 `flux-renderers-basic`→`flux-renderers-content` 收敛（owner-doc drift——已确认 drift 属 `Fix`，不降级为 Follow-up，见 guide Rule 15）。
- [x] **Follow-up**：roadmap W3c 标 done（closure 阶段）+ amis-baseline-matrix L100/L101 两组件 `targetContract→runtime`。

Exit Criteria:

- [x] playground W3c 演示页可访问、2 组件渲染可用。
- [x] e2e 通过（程序化断言，非截图）。
- [x] 2 份 design.md §3 归属收敛为 `flux-renderers-content`。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见本 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: Round 1 `ses_10975d4d6ffe4JSQhR2B4GJrX4`（fresh session 初评，revised——1 Blocker）；Round 2 复核 `ses_109720315ffeHJknzZluesfAKy`（fresh session 复核，pass）
- Verdict: `pass`（零 Blocker / 零 Major；经 2 轮达成共识）
- Rounds: 2
- Findings addressed:
  - Round 1 Blocker：Phase 2 design.md §3 owner-doc drift 收敛项误标 `Follow-up`，违反 guide Rule 15（owner-doc drift 只能属 `Fix`，不可降级）。已改为 `Fix`（roadmap/matrix 状态记录项保留 `Follow-up`——前者是已确认 drift，后者是 closure 时状态簿记，区分成立）。
  - Round 1 Minor：content 包 renderer 计数 "共 11" 实为 12。已更正为 "共 12"（live repo `content-renderer-definitions.ts` 实测 12 个 definition）。
- 引用准确性：全部经 live repo 核对通过（`flux-renderers-content` 已 bootstrap——`index.ts:42` `registerContentRenderers`、`content-renderer-definitions.ts:29` 12 个 definition；ui `Badge` 导出、`badge` 为 L0 runtime renderer；2 份 design.md §3 均 `flux-renderers-basic` drift；mapping/status 未实现——grep `type:'mapping'|'status'` 无 renderer 定义命中；amis-baseline-matrix L100/L101 targetContract wave 3；roadmap W3c→`flux-renderers-content` todo）。

## Closure Gates

> 关闭条件：本 section 及每个 Phase Exit Criteria 全部 `[x]` 后才能 `Plan Status: completed`。全量验证归此处（plan 收口跑一次），非每 Phase 默认项。

- [x] 2 个 W3c renderer 实现并注册，遵循 `RendererComponentProps`（无直接 store 访问、无 owner 状态）。
- [x] **mapping 映射归一化成立**：命中/未命中/defaultLabel/placeholder 优先级正确。
- [x] **status 业务语义层成立**：levelMap→Badge 语义色投影，不退化成 badge 别名。
- [x] mapping/status/badge 三者边界清晰（无重复建模）。
- [x] 2 个 focused 单测 + e2e 通过（验证行为，非仅不报错）。
- [x] owner-doc drift 收敛（2 份 design.md §3 归属）。
- [x] roadmap W3c 标 done + amis-baseline-matrix 2 组件标 runtime。
- [x] 不存在被静默降级到 deferred 的 in-scope 项（尤其映射归一化、status 语义层不得降级）。
- [x] 受影响的 owner docs 已同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 无。本 plan scope 聚焦值映射族单一结果面，无确认的 live defect / contract drift 需延期（2 份 design.md §3 归属 drift 在 Phase 2 收敛，非延期）。

## Non-Blocking Follow-ups

- mapping 远程 loader/动态 map 装配（design §9 标注可由 loader 产出）——optimization candidate。
- status 非标准样式枚举扩展（design §2 不复制历史样式枚举）——watch-only residual。
- mapping 命中项为复杂 badge 片段的富模板增强——optimization candidate。

## Closure

Status Note: W3c 完成。`mapping`/`status` 2 个 renderer 落地于 `flux-renderers-content`（14 个 definition），值映射归一化 + status Badge 语义层均经 focused 单测与 e2e 覆盖；owner-doc drift 收敛；roadmap W3c 标 done、amis-baseline-matrix 2 组件标 runtime。mapping/status/badge 三者边界清晰（mapping=value→展示结果、status=value→Badge(level+label+icon) 语义层、badge=primitive）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session）`ses_109412041ffePjPh3gPjVVzTUB`
- Verdict: PASS（零 Blocker / 零 Major；10/10 审计项通过）
- Evidence:
  - mapping/status 零 store/runtime 访问（grep `flux-runtime|useStore|useScopeSelector|useRendererRuntime|useRenderScope` 无命中）；根 marker 齐全（`nop-mapping`/`data-slot="mapping-root"`、`nop-status`/`data-slot="status-root"`），仅结构性 `span` + ui `Badge`，无裸 HTML 控件。
  - mapping 归一化优先级成立（empty→placeholder、miss→defaultLabel→placeholder、hit→item region/map text）；status 非简单 badge 别名（8 级 levelMap→variant + iconMap + labelMap，对比 badge.tsx 的 3-way ternary passthrough）。
  - 2 definition 注册（14 total），mapping `item` 为 region、status 无 region/event 字段。
  - 复核绿：content 包 typecheck/lint/test（118 passed/16 files）+ `declares 14 renderer definitions` 断言通过。
  - `condition-builder-formula` e2e 失败确认为**预存在且与 W3c 无关**（`condition-builder-formula-page.tsx` 零引用 mapping/status/w3c）。
- 全量验证：`pnpm typecheck` 55/55、`pnpm build` 29/29、`pnpm lint` 29/29、`pnpm test` 55/55（vitest）；e2e `w3c-value-mapping.spec.ts` 11/11 通过。

Follow-up:

- mapping 远程 loader/动态 map 装配（design §9，Non-Blocking Follow-up，optimization candidate）。
- status 非标准样式枚举扩展（design §2，watch-only residual）。
- mapping 命中项富模板（badge 片段）增强（optimization candidate）。
