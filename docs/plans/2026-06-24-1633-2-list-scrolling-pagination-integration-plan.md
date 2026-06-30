# 2 list 集合分页与无限滚动集成（W1c successor）

> Plan Status: completed
> Last Reviewed: 2026-06-24
> Source: `docs/plans/2026-06-24-0040-3-w1c-list-collection-display-plan.md`（Deferred: list infinite-scroll/分页集成，Successor Required: yes）、`docs/components/roadmap.md`（W1d 表：infinite-scroll 内建于 crud/list）、`docs/components/list/design.md`
> Related: `docs/plans/2026-06-24-0335-1-w2a-data-composition-family-plan.md`（pagination）、`docs/plans/2026-06-22-2057-2-m5-mobile-native-components-plan.md`（infinite-scroll）

## Purpose

兑现 W1c 收口时记录的 successor 义务：为 `list` 集合 renderer 补齐「分页集成」与「infinite-scroll（触底加载更多）」两项能力。其依赖（W2a `pagination` done、W1d/M5 `infinite-scroll` done）均已满足，roadmap W1d 表亦明确「infinite-scroll 是内建于集合 renderer 的行为（crud / list 内建）」。本计划让 `list` 在不违反请求下沉约束的前提下，具备与 `crud` 一致的可观测分页/无限滚动行为。

## Current Baseline

- `list` renderer 已落地于 `packages/flux-renderers-data/src/list-renderer.tsx`（`ListRenderer` + `ListItemView`），随 `registerDataRenderers` 注册，单一 `items` 字段 + `item` region + `empty` value-or-region + `selectionMode` local controlled + `onItemClick`/`onSelectionChange`；roadmap W1c done、matrix `list` runtime。
- `list/design.md §7` 明示「首版不默认持有分页或排序状态」、§9「items 应优先接最终条目数组」——即首版只渲染静态/已装配 items，**未实现**分页与触底加载。
- 可复用的既成模式（同包 `crud`）：
  - `pagination: { mode: 'page' | 'infinite' }` + `paginationOwnership: 'local' | 'scope'` + `paginationStatePath` + `pageSizeStatePath`（参考 `crud-renderer-state.unit.test.tsx`、`crud-renderer-toolbar.tsx`）。
  - infinite 模式渲染 sentinel `[data-slot="crud-infinite-sentinel"]` + IntersectionObserver（`crud-lifecycle.test.tsx:347` 「CRUD infinite scroll (E1d)」），触底派发加载；`clientMode.loadDataOnce` 关闭触发；末页禁用（`crud-infinite-status`）。
- 独立 `pagination` renderer（W2a）已落地于 `flux-renderers-data`，`nop-pagination` marker，currentPage clamp 到 `[1, totalPages]`，是「交互 owner」（派发 onPageChange）。
- `infinite-scroll` renderer（M5）落地于 `packages/flux-renderers-mobile/src/infinite-scroll.tsx`，IntersectionObserver 触底加载、滚动祖先自动 root、in-flight guard。
- **同包既成可复用 hook**：`packages/flux-renderers-data/src/use-infinite-scroll.ts`（`useInfiniteScroll({ enabled, onLoadMore, sentinelRef })`，返回 `loading`/`error`/`reset`/`setLoading`/`setError`）已在 list 所在的 data 包内存在，crud infinite 即基于它；并暴露测试可注入 seam `setIntersectionObserverCtor()` 与 `window.__crudInfiniteObserver.__fireIntersection(target)`，供 Phase 3 Proof 程序化触发 IO。
- W1c deferred 项「list infinite-scroll / 分页集成」：Classification `out-of-scope improvement`、**Successor Required: yes**、Successor Path「W1d（infinite-scroll）/ W2a（pagination）」——两项依赖现已 done。

## Goals

- `list` 支持 `pagination` 集成：可声明分页状态归属（local/scope，三态分层对齐 crud 与 W3a/W4b 既有 value-ownership 模式），并能与独立 `pagination` renderer 组合（pagination 为交互 owner，list 消费 page 状态切片展示 + 派发 onPageChange）。
- `list` 支持 infinite 模式：opt-in 后渲染触底 sentinel + IntersectionObserver，派发 `onLoadMore`，末页/无更多时禁用，与 crud 的 infinite 行为可观测一致。
- 全程遵守请求下沉约束：`list` **零组件级请求字段**；数据加载经事件（onLoadMore/onPageChange）→ 宿主 action graph → data-source → scope items，list 只切片/展示。
- list design.md §7/§9 从「首版不持有分页」更新为诚实的最终分页/infinite 契约。

