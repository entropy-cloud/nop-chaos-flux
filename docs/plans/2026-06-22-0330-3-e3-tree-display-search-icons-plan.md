# E3 树展示组件 UX 增强（tree 搜索/过滤 + 节点图标/引导线）

> Plan Status: active
> Mission: components-improvement
> Work Item: E3 tree display（tree 选择/拖拽/搜索 子项 —— 搜索/图标部分；选择归 input-tree，拖拽裁定 Deferred）
> Last Reviewed: 2026-06-22
> Source: `docs/components/existing-components-improvement-roadmap.md`（E3 P2 行「tree 选择/拖拽/搜索」）、`docs/components/existing-components-improvement-detail.md` §C（tree L247-255）、`docs/components/tree/design.md` §2/§8
> Related: `docs/plans/2026-06-21-0255-x5-flux-decision-tables-plan.md`（X5 未覆盖 tree，本 plan 需扩展）、`docs/plans/2026-06-21-0722-e2d-tree-async-and-virtual-plan.md`（E2d：tree 显示 renderer 虚拟化 Deferred 为 out-of-scope，无 successor）

## Purpose

把 `tree`（展示树，`flux-renderers-data`）从**仅展开/收起 + 节点模板**补齐为**覆盖常见 P2 树展示 UX**：节点搜索/过滤 UI（本地子串过滤 + 自动展开匹配 + 高亮）、节点图标（从数据字段渲染）、缩进引导线（indentation guide-line）。

**范围裁定**（基于 design.md §8 L114-117 与 detail §C L253）：- **选择/值绑定/勾选级联**：**显式排除** —— design.md §1 L8、§8 L117、§11 L146-161 明确「表单语义留给 input-tree/tree-select」（E0b/E2d 已收口 input-tree/tree-select 的 cascade 半选）。`tree` 是 interaction-owner 展示组件，不做 form 字段值绑定。

- **拖拽**：**裁定 Deferred** —— 无共享 dnd 工具（E1c table 行拖拽为 table 专属原生 HTML5 DnD，不可复用；tree 拖拽是层级 DnD 比扁平列表复杂），design.md §8 L117 明确延后。本 plan 在 Phase 1 裁定并记录 non-blocking 理由。
- **异步懒加载/虚拟滚动**：**排除** —— E2d 已将 tree 显示 renderer 虚拟化 Deferred 为 `out-of-scope`（无 successor）；异步属 input-tree/tree-select 范围。

因此本 plan 聚焦 tree 展示组件的三个真实 UX 缺口：**搜索/过滤、节点图标、引导线**。这是单组件多能力，合并为单 owner plan（遵循 plan guide Rule 26）。

## Current Baseline

- `packages/flux-renderers-data/src/tree-renderer.tsx`：`TreeNodeRenderer` L122-387（递归节点渲染）、`TreeRenderer` L389-558（顶层组件）；`packages/flux-renderers-data/src/schemas.ts:154-166`（TreeSchema）字段 `data/childrenKey/labelField/keyField/node/empty/initiallyExpanded/expandOnClickNode/statusPath/multiple`。
- **搜索/过滤**：**完全无** —— 无 search input、无 query state、无过滤逻辑、无 `searchable` 字段。`multiple` 字段已声明但仅驱动 `aria-multiselectable`（L515/L532），**无选择逻辑**。
- **节点图标**：**完全无** —— 仅有 `ChevronRightIcon` 展开 chevron（L252/L261）；节点内容是 `node` region 模板或 fallback label 字符串（L343-347）。**无 `showIcon`/`iconField`**。注意 input-tree 的 `showIcon` 漂移已在 E0b 裁定（input-tree 专属），tree 展示组件独立。
- **引导线**：**完全无** —— 无缩进 guide-line CSS；仅靠 `Collapsible` 的 padding 缩进。
- **大批量缓解**：仅 `TREE_EXPANDED_CHILD_BATCH_SIZE = 50`（L14/L171-181/L192-218）增量挂载子节点（`setTimeout(0)`），**非视口虚拟化**。
- `docs/components/tree/design.md`（185 行，14 节）：§2「与 AMIS 的关系」是叙述节（L10-28），**无 Flux 决策表（X5 未覆盖）**；§8 L114-117 明确「先支持展开/收起；把更复杂的勾选级联、拖拽、编辑等能力放到后续阶段」；§11 L146-161 boundary handoff 到 input-tree/tree-select。
- E2d plan Deferred：tree 显示 renderer 虚拟化 = `out-of-scope improvement`，`Successor Required: no`，开放注记「若后续有深树性能需求，独立评估 region-template 虚拟化」。
- ui 层可用：`@nop-chaos/ui` Input（搜索框）、`resolveLucideIcon`（节点图标，来自 `@nop-chaos/ui`）、Tailwind `border-l`（引导线）。

