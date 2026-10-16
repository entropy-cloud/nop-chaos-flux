# Renderer Schema 词汇一致性分析（Renderer Vocabulary Consistency Analysis, 2026-10-15）

> Status: active · 事实源（fact source）
> Source: 2026-10-15 会话三方交叉分析（契约层/结构层/命名层）+ live 实测
> Consumers: `docs/backlog/renderer-metamodel-roadmap.md` RM-10~RM-12、`docs/references/naming-conventions.md` §4.4/§4.8/§4.9

## 目的

本报告钉住 **schema 词汇层（naming/metamodel vocabulary layer）** 的三类债务及其单一标准裁决，作为 RM-10~RM-12 三个工作项的 Owner 事实源。与 `2026-10-15-renderer-definition-metamodel-review.md`（下称"元模型报告"）互补：元模型报告管**声明结构通道**（fields/propContracts 双写、类型手抄等），本报告管**schema 属性词汇与类型形态**（同一语义被多词表/多形态/多实现书写）。

**统一口径**（计数均可复现）：

```bash
# 债一：事件字段类型（packages 全口径，.ts+.tsx，非测试；R1 勘误：原 --glob '*.ts' 只扫 flux-renderers-* 漏 .tsx 与包外包）
rg '\?: ActionSchema \| ActionSchema\[\];' packages --glob '*.ts' --glob '*.tsx' --glob '!*.test.*' | wc -l
rg '\?: ActionSchema;' packages --glob '*.ts' --glob '*.tsx' --glob '!*.test.*' | wc -l
rg '\?: ActionSchema;' packages --glob '*.ts' --glob '*.tsx' --glob '!*.test.*' -l | sort
rg -n '\?: BaseSchema;' packages/flux-renderers-data/src/schemas.ts
# 债二：ownership 三态字面量（全 packages，非测试；R1 勘误：原 `Ownership?:` 键名口径漏小写 ownership? 与命名别名）
rg "'local' \| 'controlled' \| 'scope'" packages --glob '!*.test.*' | wc -l
rg -l "'local' \| 'controlled' \| 'scope'" packages --glob '!*.test.*' | sort
comm -12 <(rg -l useScopeSelector packages --glob '!*.test.*' | sort) <(rg -l "'controlled'" packages --glob '!*.test.*' | sort)
# 债三：行键
rg -n "itemKey\?:|rowKey\?:" packages/flux-renderers-form-advanced/src/composite-field/composite-schemas.ts
```

2026-10-15 实测，2026-10-15 共识审查 R1 后勘误（口径扩全 packages + 小写/别名 + 实现副本口径）。

**裁决总原则（用户显式指令 2026-10-15）**：Flux 项目尚未正式对外使用，**不考虑兼容性、不设计兼容分叉、只采用一个标准方案**；迁移为直接改名/改型，不留别名过渡层。

---

## 债一：事件字段类型三态（RM-10）

同一语义的 `on*` 事件字段在 schema 声明层有**三种并存类型**（R1 勘误后口径：全 `packages`、`.ts`+`.tsx`、非测试）：

| 形态                                 | 成员数 | 文件数    | 性质                                                                                                           |
| ------------------------------------ | ------ | --------- | -------------------------------------------------------------------------------------------------------------- |
| `?: ActionSchema \| ActionSchema[];` | 81     | 14        | 标准形态（编译器实际消费形状；含 flux-core 类型自身/flow-designer/keyboard 等既有标准位点，非改型面）          |
| `?: ActionSchema;`                   | 180    | 29        | 单值债主体：在范围 **174**（flux-renderers-\* 168 + dashboard .tsx 4 + word-editor .ts 2）+ 显式排除 6（见下） |
| `?: BaseSchema;`                     | 12     | 1（data） | **误型**——事件字段声明成了 renderer schema 类型，非 action 类型                                                |

