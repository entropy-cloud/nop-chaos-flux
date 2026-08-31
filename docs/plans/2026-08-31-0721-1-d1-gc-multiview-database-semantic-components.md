# D1-7 G-C 多视图数据库语义件产品化（视图集合管理动态化 + kanban 列头聚合 + 两维度终态裁定）

> Plan Status: completed（2026-08-31 执行收口；draft review 通过记录见下）
> Mission: ui-review
> Work Item: D1. 能力缺口产品化 plans —— G-C 多视图状态机语义件（C2 §2 预清单第 6 位「G-B3/G-C/G-D 语义件族」第二成员；G-B3 已产品化关闭，G-D 归后续独立 plan；P5 回写（回写 ⑥）已完成故定形条件满足）
> Last Reviewed: 2026-08-31
> Source: roadmap `docs/backlog/ui-review-roadmap.md`（D1 条目 + Phase Details D1 + Cross-Cutting 4/5）；C2 裁决文档 `docs/analysis/ui-review/C2-capability-gaps.md`（初版裁决表 G-C 行 + §2 预清单 6/6 + 回写 ⑥ P5b 终态实测 + 回写 ④ P3b G-C 证据）；`docs/context/ai-autonomy-policy.md` Protected Areas（renderer 定义字段 plan-first / 样式契约 plan-first / `ui/src/index.ts` ask-first）
> Related: `docs/plans/2026-08-30-2312-2-d1-gb3-batch-bar-semantic-component.md`（同族前一成员；Follow-up 区登记本计划为 successor）；`docs/plans/2026-08-30-1737-2-d1-ga-page-template-semantic-components.md`（dead config 分轨处置先例：接线或废弃告警）；`docs/plans/2026-08-30-1737-1-d1-gb1-command-palette-renderer-primitive.md`（items 静态 + source 动态双轨先例，Phase 2 载体候选参照）
> 执行顺序约束：本计划（N=1）先于 G-D plan（N=2）执行。两计划代码面不相交（本计划 `flux-renderers-basic`/`flux-renderers-scheduling`；G-D `flux-renderers-data`），共写面为 `docs/references/renderer-interfaces.md`、flux-guide 条目与 C2 回写追加区——顺序执行消除文档冲突；C2 回写编号按实际执行顺序落字（本计划先落则为 ⑭）。

## Purpose

把 C2 裁决为 **G-C（多视图数据库语义：视图切换状态机 + 列聚合 + 视图管理动态化，L2）** 的缺口产品化：为「多视图数据库」形态补齐 schema 可表达的**管理侧**语义（视图集合的运行时新增/删除/重命名/重排）与 kanban 列头原生聚合语义件，消解回写 ⑥ 两项终态登记缺口——「运行时新增视图分支 / tab 重排 / 溢出收纳动态化（I2/I13，tabs 原语缺口）」与「kanban 列头原生聚合（per-column 绑定缺失）」；并同 plan 显式裁定「视图类型↔默认 peek 形态联动」与「个人视图偏好存储层」两维度的终态（立项或 deferred，不得静默）。

## Current Baseline

- **tabs「读侧」状态机已承载**（P5b 实测，回写 ⑥）：tab `valueOwnership:'scope'` + `valueStatePath` （`packages/flux-renderers-basic/src/schemas.ts:161-162`）+ 分支 keepMounted hidden 切换 + 会话 viewConfig 端点覆写，可完整承载「视图集合 + activeViewId + 每视图私有配置集生效」三层状态机的**读侧**（五视图 tab 切换 + per-view 配置生效，interactions e2e 06/07/08/12 锁定）。
- **tabs 管理类死声明族（本计划起草期 live 实测新发现，Fix 项）**：`TabsSchema` 的 `closable`（`schemas.ts:170`「amis closable」）、`draggable`（`schemas.ts:172`「amis draggable」）、`addable`（`schemas.ts:174`「amis addable」）三姊妹字段契约面均已声明并在 `basic-renderer-definitions.ts:640-641` 登记（`kind: 'prop'`），但 `packages/flux-renderers-basic/src/tabs.tsx` 对三者**实现零命中**（`closable`/`onClose`/`removeItem`/`draggable`/`addable` grep 全零）——「接口已出现、语义未落地」（guide Rule 11 分界），按 G-A dead config 分轨先例处置（接线或废弃告警，Phase 1 裁定；本计划 Goals 的删除/重排/新增三能力与三字段一一对应，接线是其自然归宿）。
- **视图集合「管理侧」零通道**（回写 ⑥ 终态）：运行时新增视图分支（I2）、视图 tab 拖拽重排/溢出收纳动态化/三态动态切换生效（I13）零 schema 表达；tabs 现状溢出为横向滚动（`tabs.tsx:326` `nop-scrollbar-hide overflow-x-auto`），无溢出收纳。tabs 组件句柄已有「set active tab value」方法（`basic-renderer-definitions.ts:609`），但无集合变更句柄。
- **kanban 列头聚合零实现**（回写 ⑥ 候选 2 终态）：`kanban.types.ts:48-49` 的 `columnHeader`/`columnHeaderToolbar` 为**全列共享** SchemaInput region，无 per-column 绑定（G-A 观察面）；Sum/Avg/Min/Max/Count 聚合与列头内嵌形态零实现。P5b 的 board 列聚合以 mock 端点重算（`buildNotionBoardData`）+ 默认卡面外承载。
- **视图类型↔默认 peek 形态联动**：联动规则本体未建模（回写 ⑥）——table/board/list→side、gallery/calendar→center 的规则在 Notion 复刻页以「语境决定载体」静态表达维持。
- **个人视图偏好存储层**：跨会话偏好持久化需 schema 外存储层（localStorage/用户偏好层），缺口维持 `optimization candidate`（回写 ⑥ 候选 1）。
- **平台复用面**：G-B1 command-palette 的 `items`+`groups` 静态双轨 + `source` 动态轨先例（载体候选参照）；G-B2 keyboard 绑定通道、G-F optionRow、G-B3 batch-bar 已落地（本计划不依赖其代码，仅共享风格先例）；condition-builder 可用（本计划 Non-Goal，filter 面板联动已在 P5b 证明 schema 可达）。
- **`@nop-chaos/ui` 预期零改动**：溢出收纳等 UI 承载复用既有导出（如 DropdownMenu 消费），不新增 `ui/src/index.ts` 导出（ask-first 门不触发）。

