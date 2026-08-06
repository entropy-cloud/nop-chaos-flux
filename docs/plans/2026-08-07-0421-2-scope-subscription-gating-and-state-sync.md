# 2 作用域订阅门控与状态同步治理（05-01/05-02/05-03/04-01）

> Plan Status: completed
> Mission: component-audit
> Work Item: Follow-up Backlog 作用域订阅门控与状态同步治理（05-01 / 05-02 / 05-03 / 04-01）
> Last Reviewed: 2026-08-07
> Source: `docs/audits/2026-08-06-0711-multi-audit-component-audit.md`（维度 05 ×3 + 维度 04 ×1，4 条 P2）、`docs/backlog/component-audit-roadmap.md`（Follow-up Backlog 2026-08-06-0711 节）
> Related: `docs/plans/2026-08-06-2306-2-create-scope-dispose-pairing.md`（completed，09-01/09-02 disposeScope 配对——同族订阅生命周期治理）、`docs/architecture/flux-runtime-module-boundaries.md`

## Purpose

收口 data/scheduling 族「作用域订阅无门控（死订阅）」与「props→state 双镜像同步链」两类状态治理发现：05-01/05-02（kanban/calendar 各 2 处 useScopeSelector 无 paths/enabled 门控）、05-03（table/list/crud 控制 hooks 族 10 处死订阅——非 scope 模式仍订阅）、04-01（TableRenderer stableColumns props→state 双镜像同步链）。修复形态统一为「按 ownership 模式 enabled 门控 + 同步链收敛」，消除非 scope 模式下的无效订阅渲染与双镜像回环风险。

## Current Baseline

- **4 条发现全部 open**（roadmap Follow-up Backlog 2026-08-06-0711 节，未勾选），来源审计维度复核通过。
- **live 核对（2026-08-07）**：
  - `kanban-board.tsx:61,72`——两处 `useScopeSelector` 无 `paths`/`enabled` 门控；对照同文件 kanbanOwnership 已有模式。
  - `use-calendar-ownership.ts:21,29`——两处 `useScopeSelector`（view/date）无门控；对照 calendar ownership 三态。
  - data 族控制 hooks：`use-table-pagination.ts:46`、`use-table-selection.ts:41`、`use-table-sort.ts:118,129`、`use-table-filter.ts:38`、`use-table-visible-columns.ts:44,50`、`use-column-resize.ts:156`、`list-pagination.ts:93`、`crud-renderer-ownership.ts:75`——共 10 处 `useScopeSelector`，均未按 `<ownership> === 'scope'` enabled 门控。
  - `table-renderer.tsx:166-183`——`stableColumns` useState 镜像 + `useEffect` props→state 同步链（prevRawRef 守卫 + startTransition）；审计建议 last-good ref 或 reportRuntimeHostIssue。
- **对照先例**：09-01/09-02（`2026-08-06-2306-2`）已建立「订阅/scope 生命周期配对」治理基线；`useScopeSelector` 的 `paths`/`enabled` 参数为 flux-react 既有能力（见 `docs/references/quick-reference.md`）。
- **验证基线**：CV full-green（2026-08-06）；data 包 723 单测绿、scheduling 包 872 单测绿。

## Goals

- 10 处死订阅（05-03，其中 use-table-visible-columns 与 crud-renderer-ownership 无独立 ownership prop，按路径存在性/既有 ownership 判定门控）+ kanban 2 处 + calendar 2 处（05-01/05-02）全部补 enabled 门控（`<ownership> === 'scope'` 或等价），非 scope 模式不再订阅。
- 04-01 stableColumns 双镜像收敛为 last-good render 期派生（审计 04-01 建议二选一：last-good 存 ref render 期派生，或连续无效走 `reportRuntimeHostIssue`），消除 props→state 回环。
- 每处修复带 focused 测试（先红后绿）：非 scope 模式零订阅、scope 模式订阅行为不变。

## Non-Goals

