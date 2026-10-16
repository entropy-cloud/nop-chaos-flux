# 615 RM-13 data 族行标识 `rowKey` 并入单标准 `itemKey`（作者面 schema 属性统一）

> Plan Status: draft
> Last Reviewed: 2026-10-16
> Source: `docs/backlog/renderer-metamodel-roadmap.md` RM-13（新增，provenance 见授权链）；`docs/plans/614-rm12-itemkey-plan.md` `## Human Adjudication Request`（裁决请求本体，本 plan 即其裁决落地）
> Related: roadmap Cross-Cutting 7（单标准零兼容分叉）；`docs/references/naming-conventions.md` §4.9（`itemKey` 唯一字段名）

## Purpose

RM-12 已把数组容器族（array-field / combo / input-table）的 schema 属性统一为 `itemKey`，但 data 族（`TableSchema`/`CrudSchema`）仍叫 `rowKey`——同一个作者面语义（"每条记录用哪个字段做身份"）有两个名字。本 plan 将 data 族的**作者面 schema 属性**并入单标准 `itemKey`，并把渲染器内部的行身份结构命名（`TableRowEntry.rowKey` 等）显式裁定为"保留 row 词、文档化分工"，使"同一语义两个名字"的词汇债彻底消亡、同时不让表格内部说出容器词。

## 授权链（保护区 + 工作项新增）

触及 `renderer definition fields`（table/crud 的 prop 注册改名）与公开 schema 属性改名，属 plan-first / 结构性重构。授权链落字：①**2026-10-16 用户显式指令**（本次会话原话："不考虑修改成本，你认为是否统一更好？如果是，则拟制计划完成修改。"）——**用户将 A/B 选择权交由 AI 判断并授权拟制，AI 判定「统一」**；该指令构成 roadmap Rule 6「工作项增删先报人工确认」所要求的**人工确认**（确认的是「新增 RM-13 并执行」这一动作）；②roadmap Cross-Cutting 7（单标准零兼容分叉，2026-10-15 用户指令）；③RM-12 plan 的 `## Human Adjudication Request` 节（六类 live 枚举 + 两方案 A/B + 建议 A）——本 plan 采纳**方案 B**（并入单标准），与 RM-12 建议不同，差异理由见下「裁定依据」；④`docs/references/naming-conventions.md` §4.9 已入库（`itemKey` 唯一字段名、不引入 `rowKey` schema 字段）。
**授权范围扩张的诚实披露（R3 m5）**：作者面作用域符号 `childrenSource` scope 的 `rowKey`（Baseline 第三类）**不在 RM-12 裁决请求的六类 live 枚举内**——将其纳入改名面属对「统一」授权的**扩张解释**（依据=用户指令的「统一」意图 + Cross-Cutting 7 零兼容分叉 + 该符号与 `itemKey` 属性构成同语义双拼写）。其性质为**作者表达式契约变更**（作者写 `${rowKey}` 会断）。**若人工不认可该扩张，回退方案**=将其登记为「预期保留」（与 `__rowKey` 同类）并把相应收口口径改为定向放行；回退不影响 schema 属性面改名（主体交付）。

## 裁定依据（为何选 B，以及为何内部命名不并入）

**选 B（作者面统一）的依据**——RM-12 拟制时以"语义不同族"倾向方案 A，但本 plan 拟制期的 live 实现对照否证了"不同族"：

```ts
// 容器族 packages/flux-renderers-form-advanced/src/composite-field/composite-item-keys.ts:20-21
const explicitValue = itemKeyField ? getIn(item, itemKeyField) : undefined;
const compatibilityValue = explicitValue ?? item.__rowKey ?? item.id;

// data 族 packages/flux-renderers-data/src/table-renderer/table-data.ts:20-21
const explicitValue = rowKeyField ? getIn(record, rowKeyField) : undefined;
const compatibilityValue = explicitValue ?? record.__rowKey ?? record.id;
```

