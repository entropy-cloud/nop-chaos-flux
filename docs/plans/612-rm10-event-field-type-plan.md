# 612 RM-10 事件字段类型单源化（三态归一 `ActionSchema | ActionSchema[]` + ActionSchemaLike 对偶删除）

> Plan Status: active
> Last Reviewed: 2026-10-16
> Source: `docs/backlog/renderer-metamodel-roadmap.md` RM-10；`docs/analysis/2026-10-15-renderer-vocabulary-consistency-analysis.md` §债一（owner 事实源，含 literal closure 命令）
> Related: roadmap Cross-Cutting 7（单标准零兼容分叉，用户显式指令 2026-10-15）；RM-9（残余扫描已入库）

## Purpose

事件通道字段声明类型统一为编译器实际消费的联合型 `ActionSchema | ActionSchema[]`（事实源 `node-compiler.ts:129` `rawEventPlans`），消除"单值窄化"惰性形态与 12 处 `BaseSchema` 误型；并将 `ActionSchemaLike` 对偶类型并入 `ActionSchema`（字段集取超集，链字段自指同步），使 action 形状单一类型。

## 授权链（保护区）

**flux-core/src 属保护区域（plan-first）**——本 plan 即载体，且触及公开导出类型面（`ActionSchemaLike` 删除、`ActionShapeLikeFields` 去留裁定）→ 依 roadmap 授权边界"公开导出增删属结构性重构，执行前人工确认授权链落字"。授权链落字：**vocabulary 报告 §债一裁决 2**（ActionSchemaLike 并入 ActionSchema；用户显式指令 2026-10-15 产出）+ **roadmap Cross-Cutting 7**（单标准零兼容分叉）+ roadmap 授权边界节（公开导出增删执行前落字）——R1 m4 改引可核证据；另存 **vocabulary 报告 §债一裁决 2**（"`ActionSchemaLike` 并入 `ActionSchema`"）+ roadmap Cross-Cutting 7（单标准、零兼容分叉，不设别名过渡层）。

## Current Baseline（live 核对 2026-10-16，HEAD 9a89aa26d）

- **三态并存（live 实测）**：`?: ActionSchema | ActionSchema[];` **81 处**（标准形态，非改型面）；`?: ActionSchema;` **29 文件**（其中在范围 174 处 = flux-renderers-\* 168 + dashboard .tsx 4 + word-editor .ts 2）；`?: BaseSchema;` **12 处**（全部在 `flux-renderers-data/src/schemas.ts`，事件字段误型——报告 §债一已逐行列出 :150/:245-249/:339-344/:403-404）。
- **编译器事实源**：`packages/flux-compiler/src/schema-compiler/node-compiler.ts:129`（R1 m1 勘正：报告标 :127 有误）`const rawEventPlans: Record<string, ActionSchema | ActionSchema[]> = {}`——单值是赋值兼容的惰性窄化，非独立契约。
- **显式排除（R1 M2 勘正）**：`flux-code-editor/src/types.ts:144`（`SQLExecutionConfig.executeAction`）+ data 包 **6 处 / 4 文件** 内部 save prop（`table-renderer/table-editable-cell.tsx`、`table-quick-edit-cell.tsx`、`use-row-quick-edit-draft.tsx`、**`table-quick-edit-controller.ts:120`**——R1 补漏：与 `use-row-quick-edit-draft.tsx:63` 同包同目录同源同值、同形 `helpers.dispatch`，按报告判据同列排除）→ 排除合计 **7 处 / 5 文件**，减法口径在范围 180−7=**173**（原 174/6/4 文件口径勘误）。**收口期望值以 Phase 0 分类结果为准**（非 4 文件/267 的减法口径）。
- **对偶类型（live）**：`ActionSchemaLike extends ActionShapeLikeFields`（`flux-core/src/types/schema.ts:98-101`）与 `ActionSchema extends ActionShapeFields`（`flux-core/src/types/actions.ts:280-282`）平行；两类型 `action: string` **均必填**；字段集差异 = ActionShapeFields 多且仅多 4 项可选附加（`preventDefault`/`stopPropagation`/`messages`/`confirmText`），6 个 target 字段两接口均已存在。`ActionShapeLikeFields` live 消费位 6 处（`schema.ts:77` 本体 + `:312 SourceActionSchema` + `:321 FormulaDataSourceSchema` + `flux-renderers-form/src/schemas.ts:35 TreeSourceConfig` + 经 `ActionSchemaLike` 的 `BaseSchema.onMount/onUnmount`（`:119-120`）、`ReactionSchema.actions`（`:362`，R1 m1 勘正）、`loadAction`（`:392`，R1 m1 勘正））。
- **迁移后基数复核口径（报告 literal closure；R2 勘误：期望值以 Phase 0 分类导出集为准，报告减法口径作废）**：标准形态 81 → **81 + Phase 0 分类导出事件位点数 + 12 误型**（报告原 267=81+174+12 系减法口径，174 已证含非事件位点）；收口命令 `rg -l '\?: ActionSchema;' packages --glob '*.ts' --glob '*.tsx' --glob '!*.test.*' | sort` 期望 == **5 个排除文件**（code-editor types.ts + data 包 4 文件，R1 M2 勘正后）。
- 基线验证：HEAD 9a89aa26d 五门禁全绿（RM-9 收口提交）；R2 复核（HEAD 5d638a022）：并行 hunks（roadmap RM-10~12 行、docs/index.md、naming-conventions 等）已随 5d638a022 入库，两 HEAD 间 packages 漂移仅 structure-source.test.tsx（测试文件，不在 rg 口径内），81/180/29 文件/12 误型四计数在现 HEAD 复核精确成立。

