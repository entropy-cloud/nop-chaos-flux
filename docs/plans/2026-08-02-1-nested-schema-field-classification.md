# 2026-08-02 嵌套 Schema 字段分类机制落地（Nested Schema Field Classification）

> Plan Status: completed
> Last Reviewed: 2026-08-02
> Source: `docs/architecture/nested-schema-field-classification.md`（v7，经六轮独立审查达成共识）、`docs/discussions/2026-08-02-schema-subtree-recursive-classification.md`
> Related: `docs/plans/2026-08-01-flux-field-selector-contract.md`

## Purpose

落地"属性内联 schema definition"机制：让 props 里嵌套的 schema/action 结构（dropdown-button items、select searchSource、crud quickSaveAction、内建 action args 等）在编译期按属性定义分类（event/action → 保持模板、schema → region 语义、value → 表达式），消除"行 scope 求值污染嵌套 action args"这一 live defect（host CRUD 行内 dropdown 编辑提交旧值），并为编译/校验双路径提供同一 definition 依据。

## Current Baseline

> 已逐条核对 live repo（六轮独立审查证据）。

- **live defect（已复现）**：CRUD 行内 `dropdown-button` 的 items 里嵌 openDialog 编辑表单，提交行数据旧值。playground 注册 layout renderers + dropdown items 结构下稳定复现（提交 `RowNick` 而非编辑值）。
- `RendererDeepFieldDefinition`（`flux-core/src/types/renderer-definition-types.ts:103-108`）只有 `nestedRegions`/`booleanKeys`/`normalize`，无嵌套 event/action 分类；`SchemaFieldKind`（`schema.ts:50-57`）为封闭联合（meta/prop/region/value-or-region/event/reaction/ignored，无 value）。
- `FluxValueShape`（`flux-core/src/schema-diagnostics/manifest.ts:14-88`）已有递归容器（array.item/object.fields/record.value）；`matchesFluxValueShape`（`value-shape-runtime.ts:11-62`，default **false**）、`validateFluxValueShape`（`flux-compiler/src/schema-compiler/flux-value-shape-validation.ts:107`，default **true**）、`summarizeExpectedFluxValueShape`（同 :56）三处 switch 消费 shape。
- `compileSingleNode`（`node-compiler.ts`）**不读 propContracts**（只读 fields/deepFields/compilation artifacts）；dropdown-button items 走 `compileValue`（:372）→ 表达式化 → `resolveNodeProps`（`node-runtime.ts:254`）行 scope 求值污染。
- `__nopPreserveLiteral` envelope（`flux-formula/src/compile/compile-node.ts:48-57`）短路 static-node；**嵌套位置不自动解包**（全静态 item 存含 envelope 原始对象，:146-162）；`unwrapPreservedLiteral`/`unwrapBooleanLiteral`（`flux-react/src/preserve-literal.ts`）为 renderer 侧解包 API（wizard-renderer.tsx:64 / collapse-renderer.tsx:25 先例）。
- `evaluateSurfaceArgs`（`flux-action-core/src/action-dispatcher/built-in-actions.ts:19-40`）只对顶层 isSchema 键原始值覆盖；`BUILT_IN_ACTION_REGISTRY`（`flux-core/src/constants.ts:18-34`）15 canonical + submit 别名，**refreshNearest 缺失**（`built-in-actions.ts:255` 有实现）。
- 编译/校验对 action args（openDialog args.body 等）均无验证（`shape-validation-node-fields.ts:263` event 分支 continue 不递归）。
- P0 控件现状：dropdown-button/button-group（layout）items 无形状定义（"pure value prop"）；select `searchSource`（form）、tree `searchSource`/`childrenSource`（form-advanced）、crud `quickSaveAction`/`quickSaveItemAction`（data）、picker `loadAction`/`labelResolveAction`（form-advanced）、input-file `uploadAction`/`deleteAction`（form-advanced，upload-schemas.ts:38,40）、form `validate.action`（schemas.ts:68,297）均无 action 分类。

## Goals

- 落地 `schema-definition` shape 机制（FluxValueShape 扩展 + `SchemaDefinitionFieldKind` 封闭联合 + `actionValue` 标记）。
- 编译/校验双路径按属性内联 definition 分类嵌套结构（编译：event/action → envelope 保持模板；校验：按 fieldRules 递归）。
- P0 控件属性定义内联 + renderer 解包，修复 host 编辑提交旧值 live defect。
- 内建 action 每类型一个 definition；refreshNearest 注册表补正；onClose/onSubmitSuccess 兑现边界（选项①运行时保留）。
- 契约测试（含"全静态 items"红线）与 playground e2e 场景锁定行为。
- 全量 `typecheck/build/lint/test` 通过。

