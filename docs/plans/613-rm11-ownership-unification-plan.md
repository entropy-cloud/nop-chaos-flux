# 613 RM-11 ownership 词表与实现单源化（OwnershipMode 单类型 + `<axis>Ownership` 词表 + hook 原语合一）

> Plan Status: active
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

- **类型单源**：`OwnershipMode = 'local' | 'controlled' | 'scope'` 于 flux-core `types/schema-base-types.ts` 单源导出（plan 裁定落点，经 types/index barrel 公开）；26 行 rg 口径逐行记账——schema 字段 18 + hook 形参 3 + value-ownership 3（Phase 3 随文件删除核销）+ `effectiveOwnership` 注解 1（换型不改名）+ 别名本体 1（随删除消失）；Phase 1 落地 22 处换型 + 别名删除，Phase 3 核销余 3 处+2 副本文件。
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

本档选择：**必须自动化**——实现合一组触及 12 个渲染器的值归属运行时路径（scope 订阅/写回/降级），属核心回归路径。Proof 先行（Phase 3 第 1 项=原语+判别钉落地勾验后再迁移消费方）：①**判别钉**——新增原语测试（flux-react）：scope 无 statePath 降级+dev warn 一次性、controlled 不写值、scope 写回走 startTransition、UNUSED 订阅跳过（`useScopeSelector` enabled=false）、自定义 equality/select 读法参数透传；②**既有测试族回归**——kanban-ownership-gating/kanban-renderer/kanban-handle/scheduling-boundary-narrowing（改名随迁）、layout steps/timeline/collapse ownership 测试（warn 存在断言）、tabs/table 系列 ownership 测试、**list-pagination-infinite warn 存在断言（:134）随迁钉住**全量绿；③行为等价判别：迁移前对 `useValueOwnershipValue`/`useOwnedAxisValue` 的消费方快照（如 steps 当前值序列）迁移后零差异（判别变异自证：在旧副本上注入受控值丢失变异→红→外科恢复→绿）。

## Execution Plan

### Phase 1 - OwnershipMode 类型单源 + 字面量收口 + 别名/松型消亡

Status: planned
Targets: `flux-core/src/types/schema-base-types.ts`；10 文件 26 行字面量位；`list-pagination.ts`/`list-renderer.tsx`

- Item Types: `Fix`、`Decision`、`Proof`

- [ ] flux-core `schema-base-types.ts` 增 `export type OwnershipMode = 'local' | 'controlled' | 'scope';`（barrel 已 `export *`，公开导出生效）。
- [ ] 22 处三态字面量改 `OwnershipMode` 引用（schema 字段 18：basic 2+crud 4+data schemas 6+layout 3+kanban.types.ts:80 collapsedOwnership+calendar 2；hook 形参 3：interaction-owner.ts:8/use-row-drag-sort.ts:33/use-column-resize.ts:71；`effectiveOwnership` 注解 1 换型不改名）+ 别名本体 1 行随删除消失；余 3 处（value-ownership.ts:24/35/59）随 Phase 3 文件删除核销——本 Phase 记账不改动。新发现位点显式登记，不静默留字面量。
- [ ] `ListPaginationOwnership` 删除并入（`:284` 类型、`:334` 字段、`list-pagination.ts` 3 类型位、`list-renderer.tsx` import）；`resolveListPaginationOwnership` 处置落字（**等价性判据含垃圾输入归一**：现语义为任意 unknown→'local' 无 warn，而原语 resolveOwnershipMode 为 undefined→'local'、仅 scope 无 statePath 降级——不等价则内联保留+理由，R1 m3）；`kanbanOwnership?: string`（kanban.types.ts:84）收窄随 Phase 2 改名一并落地。
- [ ] Proof：`rg -l "'local' \| 'controlled' \| 'scope'" packages --glob '!*.test.*'` 输出仅剩（a）Phase 3 待删副本文件与（b）OwnershipMode 定义文件；`pnpm --filter @nop-chaos/flux-core typecheck` 绿。

Exit Criteria:

- [ ] literal closure 口径 1 中间态在案（仅剩 Phase 3 待删文件 + 定义文件）；flux-core typecheck 绿；别名类型全仓 grep 归零。

### Phase 2 - kanban→board 无兼容改名 + 松型收窄

Status: planned
Targets: scheduling kanban 族 + basic 引用位 + flux-guide

- Item Types: `Fix`、`Proof`