## Goals

- tabs **视图集合管理动态化**语义字段族落地（Phase 1 裁定载体与字段面）：运行时新增（`addable`）/删除（`closable`）/重排（`draggable`）三姊妹死声明族处置与语义接线，及溢出收纳或其显式 deferred 裁定。
- kanban **per-column 列头聚合**语义件落地：聚合函数族（Sum/Avg/Min/Max/Count）+ 列头内嵌形态，解 per-column 数据绑定。
- 「视图类型↔peek 形态联动」与「个人视图偏好存储层」两维度显式终态裁定落字（立项实现或 `Deferred But Adjudicated`，不得静默跳过）。
- C2 回写（追加式）+ owner docs 对齐（renderer-interfaces.md / flux-guide）。

## Non-Goals

- **G-D 网格编辑语义件族**（table 域：分组/聚合渲染、单元格原位编辑、fill-handle）——独立 plan（N=2），本计划 Non-Goal 引用不展开。
- **既有复刻页 retrofit**：notion-database 等复刻页维持历史 plan 产物（G-A/G-B3 同口径；采纳时机登记 Follow-up）。
- **filter 面板联动/行内新建**：C2 初版 G-C 行的这两个子面已由 P5b 证明 schema 层可达（condition-builder + 新建链路 5 入口接线锁定），无产品化缺口。
- **crud 视图**（`crud-views-export` 域）与移动端主组件族（G-H，挂起）。
- **全量 WCAG 合规**（归 deep-audit 维度 20）。

## Scope

### In Scope

- `packages/flux-renderers-basic/src/tabs.tsx`、`schemas.ts`、`basic-renderer-definitions.ts`：视图管理动态化字段族 + `closable` 语义处置。
- `packages/flux-renderers-scheduling/src/kanban/`：per-column 列头聚合语义。
- 相应 schema 校验（`check:renderer-definition-fields-only` 门禁同步）+ 先红后绿单测。
- `docs/references/renderer-interfaces.md`、flux-guide 对应条目、C2 回写追加。

### Out Of Scope

- `packages/flux-core/src/`（编译器/scope 语义）——若 Phase 1 裁定需要 flux-core 改动，先落字保护区域流程与理由，再进入实现。
- `packages/ui/src/index.ts`（零新导出为默认预期，触发 ask-first 须先落字理由）。
- playground 复刻页改造（Non-Goal 引用）。

## Failure Paths

| 可测场景编号               | 触发                           | 行为（含错误表现）                                                          | 可重试 | 用户可见表现     |
| -------------------------- | ------------------------------ | --------------------------------------------------------------------------- | ------ | ---------------- |
| gc-tab-remove-active       | 删除当前激活 tab               | active 指针按可裁定规则迁移（如右邻优先/末位兜底），不悬空                  | 否     | 激活视图自动切换 |
| gc-tab-remove-last         | 删除最后一个 tab               | 视图集合清空时行为可裁定（禁止删空兜底或空态），不留无效 activeStatePath 值 | 否     | 空态或禁删提示   |
| gc-aggregate-missing-field | kanban 聚合字段路径缺失/非数值 | 聚合显示兜底（如 `-` 或省略），一次性 dev warn，不抛错白屏                  | 是     | 列头显示兜底符   |
| gc-aggregate-empty-column  | 空列（零卡片）聚合             | Count=0 / Sum 等显示兜底，不 NaN                                            | 否     | `0` 或 `-`       |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**——renderer 定义字段为保护区域（plan-first），契约变更须先红后绿单测锁定（沿 G-F/G-B1/G-A/G-B2/G-B3 五个先例的 test-first 模式）；Proof 项先于 Fix 项。