- **误型 12 处全部在** `packages/flux-renderers-data/src/schemas.ts`：`:150` onRowClick、`:245-249` onSortChange/onFilterChange/onPageChange/onSelectionChange/onRefresh、`:339-344` onItemClick/onSelectionChange/onPageChange/onLoadMore、`:403-404` onChange/onPageSizeChange。这些字段定义处（`kind: 'event'`）已确认属事件通道，声明类型却为 `BaseSchema`。
- **R1 补漏的在范围位点**（原 `flux-renderers-* --glob '*.ts'` 口径漏计，均已经 `kind:'event'` 注册核实）：`flux-renderers-dashboard/src/editor/dashboard-editor-renderer.tsx:51-54`（onSave/onError/onSessionChange/onModeChange，注册于 `dashboard-editor-definitions.ts:100/115/131/150`（`kind: 'event'` 于 101/116/132/151），**.tsx**）；`word-editor-renderers/src/types.ts:26-27`（onBack/onSave，注册于 `renderers.tsx:80-81/98-99`，**包名不在 flux-renderers-\***）。
- **消费侧事实**：`packages/flux-compiler/src/schema-compiler/node-compiler.ts:127` — `const rawEventPlans: Record<string, ActionSchema | ActionSchema[]> = {};`。编译器唯一合法输入形状即联合型；单值是"碰巧赋值兼容（单值可赋给联合）"的惰性窄化，不是独立契约。
- **伴生债（ActionSchemaLike 对偶）**：`flux-core/src/types/schema.ts:98-101` 定义 `ActionSchemaLike extends ActionShapeLikeFields`，与 `flux-core/src/types/actions.ts:280-282` 的 `ActionSchema extends ActionShapeFields` 平行存在。**R1 勘误：两类型同为 `action: string` 必填（`actions.ts:281`、`schema.ts:99`），不存在必填性差异**；真实差异只在字段集——**`ActionShapeFields` 比 `ActionShapeLikeFields` 多且仅多 4 项**：`preventDefault`、`stopPropagation`、`messages`、`confirmText`（R2 勘误：`_targetCid/_targetTemplateId/targetId/componentId/dialogId/surfaceId` 6 个 target 字段两接口均已存在——`schema.ts:79-84` vs `actions.ts:154-159`），且差异均为可选附加字段，对 Like 消费位点是纯放宽；链字段（`parallel/then/onError/onSettled`）自指类型不同（Like 侧在 `ActionShapeLikeFields` 内自指 `ActionSchemaLike`，`schema.ts:91-95`）。Like 消费位点完整清单（R1 补齐）：`schema.ts:119-120`（`BaseSchema.onMount/onUnmount`——**仅这两处是 BaseSchema 字段**，`then/onError/onSettled` 属 `ActionShapeLikeFields` 自身而非 BaseSchema）、`:350`（`ReactionSchema.actions`）、`:380`（`loadAction`）、`:300`（`SourceActionSchema extends ActionShapeLikeFields`）、`:309`（`FormulaDataSourceSchema extends`）、包外 `flux-renderers-form/src/schemas.ts:35`（`TreeSourceConfig extends ActionShapeLikeFields`）。

### 单一标准裁决

1. **事件字段声明类型 = `ActionSchema | ActionSchema[]`**（以编译器 `rawEventPlans` 为事实源）。在范围 174 处单值全部放宽为联合型（类型层改型，零运行时影响——单值本来就可赋给联合）；12 处 `BaseSchema` 误型改为联合型（174+12 迁移后标准形态基数 81→267，plan 内以 rg 复核）。迁移后收口 rg 口径（literal closure command）：
   ```bash
   rg -l '\?: ActionSchema;' packages --glob '*.ts' --glob '*.tsx' --glob '!*.test.*' | sort
   # 期望 == 4 个显式排除文件：flux-code-editor/src/types.ts、flux-renderers-data/src/table-renderer/{table-editable-cell,table-quick-edit-cell,use-row-quick-edit-draft}.tsx
   ```
   在范围 174 中若 plan 逐处复核 `kind:'event'` 归属时新发现非事件位点，须显式追加入排除清单登记（附理由），不得静默留单值。
2. **`ActionSchemaLike` 并入 `ActionSchema`**：删除 Like 对偶类型，`ActionSchema` 成为 action 形状的唯一类型。**两类型同为 `action: string` 必填，并入保持必填**（R1 勘误：原"取可选"方案基于错误前提，作废）。字段集差异取向=ActionSchema 的超集（仅多 preventDefault/stopPropagation/messages/confirmText 4 项可选附加字段，对 Like 消费位点是纯放宽；target 6 字段两接口均已存在，R2 勘误）；`ActionShapeLikeFields` 本体是否保留为窄化基接口由 plan 裁定（保留则链字段自指类型同步改 `ActionSchema`），上列 6 处消费位点全部随迁。
3. flux-core 属保护区域（plan-first）；本项 plan 执行前落字授权链。

### 显式排除

