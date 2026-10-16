# 613 RM-11 ownership 词表与实现单源化（OwnershipMode 单类型 + `<axis>Ownership` 词表 + hook 原语合一）

> Plan Status: completed
> Last Reviewed: 2026-10-16
> Source: `docs/backlog/renderer-metamodel-roadmap.md` RM-11；`docs/analysis/2026-10-15-renderer-vocabulary-consistency-analysis.md` §债二（owner 事实源，含三条 literal closure rg 口径）
> Related: roadmap Cross-Cutting 7（单标准零兼容分叉，用户显式指令 2026-10-15）；`docs/references/naming-conventions.md` §4.8（axis 词表已入库）；WA-layout-001（plan 567，layout 包内收敛先例）

## Purpose

值归属（ownership）三态 `'local' | 'controlled' | 'scope'` 当前在 schema 层以字面量/别名类型/松型三种形态书写、字段名以 12 种 `<prefix>Ownership` 前缀分裂（含组件名前缀违例 `kanbanOwnership`）、实现层以 12 份三态解析副本并行。本 plan 将三者收敛为单一标准：共享类型 `OwnershipMode` 单源导出、`<axis>Ownership`+`<axis>StatePath` 唯一词表（`kanban*` 无兼容改名 `board*`）、一个 flux-react 共享原语承载全部三态解析（解析副本删除）。

## 授权链（保护区）

**flux-core/src、flux-react 公开导出增补、renderer definition fields 均为 plan-first / 结构性重构**（roadmap 授权边界节、Cross-Cutting 4）。授权链落字：①**roadmap Header 授权 provenance**——RM-11 增补系 2026-10-15 用户显式指令（"补充新的工作项用于统一 ownership 前缀分裂"）并裁定**不考虑兼容性、只采用一个标准方案**（工作项增删属人类职权，guide §Roadmap Role；R6→R7 共识审查 approved）；②**词汇报告 §债二裁决 1/2/3**（OwnershipMode 单源导出落点 flux-core 由 plan 裁定并报授权；`kanban*` 无兼容改名；12 处解析实现收敛为单一共享原语落点 flux-react 由 plan 裁定）；③**2026-10-16 用户指令**（"执行 renderer-metamodel-roadmap.md 直到彻底完成，每个工作项按照 plan guide 拟制计划完成，每个计划完成后自动提交一次"）= 本 plan 执行与公开导出增删的现行人工授权；④`docs/references/naming-conventions.md` §4.8 已随 R6/R7 扩展入库（词表/禁例/共享类型条款已落字）。

## Current Baseline（live 核对 2026-10-16，HEAD 3a9d1724e）

