# D1-6 G-B3 批量操作栏语义件产品化（含「全选本页」选择语义收口）

> Plan Status: completed（2026-08-31 执行完毕并经独立 closure audit 通过后收口；draft review 通过：fresh session 独立子 agent R1 `revised` 1 Major + 4 Minor → 全部修复 → R2 scoped re-check 零 Blocker/零 Major，2 Minor residual 随共识修复，共识达成）
> Mission: ui-review
> Work Item: D1. 能力缺口产品化 plans —— G-B3 批量操作栏语义（C2 §2 预清单第 6 位「G-B3/G-C/G-D 语义件族」首个成员；P5/P6 回写已完成故定形条件满足；G-C/G-D 归后续独立 plan）
> Last Reviewed: 2026-08-30
> Source: roadmap `docs/backlog/ui-review-roadmap.md`（D1 条目 + Phase Details D1 + Cross-Cutting 4/5）；C2 裁决文档 `docs/analysis/ui-review/C2-capability-gaps.md`（初版裁决表 G-B3 行 + §2 预清单 6/6 + 回写 ③⑤⑦⑧ 素材）；`docs/context/ai-autonomy-policy.md` Protected Areas（renderer 定义字段 plan-first / 样式契约 plan-first / `ui/src/index.ts` ask-first）
> Related: `docs/plans/2026-08-30-1737-2-d1-ga-page-template-semantic-components.md`（语义件三件套分轨先例：L2 增强 + 新 type + dead config 处置）；`docs/plans/2026-08-30-2312-1-d1-gb2-keyboard-navigation-framework.md`（同批起草；范围选区/fill handle/修饰键选区归彼计划，本计划 Non-Goal 引用）
> 执行顺序约束：D1 触发条件已满足（C2 `done` + P4b `done` + P6b `done`）；本计划（N=2）按 C2 §2 排序后于 G-B2 plan（N=1）执行——两计划共写面 `packages/flux-renderers-data/src/data-renderer-definitions.ts`、`schemas.ts`/`data-schema-validation.ts`（彼计划 Phase 3 选区字段 / 本计划 Phase 2 定义登记）与 `use-table-selection.ts`（彼计划 Phase 3 修饰键选区 / 本计划 Phase 3 selectAllMode），顺序执行消除冲突。成员拆分依据（Rule 22）：G-B3（crud/table 批量栏）、G-C（tabs/视图状态机）、G-D（网格编辑）三者 owner 面不同，且 G-D 明示依赖 G-B2+G-B3 双前置（回写 ⑦）——拆为独立 plan 而非合并。

## Purpose

把 C2 裁决为 **G-B3（批量操作栏语义：选择集绑定 + 批量动作，L2~L3）** 的缺口产品化：为「选择集驱动」的批量操作栏提供 schema 可表达的语义件（非空可见包络 + 计数模板 + 动作区 + 内建清空），消解回写 ③⑤ 两度登记的「批量栏 alert 包络无语义件、toolbar 文案节点 + 按钮 + visible 手工拼装」缺口；同 plan 收口 P4b 登记的「全选本页」子语义缺口（选择集 mode 语义），并落字与 crud `$crud.*` / table scope 两套平行选择集契约的对接边界。

## Current Baseline

- **C2 裁决与证据链（live 文档核对 2026-08-30）**：
  - 初版裁决表 G-B3 行：**L2~L3**，理由「crud 已有选择集；『批量栏』缺语义件与选择集 scope 契约」，状态「待 P6/P7 回写」→ 回写 ⑦⑧ 已完成。
  - 回写 ③（P2b）：可达面实测——`$crud.selectionCount`（toolbar 文案模板）/`$crud.selectedRowKeys`（ajax `args.data` 透传）/`$crud.hasSelection`（按钮 disabled 门控）/`component:clearSelection`（取消选择）；**降级点：「批量栏 alert 包络」无语义件——表顶反馈条由 toolbar 文案节点 + 按钮 + `visible` 手工拼装；无选择集持久化语义**。产品化落点与初判一致（语义件 + 选择集 scope 契约）。
  - 回写 ⑤（P4b）：table 页 scope 选择集契约可达（`rowSelection` + `selectionOwnership:'scope'` + `selectionStatePath` → 计数表达式/空集门控/`data.ids` 透传/`component:setSelection` 空集清空——table 句柄；**`component:clearSelection` 仅为 crud 句柄——crud `$crud.*` scope 契约与 table scope 契约为两套平行 API，不可平移**）；「批量栏 alert 包络」无语义件维持；**表头全选内建语义 = 源数据全量进选择集（34 行），客户端分页仅裁剪显示——「全选本页」子语义不可表达**，并入 D1 选择集语义件候选。
  - 回写 ⑦（P6b）：批量栏未启用（Airtable grid 无常驻批量栏形态，同 P5b N14 裁定姿势——选区语义件候选维持 D1）；「范围选区 + fill handle 编辑模型」终态裁定**并入 G-B3 观察面但属编辑器选区模型、与 G-B2 键盘选区同根**——本计划落字其归 G-B2 的边界（Non-Goals）。
  - 回写 ⑧（P7b）：Stripe 原生无批量栏（参考应用无此件，复刻无需新增）——对照终态收口，G-B3 行零扩充。