## Goals

- **事件字段改型**：在范围位点（集合由 Phase 0 分类导出；减法参考口径 173 处）`?: ActionSchema;` → `?: ActionSchema | ActionSchema[];`（逐处复核 `kind:'event'` 归属；新发现非事件位点显式追加排除清单登记）；12 处 `BaseSchema` 误型 → 联合型（逐处复核归属，同规则）。
- **对偶并入**：`ActionSchemaLike` 删除，`ActionSchema` 成为唯一 action 形状类型；6 处 Like 消费位点随迁；链字段自指（`parallel/then/onError/onSettled`）类型同步为 `ActionSchema`；`ActionShapeLikeFields` 去留在本 plan 裁定（默认：删除并入 `ActionShapeFields`，理由=Cross-Cutting 7 零兼容分叉；若 live 发现独立语义需求则保留为窄化基接口并说明理由）。
- **收口验证**：报告 §债一 literal closure 命令逐条复跑（单值文件集 == 5 排除文件、`BaseSchema` 事件误型归零、联合型基数 == 81 + 分类导出事件位点数 + 12）+ typecheck 全量枚举 + 全绿。

## Non-Goals

- 不改运行时行为（纯类型层：单值本可赋给联合）；不引入别名/双读过渡（Cross-Cutting 7）；不动 RM-11/12；不改排除清单 7 处（R1 M2 勘正后：code-editor 1 处 + data 包 6 处/4 文件（含 table-quick-edit-controller.ts:120）= 7 处/5 文件）。

## Scope

### In Scope

- `packages/flux-core/src/types/schema.ts`（Shape 类型/BaseSchema 字段/ReactionSchema/loadAction/SourceActionSchema/FormulaDataSourceSchema）、`packages/flux-core/src/types/actions.ts`（ActionSchema/字段集）、`packages/flux-renderers-form/src/schemas.ts`（TreeSourceConfig）。
- 29 文件范围内的类型改型（flux-renderers-\* 为主 + dashboard .tsx + word-editor .ts）+ data/schemas.ts 12 处误型。
- `pnpm -r typecheck` 枚举兜底（联合型放宽后下游如有窄化依赖则逐处裁定：属类型层则随改）。
- flux-guide 生成物同步（`schema.d.ts` 重生成，如涉及事件字段类型）+ docs（naming-conventions §4.4 如记载 action 类型形态）+ roadmap 状态流转 + daily log。

### Out Of Scope

- RM-11/12；排除清单 6 处；运行时/编译器逻辑改动；e2e。