- scheduling onMount 双通道派发（**正确性缺陷**，非命名债，另行立项）。
- **非事件单 action 配置字段 6 处**（R1 坐实）：`flux-code-editor/src/types.ts:144` `SQLExecutionConfig.executeAction`（SQL 执行单 action 配置，非事件通道）、`flux-renderers-data/src/table-renderer/use-row-quick-edit-draft.tsx:63` `saveAction`、`table-quick-edit-cell.tsx:65-66` `quickSaveAction/quickSaveItemAction`、`table-editable-cell.tsx:168-169` 同名两处——内部组件 prop，单值 `ActionSchema` 是正确形态；维持单值，登记为收口 rg 的排除文件。
- 12 处误型是否全部迁向联合型由 plan 逐处复核 `kind:'event'` 归属；若发现真非事件字段（当前未发现），按 plan 内裁决处理，不回退到三态。

---

## 债二：ownership 前缀分裂 + 实现多副本（RM-11）

同一语义 `'local' | 'controlled' | 'scope'`（值归属三态）在 schema 层与实现层双重分裂。

### Schema 层：字段词表与类型

- **三态字面量位点 26 处 / 10 文件**（R1 勘误：原"`Ownership?:` 键名口径 19 处/7 文件"漏计小写形参与非 schema 键名——全键名口径 `rg "'local' \| 'controlled' \| 'scope'" packages --glob '!*.test.*'` = 26）：layout/schemas.ts×3、data/crud-schema.ts×4、basic/schemas.ts×2、kanban.types.ts×1、calendar.types.ts×2、data/schemas.ts×6、use-column-resize.ts×1（以上 `Ownership?:` 键名 19）+ **小写/形参形 7 处**（本处列 5：形参/局部/窄化断言；另 2 处=下条别名类型 `ListPaginationOwnership` 与排除清单 `effectiveOwnership` 局部变量——三者合计与 26 总数闭合）：`interaction-owner.ts:8`（`ownership?:` 形参）、`use-row-drag-sort.ts:33`（`ownership?:` 内联）、`value-ownership.ts:24/35/59`（`ResolvedOwnershipMode.ownership`/窄化断言/形参）。
- **别名类型 1 处**（R1 补漏）：`data/schemas.ts:284` `export type ListPaginationOwnership = 'local' | 'controlled' | 'scope'`，字段位点 `:334` `paginationOwnership?: ListPaginationOwnership`——同语义的第二类型名（别名式分裂）。
- **字段前缀清单**（同语义、按被拥有轴命名）：`valueOwnership`、`itemsOwnership`、`paginationOwnership`、`selectionOwnership`、`sortOwnership`、`filterOwnership`、`orderOwnership`、`columnWidthsOwnership`、`collapsedOwnership`、`viewOwnership`、`dateOwnership`、`kanbanOwnership`。
- **类型漂移**：`kanban.types.ts:84` — `kanbanOwnership?: string;`（未收窄到三态联合，是全仓唯一 typed-loose 的 ownership 字段）。同族 `kanbanStatePath?: string`（`:85`）。
- **命名违例**：词表模式是 `<axis>Ownership`（axis=被拥有能力：value/items/pagination/…），`kanbanOwnership` 是**组件名前缀**而非 axis 前缀；按单标准应为 `boardOwnership`/`boardStatePath`（axis=board 数据）。

### 实现层：三态解析实现多副本（R1 勘误，原"3+1 份 hook"表述作废）

**解析实现口径**（scope 订阅 + 三态值解析）：`comm -12 <(rg -l useScopeSelector packages --glob '!*.test.*') <(rg -l "'controlled'" packages --glob '!*.test.*')` = **11 文件**，另加 `use-row-drag-sort.ts`（有内联三态字面量与 scope 写回、无 useScopeSelector 的变体）= **12 处解析实现**：

| 类别         | 文件                                                                                                                                                                                                                              | 形态                                                                                                                                            |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 共享原语候选 | `flux-renderers-layout/src/value-ownership.ts`                                                                                                                                                                                    | 最完整：`resolveOwnershipMode`（scope 无 statePath 降级 local + dev warn）、`useOwnershipScopeValue`、`useScopeWrite`、`useValueOwnershipValue` |
| 共享原语候选 | `flux-renderers-basic/src/interaction-owner.ts`                                                                                                                                                                                   | `useOwnedAxisValue<T>`：泛型轴值读写，无降级 warn，scope 订阅 sentinel 逻辑与 layout 版逐字同构                                                 |
| 域特化       | `scheduling/calendar/hooks/use-calendar-ownership.ts`、`scheduling/kanban/hooks/use-kanban-board-state.ts`（含 `kanbanOwnership` string 松型读取）、`data/list-pagination.ts`（含 `resolveListPaginationOwnership` 别名归一函数） | 各自内联三态解析                                                                                                                                |
| axis 内联    | `data/table-renderer/use-table-{filter,pagination,selection,sort}.ts`、`use-column-resize.ts`、`use-row-drag-sort.ts`、`flux-renderers-basic/src/tabs.tsx`                                                                        | 字段级 `?? 'local'` + 内联三态分支，每轴一份手写                                                                                                |
| **非副本**   | `flux-renderers-data/src/crud-renderer-ownership.ts`                                                                                                                                                                              | **R1 勘误：零三态解析逻辑**（仅 statePath 管线/查询事件 payload），原"第三副本"表述错误                                                         |

