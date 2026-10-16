# 612 RM-10 事件字段类型单源化（三态归一 `ActionSchema | ActionSchema[]` + ActionSchemaLike 对偶删除）

> Plan Status: completed
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
- **Phase 0 分类表（2026-10-16 执行，脚本 `_tmp/rm10-classify.mjs` + 36 处 needs-eyes 逐处读 definitions/消费侧裁定；在范围 125 / 排除 55）**：
  - **在范围（改型 125 处）**：gen 判定 EVENT 118 处（生成物该键已为联合型=元模型面已认事件，手写声明为滞后窄化——ai 26/upload-schemas 12/kanban.types 7[+KanbanEvents 7 defs]/calendar 13[+onMount 1 defs]/gantt 10[+onMount 1 defs]/mobile 8/layout 5/crud 6/content 13/barcode 2[+onMount 1 defs]/dashboard-editor 3[+onError 1 defs]/word-editor 2/graph 3/map onClick 1 defs/industrial 0）+ AMBIG→EVENT 7 处（kanban onColumnAdd[41]+onUnmount[88]、calendar onUnmount[139]、gantt onUnmount[219]、barcode onUnmount[38]——均 defs `kind:'event'` 实证[scheduling-renderer-definitions.ts:79-80/245-253/384-385]；dashboard onError[52] defs :115；map onClick[80] map-renderer-definitions.ts:223）。KanbanEvents 接口 7 处纳入：镜像 KanbanSchema 已注册事件键、导出但无嵌套消费（live grep 仅声明/导出 3 位点）。
  - **排除（55 处，六组）**：①报告原排除 7 处/5 文件（code-editor executeAction + data 包 save/quickSave 6：use-row-quick-edit-draft:63/quick-edit-cell:65,66/editable-cell:168,169/controller:120——内部组件 prop 单值正确）；②reaction 8 处（calendar print/exportPNG/importICal/exportToICal[:140-143]+gantt zoomIn/zoomOut/scrollToToday/scrollToTask[:207-210]，defs kind:'reaction' 实证 :85-88/387-390，编译器 rawReactionPlans 单值消费 node-compiler.ts:130——放宽即声明通道不接受的形状）；③**嵌套 events 对象成员 16 处排除（Phase 0 新裁定）**：3d ThreeCanvasEvents 4[:14-20]+industrial ScadaCanvasEvents 5[:31-37]+industrial editor ScadaEditorCanvasEvents 7[:75-87]——`events?` 整体注册为 prop（in-source 注释 D-1/D3 裁定：classifyField 仅顶层键、无点号路径，probe 实测 eventPlans 为空），运行时经 `helpers.dispatch(action: ActionSchema, ...)` 单值桥接派发（renderer-helpers.ts:274、runtime-action-helpers.ts:46），scada 个别键 kind:'event' 注册为工具链契约元数据非通道形状声明——放宽将使桥接调用点 typecheck 红且声明派发桥不接受的形状；④validate 嵌套 action 5 处（form/schemas.ts:69/332/460/474/488 `validate:{action?:...}` 配置对象）；⑤prop 通道 action 配置 11 处（form searchSource:165、data schemas childrenSource:191+quickSave×2:241-242、crud-schema quickSave×2:290-291、content fetcher:173、map geojsonSource:64、form schemas-org sourceChildren/Search/Resolve:36-40——gen 判定 unknown/SchemaValue=prop 通道）；⑥hook/内部类型位点 8 处（form use-org-data:16-18、use-org-source:95/237/352 请求上下文、map use-map-geojson:25、data use-table-lazy-children:32——非 schema 声明面）。**收口期望值（Phase 0 导出）**：改型后 `?: ActionSchema;` 存留文件集 == 20 文件：`flux-code-editor/src/types.ts`；data 包 7 文件（`schemas.ts`、`crud-schema.ts`、`table-renderer/{table-editable-cell,table-quick-edit-cell,use-row-quick-edit-draft,table-quick-edit-controller,use-table-lazy-children}`）；scheduling 2 文件（`calendar/calendar.types.ts`、`gantt/gantt.types.ts`，reaction 存留）；form 包 4 文件（`schemas.ts`、`schemas-org.ts`、`renderers/org/{use-org-data,use-org-source}.ts`）；content `schemas.ts`；map 包 2 文件（`schemas.ts`、`use-map-geojson.ts`）；3d `schemas.ts`；industrial 2 文件（`schemas.ts`、`editor/schemas.ts`）；联合型基数 == 81 + 125 + 12 + 2（Phase 1 `BaseSchema.onMount/onUnmount` 随 Like 并入由 `Like | Like[]` 改联合型）= **220**；`\?: BaseSchema;` 事件误型归零。

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