## Goals

- `tree` 新增 `searchable?: boolean` + 搜索输入框 UI（本地子串过滤 labelField）；匹配节点自动展开祖先 + 高亮匹配文本；无匹配时显示 empty 提示。
- `tree` 新增 `showIcon?: boolean` + `iconField?: string`（从节点数据读图标名，经 `resolveLucideIcon` 渲染）；缺省不渲染图标（无回归）。
- `tree` 新增 `showGuideLine?: boolean`（缩进引导线 CSS，按 depth 渲染垂直线）。
- `tree/design.md` 新建 Flux 决策表节（§2，X5 扩展）。
- Phase 1 裁定拖拽：Deferred（`optimization candidate`）+ 记录 non-blocking 理由。
- focused 单测覆盖：搜索过滤 + 自动展开 + 高亮、图标渲染、引导线 class、缺省无回归。
- playground 示例 + e2e + `examples.manifest.json` 登记。

## Non-Goals

- 不实现选择/值绑定/勾选/checkbox/radio —— design.md §1/§8/§11 明确归 input-tree/tree-select（E0b/E2d 已收口）。
- 不实现节点拖拽 —— Phase 1 裁定 Deferred（无共享 dnd 工具 + 层级 DnD 复杂 + design.md §8 延后）。
- 不实现节点 CRUD（creatable/editable/removable）—— design.md §8 延后。
- 不实现异步懒加载 —— E2d 范围是 input-tree/tree-select；tree 显示异步独立评估。
- 不实现虚拟滚动 —— E2d 已 Deferred 为 out-of-scope。
- 不实现远程搜索（searchApi）—— 本地子串过滤已覆盖展示树场景；远程搜索归 data-source。
- 不实现 amis `nodeBehavior`/`itemActions`/`enableNodePath`/`unfoldedLevel` —— 归后续。
- 不覆盖 flex/page/tabs/input-number 等其它 E3 组件（归 Plan 1/2）。

## Scope

### In Scope

- `TreeSchema` 新增 `searchable?`/`showIcon?`/`iconField?`/`showGuideLine?`。
- TreeRenderer：搜索框（`searchable`）+ 本地过滤（labelField 子串）+ 自动展开匹配祖先 + 高亮；TreeNodeRenderer：节点图标（`showIcon`/`iconField`）+ 引导线（`showGuideLine`，按 depth）。
- `tree/design.md` 新建 Flux 决策表节（§2）。
- focused 单测（RED→GREEN）。
- playground 示例 + `examples.manifest.json` 登记 + e2e。

### Out Of Scope

- 选择/值绑定/勾选级联（归 input-tree/tree-select）。
- 节点拖拽（Deferred：层级 DnD + 无共享工具 + design.md 延后）。
- 节点 CRUD / 异步懒加载 / 虚拟滚动 / 远程搜索（归后续或已 Deferred）。

## Failure Paths

| 场景编号          | 触发                                 | 行为                                                 | 可重试 | 用户可见表现             |
| ----------------- | ------------------------------------ | ---------------------------------------------------- | ------ | ------------------------ |
| search-no-match   | 搜索词无任何节点匹配                 | 显示 empty 提示（复用 `empty` region 或默认文案）    | 否     | 树区显示「无匹配」       |
| search-clear      | 清空搜索词                           | 恢复完整树 + 展开/收起态回到搜索前快照               | 否     | 树恢复原状               |
| iconfield-missing | `showIcon:true` 但节点无 `iconField` | 该节点不渲染图标（不抛错），其余有字段的节点正常渲染 | 否     | 无图标节点留空           |
| icon-name-invalid | icon 名无法 resolve                  | `resolveLucideIcon` 兜底（已实现），不抛错           | 否     | 占位图标                 |
| search-deep-tree  | 深树 + 搜索匹配深层节点              | 自动展开所有匹配节点的祖先链（非全展开）             | 否     | 匹配节点可见，非匹配折叠 |

