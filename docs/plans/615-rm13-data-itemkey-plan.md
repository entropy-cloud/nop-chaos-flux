# 615 RM-13 data 族行标识 `rowKey` 并入单标准 `itemKey`（作者面 schema 属性统一）

> Plan Status: draft
> Last Reviewed: 2026-10-16
> Source: `docs/backlog/renderer-metamodel-roadmap.md` RM-13（新增，provenance 见授权链）；`docs/plans/614-rm12-itemkey-plan.md` `## Human Adjudication Request`（裁决请求本体，本 plan 即其裁决落地）
> Related: roadmap Cross-Cutting 7（单标准零兼容分叉）；`docs/references/naming-conventions.md` §4.9（`itemKey` 唯一字段名）

## Purpose

RM-12 已把数组容器族（array-field / combo / input-table）的 schema 属性统一为 `itemKey`，但 data 族（`TableSchema`/`CrudSchema`）仍叫 `rowKey`——同一个作者面语义（"每条记录用哪个字段做身份"）有两个名字。本 plan 将 data 族的**作者面 schema 属性**并入单标准 `itemKey`，并把渲染器内部的行身份结构命名（`TableRowEntry.rowKey` 等）显式裁定为"保留 row 词、文档化分工"，使"同一语义两个名字"的词汇债彻底消亡、同时不让表格内部说出容器词。

## 授权链（保护区 + 工作项新增）

触及 `renderer definition fields`（table/crud 的 prop 注册改名）与公开 schema 属性改名，属 plan-first / 结构性重构。授权链落字：①**2026-10-16 用户显式指令**（本次会话原话："不考虑修改成本，你认为是否统一更好？如果是，则拟制计划完成修改。"）——**该指令即 RM-12 裁决请求的人工裁定结果（裁定 = 统一）**，同时构成 roadmap Rule 6「工作项增删先报人工确认」所要求的**人工确认**（新增 RM-13）；②roadmap Cross-Cutting 7（单标准零兼容分叉，2026-10-15 用户指令）；③RM-12 plan 的 `## Human Adjudication Request` 节（六类 live 枚举 + 两方案 A/B + 建议 A）——本 plan 采纳**方案 B**（并入单标准），与 RM-12 建议不同，差异理由见下「裁定依据」；④`docs/references/naming-conventions.md` §4.9 已入库（`itemKey` 唯一字段名、不引入 `rowKey` schema 字段）。

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

两处**同一函数形状**：同一 fallback 链（`显式字段 ?? __rowKey ?? id`）、同一 `__rowKey` 兼容键、平行形参名（`itemKeyField` / `rowKeyField`）、平行重复键处置（容器 `duplicatePreferredKeys` + fallback / 表格 `::dup:N` cacheKey）。即代码自身已把它们当**同一概念的两个拼写**——这正是本轨道要消灭的词汇债，故统一优于分族。

**内部命名不并入的依据**——作者面词汇与渲染器内部数据结构的词域不同：表格内部 `TableRowEntry.rowKey` / `selectedRowKeys` / `normalizeRowKey` 里的 "row" 是**表格行**这个领域词（表格渲染的就是行），改成 `item` 会让表格内部说容器词、并波及 `selectedRowKeys`（选择集合）等语义名，**制造新的错配**而非消除漂移。故裁定：**作者面（schema 属性 / definition 注册 / 文档示例）= `itemKey` 单标准；渲染器内部行身份结构 = 保留 `rowKey` 词**，并在 naming-conventions §4.9 落字为明确分工规则（非静默保留）。

## Current Baseline（live 核对 2026-10-16，HEAD 522faf88b）

**作者面（本 plan 改名面）**：