- **live 复核现状实测（2026-08-30 本计划起草时）**：
  - **`bulkActions` 作为 crud toolbar block 类型已死**：`crud-renderer-toolbar.tsx:23-38` 归一化对 `bulkActions`（string 与 object 双形态）直接 `continue` 丢弃；`data-schema-validation.ts:356-361` 对 legacy `crud.bulkActions` 报错「no longer supported. Use canonical crud.listActions」。`listActions` 为常显动作区（无选择集驱动可见性）。→ 新语义件命名**不得复用 `bulkActions`**（dead config 复活风险，G-A query-form dead config 处置先例）。
  - crud 选择集投影与句柄在库：`$crud.hasSelection/selectionCount` 状态投影（`crud-schema.ts:309-310`）、`clearSelection`/`toggleSelection` 句柄（`crud-renderer-definition.ts:356,364`）。
  - table 选择集 hooks 在库：`use-table-selection.ts`——`handleSelectAll`（:155-239，作用于传入 rows，`keepOnPageChange` 保留跨页键）、`handleSelectRow(rowKey, checked)`（:241-305，无修饰键参数——修饰键归 G-B2 边界）、`setSelectionExternal`（:307-335，`component:setSelection` 句柄底座）。
  - `@nop-chaos/ui` Alert/Badge/Button 在库——alert 包络底座组件零 ui 新导出预期（G-A 三语义件「零 ui/flux-core 改动」同口径）。
- **先例模式**：G-A 三语义件（PageHeader L2 增强 + QueryFilter 新 type 落 flux-renderers-data + Result 新 type 落 flux-renderers-content）——「语义件 = 新 renderer type 或既有 renderer 语义增强」的双轨裁定框架 + dead config 分轨处置 + propContract 精确 union 门禁（`filterTogglable: true` boolean 静默丢弃在库 bug 修复先例——本计划新字段族定义须预防同款 union 门禁坑）。
- **门禁与保护区域（live 实测）**：renderer 定义字段 **plan-first**（owner evidence = `docs/references/renderer-interfaces.md` 对齐，本计划即载体）；样式契约 **plan-first**（marker/data-slot 输出沿 styling-system Renderer Styling Contract，核查制）；`packages/ui/src/index.ts` **ask-first**（预期零改动；若契约需新增 ui 导出则 Phase 1 显式标注理由并停门）；`check:audit-event-dispatch-ctx` 门禁覆盖 14 个 renderer 包。
- **基线命令现状**：ui-review 分支 full-green 基线（G-A closure 记录）——本计划启动时按惯例 live 复核。

## Goals

- **批量栏语义件契约落地**：形态 Phase 1 Decision 裁定（候选 ①新 renderer type（如 `batch-bar`，落 flux-renderers-data，QueryFilter/Result 先例）；②crud/table 各自语义字段族）——选择集绑定（array path/表达式）、计数文案模板、`actions` region、**非空可见门控内建**（选择集空时包络不渲染）、内建清空动作（双句柄解析语义 Phase 1 裁定：crud `component:clearSelection` / table `component:setSelection` 空集，或经 `target` componentId 统一句柄解析）、marker/data-slot 输出沿 styling contract。
- **「全选本页」选择语义收口**：选择集 mode 语义字段（候选 `selectAllMode: 'all' | 'page'`，命名 Phase 1 裁定）——P4b 登记的「表头全选 = 源数据全量、全选本页不可表达」缺口消解；crud/table 双侧采纳面与服务端分页形态语义 Phase 1 裁定，先红后绿。
- **双选择集契约对接边界落字**：语义件对 crud `$crud.*` 与 table scope 两套平行 API 的对接方式落字（统一治理仍归后续契约治理 Follow-up——G-F plan Non-Goal 同口径，本计划不合并两套 API）。
- **owner docs 对齐**：`docs/references/renderer-interfaces.md`（Protected Areas owner evidence）+ flux-guide schema 作者条目 + C2 回写 ⑬（追加式：G-B3 终态 + 观察面余量登记）。
- 全量验证 full-green + `pnpm check` 零新增红。

## Non-Goals