- 不做 ownership 三态语义本身的重新裁决（05-xx 只补门控，不改变各组件已声明的 ownership 契约）。
- 不处理 09-xx（已由 2306-2 完成）、22-xx（已由 2306-3 完成）。
- 不改 `useScopeSelector` 公共 API 签名（仅消费端加参）。
- 其余 Follow-up Backlog 条目（02-xx/10-xx/11-xx/12-xx/13-xx/18-xx/20-xx/O-P2-1/O-P2-2）不在本 plan。

## Scope

### In Scope

- scheduling：05-01（kanban-board.tsx 两处）、05-02（use-calendar-ownership.ts 两处）。
- data：05-03 十处（use-table-pagination/selection/sort/filter/visible-columns/column-resize、list-pagination、crud-renderer-ownership）；04-01（table-renderer.tsx stableColumns）。
- 每处 focused 测试 + 受影响 design.md 同步（kanban/calendar/table/crud/list 的 ownership 章节如已声明订阅行为）。

### Out Of Scope

- flow-designer/graph 域订阅治理（若有同型项，登记不修）。
- 10-xx/11-xx/12-xx/13-xx/18-xx/20-xx/O-P2-1/O-P2-2（后续轮次）。

## Failure Paths

> 不适用：无外部 IO/鉴权。风险形态为「门控误加导致 scope 模式功能回退」或「stableColumns 收敛后动态列更新失效」——由 focused 测试覆盖两种 ownership 模式。

## Test Strategy

本档选择：`必须自动化`（订阅门控是行为契约，非 scope 模式零订阅可断言；04-01 同步链收敛必须回归测试证明动态列更新仍工作）。

## Execution Plan

### Phase 1 - scheduling 族（05-01/05-02）

Status: completed
Targets: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx`、`packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-ownership.ts`

- Item Types: `Fix | Proof | Follow-up`

- [x] (Proof) 05-01：先写 kanban 测试（非 scope ownership 模式下 useScopeSelector 零订阅——以 spy 或订阅计数断言；scope 模式行为不变），红后实现 `kanban-board.tsx:61,72` 补门控——:61（board 订阅）按 `kanbanOwnership === 'scope'`，:72（collapsed 订阅）按 `collapsedOwnership === 'scope'`（:51 声明的独立 ownership prop，不可混用）。
- [x] (Proof) 05-02：先写 calendar ownership 测试（非 scope 模式零订阅），红后实现 `use-calendar-ownership.ts:21,29` 补门控。
- [x] (Follow-up) 确认 kanban/calendar 各自 ownership 三态文档（design.md）与实现一致，必要时一行同步。

Exit Criteria:

- [x] 2 项 focused 测试全绿（先红后绿）；scheduling 包 `typecheck && test` 通过。

### Phase 2 - data 控制 hooks 族（05-03）

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/use-table-pagination.ts`、`use-table-selection.ts`、`use-table-sort.ts`、`use-table-filter.ts`、`use-table-visible-columns.ts`、`use-column-resize.ts`、`list-pagination.ts`、`crud-renderer-ownership.ts`

- Item Types: `Fix | Proof`

- [x] (Proof) 先写 data 订阅门控测试（table/list/crud 在 local ownership 模式下对应 hooks 零订阅；scope 模式订阅行为不变），红后实现 10 处 `useScopeSelector` 补 `enabled: <ownership> === 'scope'`（及可收窄的 `paths`）。
- [x] (Decision) 对每处确认其 ownership 判定来源（paginationOwnership/selectionOwnership 等既有 prop）；无独立 ownership prop 的点（use-table-visible-columns.ts、crud-renderer-ownership.ts）按路径存在性/既有 ownership 判定门控，不引入新 prop。

Exit Criteria:

- [x] focused 测试全绿（先红后绿）；data 包 `typecheck && test` 通过。