- **schema 属性声明**：`data/schemas.ts:136`（`TableSchema.rowKey?: string`）、`crud-schema.ts:260`（`CrudSchema.rowKey?: string`）。
- **属性读取**：`table-renderer.tsx:155`（`buildTableRowEntries(source, schemaProps.rowKey, …)`）、`:184`（同上另一处）、`:188`（deps 数组）；`crud-renderer-schema-builders.ts:69`（`rowKey: schema.rowKey`）；`table-renderer/table-row-option-state.ts:75`（`schemaProps.rowKey ?? 'id'`）。
- **缺省归一**：`crud-schema.ts:342`（`normalizeCrudSchema` 内 `rowKey: schema.rowKey ?? 'id'`）。
- **definition fields 注册**：`data-renderer-definitions.ts:75`（`{ key: 'rowKey', kind: 'prop' }`，属 `type: 'table'` 定义）、`crud-renderer-definition.ts:188`。
- **文案**：`data-schema-validation.ts:332`（`'crud.primaryField is no longer supported. Use canonical crud.rowKey.'`）、`data-renderer-definitions.ts:257`（`optionRow` 描述 "`valueField` compared item field (default rowKey)"）。
- **生成物**：`flux-guide/flux-types/schema.d.ts` 的 `TableSchema`/`CrudSchema` 段 `rowKey?`（当前 `:1560`/`:1804`，regenerate 后以 live 为准）。
- **flux-guide 文档/示例（7 文件 25 命中）**：`design-patterns/table.md`（14）、`design-patterns/crud.md`（3）、`design-patterns/picker-transfer.md`（2）、`examples/master-detail.md`（1）、`examples/inline-quick-edit.md`（1）、`design-patterns/list.md`（1）、`01-quickstart.md`（1）。
- **apps/playground（27 文件 59 命中）**：`complex-pages/page-schemas/*.json` 多份（`linear-issues` / `inline-edit-table` / `airtable-grid` / `antdpro-dashboard` / `approval-tasks` / `dashboard` / `master-detail` / `detail-subtables` 等）、`pages/performance-table/schema.ts:463`、`pages/m4-data-display-demo.tsx:60`、`component-lab/renderers/*`（crud-lab-page 系列 / dashboard-filter / data-c5c2-host）等。
- **活跃 docs**：`docs/references/renderer-interfaces.md`、`docs/references/naming-conventions.md`（§4.9 需扩为含 data 族）、`docs/components/table/*` 等（拟制期以 live 枚举为准，历史面 `docs/archive`/`docs/logs`/`docs/audits`/`docs/experiments` 按 append-only 不动）。
- **测试面**：data 包内 data 族 fixture/断言（如 `use-table-controls.test-support.tsx:78`、`table-b33-advanced-boundary`、`crud-selection-drift-hook` 等）、`packages/flux-bundle/src/crud-loadaction.test.tsx`、`packages/flux-renderers-basic/src/__tests__/basic-coverage-gaps.test.tsx` 等——以 typecheck + test 全量枚举为准。

**内部（本 plan **不改**，Non-Goal）**：`table-renderer/types.ts:8`（`TableRowEntry.rowKey: string`）、`table-data.ts`（`normalizeRowKey` / `buildTableRowEntries(source, rowKeyField)` / `warnOnDuplicateRowKeys`）、`use-table-selection.ts`（`selectedRowKeys` / `checkableRowKeys` / 局部 `rowKey` 参数）等——data 包生产码 `rowKey` 命中 **204 处**（口径：`rg -c "rowKey" packages/flux-renderers-data/src -g '!*.test.*'` 逐文件求和；含测试 489）。其中绝大多数为内部行身份结构与派生局部命名。

**显式排除（不改）**：

- `item.__rowKey` / `record.__rowKey` 数据行兼容键（`composite-item-keys.ts:21`、`table-data.ts:21`）——**数据形状契约**（作者在行数据里写的运行时属性），改名等于破坏作者数据；词汇报告 §债三已显式排除。
- 历史面 docs（`docs/archive`、`docs/logs`、`docs/audits`、`docs/experiments`、`docs/analysis`、`docs/plans`、`docs/backlog`）对旧名的记载按 append-only 保留。
- 非 data 族的 `rowKey`（taskflow 设计器 node 模型、graph-demo 图数据、flux-formula AST `node.type` 邻近物、性能页局部变量等）不在改名面。

基线验证：HEAD 522faf88b = 轨道收口提交，五门禁全绿（16,557 passed/1,802 文件/0 FAIL）。

## Goals

- **作者面 schema 属性统一**：`TableSchema.rowKey` / `CrudSchema.rowKey` → `itemKey`；属性读取（4 处）、缺省归一（1 处）、definition fields 注册（2 处）、文案（2 处）同步。
- **生成物/文档/示例/apps 同步**：`flux-guide/flux-types/schema.d.ts` 再生成；flux-guide 7 文件、apps/playground 27 文件、活跃 docs（含 naming-conventions §4.9 扩写）同步改名。
- **内部命名分工文档化**：naming-conventions §4.9 落字「作者面 `itemKey` 单标准；渲染器内部行身份结构保留 `rowKey` 词」的分工规则（使内部保留成为**成文规则**而非漂移），并在 `TableRowEntry` 定义处附一行指向该规则的注释。
- **无兼容分叉**：不留 `rowKey` 别名、不设双读过渡层（Cross-Cutting 7）。
- **收口验证**：机器可复现口径（见 Closure Gates）+ 五门禁全绿。

