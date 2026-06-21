# E2d 树族异步加载与虚拟滚动

> Plan Status: completed
> Package: components-improvement
> Work Item: E2d 树族异步与级联
> Last Reviewed: 2026-06-21
> Source: `docs/components/existing-components-improvement-roadmap.md`（E2d 行）、`docs/components/input-tree/design.md` §2 Flux 决策表 + §9 数据源、`docs/components/tree-select/design.md` §2 Flux 决策表、live-repo audit（`tree-controls.tsx` + `tree-options.ts` + `tree-control-controllers.ts` + data-source runtime 能力）
> Related: E0b（树级联漂移修复，done — cascade/indeterminate 已收口）、X5 input-tree/tree-select Flux 决策表（done）、X4（data-source 请求层增强，todo —— 见 Phase 1 边界裁定）

## Purpose

把 roadmap 工作项 **E2d 树族异步与级联** 从 `todo` 推进到 `done`：为 `input-tree`/`tree-select` 表单树字段族补齐 **虚拟滚动**（深树性能）、**异步懒加载**（展开节点时按 data-source 拉取子节点）、**远程搜索**（搜索关键字驱动 data-source 刷新，替代当前本地子串过滤）。三者共享 `tree-options` 模型与 `TreeOptionList` 渲染层。当前树 options 由 `buildTreeOptionMetaList` 一次性**全量递归**构建，`searchable` 仅做本地过滤，无虚拟化、无按节点懒加载、无远程搜索。

## Current Baseline

经 live-repo audit（2026-06-21）：

- **Renderer 族**：`InputTreeRenderer`（`packages/flux-renderers-form-advanced/src/tree-controls.tsx:300-366`）与 `TreeSelectRenderer`（同文件 L368-482）共享 `TreeOptionList`（L171-298）渲染层；definition 在 L484-509，二者 `fields: [...formFieldRules, { key: 'options', kind: 'prop', allowSource: true, sourceStateKey: 'optionsSourceState' }]`。
- **Option 模型**：`buildTreeOptionMetaList`（`tree-options.ts:88-102`）**全量递归**构建 `TreeOptionMeta[]`（含 children 树）；`flattenTreeOptions`（L104-127）按 `onlyLeaf` 拍平。`TreeOptionMeta`（L7-16）含 `node`/`label`/`value`/`valueKey`/`depth`/`pathLabel`/`parentNode`/`children`。
- **展开/搜索**：`useTreeOptionListController`（`tree-control-controllers.ts`）管 expandedKeys/query/activeItemKey；`searchable` 为**本地子串过滤**（`query` 过滤已加载 options），非远程。
- **Source 能力（关键）**：`options` 字段 `allowSource: true` 走一次性全量加载（`optionsSourceState`）。runtime data-source 层已支持：
  - **按依赖自动刷新**：API source 当其 request 依赖的 scope 值变化时自动重新拉取（`runtime-sources-refresh.test.ts:86` "auto-refreshes api sources when request dependencies change"）。
  - **编程式刷新**：`runtime.refreshDataSource({ name, scope })`（`runtime-factory.ts:461`、`source-registry.ts:337`）+ `refreshSource` action（`action-adapter.ts:322`）可按 name 触发刷新。
  - `refreshDedup`（`cancel-previous`/`ignore-new`/`parallel`）管控并发请求。
    → 结论：远程搜索（query 作 source 依赖）与懒加载（展开节点触发 source 刷新，参数为节点值）**可基于现有 data-source 能力实现**，不强依赖 X4 的 `sendOn`/initFetch gate（X4 是该机制的精炼，非硬前置；与 roadmap 标注 E2d 仅依赖 E0b+X5 一致）。