## Execution Plan

> 顺序 Phase。Phase 1 契约裁定先行（Phase 2/3 全部依赖其断言清单）；Phase 4 文档与回写收口。

### Phase 1 - 契约设计与维度终态裁定

Status: completed
Targets: 本计划 Decision 注记、`docs/references/renderer-interfaces.md`（草案条目）

- Item Types: `Decision | Proof | Fix`

- [x] Proof——tabs 管理面 inventory 实测落字：`tabs.tsx` 全量现状（items 渲染链/句柄方法/valueStatePath 写入链）+ `closable`/`draggable`/`addable` 三姊妹死声明复核（声明点与定义登记 vs 实现零命中）+ 回写 ⑥ 五条不可达面 live 复核；AMIS tabs `closable`/`addable`/`draggable` 语义对照（amis-baseline-matrix 口径）
- [x] Decision——视图集合管理载体裁定（候选 ①tabs 组件句柄方法族（`addTab`/`removeTab`/`renameTab`/`moveTab`）+ schema 事件面；②scope 驱动动态 items（G-B1 command-palette `source` 动态轨先例）；③runtime 字段族）——含字段命名、active 指针迁移规则（Failure Paths gc-tab-remove-active/last 终态化）、与 `valueStatePath` 三层状态机的写侧对接落字
- [x] Decision——三姊妹死声明族（`closable`/`draggable`/`addable`）分轨处置裁定（逐字段接线或废弃告警，G-A dead config 分轨先例；接线项的删除确认/破坏性确认沿 R2 summary「确认顺序 `[secondary, primary]`」规范）
- [x] Decision——溢出收纳（overflow 收纳菜单）立项与否（横向滚动现状 + 复用 DropdownMenu 消费成本 vs 显式 deferred 落字）
- [x] Decision——kanban 列头聚合载体裁定（候选 ①`columnAggregate` 字段族（`field` + `fn: sum|avg|min|max|count` + `label`，默认卡面数据源聚合）；②per-column 绑定 region 泛化（G-A 观察面一并解））+ 聚合数据源口径（client 全量 vs server 透传边界）落字
- [x] Decision——「视图类型↔peek 形态联动」终态裁定（立项建模 or `Deferred But Adjudicated`）
- [x] Decision——「个人视图偏好存储层」终态裁定（立项 or 维持 deferred；若立项须落字 flux-core/renderer 域边界）

Exit Criteria:

- [x] 六项 Decision 与一项 Proof 全部落字本计划（契约断言清单可清单化：管理句柄矩阵 + active 迁移矩阵 + 聚合函数矩阵 + 兼容矩阵；死声明族逐字段分轨结论含在内）
- [x] `docs/references/renderer-interfaces.md` 契约草案条目成形（Protected Areas owner evidence 就位——见文末「§Tabs View Collection Management Contract」「§Kanban Column Aggregate Contract」两节）
- [x] 若触 `ui/src/index.ts` 或 `packages/flux-core/src/`：ask-first/plan-first 理由已落字且未在门禁前改码（默认裁定均不触——live 复核确认 ui `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`/`Button`/`DropdownMenu` 既有导出足以承载全部 affordance；kanban 聚合为 scheduling 包内纯函数 helper，零 flux-core 改动）

#### Phase 1 Decision Record（2026-08-31 执行时落字，全部行号经 live 复核）

**Proof——inventory live 复核**：

- **三姊妹死声明族确认**：`TabsSchema.closable`/`draggable`/`addable`（`schemas.ts:169-174`）+ `TabsItemSchema.closable`（item 级姊妹声明，`schemas.ts:137-138`）类型面全声明；定义登记 `{ key: 'closable'|'draggable'|'addable', kind: 'prop', valueType: 'boolean' }`（`basic-renderer-definitions.ts:639-641`）；`tabs.tsx` 对 `closable`/`onClose`/`removeItem`/`draggable`/`addable` 实现**零命中**（grep EXIT 1，live 复核）——「接口已出现、语义未落地」（guide Rule 11）。
- **items 渲染链**：`schemaProps.items`（resolved props，表达式源可用——`tabs-candidate-fix.test.tsx` `items: '${ui.tabItems}'` 先例）→ `tabsList`（每 item 一个 `TabsTrigger`，`tabs.tsx:330-354`）+ `tabsPanels`（每 item 一个 `TabsContent` + keepMounted 分支，`:358-399`）。
- **句柄现状**：仅 `setValue`/`getValue`（`tabs.tsx:214-246`，`hasMethod`/`listMethods` 同步白名单）——集合变更句柄零个。
- **valueStatePath 写入链**：`useOwnedAxisValue`（`interaction-owner.ts:7-59`）——scope ownership 经 `useScopeSelector` 订阅 + `renderScope.update(statePath, next)` 写回（`:50-52`）；candidate-fix effect（`tabs.tsx:176-187`）在 active 值从 items 消失时按 keep → nearest-right → nearest-left → empty 纠正，controlled ownership 豁免。
- **溢出现状**：移动端横向滚动（`nop-scrollbar-hide overflow-x-auto`，`tabs.tsx:324-328`）+ 激活 trigger `scrollIntoView` 跟随（`:258-268`）；桌面端无溢出 affordance。
- **回写 ⑥ 五条不可达面 live 复核维持**：运行时新增视图分支 / tab 拖拽重排 / 溢出收纳动态化 / 三态动态切换生效——tabs 零 schema 表达；kanban per-column 列头聚合——`columnHeader`/`columnHeaderToolbar` 全列共享 SchemaInput region（`kanban.types.ts:48-49`），聚合实现零命中。
- **AMIS 口径对照**：amis tabs `closable`（tab 可关闭）/`addable`（可新增）/`draggable`（可拖拽排序）= 管理侧 UI affordance 三开关，与三死声明一一对应。
- **存量消费面复核**：playground 现有 schema 零 tabs `closable`/`draggable`/`addable` 声明（`m5-showcase-app.json:69` 的 `closable: true` 属 `notice-bar` 非 tabs）——接线零存量消费回归面。