- **不做 G-C 多视图状态机 / G-D 网格编辑语义**：C2 §2 #6 其余成员，后续独立 plan（G-D 依赖 G-B2 + 本计划双前置落地）。
- **不做范围选区/fill handle/⌘ 多选/修饰键选区**：编辑器选区模型，归 G-B2（回写 ⑦ 终态裁定；G-B2 plan Phase 1 已设「范围选区 + fill handle 编辑器选区模型」专项 Decision 裁定其立项或显式 deferred——本计划不承担该维度的实现或裁定；本计划 `handleSelectRow` 语义零改动）。
- **不合并 crud/table 两套选择集 API**：语义件以对接边界共存（Goals 第 3 条）；统一契约治理归 Follow-up。
- **不改 `listActions` 既有语义**：常显动作区保持现状；本计划语义件是选择集驱动的增量包络，不替代 listActions。
- **不复活 `bulkActions`**：legacy toolbar block 类型维持死状态（归一化丢弃 + 校验报错现状零变化）；新语义件命名 Phase 1 裁定且不得与之冲突。
- **不做复刻页 retrofit**：antdpro-list 手工拼装批量栏的语义件化改造登记 Non-Blocking Follow-up（复刻页迭代时采纳，G-A「既有复刻页 retrofit」同口径）。

## Scope

### In Scope

- `packages/flux-renderers-data/src/`——新语义件实现落点（新 type 或 crud/table 字段族，Phase 1 裁定）+ `data-renderer-definitions.ts`/`schemas.ts`/schema 校验登记
- `use-table-selection.ts`（仅 `selectAllMode` 语义增量，修饰键零改动）与 crud 选择集投影对接面
- 各落点 `__tests__/` 先红后绿单测；`docs/references/renderer-interfaces.md`、`flux-guide/`、`docs/architecture/styling-system.md`（核查制）、`docs/analysis/ui-review/C2-capability-gaps.md`（回写 ⑬）、`docs/logs/`

### Out Of Scope

- `packages/flux-core/src/`（预期零改动；撞边界则按 Protected Areas 停止并重开 plan）
- `packages/ui/src/index.ts`（预期零新增导出；若需新增则 Phase 1 停 ask-first 门）
- G-C/G-D、修饰键选区、两套选择集 API 合并、复刻页 retrofit（见 Non-Goals）

## Failure Paths

| 可测场景编号             | 触发                                                                                 | 行为（含契约语义）                                                                       | 可重试 | 用户可见表现                |
| ------------------------ | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ------ | --------------------------- |
| batch-bar-empty          | 选择集为空/绑定路径缺失/求值失败                                                     | 包络不渲染（零占位、不抛错）；路径恢复非空后随动渲染                                     | 是     | 无批量栏                    |
| batch-bar-target-invalid | 清空目标 componentId 不存在/句柄缺失/句柄方法不匹配                                  | dev warn 一次（isDevRuntime 门）；清空按钮降级行为 Phase 1 裁定（隐藏 or no-op + warn）  | 否     | 控制台 dev warn，按裁定表现 |
| batch-bar-count-expr     | 计数文案模板表达式求值失败                                                           | 回退为原始计数数字渲染 + dev warn，包络不中断                                            | 否     | 显示原始计数                |
| batch-bar-clash          | 语义件 target 与宿主（crud/table）选择集声明不匹配（如 target 指向未启用选择的组件） | dev warn + 按空集处理（包络不渲染）——语义 Phase 1 落字                                   | 否     | 无批量栏 + dev warn         |
| selectall-page-server    | 服务端分页形态下 `page` 模式全选                                                     | 语义 = 当前页已流入行集（与 `handleSelectAll` 传入 rows 同源），跨页累积语义不发明——落字 | 否     | 仅当前页行进选择集          |
| compat                   | 既有 schema 未声明新字段族                                                           | 渲染输出与现行为等价（渲染快照对比断言）；`selectAllMode` 缺省 = 现行为（'all'）         | 否     | 零变化                      |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（schema 公共契约 + 批量操作核心回归路径；AGENTS.md Test Strategy Tiers「Must automate」——批量栏为 renderer 公共契约面，P2b/P4b 两度实测登记的缺口消解须回归锁定；G-A propContract union 门禁坑预防亦须断言）。对应 Proof 先于 Fix：Phase 1 产出契约断言清单（可见性门控矩阵/计数模板矩阵/清空句柄解析矩阵/selectAllMode 矩阵/兼容矩阵），Phase 2/3 按「先红后绿」实现。

## Execution Plan

> 顺序 Phase。Phase 1 契约裁定先行（Phase 2/3 全部依赖其断言清单）；Phase 4 文档与回写收口。

### Phase 1 - 契约设计与采纳面裁定

Status: completed
Targets: 本计划 Decision 注记、`docs/references/renderer-interfaces.md`（草案条目）

- Item Types: `Decision | Proof`