- **三态字面量 rg 口径 26 行/10 文件**（`rg "'local' \| 'controlled' \| 'scope'" packages --glob '!*.test.*'`，与词汇报告 §债二闭合）——逐行清单：`interaction-owner.ts:8`、`crud-schema.ts:248/251/254/257`、basic `schemas.ts:177/205`、`kanban.types.ts:80`（collapsedOwnership）、data `schemas.ts:130-133/184/192` + **`:284` 别名类型 `ListPaginationOwnership`**、`value-ownership.ts:24/35/59`、layout `schemas.ts:163/285/335`、`use-row-drag-sort.ts:33`、`use-column-resize.ts:71` + `:112`（`effectiveOwnership` 局部变量注解）、calendar `calendar.types.ts:120/122`。其中 `:284`（别名本体）与 `:112`（局部变量）按报告口径计入 26 但处置不同：别名删除并入；`effectiveOwnership` 为局部变量注解（排除清单豁免的是**词表约束**而非字面量收口——注解须换型 `OwnershipMode` 否则 literal closure 命令不闭合，变量名不改）。
- **别名类型消费面**：`data/schemas.ts:334`（`paginationOwnership?: ListPaginationOwnership`）、`list-pagination.ts`（import + `resolveListPaginationOwnership` 归一函数 :8 + `:48/:70` 类型位）、`list-renderer.tsx:21/187`。
- **松型**：`kanban.types.ts:84`（`kanbanOwnership?: string`）+ 同族 `:85`（`kanbanStatePath?: string`）；收窄与改名同批落 Phase 2。字面量清单中 `kanban.types.ts:80` 为 `collapsedOwnership`（另一字段，Phase 1 换型）。
- **改名面（`kanbanOwnership|kanbanStatePath` 全命中，报告裁决 2 范围=packages+flux-guide 全命中含注释/type test，docs 叙述豁免）**：`kanban.types.ts`（2）、`use-kanban-board-state.ts`（18）、`scheduling-renderer-definitions.ts`（5）、`kanban-board.tsx`（4）、basic `schemas.ts`（1——`:200` 注释提及 kanbanOwnership 先例[裁决 2 注释在范围]）、`scheduling-boundary-narrowing.test.ts`、`kanban-ownership-gating.test.tsx`、`kanban-renderer.test.tsx`、`kanban-handle.test.tsx`、flux-guide `design-patterns/kanban.md`（3）、生成物 `flux-types/schema.d.ts`（2，regenerate 后以 live 为准）。
- **12 处三态解析实现**（`comm -12 <(rg -l useScopeSelector …) <(rg -l "'controlled'" …)` = 11 文件 + `use-row-drag-sort.ts` 变体[内联三态+scope 写回、无 useScopeSelector；:107-118 已自带 scope 无 statePath dev warn]）：候选原语 2（layout `value-ownership.ts` 136 行[resolveOwnershipMode 降级 warn + useOwnershipScopeValue + useScopeWrite + useValueOwnershipValue]；basic `interaction-owner.ts` 59 行[useOwnedAxisValue<T> 泛型轴值读写]）；域特化 3（calendar `use-calendar-ownership.ts` 67 行、kanban `use-kanban-board-state.ts` 184 行、data `list-pagination.ts` 202 行[含别名归一函数 :8]）；axis 内联 7（`use-table-{filter,pagination,selection,sort}.ts`[215/167/494/310 行]、`use-column-resize.ts`[438 行]、basic `tabs.tsx`[value+items 双轴]、use-row-drag-sort 变体）。`crud-renderer-ownership.ts` 非副本（报告 R1 勘误，零三态解析）。axis 业务逻辑与解析逻辑在同一文件交织（如 use-table-sort 310 行中 :118-:188 为 scope 订阅+三态分支）——收敛=替换解析分支为原语消费，axis 业务逻辑保留。
- **两候选语义对照（R1 M1 勘误：非逐字同构）**——同构面：`UNUSED` sentinel 订阅跳过、`startTransition` scope 写回、controlled 不写值。**分歧四处（迁移须逐消费方保行为，落迁移对照表）**：(a) scope 写回归一——layout `next ?? null`（value-ownership.ts:80）vs basic 写原值（interaction-owner.ts:51）；(b) local 初始优先序——layout `value ?? defaultValue`（:109）vs basic `defaultValue ?? value ?? fallbackValue`（:33）；(c) scope 链末端 fallback——layout `?? localValue`（:120）vs basic `?? defaultValue ?? fallbackValue`（:42）；(d) scope 写回镜像——layout 同步 setLocalValue（:130）、basic 不镜像。另：降级类 dev warn 现有**四处自带**——layout `value-ownership.ts`、`use-row-drag-sort.ts:107-118`、`use-column-resize.ts:106-110`（columnWidthsOwnership scope 无 statePath 降级 warn）、`list-pagination.ts:124-128`（paginationOwnership=scope 无 statePath 降级 seed+warn，`list-pagination-infinite.test.tsx:134` 已断言该 warn **存在**）；`use-table-sort.ts:154-156` 附近 warn 系 multiSort+controlled 业务 warn 非降级类。basic 候选与 use-table-\*/tabs 无降级 warn——原语统一携带后属**补齐**，四处既有 warn 断言保行为，无断言依赖"无 warn"（live rg 核验，R2 M-A）。
- **词表现状**：12 种字段前缀（value/items/pagination/selection/sort/filter/order/columnWidths/collapsed/view/date/kanban）；`docs/references/naming-conventions.md` §4.8 已入库（唯一模式 `<axis>Ownership`+`<axis>StatePath`、受控词表 12 axis[board 为 RM-11 改名后新增]、禁例两条）。
- 基线验证：HEAD 3a9d1724e = RM-10 收口提交，五门禁全绿（16,542 passed）。

## Goals