- **虚拟化先例**：`@tanstack/react-virtual` `useVirtualizer` 已用于 select（`input-choice-renderers.tsx:197-246` `VirtualizedComboboxList`，threshold=100，`input-choice-renderers.tsx:269`）。但 `flux-renderers-form-advanced` 的 `package.json` **未直接依赖** `@tanstack/react-virtual`（需新增）。
- **cascade/indeterminate**：E0b 已收口（`tree-options.ts:210-258` `cascadeSelectParent`/`cascadeDeselectParent`/`deriveCheckedState`），本 plan 不改动其语义，但虚拟化/懒加载须与之共存（懒加载节点的派生态需在子节点到达后重算）。
- **`tree` 显示 renderer**：`packages/flux-renderers-data/src/tree-renderer.tsx` 是独立 UI 展示组件（node template region 架构，无字段值绑定），其决策表（`tree/design.md`）**无 E2d 标记**，架构与字段族不同 —— 本 plan 不覆盖。
- **设计文档**：`input-tree/design.md` §2 与 `tree-select/design.md` §2 均将 异步懒加载（deferApi）/远程搜索（searchApi）/虚拟滚动（virtualThreshold）三行标为 `计划实现（E2d）`，并注明「走 data-source，不在组件开 api（X3 §1/§3）」。

## Goals

- **虚拟滚动**：`input-tree`/`tree-select` 在「可见拍平节点数」超过阈值时，用 `@tanstack/react-virtual` 虚拟化 `TreeOptionList` 的可见节点，保证深树滚动性能；阈值可配（`virtualThreshold`，默认与 select 一致 100）。
- **异步懒加载**：节点可声明「子节点按需加载」；展开此类节点时经由 data-source 拉取其子节点并合并进 option 模型（加载中显示 loading 态，失败显示错误 + 可重试）。请求下沉 data-source，组件不开 `api` 短路径（X3 §1/§3）。
- **远程搜索**：当 `searchable` 且声明了搜索 source 时，搜索关键字驱动 data-source 刷新（带 debounce），结果替换 options；不声明时保持当前本地子串过滤基线。
- 三者与既有 cascade/indeterminate（E0b）、onlyLeaf、showPathLabel、键盘 roving focus、source loading/error 态共存。
- `input-tree/design.md` + `tree-select/design.md` §2 三行 `计划实现（E2d）` 翻 `实现`；§4 schema + §9 数据源 + 相关运行期状态节同步。
- 每项能力配有 focused 单测。

## Non-Goals

- 节点 CRUD（`creatable`/`editable`/`removable` + addApi/editApi/deleteApi/saveOrderApi）（决策表 `暂不实现`）。
- `nodeBehavior`/`itemActions`（决策表 `暂不实现`）。
- `enableNodePath`+`pathSeparator`/`hideRoot`/`rootLabel`（决策表 `暂不实现`）。
- amis 组件级 `api`/`autoComplete`/`initFetch` SchemaApi 生命周期（决策表 `不采纳`，请求下沉 data-source）。
- `showIcon`/`showOutline`（E0b 已 `不采纳（删字段）`）。
- `tree` 显示 renderer（data 包）的虚拟化 —— 独立架构（node template region），其决策表无 E2d 标记，不在本 plan 范围。
- X4 的 `sendOn`/initFetch gate/生命周期事件完整设计 —— 属 X4 工作项；本 plan 仅消费现有 data-source 能力，不替 X4 设计 sendOn 语义。

## Scope

### In Scope

- `packages/flux-renderers-form-advanced/package.json`：新增 `@tanstack/react-virtual` 依赖（workspace 已有版本，对齐 select）。
- `packages/flux-renderers-form/src/schemas.ts`：`InputTreeSchema`/`TreeSelectSchema` 新增 `virtualThreshold?: number`；新增懒加载/远程搜索 source 声明字段（Phase 1 裁定形状 —— 倾向 `childrenSource?: SourceSchema` / `searchSource?: SourceSchema`，请求下沉）。
- `packages/flux-renderers-form-advanced/src/tree-options.ts`：option 模型支持「子节点未加载」状态（如 `loaded: boolean`/`loading: boolean` 标记），懒加载合并子节点的 pure helper。
- `packages/flux-renderers-form-advanced/src/tree-control-controllers.ts`：展开节点触发懒加载 source 刷新、搜索 query 驱动远程搜索 source 刷新（debounce）的 controller 逻辑。
- `packages/flux-renderers-form-advanced/src/tree-controls.tsx`：`TreeOptionList` 虚拟化渲染分支；懒加载节点的 loading/error UI；远程搜索结果渲染。
- `packages/flux-renderers-form/src/renderers/input.tsx` 或 form-advanced definition：注册新 schema 字段。
- `packages/flux-renderers-form-advanced/src/__tests__/`：虚拟化、懒加载、远程搜索 focused 用例（扩 `tree-structure.test.tsx`/`tree-values.test.tsx` 或新建）。
- `docs/components/input-tree/design.md` + `docs/components/tree-select/design.md`：§2 决策表翻转 + §4 schema + §9 数据源 + 运行期状态节。
- `docs/components/existing-components-improvement-roadmap.md`：E2d `todo`→`done`（closure 后）。
- `docs/logs/2026/06-21.md`（或执行当日）：E2d 收口条目。