## Non-Goals

- 不新建 `list-mobile` 组件、不引入 `mobileUI` 标志位（roadmap/mobile-roadmap 立约禁止）。
- 不让 `list` 自身发起网络请求或声明 `api`/`source`/`initFetch` 等挂载触发字段（请求下沉硬约束）。
- 不实现 `list` 虚拟滚动（W1c deferred，Classification `optimization candidate`，Successor Required: no，待性能瓶颈实测）。
- 不重构 `crud` 的分页/infinite 实现；本计划只让 `list` 复用/对齐既有模式，不改 crud 契约。
- 不把 mobile `infinite-scroll` renderer 的代码物理搬入 data 包；list 的 infinite 行为在 data 包内实现（对齐 crud 内建模式），mobile infinite-scroll renderer 作为独立移动端容器另行存在。

## Scope

### In Scope

- `packages/flux-renderers-data/src/list-renderer.tsx`：分页状态切片 + infinite sentinel/IO 行为 + 事件派发。
- list schema（flux-renderers-data 内 ListSchema 定义处）+ field-rule：新增 `pagination`/`paginationOwnership`/`paginationStatePath`/`pageSizeStatePath`/`onLoadMore`/`onPageChange`（命名与 Phase 1 Decision 对齐）。
- `docs/components/list/design.md` §7/§9：更新为最终分页/infinite 契约。
- playground list 演示页（component-lab）增分页 + infinite 两类可交互示例；`tests/e2e/` 增 list 分页/infinite 关键路径 e2e。
- focused 单测：分页切片/clamp、infinite sentinel 触发/末页禁用、请求下沉零组件级请求字段断言。

### Out Of Scope

- 虚拟滚动、mobile `infinite-scroll` renderer 改动、crud 改造、selection scope-ownership 增强（W1c follow-up，watch-only）。

## Failure Paths

> 涉及事件契约与数据加载边界，填写以约束 happy-path 偏差。

| 场景                           | 触发                                    | 行为                                                   | 可重试 | 用户可见表现                                                |
| ------------------------------ | --------------------------------------- | ------------------------------------------------------ | ------ | ----------------------------------------------------------- |
| infinite 触底但宿主未接 loader | sentinel intersect、无 onLoadMore 消费  | 派发 onLoadMore 事件后无自动副作用（list 不自发请求）  | 否     | 列表不增长，sentinel 进入 loading 占位（如宿主提供 status） |
| 末页/无更多                    | `hasMore === false` 或 currentPage≥总页 | 不再派发 onLoadMore，sentinel 隐藏/置灰                | 否     | 触底不再触发加载                                            |
| page 越界                      | currentPage < 1 或 > totalPages         | clamp 到 [1, totalPages]                               | 否     | 显示首/末页                                                 |
| scope 缺 paginationStatePath   | paginationOwnership=scope 但路径无值    | 显式降级 + dev 告警（对齐 W4b steps 模式），不静默崩溃 | 否     | 列表正常渲染当前 items，控制台告警                          |

## Test Strategy

档位选择：`建议有测`

本档选择：建议有测——分页/infinite 是用户可感知的集合交互能力（非鉴权/对外 API），需 focused 单测覆盖切片/clamp/sentinel 触发/末页禁用 + 请求下沉断言，并配 e2e 覆盖关键交互路径（视口滚动、分页点击）。

## Execution Plan

### Phase 1 - 集成模型裁定（Decision + Proof）

Status: completed
Targets: `docs/components/list/design.md`、list schema 定义处（Phase 1 核实确切文件/行）

- Item Types: `Decision | Proof | Fix`

