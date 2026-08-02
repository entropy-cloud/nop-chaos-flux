# 2026-08-02 嵌套 Schema 机制统一与遗留删除（Nested Schema Mechanism Unification）

> Plan Status: completed
> Last Reviewed: 2026-08-02
> Source: `docs/architecture/nested-schema-field-classification.md`（v8 最终设计）
> Related: `docs/plans/2026-08-02-1-nested-schema-field-classification.md`（P0 修复，本计划依赖其完成）

## Purpose

在 P0 修复计划（schema-definition 机制落地）完成后，把机制推进到**最终最优形态**：统一字段分类词表（顶层 fields 与嵌套 fieldRules 共用 `SchemaFieldKind`，fieldRules 复用 `SchemaFieldRule` 对象形态承载 params/isolate/regionKey）、编译器按 kind 自动处理（region 提取 / 字面量 envelope / action 保持模板）、**声明迁移先行、机制删除后行**（7 处 deepFields 声明迁移完成后整体删除 deepFields/nestedRegions/booleanKeys/normalize 机制及其支撑代码）、落实 P1 决策项（wizard 接线、columns[].searchable region 化、carousel body 删除）、支持 item 显式 type 完整语义。不保留任何兼容路径（flux 未发布，无兼容负担）。

## Current Baseline

> 已逐条核对 live repo。

- **前置依赖**：`docs/plans/2026-08-02-1-nested-schema-field-classification.md`（active）——P0 修复（schema-definition 机制 + P0 声明 + 契约测试）尚未执行；本计划在其完成后开始。
- **遗留机制（本计划删除）**：`RendererDeepFieldDefinition`（`renderer-definition-types.ts:103-108`）；`deepFields` 声明 **7 处**——tabs（basic-renderer-definitions.ts:456）、wizard（layout:126）、grid（layout:296）、collapse（layout:418）、variant-field（variant-field.tsx:166）、table（data-renderer-definitions.ts:282 columns + :311 expandable）、crud（crud-renderer-definition.ts:400）；`shape-validation-deep-fields.ts`（:44-46 nestedRegions 空即 return）；`node-compiler.ts` deepFields 分支（:297，normalize 唯一调用点）；`extractNestedSchemaRegions`（`flux-core/src/nested-regions.ts:106`）；`validateNestedBooleanFields`（`shape-validation-node-fields.ts:126` 定义 / :253-261 调用）；`DEEP_FIELD_NORMALIZERS`（`flux-compiler/src/schema-compiler/tables.ts:223`，index.ts:9 导出）。
- **词表现状**：`SchemaFieldKind`（`schema.ts:50-57`）＝ meta/prop/region/value-or-region/event/reaction/ignored；`SchemaFieldRule`（schema.ts:135+）已含 params/isolate/regionKey/lazyEval 等完整载体；P0 计划引入的独立 `SchemaDefinitionFieldKind` 在本计划合并回 `SchemaFieldKind`。
- **params/isolate/compiledKey 语义**（迁移必须保留）：wizard/grid 的 `params: ['step','index','key']` / `['item','index','key']`（node-compiler.ts:323-329 pushRegionParamSymbols）、table buttons/cell `isolate: true`；renderer 消费 `titleRegionKey`/`expandedRowRegionKey` 等 compiledKey（wizard-renderer.tsx:41-43、table-header-row.tsx:90-91,307-308、table-body-rows.tsx:231、table-expanded-row.tsx:17）。
- **P1 决策项现状**：wizard `beforeEnter`/`beforeLeave` 仅类型声明（schemas.ts:23,25），renderer 无 dispatch；crud `columns[].searchable`（`crud-schema.ts:74`，`boolean | SchemaInput`）被 table-header-row.tsx:226 消费；carousel `items[].body`（schemas.ts:340）无人消费（carousel.tsx 只渲染 image/title/caption）。
- **typed item 现状**：无 type item（host 结构）按 P0 计划处理；有 type item 的 registry 语义未实现。

## Goals

- `SchemaFieldKind` 统一词表；`fieldRules` 复用 `SchemaFieldRule` 对象形态（params/isolate/regionKey 有载体，与顶层 fields 同构）。
- 编译器按 kind 自动 region 提取 / 字面量 envelope / action 保持模板——取代 normalize/booleanKeys 手工机制。
- **7 处 deepFields 声明迁移到 schema-definition（渲染行为与 params/isolate/compiledKey 语义不变），迁移完成后再删除 deepFields 机制**。
- 删除 `RendererDeepFieldDefinition`/`deepFields`/`shape-validation-deep-fields`/`node-compiler` deepFields 分支/`extractNestedSchemaRegions` 对外 API/`validateNestedBooleanFields`/`DEEP_FIELD_NORMALIZERS`。
- P1 决策项落实：wizard beforeEnter/beforeLeave 接线、columns[].searchable region 化、carousel body 类型删除。
- item 显式 type 完整语义（有 type → registry definition，无 type → 内联）。
- 全量 `typecheck/build/lint/test` 通过；设计文档与 live baseline 一致。