两处**同一函数形状**（限定：**同形在"作者面取键语义"这一层**——同 fallback 链 `显式字段 ?? __rowKey ?? id`、同 `__rowKey` 兼容键、平行形参名 `itemKeyField`/`rowKeyField`）。**R1 m1 补充披露：同形不含缺失/重复键的处置差异**——缺失键时容器族返回 `undefined`（交调用方 `fallbackKey(index)` 兜底，保结构性编辑不左移身份），data 族返回 `legacy-index:${i}`；重复键时容器族产出 `duplicatePreferredKeys` 并回退 `fallbackKey(index)`，data 族保留首值仅以 `::dup:N` cacheKey 区分。**这些差异全在内部实现面、且都属"行级稳定 key 派生"的同一目标的不同取值策略，不影响作者面属性应否统一**（作者写的是"哪一列是身份"，与内部兜底策略无关）。故结论不变：代码自身已把两处当作**同一概念的两个拼写**——这正是本轨道要消灭的词汇债，统一优于分族。

**内部命名不并入的依据**——作者面词汇与渲染器内部数据结构的词域不同：表格内部 `TableRowEntry.rowKey` / `selectedRowKeys` / `normalizeRowKey` 里的 "row" 是**表格行**这个领域词（表格渲染的就是行），改成 `item` 会让表格内部说容器词、并波及 `selectedRowKeys`（选择集合）等语义名，**制造新的错配**而非消除漂移。故裁定：**作者面（schema 属性 / definition 注册 / 文档示例）= `itemKey` 单标准；渲染器内部行身份结构 = 保留 `rowKey` 词**，并在 naming-conventions §4.9 落字为明确分工规则（非静默保留）。

## Current Baseline（live 核对 2026-10-16，HEAD 522faf88b）

**作者面（本 plan 改名面）**：

