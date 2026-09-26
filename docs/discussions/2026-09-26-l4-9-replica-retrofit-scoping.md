# L4.9 replica retrofit scoping — 适用性矩阵与子计划分派

> Date: 2026-09-26
> Owner plan: `docs/plans/515-missing-components-l4-9-replica-retrofit-scoping-plan.md`（Phase 1 design gate）
> Sources: C2 回写③⑤⑦⑧⑫⑬⑮；page-schemas 40 张 JSON 实核（file:line 见矩阵）；roadmap §12 错峰规则
> Review: 两条独立审查轨（2026-09-26）：**文档审**（pass-with-minors，0B/0M/4m——m1 §12 误引更正 / m2 URL 物化两处语义差核对清单 / m3 airtable 键盘格原语血缘 / m4 cal 软裁行注兜底）与 **plan 级 draft review**（r1 fail 1M+3m：linear 引用更正 / taxonomy 第四档 / airtable 簇注 / antdpro 回写③⑤分工注记 → r2 pass-with-minors 1m：Goals taxonomy 对齐，已修齐）。两轨修正全部落字，无内容损失；编号分轨避免混淆（closure audit Major-1 更正）

## 0. 格 taxonomy

`适用`（retrofit 内容明确） / `不适用（理由）` / `待子计划核实`（形态存在但落点需逐 schema 核对） / `适用但暴露原语缺口 → D1 输入池`。

## 1. 矩阵（7 replica × 4 原语）

| replica      | option-row                                                                                      | keyboard                                                                                                                                                                                                                                                                                                                      | batch-bar                                                                                                                                                                                                                 | 备注                                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **antdpro**  | 适用：list 行态统一走 optionRow 状态 token/属性（antdpro-list.json 行渲染面；落点待子计划核实） | 待子计划核实：列表行键盘面（现役 tab 序，无 chord 语义——盲加键位属行为变更，须裁是否在 retrofit 边界内）                                                                                                                                                                                                                      | **适用**：antdpro-list.json:301-337 手工批量包络（`${$crud.selectionCount}` 文本 + ghost「取消选择」+ listActions 批量删除）整体替换为 `batch-bar`（selectionPath/countTemplate/clearTarget）——回写③包络证据、⑤选择集契约 | e2e：antdpro 交互 23 条；批量面断言迁移点 = listActions 区与计数文本                                                                |
| **linear**   | 待子计划核实：issues/board 行态（rowSelection :2086 已有；optionRow 统一行态 token 的落点核实） | **适用**：chord G/O/M、J/K 指针、shift/meta 选区改写为 `keyboard` renderer bindings + `rowSelection.modifierSelect`/`selectAllMode`（回写⑫⑬：缺口已由原语消解；selectedRowKeys :2088/:2132 通道保持）                                                                                                                         | 不适用：无批量栏形态                                                                                                                                                                                                      | e2e：linear 交互套（含 03/06/16 clipboard）；键位行为断言随迁移迁移                                                                 |
| **notion**   | 适用：database 行 optionRow 化（行选中/状态视觉统一）                                           | 待子计划核实：⌘K/导航键是否已有宿主面（notion 复刻有自绘 palette？落点核实后定）                                                                                                                                                                                                                                              | 不适用：无批量形态                                                                                                                                                                                                        | 视觉 spec 锁定行态断言随动                                                                                                          |
| **cal**      | 待子核实：booking/confirm 行态面小（表单为主）——预计不适用或仅 optionRow 微面                   | 不适用（预计）：预约流程无键盘导航语义                                                                                                                                                                                                                                                                                        | 不适用                                                                                                                                                                                                                    | 子计划核实后落格终态                                                                                                                |
| **stripe**   | 适用：payments 行 optionRow 化（P6b ad-hoc URL 物化的 query/filter 面与之正交）                 | 不适用：无键盘导航语义                                                                                                                                                                                                                                                                                                        | 不适用：无批量栏形态（回写⑧ :262 零扩充裁定维持）                                                                                                                                                                         | **L3.5 错峰 rebase 主体**：stripe-payments 的 ad-hoc URL 物化迁移到 syncLocation 契约在本子计划内裁定（迁移或声明豁免，二选一落盘） |
| **airtable** | 适用：grid 行 optionRow 化                                                                      | **适用但带原语血缘**：十五键位导航缺口（回写⑦ :223；C2:372 方向键漫游显式 deferred→D1 池）——`keyboard` 原语仅 combo/chord 通道（无 roving/网格漫游），「适用」按 combo 可覆盖子集（快捷键触发类）裁；方向键漫游部分落第四档（518 边界含核实义务，网格诉求 → D1 输入池）+ table `editable` 双态组合；键盘选区 `modifierSelect` | 不适用（N14「未启用」口径维持；如子计划核实发现批量形态诉求 → D1 输入池）                                                                                                                                                 | **L3.5 rebase 对象**（P7b ad-hoc URL 物化裁定，语义差清单见 §3）；e2e：airtable 交互+visual 套                                      |
| **sundial**  | 待子核实：analytics/detail/todo 行态落点                                                        | 待子核实：workbench 键盘面                                                                                                                                                                                                                                                                                                    | 不适用                                                                                                                                                                                                                    | e2e：sundial 套                                                                                                                     |