- RM-11/12；排除清单（报告原排除 7 处/5 文件 + Phase 0 分类新增排除 48 处，合计 55 处/20 文件六组——见 Baseline 分类表）；运行时/编译器逻辑改动；e2e。

## Failure Paths

不适用：纯类型层改型（零运行时影响），风险（下游窄化依赖）由 `pnpm -r typecheck` 枚举兜底。

## Test Strategy

档位选择：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**——类型层改型非行为面（roadmap 行为面列表不含 RM-10）。判别承载体：①literal closure 四条命令逐条复跑（单值文件集恰好等于 5 排除文件、误型归零、基数 == 81 + Phase 0 分类导出事件位点数 + 12）；②类型面判别钉（`expectTypeOf`：单值/数组两形态均可赋给事件字段类型；`ActionSchemaLike` 符号已删——import 失败即判别）；③全量 typecheck + 五门禁。

## Execution Plan

### Phase 0 - kind 分类枚举（R1 M1 裁定：改型面以分类为准，非减法口径）

Status: completed
Targets: 全仓 `?: ActionSchema;` 位点的注册 kind 判定

- Item Types: `Decision`、`Proof`

- [x] 对 `rg '\?: ActionSchema;'` 的 180 个位点逐个 join 注册 kind（判别式：生成物 `flux-guide/flux-types/schema.d.ts` 中该键为 `ActionSchema | ActionSchema[]` ⇒ event、为 `unknown`/`SchemaValue` ⇒ prop/reaction；或直接读各 `*-definitions.ts` 的 kind 声明），产出分类表（event N 处 / 非 event M 处，逐项 `文件:行`）落进 Current Baseline。
- [x] 按分类结果裁定「在范围」集合与收口期望值（文件集/基数）；对 `kind:'reaction'` 字段单独裁定（编译器 `rawReactionPlans` 按**单值**读 `dependsOn`——放宽为数组是声明了通道不接受的形状，契约诚实性要求不纳入或显式说明）。【裁定：reaction 8 处排除；新增裁定：嵌套 events 对象成员 16 处排除（`helpers.dispatch(action: ActionSchema, ...)` 单值签名，see renderer-helpers.ts:274/runtime-action-helpers.ts:46）；hook/内部类型位点 8 处排除】
- [x] Proof：分类表逐项可复现（分类命令 + 判定记录）；R1 已 live 指出 ≥32 处在范围位点非 `kind:'event'`（8 reaction / 16 prop / 5 validate 嵌套），分类须逐条落定。【分类脚本 `_tmp/rm10-classify.mjs`：129 gen/defs 自动判定 + 36 处 needs-eyes 逐处读 definitions/消费侧裁定；判定记录见 Current Baseline 分类表】

Exit Criteria:

- [x] 分类表落盘且「在范围」集合由其导出（非减法）；reaction 族裁定落字（纳入或排除，附依据）。【在范围 125 / 排除 55（六组），见 Baseline 分类表】

### Phase 1 - flux-core 类型面（对偶并入 + 字段改型）

Status: completed
Targets: `packages/flux-core/src/types/{schema,actions}.ts`

- Item Types: `Fix`、`Decision`、`Proof`

- [x] `ActionShapeLikeFields` 去留裁定并落字（默认删除、并入 `ActionShapeFields`；逐字段对照确认 4 项附加为纯放宽）。【裁定=删除：live 无独立语义需求（仅 SourceActionSchema/FormulaDataSourceSchema/TreeSourceConfig 三基类消费，4 项附加对三者均纯放宽）】
- [x] 6 处 Like 消费位点改 `ActionSchema`；链字段自指（`parallel/then/onError/onSettled`）同步；`ActionSchemaLike` 类型删除。【schema.ts 两接口删除；actions.ts:168-172 链字段自指本就为 ActionSchema、无 Like 引用；执行中附带修复：schema.ts `OperationControlConfig` 死导入删除（仅被已删 Like 字段使用，lint 首轮 1 红）】
- [x] `BaseSchema.onMount/onUnmount`、`ReactionSchema.actions`、`loadAction`、`SourceActionSchema`、`FormulaDataSourceSchema`、`TreeSourceConfig` 随迁。【onMount/onUnmount 由 `Like | Like[]` 改 `ActionSchema | ActionSchema[]`（联合型基数 +2 来源）；其余单值换型】
- [x] Proof：类型钉（单值/数组/链式形态赋给事件字段类型；`ActionSchemaLike` 已删的负向 import 探针）。【`packages/flux-core/src/types/event-field-type.test.ts` 4 用例：联合面 toEqualTypeOf/链字段自指/负向导出探针[toEqualTypeOf<false>]/Source+Reaction 单值换型——focused 4/4 绿（closure audit agent_9a598ead 复跑亲证）】