- [x] `Proof`：核实 list schema 当前定义位置与字段、crud 的 `pagination`/`paginationOwnership`/`paginationStatePath`/`pageSizeStatePath`/infinite sentinel 既成契约，确认 list 可对齐而不复制请求语义。
- [x] `Proof`：核实同包 `use-infinite-scroll.ts` hook 的入参/返回与测试 seam（`setIntersectionObserverCtor`/`window.__crudInfiniteObserver`），确认它可作为 list infinite 的复用基座（而非重写一份 IO）。
- [x] `Decision`：裁定 list 分页/infinite 集成契约——(a) 分页状态归属三态 `local`/`controlled`/`scope`（缺 scope 路径显式降级 + dev 告警，对齐 W4b steps）；(b) infinite 模式经 opt-in（如 `pagination.mode:'infinite'`）复用同包 `useInfiniteScroll` 渲染 sentinel + IntersectionObserver，派发 `onLoadMore`（list 不自发请求），而非重新实现 IO；确认复用不引入请求语义；(c) list 零组件级请求字段（请求下沉）；(d) 与独立 `pagination` renderer 组合边界（pagination 为交互 owner，list 消费 page 状态）。
- [x] `Fix`：按裁定更新 `list/design.md` §7（运行期状态归属，含三态 + infinite）、§9（数据接入点，明示经事件→action graph→data-source，list 不接 loader 字段）为最终契约。

**Phase 1 Decision Record（最终字段命名 + 行为裁定）**

- 字段命名（与同包 `crud`/`table` 对齐）：`pagination`（配置对象）、`paginationOwnership`（`local` | `controlled` | `scope`，默认 `local`）、`paginationStatePath`、`pageSizeStatePath`、`onPageChange`、`onLoadMore`。
- `pagination` 配置形状：`{ enabled?: boolean; mode?: 'page' | 'infinite'; pageSize?: number; pageSizeOptions?: number[]; currentPage?: number; total?: number; hasMore?: boolean; showSizeChanger?: boolean }`。
- 三态归属：`local`（组件内持有 currentPage，由 `pagination.currentPage` 播种）；`controlled`（纯视图，完全由 `pagination.currentPage` prop 驱动，不持有不写回）；`scope`（读写 `paginationStatePath`，可选 `pageSizeStatePath` 拆分 pageSize 通道）。`currentPage` 始终 clamp 到 `[1, totalPages]`，`totalPages = ceil(total / pageSize)`，`total` 缺省按 `items.length` 推导。
- infinite：opt-in = `pagination.enabled:true` + `pagination.mode:'infinite'`；复用同包 `useInfiniteScroll`（`packages/flux-renderers-data/src/use-infinite-scroll.ts`，含 `setIntersectionObserverCtor` / `window.__crudInfiniteObserver.__fireIntersection` 测试 seam）；sentinel `data-slot="list-infinite-sentinel"`，命名对齐 crud `crud-infinite-sentinel`；触底派发 `onLoadMore`（list 不自发请求），累计展示 `currentPage * pageSize` 条；`hasMore===false` 或 `currentPage >= totalPages` 时隐藏/禁用 sentinel。
- 请求下沉（硬约束）：list schema 零 `api`/`source`/`initFetch`/`action` 字段；数据经事件 → action graph → `<data-source>` → scope `items`。
- 与独立 `pagination` renderer 组合：pagination 为交互 owner（用户点击派发 onChange，宿主写 scope）；list 消费 page 状态切片，不内建分页 UI 控件。
- Proof 证据：list schema 现 fields `schemas.ts:203-212`；crud infinite sentinel `crud-renderer.tsx:483-490`；`use-infinite-scroll.ts:10-22,71-80`（ctor seam + window 全局）；crud 三态 ownership `crud-renderer-ownership.ts:48-65`。结论与 crud 既成模式一致。

Exit Criteria:

- [x] design.md §7/§9 反映可执行的最终分页/infinite 契约（含三态归属、infinite sentinel、请求下沉边界），无「首版不持有」等已被超越的措辞。
- [x] Decision 结论（字段命名 + 三态 + infinite 触发条件 + 末页/降级行为 + 是否复用 `useInfiniteScroll`）在本计划记录且与 crud 既成模式一致。

### Phase 2 - 分页集成（Fix）

Status: completed
Targets: `packages/flux-renderers-data/src/list-renderer.tsx`、list schema、field-rule

- Item Types: `Fix | Proof`