**Decision 1——视图集合管理载体 = 候选 ① 组件句柄方法族 + 受管集合（kanban 所有权先例收窄变体）+ schema 事件面**：

- 候选 ②（纯 scope 驱动动态 items）否决理由：items 表达式读侧已可用，但**写侧零通道**——renderer 无法写回任意表达式源；✕/+ affordance 必须能变更集合，纯读侧动态化不承载管理语义。候选 ② 的合理内核（scope 共享集合）以 `itemsOwnership:'scope'` + `itemsStatePath` 并入候选 ①。
- 候选 ③（runtime 字段族）否决理由：引入 flux-core 改动（Out Of Scope 默认不触），且 prop/event/handle 既有通道已足够表达。
- 采纳形态：四句柄 `addTab`/`removeTab`/`renameTab`/`moveTab`（kanban `addCard`/`removeCard`/`moveCard` 先例）+ 四事件 `onTabAdd`/`onTabClose`/`onTabRename`/`onTabMove`（统一变更通道：UI affordance 与句柄同源，kanban 22-12 先例）。
- 新字段：`itemsOwnership?: 'local' | 'controlled' | 'scope'`（缺省 `'local'`）+ `itemsStatePath?: string`（scope 轨读写路径）——kanban `kanbanOwnership`/`kanbanStatePath` 命名先例。
- 集合存储语义（受管集合）：
  - 无管理活动（三姊妹全 falsy 且句柄零调用）→ 渲染源 = resolved `items` 逐字节（零回归）。
  - `'local'`：首次管理变更（UI 或句柄）把当时 resolved items 克隆进内部受管集合，此后渲染源 = 受管集合；schema items 后续变化**不再 re-seed**。与 kanban「新数据赢」re-seed 的差异理由：tabs items 经表达式逐渲染重求值产生新数组 identity，引用比较 re-seed 会把任意无关 scope 更新放大为集合重置、冲掉用户管理操作；视图集合是会话态配置（非服务端数据流）。
  - `'scope'` + `itemsStatePath`：渲染源 = scope 值 ?? resolved items（`useScopeSelector` 订阅该 path）；管理变更写回 `scope.update(itemsStatePath, next)`；首次变更时 path 未设值则以当时 resolved items 为基线克隆写入。
  - `'controlled'`：句柄返回 `{ok:false}`、UI affordance inert（点击零操作）、不派发事件不做 active 迁移（kanban controlled mutation-drop 先例 `kanban-board.tsx:55-59` 口径）。
- **Failure Paths 终态化**：
  - gc-tab-remove-active：删除激活 tab → active 指针按 `resolveCandidateValue` 既有规则迁移（nearest-right → nearest-left），与 candidate-fix 同规则同函数复用。
  - gc-tab-remove-last：**禁止删空兜底**——集合仅剩一项时 `removeTab` 拒绝（`{ok:false, error:'last-tab'}`）+ 一次性 dev warn；UI ✕ 在最后一项上不渲染。理由：空集使 valueStatePath 三层状态机 active 指针悬空（无效 activeStatePath 值）；表达式把 items 清空的形态不受此守卫影响（candidate-fix 已承载，守卫只作用于组件自身 removeTab 通道）。
- **与 valueStatePath 三层状态机写侧对接**：active 迁移经 `ownedAxis.setValue(candidate)` 走既有 valueStatePath 写链（scope ownership → `scope.update`）；add/rename/move 不改写 active 值（新增项不自动激活、重排跟随值语义——显式激活由作者经 onTabAdd 链 + setValue 驱动，缺省零惊喜）。
- **句柄契约**（`componentCapabilityContracts` 登记）：`addTab({ item, index? })`（item 含 `title`；value 缺省自动生成 `tab-<Date.now()>`；index 越界按追加；成功 `{ok:true, data:{value,index}}`）；`removeTab({ value })`（unknown value → `{ok:false}`；末位守卫如上）；`renameTab({ value, title })`（title 须非空字符串；unknown value → `{ok:false}`）；`moveTab({ value, toIndex })`（toIndex 钳制 `[0, len-1]`；unknown value → `{ok:false}`）。
- **事件 payload**（CX-10 ctx 合规：`{ event, evaluationBindings, scope }` 第二参，kanban `eventCtx` 先例）：`onTabAdd` `{ type:'tabs:tab-add', item, index }`；`onTabClose` `{ type:'tabs:tab-close', value, index, item, nextActiveValue }`；`onTabRename` `{ type:'tabs:tab-rename', value, index, title, item }`；`onTabMove` `{ type:'tabs:tab-move', value, fromIndex, toIndex }`。