## Non-Goals

- **不**做 P0 修复本身（Plan 1 范围）。
- **不**保留任何 deepFields/booleanKeys 兼容路径（flux 未发布）。
- **不**为 typed item 引入 region 化后的 props 形状迁移（现有 renderer 用无 type item，不受影响）。

## Scope

### In Scope

- `packages/flux-core`：`SchemaFieldKind` 扩展、`SchemaDefinitionFieldKind` 合并删除、`fieldRules` 类型改为 `Record<string, SchemaFieldRule | SchemaFieldKind>`、`RendererDeepFieldDefinition` 删除（迁移完成后）、`extractNestedSchemaRegions` 收敛为内部工具、`matchesFluxValueShape` 的 literal/region 语义。
- `packages/flux-compiler`：propContracts.shape 管道完整接管（含 params/isolate 经 SchemaFieldRule 载体）、region 提取自动化、`shape-validation-deep-fields.ts` 删除、`validateNestedBooleanFields` 删除、node-compiler deepFields 分支删除（迁移完成后）、`DEEP_FIELD_NORMALIZERS` 删除。
- 7 个 renderer 包的定义文件：deepFields 声明迁移（tabs/wizard/grid/collapse/variant-field/table/crud）。
- wizard/crud/carousel 的 P1 决策项。
- typed item 语义。

### Out Of Scope

- P0 修复（Plan 1）。
- host（nop-chaos-next）侧任何改动。

## Failure Paths

| 场景                                | 触发                                     | 行为                                                     | 可重试 | 表现                             |
| ----------------------------------- | ---------------------------------------- | -------------------------------------------------------- | ------ | -------------------------------- |
| 迁移遗漏 params/isolate/compiledKey | 迁移时未在 SchemaFieldRule 载体声明      | 子节点 scope 错误/region 键丢失（renderer 读 undefined） | 否     | 迁移回归由对照测试锁定           |
| 删除先于迁移                        | Phase 顺序颠倒                           | 未迁移声明的 region 提取失效（compileValue 表达式化）    | 否     | 顺序约束写入 Phase Exit Criteria |
| 词表合并破坏既有 fields             | SchemaFieldKind 扩展与既有 kind 语义冲突 | 编译/校验报错或静默                                      | 否     | 全量测试覆盖                     |
| DEEP_FIELD_NORMALIZERS 残留         | 删除遗漏                                 | grep 审计命中、死代码                                    | 否     | Phase 7 grep 审计                |

## Test Strategy

本档选择：`必须自动化`

机制统一涉及编译/校验核心路径与 7 处渲染器声明迁移——契约测试（编译产物、校验行为、params/isolate 对照、渲染回归）是唯一可靠验证；迁移逐控件用既有契约测试 + 新增 fieldRules 分类断言锁定；Phase 4 删除后运行全量测试证明语义闭环。

## Execution Plan

### Phase 1 - 词表统一与 fieldRules 形态（flux-core）

Status: completed
Targets: `packages/flux-core/src/types/schema.ts`、`schema-diagnostics/manifest.ts`

- Item Types: `Fix | Proof`

- [x] `SchemaFieldKind` 扩展为统一词表（meta/prop/value/region/value-or-region/schema/schema-array/event/action/literal/reaction/ignored）；删除独立 `SchemaDefinitionFieldKind`
- [x] `FluxSchemaDefinitionShape.fieldRules` 类型改为 `Readonly<Record<string, SchemaFieldRule | SchemaFieldKind>>`（对象形态承载 params/isolate/regionKey；字符串简写为 kind 名）
- [x] `matchesFluxValueShape` 的 schema-definition case 按统一词表 + literal/region 语义完善
- [x] 类型单测：词表合并后既有 fields 声明兼容、fieldRules 对象形态（含 params/isolate/regionKey）解析正确；**regionKey 双语义显式注明**（顶层 fields：region 键（renderer 读 props.regions）；嵌套 fieldRules：compiledKey 载体（renderer 读 item.titleRegionKey 等）——实现按上下文区分）

Exit Criteria:

- [x] 统一词表与 fieldRules 对象形态落地（schema.ts/manifest.ts 可 grep）；`SchemaDefinitionFieldKind` 零引用
- [x] `pnpm --filter @nop-chaos/flux-core test` 通过；局部 tsc 通过（**RendererDeepFieldDefinition 保留至 Phase 4**，此处不删）