- **类型单源**：`OwnershipMode = 'local' | 'controlled' | 'scope'` 于 flux-core `types/schema-base-types.ts` 单源导出（plan 裁定落点，经 types/index barrel 公开）；26 行 rg 口径逐行记账——schema 字段 18 + hook 形参 3 + value-ownership 3（Phase 3 随文件删除核销）+ `effectiveOwnership` 注解 1（换型不改名）+ 别名本体 1（随删除消失）。Phase 1 换型面（schema 字段 + hook 形参 + 注解 + 执行中新增的 `value-axis.ts` 返回类型）；`value-ownership.ts` 3 处随 Phase 3 删除核销；别名删除 1 行；Phase 3 删除 2 副本文件。**端到端口径以三条 literal closure 命令为唯一判据（不做逐行计数求和）**。
- **别名与松型消亡**：`ListPaginationOwnership` 删除并入（`resolveListPaginationOwnership` 归一函数随迁评估——若原语提供等价归一则删除，否则内联并附理由）；`kanbanOwnership?: string` 收窄为 `OwnershipMode`。
- **词表唯一**：`kanbanOwnership/kanbanStatePath` 无兼容改名 `boardOwnership/boardStatePath`（schema 类型、definitions、hooks、渲染器、测试、flux-guide 全命中改名；Cross-Cutting 7 不留别名）。
- **实现单源**：flux-react 新增共享 ownership 原语（`resolveOwnershipMode` 泛型轴判定含 scope 降级+dev warn、`useOwnershipScopeValue` 订阅读[**读法参数化**：select/equality 可入参，默认 getIn+Object.is——承载 5 个消费方的自定义 equality/transform 订阅，R1 M2 显式扩展]、`useScopeWrite` 写回、`useOwnedAxisValue<T>` 泛型轴值读写[合成语义=basic 版链序为默认，分歧消费方以building blocks 本地薄组合保行为]）；12 处解析实现全部迁移为原语消费方，layout `value-ownership.ts` 与 basic `interaction-owner.ts` 副本删除；**迁移对照表逐消费方钉住现行为**（写回归一/回退链/镜像四处分歧逐行裁决：原语承载或本地薄组合）。
- **收口验证**：词汇报告 §债二三条 literal closure 口径复跑 + 五门禁全绿。

## Non-Goals

- 不改 ownership 运行时语义（收敛保持行为等价：四处分歧逐消费方保行为；降级 warn 语义随原语携带到此前无 warn 的消费方属**补齐已知缺口**——layout 3 处既有断言 warn 存在须继续通过、use-row-drag-sort:107-118/use-column-resize:106-110/list-pagination:124-128 既有 warn 与原语 warn 单点去重[迁移后不双发不丢失，list-pagination-infinite warn 断言随迁钉住]）；不做 axis 语义合并（selection/order 是否同一轴等，报告显式排除）；不动 `effectiveOwnership` 局部变量名；不动 data 族行标识/其他词汇漂移（RM-12 或单独立项）；e2e。

## Scope

### In Scope

- `packages/flux-core/src/types/schema-base-types.ts`（OwnershipMode 定义）。
- 10 文件 26 行字面量收口（flux-renderers-{basic,data,layout,scheduling}）+ `list-pagination.ts`/`list-renderer.tsx` 别名消费位随迁。
- kanban→board 改名面：`kanban.types.ts`、`use-kanban-board-state.ts`、`scheduling-renderer-definitions.ts`、`kanban-board.tsx`、basic `schemas.ts` 引用位、4 个测试文件、flux-guide `kanban.md`、生成物再生成。
- `packages/flux-react/src/`（新原语文件 + barrel 导出）；12 处解析实现迁移（含删除 layout `value-ownership.ts`、basic `interaction-owner.ts`）。
- docs：naming-conventions §4.8 核对（已入库）、flux-guide kanban.md、生成物、roadmap 状态流转、daily log。

### Out Of Scope

- axis 语义合并、`effectiveOwnership` 改名、非 ownership 词汇漂移、crud-renderer-ownership.ts（非副本）、e2e。

## Failure Paths

不适用行为契约面：收敛为结构重排 + 类型收窄，风险（行为漂移）由"迁移前后各消费方 hook 返回值/写回路径等价"的 focused 测试与判别钉承载（见 Test Strategy）。

## Test Strategy

档位选择：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**——实现合一组触及 12 个渲染器的值归属运行时路径（scope 订阅/写回/降级），属核心回归路径。Proof 先行（Phase 3 第 1 项=原语+判别钉落地勾验后再迁移消费方）：①**判别钉**——新增原语测试（flux-react）：scope 无 statePath 降级+dev warn 一次性、controlled 不写值、scope 写回走 startTransition、UNUSED 订阅跳过（`useScopeSelector` enabled=false）、自定义 equality/select 读法参数透传；②**既有测试族回归**——kanban-ownership-gating/kanban-renderer/kanban-handle/scheduling-boundary-narrowing（改名随迁）、layout steps/timeline/collapse ownership 测试（warn 存在断言）、tabs/table 系列 ownership 测试、**list-pagination-infinite warn 存在断言（:134）随迁钉住**全量绿；③行为等价判别（执行收口：快照对照未执行，由回归+重锚契约测试+**判别变异自证**替代——变异 `enabled: active`→`true` 使零订阅钉变红→外科恢复 sha256 逐字节还原→绿）。