- [x] Proof——批量栏面 inventory 实测落字：回写 ③⑤⑦⑧ 素材 live 复核（`$crud.*` 投影/句柄、table selection hooks、`bulkActions` 死状态、Alert 底座）+ 参考应用形态对照（AntD Pro alert 包络（P2a/P2b 复刻页实证）vs Linear 批量栏（P4b 实证）vs Stripe/Airtable 无批量栏（P7b/P6b 对照终态））——语义件承载的形态谱系落字
- [x] Decision——形态裁定（候选 ①新 renderer type（落点/命名/与 dead `bulkActions` 命名区隔）；②crud 语义字段族 + table 语义字段族分轨；③crud `toolbarLayout` block 复活变体——预期否决理由落字）——含 propContract 精确 union 预防（`filterTogglable` boolean 静默丢弃在库 bug 先例）与 `check:renderer-definition-fields-only` 登记口径
- [x] Decision——字段族裁定：选择集绑定（`target` componentId vs 直接 path 表达式）、计数模板、`actions` region、内建清空（双句柄解析语义：crud `component:clearSelection` / table `component:setSelection` 空集 / 统一句柄解析三候选）、可见性门控与 `visible` 的叠加语义——Failure Paths 终态化
- [x] Decision——`selectAllMode` 语义裁定：命名、缺省值（'all' = 现行为零回归）、'page' 精确语义（当前页行集/keepOnPageChange 交互）、crud/table 采纳面（双侧或单侧 + 理由）、服务端分页形态落字
- [x] Decision——marker/data-slot 输出裁定（styling-system Renderer Styling Contract 对齐：root marker + `data-slot` + `data-*` 状态属性；widget renderer 自样式）
- [x] Decision——ui 包零改动确认（预期零新增导出；若契约需新增 ui 公共导出则 ask-first 理由显式落字且未在门禁前改码）

Exit Criteria:

- [x] 五项 Decision 与一项 Proof 全部落字本计划（契约断言清单可清单化：可见性/计数/清空/selectAllMode/兼容五矩阵）
- [x] `docs/references/renderer-interfaces.md` 契约草案条目成形（Protected Areas owner evidence 就位）
- [x] 若触 `ui/src/index.ts`：ask-first 理由已落字且未在门禁前改码（未触发——零 ui 改动确认，见 Decision 5）

#### Phase 1 Decision Record（2026-08-31 执行时落字，全部行号经 live 复核）

**Proof——inventory live 复核（HEAD `345f034fa`）**：

- crud 选择集投影与句柄在库：`CrudStatusSummary.hasSelection/selectionCount/selectedRowKeys`（`crud-schema.ts:309-311`）；`$crud` readonly 绑定挂 crud 自身 scope（`crud-renderer.tsx:232-235`），`toolbar`/`listActions`/`footerToolbar` 三 region 均经 `crudScope` 渲染（`crud-renderer.tsx:390-392`）——嵌套批量栏读 `$crud.selectedRowKeys` 具备反应性（读通道 = `useScopeSelector` 经 projected scope store，`crud-renderer-state.ts:427-431` 的 selection 写入触发重通知）；`clearSelection`/`toggleSelection` 句柄（`crud-renderer-state.ts:347-353`）。
- table 选择集 hooks 在库：`use-table-selection.ts`——`handleSelectAll`（:178-269，H21 retainedKnown 剪枝 + `maxSelectionLength` 沿行序截断 + `keepOnPageChange` 双分支）、`handleSelectRow`（:271-369，G-B2 修饰键语义零改动）、`setSelectionExternal`（:371-399）；table 句柄 `setSelection`（`use-table-handle.ts:51-55`）。选择 hooks 接收**全量行集**（`treeFlattenedData`），显示分页切片在 `table-renderer.tsx:307-310`（`paginateTableData`）——「全选本页」需把页切片作为 select-all 作用域传入 hooks。
- `bulkActions` 死状态维持：归一化丢弃（`crud-renderer-toolbar.tsx:25-27,33-35`）+ authoring 报错（`data-schema-validation.ts:367-373`），双态均有测试锁定（`data-package-units.test.tsx:56` / `schema-validator.test.ts:168,191`）。
- `@nop-chaos/ui` Alert/Badge/Button 在库（`ui/src/components/ui/alert.tsx`、`ui/src/index.ts:2-6`）——底座零新导出。
- 参考应用形态谱系：AntD Pro = alert 包络手工拼装（`antdpro-list.json` toolbar：text `${$crud.selectionCount}` + `visible: "${$crud.hasSelection}"` + 清空按钮 `component:clearSelection`）；Linear = 容器批量栏手工拼装（`linear-issues.json`：container + 计数 text `${issueSelection?.length ?? 0}` + `disabled` 空集门控按钮 + `component:setSelection` 空集）；Stripe/Airtable 无批量栏（P7b/P6b 对照终态维持）。→ 语义件须承载「计数文案 + 空集隐藏 + 动作区 + 内建清空」四要素、双宿主可达。

**Decision 1——形态：新 renderer type `batch-bar`，落 `@nop-chaos/flux-renderers-data`**（候选 ①采纳；②③否决）：