### Phase 2 - 编译器自动化（新管道接管，deepFields 并行保留）

Status: completed
Targets: `packages/flux-compiler/src/schema-compiler/node-compiler.ts`、`nested-regions.ts`（flux-core）

- Item Types: `Fix | Proof`

- [x] propContracts.shape 管道完整接管：region/schema kind 自动 region 提取（内置逻辑取代 `extractNestedSchemaRegions` 手工调用；params/isolate 经 SchemaFieldRule 载体 → pushRegionParamSymbols/regionMeta，语义与手工 normalize 一致）
- [x] literal kind 自动 envelope（取代 normalize 手工 `__nopPreserveLiteral` 包裹）
- [x] **deepFields 分支保留**（并行：同一字段不会同时声明 deepFields 与 schema-definition，互斥安全）；对照测试逐项验证新管道与手工 normalize 语义一致（params/isolate/compiledKey）
- [x] 编译契约测试：region 提取（含 params/isolate）、literal envelope、action 保持模板三分支

Exit Criteria:

- [x] 新管道按 kind 自动分类（focused 单测）；与手工 normalize 的对照测试通过（params/isolate/compiledKey 语义一致）
- [x] 局部 tsc（flux-compiler）通过

### Phase 3 - 既有 deepFields 声明迁移（7 处）

Status: completed
Targets: `basic-renderer-definitions.ts`、`layout-renderer-definitions.ts`、`data-renderer-definitions.ts`、`crud-renderer-definition.ts`、`variant-field.tsx`（及各自 propContracts）

- Item Types: `Fix | Proof`

- [x] tabs（basic:456）：items 的 title/body/toolbar → propContracts.shape 内联（title → value-or-region、body → region、**toolbar → region**、disabled 等 literal 语义保留）——tabs 现 propContracts 无 items，需新建声明
- [x] wizard（layout:126）：steps 的 title/body/actions/disabled → fieldRules（disabled → literal；title → value-or-region；body/actions → region，params 保留）
- [x] grid（layout:296）：items 的 body → fieldRules（region，params/isolate 经 SchemaFieldRule 载体保留）
- [x] collapse（layout:418）：items 的 title/body → fieldRules + **disabled → literal**（booleanKeys:437，isItemDisabled 经 unwrapBooleanLiteral 消费——与 tabs/wizard 一致）
- [x] variant-field（variant-field.tsx:166）：variants 的 content/viewer → fieldRules（region）+ **`match.when` → literal**（expression 匹配的字面量保护：normalizeVariantItems 的 `__nopPreserveLiteral` 包裹 + `unwrapPreservedMatchWhen` 消费，`variant-field.tsx:144-157`——删除 normalize 后须由 literal kind 接管，否则 expression 匹配静默禁用）；无 propContracts 需新建声明
- [x] table（data:282 + :311）：columns 的 label/cell/buttons/quickEdit.body + expandable.expandedRow（params/isolate）+ **popOver.content（contentRegionKey + params/isolate，data:62-87，table-cell-chrome.tsx:34-45 消费）** → fieldRules
- [x] crud（crud-definition:400）：columns 的 label/cell/buttons/quickEdit.body（**注意双 authored 形态：直接 `column.body` 与 `quickEdit.body` 映射同一 `quickEditBodyRegionKey`，quickEdit.body 优先——迁移须双形态覆盖并补契约断言**）+ columns[].searchable（value-or-region）→ fieldRules
- [x] **逐控件执行顺序**：先声明 propContracts.shape → 移除该控件 deepFields → 再跑对照/契约测试（避免新声明被 deepFields 分支吞掉的空转通过）；全部完成后 **renderer 声明的 `deepFields` 零引用**（全仓零引用归 Phase 4——node-compiler 分支与类型保留至删除）

Exit Criteria:

- [x] 7 处声明迁移完成、`deepFields` 零引用（grep 证据）
- [x] 各包契约测试通过（params/isolate/compiledKey 语义不回归）；局部 tsc 通过

### Phase 4 - 删除 deepFields 机制（迁移完成后）

Status: completed
Targets: `flux-core/src/types/renderer-definition-types.ts`、`node-compiler.ts`、`shape-validation-deep-fields.ts`、`shape-validation-node-fields.ts`、`nested-regions.ts`、`tables.ts`

- Item Types: `Fix | Proof`