**Decision 2——三姊妹死声明族分轨 = 三字段全部接线（G-A 分轨先例「接线」轨）**：

- `closable`（tabs 级缺省 + `TabsItemSchema.closable` per-tab 覆盖，缺省继承 tabs 级）：✕ affordance 挂每 tab trigger 内（`data-slot="tabs-trigger-close"`，stopPropagation 防切换），点击走 removeTab 通道；最后一项不渲染 ✕（末位守卫 UI 面）。**删除确认裁定：内建零确认**（AMIS 同口径；视图集合为会话态、破坏性确认由作者经 onTabClose 链 + host confirm action 自组；R2 summary `[secondary, primary]` 确认顺序规范适用于未来若引入内建确认——本计划不引入）。
- `draggable`：tab trigger 原生 HTML5 DnD（`draggable` attribute + dragstart/dragover/drop），落位走 moveTab 通道；键盘重排不内建（G-B2 keyboard 通道为 schema 级解法）。
- `addable`：tabs list 尾部 `+` affordance（`data-slot="tabs-trigger-add"`，ui Button ghost icon），点击走 addTab 通道（缺省 title 走 i18n `flux.tabs.newTab`；不自动激活）。
- 兼容裁定：三字段全 falsy（现状零声明）→ 零 affordance 零行为变化（DOM 等价回归锁定）；`onClose` 不新增别名（amis onClose 语义由 `onTabClose` 承载）。

**Decision 3——溢出收纳 = 显式 deferred（`optimization candidate`）**：横向滚动现状 + 移动端 scrollIntoView 跟随已承载「active tab 恒可见」主语义；overflow 测量（ResizeObserver + 隐藏集合 + DropdownMenu 收纳）消费成本高于本计划增量价值；无复刻页在等消费。Successor: yes（overflow 收纳菜单——复用 ui DropdownMenu；触发条件：出现多视图溢出真实消费页）。

**Decision 4——kanban 列头聚合 = 候选 ① `columnAggregate` 字段族**：

- 候选 ②（per-column 绑定 region 泛化）否决理由：region 参数化重构（G-A 观察面本体）成本高，而聚合最常见形态（Notion Count/Percent 族）只需「板级声明 × 列级求值」——一个声明、每列各自聚合自身卡片即得 per-column 值。
- 采纳：`columnAggregate?: { field?: string; fn: 'sum'|'avg'|'min'|'max'|'count'; label?: string }`（板级单声明）；列头默认分支内嵌 `data-slot="kanban-column-aggregate"`（`{label ?? fn}: {value}` 形态、计数徽章旁）；`columnHeader` region 覆盖时不渲染（region 整头接管为既有行为，聚合不双渲染）。
- **聚合数据源口径 = client 列内全量（当前过滤可见卡片集）**：与列头计数徽章同源（filteredCards），过滤联动语义一致；字段值经 `Number()` 强转、`NaN`/缺失跳过；有效值集空时 sum/avg/min/max → `'-'` 兜底 + 板级一次性 dev warn（gc-aggregate-missing-field）；`count` 不依赖 field（恒卡片数）→ 空列 `0`（gc-aggregate-empty-column）；不 NaN 不抛错不白屏。server 透传边界：不做（聚合属客户端形态语义；server 预计算维持复刻页 mock 先例可达，非 renderer 缺口）。
- 纯函数 helper `computeColumnAggregate` 抽离（`kanban-aggregate.ts`）——helper 单测 + 渲染层集成测试双层。

**Decision 5——「视图类型↔peek 形态联动」= `Deferred But Adjudicated`**：联动规则本体是作者侧创作约定（table/board/list→side、gallery/calendar→center），非 runtime 机制缺口——P5b 已证「语境决定载体」静态表达承载主语义；联动建模需 peek 载体选择语义进入 schema 词汇，超出本计划 tabs/kanban 载体边界。Successor Required: no（未来 peek 语义件立项时随行裁定）。

**Decision 6——「个人视图偏好存储层」= `Deferred But Adjudicated`（维持 optimization candidate）**：会话级偏好已可达（valueStatePath + 本计划 itemsStatePath 把 items 轴也补齐）；跨会话持久化需 schema 外存储层，INV-1 口径下须 host 注入 adapter（`CountDownStorage` 先例）——属 host 契约扩展非 renderer 字段面；无消费页在等。Successor Required: yes（候选形态：RendererEnv 注入 preferences storage adapter + tabs `preferencesKey` 字段族，独立 plan 候选归 D1 输入池）；域边界落字：若立项走 RendererEnv 扩展流程（renderer-env.md），renderer 域零 localStorage 直触——本计划不改 flux-core。