## Test Strategy

本档选择：`建议有测`

理由：搜索过滤是可观测逻辑（匹配/展开/高亮断言 DOM），图标渲染是 marker 断言，引导线是 class 断言。均可在 jsdom 观测。选择/拖拽/异步等高复杂项已排除。选「建议有测」：focused 单测覆盖可断言逻辑，e2e 覆盖搜索交互路径。不追求像素级视觉回归。

## Execution Plan

### Phase 1 - X5 决策表 + 拖拽裁定

Status: planned
Targets: `docs/components/tree/design.md`

- Item Types: `Decision`、`Fix`

- [ ] **Fix**：`tree/design.md` §2 新增 Flux 决策表子节（保留现有「与 AMIS 的关系」叙述，按 X5 模式补决策表，列：能力 / 采纳 / 不采纳 / 理由），列：`searchable`（实现）、`showIcon`/`iconField`（实现）、`showGuideLine`（实现）、选择/值绑定/勾选（不采纳 + 归 input-tree/tree-select 理由，引用 §8/§11）、节点拖拽（不采纳/后续 + 无共享 dnd 工具 + 层级 DnD 复杂 + 理由）、节点 CRUD（后续 + 理由）、异步懒加载（后续 + 归 input-tree 范围）、虚拟滚动（不采纳 + E2d 已 Deferred）、远程搜索（不采纳 + 归 data-source）。
- [ ] **Decision**：裁定搜索行为 —— 本地子串过滤 `labelField`；匹配节点自动展开祖先链（非全展开）；高亮匹配文本（`<mark>` 或 marker span）；清空搜索恢复搜索前展开快照。**open-state 管理要点**：当前 `TreeNodeRenderer` 各节点独立 `useState` 管开合（`tree-renderer.tsx:170`），搜索自动展开 + 快照恢复需从父 `TreeRenderer` 下发「search-forced-open」信号或 matched-paths 集合覆盖子节点本地态；本 Decision 需裁定该机制（受控展开覆盖 vs 提升开合态到父）。结论写入 `tree/design.md`。
- [ ] **Decision**：裁定 `showIcon` 与 `node` region 的关系 —— 若 `node` region 已自定义渲染图标，`showIcon`/`iconField` 是否叠加（裁定：`showIcon` 是便捷快捷方式，`node` region 自定义优先；两者同时存在时 region 优先，design.md 注明）。结论写入 design.md。
- [ ] **Decision**：裁定引导线实现 —— 按 depth 渲染垂直 `border-l`（Tailwind），`showGuideLine:true` 启用。结论写入 design.md。
- [ ] **Decision**：裁定拖拽 —— Deferred（`optimization candidate`）。理由：无共享 dnd 工具（E1c table 行拖拽 table 专属不可复用）；tree 拖拽是层级 DnD（跨层级移动、父子重排）比扁平列表复杂；design.md §8 L117 已明确延后。non-blocking：当前 tree 是展示组件，无值绑定，拖拽不影响展示契约成立。结论写入 design.md Deferred 节 + 本 plan Deferred But Adjudicated。

Exit Criteria:

- [ ] `tree/design.md` 含 §2 Flux 决策表节（live repo 可读，列含采纳/不采纳/理由）。
- [ ] 搜索行为/icon 与 region 关系/引导线/拖拽四条 Decision 结论明确，无歧义。

### Phase 2 - Focused Proof（RED 基线）

Status: planned
Targets: `packages/flux-renderers-data/src/__tests__/tree-display-ux.test.tsx`（新建）

- Item Types: `Proof`