- [ ] `kanbanOwnership/kanbanStatePath` → `boardOwnership/boardStatePath` 全命中改名：`kanban.types.ts`（含 `:84` 松型收窄 `boardOwnership?: OwnershipMode`）、`use-kanban-board-state.ts`（18 命中）、`scheduling-renderer-definitions.ts`（5 命中，fields key 与 contract 同步）、`kanban-board.tsx`（4）、basic `schemas.ts`（:200 注释）、4 个测试文件（fixtures/断言/type test）、flux-guide `kanban.md`（3）、`flux-types/schema.d.ts` 再生成。
- [ ] Proof：`rg -n "kanbanOwnership|kanbanStatePath" packages flux-guide` 全命中归零（docs 叙述位点豁免——词汇报告/roadmap/本 plan/naming-conventions §4.8 禁例行引用为前态记载）；scheduling focused test 全绿（kanban-ownership-gating/kanban-renderer/kanban-handle/boundary-narrowing）。

Exit Criteria:

- [ ] `kanbanOwnership|kanbanStatePath` 于 packages+flux-guide 归零；scheduling focused 测试绿；生成物与 live 一致。

### Phase 3 - 12 处解析实现收敛为 flux-react 单原语

Status: planned
Targets: `flux-react/src/ownership.ts`（新）；layout `value-ownership.ts`、basic `interaction-owner.ts`（删）；域特化 3 + axis 内联 7（迁）

- Item Types: `Fix`、`Decision`、`Proof`

- [ ] **Proof 先行（R1 m2）**：新原语 `packages/flux-react/src/ownership.ts` 落地+判别钉单测先行勾验——`resolveOwnershipMode`（泛型轴入参 `{ ownership?: unknown; statePath?: unknown; warnPrefix?: string }`，scope 无 statePath 降级 local + dev warn 一次性）+ `useOwnershipScopeValue`（UNUSED sentinel 订阅跳过；**读法参数化 `{ select?, equality? }` 默认 getIn+Object.is**——承载 use-table-sort 双订阅/use-table-filter/use-table-selection Set 相等+transform/use-table-pagination shallowEqual/use-column-resize 五处自定义订阅，R1 M2）+ `useScopeWrite`（startTransition 写回）+ `useOwnedAxisValue<T>`（合成语义=basic 版链序为默认）；barrel 导出（公开导出增补，授权链见上）。四处分歧（Baseline 对照 (a)~(d)）由**迁移对照表**逐消费方裁决：原语参数承载或消费方以 building blocks 本地薄组合（`ownership === 'controlled'` 比较不触发 comm 口径——该口径只钉 useScopeSelector∧'controlled' 同文件）。
- [ ] 两候选副本迁移后删除：layout `value-ownership.ts`（steps/timeline/collapse 经 step-index.ts 消费面切原语/薄组合，layout 版写回归一 `next ?? null`+镜像 setLocalValue+`?? localValue` 链序在对照表逐行钉住）；basic `interaction-owner.ts`（消费方切原语，链序为默认）。
- [ ] 域特化 3 迁移：calendar `use-calendar-ownership.ts`（view/date 双轴）、kanban `use-kanban-board-state.ts`（board+collapsed 双轴，Phase 2 后为 board 命名）、data `list-pagination.ts`（pagination 轴 + resolveListPaginationOwnership 按 Phase 1 裁定处置）——三态解析分支替换为原语调用，axis 业务逻辑保留。
- [ ] axis 内联 7 迁移：`use-table-{filter,pagination,selection,sort}.ts`（自定义 equality/transform 经原语读法参数承载）、`use-column-resize.ts`、`use-row-drag-sort.ts`（变体：内联三态+scope 写回，无 useScopeSelector——写回切原语出口，既有 :107-118 warn 与原语 warn 单点去重）、basic `tabs.tsx`（value+items 双轴内联）。
- [ ] 行为等价判别（Test Strategy ③）：迁移前快照 → 迁移后零差异；判别变异自证一轮。
- [ ] Proof：closure 口径 2 `comm -12 <(rg -l useScopeSelector packages --glob '!*.test.*' | sort) <(rg -l "'controlled'" packages --glob '!*.test.*' | sort)` == {`packages/flux-react/src/ownership.ts`}；若个别域特化须保留豁免，逐条附理由落本 plan（不得静默保留）。

Exit Criteria:

- [ ] comm 口径闭合 == 原语文件单点；`value-ownership.ts`/`interaction-owner.ts` 文件删除；受影响包（layout/basic/data/scheduling）focused test 全绿；行为等价快照零差异。

### Phase 4 - docs/生成物同步 + 五门禁 + 收口口径复跑

Status: planned

- Item Types: `Fix`、`Proof`

- [ ] naming-conventions §4.8 核对（词表/禁例与 live 一致；board axis 已入库）；flux-guide kanban.md 与 `flux-types/schema.d.ts` 与 live 一致；roadmap RM-11 状态流转 + daily log。
- [ ] 三条 literal closure 口径终态复跑（债二裁决 1/2/3）+ 全量五门禁（Closure Gates）。