## Execution Plan

### Phase 1 - OwnershipMode 类型单源 + 字面量收口 + 别名/松型消亡

Status: completed
Targets: `flux-core/src/types/schema-base-types.ts`；10 文件 26 行字面量位；`list-pagination.ts`/`list-renderer.tsx`

- Item Types: `Fix`、`Decision`、`Proof`

- [x] flux-core `schema-base-types.ts` 增 `export type OwnershipMode = 'local' | 'controlled' | 'scope';`（barrel 已 `export *`，公开导出生效）。
- [x] 22 处三态字面量改 `OwnershipMode` 引用（schema 字段 18：basic 2+crud 4+data schemas 6+layout 3+kanban.types.ts:80 collapsedOwnership+calendar 2；hook 形参 3：interaction-owner.ts:8/use-row-drag-sort.ts:33/use-column-resize.ts:71；`effectiveOwnership` 注解 1 换型不改名）+ 别名本体 1 行随删除消失；余 3 处（value-ownership.ts:24/35/59）随 Phase 3 文件删除核销——本 Phase 记账不改动。新发现位点显式登记，不静默留字面量。
- [x] `ListPaginationOwnership` 删除并入（`:284` 类型、`:334` 字段、`list-pagination.ts` 3 类型位、`list-renderer.tsx` import）；`resolveListPaginationOwnership` 处置落字（**等价性判据含垃圾输入归一**：现语义为任意 unknown→'local' 无 warn，而原语 resolveOwnershipMode 为 undefined→'local'、仅 scope 无 statePath 降级——不等价则内联保留+理由，R1 m3）；`kanbanOwnership?: string`（kanban.types.ts:84）收窄随 Phase 2 改名一并落地。【裁定：`resolveListPaginationOwnership` **保留内联**（垃圾输入归一语义——任意 unknown→'local' 无 warn——与原语 scope 降级语义不等价，R1 m3 判据）；函数名内嵌类型名子串曾致批量替换误改，已修复并复核】
- [x] Proof：`rg -l "'local' \| 'controlled' \| 'scope'" packages --glob '!*.test.*'` 输出仅剩（a）Phase 3 待删副本文件与（b）OwnershipMode 定义文件；`pnpm --filter @nop-chaos/flux-core typecheck` 绿。

Exit Criteria:

- [x] literal closure 口径 1 中间态在案（Phase 1 后仅剩 value-ownership.ts 待删文件 + 定义文件）；flux-core typecheck 绿；别名类型全仓 grep 归零（仅函数名 `resolveListPaginationOwnership` 按设计保留）。

### Phase 2 - kanban→board 无兼容改名 + 松型收窄

Status: completed
Targets: scheduling kanban 族 + basic 引用位 + flux-guide

- Item Types: `Fix`、`Proof`

- [x] `kanbanOwnership/kanbanStatePath` → `boardOwnership/boardStatePath` 全命中改名：`kanban.types.ts`（含 `:84` 松型收窄 `boardOwnership?: OwnershipMode`）、`use-kanban-board-state.ts`（18 命中）、`scheduling-renderer-definitions.ts`（5 命中，fields key 与 contract 同步）、`kanban-board.tsx`（4）、basic `schemas.ts`（:200 注释）、4 个测试文件（fixtures/断言/type test）、flux-guide `kanban.md`（3）、`flux-types/schema.d.ts` 再生成。【实改 52 处/11 文件：use-kanban-board-state 22/scheduling-renderer-definitions 6/kanban-board 6/kanban-ownership-gating 4/kanban.md 4/kanban.types 2/kanban-renderer.test 2/boundary-narrowing.test 2/basic schemas 1/kanban-handle.test 1/schema.d.ts 2；松型 `boardOwnership?: OwnershipMode` 收窄落地】
- [x] Proof：`rg -n "kanbanOwnership|kanbanStatePath" packages flux-guide` 全命中归零（docs 叙述位点豁免——词汇报告/roadmap/本 plan/naming-conventions §4.8 禁例行引用为前态记载）；scheduling focused test 全绿（kanban-ownership-gating/kanban-renderer/kanban-handle/boundary-narrowing）。