- [ ] 新建测试文件，先写失败用例（RED）：
  - `searchable: true` → 渲染搜索输入框（marker `data-slot="tree-search-input"`）。
  - 输入匹配词 → 仅匹配节点可见（Failure Path `search-deep-tree`：深层匹配节点祖先链自动展开）。
  - 匹配节点 label 含高亮 marker（`data-slot="tree-search-highlight"`）。
  - 无匹配 → 显示 empty 提示（Failure Path `search-no-match`）。
  - 清空搜索 → 恢复完整树（Failure Path `search-clear`）。
  - `searchable` 缺省 → 无搜索框（无回归）。
  - `showIcon: true` + `iconField: 'icon'` + 节点有 icon 字段 → 渲染图标（marker `data-slot="tree-node-icon"`）。
  - `showIcon: true` 但节点无 iconField → 该节点无图标（Failure Path `iconfield-missing`）。
  - `showIcon` 缺省 → 无图标渲染（无回归，仅有 chevron）。
  - `showGuideLine: true` → 节点按 depth 应用引导线 class（marker `data-slot="tree-guide-line"` 或 border-l class）。
  - `showGuideLine` 缺省 → 无引导线（无回归）。

Exit Criteria:

- [ ] 测试文件存在，运行全部 RED。
- [ ] 用例覆盖 Goals 中搜索/图标/引导线所有可观测行为 + 五条 Failure Path。

### Phase 3 - schema + runtime 实现（GREEN）

Status: planned
Targets: `packages/flux-renderers-data/src/schemas.ts`、`packages/flux-renderers-data/src/tree-renderer.tsx`、`packages/flux-renderers-data/src/data-renderer-definitions.ts`

- Item Types: `Fix`

- [ ] `schemas.ts`：`TreeSchema` 新增 `searchable?: boolean`、`showIcon?: boolean`、`iconField?: string`、`showGuideLine?: boolean`。
- [ ] `tree-renderer.tsx`：TreeRenderer 新增搜索框（`searchable`）+ 本地过滤逻辑（子串匹配 labelField）+ 匹配节点祖先链自动展开 + 高亮 + 清空恢复快照（按 Phase 1 Decision）。
- [ ] `tree-renderer.tsx`：TreeNodeRenderer 新增节点图标（`showIcon`/`iconField`，经 `resolveLucideIcon`，按 Phase 1 Decision 与 region 优先级）+ 引导线（`showGuideLine`，按 depth border-l）。
- [ ] `data-renderer-definitions.ts`：tree renderer definition fields 注册新 prop（searchable/showIcon/iconField/showGuideLine 为 prop 非 region）。
- [ ] Phase 2 RED 用例全部转 GREEN。

Exit Criteria:

- [ ] Phase 2 全部用例 GREEN；既有 flux-renderers-data tree 测试套件无回归。
- [ ] live repo 核对：TreeRenderer/TreeNodeRenderer 真实读新字段（grep 非空），搜索过滤/图标/引导线 runtime 路径调用渲染逻辑（非空壳）。
- [ ] 局部 typecheck 通过（`pnpm --filter @nop-chaos/flux-renderers-data typecheck`）。

### Phase 4 - owner-doc 同步与 playground 示例

Status: planned
Targets: `docs/components/tree/design.md`、`apps/playground/src/`、`docs/components/examples.manifest.json`

- Item Types: `Fix`

- [ ] `tree/design.md` §4（schema）/§5（字段分类）/§9（node template，注 icon 与 region 关系）/§10（Empty State，注搜索无匹配提示）同步落地内容，与 runtime 一致；新增 DOM marker 说明（搜索框/图标/引导线/高亮 marker 记入 §9 或专用 marker 小节，design.md 当前无独立 DOM marker 节）。
- [ ] playground 新增「树展示 UX 增强」示例页（演示搜索过滤 + 高亮、节点图标、引导线），注册路由。
- [ ] `examples.manifest.json` 登记新示例。
- [ ] **e2e**：新增 `tests/e2e/tree-display-ux.spec.ts`，覆盖搜索输入过滤 + 自动展开匹配 + 高亮、清空恢复、节点图标渲染、引导线的关键交互路径（满足 roadmap Cross-Cutting「每个工作项必须有 e2e」硬约束）。

Exit Criteria:

- [ ] `tree/design.md` §4/§5/§9/§10 与 runtime 一致（live repo 可读）。
- [ ] playground 示例页存在且路由可访问；`examples.manifest.json` 含新条目。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，ses_1145243cffferrV4Wu00hQSta5）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Minor（§10 误标「DOM marker」，实为 Empty State）→ Phase 4 Targets 改为「§10（Empty State，注搜索无匹配提示）」+ DOM marker 说明记入 §9 或专用小节（design.md 当前无独立 DOM marker 节）。
  - Minor（§8 L112 引用对「input-tree 归属」声明偏弱）→ 改为 §8 L117（明确延后 cascade/drag/edit）。
  - Minor（「新建 §2」歧义，§2 已存在叙述）→ 改为「§2 新增 Flux 决策表子节（保留现有叙述，按 X5 模式补）」。
  - Minor（open-state 管理未在 Phase 1 Decision 显式）→ 搜索行为 Decision 补「open-state 管理要点」：当前 `TreeNodeRenderer` 各节点独立 `useState`（tree-renderer.tsx:170），搜索自动展开 + 快照恢复需父级下发 forced-open 信号或提升开合态。
  - 引用准确性：tree-renderer.tsx TreeNodeRenderer L122-387/TreeRenderer L389-558/chevron L252,261/node content L343-347/BATCH_SIZE L14,171-181,192-218/multiple 仅 aria L515,532、schemas.ts:154-166、design.md 14 节 185 行/§2 L10-28 叙述/§8 L114-117/§11 L146-161、E2d Deferred tree 虚拟化 out-of-scope Successor:no、无选择/值绑定/checkbox、无共享 dnd 工具（use-row-drag-sort table 专属）全部经 live repo 核对属实。
- 共识：零 Blocker、零 Major，Plan Status 升级为 `active`。

## Closure Gates

- [ ] tree 搜索/过滤（searchable + 自动展开 + 高亮 + 清空恢复）已落地且 focused 测试 GREEN
- [ ] tree 节点图标（showIcon/iconField）已落地且 focused 测试 GREEN
- [ ] tree 引导线（showGuideLine）已落地且 focused 测试 GREEN
- [ ] tree/design.md 含 Flux 决策表（X5 扩展完成）
- [ ] 拖拽裁定已落地（Deferred + non-blocking 理由记录）
- [ ] 缺省回退无回归（既有 flux-renderers-data tree 测试套件全过）
- [ ] playground 示例 + `examples.manifest.json` 登记
- [ ] `tests/e2e/tree-display-ux.spec.ts` 存在并覆盖关键交互路径
- [ ] 不存在被静默降级到 deferred 的 in-scope live defect 或 contract drift
- [ ] 受影响 owner docs（design.md §2/§4/§5/§9/§10）已同步到 live baseline
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### tree 节点拖拽（层级 DnD）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 无共享 dnd 工具（E1c table 行拖拽 `use-row-drag-sort.ts` 为 table 专属原生 HTML5 DnD，绑定 TableRowEntry + orderField 持久化契约，不可直接复用）；tree 拖拽是层级 DnD（跨层级移动、父子重排）比扁平列表复杂；design.md §8 L117 明确延后。当前 tree 是展示组件无值绑定，拖拽不影响展示契约成立。
- Successor Required: no

### tree 节点 CRUD（creatable/editable/removable）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: design.md §8 延后；CRUD 需 addApi/editApi/deleteApi 请求下沉 data-source + action，属独立编辑能力，非展示 UX。
- Successor Required: no

### tree 异步懒加载 / 虚拟滚动

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: E2d plan 已将 tree 显示 renderer 虚拟化 Deferred 为 `out-of-scope`（`Successor Required: no`）；异步懒加载属 input-tree/tree-select 范围（E2d 已收口）。当前 `TREE_EXPANDED_CHILD_BATCH_SIZE=50` 增量挂载缓解首屏。
- Successor Required: no

## Non-Blocking Follow-ups

- tree 远程搜索（searchApi）归 data-source + action（本地子串过滤已覆盖展示树）。
- amis `nodeBehavior`/`itemActions`/`enableNodePath`/`unfoldedLevel` 归后续评估。
- 若未来提取共享 `useFluxDragSort` 抽象（从 E1c table + 本 plan tree），tree 拖拽可重新评估。

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