- [x] `Fix`：list 支持分页状态归属三态（local/controlled/scope）+ `paginationStatePath`/`pageSizeStatePath`，按 page/pageSize 对 items 切片展示，currentPage clamp 到 [1, totalPages]。
- [x] `Fix`：list 派发 `onPageChange`，可与独立 `pagination` renderer（交互 owner）组合；list 不内建分页 UI 控件（控件归 pagination renderer / 宿主）。
- [x] `Proof`：focused 单测——分页切片正确性、clamp 边界、scope 缺路径降级 + dev 告警、零组件级请求字段断言（grep list schema 无 `api`/`source`/`initFetch`）。

Exit Criteria:

- [x] list 在 local/scope 两态下按 page 切片且 clamp 正确（单测可观测断言）。
- [x] list schema 无组件级请求字段（请求下沉约束成立）。

### Phase 3 - infinite 模式集成（Fix）

Status: completed
Targets: `packages/flux-renderers-data/src/list-renderer.tsx`、list schema

- Item Types: `Fix | Proof`

- [x] `Fix`：list opt-in infinite 模式复用同包 `useInfiniteScroll` 渲染触底 sentinel（稳定 data-slot，对齐 crud `crud-infinite-sentinel` 命名风格），触底派发 `onLoadMore`（list 不自发请求）；`hasMore===false`/末页时禁用/隐藏 sentinel。
- [x] `Proof`：focused 单测——sentinel intersect 派发 onLoadMore、末页不再派发、降级场景不静默崩溃；经 `use-infinite-scroll.ts` 暴露的 `setIntersectionObserverCtor`/`window.__crudInfiniteObserver.__fireIntersection` 程序化触发 IO（对齐 crud `crud-lifecycle.test.tsx:347` E1d infinite 模式断言风格，非截图）。

Exit Criteria:

- [x] infinite 模式触底派发 onLoadMore 且末页禁用可经单测程序化断言（IO intersect 触发）。
- [x] list infinite 行为不引入组件级请求字段。

### Phase 4 - 注册/field-rule + playground + e2e + owner-doc 同步

Status: completed
Targets: `data-renderer-definitions.ts`、`apps/playground/src/`、`tests/e2e/`、`docs/components/list/design.md`、roadmap

- Item Types: `Fix | Proof | Follow-up`

- [x] `Fix`：list renderer definition/field-rule 补齐新字段（pagination/paginationOwnership/paginationStatePath/pageSizeStatePath/onLoadMore/onPageChange，命名以 Phase 1 Decision 为准）。
- [x] `Fix`：playground list 演示页增「分页（list + pagination 组合）」与「infinite（触底加载更多）」两类可交互示例，注册到 playground 路由/component-lab。
- [x] `Proof`：`tests/e2e/` 增 list 分页/infinite 关键路径 e2e（程序化断言：分页点击切片变化、视口滚动触底触发加载、末页停止），不靠截图诊断。
- [x] `Follow-up`：daily log 记录；本计划为 W1c deferred successor，closure 后在 W1c plan 的 deferred 项标注「已由 successor 收口」。

Exit Criteria:

- [x] list 新字段经 renderer definition/field-rule 注册，playground 有分页+infinite 两类可交互示例。
- [x] e2e 程序化断言覆盖分页切片 + 触底加载 + 末页停止关键路径。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，plan-review 角色）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Major（可想象性/引用准确性）→ 已直接修复：Current Baseline 与 Phase 1 Proof/Decision 未提及同包既成可复用 hook `packages/flux-renderers-data/src/use-infinite-scroll.ts`（crud infinite 即基于它，并暴露测试 seam `setIntersectionObserverCtor`/`window.__crudInfiniteObserver`）。Phase 1 Decision 本应裁定 infinite 集成模型，遗漏此资产会导致实现期「复用 vs 重写 IO」悬空。已在 Current Baseline 增条、Phase 1 增 `Proof`+扩展 `Decision`、Phase 1 Exit Criteria 与 Phase 3 Fix/Proof 同步对齐该 hook 及测试 seam。
  - Minor → 已直接修复：Phase 1 `Item Types` 声明 `Decision | Proof` 但实际含一项 `Fix`（更新 design.md），已补为 `Decision | Proof | Fix`。