### Phase 2 - tabs 视图集合管理动态化实现（先红后绿）

Status: completed
Targets: `packages/flux-renderers-basic/src/tabs.tsx`、`schemas.ts`、`basic-renderer-definitions.ts`、`__tests__/`

- Item Types: `Fix | Proof`

- [x] Proof——契约断言清单测试先行（红）：管理句柄矩阵（add/remove/rename/move 各自的前置校验/成功路径/事件派发）+ active 迁移矩阵（删激活/删末位/删中间）+ `closable` 兼容矩阵（无声明零回归快照等价）+ 事件派发 CX-10 ctx 合规（`check:audit-event-dispatch-ctx` 门禁零红）——`__tests__/tabs-view-management.test.tsx` 25 条，落地前 red 实测 24 failed（实现零命中阶段）
- [x] Fix——按 Phase 1 裁定载体实现视图集合管理（定义字段登记 + schema 校验同步，`check:renderer-definition-fields-only` 门禁零新增红）
- [x] Proof——`closable`/`draggable`/`addable` 按 Phase 1 分轨裁定执行（接线项走 Phase 2 先红后绿；废弃项走废弃告警 + 回归锁定；逐字段落字结论）——三字段全部接线（Decision 2），零废弃项；`TabsItemSchema.closable` item 级覆盖同步接线（`schemas.ts` 注释更新）
- [x] Proof——溢出收纳按裁定执行（立项则实现 + 测试；deferred 则登记 `Deferred But Adjudicated` 落字）——按 Decision 3 落 `Deferred But Adjudicated` 区（见该区终态化条目）

Exit Criteria:

- [x] 先红后绿单测全绿（句柄/迁移/兼容全矩阵）——`tabs-view-management.test.tsx` 25 条全绿 + basic 包全量 591 条全绿（58 files）
- [x] 受影响包局部 typecheck/test 通过——`flux-renderers-basic` `tsc --noEmit` 零错
- [x] `check:renderer-definition-fields-only` 与 `check:audit-event-dispatch-ctx` 门禁零新增红（另核 `check:finite-prop-contracts`/`check:i18n-keys`/`check:schema-prop-coverage`/`check:oversized-code-files` 均零新增红——oversized 初触 ERROR 后按责任拆分收敛：tabs.tsx 666 行 + 新 `tabs-utils.tsx` 135 行 + 新 `tabs-renderer-definition.ts` 189 行，definitions 文件回落 544 行）

### Phase 3 - kanban 列头聚合实现 + 两维度裁定执行（先红后绿）

Status: completed
Targets: `packages/flux-renderers-scheduling/src/kanban/`（`kanban.types.ts`、`kanban-column-header.tsx`、`kanban-column.tsx`）、`__tests__/`

- Item Types: `Fix | Proof`

- [x] Proof——聚合契约断言清单测试先行（红）：函数矩阵（sum/avg/min/max/count）+ 数据源口径（缺失字段 gc-aggregate-missing-field/空列 gc-aggregate-empty-column 兜底）+ 无 `columnAggregate` 声明零回归快照等价 + per-column 隔离（他列零影响）——落地前 red 实测（`kanban-aggregate.js` 不存在 + aggregate 渲染零命中）
- [x] Fix——按 Phase 1 裁定载体实现 kanban per-column 聚合（字段登记 + schema 校验同步 + 定义门禁零新增红）——`kanban-aggregate.ts` 纯函数 helper + `KanbanSchema.columnAggregate` + `scheduling-renderer-definitions.ts` 字段/propContract 登记 + board→column→header 传递（region 覆盖时抑制）；无效 fn 板级 dev warn（kanban-aggregate-invalid）、缺值兜底板级一次性 dev warn（kanban-aggregate-missing-field）
- [x] Proof——「peek 形态联动」「偏好存储层」两维度按 Phase 1 裁定执行落字（立项项实现先红后绿；deferred 项登记 `Deferred But Adjudicated` 含分类与理由）——双 deferred 终态化已落字本计划该区（Decision 5/6）

Exit Criteria:

- [x] 聚合先红后绿单测全绿（函数/兜底/兼容全矩阵）——`kanban-aggregate.test.ts` 9 条 + `kanban-column-aggregate.test.tsx` 5 条 + scheduling 包全量 943 条全绿（86 files）
- [x] 两维度裁定执行落字本计划（Deferred 区或实现落地，无静默跳过）——见 `Deferred But Adjudicated` 区终态化
- [x] 受影响包局部 typecheck/test 通过——`flux-renderers-scheduling` `tsc --noEmit` 零错；oversized 门禁初触 ERROR（kanban-board.tsx 704 行）后按责任拆分收敛（新 `hooks/use-kanban-column-aggregate.ts`），全门禁零新增红

