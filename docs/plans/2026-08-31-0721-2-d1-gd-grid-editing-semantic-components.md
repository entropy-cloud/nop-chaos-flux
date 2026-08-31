# D1-8 G-D 网格编辑深度语义件族产品化（table 分组聚合 + 单元格原位编辑 + 三维度终态裁定）

> Plan Status: active（2026-08-31 draft review 通过转 active：R1 fresh session `ses_faaff4024ffeo6Bbf4ER06la5v` `fail` 1 Major（quickEdit 通道未盘点）+ 5 Minor → 全部修复 → R2 scoped re-audit fresh session `ses_faaf4bb6efferwcH2ENPxuMoLK` `pass-with-minors` 零 Blocker/零 Major，1 Minor 计数勘误 + 1 typo 随共识修复）
> Mission: ui-review
> Work Item: D1. 能力缺口产品化 plans —— G-D 网格编辑深度语义件族（C2 §2 预清单第 6 位「G-B3/G-C/G-D 语义件族」第三成员；依赖 G-B2+G-B3 双前置已 `done` 故就位条件满足；P6 回写（回写 ⑦）已完成故定形条件满足）
> Last Reviewed: 2026-08-31
> Source: roadmap `docs/backlog/ui-review-roadmap.md`（D1 条目 + Phase Details D1 + Cross-Cutting 4/5）；C2 裁决文档 `docs/analysis/ui-review/C2-capability-gaps.md`（初版裁决表 G-D 行 + §2 预清单 6/6 + 回写 ⑦ P6b 终态实测 + 回写 ⑤⑥ 关联素材）；`docs/context/ai-autonomy-policy.md` Protected Areas（renderer 定义字段 plan-first / flux-core plan-first / 样式契约 plan-first / `ui/src/index.ts` ask-first）
> Related: `docs/plans/2026-08-30-2312-1-d1-gb2-keyboard-navigation-framework.md`（Decision 4 fill-handle successor 义务 + Decision 5① roving helper「G-D 立项时再抽取」边界登记——两项重评义务由本计划承载）；`docs/plans/2026-08-30-2312-2-d1-gb3-batch-bar-semantic-component.md`（回写 ⑦ 候选 2「范围选区 + fill handle」归本计划的移交源头；`rowSelection`/`selectAllMode` 既有契约面）；`docs/plans/2026-08-31-0721-1-d1-gc-multiview-database-semantic-components.md`（同批起草；本计划（N=2）后于 G-C plan（N=1）执行）
> 执行顺序约束：本计划（N=2）在 G-C plan（N=1）之后执行。两计划代码面不相交（本计划 `flux-renderers-data`；G-C `flux-renderers-basic`/`flux-renderers-scheduling`），共写面为 `docs/references/renderer-interfaces.md`、flux-guide 条目与 C2 回写追加区——顺序执行消除文档冲突；C2 回写编号按实际执行顺序落字。

## Purpose

把 C2 裁决为 **G-D（网格编辑深度：单元格编辑器矩阵/列菜单/分组/行高，L2）** 的缺口产品化：为 data 域 `table` renderer 补齐**分组/聚合渲染语义**与**单元格原位编辑语义**（同格双态 + 型别分派编辑器矩阵），消解回写 ⑦ 终判维持的零承载面；并同 plan 显式裁定「fill-handle 编辑器选区模型」（G-B2 Decision 4 successor 重评义务）、「roving helper 抽取」（G-B2 Decision 5① 边界登记的 G-D 立项触发条件）、「动态列模型」三维度的终态（立项或 deferred，不得静默）。

## Current Baseline