### Out Of Scope

- 见 Non-Goals 全部条目。
- `tree` 显示 renderer 虚拟化。
- e2e/Playwright（单测 + 虚拟化行为断言足够；懒加载/远程搜索用 mock data-source 单测覆盖）。

## Failure Paths

| 场景编号                  | 触发                                                   | 行为                                                                                | 可重试 | 用户可见表现                   |
| ------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------- | ------ | ------------------------------ |
| e2d-virtual-threshold     | 可见拍平节点数 200，`virtualThreshold: 100`            | 启用虚拟化，仅渲染视口内 + overscan 节点                                            | 否     | 滚动流畅，DOM 节点数远小于 200 |
| e2d-virtual-below         | 可见拍平节点数 50，`virtualThreshold: 100`             | 不启用虚拟化，保持当前全量渲染                                                      | 否     | 与基线一致                     |
| e2d-virtual-keyboard      | 虚拟化开启时方向键导航                                 | roving focus + `aria-activedescendant` 仍同步，滚动到不可见项时视口跟随             | 否     | 键盘可达全部节点               |
| e2d-lazy-expand           | 节点 A 标记懒加载，点击展开                            | 触发 `childrenSource` 刷新（参数=A 值），加载中显示 loading，到达后合并子节点       | 是     | 展开 → loading → 子节点出现    |
| e2d-lazy-error            | `childrenSource` 刷新失败                              | 节点显示 inline error + 重试入口；不破坏既有选中值                                  | 是     | 错误提示 + 可重试              |
| e2d-lazy-cascade-deferred | 懒加载父节点未加载子节点时，cascade indeterminate 派生 | 在子节点到达前，父节点 indeterminate 暂不派生（或按已知子集派生 —— Phase 4 裁定）   | 否     | 父节点选中态待子节点到达后校正 |
| e2d-remote-search         | `searchable` + `searchSource` 声明，输入 "abc"         | debounce 后触发 `searchSource` 刷新（query 依赖），结果替换 options；loading 态显示 | 是     | 输入 → loading → 远程结果列表  |
| e2d-remote-search-empty   | 远程搜索返回空                                         | 显示 zero-results empty state（与本地搜索 empty 一致）                              | 否     | 无结果提示                     |
| e2d-local-search-fallback | `searchable` 但无 `searchSource`                       | 保持当前本地子串过滤基线（不触发请求）                                              | 否     | 即时过滤                       |
| e2d-lazy-source-undefined | 节点标记懒加载但未声明 `childrenSource`                | dev schema warn；运行时退化为无子节点（不抛）                                       | 否     | 无 loading，节点无子项         |

## Test Strategy

档位选择：**建议有测**

本档选择：`建议有测`

理由：虚拟滚动/懒加载/远程搜索是树字段族的核心性能与数据路径能力，但非鉴权/对外 API 契约。虚拟化的「阈值启用 + 视口渲染」、懒加载的「展开触发 source + loading/error/重试」、远程搜索的「query 驱动 source + debounce + empty」是易回归契约，必须有 focused 单测验证（用 mock data-source controller + jsdom 虚拟化断言）。Proof 紧随 Fix，不强制 test-first。鉴权/API 契约级不适用（本 plan 不改对外 API）。

## Execution Plan

### Phase 1 - schema/契约裁定 + data-source 边界裁定 + 决策表准备

Status: completed
Targets: `packages/flux-renderers-form/src/schemas.ts`、`packages/flux-renderers-form-advanced/package.json`、`docs/components/input-tree/design.md`、`docs/components/tree-select/design.md`

- Item Types: `Decision | Fix`