## Non-Goals

- **不**做 P1 项（wizard beforeEnter/beforeLeave、crud columns[].searchable、carousel items[].body）——renderer 未消费/未渲染，需先决策或接线（见 Deferred But Adjudicated）。
- **不**支持 item 显式 type 的完整语义（v1 规则：emit 诊断 + 照内联 definition 处理）。
- **不**迁移 `validateActionShape` 的 ajax 硬编码分支——由 Plan 3（`2026-08-02-3-ajax-validation-migration.md`）接管（依赖本计划 P6 的 definition 校验管道）。
- **不**改 host（nop-chaos-next）代码——仅 flux 先发版，host 重打包验证。

## Scope

### In Scope

- `packages/flux-core`：FluxValueShape 类型、SchemaDefinitionFieldKind、matchesFluxValueShape case、内建 action definition 表 + refreshNearest 注册补正。
- `packages/flux-compiler`：validateFluxValueShape/summarizeExpectedFluxValueShape case、compileSingleNode propContracts.shape 管道、evaluateSurfaceArgs 兑现边界（若归 flux-action-core 则属该包）。
- `packages/flux-renderers-layout`：dropdown-button/button-group 解包 + 属性定义内联。
- `packages/flux-renderers-form` / `-advanced` / `-data`：searchSource/quickSaveAction/picker/uploadAction/validate 的 actionValue 声明。
- 契约测试 + playground 场景。

### Out Of Scope

- P1 三项（Deferred）。
- e2e-shared 侧改动（跨仓库，host 重打包验证由 successor 收口）。
- wizard/carousel 的 renderer 接线与 body 渲染决策。

## Failure Paths

> 本计划不改错误处理/鉴权；主要风险是实现层行为分裂与消费不对称。

| 场景                                       | 触发                                                     | 行为                                       | 可重试 | 表现                                                        |
| ------------------------------------------ | -------------------------------------------------------- | ------------------------------------------ | ------ | ----------------------------------------------------------- |
| 全静态 items 的 envelope 泄漏              | dropdown items 全静态（host 真实结构）且 renderer 未解包 | dispatch envelope 而非 action → 动作失效   | 否     | 菜单项点击无响应                                            |
| 三处 shape switch 不同步                   | 只改 matchesFluxValueShape 漏 validate 侧                | 一侧静默拒绝、一侧静默放行                 | 否     | 校验行为不一致（契约测试锁定）                              |
| item 含动态字段时行为分裂                  | item 任一字段含 `${}`                                    | object-node 条目级自动解包 vs 全静态不解包 | 否     | 同 schema 不同数据表现不同（红线测试锁定）                  |
| propContracts.shape 管道与 deepFields 冲突 | 同一字段既有 deepFields 又有 schema-definition           | 双重处理或互吞                             | 否     | 编译产物异常（实现时定义优先级：deepFields normalize 先行） |

## Test Strategy

本档选择：`必须自动化`

编译/校验是核心回归路径，且存在"全静态 vs 动态行为分裂"这一隐蔽缺陷——必须用契约测试（compileNode 层 + 运行时层 + shape 校验层）锁定；红线测试（全静态 items 泄漏断言）在编译支持落地后立即编写，先红后绿。

## Execution Plan

### Phase 1 - 类型扩展与 flux-core shape 消费

Status: completed
Targets: `packages/flux-core/src/schema-diagnostics/manifest.ts`、`value-shape-runtime.ts`

- Item Types: `Fix | Proof`

- [x] `FluxValueShape` 新增 `schema-definition` kind：`FluxSchemaDefinitionShape { kind: 'schema-definition'; fieldRules: Readonly<Record<string, SchemaDefinitionFieldKind>>; actionValue?: true }`
- [x] 定义 `SchemaDefinitionFieldKind` 封闭联合（value/event/region/schema/schema-array/action）
- [x] `matchesFluxValueShape` 增加 `schema-definition` case（按 fieldRules 校验；actionValue 整值走本地近似：isPlainObject + action 字符串键）
- [x] 类型单测：schema-definition 匹配/拒绝、actionValue 语义、flux-core 侧词表与 `SchemaDefinitionFieldKind` 定义一致（validate/summarize 的对称性断言在 Phase 2）