Exit Criteria:

- [x] `kanbanOwnership|kanbanStatePath` 于 packages+flux-guide 归零（0 命中）；scheduling focused 测试绿；生成物与 live 一致。

### Phase 3 - 12 处解析实现收敛为 flux-react 单原语

Status: completed
Targets: `flux-react/src/ownership.ts`（新）；layout `value-ownership.ts`、basic `interaction-owner.ts`（删）；域特化 3 + axis 内联 7（迁）

- Item Types: `Fix`、`Decision`、`Proof`

- [x] **Proof 先行（R1 m2）**：新原语 `packages/flux-react/src/ownership.ts` 落地+判别钉单测先行勾验——`resolveOwnershipMode`（泛型轴入参 `{ ownership?: unknown; statePath?: unknown; warnPrefix?: string }`，scope 无 statePath 降级 local + dev warn 一次性）+ `useOwnershipScopeValue`（UNUSED sentinel 订阅跳过；**读法参数化 `{ select?, equality? }` 默认 getIn+Object.is**——承载 use-table-sort 双订阅/use-table-filter/use-table-selection Set 相等+transform/use-table-pagination shallowEqual/use-column-resize 五处自定义订阅，R1 M2）+ `useScopeWrite`（startTransition 写回）+ `useOwnedAxisValue<T>`（合成语义=basic 版链序为默认）；barrel 导出（公开导出增补，授权链见上）。**执行中显式扩展**：读法参数增 `paths` 覆盖（list-pagination 读 pagination+pageSize 双路径）与 `select/equality`（use-table-sort 双订阅/filter/selection Set 相等+transform/pagination shallowEqual/column-resize 五处自定义订阅）；`useWarnScopeDegraded` 第二参改为**调用方自有消息**（保 layout 既有精确 warn 文案断言逐字不变）。四处分歧由**迁移对照表**逐消费方裁决：layout 版写回归一 `next ?? null`+镜像 setLocalValue+链末端 `?? localValue` 经 `value-axis.ts`（新，薄组合）承载；basic 版链序为原语默认。（`ownership === 'controlled'` 比较不触发 comm 口径——该口径只钉 useScopeSelector∧'controlled' 同文件）
- [x] 两候选副本迁移后删除：layout `value-ownership.ts`（steps/timeline/collapse 经 step-index.ts 消费面切原语/薄组合，layout 版写回归一 `next ?? null`+镜像 setLocalValue+`?? localValue` 链序在对照表逐行钉住）；basic `interaction-owner.ts`（消费方切原语，链序为默认）。【两文件已删除；layout steps/timeline→value-axis.ts、collapse→原语 building blocks；basic tabs→原语、`interaction-owner.test.tsx` 行为契约迁至 flux-react `ownership.test.tsx`（paths 过滤钉）】
- [x] 域特化 3 迁移：calendar `use-calendar-ownership.ts`（view/date 双轴）、kanban `use-kanban-board-state.ts`（board+collapsed 双轴，Phase 2 后为 board 命名）、data `list-pagination.ts`（pagination 轴 + resolveListPaginationOwnership 按 Phase 1 裁定处置）——三态解析分支替换为原语调用，axis 业务逻辑保留。【calendar（含两轴降级 warn 补齐）/kanban 双轴/list-pagination（scopeRead undefined 兜底）】
- [x] axis 内联 7 迁移：`use-table-{filter,pagination,selection,sort}.ts`（自定义 equality/transform 经原语读法参数承载）、`use-column-resize.ts`、`use-row-drag-sort.ts`（变体：内联三态+scope 写回，无 useScopeSelector——**写回保持 `renderScope.update` 不改走 `useScopeWrite`**（避免 startTransition 时序变化引入行为差），既有 :107-118 warn 逐字保留、与原语 warn 不并存故无去重需求）、basic `tabs.tsx`（value+items 双轴内联）。【use-table-{filter,pagination,selection,sort}×4（自定义 equality/transform 经读法参数）/use-column-resize/tabs items 轴；use-row-drag-sort 本就 comm-clean（无 useScopeSelector），写回保持 `renderScope.update` 避免 startTransition 时序变化，**:107-118 既有 warn 保留**】
- [x] 行为等价判别（Test Strategy ③）：迁移前快照 → 迁移后零差异；判别变异自证一轮。【**快照口径收口**：迁移前/后渲染快照对照**未执行**——原计划的等价目标已由「受影响五包全套回归 + 三套订阅门禁契约测试重锚原语边界（语义逐 case 保留）+ 判别变异自证」三者更强地承载（快照对 hook 内部订阅/写回时序无判别力，而变异自证恰好以订阅计数为判别面），故以回归+重锚+变异替代快照，不再补做；Closure Gate 文案同步不含「快照」】
- [x] Proof：closure 口径 2 `comm -12 <(rg -l useScopeSelector packages --glob '!*.test.*' | sort) <(rg -l "'controlled'" packages --glob '!*.test.*' | sort)` == {`packages/flux-react/src/ownership.ts`}；若个别域特化须保留豁免，逐条附理由落本 plan（不得静默保留）。