- 候选 ②（crud/table 双字段族）否决理由：批量栏是**独立包络语义件**（QueryFilter/Result 先例），字段族方案把同一契约在两宿主各复制一份且只能作为宿主内嵌 block——回写 ③⑤ 登记的缺口是两宿主共有的「包络手工拼装」，独立 type 一次消解双宿主。
- 候选 ③（`toolbarLayout` block 复活变体）否决理由：`bulkActions` block 类型死状态由归一化丢弃 + 校验报错双门锁定，复活即 legacy 命名复生（G-A dead config 处置先例），且仅覆盖 crud 宿主。
- 命名 `batch-bar` 与 dead `bulkActions` 零共享词元（不复用、不别名）；marker 根类 `nop-batch-bar`。
- propContract 预防：新字段全部登记精确 shape（string 用 `{ kind: 'string' }`，region 字段不进 propContracts——quick-reference 门禁口径）；fields-only 门禁（`check:renderer-definition-fields-only`）零新增红口径 = 只用 `fields` 数组登记、不写 legacy `regions` 字面量。

**Decision 2——字段族（Failure Paths 终态化）**：

- 选择集绑定 = **直接 path 表达式**（`selectionPath`，raw scope path 无 `${}`；必填，缺失报 `missing-required-field`）。`target` componentId 反应式读否决理由：`ComponentHandleRegistry` 句柄是命令式 invoke 通道（`component-handle-core.ts:36-43`），无反应式读面；scope path 是原生反应通道且与两宿主契约天然对接（crud 嵌套 `$crud.selectedRowKeys` / table 页面级 `selectionStatePath` 同源路径）。
- 计数模板 = `countTemplate`（string，`${count}`/`selectedRowKeys` 经 `helpers.evaluate` + 临时子 scope 求值；`checkableWhen` 包装先例）；缺省走 i18n `flux.batchBar.selectedCount`。求值失败回退原始计数 + dev warn（batch-bar-count-expr）。
- 动作区 = `actions` region（`kind: 'region'`），渲染于计数与清空之间。
- 内建清空 = **候选 ③统一句柄解析**：`clearTarget`（componentId）声明才渲染清空按钮；点击时 registry `resolve({ componentId })` → `clearSelection` 方法优先（crud 句柄）、不支持则 `setSelection` + `{ selectedRowKeys: [] }`（table 句柄）。**该解析面是语义件内部 facade，两套选择集 API 本体不合并不平移**（Non-Goal 第 3 条维持——语义件不新增 `$crud.*` 或 table scope 投影）。`clearLabel` 覆盖缺省文案（i18n `flux.batchBar.clearSelection`）。目标缺失/句柄双方法皆缺 → no-op + 一次性 dev warn（batch-bar-target-invalid，isDevRuntime 门 + ref latch）。
- 可见性门控叠加语义 = **AND**：内建非空门控（选择集空/路径缺失/求值失败 → 包络渲染 null，batch-bar-empty，零占位不抛错）与 schema 级 `visible`（meta 管线）各自独立生效、结果取交——作者可用 `visible` 进一步收窄可见条件，但无法绕过内建非空门控。
- batch-bar-clash 终态：读路径权威——target 指向未启用选择的组件时 `selectionPath` 解析为空 → 包络隐藏（即「按空集处理」）；无独立 clash warn（crud 句柄在 selection 未启用时仍注册 `clearSelection`，clash 探测误报面大于收益），诊断由 batch-bar-target-invalid 覆盖。

**Decision 3——`selectAllMode`**：

- 命名 `selectAllMode: 'all' | 'page'`；缺省 `'all'` = 现行为零回归（既有全量进选择集语义，P4b 34 行实证的行为面）。
- 采纳面 = **双侧**：table `rowSelection.selectAllMode` + crud `selection.selectAllMode`（`buildCrudTableSchema` 透传）。理由：crud 缺省 table 载体与 table 共享 `useTableSelection` 同一实现，单侧采纳会把同一子语义缺口留在 crud 侧；crud cards/list 载体自持选择、无表头全选形态，不受影响。
- `'page'` 精确语义：表头全选作用域 = **当前显示页行集**（客户端分页 = `paginateTableData` 切片；服务端分页 = 已流入行集，与 `handleSelectAll` 传入 rows 同源——Failure Path selectall-page-server 落字，不发明跨页累积）；表头 checkbox 勾选态（`allSelected`）同跟随页作用域。
  - 语义终态（执行期定稿，先红后绿锁定）：'page' 全选 = **check/uncheck-all-visible**——勾选 = 既有选择集 ∪ 页行集（`maxSelectionLength` 沿页行序截断）；取消 = 选择集 \\ 页行集（他页键保留）。**与手动逐行勾选语义完全同构**（行勾选本就跨页累积），`keepOnPageChange` 不改变 select-all 行为、继续治理行级变更的保留/剪枝——不发明第三种累积通道。
  - 共存矩阵：`maxSelectionLength` 截断沿页行序；`checkableWhen` 过滤页内不可选行（可选择性按全量行集计算，页内过滤应用）；`modifierSelect`（G-B2）⌘A 走 `handleSelectAll(true)` 即页作用域、⇧click 范围保持视图行序零变化、select-all 锚点移至页首行（既有规则）；radio 无表头全选形态（既有），`selectAllMode` 惰性。