- 引用准确性核对：list-renderer.tsx、crud-lifecycle.test.tsx:347（`describe('CRUD infinite scroll (E1d)')`）、infinite-scroll.tsx、W1c plan deferred 项（line 142-147，Successor Required: yes / W1d+W2a）、list/design.md §7(line 39)/§9(line 49) 全部经 live repo 核对通过。

## Closure Gates

- [x] list 分页集成（三态归属 + clamp + onPageChange + 与 pagination renderer 组合）行为落地且 focused 单测通过
- [x] list infinite 模式（sentinel + IO + onLoadMore + 末页禁用）行为落地且 focused 单测通过
- [x] list schema 零组件级请求字段（请求下沉约束成立，有断言）
- [x] list/design.md §7/§9 已同步为最终契约
- [x] playground 分页+infinite 示例 + e2e 关键路径（程序化断言）就位
- [x] 不存在被静默降级到 deferred/follow-up 的 in-scope 项
- [x] 受影响 owner docs（list/design.md、roadmap W1c deferred 标注）已同步
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### list 虚拟滚动

- Classification: `optimization candidate`
- Why Not Blocking Closure: 首版条目数未达性能瓶颈；`@tanstack/react-virtual` 已在 data 包可用，待大列表实测瓶颈再接入（继承 W1c 既有裁定）。
- Successor Required: `no`

## Non-Blocking Follow-ups

- list selection 的 controlled scope ownership 增强（继承 W1c follow-up，watch-only）。
- list 与 cards 条目模板复用评估（继承 W1c/W2a watch-only）。

## Closure

Status Note: W1c deferred successor 义务已兑现。`list` 集合 renderer 已具备分页（local/controlled/scope 三态归属 + clamp + onPageChange + gotoPage 能力，可与独立 pagination renderer 组合）与 infinite 触底加载（复用同包 useInfiniteScroll，sentinel + IO + onLoadMore + 末页禁用）两项能力，全程遵守请求下沉（list 零组件级请求字段）。所有 Phase 完成，Closure Gates 全勾，全量验证（typecheck/build/lint/test + e2e）全绿。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，ses_105b3281affebeS2q08arZAvqJ，general 类型），不复用执行 session 上下文。
- Verdict: `approved`（无 real gap；仅有机械性 post-audit 收尾 nit：Plan Status/Closure Gates/Closure 待翻转，现已执行）。
- Evidence（auditor 给出的 file:line 核对，已交叉验证）：
  - 切片语义真实：`list-renderer.tsx:143-152` `computeVisibleItems`（page 切片 + infinite 累计）。
  - clamp 真实：`list-pagination.ts:23-34` `clampPage`，应用于 `:157`/`:170`。
  - scope 归属真实：`list-pagination.ts:93-111` `useScopeSelector` 读 `paginationStatePath`；缺路径降级 + dev 告警 `:113-139`。
  - onLoadMore 触底派发真实：`list-renderer.tsx:296-300` 复用 `useInfiniteScroll` → `:272-294` `handleLoadMore` 派发；末页 sentinel 隐藏 `:269`/`:406-408`；hasMore 翻转 `list-pagination.ts:159-164`。
  - `useInfiniteScroll` 确为复用（`list-renderer.tsx:25` import），非重写。
  - 请求下沉成立：list 定义 `data-renderer-definitions.ts:517-684` 无 api/source/initFetch/action/interval/sendOn；`list-renderer.tsx` 无 fetch；单测断言 `list-pagination-infinite.test.tsx:221-232`。
  - 4 个 Phase 全 `Status: completed`、checklist/exit criteria 全 `[x]`；deferred（虚拟滚动）分类诚实；owner docs（list/design.md §7/§9、roadmap W1c、W1c plan deferred）已同步。
- 执行 session 验证：`pnpm typecheck`(55/55) + `pnpm build`(29/29) + `pnpm lint`(0 error) + `pnpm test`(全过，data 包 522) + `playwright test`(520 passed/0 failed)；focused 新单测 10/10、新 e2e 2/2。

Follow-up:

- W1c deferred「list infinite-scroll/分页集成」已由本 successor 收口（roadmap 与 W1c plan deferred 项均已标注）。
- 虚拟滚动保持 deferred（optimization candidate，Successor Required: no）。
- 继承的 watch-only 项：list selection controlled scope ownership 增强、list/cards 条目模板复用评估。