Exit Criteria:

- [x] flux-core focused typecheck 绿；6 处消费位点随迁且无 Like 符号残留（grep）。【typecheck 绿；`rg "ActionSchemaLike|ActionShapeLikeFields" packages --glob '!node_modules'` 仅剩判别测试负向探针字符串与 docs 勘误/史录引用（audit 复核亲证）】

### Phase 2 - 全仓事件字段改型（Phase 0 分类导出事件位点 + 12 误型）

Status: completed
Targets: 14 个在范围事件字段文件（Phase 0 分类导出）+ data/schemas.ts 12 处误型（同文件不同位点）

- Item Types: `Fix`、`Proof`

- [x] 逐处复核 `kind:'event'` 归属后改型（Phase 0 分类表逐位点改型；新发现非事件位点已在 Phase 0 追加排除登记[嵌套 events 对象 16+hook 内部 8]，不静默留单值）。【125 位点/14 文件改型脚本 + data/schemas.ts 12 误型转换】
- [x] `pnpm -r typecheck` 枚举兜底归零。【直跑 42/42 exit 0——首轮 1 红为判别钉测试自身 toEqualTypeOf 漏 undefined，NonNullable 修正后归零】
- [x] Proof：literal closure 命令四条复跑（单值文件集 == 20 Phase 0 排除文件、误型归零 0、联合型基数 == 81+125+12+2[Phase 1 onMount/onUnmount 随迁] = 220）。

Exit Criteria:

- [x] 单值文件集 == Phase 0 分类导出的排除集（20 文件，live 复核逐一命中）；`BaseSchema` 误型归零；联合型基数 == 81 + 125 + 12 + 2 = 220；全仓 typecheck exit 0（属 Minimum Rule 18 例外：本 Phase 改公共契约且后续 Phase 依赖，故列入 Phase Exit）。

### Phase 3 - 生成物与 docs 同步 + 收口验证

Status: completed

- Item Types: `Fix`

- [x] flux-guide `schema.d.ts` 重生成（如事件字段类型外观变化）+ naming-conventions 相关节核对。【`pnpm build` 后经 css-stub loader 重生成：`schema.d.ts`/`index.ts` 与已提交版逐字节零 diff——生成面本就以联合型产出事件字段、Like 不见于生成物；naming-conventions §4.4 行号锚 :127→:129 就地勘误（附 plan 612 出处）；flux-guide/design-patterns/dynamic-renderer.md `loadAction` 类型表 Like→ActionSchema；roadmap RM-10 Details 与词汇报告 §债一 裁决 1 就地勘误（125/55/20 文件/220/:129）随收口回写】
- [x] 全量五门禁（Closure Gates）。【typecheck 直跑 42/42 exit 0；build exit 0（5 cached/42 total）；lint exit 0[首轮 1 红=Like 删除遗留 OperationControlConfig 死导入，已修]；test exit 0（16,542 passed/1,801 文件/42 任务/0 FAIL）；check exit 0（含 RM-9 残余扫描 zero unadjudicated hits）】

Exit Criteria:

- [x] 生成物与 docs 与 live 一致；五门禁全绿。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh 子 agent 填写。