### Phase 4 - owner docs 对齐 + C2 回写 + 收口

Status: completed
Targets: `docs/references/renderer-interfaces.md`、`flux-guide/`、`docs/analysis/ui-review/C2-capability-gaps.md`、`docs/logs/`

- Item Types: `Proof`

- [x] `docs/references/renderer-interfaces.md` 契约条目终稿（Status: landed 口径，沿 G-A/G-B3 先例）——§Tabs View Collection Management Contract + §Kanban Column Aggregate Contract 双节 landed（live-verified 2026-08-31，含 aria-hidden close affordance 键盘通道说明）
- [x] flux-guide 对应条目（tabs 视图管理 / kanban 列聚合 作者条目）——`08-tabs-state.md` 新增 items 轴节 + `design-patterns/tabs.md` §视图集合管理 + `design-patterns/kanban.md` §列头聚合与字段表 `columnAggregate` 条目
- [x] C2 回写（追加式，初版裁决表零改动）：G-C 行落「已产品化」终态证据 + 两维度裁定结论 + styling-system 核查结论落字——回写 ⑭（append-only）
- [x] styling-system 核查（marker/样式契约对齐核查，零改动则落字确认）——tabs affordance 为 widget 式内建交互件（`data-slot="tabs-trigger-close"`/`tabs-trigger-add` + ui 视觉类，tabs 非容器类 layout renderer，内部 chrome 自带样式为先例口径）；kanban 聚合为列头内嵌 `data-slot="kanban-column-aggregate"` 文案节点；零 BEM、根 marker 零变化、无布局 marker 违约——结论：对齐，styling-system 文档零改动

Exit Criteria:

- [x] owner docs 全部对齐 live baseline（文档内容与 live 行为一致）
- [x] C2 回写追加落字（append-only，初版零删改）
- [x] daily log 收口记录落字

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh session 独立子 agent `ses_faaff8951ffe8DVR1xGVWNGj5J`
- Verdict: R1 `pass-with-minors` 零 Blocker/零 Major，共识达成
- Rounds: 1
- Findings addressed: 4 Minor 随共识修复——Exit Criteria 计数勘误（七项→六项）+ 条件 Fix 项并入 Decision；死声明盘点扩为三姊妹族（`closable`/`draggable`/`addable`，`schemas.ts:170/172/174` + definitions `:640-641`，live 复核确认）；Phase 4 Item Types 纯化为 `Proof`。

## Deferred But Adjudicated

> Phase 1 裁定终态（2026-08-31 落字，三维度全部显式裁定，无静默跳过）。

### 溢出收纳（overflow 收纳菜单）

- Classification: `optimization candidate`（显式 deferred——Phase 1 Decision 3 裁定不立项）
- Why Not Blocking Closure: 横向滚动现状（`tabs.tsx` `nop-scrollbar-hide overflow-x-auto`）+ 移动端激活 trigger `scrollIntoView` 跟随已承载「active tab 恒可见」主语义；overflow 测量（ResizeObserver + 隐藏集合 + DropdownMenu 收纳）消费成本高于本计划增量价值；无复刻页在等消费（回写 ⑥ 现状登记，I13 余量）。
- Successor Required: yes
- Successor Path: overflow 收纳菜单（复用 `@nop-chaos/ui` DropdownMenu）；触发条件 = 出现多视图溢出的真实消费页；候选落 D1 输入池。

### 视图类型↔peek 形态联动建模

- Classification: `Deferred But Adjudicated`（Phase 1 Decision 5 裁定不立项；回写 ⑥ 现状为静态表达维持，无复刻页在等消费可作候选理由）
- Why Not Blocking Closure: 联动规则本体（table/board/list→side、gallery/calendar→center）是作者侧创作约定而非 runtime 机制缺口——P5b 已证「语境决定载体」静态表达承载主语义；联动建模需 peek 载体选择语义（openDrawer/openDialog 分派规则）进入 schema 词汇，超出本计划 tabs/kanban 载体边界。
- Successor Required: no（未来 peek 语义件立项时随行裁定）

### 个人视图偏好存储层

- Classification: `optimization candidate`（维持回写 ⑥ 候选 1 现状；Phase 1 Decision 6 裁定不立项）
- Why Not Blocking Closure: 会话级偏好已可达（`valueStatePath` + 本计划新增 `itemsStatePath` 把 items 轴也补齐）；跨会话持久化需 schema 外存储层，INV-1 口径下须 host 注入 adapter（`CountDownStorage` 先例）——属 host 契约扩展非 renderer 字段面；无消费页在等。
- Successor Required: yes
- Successor Path: 候选形态 = RendererEnv 注入 preferences storage adapter + tabs `preferencesKey` 字段族（renderer 域零 localStorage 直触，本计划不改 flux-core）；独立 plan 候选归 D1 输入池。

## Non-Blocking Follow-ups