### Phase 3 - table stableColumns 同步链（04-01）

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer.tsx:166-183`

- Item Types: `Fix | Proof`

- [x] (Proof) 先写动态列回归测试（columns 表达式变更 → 新列渲染；无效格式 → last-good 保留 + dev 警告），红后实现：stableColumns 收敛为审计 04-01 建议的 last-good 存 ref render 期派生（当前链无真回环——prevRawRef:172 守卫已防重入，本项治理的是双镜像冗余而非回环）。
- [x] (Fix) 移除或重构 `prevRawRef` + `useEffect` 双镜像（:166-183），确保无新增订阅/渲染回路。

Exit Criteria:

- [x] focused 测试全绿（先红后绿）；data 包 `typecheck && test` 通过。
- [x] live 抽查：动态 columns 更新路径（host 场景或既有 e2e 关联 spec）不回归。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_02740035bffeyHesdtJF0ketpb`，2026-08-07）
- Verdict: `pass-with-minors`
- Rounds: 1（零 Blocker / 零 Major）
- Findings addressed: 14 处 useScopeSelector 门控点逐行 live 核对全部属实；`enabled`/`paths` 参数语义经 flux-react hooks.ts 核实（enabled:false 时 subscribe no-op）；Minor×3 已修正——①kanban :72（collapsed 订阅）应门控 `collapsedOwnership`（:51）而非 kanbanOwnership，已拆分表述；②04-01 双镜像锚定审计原文两方案（last-good render 派生为主路径，reportRuntimeHostIssue 为可选），并澄清现链无真回环（prevRawRef 已防重入）；③visible-columns/crud 两处无 ownership prop 的门控语义已在 Goal/Phase 2 显式注明路径存在性判定。

## Closure Gates

- [x] 4 条 in-scope 发现全部修复，focused 测试全绿（先红后绿记录）
- [x] 10 处死订阅 + 4 处 kanban/calendar 全部门控，无静默跳过
- [x] 无 in-scope confirmed 状态治理缺陷被静默降级
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 04-01 last-good 派生与 reportRuntimeHostIssue 的取舍

- Classification: `watch-only residual`
- Why Not Blocking Closure: 审计 04-01 二选一（last-good render 派生 vs 连续无效走 reportRuntimeHostIssue）任一为合规终点；本 plan 已锚定 last-good 派生为主路径（现链无真回环，prevRawRef 已防重入），reportRuntimeHostIssue 属可选增强，Phase 3 测试绿即可 close。
- Successor Required: `no`

## Non-Blocking Follow-ups

- 若发现其他组件同型「非 scope 模式仍订阅」点（扫描超出清单），当场修复或登记 successor。

## Closure

Status Note: 全部 3 Phase 完成、Closure Gates 全勾选。14 处 useScopeSelector 门控（05-01/05-02/05-03）与 04-01 stableColumns 双镜像收敛均已落地并有 focused 测试（先红后绿：scheduling gating 10 fail→绿、data gating 8 fail→绿；04-01 T29 为行为保持守卫，Draft Review 已裁定现链无真回环故非 red-first）。工作区全绿：`pnpm typecheck`/`build`/`lint` 32/32、`pnpm test` exit 0（scheduling 875 + data 753 单测绿）；`pnpm check` 仅 `check:oversized-code-files` 命中 14 既有 registered 清单零新增；`check:audit-reactive-render-reads` 修复点 broad-scope-selector 零命中。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent（task `ses_026b2007bffeQzzLp36f9zuelS`，2026-08-07）
- Verdict: `approved`（0 Blocker / 0 Major）
- Evidence: 逐 site live 核对 14 处门控 options（enabled/paths 语义与 ownership 契约一致）、消费侧 undefined 安全（crud fallback / list equality）、04-01 双镜像移除且无 render 期 ref 读写；独立重跑 scheduling 76 files/875 tests、data 107 files/753 tests 全绿；roadmap 4 行 ❌→✅ 核对；deferred 项分类诚实（04-01 watch-only residual 有明确 non-blocking 理由）。Minor×3（non-blocking）：①daily log 条目（本 closure 提交已写入 `docs/logs/2026/08-07.md`）；②Phase 3 item 措辞「红后实现」与守卫测试性质（Draft Review Minor ② 已裁定）；③list-pagination scope-without-path 仍按 ownership 门控订阅（dev-warned 配置态，plan 承诺范围）。

Follow-up:

- 无 remaining plan-owned work。04-01 last-good 派生已 close；`reportRuntimeHostIssue` 可选增强不入本 plan（见 Deferred But Adjudicated）。