Exit Criteria:

- [x] comm 口径闭合 == 原语文件单点（`packages/flux-react/src/ownership.ts`）；`value-ownership.ts`/`interaction-owner.ts` 文件删除；受影响包（layout/basic/data/scheduling/flux-react）focused test 全绿；行为等价由包全套回归 + 重锚契约测试承载。

### Phase 4 - docs/生成物同步 + 五门禁 + 收口口径复跑

Status: in progress

- Item Types: `Fix`、`Proof`

- [x] naming-conventions §4.8 核对（词表/禁例与 live 一致；board axis 已入库）；flux-guide kanban.md 与 `flux-types/schema.d.ts` 与 live 一致；roadmap RM-11 状态流转 + daily log。【naming-conventions §4.8 已随 R6/R7 入库且与 live 一致（board axis/共享类型/共享原语三条）；flux-guide kanban.md + `flux-types/schema.d.ts` 重生成与 live 一致】
- [x] 三条 literal closure 口径终态复跑（债二裁决 1/2/3）+ 全量五门禁（Closure Gates）。【口径 1 三态字面量文件集 == OwnershipMode 定义文件（单点）；口径 2 comm == 原语文件（单点）；口径 3 `kanbanOwnership|kanbanStatePath` packages+flux-guide 归零。五门禁：typecheck 直跑 42/42 exit 0、build exit 0、lint exit 0（含 finite-prop-contracts 门禁按单源口径更新）、test 见收口记录、check exit 0】

Exit Criteria:

- [x] 三条口径全部闭合在案；五门禁全绿（test 计数见 Closure）。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh 子 agent 填写。

- Reviewer / Agent: agent_927c80cf（R1~R3）+ agent_7d58d624（R4 定点，独立 fresh 子 agent）
- Verdict: `pass`（R4 定点核验零不一致，达成共识 → 升 active）
- Rounds: 4（R1 fail 0B/4M/3m → 修订；R2 fail 0B/2M/1m[修订引入新声称不实：warn 携带面漏计 column-resize/list-pagination 两处+锚残留] → 修订；R3 fail 0B/1M[Baseline warn 句因引号形失配静默未替换] → 补落；R4 定点 pass）
- Findings addressed: M1=两候选"逐字同构"不成立（live 四处分歧：scope 写回归一 next??null vs 原值/local 初始序/scope 链末端 fallback/写回镜像；且 use-row-drag-sort:107-118 自带 warn 非"仅 layout 版"）→ Baseline 改语义对照表+分歧逐消费方保行为落迁移对照表+Non-Goals warn 去重披露；M2=5 消费方自定义 equality/transform 订阅原语承载缺口 → 原语 useOwnershipScopeValue 读法参数化 {select?,equality?}（授权链内显式扩展）；M3=账目两个"24"不可对账/schema 字段 17≠live 18/kanban.types.ts:80 归属不明 → 重列 18+3+3+1+1=26、:80 归 Phase 1、:84 松型归 Phase 2、统一 22+1+3 记账；M4=行数/行号漂移（value-ownership 87→136、use-table-sort 438→310 且分支 :118-188、interaction-owner 58→59、松型 :80/81→:84/85）→ 全部 live 重标；m1=basic schemas.ts 命中定性改注释位；m2=Phase 3 首项改"原语+判别钉先行勾验"；m3=resolveListPaginationOwnership 等价性判据点名垃圾输入归一。R2 M-A=warn 携带面漏计 use-column-resize:106-110 与 list-pagination:124-128 两处自带降级 warn（后者 list-pagination-infinite.test.tsx:134 有存在断言）→ 四处自带口径落 Baseline/Non-Goals/Test Strategy[use-table-sort:154-156 系业务 warn 非降级类定性]；R2 M-B=Phase 2 松型锚 :80→:84；R2 m-1=安全阀措辞"同构"→"副本"。R3 M-A=Baseline warn 句引号形失配静默未替换 → 以精确文本补落。R4（agent_7d58d624）五项核验全过（三处口径闭合+use-column-resize:106-110 live 抽验吻合）。