- 实现口径：`useTableSelection` 新增可选 `options.selectAllRows` 作用域参数（缺省 undefined = `rows`，'all' 路径字节等价）+ 返回 `selectAllScopeSelectedCount`（页感知表头 indeterminate 态）；table-renderer 以页感知 `selectAllChecked`/`selectAllIndeterminate` 传给表头（'all' 模式回退 legacy 公式零变化）；`handleSelectRow`/`setSelectionExternal`/修饰键语义零改动。

**Decision 4——marker/data-slot 输出**（styling-system Renderer Styling Contract 对齐）：

- 根：`nop-batch-bar` marker 类 + `data-slot="batch-bar"` + 标准 `data-testid`/`data-cid`；状态属性 `data-count`（计数字符串）。
- 内部 slot：`batch-bar-count`（计数文案）、`batch-bar-actions`（动作区）、`batch-bar-clear`（内建清空按钮）。
- 形态分类 = widget renderer 自样式（包络视觉类随组件走，零 CSS-only 布局 marker）；空集不渲染（零 DOM 零 marker）。

**Decision 5——ui 包零改动确认**：Alert/Badge/Button 均为 `ui/src/index.ts` 既有导出面（:2-6），batch-bar 以自身包络类 + ui `Button` 组合，**零新增 ui 导出，ask-first 门禁未触发**。

**契约断言清单（五矩阵，Phase 2/3 先红后绿载体）**：①可见性门控矩阵（空集/非空/路径缺失/求值失败/`visible` 叠加）；②计数模板矩阵（缺省 i18n/`${count}` 插值/求值失败回退）；③清空句柄解析矩阵（未声明/ crud `clearSelection`/table `setSelection` 空集/目标缺失 no-op+warn）；④selectAllMode 矩阵（缺省等价/page 客户端分页/page+keepOnPageChange/page 服务端分页/共存 max+checkable+modifier/radio 惰性）；⑤兼容矩阵（未声明新字段族 schema 渲染等价 + crud/table 双宿主对接用例）。

### Phase 2 - 批量栏语义件实现（先红后绿）

Status: completed
Targets: 语义件实现落点（Phase 1 裁定）、`data-renderer-definitions.ts`、`__tests__/`

- Item Types: `Fix | Proof`

- [x] Proof——契约断言清单测试先行（红）：可见性门控矩阵（空集/非空/路径缺失/求值失败）+ 计数模板矩阵（正常/失败回退）+ 清空句柄解析矩阵（crud 句柄/table 句柄/target 无效）+ 无声明兼容矩阵
- [x] Fix——语义件按裁定契约实现（选择集绑定 + 计数模板 + actions region + 内建清空 + marker 输出）+ 定义字段登记与 schema 校验同步（`check:renderer-definition-fields-only` 门禁零红；propContract union 预防断言）
- [x] Proof——crud 与 table 双宿主对接验证（P2b antdpro-list 手工拼装场景的语义件等价表达用例 + P4b linear 批量栏场景等价表达用例，先红后绿）

Exit Criteria:

- [x] 先红后绿单测全绿（五矩阵 + 双宿主对接用例）
- [x] 受影响包局部 typecheck/test 通过（保证 Phase 3 可继续）
- [x] `check:renderer-definition-fields-only`（`scripts/check-renderer-definition-fields-only.mjs`）与 `check:audit-event-dispatch-ctx` 门禁零新增红

实现记录（2026-08-31）：新文件 `batch-bar.tsx`（组件）+ `batch-bar-definition.ts`（definition + `validateBatchBarSchema`）；`BatchBarSchema` 落 `schemas.ts`；注册面 `data-renderer-definitions.ts` + `index.tsx` 导出；i18n 新键 `flux.batchBar.selectedCount`/`clearSelection`（en-US + zh-CN 对称）。测试 15 条先红后绿（`batch-bar.test.tsx` 13 + `batch-bar-hosts.test.tsx` 2）。执行期契约级发现：`countTemplate` 若按普通 prop 字段声明，props 解析管线会在节点渲染前对模板字符串求值（`${count}` 在节点 scope 无解 → 抛错或静默降级为静态串）——改用 `SchemaFieldRule.lazyEval: true`（loop `itemData` 先例）编译进 `structuralFields`，由渲染器在 `{ count, selectedRowKeys }` 子作用域经 `evaluateCompiled` 求值，失败回退原始计数 + dev warn。连带面：playground route-matrix 门禁要求每个注册 renderer type 有路由 + lab page——新增 `data-route-entries.ts` batch-bar 条目 + `batch-bar-lab-page.tsx`（三场景：crud 宿主/table 宿主/缺省计数文案）+ lab registry 登记。