- 既有复刻页视图管理语义件化 retrofit（notion-database 五视图静态分支等——复刻页迭代时采纳）
- tabs 组件句柄族与 G-B1 command-palette surface 句柄的命名对齐治理（跨 surface 句柄一致性）
- G-D 网格编辑语义件族（独立 plan N=2，后续轮次）

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（`closable`/`draggable`/`addable` 死声明族按裁定终态化——三字段全部接线 + `TabsItemSchema.closable` item 级覆盖，兼容矩阵锁定零声明零行为变化）
- [x] 所有 in-scope confirmed contract drifts 已收敛（回写 ⑥ 五条不可达面逐条落终态：I2 运行时新增视图分支 = addTab 通道；I13 tab 重排 = draggable+moveTab；I13 溢出收纳 = 显式 deferred 登记；三态动态切换 = itemsOwnership 轨；kanban per-column 聚合 = columnAggregate 语义件）
- [x] 行为/契约结果已达成（视图管理动态化 + kanban 聚合语义件可用且有测试锁定——39 条先红后绿单测）
- [x] 必要 focused verification 已完成（先红后绿全矩阵——tabs 句柄/迁移/兼容矩阵 + kanban 函数/兜底/隔离矩阵）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（溢出收纳/peek 联动/偏好存储层三维度均为起草期登记的缺口候选，经 Phase 1 显式裁定终态化，非 live defect）
- [x] 受影响的 owner docs 已同步到 live baseline，或明确写明 No owner-doc update required（renderer-interfaces.md 两节 landed + flux-guide 三处 + C2 回写 ⑭；styling-system 核查零改动已落字）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（fresh session 独立子 agent `ses_faa3ff7d5ffeC7F8BNMM9sdLtI` R1 `ISSUES`（1 Blocker：Closure Gates 段重复未勾选副本——随共识修复；1 Minor：Follow-up 占位符——随共识修复）→ R2 scoped re-audit **APPROVED**；证据见 Closure Audit Evidence）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（零新增命中，超出既有登记基线即 red——exit 0；oversized WARN 列表与 HEAD diff 零新增条目，tabs.tsx 拆分后 462 行退出清单；`check:finite-prop-contracts` 门禁 contractFile 因 tabs 定义文件拆分同步登记至 `tabs-renderer-definition.ts`）

## Closure

Status Note: 2026-08-31 执行完毕并关闭。四 Phase 全 completed：Phase 1 契约裁定（inventory live 复核 + 六项 Decision 落字 Decision Record 区）；Phase 2 tabs 视图集合管理动态化（25 条先红后绿：句柄矩阵/active 迁移矩阵/死声明接线兼容矩阵/所有权轴；`tabs.tsx` 462 行 + `tabs-view-management.ts` 271 行 + `tabs-utils.tsx` 135 行 + `tabs-renderer-definition.ts` 187 行责任拆分）；Phase 3 kanban per-column 列头聚合（14 条先红后绿：`kanban-aggregate.test.ts` 纯函数矩阵 + `kanban-column-aggregate.test.tsx` 渲染集成；`use-kanban-column-aggregate.ts` 抽取）+ 两维度显式 deferred 终态化；Phase 4 owner docs（renderer-interfaces.md 两节 landed + flux-guide 三处 + C2 回写 ⑭ append-only + styling-system 核查零改动）。全量验证 full-green verification：typecheck/build/lint 37/37、test 68/68 tasks、check exit 0 零新增红。

Closure Audit Evidence:

- Auditor / Agent: fresh session 独立子 agent `ses_faa3ff7d5ffeC7F8BNMM9sdLtI`（R1 `ISSUES` 1 Blocker + 1 Minor，实体面全部验证通过——39 条单测独立重跑全绿、四门禁 exit 0、C2 回写 ⑭ append-only +14/−0、Protected Areas 零命中、roadmap/log 自洽）→ Blocker（Closure Gates 段重复：模板位未勾选副本 + 操作位已勾选副本并存）与 Minor（Closure `Follow-up:` 占位符残留）随共识修复 → `ses_faa3ff7d5ffeC7F8BNMM9sdLtI` R2 scoped re-audit **APPROVED** 零 Blocker/零 Major。
- Evidence: task id `ses_faa3ff7d5ffeC7F8BNMM9sdLtI`（本会话内 fresh 子 agent）；独立重跑 basic 591/591（58 files）+ scheduling 943/943（86 files）+ targeted 32/32 & 14/14；`pnpm typecheck` 37/37、`pnpm check` exit 0、fields-only/finite-prop-contracts/event-dispatch-ctx 三门禁 0；oversized 195W/2E-exempt 与登记基线一致零新增；C2 `git diff` +14/−0 append-only；`packages/flux-core/src/` 与 `packages/ui/src/index.ts` 零改动；本 plan closure 记录同步落字 `docs/logs/2026/08-31.md`（G-C 执行条目，full-green verification 显式登记）。

Follow-up:

- 无 plan-owned 剩余工作；non-blocking follow-up 见上方 `Non-Blocking Follow-ups` 区（复刻页 retrofit / 句柄命名治理 / G-D 独立 plan N=2）。