- Reviewer / Agent: agent_e09065c8（R1）+ agent_9c26bc43（R2，独立 fresh 子 agent，逐位点 kind 对照 + 命令复现）
- Verdict: `pass`（R2 复核零 Blocker/零 Major/零 Minor，达成共识 → 升 active）
- Rounds: 2（R1 fail 0B/2M/5m → 修订；R2 fail 0B/1M/3m[首轮修订未传导到底] → 修订；R2 定点复核 pass）
- Findings addressed: R1 M1=「在范围 174」是减法结果而非已核事件集（live ≥32 处在范围位点非 kind:'event'：8 reaction/16 prop/5 validate 嵌套；生成物已按 kind 区分）→ 增 Phase 0 kind 分类枚举（分类表落 Baseline、在范围集合由分类导出、reaction 族单独裁定）+ 收口口径改以分类为准；M2=排除清单漏 table-quick-edit-controller.ts:120（同类同形）→ 排除改 7 处/5 文件、减法口径 173 勘正；m1=行号勘误（node-compiler :127→129、ReactionSchema.actions :350→362、loadAction :380→392）；m2=Phase 2 Targets 文件数口径（29 含 5 排除文件，在范围 24）；m3=Phase 2 Exit 全仓 typecheck 属 Minimum Rule 18 例外并显式声明；m4=授权链改引可核证据；m5=typecheck 兜底不承载 kind 判定（编译器对事件/反应值一律断言收口）→ 由 Phase 0 分类承载。R2 M1=口径矛盾残留（Baseline:22/Goals/Closure Gates/Phase 2 标题仍写 4 文件/267/174）→ 全部改引分类导出口径（5 排除文件、基数 == 81+分类导出事件位点数+12）；R2 m1=Non-Goals/Follow-ups 排除 6 处→7 处；m2=Baseline 并行 hunks 句刷新（HEAD 5d638a022 已入库）；m3=Phase 2 Exit 基数公式显式 +12。R2 复核轮 M1=Test Strategy 与 Phase 2 Proof 残留 4 文件/267 旧口径 → 改勘误后口径；m1=Purpose 行号 :127→:129；m2=Non-Goals 排除算术改写（7 处/5 文件无双计）。

## Closure Gates

- [x] 事件字段三态归一到联合型（在范围 = Phase 0 分类导出集 125 + 误型 12）且 literal closure 四条命令复跑在案
- [x] `ActionSchemaLike` 删除、6 处消费位点随迁、无兼容分叉（Cross-Cutting 7）
- [x] 全仓 typecheck/build/lint/test 全绿 + check 零新增红（含 RM-9 残余扫描零未裁决命中）
- [x] flux-guide 生成物与 docs 同步
- [x] roadmap RM-10 状态流转 + daily log 条目
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`
- [x] e2e 意图声明与披露义务落字【e2e 未重跑——纯类型层改型零运行时行为变化，判别由判别钉 4 用例 + literal closure 三命令 + typecheck 全量枚举承载；已在 plan、本节与提交信息披露】

## Deferred But Adjudicated

（无——执行中如有推翻/改判，当场落本节）

## Non-Blocking Follow-ups

- 排除清单 7 处（非事件单 action 字段；R1 M2 勘正后含 table-quick-edit-controller.ts:120）如需统一形状，单独立项（报告已登记为显式排除）。

## Closure

Status Note: 事件字段声明类型单源化落地——在范围 125 处单值放宽为 `ActionSchema | ActionSchema[]`（Phase 0 kind 分类枚举导出，非减法口径）、12 处 `BaseSchema` 误型改联合型、`ActionSchemaLike`/`ActionShapeLikeFields` 对偶删除并入 `ActionSchema`/`ActionShapeFields`（6 消费位点随迁、链字段自指恒等）；排除 55 处/20 文件六组逐条登记裁定依据；literal closure 三命令闭合（单值文件集==20 排除文件、误型归零、联合型基数 220）；五门禁全绿；无兼容分叉（Cross-Cutting 7）。

Closure Audit Evidence:

- Auditor / Agent: agent_9a598ead-b83b-459a-bcda-64cac1feebbd（独立 fresh 子 agent）
- Evidence: 首轮 issues 0B/1M/2m → M1[Phase 1 状态漏勾，纯文档态]+m1[Out Of Scope 排除口径]+m2[收口动作清单]全部修复 → 复核确认 approved（audit 报告：closure 三命令复跑 20 文件/0/220 逐一命中；diff 基数闭合 +139 联合=125+12+2；排除位点未触碰实核；排除裁定依据抽验属实；残符号扫描仅剩负向探针与勘误/史录引用；typecheck 独立复跑 exit 0）。

Follow-up:

- no remaining plan-owned work（排除清单 55 处如需统一形状属报告登记的显式排除，Non-Blocking Follow-ups 在案）