## Non-Goals

- **不改渲染器内部行身份结构命名**（`TableRowEntry.rowKey`、`normalizeRowKey`、`selectedRowKeys`、`rowKeyField` 形参等 204 处）——裁定依据见上「内部命名不并入的依据」；该分工写入 naming-conventions §4.9 成文规则。
- 不改 `__rowKey` 数据行兼容键（数据形状契约，显式排除）。
- 不改历史面 docs 记载；不动非 data 族 `rowKey`（taskflow/graph/AST/性能页局部变量）。
- 不改任何运行时行为（纯作者面属性改名：属性名变、读取路径同步、值语义与派生逻辑零变化）。
- 不动 RM-10/11/12 已收口面；e2e 不新增。

## Scope

### In Scope

- `packages/flux-renderers-data/src/`：`schemas.ts`、`crud-schema.ts`、`data-renderer-definitions.ts`、`crud-renderer-definition.ts`、`crud-renderer-schema-builders.ts`、`table-renderer.tsx`、`table-renderer/table-row-option-state.ts`、`data-schema-validation.ts` + 测试/fixtures 同步。
- `flux-guide/flux-types/schema.d.ts`（再生成）+ 上述 7 个 md。
- `apps/playground/`（27 文件）。
- `docs/references/renderer-interfaces.md`、`docs/references/naming-conventions.md`（§4.9 扩写为 data 族 + 内部分工规则）、`docs/components/table/*` 等活跃 docs（拟制期 live 枚举为准）。
- roadmap 新增 RM-13 + 状态流转；daily log。

### Out Of Scope

- 内部行身份命名（204 处）；`__rowKey`；历史 docs；非 data 族 `rowKey`；运行时行为；e2e。

## Failure Paths

不适用：纯作者面属性改名（零运行时行为变化——读取路径与声明同步改、派生逻辑不变），风险（遗漏站点）由 `pnpm typecheck` + 全量 test + 收口 rg 口径枚举兜底。

## Test Strategy

档位选择：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**——纯属性改名非行为面。判别承载体：①**收口 rg 口径**（作者面 `\browKey` 归零，内部 `rowKey` 与 `__rowKey` 为预期保留，见 Closure Gates 的机器可复现命令）；②**判别钉**（data 包内新增/扩展现有 type test：`KnownKeys<TableSchema>`/`KnownKeys<CrudSchema>` 含 `itemKey` 且不含 `rowKey`——沿用 RM-12 已验证的 key 重映射 `KnownKeys` 形式；registry 元数据面断言 `table`/`crud` 的 `fields` 含 `{ key: 'itemKey', kind: 'prop' }` 且不含 `'rowKey'`）；③全量 typecheck + 五门禁。既有 data 族测试族（table/crud/selection/drag-sort）须保持全绿以证零行为变化。

## Execution Plan

### Phase 1 - 作者面源码改名（data 包）

Status: planned
Targets: `schemas.ts`、`crud-schema.ts`、`data-renderer-definitions.ts`、`crud-renderer-definition.ts`、`crud-renderer-schema-builders.ts`、`table-renderer.tsx`、`table-row-option-state.ts`、`data-schema-validation.ts` + 测试/fixtures

- Item Types: `Fix`、`Proof`

- [ ] schema 声明改名：`TableSchema.rowKey` → `itemKey`（`schemas.ts:136`）、`CrudSchema.rowKey` → `itemKey`（`crud-schema.ts:260`）。
- [ ] 属性读取与归一改名：`table-renderer.tsx:155/:184/:188`、`crud-renderer-schema-builders.ts:69`、`table-row-option-state.ts:75`、`crud-schema.ts:342`（`itemKey: schema.itemKey ?? 'id'`）。
- [ ] definition fields 注册改名：`data-renderer-definitions.ts:75`、`crud-renderer-definition.ts:188`。
- [ ] 文案同步：`data-schema-validation.ts:332`（`Use canonical crud.itemKey.`）、`data-renderer-definitions.ts:257`（"default itemKey"）。
- [ ] 测试/fixtures 同步（`use-table-controls.test-support.tsx:78` 等，以全量枚举为准）。
- [ ] Proof：`pnpm --filter @nop-chaos/flux-renderers-data typecheck` 绿；data 包生产码**作者面** `rowKey` 归零（内部面保留，见收口口径的区分命令）。