- [x] **Decision**：虚拟化字段命名与阈值 —— 取 `virtualThreshold?: number`（number，默认 100，对齐 select；`0` 关闭）。不取 `virtual?: boolean`（语义模糊，与决策表 amis 命名不一致）。理由写入 design.md §4/§9 + 当日 log。
- [x] **Decision**：懒加载 source 契约形状 —— 取方案 (A) schema 级 `childrenSource`，但 shape 为 `TreeSourceConfig`（`Omit<SourceSchema, 'type'>` —— 不含 `type: 'source'`，避免被 `node-source-prop-controller` 递归扫描自动解析）；renderer 调用前重建 `{ type: 'source', ...config }` 经 `helpers.executeSource(...)` 触发。节点通过 `deferChildren?: true` 标记「子节点未加载」。请求引用约定：`${expandedNodeValue}`。理由写入 design.md §4/§9 + log。
- [x] **Decision**：远程搜索 source 契约 —— `searchSource?: TreeSourceConfig`，同懒加载 source 模式；`searchable` + 声明时 query 经 300ms debounce 驱动远程刷新；未声明走本地子串过滤（向后兼容）。请求引用约定：`${searchQuery}`。理由写入 design.md §9 + log。
- [x] **Decision**：X4 边界裁定 —— 三项能力均基于既有 runtime on-demand `executeSource` 入口（`runtime-factory.ts:423`/`helpers.executeSource`）实现，refreshDedup 复用 runtime data-source 层，不引入 X4 sendOn/initFetch gate。X4 落地后可回头精炼触发语义（non-blocking）。理由写入 log + plan `Non-Blocking Follow-ups`。
- [x] `InputTreeSchema`/`TreeSelectSchema` 新增 `virtualThreshold?: number` + `childrenSource?: TreeSourceConfig` + `searchSource?: TreeSourceConfig`（`schemas.ts`）
- [x] `flux-renderers-form-advanced/package.json` 新增 `@tanstack/react-virtual: ^3.13.24`（对齐 select 版本）
- [x] `input-tree/design.md` + `tree-select/design.md` §2 三行翻 `实现中（E2d）`；§4 schema + §9 数据源补 source 契约说明

Exit Criteria:

- [x] `pnpm install` 后 `@tanstack/react-virtual` 在 `flux-renderers-form-advanced` 可用；`pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck` 通过
- [x] schema 新字段类型可见；definition 注册新字段（`tree-controls.tsx` 两个 definition 的 `fields` 注册 `virtualThreshold`/`childrenSource`/`searchSource`，无 `allowSource`）
- [x] 两份 design.md §2 标 `实现中（E2d）`；§4/§9 同步；当日 log 记录四项 Decision 理由（含 X4 边界裁定）

### Phase 2 - 虚拟滚动（virtualThreshold）

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/tree-controls.tsx`、`docs/components/input-tree/design.md`、`docs/components/tree-select/design.md`

- Item Types: `Fix | Proof`

- [x] `TreeOptionList` 增加虚拟化分支：当「可见拍平节点数 >= virtualThreshold」时，用 `useVirtualizer` 渲染可见 + overscan 节点（参考 `VirtualizedComboboxList` 模式，`input-choice-renderers.tsx:197-246`）；否则保持当前全量递归渲染
- [x] 虚拟化容器保留 `role="tree"` + `aria-activedescendant` + roving tabIndex；方向键/Home/End 导航时滚动到不可见项（`scrollToIndex`/`scrollIntoView`）
- [x] 虚拟化与展开/折叠、cascade/indeterminate、searchable 过滤共存（过滤后按过滤结果计数决定是否虚拟化）
- [x] `TreeSelectRenderer` 的 popover 内 `TreeOptionList` 同样支持虚拟化（popover 高度约束 + 内部滚动）
- [x] focused 单测覆盖 Failure Path `e2d-virtual-threshold`/`e2d-virtual-below`/`e2d-virtual-keyboard`（断言 DOM treeitem 节点数 < 总数 when 虚拟化、= 总数 when 未虚拟化、键盘可达）

Exit Criteria:

- [x] 超阈值时仅渲染视口节点；未超阈值时与基线一致
- [x] 虚拟化下键盘导航 + `aria-activedescendant` 同步不漂移
- [x] `pnpm --filter @nop-chaos/flux-renderers-form-advanced test` 虚拟化用例全过；两份 design.md §2 虚拟滚动行翻 `实现`

### Phase 3 - 远程搜索（searchSource）

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/tree-control-controllers.ts`、`packages/flux-renderers-form-advanced/src/tree-controls.tsx`、`docs/components/input-tree/design.md`、`docs/components/tree-select/design.md`