Exit Criteria:

- [ ] 三条口径全部闭合在案；五门禁全绿。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh 子 agent 填写。

- Reviewer / Agent: agent_927c80cf（R1~R3）+ agent_7d58d624（R4 定点，独立 fresh 子 agent）
- Verdict: `pass`（R4 定点核验零不一致，达成共识 → 升 active）
- Rounds: 4（R1 fail 0B/4M/3m → 修订；R2 fail 0B/2M/1m[修订引入新声称不实：warn 携带面漏计 column-resize/list-pagination 两处+锚残留] → 修订；R3 fail 0B/1M[Baseline warn 句因引号形失配静默未替换] → 补落；R4 定点 pass）
- Findings addressed: M1=两候选"逐字同构"不成立（live 四处分歧：scope 写回归一 next??null vs 原值/local 初始序/scope 链末端 fallback/写回镜像；且 use-row-drag-sort:107-118 自带 warn 非"仅 layout 版"）→ Baseline 改语义对照表+分歧逐消费方保行为落迁移对照表+Non-Goals warn 去重披露；M2=5 消费方自定义 equality/transform 订阅原语承载缺口 → 原语 useOwnershipScopeValue 读法参数化 {select?,equality?}（授权链内显式扩展）；M3=账目两个"24"不可对账/schema 字段 17≠live 18/kanban.types.ts:80 归属不明 → 重列 18+3+3+1+1=26、:80 归 Phase 1、:84 松型归 Phase 2、统一 22+1+3 记账；M4=行数/行号漂移（value-ownership 87→136、use-table-sort 438→310 且分支 :118-188、interaction-owner 58→59、松型 :80/81→:84/85）→ 全部 live 重标；m1=basic schemas.ts 命中定性改注释位；m2=Phase 3 首项改"原语+判别钉先行勾验"；m3=resolveListPaginationOwnership 等价性判据点名垃圾输入归一。R2 M-A=warn 携带面漏计 use-column-resize:106-110 与 list-pagination:124-128 两处自带降级 warn（后者 list-pagination-infinite.test.tsx:134 有存在断言）→ 四处自带口径落 Baseline/Non-Goals/Test Strategy[use-table-sort:154-156 系业务 warn 非降级类定性]；R2 M-B=Phase 2 松型锚 :80→:84；R2 m-1=安全阀措辞"同构"→"副本"。R3 M-A=Baseline warn 句引号形失配静默未替换 → 以精确文本补落。R4（agent_7d58d624）五项核验全过（三处口径闭合+use-column-resize:106-110 live 抽验吻合）。

## Closure Gates

- [ ] `OwnershipMode` 单源导出且 26 行字面量口径闭合（别名删除/松型收窄/注解换型在案）
- [ ] `kanbanOwnership|kanbanStatePath` 全命中改名归零（packages+flux-guide）且无兼容分叉（Cross-Cutting 7）
- [ ] 12 处解析实现收敛为 flux-react 单原语（comm 口径 == 原语文件）且两候选副本删除
- [ ] 行为等价判别（快照 + 判别变异自证）在案
- [ ] 全仓 typecheck/build/lint/test 全绿 + check 零新增红（含 RM-9 残余扫描零未裁决命中）
- [ ] flux-guide 生成物与 docs 同步
- [ ] roadmap RM-11 状态流转 + daily log 条目
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`
- [ ] e2e 意图声明与披露义务落字

## 预置拆分判据裁定（roadmap RM-11 镜像 R1 m2）

类型词表组（裁决 1/2 = Phase 1/2）与实现合一组（裁决 3 = Phase 3）同属"ownership 单源化"单一结果面、收口口径同源（词汇报告 §债二三条命令彼此引用），且实现合一的语义等价性依赖类型单源先行——**裁定为一个 plan 内 4 Phase 承载，不预拆**（plan guide Rule 22/24：共享 owner 与 proof 面优先合并）。执行中若 Phase 3 证实需引入两候选之外的全新语义设计（非合并既有副本语义），当场落 Deferred But Adjudicated 并报人工裁定是否拆分 successor，不静默缩水。

## Deferred But Adjudicated

（无——执行中如有推翻/改判，当场落本节）

## Non-Blocking Follow-ups

- ownership 各 axis 的语义合并（报告显式排除）：如需处理单独立项。
- `resolveListPaginationOwnership` 若裁定保留内联而非原语承载，其归一语义是否上移原语属优化候选。

## Closure

Status Note: （收口时填写）

Closure Audit Evidence:

- Auditor / Agent: （独立 fresh 子 agent）
- Evidence: （task id / 核对摘要）

Follow-up:

- （收口时填写或写 no remaining plan-owned work）