- **table 分组/聚合渲染语义零实现**（本计划起草期 live 实测）：`packages/flux-renderers-data/src/table-renderer.tsx`（668 行）grep `group`/`aggregate` 仅命中 `colgroup`（列宽 col 元素），无分组头行/组内聚合渲染语义（回写 ⑦ 候选 1 并入项确认）。Airtable 复刻页的分组/聚合以「mock 服务端预聚合（`groupAirtableRecords`）+ schema loop 分支」模拟（P6a/P6b 降级姿势，e2e 03/06/08 锁定）——产品化后该姿势可退役为 retrofit 候选。
- **单元格原位编辑：`quickEdit` 通道已在库，深度缺口在其上**（本计划起草期 live 实测修正回写 ⑦ 口径）：data 域 table 已有列声明式就地编辑通道——`TableColumnSchema.quickEdit?: boolean | { mode: 'dialog'|'inline'; body?: SchemaInput; saveImmediately }`（`packages/flux-renderers-data/src/schemas.ts:89` + `TableColumnQuickEditConfig` `:16-20`，region 接线 `:73`），table 级 `quickSaveAction`/`quickSaveItemAction`（`schemas.ts:230-231`），实现于 `src/table-renderer/table-quick-edit-cell.tsx` + `table-quick-edit-controller.ts` + `use-row-quick-edit-draft.tsx`（行草稿 scope/dirty 跟踪/保存/blur 保存/保存失败 notify/行保存条列 `__row_save_bar__`），作者文档 `flux-guide/design-patterns/crud.md` §6。**真实剩余缺口（本计划对象）**：①同格双态缺失——单元格级「导航态↔编辑态」原地翻转状态机（quickEdit 现状为常驻编辑控件或 dialog，无按格进入/提交/取消的格级状态机）；②型别分派编辑器矩阵缺失——`quickEdit.body` 须逐列手写编辑控件，无按列型别自动分派的编辑器矩阵；③键盘进入编辑通道缺失（方向键漫游 + Enter/F2 进入，P6b 十五键位终态表锁定零通道）。Phase 1 载体裁定的候选空间必须含「演进 quickEdit / 与 quickEdit 共存分层 / 替换」三向，不得无视既有通道另起平行契约。
- **table 选区域已产品化**（本计划的直接前置）：G-F optionRow（行选中态）+ G-B2 `rowSelection.modifierSelect`（⇧click 范围/meta 切换/⌘A）+ G-B3 `selectAllMode`（'page'/'all'）+ `batch-bar` 语义件均已落地并有全矩阵单测——本计划在其上加**编辑与分组**维度，选区契约零重构。
- **键盘导航层先例在库**（回写 ⑦ G-B2 正面素材）：table 行 keydown 中继已有 renderer 层先例（`packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:193-209` 行 keydown 中继，`:224-225` `onKeyDown`/`tabIndex`，声明 `onRowClick` 后行 `tabIndex=0` + Enter/Space 内建中继）；P6b 十五键位终态表锁定方向键漫游/编辑器进入等键位零通道——缺口收敛在格级键盘状态机与编辑态的接线（keyboard 绑定通道 G-B2 已落地），非事件通道缺失。
- **G-B2 Decision 4 successor 义务（本计划必须处置）**：「范围选区 + fill handle 编辑器选区模型」deferred 时登记 successor 为「D1 输入池 / G-D 语义件族 plan（依赖就位后重评）」——G-B2+G-B3 双前置已 `done`，重评义务触发。
- **G-B2 Decision 5① 边界登记（本计划立项即触发）**：共享 roving helper「≥2 renderer 需要网格键盘导航时（如 G-D 立项）再抽取，届时 kanban ad-hoc 实现（`kanban-column.tsx:270,296` roving tabindex）回归采纳一并评估」。
- **G-B3 观察面移交（回写 ⑦ 候选 2）**：「范围选区 + fill handle」是编辑器坐标选区模型（选区锚点 + 等差填充拖拽原语 + 键盘选区扩展），与 G-B2 行级修饰键选区分列——归本计划裁定。
- **动态列模型零承载**（回写 ⑦）：运行时隐藏/换型别/插删列零通道；既有 `columnSettings:{enabled}` 为勾选显隐（回写 ③ 实测原生可达），非运行时列集合变更。
- **`@nop-chaos/ui` 预期零改动**：单元格编辑器矩阵映射既有 input 族 renderer（text/select/date/checkbox 等），不新增 `ui/src/index.ts` 导出（ask-first 门不触发）。

## Goals