layout 文件头注释（WA-layout-001, plan 567）已记载"三份 per-renderer 副本收敛为共享原语"的先例——但收敛只发生在 layout 包**内部**，跨包/跨轴的解析副本至今并行（12 处）。`unused` sentinel、`startTransition` 写 scope、controlled 不写值等语义在各副本间是**复制漂移风险区**。

### 单一标准裁决

1. **共享类型**：`OwnershipMode = 'local' | 'controlled' | 'scope'` 单一类型导出（落点 flux-core `types/` 由 plan 裁定并报授权）；全部 26 处三态字面量改引用该类型，**别名 `ListPaginationOwnership` 删除并入**（`resolveListPaginationOwnership` 归一函数随迁），`kanbanOwnership?: string` 收窄为 `OwnershipMode`。**类型字面量收口 rg 口径**：
   ```bash
   rg -l "'local' \| 'controlled' \| 'scope'" packages --glob '!*.test.*' | sort
   # 期望 == {OwnershipMode 定义文件}（schema/hook/形参处字面量全部消失，只剩单源定义一处）
   ```
2. **字段词表**：`<axis>Ownership` + `<axis>StatePath` 双字段模式为唯一模式（axis 词表入 naming-conventions §4.8）；`kanbanOwnership/kanbanStatePath` 改名 `boardOwnership/boardStatePath`（无兼容改名）。**`kanbanOwnership` 收口 rg 口径**（R1 声明的范围，防"命中噪声"漏改）：`rg -n "kanbanOwnership|kanbanStatePath" packages flux-guide`——**全部命中（含注释、type test `scheduling-boundary-narrowing.test.ts`、flux-guide 文档）均为在范围改名对象**，仅 `docs/`（分析报告/roadmap 引用该名作为改名前态的叙述）为豁免。
3. **实现单源**：12 处三态解析实现收敛为**一个共享 ownership 原语**（含 resolveOwnershipMode 降级语义 + 泛型轴值读写），落点 flux-react（plan 裁定）；共享原语候选（value-ownership/interaction-owner）与域特化（calendar/kanban/list-pagination）、axis 内联（use-table-\* ×4、use-column-resize、use-row-drag-sort、tabs）全部迁移为原语消费方，解析副本删除。**实现收口 rg 口径**：
   ```bash
   comm -12 <(rg -l useScopeSelector packages --glob '!*.test.*' | sort) <(rg -l "'controlled'" packages --glob '!*.test.*' | sort)
   # 期望 == {原语定义文件}（消费方不再自行做三态 scope 订阅解析）；plan 若裁定保留个别域特化豁免，逐条附理由报人工，不得静默保留
   ```
4. **预置拆分判据**（RM-11 粒度）：类型+词表收口（裁决 1/2）与 hook 原语合一+12 处迁移（裁决 3）可能超一个 plan 宽度；plan 拟制时若证实，按族预拆 successor（类型词表 / 实现合一两组）经人工确认，不静默缩水。
5. 公开导出增补（flux-react / flux-core）属结构性重构，plan 执行前人工确认授权链。

### 显式排除

- `effectiveOwnership`（use-column-resize.ts:112 局部变量）非 schema 字段，不入词表约束。
- 各 axis 字段的**语义合并**（如 selection 与 order 是否应同一轴）不在本项——只统一词形与类型，不改行为。

---

## 债三：itemKey / rowKey 分叉（RM-12）

同语义"数组容器行数据的键字段"（author 声明 → 行稳定 key 派生）在 schema 层分裂为两个名字，**但实现层已统一到 item 术语**：