Exit Criteria:

- [x] `schema-definition` shape 类型与 case 已落地，`pnpm --filter @nop-chaos/flux-core test` 相关用例通过
- [x] 局部 `tsc -p tsconfig.build.json`（flux-core）通过

### Phase 2 - 校验支持（flux-compiler）

Status: completed
Targets: `packages/flux-compiler/src/schema-compiler/flux-value-shape-validation.ts`

- Item Types: `Fix | Proof`

- [x] `validateFluxValueShape` 增加 `schema-definition` case（与 Phase 1 语义一致，避免"一侧拒绝一侧放行"）
- [x] `summarizeExpectedFluxValueShape` 增加对应 case（default 'unknown' → schema-definition 摘要）
- [x] 校验单测：schema-definition 按 fieldRules 校验通过/字段错误被诊断；与 matchesFluxValueShape 行为一致性断言

Exit Criteria:

- [x] 三处 shape 消费对 schema-definition 行为一致（对称性契约测试）
- [x] 局部 `tsc -p tsconfig.build.json`（flux-compiler）通过

### Phase 3 - 编译支持（propContracts.shape 管道 + 红线测试）

Status: completed
Targets: `packages/flux-compiler/src/schema-compiler/node-compiler.ts`

- Item Types: `Fix | Proof`

- [x] `compileSingleNode` 新增 `renderer.propContracts?.[key]?.shape` 查找（含 array.item/record.value/object.fields 容器遍历，**不依赖 deepFields**）
- [x] 命中 `schema-definition` 按固定顺序处理：先 normalize（region 提取，仅 item 顶层 schema 子树）→ 再按声明（actionValue 整值 envelope；逐字段按 fieldRules：event/action → envelope、region/schema/schema-array → region 提取/保持、value → 表达式；onClick 归一化到 action）
- [x] deepFields 与 schema-definition 并存的优先级（deepFields normalize 先行）实现并注明
- [x] **红线契约测试（最先写）**：dropdown-button items（全静态）的 onClick 编译为 envelope（不进 props 表达式）；运行时 dispatch 断言（见 Phase 7 细化）

Exit Criteria:

- [x] 编译层按内联 definition 分类生效（focused 单测：envelope 包裹/region 提取/表达式求值三分支）
- [x] 红线测试存在且当前为红（未实现完整链路前）或随链路推进转绿
- [x] 局部 `tsc -p tsconfig.build.json`（flux-compiler）通过

### Phase 4 - renderer 解包

Status: completed
Targets: `packages/flux-renderers-layout/src/dropdown-button-renderer.tsx`、`button-group-renderer.tsx`

- Item Types: `Fix`

- [x] dropdown-button dispatch 处新增 `unwrapPreservedLiteral(item.action) ?? item.action ?? unwrapPreservedLiteral(item.onClick) ?? item.onClick`
- [x] button-group dispatch 处新增 `unwrapPreservedLiteral(item.action) ?? item.action`（无 onClick fallback，与 renderer 现状一致）
- [x] 解包链对三种产物形态（envelope/原始 action/混合）的 focused 单测

Exit Criteria:

- [x] 两 renderer 的 dispatch 解包已落地并有 focused 单测
- [x] 局部 `tsc -p tsconfig.build.json`（flux-renderers-layout）通过

### Phase 5 - P0 控件属性定义内联

Status: completed
Targets: `layout-renderer-definitions.ts`、`flux-renderers-form/src/schemas.ts` 等各包定义文件

- Item Types: `Fix | Decision`

- [x] `dropdown-button`/`button-group`：`items` 的 `array.item: schema-definition`（fieldRules：action/onClick → event、label/disabled/destructive → value）；propContracts 描述同步修正（去 "pure value prop, no nested regions"）
- [x] select `searchSource`、tree `searchSource`/`childrenSource`、crud `quickSaveAction`/`quickSaveItemAction`、picker `loadAction`/`labelResolveAction`、input-file `uploadAction`/`deleteAction`、form `validate.action` → `schema-definition` + `actionValue: true`（picker `pickerDialog` 为纯配置对象 dialogConfig，无 action args，显式排除）
- [x] closed-model 字段完整性：fieldRules 穷举 item 全部键（含 key/icon 等既有项），或校验走宽松模式（按设计 §6 裁定并落地）