- table **分组/聚合渲染语义**落地（Phase 1 裁定字段族与数据口径）：分组头行 + 组内聚合函数族（Sum/Avg/Min/Max/Count）+ 分组切换的表达通道（client 全量分组 vs server 透传边界）。
- table **单元格原位编辑深度语义**落地（Phase 1 裁定）：同格双态（导航态/编辑态原地翻转）+ 型别分派编辑器矩阵 + 键盘进入编辑通道——在既有 `quickEdit` 通道之上演进（载体候选含「演进 quickEdit / 共存分层 / 替换」三向，Phase 1 裁定），复用其行草稿/保存通道（`quickSaveItemAction`），不另起平行契约。
- 「fill-handle 编辑器选区模型」「roving helper 抽取」「动态列模型」三维度显式终态裁定落字（立项实现或 `Deferred But Adjudicated`，不得静默跳过；G-B2/G-B3 的 successor 义务就此闭环）。
- C2 回写（追加式）+ owner docs 对齐（renderer-interfaces.md / flux-guide）。

## Non-Goals

- **form 域 `input-table`/array-field 改动**：form 域整行编辑契约维持（两域分界见 Baseline）。
- **G-C 多视图语义件**（tabs/kanban 域）——独立 plan（N=1），本计划 Non-Goal 引用。
- **既有复刻页 retrofit**：airtable-grid 等复刻页维持历史 plan 产物（mock 预聚合姿势退役为 retrofit 候选，登记 Follow-up）。
- **spreadsheet-renderers 报表域**：电子表格编辑器（`packages/spreadsheet-renderers/`）为报表设计器域独立实现，与 schema 驱动 table 的原位编辑语义分轨。
- **C2 初版 G-D 行的「列菜单」「行高」两子能力**：live 复核显示两者 schema 层近似可达（列设置/排序/固定经 `columnSettings` 与列头菜单形态已有承载先例——回写 ③⑦；行高四档经 className 表达式状态驱动实测可达——P6b A9/回写 ⑦），本计划不立项，归 D1 输入池按 C2 后续轮次评估（显式登记，不留隐含 debt）。
- **全量 WCAG 合规**（归 deep-audit 维度 20）。

## Scope

### In Scope

- `packages/flux-renderers-data/src/table-renderer.tsx`、`table-renderer/`、`data-renderer-definitions.ts`、schema 校验：分组/聚合 + 原位编辑字段族。
- 相应 schema 校验（`check:renderer-definition-fields-only` 门禁同步）+ 先红后绿单测。
- roving helper 抽取评估（若裁定抽取：落 `@nop-chaos/flux-react` 共享 helper，沿 G-F option-row / G-B2 keyboard helper 先例；kanban ad-hoc 实现回归采纳评估）。
- `docs/references/renderer-interfaces.md`、flux-guide 对应条目、C2 回写追加。

### Out Of Scope

- `packages/flux-core/src/`——单元格编辑的写入语义若裁定需 scope/编译器级改动，先落字保护区域流程与理由，再进入实现。
- `packages/ui/src/index.ts`（零新导出为默认预期，触发 ask-first 须先落字理由）。
- `packages/flux-renderers-form-advanced/src/`（form 域 Non-Goal）。
- playground 复刻页改造（Non-Goal 引用）。

## Failure Paths

| 可测场景编号                   | 触发                                                           | 行为（含错误表现）                                                                        | 可重试 | 用户可见表现          |
| ------------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------ | --------------------- |
| gd-cell-edit-invalid           | 编辑值未过校验时提交                                           | 提交拦截 + 校验态显示，编辑态保持，不丢焦丢值                                             | 是     | 字段校验错误提示      |
| gd-cell-edit-cancel            | 编辑态 Esc/点击外部                                            | 值回滚到编辑前，零写入零事件派发                                                          | 是     | 原值恢复              |
| gd-cell-edit-save-fail         | 编辑提交后保存动作派发失败（`quickSaveItemAction`/新写入通道） | 保存失败 notify + 草稿保持（沿 `table-quick-edit-cell.tsx` onSaveError 先例），行不伪成功 | 是     | 失败提示 + 编辑值保留 |
| gd-cell-edit-quickedit-coexist | 同列同时声明新编辑语义与 `quickEdit`                           | 按 Phase 1 裁定的优先级/互斥语义收敛（dev warn 一次性），不双控件叠渲染                   | 否     | 单一编辑控件生效      |
| gd-cell-edit-no-editor         | 列型别无匹配编辑器                                             | 列回退只读态 + 一次性 dev warn，不白屏                                                    | 否     | 单元格维持导航态      |
| gd-group-missing-field         | 分组字段路径缺失/值 null                                       | 该行归入可裁定兜底组（如「-」组）或行保持未分组，一次性 dev warn                          | 否     | 兜底组头或平铺        |
| gd-group-collapse-persist      | 分组折叠后数据刷新                                             | 折叠态按分组键保持或按裁定重置，不串组                                                    | 是     | 折叠态稳定            |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**——renderer 定义字段为保护区域（plan-first），契约变更须先红后绿单测锁定（沿 G-F/G-B2/G-B3 先例）；单元格编辑与分组聚合为 P6b 处置表锁定的交互契约（A 系列），Proof 项先于 Fix 项。