| 位点                                                                                     | 现状                                                                            |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `ArrayFieldSchema.itemKey`（composite-schemas.ts:21）                                    | `itemKey?: string`                                                              |
| `ComboSchema.itemKey`（composite-schemas.ts:95）                                         | `itemKey?: string`                                                              |
| `InputTableSchema.rowKey`（composite-schemas.ts:116）                                    | `rowKey?: string` ← **孤例**                                                    |
| 三渲染器读取（array-field.tsx:197、combo-renderer.tsx:198、input-table-renderer.tsx:74） | 局部变量均已是 `itemKeyField`——**input-table 内部早以 item 命名读 rowKey prop** |
| `composite-item-keys.ts`、`array-container-controller.ts:68` 注释                        | item 术语（controller 注释并列写 `'itemKey' / 'rowKey'`）                       |
| `input-table-renderer.tsx:305` prop 覆盖声明                                             | `{ key: 'rowKey', kind: 'prop' }`                                               |

### 单一标准裁决

**数组容器行键字段名 = `itemKey`（唯一）**。改名面：

1. `InputTableSchema.rowKey` → `itemKey`（composite-schemas.ts:116）。
2. `input-table-renderer.tsx`：`:74-76` 读取路径 `props.props.rowKey` → `props.props.itemKey`、`:305` 覆盖声明 `'rowKey'` → `'itemKey'`；`:102` 警告文案中的 "rowKey" 措辞随改。
3. `array-container-controller.ts:68` 注释去除 `'rowKey'` 并列写法。
4. flux-guide 同步（**R1 勘误：仅 input-table 相关位点在范围**）：`flux-types/schema.d.ts:1474`（`InputTableSchema.rowKey`——由 `scripts/generate-types.mjs` 再生成；行号为 2026-10-15 快照，regenerate 后按 live 为准）、`design-patterns/combo-input-table.md:201`（input-table 属性表）、`examples/business-document-formula.md:68`（`type: input-table` 示例）——共 3 位点。**不在范围**（data 族行标识 `rowKey`，见排除清单）：`schema.d.ts:1560`（TableSchema）、`:1804`（CrudSchema）、`table.md`（0 处 input-table，全为 table/crud 数据形态）、`crud.md`、`list.md`、`master-detail.md`、`inline-quick-edit.md`、`01-quickstart.md`、`picker-transfer.md`（selection 值语义的 rowKey 概念，另一轴）。原列举的 9 文档清单作废。
5. 测试同步（`*.test.*` 内 rowKey 断言/fixtures，以 typecheck+test 全量枚举为准）。

**收口 rg 口径**：`rg -n "rowKey" packages/flux-renderers-form-advanced/src flux-guide --glob '!*.test.*'` 中，`InputTableSchema`/input-table 相关命中归零；data 族（TableSchema/CrudSchema/list 的行标识 rowKey）与数据行 `__rowKey` 命中为预期保留。

### 显式排除

- `item.__rowKey` **数据行**兼容键（composite-item-keys.ts:21 读数组元素上的运行时属性）——属数据形状兼容层，非 schema 属性命名，不在改名面内（是否清理单独立项）。
- **data 族行标识 `rowKey`**（R1 勘误：原"列级"表述错误——`crud-renderer-definition.ts:111` 等处文档化为 "Stable record key field … row identity"，是记录身份字段非列字段）：`TableSchema/CrudSchema/ListSchema` 的 `rowKey` 及 table.md/crud.md/list.md 等数据族文档示例——语义是"数据记录行身份"，与数组容器"行数据键"同指不同族；**是否并入同一单标准（itemKey）不默认裁定**，RM-12 plan 内 live 枚举全部 data 族位点后报人工裁决，不静默并入、也不静默排除在裁决门外。

---

## 三债共同属性（供 roadmap 引用）

- **根因类别**：词汇层"机制并行生长、缺单源收口"——与元模型报告同根因类别，但债务位于 schema 词汇/类型形态面，非声明结构通道面。
- **验证形态**：三债收口均为 **rg 零命中/集合等价验证**（命令以各债裁决节的"收口 rg 口径"为准：债一=单值文件集等价于 4 排除文件；债二=三态字面量文件集等价于 OwnershipMode 定义文件 ∧ 解析实现集等价于原语文件 ∧ `kanbanOwnership|kanbanStatePath` 全命中改名；债三=input-table 相关 `rowKey` 归零）+ `pnpm typecheck/build/lint/test` 全绿。**RM-9 扫描范围不含本报告**（分析报告问题族是元模型报告族；本报告为第二事实源），RM-10~12 自持上述 rg 口径验证，不并入 RM-9 白名单体系。
- **无兼容裁决**：三债全部直接改，不设双读/别名/过渡期（用户显式指令 2026-10-15）。
- **未纳入本报告的其他词汇漂移**（variant 三方词表、disabled 三态写法、value 8 型等）不在 RM-10~12 范围——需处理时单独立项，不静默搭车。