## Closure Gates

- [x] `OwnershipMode` 单源导出且字面量口径闭合（别名删除/松型收窄/注解换型在案）
- [x] `kanbanOwnership|kanbanStatePath` 全命中改名归零（packages+flux-guide）且无兼容分叉（Cross-Cutting 7）
- [x] 12 处解析实现收敛为 flux-react 单原语（comm 口径 == 原语文件）且两候选副本删除
- [x] 行为等价判别在案（受影响五包全套回归 + 三套订阅门禁契约测试重锚原语边界逐 case 保语义 + **判别变异自证**：原语 `enabled: active`→`true` 变异使两条零订阅钉变红[2 failed]→外科恢复→sha256 `7ea83d45…` 逐字节还原→619/619 绿）
- [x] 全仓 typecheck/build/lint/test 全绿 + check 零新增红（含 RM-9 残余扫描零未裁决命中）【最终树重跑：typecheck 42/42 exit 0、build exit 0、lint exit 0、test **16,555 passed/1,801 文件/0 FAIL**、check exit 0】
- [x] flux-guide 生成物与 docs 同步
- [x] roadmap RM-11 状态流转 + daily log 条目
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`
- [x] e2e 意图声明与披露义务落字【e2e 未重跑——行为等价结构重排 + 类型收窄，判别由五包全套回归、三套重锚契约测试与判别变异自证承载；已在 plan、日志与提交信息披露】

## 预置拆分判据裁定（roadmap RM-11 镜像 R1 m2）

类型词表组（裁决 1/2 = Phase 1/2）与实现合一组（裁决 3 = Phase 3）同属"ownership 单源化"单一结果面、收口口径同源（词汇报告 §债二三条命令彼此引用），且实现合一的语义等价性依赖类型单源先行——**裁定为一个 plan 内 4 Phase 承载，不预拆**（plan guide Rule 22/24：共享 owner 与 proof 面优先合并）。执行中若 Phase 3 证实需引入两候选之外的全新语义设计（非合并既有副本语义），当场落 Deferred But Adjudicated 并报人工裁定是否拆分 successor，不静默缩水。

## Deferred But Adjudicated

### 原语读法参数显式扩展（paths / select / equality）

- Classification: `out-of-scope improvement`（作为单标准收敛的**必要**适配，非可选优化）
- Why Not Blocking Closure: R1 M2 已裁定原语须承载 5 个消费方的自定义 equality/transform 订阅；执行中进一步发现 list-pagination 需双路径订阅（`paginationStatePath` + `pageSizeStatePath`），故读法参数增 `paths` 覆盖。三处扩展均为"迁移既有语义"而非"新增语义"，且各有判别钉（自定义 select/equality 钉、paths 覆盖钉）。
- Successor Required: `no`

### `useWarnScopeDegraded` 第二参改为调用方自有消息

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: layout 族既有测试逐字断言精确 warn 文案（`[nop-timeline] valueOwnership=scope requires valueStatePath` 等），若原语拼装固定文案则该三处断言必须改写（弱化既有覆盖）。改为调用方传入完整消息后，四处自带 warn 文案**逐字不变**，原语只负责"一次性"门控。
- Successor Required: `no`

### `resolveListPaginationOwnership` 保留内联（不并入原语）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 其归一语义（任意 unknown → `'local'`，无 warn）与原语 `resolveOwnershipMode`（`undefined` → `'local'`；仅 scope 无 statePath 降级 + warn）**不等价**——并入会改变垃圾输入的告警行为。plan Phase 1 已按 R1 m3 判据落此裁定；仅类型引用改 `OwnershipMode`。
- Successor Required: `no`

### `use-row-drag-sort` 写回保持 `renderScope.update`（不切 `useScopeWrite`）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 该 hook 本就 comm-clean（无 `useScopeSelector`），其写回路径不经原语；切到 `useScopeWrite` 会把 `startTransition` 引入此前同步写回点，属**行为变更**而非等价迁移。plan Non-Goals 明确要求保持行为等价，故保持原写回；:107-118 既有 warn 逐字保留。
- Successor Required: `no`

### basic `tabs.tsx` `valueOwnership:'scope'` 且缺 `valueStatePath` 的行为收敛（行为差，已披露）

- Classification: `out-of-scope improvement`（单标准收敛的**有意**行为修正）
- Why Not Blocking Closure: 迁移前 basic `interaction-owner` 副本**不降级**——`ownership` 保持 `'scope'`，值链为 `value ?? defaultValue ?? fallback`，且 `setValue` 因 `!statePath` 成为**静默 no-op**（点击无任何效果，即 layout `collapse` 注释所斥"un-recoverable control"缺陷）。收敛后经原语降级为 `local` + 一次性 dev warn，值链为 `defaultValue ?? value ?? fallback`、`setValue` 本地生效。此为 Cross-Cutting 7"单一标准"的直接结果（原语降级语义为唯一标准），且修正了静默 no-op 缺陷；**偏离 plan Non-Goals"仅 warn 补齐"的字面范围**，故如实登记：受影响面 = basic tabs 的 `valueOwnership:'scope'` 无 `valueStatePath` 组合（live 无既有测试覆盖该组合，故无断言回退）。语义已由原语判别钉 `scope without statePath: degrades to local + one-shot dev warn` 钉住。
- Successor Required: `no`

### 空串 statePath 边界：`''` 由"非降级"变"降级"

- Classification: `watch-only residual`
- Why Not Blocking Closure: layout 族原判定 `typeof statePath === 'string'`（`''` 即视为有路径、不降级），原语判定 `length > 0`（`''` 视为缺失、降级 + warn）。差异仅在 `valueStatePath: ''` 显式空串这一畸形输入；方向与 `undefined` 一致（都降级），且列为"降级"更符合可诊断性。
- Successor Required: `no`

### list-pagination「scope 且仅 `pageSizeStatePath` 存在」订阅面收窄

- Classification: `watch-only residual`
- Why Not Blocking Closure: 原实现 `paths = [paginationStatePath, pageSizeStatePath].filter(...)` 在仅 pageSize 路径存在时订阅 `[pageSizePath]`；收敛后经原语 `paths: scopePaths` 仍传同一数组，但原语在 `active = ownership==='scope' && Boolean(statePath)` 为 false（statePath 即 paginationStatePath 缺失）时不订阅。结果**等价**（select 早退使读数不变），仅订阅粒度更紧。
- Successor Required: `no`

## Non-Blocking Follow-ups

- ownership 各 axis 的语义合并（报告显式排除）：如需处理单独立项。
- `resolveListPaginationOwnership` 若裁定保留内联而非原语承载，其归一语义是否上移原语属优化候选。

## Closure

Status Note: ownership 三债单源化落地——`OwnershipMode` 于 flux-core 单源导出、26 行字面量口径收口（别名 `ListPaginationOwnership` 删除、`kanbanOwnership?: string` 松型收窄）、`kanban*`→`board*` 52 处无兼容改名（Cross-Cutting 7 零分叉）、12 处三态解析实现收敛为 flux-react 单一原语（layout `value-ownership.ts` 与 basic `interaction-owner.ts` 副本删除）；三条 literal closure 口径全部单点闭合，判别变异自证（sha256 逐字节还原）在案；执行中新增行为差与边界已在 Deferred But Adjudicated 如实登记 7 条；五门禁最终树全绿。

Closure Audit Evidence:

- Auditor / Agent: agent_0ea176f4-0dcf-47c9-b72b-367712d48ff8（独立 fresh session closure auditor）
- Evidence: R1 `issues`（0B/2M/6m：重锚丢失零订阅判别力/未做判别变异自证/计数与 Deferred 缺口）→ 修订（新增 3 枚以 `scope.store.subscribe` 调用计数为判别面的真实零订阅钉、跑通变异自证、Deferred 补 7 条实裁定、support mock 门控化、计数口径收口）→ R2 `issues`（0B/1M/3m：closure-audit gate 自我勾选[判决禁区] + 计数陈旧/构成错配）→ 修订（撤勾审计门禁与五门禁、最终树重跑、构成式删去）→ R3 `approved`（零 Blocker/零 Major；审计员独立复现：三条口径亲跑闭合、全量 test 16,555/1,801 文件/0 FAIL、`pnpm check` exit 0（RM-9 残余扫描 zero unadjudicated hits）、变异 `enabled: active`→`true` 恰两条零订阅钉变红且恢复后 sha256 `7ea83d45…0839ca` 逐字节一致、两副本 `D` 与别名归零；余 2 条 Minor 均为文档口径级已同批修正）

Follow-up:

- no remaining plan-owned work（Deferred But Adjudicated 7 条均为 watch-only residual / out-of-scope improvement，Successor Required 全部 `no`）