## Failure Paths

不适用：纯类型层改型（零运行时影响），风险（下游窄化依赖）由 `pnpm -r typecheck` 枚举兜底。

## Test Strategy

档位选择：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**——类型层改型非行为面（roadmap 行为面列表不含 RM-10）。判别承载体：①literal closure 四条命令逐条复跑（单值文件集恰好等于 5 排除文件、误型归零、基数 == 81 + Phase 0 分类导出事件位点数 + 12）；②类型面判别钉（`expectTypeOf`：单值/数组两形态均可赋给事件字段类型；`ActionSchemaLike` 符号已删——import 失败即判别）；③全量 typecheck + 五门禁。

## Execution Plan

### Phase 0 - kind 分类枚举（R1 M1 裁定：改型面以分类为准，非减法口径）

Status: planned
Targets: 全仓 `?: ActionSchema;` 位点的注册 kind 判定

- Item Types: `Decision`、`Proof`

- [ ] 对 `rg '\?: ActionSchema;'` 的 180 个位点逐个 join 注册 kind（判别式：生成物 `flux-guide/flux-types/schema.d.ts` 中该键为 `ActionSchema | ActionSchema[]` ⇒ event、为 `unknown`/`SchemaValue` ⇒ prop/reaction；或直接读各 `*-definitions.ts` 的 kind 声明），产出分类表（event N 处 / 非 event M 处，逐项 `文件:行`）落进 Current Baseline。
- [ ] 按分类结果裁定「在范围」集合与收口期望值（文件集/基数）；对 `kind:'reaction'` 字段单独裁定（编译器 `rawReactionPlans` 按**单值**读 `dependsOn`——放宽为数组是声明了通道不接受的形状，契约诚实性要求不纳入或显式说明）。
- [ ] Proof：分类表逐项可复现（分类命令 + 判定记录）；R1 已 live 指出 ≥32 处在范围位点非 `kind:'event'`（8 reaction / 16 prop / 5 validate 嵌套），分类须逐条落定。

Exit Criteria:

- [ ] 分类表落盘且「在范围」集合由其导出（非减法）；reaction 族裁定落字（纳入或排除，附依据）。

### Phase 1 - flux-core 类型面（对偶并入 + 字段改型）

Status: planned
Targets: `packages/flux-core/src/types/{schema,actions}.ts`

- Item Types: `Fix`、`Decision`、`Proof`

- [ ] `ActionShapeLikeFields` 去留裁定并落字（默认删除、并入 `ActionShapeFields`；逐字段对照确认 4 项附加为纯放宽）。
- [ ] 6 处 Like 消费位点改 `ActionSchema`；链字段自指（`parallel/then/onError/onSettled`）同步；`ActionSchemaLike` 类型删除。
- [ ] `BaseSchema.onMount/onUnmount`、`ReactionSchema.actions`、`loadAction`、`SourceActionSchema`、`FormulaDataSourceSchema`、`TreeSourceConfig` 随迁。
- [ ] Proof：类型钉（单值/数组/链式形态赋给事件字段类型；`ActionSchemaLike` 已删的负向 import 探针）。

Exit Criteria:

- [ ] flux-core focused typecheck 绿；6 处消费位点随迁且无 Like 符号残留（grep）。

### Phase 2 - 全仓事件字段改型（Phase 0 分类导出事件位点 + 12 误型）

Status: planned
Targets: 29 个单值文件（迁移前集合，含 5 个排除文件 → 在范围文件 24）+ data/schemas.ts 12 处误型（同文件不同位点，不新增文件）

- Item Types: `Fix`、`Proof`

- [ ] 逐处复核 `kind:'event'` 归属后改型（报告口径；新发现非事件位点追加排除清单登记，不静默留单值）。
- [ ] `pnpm -r typecheck` 枚举兜底归零。
- [ ] Proof：literal closure 命令四条复跑（文件集 == 5 排除文件/误型归零/基数 == 81 + Phase 0 分类导出事件位点数 + 12）。

Exit Criteria:

- [ ] 单值文件集 == Phase 0 分类导出的排除集（5 文件）；`BaseSchema` 误型归零；联合型基数 == 81 + Phase 0 分类导出事件位点数 + 12（误型改型位点计入基数）；全仓 typecheck exit 0（属 Minimum Rule 18 例外：本 Phase 改公共契约且后续 Phase 依赖，故列入 Phase Exit）。

### Phase 3 - 生成物与 docs 同步 + 收口验证

Status: planned

- Item Types: `Fix`

- [ ] flux-guide `schema.d.ts` 重生成（如事件字段类型外观变化）+ naming-conventions 相关节核对。
- [ ] 全量五门禁（Closure Gates）。

Exit Criteria:

- [ ] 生成物与 docs 与 live 一致；五门禁全绿。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh 子 agent 填写。

- Reviewer / Agent: agent_e09065c8（R1）+ agent_9c26bc43（R2，独立 fresh 子 agent，逐位点 kind 对照 + 命令复现）
- Verdict: `pass`（R2 复核零 Blocker/零 Major/零 Minor，达成共识 → 升 active）
- Rounds: 2（R1 fail 0B/2M/5m → 修订；R2 fail 0B/1M/3m[首轮修订未传导到底] → 修订；R2 定点复核 pass）
- Findings addressed: R1 M1=「在范围 174」是减法结果而非已核事件集（live ≥32 处在范围位点非 kind:'event'：8 reaction/16 prop/5 validate 嵌套；生成物已按 kind 区分）→ 增 Phase 0 kind 分类枚举（分类表落 Baseline、在范围集合由分类导出、reaction 族单独裁定）+ 收口口径改以分类为准；M2=排除清单漏 table-quick-edit-controller.ts:120（同类同形）→ 排除改 7 处/5 文件、减法口径 173 勘正；m1=行号勘误（node-compiler :127→129、ReactionSchema.actions :350→362、loadAction :380→392）；m2=Phase 2 Targets 文件数口径（29 含 5 排除文件，在范围 24）；m3=Phase 2 Exit 全仓 typecheck 属 Minimum Rule 18 例外并显式声明；m4=授权链改引可核证据；m5=typecheck 兜底不承载 kind 判定（编译器对事件/反应值一律断言收口）→ 由 Phase 0 分类承载。R2 M1=口径矛盾残留（Baseline:22/Goals/Closure Gates/Phase 2 标题仍写 4 文件/267/174）→ 全部改引分类导出口径（5 排除文件、基数 == 81+分类导出事件位点数+12）；R2 m1=Non-Goals/Follow-ups 排除 6 处→7 处；m2=Baseline 并行 hunks 句刷新（HEAD 5d638a022 已入库）；m3=Phase 2 Exit 基数公式显式 +12。R2 复核轮 M1=Test Strategy 与 Phase 2 Proof 残留 4 文件/267 旧口径 → 改勘误后口径；m1=Purpose 行号 :127→:129；m2=Non-Goals 排除算术改写（7 处/5 文件无双计）。

## Closure Gates

- [ ] 事件字段三态归一到联合型（在范围 = Phase 0 分类导出集，减法参考口径 173 + 误型 12）且 literal closure 四条命令复跑在案
- [ ] `ActionSchemaLike` 删除、6 处消费位点随迁、无兼容分叉（Cross-Cutting 7）
- [ ] 全仓 typecheck/build/lint/test 全绿 + check 零新增红（含 RM-9 残余扫描零未裁决命中）
- [ ] flux-guide 生成物与 docs 同步
- [ ] roadmap RM-10 状态流转 + daily log 条目
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`
- [ ] e2e 意图声明与披露义务落字

## Deferred But Adjudicated

（无——执行中如有推翻/改判，当场落本节）

## Non-Blocking Follow-ups

- 排除清单 7 处（非事件单 action 字段；R1 M2 勘正后含 table-quick-edit-controller.ts:120）如需统一形状，单独立项（报告已登记为显式排除）。

## Closure

Status Note: （收口时填写）

Closure Audit Evidence:

- Auditor / Agent: （独立 fresh 子 agent）
- Evidence: （task id / 核对摘要）

Follow-up:

- （收口时填写或写 no remaining plan-owned work）