## 2. 子计划分派

| plan    | 范围                                                                     | 簇理由                                                                                                                                                                            |
| ------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **516** | antdpro（batch-bar + optionRow；keyboard 格终态核实）                    | 单 replica 改动面最大（手工包络整体替换 + 23 条 e2e 迁移）                                                                                                                        |
| **517** | linear（keyboard bindings + modifierSelect + optionRow 核实）            | 键位迁移最复杂（chord 语义映射）；clipboard 断言共存                                                                                                                              |
| **518** | airtable（keyboard 导航 + editable + optionRow + URL 物化裁定）          | keyboard×editable 组合唯一 + L3.5 rebase 对象                                                                                                                                     |
| **519** | stripe（optionRow + URL 物化裁定）+ notion + cal + sundial（核实面收尾） | 轻面聚簇：单格 retrofit + 三处核实收尾；§12 只约束 L3.5↔L4.9（均已由 512 落地满足），518/519 同属 L4.9 侧无互相错峰义务——两者各自 rebase 512 的 syncLocation 契约与既有 ad-hoc 面 |

依赖：516→517→518→519 顺序执行（每 plan 独立 full-green + closure audit；先行者落地的模式被后行者 rebase 引用）。原语缺口若在核实中暴露（如 airtable 批量形态）→ 记 D1 输入池，不阻塞该子计划闭合（该格以「原语缺口登记」为终态）。

## 3. URL 物化裁定（512 Deferred successor 消解）

stripe（P6b，stripe-payments.json:12）/airtable（P7b，airtable-grid.json:12/:23）的 ad-hoc URL 物化：**优先迁移到 L3.5 `syncLocation` 契约**（518/519 内执行，二选一落盘）——理由：L3.5 已提供 restore/replace/保留键/序列化的完整语义，双轨并存是长期漂移源。

**两处已知语义差（迁移裁决的核对清单，review m2）**：

- (a) 现状 ad-hoc 把 query 写进**数据源请求 URL**且默认值恒写入（`range=lastmonth`/`group=category`）；syncLocation 写**浏览器 location**、首跑仅记基线不写、空值删键——迁移后地址栏会出现 query，属用户可见行为变化，须在子计划内显式裁定接受与否（不接受 → 豁免路线：保留 ad-hoc 面 + 注记登记）。
- (b) `useUrlFilterSync` 的挂载恢复经**表单句柄 setValues** 回显；stripe/airtable 的筛选是 scope 变量 + dependsOn 数据源重跑，无表单句柄——恢复通道需子计划核实等价接线（无表单时 applyToForm 缺省即可，恢复仅写 scope 已够）。
- 豁免出口：语义差 (a)/(b) 任一不可接受且无低成本适配 → 该 replica 声明豁免保留 ad-hoc 面，差异登记 D1 输入池。

## 4. retrofit 边界（全簇约束）

- 用户可见行为保持（视觉/信息架构不变）；交互通道替换的副作用（toast 归属等）按原语义迁移。
- e2e 断言迁移 = 断言对象从旧实现面（手工包络 DOM）迁到新通道（batch-bar DOM），断言语义（计数/文案/清除行为）不变。
- testid 一律保留（避免破坏既有定位）。
- 每 plan 声明 `必须自动化`；retrofit 后 replica e2e 套全绿为 Exit。