- **schema 属性声明**：`data/schemas.ts:136`（`TableSchema.rowKey?: string`）、`crud-schema.ts:260`（`CrudSchema.rowKey?: string`）。
- **属性读取（5 处）**：`table-renderer.tsx:155`（`buildTableRowEntries(source, schemaProps.rowKey, …)`）、`:184`（同上另一处）、`:188`（deps 数组）；`crud-renderer-schema-builders.ts:69`（`rowKey: schema.rowKey`）；`table-renderer/table-row-option-state.ts:75`（`schemaProps.rowKey ?? 'id'`）；**`crud-renderer.tsx:511`（`rowKey: normalizedSchema.rowKey`——`normalizeCrudSchema` 产出的直接消费方，R1 M1 补漏）**。
- **缺省归一**：`crud-schema.ts:342`（`normalizeCrudSchema` 内 `rowKey: schema.rowKey ?? 'id'`）。
- **作者面作用域符号（R2 Major 补漏——既非 schema 属性也非内部命名，第三类）**：树表 `childrenSource` 懒加载 action 的 scope 注入 `{ record, rowKey }`——`use-table-lazy-children.ts:60`（`helpers.createScope({ record, rowKey })`），**作者在 `childrenSource` 里写 `${rowKey}` 取该行身份**。文档将其作为作者面写明：`flux-guide/design-patterns/table.md:265`（行记录以顶层 `record`（及 `rowKey`）暴露在 action scope 中）、`docs/components/table/design.md:87` 与 `:179`（scope 含 `record`/`rowKey`）。编译器测试守护该模板：`packages/flux-compiler/src/schema-compiler-schema-definition-compile.test.ts:356`（`data: { key: '${rowKey}' }`，断言模板保持）。**处置裁定：纳入改名面**（`createScope({ record, itemKey })` + 三处文档改 `itemKey` + 测试同步）——理由：作者面既有 `itemKey` 属性、又写 `${rowKey}` 符号，正是本项要消灭的同语义双拼写；Cross-Cutting 7 零兼容分叉、项目未正式对外使用，故直接改名。**性质披露：该改名触及作者表达式契约（非纯属性改名），Non-Goals 相应修订**。
- **definition fields 注册**：`data-renderer-definitions.ts:75`（`{ key: 'rowKey', kind: 'prop' }`，属 `type: 'table'` 定义）、`crud-renderer-definition.ts:188`。
- **文案**：`data-schema-validation.ts:332`（`'crud.primaryField is no longer supported. Use canonical crud.rowKey.'`）、`data-renderer-definitions.ts:257`（`optionRow` 描述 "`valueField` compared item field (default rowKey)"）。
- **生成物**：`flux-guide/flux-types/schema.d.ts` 的 `TableSchema`/`CrudSchema` 段 `rowKey?`（当前 `:1560`/`:1804`，regenerate 后以 live 为准）。
- **flux-guide 文档/示例（7 文件，作者面 `\browKey` 计 20 命中 = 11+3+2+1+1+1+1；R1 M5 勘误：无词边界口径 23 含 3 处 `__rowKey` 数据键提及，勿混计）**：`design-patterns/table.md`（11）、`design-patterns/crud.md`（3）、`design-patterns/picker-transfer.md`（2）、`examples/master-detail.md`（1）、`examples/inline-quick-edit.md`（1）、`design-patterns/list.md`（1）、`01-quickstart.md`（1）。**目录合计 25 命中**含生成物 `flux-types/schema.d.ts` 的 2 处（同节已单列，R1 M5 指出的双计勘正）。
- **apps/playground（27 文件，`\browKey` **58** 命中；无词边界 59——R2 m5 勘正：R1 前的 59 为无边界口径）**：`complex-pages/page-schemas/*.json` 多份（`linear-issues` / `inline-edit-table` / `airtable-grid` / `antdpro-dashboard` / `approval-tasks` / `dashboard` / `master-detail` / `detail-subtables` 等）、`pages/performance-table/schema.ts:463`、`pages/m4-data-display-demo.tsx:60`、`component-lab/renderers/*`（crud-lab-page 系列 / dashboard-filter / data-c5c2-host）等。
- **活跃 owner doc（canonical，R1 M4 补漏）**：`docs/architecture/table-row-identity-and-scope-performance.md`（`\browKey` **65 命中**，其 "Authoring Contract" 节明写 `rowKey?: string` schema 字段与 `rowKey: 'id'` / `rowKey: '__rowKey'` 示例）——**该字段的 canonical owner 文档**，改名后必须同步（且它正是记录「作者面 `itemKey` / 内部行身份 `rowKey`」分工的自然落点）。
- **活跃 docs（其余，R1 M4 补漏，live 全清单）**：`docs/references/renderer-interfaces.md`(1)、`docs/references/naming-conventions.md`(3，§4.9 需扩为含 data 族 + 分工规则)、`docs/components/crud/design.md`(6)、`docs/components/crud/example.json`(1)、`docs/components/crud/migration-example.json`(2)、`docs/components/dashboard-filter/example.json`(1)、`docs/components/table/design.md`(4)、`docs/index.md`(1)、`docs/architecture/unified-runtime-indexing-and-path-binding.md`(4)、`docs/architecture/composite-value-owner-clean-slate.md`(15)、`docs/architecture/data-domain-owner.md`(7)、`docs/architecture/scope-ownership-and-isolation.md`(4)、`docs/architecture/performance-diagnostics-and-e2e-design.md`(5)、`docs/architecture/dependency-tracking.md`(1)、`docs/architecture/template-instantiation-and-node-identity.md`(1)、`docs/architecture/flow-designer/design.md`、`docs/architecture/array-field.md`（后二者命中为 0，列作核对面）、`docs/components/amis-bug-driven-improvement-roadmap.md`(2)、`docs/components/amis-bug-driven-improvements/02-table-and-crud.md`(8)、`docs/components/amis-bug-driven-improvements/_b7-triage.md`(2)、`docs/articles/flux-architecture-evolution.md`(1)。**处置原则**：指代**作者面 schema 属性**的位点改 `itemKey`；指代**渲染器内部行身份结构**的叙述保留 `rowKey` 并在 §4.9 分工规则下登记为预期保留（逐文件理由入收口记录）。历史/讨论面 `docs/archive`/`docs/logs`/`docs/audits`/`docs/experiments`/`docs/analysis`/`docs/plans`/`docs/backlog`/`docs/skills`/**`docs/discussions`**（R2 m3 补入；实测 `docs/discussions/2026-04-22-{data-domain-compatibility-audit,staged-owner-draft-semantics}.md` 共 10 命中均为**内部行身份叙述**、非作者面）按 append-only 不动。
- **测试面（R1 m2 补全枚举）**：data 包内 data 族 fixture/断言（`use-table-controls.test-support.tsx:78` 等，以全量枚举为准）；`packages/flux-compiler/src/schema-compiler-prop-coverage.test-support.ts:312`（合成 **crud** 定义内 `{ key: 'rowKey', kind: 'prop', … }`——R2 m4 勘正：该文件 `:265` 为 `crudRenderer`、`:189` 的 table 定义无 rowKey；**同步改 `itemKey`**）、`schema-compiler-prop-coverage-data-structures.test.ts:154/159/164/167`（crud `rowKey` 编译断言，含 `root.propsProgram.value.rowKey` ——**同步改**）；`packages/flux-renderers-form-advanced/src/__tests__/picker-schema-override.test.tsx:65` 与 `tag-list.test.tsx:245`（data 族 schema fixture `rowKey: 'id'`——**同步改**，二者为 `crud`/`table` fixture 非 input-table）；`packages/flux-bundle/src/crud-loadaction.test.tsx`、`packages/flux-renderers-basic/src/__tests__/basic-coverage-gaps.test.tsx`、`tests/e2e/convergence-n1-n2.spec.ts`（后者 `linear-issues-row-key` 为 **testid 字面量，非 schema 属性——预期保留**）。以 typecheck + test 全量枚举为准。

**内部（本 plan **不改**，Non-Goal）**：`table-renderer/types.ts:8`（`TableRowEntry.rowKey: string`）、`table-data.ts`（`normalizeRowKey` / `buildTableRowEntries(source, rowKeyField)` / `warnOnDuplicateRowKeys`）、`use-table-selection.ts`（`selectedRowKeys` / `checkableRowKeys` / 局部 `rowKey` 参数）等——data 包生产码 `rowKey` 命中 **204 处**（口径：`rg -c "rowKey" packages/flux-renderers-data/src -g '!*.test.*'` 逐文件求和；含测试 489）。其中绝大多数为内部行身份结构与派生局部命名。

**显式排除（不改）**：

- `item.__rowKey` / `record.__rowKey` 数据行兼容键（`composite-item-keys.ts:21`、`table-data.ts:21`）——**数据形状契约**（作者在行数据里写的运行时属性），改名等于破坏作者数据；词汇报告 §债三已显式排除。
- 历史面 docs（`docs/archive`、`docs/logs`、`docs/audits`、`docs/experiments`、`docs/analysis`、`docs/plans`、`docs/backlog`）对旧名的记载按 append-only 保留。
- 非 data 族的 `rowKey`（taskflow 设计器 node 模型、graph-demo 图数据、flux-formula AST `node.type` 邻近物、性能页局部变量等）不在改名面。

基线验证：HEAD 522faf88b = 轨道收口提交，五门禁全绿（16,557 passed/1,802 文件/0 FAIL）。

## Goals

- **作者面统一**：`TableSchema.rowKey` / `CrudSchema.rowKey` → `itemKey`；属性读取（**5 处**，含 `crud-renderer.tsx:511`）、缺省归一（1 处）、definition fields 注册（2 处）、文案（2 处）同步；**作者面作用域符号** `childrenSource` action scope 的 `rowKey` → `itemKey`（注入 1 处 + 文档 3 处 + 编译器测试 1 处）。
- **生成物/文档/示例/apps 同步**：`flux-guide/flux-types/schema.d.ts` 再生成；flux-guide 7 文件、apps/playground 27 文件、活跃 docs（**含 canonical owner doc `docs/architecture/table-row-identity-and-scope-performance.md` 的 Authoring Contract 节 + `docs/components/{crud,table,dashboard-filter}` 示例与设计文档** + naming-conventions §4.9 扩写）同步改名。
- **内部命名分工文档化**：naming-conventions §4.9 落字「作者面 `itemKey` 单标准；渲染器内部行身份结构保留 `rowKey` 词」的分工规则（使内部保留成为**成文规则**而非漂移），并在 `TableRowEntry` 定义处附一行指向该规则的注释。
- **无兼容分叉**：不留 `rowKey` 别名、不设双读过渡层（Cross-Cutting 7）。
- **收口验证**：机器可复现口径（见 Closure Gates）+ 五门禁全绿。

## Non-Goals

- **不改渲染器内部行身份结构命名**（`TableRowEntry.rowKey`、`normalizeRowKey`、`selectedRowKeys`、`rowKeyField` 形参等 204 处）——裁定依据见上「内部命名不并入的依据」；该分工写入 naming-conventions §4.9 成文规则。
- 不改 `__rowKey` 数据行兼容键（数据形状契约，显式排除）。
- 不改历史面 docs 记载；不动非 data 族 `rowKey`（taskflow/graph/AST/性能页局部变量）。
- **不改运行时语义**（属性改名：属性名变、读取路径同步、值语义与派生逻辑零变化）——**唯一例外为作者面作用域符号 `rowKey` → `itemKey` 改名**（`childrenSource` action scope 注入名；属作者表达式契约变更而非纯命名，依 Cross-Cutting 7 零兼容分叉 + 项目未正式对外使用直接改，不留双读/别名过渡）。
- 不动 RM-10/11/12 已收口面；e2e 不新增。

## Scope

### In Scope

- `packages/flux-renderers-data/src/`：`schemas.ts`、`crud-schema.ts`、`data-renderer-definitions.ts`、`crud-renderer-definition.ts`、`crud-renderer-schema-builders.ts`、`table-renderer.tsx`、`table-renderer/table-row-option-state.ts`、`data-schema-validation.ts` + 测试/fixtures 同步。
- `flux-guide/flux-types/schema.d.ts`（再生成）+ 上述 7 个 md。
- `apps/playground/`（27 文件；**schema 用法改名，`performance-table/{runtime.tsx,schema.ts}` 的局部形参 `rowKey` 为内部命名、预期保留**）。
- `docs/architecture/table-row-identity-and-scope-performance.md`（canonical owner doc，Authoring Contract 节必改）+ `docs/references/{renderer-interfaces,naming-conventions}.md`（后者 §4.9 扩写为含 data 族 + 内部分工规则）+ `docs/components/{crud,table,dashboard-filter}/*` 示例与设计文档 + 其余活跃 docs 中**指代作者面 schema 属性**的位点（逐文件处置，见 Baseline docs 清单）。
- roadmap 新增 RM-13 + 状态流转；daily log。

### Out Of Scope

- 内部行身份命名（204 处）；`__rowKey`；历史 docs；非 data 族 `rowKey`；运行时行为；e2e。

## Failure Paths

**部分适用**（R3 m2 勘正）：主体为纯作者面属性改名（零运行时语义变化——读取路径与声明同步改、派生逻辑不变），风险（遗漏站点）由 `pnpm typecheck` + 全量 test + 收口 rg 口径枚举兜底；但**作者面作用域符号改名触及作者表达式契约**（作者在 `childrenSource` 里写的 `${rowKey}` 会断），故该点须有行为判别钉（见 Test Strategy ③），不得以「零行为变化」结案。

| 可测场景编号           | 触发                                                                        | 行为                                                                           | 可重试 | 用户可见表现                                                     |
| ---------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------- |
| `childrenSource-scope` | 树表节点展开、声明 `childrenSource` 且无同步子节点时 dispatch 懒加载 action | 派发 scope 含 `record` 与 **`itemKey`**（改名前为 `rowKey`），值为同一行身份值 | 是     | 作者 action 写 `${itemKey}` 可取值；`${rowKey}` 解析为 undefined |

## Test Strategy

档位选择：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**（R3 m2 勘正：作用域符号一项属**行为面**，其判别钉为必做 Proof，不计入「建议」档）。判别承载体：①**收口 rg 口径**（作者面 `\browKey` 归零，内部 `rowKey` 与 `__rowKey` 为预期保留，见 Closure Gates 的机器可复现命令）；②**判别钉**（data 包内新增/扩展现有 type test：`KnownKeys<TableSchema>`/`KnownKeys<CrudSchema>` 含 `itemKey` 且不含 `rowKey`——沿用 RM-12 已验证的 key 重映射 `KnownKeys` 形式；registry 元数据面断言 `table`/`crud` 的 `fields` 含 `{ key: 'itemKey', kind: 'prop' }` 且不含 `'rowKey'`）；③**行为判别钉（作用域符号，R3 m2 必做 Proof）**：在 `table-t11-lazy-children.test.tsx` 增一用例——用带 `${itemKey}` 模板的 `childrenSource` 断言派发 action 的 scope **含 `itemKey` 且不含 `rowKey`**（判别机制：旧实现下 scope 只有 `rowKey`、`${itemKey}` 解析为 undefined，该断言必挂）；既有 lazy-children 用例均用纯 URL、不覆盖 scope 键名，故必须新增。
④全量 typecheck + 五门禁。既有 data 族测试族（table/crud/selection/drag-sort）须保持全绿以证其余面零行为变化。

## Execution Plan

### Phase 1 - 作者面源码改名（data 包）

Status: planned
Targets: `schemas.ts`、`crud-schema.ts`、`data-renderer-definitions.ts`、`crud-renderer-definition.ts`、`crud-renderer-schema-builders.ts`（**仅 `:69` 作者面行；`:161/:171/:188` 内部 carrier 形参保留**）、`crud-renderer.tsx`（`:511`）、`table-renderer.tsx`、`table-row-option-state.ts`、`data-schema-validation.ts` + 测试/fixtures

- Item Types: `Fix`、`Proof`

- [ ] schema 声明改名：`TableSchema.rowKey` → `itemKey`（`schemas.ts:136`）、`CrudSchema.rowKey` → `itemKey`（`crud-schema.ts:260`）。
- [ ] 属性读取与归一改名（5 读取 + 1 归一）：`table-renderer.tsx:155/:184/:188`、`crud-renderer-schema-builders.ts:69`、`table-row-option-state.ts:75`、**`crud-renderer.tsx:511`**、`crud-schema.ts:342`（`itemKey: schema.itemKey ?? 'id'`）。
- [ ] **作者面作用域符号改名**：`use-table-lazy-children.ts:60`（`helpers.createScope({ record, rowKey })` → `{ record, itemKey }`）；确认为唯一注入点（全仓 `createScope` 注入 `rowKey` 仅此一处）。
- [ ] definition fields 注册改名：`data-renderer-definitions.ts:75`、`crud-renderer-definition.ts:188`。
- [ ] 文案同步：`data-schema-validation.ts:332`（`Use canonical crud.itemKey.`）、`data-renderer-definitions.ts:257`（"default itemKey"）。
- [ ] 测试/fixtures 同步（`use-table-controls.test-support.tsx:78` 等，以全量枚举为准）。
- [ ] Proof：`pnpm --filter @nop-chaos/flux-renderers-data typecheck` 绿；作用域符号注入面核验（`rg -n "createScope\(\{ record" .../use-table-lazy-children.ts` 命中 1 且含 `itemKey`）；**作者面定向文件集**（`schemas.ts`/`crud-schema.ts`/`data-renderer-definitions.ts`/`crud-renderer-definition.ts`/`crud-renderer.tsx`/`table-renderer.tsx`/`table-renderer/table-row-option-state.ts`/`data-schema-validation.ts`）`\browKey` 归零；`crud-renderer-schema-builders.ts` 定向校验（仅作者面行 `schema.rowKey`→`schema.itemKey`，文件内其余 `\browKey` 为内部 carrier 形参、预期保留）。

Exit Criteria:

- [ ] 作者面声明/读取（5 处，含 `crud-renderer.tsx:511`）/归一/注册/文案/**作用域符号注入**全部改名；data 包 typecheck 绿；内部行身份命名零改动（`TableRowEntry.rowKey`、`crud-renderer-schema-builders.ts` 的 carrier 形参等仍在）。

### Phase 2 - 生成物 / flux-guide / apps / 活跃 docs 同步

Status: planned
Targets: `flux-guide/flux-types/schema.d.ts` + 7 md；`apps/playground` 27 文件（schema 用法）；`docs/architecture/table-row-identity-and-scope-performance.md`（canonical owner doc）+ `docs/references/{renderer-interfaces,naming-conventions}.md` + `docs/components/{crud,table,dashboard-filter}/*` + 其余活跃 docs 的作者面位点

- Item Types: `Fix`、`Decision`、`Proof`

- [ ] `pnpm build` 后经 css-stub loader 再生成 `flux-types/schema.d.ts`（`TableSchema`/`CrudSchema` 段 `rowKey` → `itemKey`）。
- [ ] `flux-guide/design-patterns/table.md:265` 的 scope 叙述改 `itemKey`；`docs/components/table/design.md:87/:179` 的 scope 含 `record`/`rowKey` 改 `itemKey`。
- [ ] 编译器测试同步：`packages/flux-compiler/src/schema-compiler-schema-definition-compile.test.ts:356`（`data: { key: '${rowKey}' }` → `'${itemKey}'`，模板断言语义保持）。
- [ ] flux-guide 7 文件改名（`table.md`/`crud.md`/`picker-transfer.md`/`master-detail.md`/`inline-quick-edit.md`/`list.md`/`01-quickstart.md`）。
- [ ] `apps/playground` 改名（**作者面命中 53 处**；`complex-pages/page-schemas/*.json` 多份 + `performance-table/schema.ts:463` + `m4-data-display-demo.tsx` + `component-lab/renderers/*` 等）；**`performance-table/{runtime.tsx,schema.ts}` 的局部形参 `rowKey`（`schema.ts:27/:28`、`runtime.tsx:239/:241`，4 处）与 `table-lab-page.tsx:124` 的 `__rowKey`（1 处）为非作者面、不改**——故 apps 目录 `\browKey` 总命中 **58 = 作者面 54（定向集⑤ 53 + `performance-table/schema.ts:463`）+ 非作者面 4（`performance-table/{runtime.tsx:239/:241, schema.ts:27/:28}` 局部形参）**（R3 m1 勘正：`table-lab-page.tsx:124` 的 `__rowKey` 因无词边界不在 `\browKey` 计数内，不得用其凑数），核验以定向文件集⑤ + 该文件单列命令为准。
- [ ] **canonical owner doc `docs/architecture/table-row-identity-and-scope-performance.md`**：Authoring Contract 节改 `itemKey`，并在此节落字「作者面 `itemKey` / 渲染器内部行身份结构 `rowKey`」的分工（该 doc 是分工规则的自然落点）。
- [ ] 其余活跃 docs：`docs/references/renderer-interfaces.md`、`docs/components/{crud,table,dashboard-filter}/*`（design/example/migration-example）、`docs/index.md`、`docs/architecture/*`（逐文件区分作者面 vs 内部叙述：作者面改、内部保留并登记）、`docs/components/amis-bug-driven-improvements/*`、`docs/articles/*` 等（Baseline docs 清单）。
- [ ] **naming-conventions §4.9 扩写**：`itemKey` 为作者面唯一字段名（含 data 族），并落字「渲染器内部行身份结构保留 `rowKey` 词」的分工规则；`TableRowEntry` 定义处附一行指向该规则的注释。
- [ ] 测试面同步：`flux-compiler` 的 `schema-compiler-prop-coverage.test-support.ts:312` + `schema-compiler-prop-coverage-data-structures.test.ts:154/159/164/167`、form-advanced 的 `picker-schema-override.test.tsx:65`/`tag-list.test.tsx:245`、data 包内 fixture（以全量枚举为准）。
- [ ] Proof：Closure Gates 的口径逐条复跑（应空 ①③⑤⑥ + 定向校验 ②④⑦ **+ 作用域符号 block 的 5 项**：注入点负/正向、`docs/components/table/design.md` 命中集、`flux-guide/design-patterns/table.md` 由应空③ 覆盖、编译器测试 `${rowKey}` 应空）；生成物定向校验（`TableSchema`/`CrudSchema` 段含 `itemKey` 无 `rowKey`）。

Exit Criteria:

- [ ] 生成物与 live 一致；flux-guide/apps/docs 的**作者面**无 `rowKey` 残留（内部行身份叙述按登记保留）；owner doc 与 §4.9 分工规则在案。

### Phase 3 - 判别钉 + 收口口径 + 五门禁

Status: planned

- Item Types: `Proof`

- [ ] 判别钉（`KnownKeys` 类型面 + registry 元数据面，覆盖 `table`/`crud` 两类型）+ 判别变异自证一轮（变异回旧实现 → 两钉红 → 外科恢复 → sha256 逐字节还原 → 绿）。
- [ ] 收口口径**七条 + 作用域符号 block**（应空 ①③⑤⑥ + 定向校验 ②④⑦ + 注入点负/正向 + design.md 命中集 + 编译器 `${rowKey}` 应空 + 行为判别钉，见 Closure Gates）复跑；全量五门禁（Closure Gates）。

Exit Criteria:

- [ ] 判别钉绿且变异自证在案；收口口径满足（全量五门禁属 Closure Gates，不入本 Phase——Minimum Rule 18）。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh 子 agent 填写。

- Reviewer / Agent: agent_2ba14dbf（R1，独立 fresh 子 agent，全仓独立扫描 + 行号逐条核对 + 两族实现对照 + roadmap 8 处同步核验）
- Verdict: `fail`（R1 0B/5M/6m → 已修订，待 R2 复核）
- Rounds: 1（R1 已回填；R2 待跑）
- Findings addressed: M1=漏作者面读取 `crud-renderer.tsx:511`（`rowKey: normalizedSchema.rowKey`）→ 补入 Baseline/Goals（读取 4→5 处）/Phase 1 Targets+checklist+Exit/应空①文件清单；M2=应空① 对 `crud-renderer-schema-builders.ts`「整文件应空」不可满足（`:161/:171/:188` 为内部 carrier 形参）→ 该文件改**定向校验②**（按作者面形态锚定 `schema.rowKey` 归零，carrier 保留）；M3=apps 口径「整目录应空」不可满足（`performance-table` 局部形参）→ 改**定向文件集⑤**（排除该文件局部面，其 `:463` schema 用法单独核验）；M4=漏 canonical owner doc `docs/architecture/table-row-identity-and-scope-performance.md`（65 命中，Authoring Contract 节明写 schema 字段）+ `docs/components/{crud,table,dashboard-filter}` 示例未列、收口无 docs 定向命令 → 补入 Baseline/Goals/Scope/Phase 2 Targets+checklist，并增**应空⑥（docs 组件 schema 字面量）+ 定向校验⑦（owner doc 节内）**；M5=flux-guide 计数双计（7 md 实为 20 作者面命中；25 系目录合计含生成物 2）→ 勘正。m1=「同一函数形状」加限定并披露缺失/重复键处置差异（内部面，不影响作者面裁定）；m2=测试面补全枚举（flux-compiler 2 文件/form-advanced 2 test/e2e testid 标预期保留）；m6=provenance 措辞补「用户将 A/B 选择权交由 AI 判断并授权拟制」。m3/m4/m5 属 roadmap 结构与措辞，随 roadmap 同批修订处置。

## Closure Gates

- [ ] `TableSchema`/`CrudSchema` 的 schema 属性、读取（5 处）、归一、definition 注册、文案全部改名
- [ ] **作者面作用域符号** `childrenSource` action scope 的 `rowKey` → `itemKey`（注入 1 处 + 文档 3 处 + 编译器测试 1 处）。核验口径（**逐点定向**——注入文件与 `docs/components/table/design.md` 均为「内部命名 + 作者面」混合文件，不得整文件应空）：- 注入点负向：`rg -n "createScope\(\{ record, rowKey" packages/flux-renderers-data/src/table-renderer/use-table-lazy-children.ts` 应空（实测现命中 `60: … createScope({ record, rowKey });`）- 注入点正向：`rg -n "createScope\(\{ record, itemKey" packages/flux-renderers-data/src/table-renderer/use-table-lazy-children.ts` 应命中 1 - `docs/components/table/design.md`（混合文件）：`rg -n "\browKey" docs/components/table/design.md` 命中集应**恰为内部叙述的 2 处**（`:87`/`:179` 的 scope 叙述改名后不再命中；因行号会随改名偏移，判据为"命中行均为内部行身份叙述、且不再出现 scope 键名语境"）- `flux-guide/design-patterns/table.md`：由应空③ 整体覆盖（`:265` scope 叙述随之改 `itemKey`）- 编译器测试：`rg -n "\$\{rowKey\}" packages/flux-compiler/src` 应空（实测现命中 `schema-compiler-schema-definition-compile.test.ts:356`）- 行为判别钉（见 Test Strategy ③）：`table-t11-lazy-children.test.tsx` 断言 scope 含 `itemKey` 不含 `rowKey`
- [ ] naming-conventions §4.9 分工规则落字（作者面 `itemKey` / 内部行身份 `rowKey`）+ `TableRowEntry` 定义处指引注释
- [ ] 无兼容分叉（不留 `rowKey` 别名/双读层）
- [ ] 判别钉（两类型 × 两判别面）在案且经判别变异自证
- [ ] 全仓 typecheck/build/lint/test 全绿 + check 零新增红（含 RM-9 残余扫描零未裁决命中）
- [ ] roadmap RM-13 状态流转 + daily log 条目
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

- 内部行身份命名若日后仍欲统一为 `item` 词域，属独立工作面（204 处 + 选择/虚拟滚动/子行回退路径），单独立项。
- `item.__rowKey` / `record.__rowKey` 数据行兼容键的清理（数据形状契约变更）：单独立项。

## Closure

Status Note: （收口时填写）

Closure Audit Evidence:

- Auditor / Agent: （独立 fresh 子 agent）
- Evidence: （task id / 核对摘要）

Follow-up:

- （收口时填写或写 no remaining plan-owned work）