- Item Types: `Fix | Proof`

- [x] controller：`searchable` + `searchSource` 声明时，query 变化经 debounce 后驱动 `searchSource` 刷新（query 作为 source request 依赖，走 runtime 自动刷新或显式 `refreshDataSource`）；结果替换 `options`（remote options），并显示 source loading/error 态
- [x] 未声明 `searchSource` 时保持当前本地子串过滤（Failure Path `e2d-local-search-fallback`）
- [x] 远程搜索结果为空时显示 zero-results empty state（复用既有 `Empty` 分支，`tree-controls.tsx:286-293`）
- [x] 远程搜索与虚拟化共存（结果列表可虚拟化）
- [x] focused 单测覆盖 Failure Path `e2d-remote-search`/`e2d-remote-search-empty`/`e2d-local-search-fallback`（mock data-source controller）

Exit Criteria:

- [x] `searchSource` 声明时 query 驱动远程刷新（debounce + loading + 结果替换）；未声明时本地过滤不变
- [x] 远程空结果有 empty state；与虚拟化共存
- [x] `pnpm --filter @nop-chaos/flux-renderers-form-advanced test` 远程搜索用例全过；两份 design.md §2 远程搜索行翻 `实现`

### Phase 4 - 异步懒加载（childrenSource）

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/tree-options.ts`、`packages/flux-renderers-form-advanced/src/tree-control-controllers.ts`、`packages/flux-renderers-form-advanced/src/tree-controls.tsx`、`docs/components/input-tree/design.md`、`docs/components/tree-select/design.md`

- Item Types: `Fix | Proof`

- [x] `tree-options.ts`：`TreeOptionMeta` 支持「子节点未加载」状态（`deferChildren?: boolean`）；新增 pure helper `mergeChildOptions`（按 parentValueKey 合并 childrenSource 返回的子节点 + `findOptionByValueKey`）
- [x] controller：展开标记为 `deferChildren` 的节点时，触发 `childrenSource` 刷新（参数=节点值），加载中节点显示 loading（chevron 替换为 Spinner），到达后合并子节点并重算 cascade indeterminate；失败显示 inline error + 重试（`tree-option-lazy-error`/`tree-option-lazy-retry` marker）
- [x] 懒加载与 cascade（E0b）共存：子节点到达后重算父节点 `deriveCheckedState`（Phase 4 裁定子节点未到达时按已知子集派生 —— 空子集 → 无 indeterminate，到达后重算变 mixed）
- [x] 懒加载与虚拟化、远程搜索（互斥 enabled）、onlyLeaf/showPathLabel 共存
- [x] 未声明 `childrenSource` 但节点标记 `deferChildren` 时 dev schema warn + 运行时退化为无子节点（Failure Path `e2d-lazy-source-undefined`）
- [x] focused 单测覆盖 Failure Path `e2d-lazy-expand`/`e2d-lazy-error`/`e2d-lazy-cascade-deferred`/`e2d-lazy-source-undefined`（含 retry 用例）

Exit Criteria:

- [x] 展开懒加载节点触发 source 拉取子节点，loading/error/重试成立，合并后 cascade 重算
- [x] 懒加载与虚拟化/远程搜索/cascade 共存无漂移
- [x] `pnpm --filter @nop-chaos/flux-renderers-form-advanced test` 懒加载用例全过；两份 design.md §2 异步懒加载行翻 `实现`

### Phase 5 - owner-doc 同步 + roadmap 收口

Status: completed
Targets: `docs/components/input-tree/design.md`、`docs/components/tree-select/design.md`、`docs/components/existing-components-improvement-roadmap.md`、`docs/components/amis-baseline-matrix.md`、`docs/logs/`

- Item Types: `Proof | Follow-up`

- [x] anti-hollow 抽查：虚拟化/远程搜索/懒加载真实在 input-tree + tree-select 运行时路径生效（非注册不可达）
- [x] 两份 design.md §2 无残留 `计划实现（E2d）`/`实现中（E2d）`；§4 schema（新字段）+ §9 数据源（source 契约 + 懒加载/远程搜索语义）+ 运行期状态节（加载/错误/展开态归属）同步
- [x] `existing-components-improvement-roadmap.md`：E2d `todo`→`done`（closure audit 通过后；不在本 phase 提前改）
- [x] `amis-baseline-matrix.md` input-tree/tree-select 行 retained 决策同步（无变化则标 No update required）
- [x] `docs/logs/` 当日条目汇总 E2d 全 phase + 验证结果

Exit Criteria:

- [x] 两份 design.md 无残留 E2d 占位标签
- [x] anti-hollow 抽查写入当日 log
- [x] `docs/logs/` 当日条目含 E2d 收口段

## Draft Review Record

> 待 `REVIEW_PLANS` flow step 由独立子 agent（fresh session）填写。

- Reviewer / Agent: fresh REVIEW_PLANS sub-agent (glm-5.2, 2026-06-21)
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed:
  - Minor: typo `e2d-lady-cascade-deferred` → `e2d-lazy-cascade-deferred`（Failure Paths 表 + Phase 4）已修正。
  - Minor: Phases 2/3/4 Exit Criteria 未单列 `docs/logs/` 行，但各 Phase 已含 design.md §2 owner-doc 更新项、且 Phase 5 集中收口当日 log —— 符合 guide rule 17，保留不改。
  - 格式完整、引用/Phase/Failure Path/Closure Gates 经核对一致；无 Blocker/Major。

## Closure Gates

> 关闭条件：本 section + 每 Phase Exit Criteria 全 `[x]`，且独立 closure audit 通过。

- [x] 虚拟滚动（virtualThreshold 阈值 + 视口渲染 + 键盘/aria 同步）live 且 focused 单测齐全
- [x] 远程搜索（searchSource + debounce + loading/error/empty + 本地回退）live 且 focused 单测齐全
- [x] 异步懒加载（childrenSource + 展开 loading/error/重试 + cascade 重算）live 且 focused 单测齐全
- [x] 三者与 cascade（E0b）/onlyLeaf/showPathLabel/键盘 roving focus/source 态共存无漂移
- [x] `input-tree/design.md` + `tree-select/design.md` §2/§4/§9 + 运行期状态节同步，决策表 E2d 行全 `实现`
- [x] `existing-components-improvement-roadmap.md` E2d `todo`→`done`
- [x] `amis-baseline-matrix.md` input-tree/tree-select 行同步（或 No update required）
- [x] anti-hollow：三项能力运行时可达，无空壳
- [x] X4 边界裁定落实：无应落地却降级 deferred 的 in-scope 能力；若某子项 deferred 已写明 non-blocking 理由
- [x] 独立子 agent closure-audit 已完成并记录证据（见 `## Closure` —— fresh-session independent closure auditor, 2026-06-21）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### `tree` 显示 renderer（data 包）的虚拟化

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `tree`（`packages/flux-renderers-data/src/tree-renderer.tsx`）是独立 UI 展示组件，采用 node template region 架构（无字段值绑定），其决策表（`tree/design.md`）无 E2d 标记。其虚拟化需求与 input-tree/tree-select 字段族的拍平模型不同，属不同结果面。本 plan 聚焦字段族共享的 `tree-options`/`TreeOptionList` 面。
- Successor Required: no
- Successor Path: 若 `tree` 显示组件后续有深树性能需求，独立评估其 region-template 虚拟化方案。