### Phase 3 - selectAllMode 实现 + 共存回归

Status: completed
Targets: `use-table-selection.ts`、crud 选择集对接面（采纳面按 Phase 1 裁定）、`__tests__/`

- Item Types: `Fix | Proof`

- [x] Fix——`selectAllMode` 按裁定语义实现（'page' 模式行集计算 + 与 `keepOnPageChange`/`maxSelectionLength`/`checkableWhen` 共存矩阵），先红后绿单测
- [x] Proof——全选语义回归锁定：缺省（'all'）行为渲染与选择集快照等价（P4b「全量进选择集」现状用例回归全绿）；'page' 模式服务端分页语义用例（Failure Path selectall-page-server 断言）
- [x] Proof——双选择集契约对接边界结论落字（语义件对 `$crud.*`/table scope 的对接方式 + 统一治理 Follow-up 登记确认）

Exit Criteria:

- [x] selectAllMode 先红后绿单测全绿（含共存矩阵与服务端语义断言）
- [x] 缺省行为零回归（兼容快照断言全绿）
- [x] 对接边界结论落字本计划；受影响包局部 typecheck/test 通过

实现记录（2026-08-31）：`rowSelection.selectAllMode` 落 `schemas.ts` + `CrudSelectionConfig.selectAllMode`（`buildCrudTableSchema` 透传，双侧采纳）；`useTableSelection` 新增 `options.selectAllRows`（select-all/allSelected 作用域）+ `selectAllScopeSelectedCount` 返回值；table-renderer 将页计算块上移、页切片经 `selectAllRows` 传入 hook，表头 checkbox 态经 `selectAllChecked`/`selectAllIndeterminate` 页感知（'all' 模式 legacy 公式零变化）；双宿主校验（table/crud）`selectAllMode` 联合门禁。测试 11 条先红后绿（`table-select-all-mode.test.tsx`：缺省零回归 2 + page 语义 3 + 服务端 1 + max/checkable 共存 2 + crud 透传 1 + 校验 2）；连带登记 `crud-selection-drift-deletion.test.ts` 字段清单 6→7（契约有意增长，drift 防护意图保留）。执行顺序约束履行：G-B2 plan（N=1）已于 2026-08-31 收口后本计划（N=2）执行，共写面 `use-table-selection.ts` 冲突消除（本计划 `handleSelectRow`/修饰键语义零改动实测维持）。

### Phase 4 - 文档对齐与 C2 回写

Status: completed
Targets: `docs/references/renderer-interfaces.md`、`flux-guide/`、`docs/architecture/styling-system.md`（核查制）、`docs/analysis/ui-review/C2-capability-gaps.md`、`docs/logs/`

- Item Types: `Proof | Follow-up`

- [x] `docs/references/renderer-interfaces.md` 契约条目终稿（与 live 行为逐项核对，区分「字段存在」与「语义落地」）
- [x] flux-guide schema 作者条目（批量栏语义件用法样例：crud 宿主 + table 宿主双样例 + selectAllMode 说明）
- [x] `docs/architecture/styling-system.md` 核查：marker 输出约定若需补充则同步（无改动不写凑条目）
- [x] C2 回写 ⑬（追加式）：G-B3 行落「已产品化（本 plan）」终态证据 + 观察面余量登记（范围选区归 G-B2 专项 Decision 的边界确认）+ G-C/G-D 拆分后续 plan 登记 + 初版裁决表零改动
- [x] daily dev log 记录（`docs/logs/2026/08-30.md` 或实际执行日）

Exit Criteria:

- [x] owner 文档落字/核查完成且与 live 行为一致
- [x] C2 回写完成（追加式，初版裁决表零改动）
- [x] daily log 已记录

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh session 独立子 agent `ses_facbb1049ffetuEd4jolrfhqX0`（R1 全量四查 review，全部文件路径/行号/符号引用逐项 live 核对）+ `ses_facb214a7ffeYtrTBuHr39e5S0`（R2 scoped re-check）
- Verdict: `pass`（R1 `revised`——1 Major + 4 Minor；全部修复后 R2 scoped re-check 零 Blocker/零 Major，2 Minor residual 随共识修复）
- Rounds: 2
- Findings addressed: R1 Major ①Non-Goal 将范围选区/fill handle 指向「G-B2 plan Phase 1 落字」而彼计划无对应执行项（C2 回写 ⑦ 维度将无人承接）——随 G-B2 plan（`2026-08-30-2312-1`）新增专项 Decision 消解，本计划 Non-Goal 与 Phase 4 回写 ⑬ 措辞改为引用该专项 Decision；Minor ②共写面声明扩全（`data-renderer-definitions.ts`、`schemas.ts`/`data-schema-validation.ts`、`use-table-selection.ts`）；③门禁名改 colon 形式；④Phase 1 Exit 计数核对（「五项 Decision 与一项 Proof」= 实际 5+1，compound 项拆分）；⑤Deferred 区 Successor Path 改「不适用 + 本计划 Follow-ups 区指针」。R2 Minor residual：形态 Decision 内门禁名残留 hyphen 形式；Follow-ups 区补 retrofit 条目消除悬空指针——随共识修复，零残留 Blocker/Major

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。全量验证归此处，Phase 内只做保证后续 Phase 能继续的局部验证。