## Execution Plan

> 顺序 Phase。Phase 1 契约裁定先行（Phase 2/3 全部依赖其断言清单）；Phase 4 文档与回写收口。

### Phase 1 - 契约设计与维度终态裁定

Status: planned
Targets: 本计划 Decision 注记、`docs/references/renderer-interfaces.md`（草案条目）

- Item Types: `Decision | Proof`

- [ ] Proof——网格编辑面 inventory 实测落字：`table-renderer.tsx` + `table-renderer/` 全量现状（列模型/行渲染/单元格渲染链/事件面）+ **`quickEdit` 通道全量盘点**（`TableColumnQuickEditConfig` 契约/`table-quick-edit-cell.tsx`/`table-quick-edit-controller.ts`/`use-row-quick-edit-draft.tsx` 行草稿与保存链/flux-guide crud.md §6 作者面）+ 回写 ⑦ 缺口面 live 复核（按本计划修正后口径）+ P6b 十五键位终态表 live 复核 + `input-table`（form 域）契约边界对照 + AMIS table 行内编辑（`editable`）语义对照（amis-baseline-matrix 口径）
- [ ] Decision——分组/聚合载体裁定（候选 ①schema 声明式分组字段族（`groupBy` 字段 + 聚合配置 + client 端分组）；②server 透传分组契约（复刻页 mock 预聚合姿势的 renderer 侧对等物））+ 分组头行渲染形态 + 折叠语义（Failure Paths gd-group-missing-field/gd-group-collapse-persist 终态化）落字
- [ ] Decision——单元格原位编辑载体裁定（候选 ①**演进 `quickEdit`**——在既有 `TableColumnQuickEditConfig` 上扩展格级双态/型别分派语义；②与 `quickEdit` 共存分层——新字段族承载格级状态机，`quickEdit.body` 作为编辑器承载通道复用；③替换——废弃告警 + 新契约，G-A dead config 分轨先例的反向运用，须落字迁移面）+ 同格双态状态机（进入/提交/取消/校验/事件派发）+ 写入通道（action 派发 vs scope 写入，CX-10 ctx 合规；`quickSaveItemAction` 通道复用评估）+ 与 `onRowClick` 行 keydown 中继的共存语义落字
- [ ] Decision——「fill-handle 编辑器选区模型」终态裁定（G-B2 Decision 4 successor 义务：立项实现 or 再度 deferred——deferred 须落字新理由，不得沿用「依赖未就位」旧理由）
- [ ] Decision——roving helper 抽取终态裁定（G-B2 Decision 5① 边界登记触发：若 Phase 3 落地单元格方向键漫游，则评估抽取至 `@nop-chaos/flux-react` + kanban ad-hoc 回归采纳；若键盘漫游 deferred，则落字维持不抽取）
- [ ] Decision——「动态列模型」终态裁定（运行时列集合变更：立项 or `Deferred But Adjudicated`；既有 `columnSettings` 勾选显隐边界落字）
- [ ] Decision——单元格键盘漫游面裁定（方向键导航/Enter 进入编辑/F2 类语义——依赖 keyboard 绑定通道（G-B2 已落地）与本计划编辑态状态机的组合面；裁定立项或 deferred）

Exit Criteria:

- [ ] 六项 Decision 与一项 Proof 全部落字本计划（契约断言清单可清单化：分组矩阵 + 编辑器矩阵 + 双态状态机矩阵 + 键位矩阵 + 兼容矩阵）
- [ ] `docs/references/renderer-interfaces.md` 契约草案条目成形（Protected Areas owner evidence 就位）
- [ ] 若触 `ui/src/index.ts`、`packages/flux-core/src/` 或 `flux-renderers-form-advanced`：ask-first/plan-first 理由已落字且未在门禁前改码（默认裁定均不触）

### Phase 2 - table 分组/聚合渲染语义实现（先红后绿）

Status: planned
Targets: `packages/flux-renderers-data/src/table-renderer.tsx`、`table-renderer/`、`data-renderer-definitions.ts`、`__tests__/`

- Item Types: `Fix | Proof`

- [ ] Proof——分组契约断言清单测试先行（红）：分组矩阵（单字段分组/缺字段兜底/空数据）+ 聚合函数矩阵（sum/avg/min/max/count + 非数值兜底）+ 折叠态矩阵 + 无分组声明零回归快照等价 + 与既有选区/optionRow/排序契约的共存矩阵
- [ ] Fix——按 Phase 1 裁定载体实现分组/聚合（定义字段登记 + schema 校验同步，`check:renderer-definition-fields-only` 门禁零新增红）
- [ ] Proof——与 G-B3 `selectAllMode: 'page'` 的分组态共存语义测试锁定（页作用域勾选 × 分组行的交互边界，P6b 分组态键位归 A7/A8/A15 先例口径）

Exit Criteria:

- [ ] 先红后绿单测全绿（分组/聚合/兜底/共存全矩阵）
- [ ] 受影响包局部 typecheck/test 通过（保证 Phase 3 可继续）
- [ ] `check:renderer-definition-fields-only` 与 `check:audit-event-dispatch-ctx` 门禁零新增红

### Phase 3 - 单元格原位编辑实现 + 三维度裁定执行（先红后绿）

Status: planned
Targets: `packages/flux-renderers-data/src/table-renderer/`、`data-renderer-definitions.ts`、（若裁定抽取）`packages/flux-react/src/`、`__tests__/`

- Item Types: `Fix | Proof`

- [ ] Proof——编辑契约断言清单测试先行（红）：编辑器型别矩阵（text/select/date/checkbox 最小集，映射既有 input 族或 `quickEdit.body` 承载）+ 双态状态机矩阵（进入/提交/取消/校验失败 gd-cell-edit-invalid/Esc 回滚 gd-cell-edit-cancel/保存派发失败 gd-cell-edit-save-fail/无编辑器兜底 gd-cell-edit-no-editor）+ 事件派发矩阵（提交事件载荷/CX-10 ctx 合规）+ **`quickEdit` 共存矩阵**（无新声明零回归快照等价/两通道同行不冲突/分层裁定语义）
- [ ] Fix——按 Phase 1 裁定载体实现单元格原位编辑（定义字段登记 + schema 校验同步 + 定义门禁零新增红）
- [ ] Proof——单元格键盘漫游按裁定执行（立项则先红后绿键位矩阵 + roving helper 抽取裁定执行；deferred 则登记落字）
- [ ] Proof——fill-handle / 动态列两维度按 Phase 1 裁定执行落字（立项项实现先红后绿；deferred 项登记 `Deferred But Adjudicated` 含分类与不沿旧理由的新理由）

Exit Criteria:

- [ ] 编辑先红后绿单测全绿（编辑器/双态/事件/兼容全矩阵）
- [ ] 三维度裁定执行落字本计划（Deferred 区或实现落地，无静默跳过）
- [ ] 受影响包局部 typecheck/test 通过

### Phase 4 - owner docs 对齐 + C2 回写 + 收口

Status: planned
Targets: `docs/references/renderer-interfaces.md`、`flux-guide/`、`docs/analysis/ui-review/C2-capability-gaps.md`、`docs/logs/`

- Item Types: `Proof | Follow-up`