## Non-Blocking Follow-ups

- 节点 CRUD（creatable/editable/removable + 各 Api）后续按需（决策表 `暂不实现`），其 data-source 契约可复用本 plan 建立的 source 下沉模式。
- X4（data-source 请求层增强）落地后，可回头用 `sendOn`/initFetch gate 精炼本 plan 的懒加载/远程搜索触发语义（本 plan 的实现不阻塞，X4 为优化）。

## Closure

Status Note: E2d 全 5 Phase 执行完成。三项能力（虚拟滚动 virtualThreshold / 远程搜索 searchSource / 异步懒加载 childrenSource）均 live 且 focused 单测齐全（16 用例），与 cascade（E0b）/onlyLeaf/showPathLabel/键盘 roving focus/source 态共存。请求完全走 data-source runtime（on-demand `dispatch` + `helpers.evaluate`），不引入 X4 sendOn/initFetch gate。两份 design.md §2/§4/§9 同步，roadmap E2d `done`。Closure Gates 全 `[x]`（含独立子 agent closure-audit）。

Closure Audit Evidence:

- Reviewer / Agent: fresh-session independent closure auditor (glm-5.2, 2026-06-21, mission-driver `CLOSURE_AUDIT` step) —— 独立于执行 agent 的 fresh context，仅依据 plan 文本 + diff 摘要 + live repo 证据审查
- Verdict: `approved` —— 无 in-scope blocker，无被静默降级的 live defect / contract drift / owner-doc drift / 硬门禁失败项
- Audit Findings (verified against live repo):
  - **Phase 1（schema/契约）**：`packages/flux-renderers-form/src/schemas.ts:21,129,138,146,162-167` 真实定义 `TreeSourceConfig` + `InputTreeSchema`/`TreeSelectSchema` 新增 `virtualThreshold`/`childrenSource`/`searchSource`；`flux-renderers-form-advanced/package.json:25` 新增 `@tanstack/react-virtual: ^3.13.24`；两份 design.md §2 三行已 `实现中（E2d）`→`实现`，§4/§9 同步。Decision 落地。
  - **Phase 2（虚拟滚动）**：`packages/flux-renderers-form-advanced/src/tree-option-list.tsx:2,264,268` 真实 `import { useVirtualizer }` + `useVirtualizer({ count: visibleOptions.length, ... })`，threshold 裁剪 `visibleOptions.length >= virtualThreshold`，`scrollToIndex` 键盘跟随（L287）；`tree-controls.tsx:119,272` 透传 `virtualThreshold`；`tree-virtualization.test.tsx` 6 用例覆盖 e2d-virtual-threshold/-below/-keyboard + popover + virtualThreshold=0 + cascade 共存。非空壳。
  - **Phase 3（远程搜索）**：`tree-control-controllers.ts` `useTreeRemoteSearch`（L80-148）+ `executeTreeSource`（L113）真实调 `helpers.dispatch`/`helpers.evaluate` + debounce 300ms；`searchSource` 未声明时 `useTreeOptionListController` 走本地子串过滤基线；`tree-remote-search.test.tsx` 5 用例覆盖 e2d-remote-search/-empty/-local-fallback/-clear/-error。非空壳。
  - **Phase 4（异步懒加载）**：`tree-options.ts:22,307` `TreeOptionMeta.deferChildren` + `mergeChildOptions` pure helper；`tree-control-controllers.ts:176-264` `useTreeLazyChildren` 真实调 `executeTreeSource(childrenSource, helpers, { expandedNodeValue })`；`tree-controls.tsx` chevron→Spinner / `tree-option-lazy-error`+`tree-option-lazy-retry` marker；`tree-lazy-children.test.tsx` 5 用例覆盖 e2d-lazy-expand/-error/-retry/-cascade-deferred/-source-undefined。非空壳。
  - **Phase 5（owner-doc 同步 + roadmap）**：两份 design.md §2 无残留 `计划实现（E2d）`/`实现中（E2d）`；`existing-components-improvement-roadmap.md:50` E2d `done`；`docs/logs/2026/06-21.md` 含 5 段 Phase 1-5 + anti-hollow 抽查 + 验证结果（typecheck 49/49、build 26/26、lint 0 errors 1 pre-existing warning、test 729/729）。
  - **Deferred honesty**：`tree` 显示 renderer 虚拟化（`out-of-scope improvement` —— 独立 region-template 架构，其决策表无 E2d 标记）+ X4 sendOn/initFetch gate（`optimization candidate` —— 当前 on-demand `executeSource` 入口已满足三项能力，X4 为触发语义精炼）—— 均附带 non-blocking 理由，无 in-scope live defect 被静默降级。
  - **Five-point consistency**：`Plan Status: completed` / 5 个 Phase `Status: completed` / 每 Phase Exit Criteria 全 `[x]` / Closure Gates 全 `[x]` / Closure Evidence 真实 —— 一致。

Follow-up:

- X4 落地后可回头用 sendOn/initFetch gate 精炼懒加载/远程搜索触发语义（non-blocking，已记录在 `Non-Blocking Follow-ups`）
- 节点 CRUD 按需（决策表 `暂不实现`，非 live defect）