- [x] 批量栏语义件契约已落地且 Phase 1 断言清单全项有先红后绿证明（五矩阵）
- [x] `selectAllMode` 语义落地且缺省行为零回归（兼容快照断言全绿）
- [x] 双选择集契约对接边界落字；无 in-scope live defect 或 contract drift 被静默降级
- [x] `docs/references/renderer-interfaces.md` 对齐完成（Protected Areas owner evidence）；styling-system 核查完成（或零改动落字）
- [x] C2 回写 ⑬ 完成（追加式，初版裁决表零改动）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（零新增命中，红项仅限既有登记）

## Deferred But Adjudicated

> 预期条目（Phase 1 裁定后终态化）：复刻页 retrofit。以下为起草时预登记，Phase 1 可修订。

### 既有复刻页批量栏语义件化 retrofit（antdpro-list 手工拼装包络等）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 语义件契约的价值证明由先红后绿单测 + 双宿主对接用例承载；复刻页改造属历史 plan 产物迭代，收益为维护成本优化而非契约缺口（G-A「既有复刻页 retrofit」同口径）
- Successor Required: `no`
- Successor Path: 不适用（无独立 successor plan；采纳时机登记于本计划 `Non-Blocking Follow-ups` 区，复刻页迭代时采纳）

## Non-Blocking Follow-ups

- 既有复刻页批量栏语义件化 retrofit（antdpro-list 手工拼装包络等——复刻页迭代时采纳，见 `Deferred But Adjudicated` 区）
- crud `$crud.*` 与 table selection scope 两套平行选择集 API 的统一契约治理（G-F plan Follow-up 同源，本计划只落字对接边界）
- G-C 多视图状态机 / G-D 网格编辑语义件——C2 §2 #6 其余成员，D1 后续独立 plan（G-D 依赖 G-B2 + 本计划）
- 语法搜索解析器/formatCurrency registry 函数等 D1 输入池候选（回写 ⑧ 登记，未分级，按 C2 后续轮次评估）

## Closure

Status Note: 本 plan 已关闭（2026-08-31）。G-B3 批量操作栏语义件按 Phase 1 裁定落地：新 renderer type `batch-bar`（flux-renderers-data）+ `selectAllMode` 选择语义（crud/table 双侧采纳），先红后绿单测 26 条（batch-bar 13 + 双宿主对接 2 + selectAllMode 11），双宿主（P2b/P4b 手工拼装等价表达）用例锁定；`renderer-interfaces.md` 两节终稿 + flux-guide 双条目 + C2 回写 ⑬（追加式）+ styling-system 核查零改动。全量验证 full-green verification：`pnpm typecheck` 37/37、`pnpm build` 37/37、`pnpm lint` 37/37、`pnpm test` 68/68 任务、`pnpm check` exit 0（195W/2E 均为既有登记基线，HEAD 与工作树双口径一致，零新增命中）；执行期连带面（route-matrix 门禁 route+lab page、drift 字段清单 6→7）均已登记处置。

Closure Audit Evidence:

- Auditor / Agent: fresh session 独立子 agent `ses_fab111b38ffea7Ucu87GF2KOLb`（1 轮）
- Evidence: VERDICT **APPROVED** 零 Blocker/零 Major/零 Minor。审计独立核对 A–E 五域：A 各 Phase 落地面逐项 file:line 核实（batch-bar.tsx/definition、selectAllMode 全链、注册面、i18n 对称、四文档、C2 ⑬ append-only 0 删行、bulkActions 死状态未动）；B 独立重跑三份测试文件 26/26 全绿并确认五矩阵先红后绿设计；C plan 文本内部一致（Phase 1–4 全 completed、无 Closure Gates 外残留 `[ ]`）；D deferred/follow-up 分类诚实（retrofit = optimization candidate；共写面 `use-table-selection.ts` diff 确认 G-B2 修饰键路径零触碰）；E `git status` 无 out-of-scope 改动（零 flux-core/ui 改动，Decision 5 兑现）。证据原文见审计 task 记录与 `docs/logs/2026/08-31.md`。

Follow-up:

- 见 `## Non-Blocking Follow-ups` 区（复刻页 retrofit / 两套选择集 API 统一治理 / G-C、G-D 后续 plan / D1 输入池候选）；无 remaining plan-owned work。