- [ ] `docs/references/renderer-interfaces.md` 契约条目终稿（Status: landed 口径，沿 G-A/G-B2/G-B3 先例）
- [ ] flux-guide 对应条目（table 分组聚合 / 单元格编辑 作者条目）
- [ ] C2 回写（追加式，初版裁决表零改动）：G-D 行落「已产品化」终态证据 + 三维度裁定结论 + G-B2/G-B3 successor 义务闭环落字 + styling-system 核查结论落字
- [ ] styling-system 核查（marker/样式契约对齐核查，零改动则落字确认）

Exit Criteria:

- [ ] owner docs 全部对齐 live baseline（文档内容与 live 行为一致）
- [ ] C2 回写追加落字（append-only，初版零删改）
- [ ] daily log 收口记录落字

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: R1 fresh session 独立子 agent `ses_faaff4024ffeo6Bbf4ER06la5v`；R2 scoped re-audit fresh session 独立子 agent `ses_faaf4bb6efferwcH2ENPxuMoLK`
- Verdict: R1 `fail`（1 Major：baseline「单元格原位编辑零承载」未盘点在库 `quickEdit` 通道 + 5 Minor）→ 全部修复 → R2 `pass-with-minors` 零 Blocker/零 Major
- Rounds: 2
- Findings addressed: Major——baseline 修正为「quickEdit 通道在库 + 三项深度缺口」（同格双态/型别分派编辑器矩阵/键盘进入编辑），Phase 1 载体候选扩为「演进 quickEdit/共存分层/替换」三向，Failure Paths 增 gd-cell-edit-save-fail 与 gd-cell-edit-quickedit-coexist；Minor 五条随共识修复（citation 路径修正 `table-renderer/table-body-row-rendering.tsx:193-209`/`:224-225`、列菜单/行高 Non-Goal+Follow-up 显式登记、Closure Gates 增 `pnpm check`、表头顺序句改写、「框架层接线」措辞张力消除）；R2 residual 1 Minor（Exit Criteria 计数勘误 七→六）+ 1 typo 随共识修复。

## Closure Gates

- [ ] 所有 in-scope confirmed live defects 已修复
- [ ] 所有 in-scope confirmed contract drifts 已收敛（回写 ⑦ 缺口面逐条按本计划修正后口径落终态，含 `quickEdit` 既有通道与新语义的分层结论）
- [ ] 行为/契约结果已达成（分组聚合 + 原位编辑语义件可用且有测试锁定）
- [ ] 必要 focused verification 已完成（先红后绿全矩阵）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs 已同步到 live baseline，或明确写明 No owner-doc update required
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`（零新增命中，超出既有登记基线即 red）

## Deferred But Adjudicated

> Phase 1 裁定后终态化；以下为起草时预登记槽位（Phase 1 可修订）。

### fill-handle 编辑器选区模型

- Classification: <<Phase 1 裁定：立项则移出本区 / `out-of-scope improvement` 或 `optimization candidate`>>
- Why Not Blocking Closure: <<Phase 1 落字；G-B2 Decision 4 旧理由「依赖未就位」已失效，deferred 须落字新理由>>
- Successor Required: <<yes | no>>
- Successor Path: <<如需要则填写>>

### 动态列模型（运行时列集合变更）

- Classification: <<Phase 1 裁定>>
- Why Not Blocking Closure: <<Phase 1 落字；既有 `columnSettings` 勾选显隐与复刻页会话排序端点姿势为现行替代>>
- Successor Required: <<yes | no>>
- Successor Path: <<如需要则填写>>

## Non-Blocking Follow-ups

- airtable-grid 复刻页分组/聚合姿势语义件化 retrofit（mock 预聚合 + loop 分支退役候选——复刻页迭代时采纳）
- 共享 roving helper 若本计划裁定不抽取：边界登记顺延（≥2 renderer 条件的下一次触发评估）
- C2 初版 G-D 行「列菜单」「行高」两子能力（Non-Goal 显式登记，D1 输入池，按 C2 后续轮次评估）
- G-B3 输入池候选（语法搜索解析器 / formatCurrency registry 函数等，回写 ⑧ 登记，未分级，按 C2 后续轮次评估）
- schema 模板预设库（G-A Follow-up 登记，C2 预登记候选的另一半，独立后续 plan 候选）

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