Exit Criteria:

- [ ] 作者面声明/读取/归一/注册/文案全部改名；data 包 typecheck 绿；内部行身份命名零改动（`TableRowEntry.rowKey` 等仍在）。

### Phase 2 - 生成物 / flux-guide / apps / 活跃 docs 同步

Status: planned
Targets: `flux-guide/flux-types/schema.d.ts` + 7 md；`apps/playground` 27 文件；`docs/references/{renderer-interfaces,naming-conventions}.md` 等

- Item Types: `Fix`、`Decision`、`Proof`

- [ ] `pnpm build` 后经 css-stub loader 再生成 `flux-types/schema.d.ts`（`TableSchema`/`CrudSchema` 段 `rowKey` → `itemKey`）。
- [ ] flux-guide 7 文件改名（`table.md`/`crud.md`/`picker-transfer.md`/`master-detail.md`/`inline-quick-edit.md`/`list.md`/`01-quickstart.md`）。
- [ ] apps/playground 27 文件改名（`complex-pages/page-schemas/*.json` 多份 + `performance-table/schema.ts` + `m4-data-display-demo.tsx` + `component-lab/renderers/*` 等）。
- [ ] 活跃 docs 同步 + **naming-conventions §4.9 扩写**：`itemKey` 为作者面唯一字段名（含 data 族），并落字「渲染器内部行身份结构保留 `rowKey` 词」的分工规则；`TableRowEntry` 定义处附一行指向该规则的注释。
- [ ] Proof：生成物定向校验（`TableSchema`/`CrudSchema` 段含 `itemKey` 无 `rowKey`）；flux-guide/apps 作者面 `\browKey` 归零。

Exit Criteria:

- [ ] 生成物与 live 一致；flux-guide/apps/活跃 docs 作者面无 `rowKey` 残留；§4.9 分工规则在案。

### Phase 3 - 判别钉 + 收口口径 + 五门禁

Status: planned

- Item Types: `Proof`

- [ ] 判别钉（`KnownKeys` 类型面 + registry 元数据面，覆盖 `table`/`crud` 两类型）+ 判别变异自证一轮（变异回旧实现 → 两钉红 → 外科恢复 → sha256 逐字节还原 → 绿）。
- [ ] 收口口径四条（见 Closure Gates）复跑；全量五门禁（Closure Gates）。

Exit Criteria:

- [ ] 判别钉绿且变异自证在案；收口口径满足（全量五门禁属 Closure Gates，不入本 Phase——Minimum Rule 18）。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh 子 agent 填写。

- Reviewer / Agent: （待 draft review）
- Verdict: `draft`
- Rounds: 0
- Findings addressed: —

## Closure Gates

- [ ] `TableSchema`/`CrudSchema` 的 schema 属性、读取、归一、definition 注册、文案全部改名
- [ ] 收口 rg 口径（机器可复现）——**应空**（作者面）：`rg -n "\browKey" packages/flux-renderers-data/src/schemas.ts packages/flux-renderers-data/src/crud-schema.ts packages/flux-renderers-data/src/data-renderer-definitions.ts packages/flux-renderers-data/src/crud-renderer-definition.ts packages/flux-renderers-data/src/crud-renderer-schema-builders.ts packages/flux-renderers-data/src/table-renderer.tsx packages/flux-renderers-data/src/table-renderer/table-row-option-state.ts packages/flux-renderers-data/src/data-schema-validation.ts`（逐文件定向，避开内部行身份文件）；**应空**：`rg -n "\browKey" flux-guide/design-patterns/{table,crud,list,picker-transfer}.md flux-guide/examples/{master-detail,inline-quick-edit}.md flux-guide/01-quickstart.md apps/playground`；**定向校验**：`rg -n "\browKey" flux-guide/flux-types/schema.d.ts` 命中集为空（data 族生成段改名后该文件不应再有 `rowKey`）
- [ ] **预期保留**（显式排除清单）：内部行身份结构（`table-renderer/types.ts` 的 `TableRowEntry.rowKey`、`table-data.ts` 的 `normalizeRowKey`/`rowKeyField`、`use-table-selection.ts` 的 `selectedRowKeys` 等）；`__rowKey` 数据行兼容键；历史面 docs；非 data 族 `rowKey`
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