Exit Criteria:

- [x] P0 控件属性定义已内联（定义文件可 grep 到 schema-definition/actionValue）
- [x] 各包局部 `tsc -p tsconfig.build.json` 通过

### Phase 6 - 内建 action definition 与兑现边界

Status: completed
Targets: `flux-core/src/constants.ts`、`flux-action-core/src/action-dispatcher/built-in-actions.ts`

- Item Types: `Fix | Decision | Proof`

- [x] 内建 action definition 表（每类型一个 fieldRules，锚定 `BUILT_IN_ACTION_REGISTRY` ∪ `runBuiltInAction` switch）
- [x] `refreshNearest` 补入 `BUILT_IN_ACTION_REGISTRY`（含 BuiltInActionSchema TS 联合）
- [x] 兑现边界选项①：`evaluateSurfaceArgs` 对契约标注 action 类键（onClose/onSubmitSuccess/onSubmitError）做原始值保留（不整体求值）
- [x] `validateActionShape` 按 definition 校验 args 形状 + `args.body` 递归 analyzeSchemaInput 的接入（设计 v8 §3.5 明确承诺，in-scope 落地，不留 defer 出口）
- [x] ajax 硬编码分支迁移——**由 Plan 3（`2026-08-02-3-ajax-validation-migration.md`）接管**（依赖本 Phase 的 definition 校验管道就绪）

Exit Criteria:

- [x] action definition 表落地 + refreshNearest 注册补正（constants.ts 可 grep）
- [x] onClose/onSubmitSuccess 不被 dispatch scope 求值（focused 单测）
- [x] 局部 `tsc -p tsconfig.build.json`（flux-core / flux-action-core）通过

### Phase 7 - 契约测试收口与 playground 场景

Status: completed
Targets: 各包 `__tests__/`、`apps/playground/src/component-lab/renderers/dialog-lab-page.tsx`、`tests/e2e/component-lab/`

- Item Types: `Proof | Follow-up`

- [x] 红线测试转绿：全静态 items 的 envelope 解包 + dispatch 断言（static/object-node 行为分裂回归）
- [x] compileNode 层：dropdown-button items 的 onClick 编译为模板（不进 props 表达式）——以 `submit-action-lazy-execution.test.tsx` 为模型
- [x] shape-validation 层：schema-definition 按 fieldRules 校验、三处 switch 对称性
- [x] 新增"searchSource / quickSaveAction / picker loadAction / uploadAction 不被 props 求值污染"断言
- [x] 兑现边界锁定：onClose/onSubmitSuccess 不被 dispatch scope 求值
- [x] 现状核对：multi-scenario-lab-page 已注册 layout renderers、dialog-lab-page 已有 dropdown-button 复现结构（含 nickName: RowNick 行数据）——本项仅补正式 e2e 场景断言（提交编辑值），不改注册/复现结构

Exit Criteria:

- [x] 全部契约测试绿（含红线、对称性、污染断言）
- [x] playground e2e 新场景通过（提交编辑值）

### Phase 8 - 回归与 owner-doc 定稿

Status: completed
Targets: `docs/architecture/nested-schema-field-classification.md`、`docs/logs/2026/08-02.md`

- Item Types: `Follow-up`

- [x] `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` 全量通过
- [x] 设计文档按 Minimum Rule 14 重写为**最终设计状态**（去 draft 表述、去"Proposed vs Current"叙事、保留方案与拒绝理由）
- [x] daily log（`docs/logs/2026/08-02.md`）记录落地与验证结果

Exit Criteria:

- [x] 全量验证通过（证据记入 daily log）
- [x] 设计文档定稿（无 draft/Proposed 残留）

## Draft Review Record

- Reviewer / Agent: `ses_03f8e8d3fffekEylMis2zBqMCd`（独立子 agent，fresh session）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major；Minor 已修订：playground 现状核对（layout 已注册、复现结构已存在）、pickerDialog 显式排除、Phase 5 Item Types 补 Decision、Phase 1 词表断言收窄至 flux-core 侧

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部 `[x]` 后，方可 `Plan Status: completed`。