- [x] 删除 `RendererDeepFieldDefinition` 类型
- [x] 删除 `node-compiler.ts` deepFields 分支（:297 附近 normalize/nestedRegions/booleanKeys 处理）
- [x] 删除 `shape-validation-deep-fields.ts`（analyzeDeepSchemaField 的 deepFields 分支）；schema-definition 校验接管
- [x] 删除 `validateNestedBooleanFields` 与 booleanKeys 校验分支（shape-validation-node-fields.ts:126,253-261）；literal kind 校验接管
- [x] 删除 `DEEP_FIELD_NORMALIZERS`（tables.ts:223 与 index.ts:9 导出）及相关手工 normalize 工具：`normalizeTableColumns`/`normalizeTabsItems`/`normalizeVariantItems`/`normalizeTableExpandable`/`normalizeBooleanLikeField`（tables.ts:9-16）/`normalizeDeepFieldNestedRegions`（node-compiler deepFields 分支内部）/data 局部 `normalizeTableExpandable`（data:123）、`TABLE_COLUMN_REGION_FIELDS`/`TABS_ITEM_REGION_FIELDS`/`VARIANT_ITEM_REGION_FIELDS`/`TABS_ITEM_BOOLEAN_FIELDS` 常量、`DeepFieldNormalizer` 类型、各 renderer 包内局部 normalize（basic:480、data:307、layout:153/308/438、crud:425、variant-field:181）
- [x] `extractNestedSchemaRegions` 收敛为编译器内部工具（对外导出移除）
- [x] 删除后全量契约测试 + 渲染测试通过（语义闭环证明）；**嵌套 region 参数作用域诊断接管**（analyzeDeepSchemaField → createRegionTraversalState(params) 递归的参数符号跟踪，shape-validation-analyze.ts:195-209，由 schema-definition 校验接管并补对照验证）

Exit Criteria:

- [x] `deepFields`/`nestedRegions`/`booleanKeys`/`DEEP_FIELD_NORMALIZERS` 零引用（grep 证据，除文档）
- [x] 全量契约测试通过（编译/校验/渲染行为不回归）；局部 tsc 通过

### Phase 5 - P1 决策项落实

Status: completed
Targets: `wizard-renderer.tsx`、crud 定义与 `table-header-row.tsx`、`carousel.tsx` + content schemas

- Item Types: `Fix | Proof`

- [x] wizard `beforeEnter`/`beforeLeave` 接线 renderer（step 切换生命周期 dispatch，含 abort 语义与 `{ok:false}` 阻止约定）并在 steps 的 fieldRules 声明为 event
- [x] crud `columns[].searchable` 的 SchemaInput 形态按 value-or-region region 化（**table-header-row.tsx:226 的 `column.searchable.placeholder` 读取需同步改为 region 渲染路径**——消费路径验证 + 同步修改）
- [x] carousel `items[].body` 类型声明删除（限定 `CarouselItemSchema.body`，schemas.ts:340 与 propContracts 描述同步清理）
- [x] 各决策项契约测试（wizard 生命周期 dispatch、searchable region 化、carousel 类型清理）

Exit Criteria:

- [x] wizard beforeEnter/beforeLeave dispatch 有 focused 单测（含旧值污染场景）；searchable 的 SchemaInput 形态按 region 语义编译（focused 单测）；`CarouselItemSchema.body` 零引用
- [x] 局部 tsc 通过

### Phase 6 - item 显式 type 完整语义

Status: completed
Targets: `flux-compiler/src/schema-compiler/`（propContracts.shape 管道）

- Item Types: `Fix | Decision | Proof`

- [x] 管道遇 schema-definition 容器元素：有 `type` → `registry.get(type)` 完整 definition（字段分类/region 编译）；无 type → 内联 fieldRules
- [x] 双定义并存（typed item + 父级 fieldRules）→ 以显式 type 为准并 emit 诊断
- [x] 契约测试：typed item 走 registry（字段分类生效）、无 type item 走内联、并存诊断

Exit Criteria:

- [x] typed item 语义落地（focused 单测三分支）；局部 tsc 通过

### Phase 7 - 全仓审计、回归与文档核对

Status: completed
Targets: 全仓 + `docs/architecture/nested-schema-field-classification.md`

- Item Types: `Proof | Follow-up`

- [x] 全仓 grep 审计：`deepFields`/`nestedRegions`/`booleanKeys`/`normalize(`/`extractNestedSchemaRegions`/`DEEP_FIELD_NORMALIZERS`/`visitNestedSchemaRegions`（删除后成孤儿导出）零引用（除编译器内部工具与文档）
- [x] 全仓 props 内 dispatch 审计（grep `dispatch(...props.props.X as ActionSchema` 模式）——确认无遗漏的"props 里嵌 action"字段
- [x] `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` 全量通过（Closure Gates 的仓库级验证在此一并执行）
- [x] 设计文档（v8）与 live baseline 核对（无漂移；迁移清单、删除项、P1 决策与实际一致）；daily log（`docs/logs/2026/08-02.md`）记录