- [x] live defect（dropdown items 内嵌 openDialog 提交旧值）已修复并有回归测试
- [x] 编译/校验双路径按内联 definition 分类已落地（fieldRules/actionValue 语义完整）
- [x] P0 控件属性定义内联完成（清单见 Phase 5）
- [x] 内建 action definition + refreshNearest 注册补正 + 兑现边界选项①已落地
- [x] 不存在被静默降级到 deferred/follow-up 的 in-scope live defect 或 contract gap
- [x] 设计文档已同步为最终状态（非 draft）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 以下 4 项均已被 successor 计划 `docs/plans/2026-08-02-2-nested-schema-mechanism-unification.md`（Plan 2）**显式接管**（状态：moved to explicit successor ownership）——按 Anti-Slacking Rule 状态裁定，不再由本计划（P0 修复）承担。

### wizard `beforeEnter`/`beforeLeave`（P1）

- Classification: `moved to successor ownership`
- Why Not Blocking Closure: 由 Plan 2 Phase 5 接线 renderer + fieldRules 声明（event）；本计划只修 P0 面。
- Successor: `docs/plans/2026-08-02-2-nested-schema-mechanism-unification.md`

### crud `columns[].searchable`（P1）

- Classification: `moved to successor ownership`
- Why Not Blocking Closure: 由 Plan 2 Phase 3/5 迁移（value-or-region）+ 消费路径改造；本计划只修 P0 面。
- Successor: `docs/plans/2026-08-02-2-nested-schema-mechanism-unification.md`

### carousel `items[].body`（P1）

- Classification: `moved to successor ownership`
- Why Not Blocking Closure: 由 Plan 2 Phase 5 删除类型声明（过时实现删除）；本计划只修 P0 面。
- Successor: `docs/plans/2026-08-02-2-nested-schema-mechanism-unification.md`

### item 显式 type 的完整语义

- Classification: `moved to successor ownership`
- Why Not Blocking Closure: 由 Plan 2 Phase 6 落地（有 type → registry，无 type → 内联）；本计划按 v1 规则（emit 诊断）处理。
- Successor: `docs/plans/2026-08-02-2-nested-schema-mechanism-unification.md`

## Non-Blocking Follow-ups

- 内建 action definition 与 `classifyActionSelector` 的关系文档化（选择器解析 vs 参数校验职责划分）——治理项。
- host（nop-chaos-next）重打包验证 host 编辑提交修复——跨仓库 successor（flux 发版后执行），不在本仓库计划内。
- ajax 硬编码分支迁移——由 Plan 3（`2026-08-02-3-ajax-validation-migration.md`）接管，本计划不再承担。

## Closure

Status Note: 8 Phase 全部完成（类型/校验/编译/解包/定义内联/action definition/契约与 e2e/回归定稿）。live defect（CRUD 行内 dropdown 内嵌 openDialog 提交旧值）已修复：schema-definition 编译管道使 items 内 event/action 保持模板，renderer 解包链 dispatch 原始 action，e2e `dialog-dropdown-row-edit.spec.ts` 真实浏览器验证提交编辑值。全量验证：build 31/31；typecheck/lint/test 新增 0 失败（既有基线缺陷记录于 daily log：nop-debugger parse error、flux-compiler strict-mode ×3 等，均与 base 88e4de65 一致）。Deferred 4 项全部由 Plan 2（mechanism-unification）显式接管；ajax 硬编码分支迁移由 Plan 3（ajax-validation-migration）接管，本计划已交付其依赖的 definition 校验管道。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent `ses_03ec38105ffeBq6RWpnleAixRt`（fresh session，只读复核）
- Evidence: 逐 Phase 核对 live repo 落地证据（manifest.ts/node-compiler.ts/built-in-actions.ts/各包 definitions/测试文件/e2e），独立运行 core 9+19、compiler 32、action-core 1、layout 20、e2e 1 全部通过；文本一致性（8 Phase 全 completed、无残留 `[ ]`）、deferred 诚实性（Plan 2/3 文件存在并接管）、interface-vs-semantics（编译管道非死代码、解包链实际调用、definition 表被双路径消费）——verdict `approved`，零 Blocker/Major。

Follow-up:

- 内建 action definition 与 `classifyActionSelector` 的关系文档化（治理项）。
- host（nop-chaos-next）重打包验证 host 编辑提交修复（跨仓库 successor）。
- ajax 硬编码分支迁移由 Plan 3（`2026-08-02-3-ajax-validation-migration.md`）执行。
- 机制统一（deepFields 删除、7 处声明迁移、typed item 语义）由 Plan 2（`2026-08-02-2-nested-schema-mechanism-unification.md`）执行。