Exit Criteria:

- [x] 遗留机制零引用（grep 证据）
- [x] 全量验证通过（证据记入 daily log）
- [x] 设计文档与 live baseline 一致

## Draft Review Record

- Reviewer / Agent: 三轮独立子 agent（fresh sessions）：`ses_03f8e8d3fffekEylMis2zBqMCd`（第一轮 revised 4 Major）→ 修订 → `ses_03f7d730affe3DHmjUTf5mKjhr`（第二轮 revised 2 Major）→ 修订 → 第三轮（pass-with-minors）
- Verdict: `pass-with-minors`（零 Blocker / 零 Major）
- Rounds: 3
- Findings addressed:
  - M1（Phase 顺序：迁移先于删除；RendererDeepFieldDefinition 保留至 Phase 4）
  - M2（第 7 处 variant-field、table expandable/label、DEEP_FIELD_NORMALIZERS）
  - M3（tabs toolbar → region）
  - M4（fieldRules 复用 SchemaFieldRule 对象形态，params/isolate/regionKey 载体）
  - N1（variant-field match.when → literal）
  - N2（table popOver.content region）
  - N3-N7 与 searchable 消费路径（已并入对应 Phase）
  - Minor 1-4（删除清单枚举、visitNestedSchemaRegions 审计词、Phase 3 措辞、table/crud 双形态注明）

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部 `[x]` 后，方可 `Plan Status: completed`。

- [x] 统一词表落地（SchemaFieldKind 为唯一分类词表；fieldRules 复用 SchemaFieldRule 对象形态）
- [x] 编译器按 kind 自动化（region 提取含 params/isolate、literal envelope、action 保持模板），手工 normalize/booleanKeys 机制删除
- [x] deepFields 全仓零引用（类型/声明/编译/校验分支/DEEP_FIELD_NORMALIZERS 全部移除）
- [x] P1 决策项落实（wizard 接线、searchable region 化、carousel body 删除）
- [x] typed item 完整语义落地
- [x] 不存在被静默降级到 deferred/follow-up 的 in-scope 项（过时实现全部删除，无兼容路径）
- [x] 设计文档与 live baseline 一致（v8 核对）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 本计划无 in-scope deferred 项——用户裁定"不保留兼容路径、过时实现全部删除"，P1 决策项已全部纳入 Phase 5，第 7 处声明（variant-field）与 table expandable/label 已纳入 Phase 3。

## Non-Blocking Follow-ups

- 内建 action definition 与 `classifyActionSelector` 的关系文档化（选择器解析 vs 参数校验职责划分）——治理项。
- host（nop-chaos-next）重打包验证 host 编辑提交修复——跨仓库 successor（flux 发版后执行），不在本仓库计划内。

> 注：`validateActionShape` 的 ajax 硬编码分支迁移由 Plan 3（`2026-08-02-3-ajax-validation-migration.md`）接管（依赖 Plan 1 的 definition 校验管道），不再列于此。

## Closure

Status Note: 全 7 Phase + Closure Gates 全绿（typecheck/build/lint/test 31/31·31/31·31/31·58/58，flux-compiler 521）；独立子 agent 闭包审计 pass。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，`ses_03d621806ffeM4293giE5QpQLc`）
- Evidence: 逐项核对 live repo——统一词表（`SchemaFieldKind` 12 项、`SchemaDefinitionFieldKind` 零引用、fieldRules 统一形态）、遗留机制 14 词全零引用（tables.ts/shape-validation-deep-fields.ts 删除、extractNestedSchemaRegions 对外导出移除）、typed item 语义（编译 + 校验双路径 + `conflicting-field-definition` 诊断）、P1 决策项（wizard dispatch/abort、searchable region 化、carousel body 删除）、设计文档 v8 与 live baseline 一致；`--force` 全量验证复跑全绿。Verdict: **pass**（零 Blocker / 零 Major；3 Minor 均为过程性事项——注释残留（允许）、本 gate 勾选（本记录）、未提交（后续提交））。

Follow-up:

- 工作树未提交（plan-2026-08-02-2 全 Phase + 审计证据）；按仓库流程提交，full-green 验证状态（unit 全绿；e2e pre-existing 9 失败基线见 daily log）写入提交说明。
- 非阻塞治理项：内建 action definition 与 `classifyActionSelector` 关系文档化（见 Non-Blocking Follow-ups）。
