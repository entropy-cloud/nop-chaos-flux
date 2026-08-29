# P2b Ant Design Pro 页面模板族 — 交互接线与测试

> Plan Status: completed
> Mission: ui-review
> Work Item: P2b. Ant Design Pro 页面模板族 — 交互接线与测试
> Last Reviewed: 2026-08-29
> Source: roadmap `docs/backlog/ui-review-roadmap.md`（P2b 条目 + Phase Details P2 + Cross-Cutting 5/6/7）；复刻工程规范 `docs/analysis/ui-review/P1-reference-apps/README.md`（§2.1 mock 写端点、§2.2 e2e 骨架、§4.1 Pi-b 档位、§5 两段式边界）；应用分析篇 `docs/analysis/ui-review/P1-reference-apps/ant-design-pro.md` §4 交互清单（I1–I18）；能力缺口对照 `docs/analysis/ui-review/C2-capability-gaps.md` G-A/G-B3/G-E 行
> Related: `docs/plans/2026-08-29-1240-1-p2a-antdpro-template-static-replica.md`（P2a，completed——本计划的全部静态落点与接线遗留清单来源）；`docs/plans/457-sundial-replica-interactions-plan.md`、`docs/plans/460-sundial-replica-full-interactions-reimplementation-plan.md`（交互接线先例：ajax/navigate/openDialog/closeSurface/submitForm 模式）

## Purpose

消费 P2a 已落盘的 9 张 `antdpro-*` 静态复刻页与分析篇 §4 交互清单，把 Pi-b 段义务收口：补全 mock 写端点、接线交互状态机、分析篇 §4 逐条 e2e 锁定（先红后绿），closure 时按 roadmap Cross-Cutting 5 以追加方式回写 C2，并把"预测缺口 vs 实测缺口"对照记入应用分析篇。

## Current Baseline

live 复核 2026-08-29，HEAD `2b3fa8d9a`，worktree `nop-chaos-flux-ui-review`（分支 `ui-review`），working tree clean：

- P2a 全部静态产物在库：9 张 `apps/playground/src/complex-pages/page-schemas/antdpro-*.json`（category `app-replica` 已注册）；`apps/playground/src/antdpro-replica/antdpro-replica.css`（270 行，`--adp-*` 令牌声明于 `.adp-root, .adp-dialog` 双作用域）；`shared/mock-backend-antdpro.ts`（314 行）；`shared/showcase-env.ts`（680 行，:644 处 `/r/AntdPro__` 委托给 `createAntdProFetcherBranch`）；`tests/e2e/antdpro-replica-visual.spec.ts`（269 行，10 条初屏用例）；`__tests__/antdpro-mock-backend.test.ts`（12 条单测）。
- **mock 读端点 get-only**：`createAntdProFetcherBranch` 内 `method !== 'get'` 即不命中（mock-backend-antdpro.ts:287）——`AntdPro__orders` / `AntdPro__orderDetail` / `AntdPro__dashboard` 三读端点，**零写端点**。
- **已接线**（P2a 落地并有 e2e 证明）：`antdpro-toolbar-refresh` → `component:refresh`；`antdpro-dialog-open` → openDialog + 弹窗内表单；list 查询/重置走 crud queryForm（e2e 用例 10 证明 keyword→端点→空态全链路）；批量删除按钮 `disabled: ${!$crud.hasSelection}` 门控（e2e 断言 toBeDisabled）；wizard 步进（form-step 内建）；查询区展开/收起（filterTogglable 内建）。
- **静态未接线按钮**（本计划接线对象，schema 实测清单）：`antdpro-list-export`、`antdpro-list-new`、行操作列 `antdpro-op-view/op-edit/op-delete`（operation 列）、`antdpro-toolbar-density`、`antdpro-toolbar-columns`、`antdpro-list-bulk-delete`（仅门控无动作）、`antdpro-basic-reset/submit`、`antdpro-grouped-reset/submit`、`antdpro-detail-basic-print/back`、`antdpro-approve-approve/reject`、`antdpro-result-primary/secondary`。
- 交互动作词汇（sundial 复刻页 schema 实证）：`ajax`、`navigate`、`component:refresh`、openDialog/closeSurface、form submit/reset；crud scope 提供 `pagination/query/selection/hasSelection`（P2a `disabled` 表达式实证）。
- **已知能力缺口约束接线深度**（C2 登记在案，接线时不得绕道 renderer 包改码）：G-E 密度档 L2（`flux-renderers-data`/`flux-renderers-basic` 源码 grep `density` 零命中，无密度语义字段）；G-F2 className 表达式绑定未落地（选中/hover/密度类切换无表达通道）；列显隐无 schema 表达。
- roadmap Cross-Cutting 5：Pi-b closure 必须以追加方式回写 C2（不重开 C2 状态）；分析篇 §7 预登记"无新增行"，ProLayout 三布局若实测发现 schema 层无承载经 P2b 回写追加。
- 治理线：`showcase-env.ts` 现 680 行（700 行 MUST-split 红线，warning 档）；`mock-backend.ts` 463 行 ≤500 治理线不得回涨；P2a 先例——分支体下沉 `mock-backend-antdpro.ts` 防 showcase-env 涨线。

## Goals

- mock 写端点补全并先红后绿锁定：订单保存（新建/编辑）、批量删除、审批裁决、通用表单提交，全部 in-memory 会话内可观察（沿 sundial settings 写后端先例）。
- 分析篇 §4 交互清单 I1–I18 **逐条处置落字**（接线锁定 / 既有内建 e2e 锁定 / 显式裁决），Pi-b 档位 = `必须自动化`（P1 README §4.1），核心交互每条 ≥1 条先红后绿 e2e。
- closure 时完成 C2 追加回写（G-B3 批量栏实测证据、G-E 密度/列设置实测证据、I4/I2 处置结论）+ 分析篇"预测缺口 vs 实测缺口"对照落字。
- 全量验证 full-green（typecheck/build/lint/test + 目标 e2e + `pnpm check` 零新红）。

## Non-Goals

- 不改 `packages/` 下任何 renderer/ui/runtime 代码；G-B3 批量栏语义件、G-E 密度档、G-F2 className 表达式绑定的产品化归 D1 流程。
- 不复刻 P2a Non-Goals 已排除的页面（search-list/profile/account/login/exception 等名单外页面），因此不新增任何 schema 页面。
- 不做框架顶栏（I16）复刻；不做暗色适配（P2a 差异声明已裁定 light-only）。
- 不重新评审 R1 分数、不做 P2 名单变更、不重开 C2 初版裁决表。

## Scope

### In Scope

- `apps/playground/src/complex-pages/shared/mock-backend-antdpro.ts`（追加写操作 + 数据集可变性）
- `apps/playground/src/complex-pages/shared/showcase-env.ts`（仅当分支签名需透传 method/body 时的 ≤10 行胶水；预期主要改动在 mock-backend-antdpro.ts 内）
- `apps/playground/src/complex-pages/page-schemas/antdpro-*.json`（仅既有 9 张内接线动作/补 testid，不新增页面文件）
- `apps/playground/src/complex-pages/__tests__/antdpro-mock-backend.test.ts`（写操作单测）
- `tests/e2e/antdpro-replica-visual.spec.ts`（追加交互用例；落地前若将超 ~500 行则按 P1 README §2.2 拆分规则新建 `tests/e2e/antdpro-replica-interactions.spec.ts` 承载交互用例——现 269 行 + 预估交互用例体量，预计触发拆分）
- roadmap Phase Status 区 P2b `todo`→`planned`（draft review 通过后）；closure audit 通过后 `planned`→`done`
- C2 回写区追加（`docs/analysis/ui-review/C2-capability-gaps.md` §3）+ 应用分析篇对照落字（`docs/analysis/ui-review/P1-reference-apps/ant-design-pro.md`，仅对照注记与事实勘误）

### Out Of Scope

- `packages/` 全部代码；`tests/e2e/` 中非本 spec 的文件；`docs/analysis/` 既有文档的结构性改写；`mock-backend.ts`。

## Failure Paths

> 涉及写端点与交互状态机，列最小集。

| 可测场景编号     | 触发                         | 行为                                                             | 可重试 | 用户可见表现                     |
| ---------------- | ---------------------------- | ---------------------------------------------------------------- | ------ | -------------------------------- |
| adp-del-empty    | 批量删除时选择集已被清空     | 写端点空 ids 直接返回成功 0 条，页面刷新无异常                   | 是     | 无报错，列表原样                 |
| adp-save-miss    | 编辑提交的 id 在 db 中不存在 | 按新建落库（upsert 语义）或返回失败——Phase 1 Decision 裁定并落字 | 是     | 列表出现新行或提交错误提示       |
| adp-approve-miss | 审批的 id 无匹配             | 返回失败分支，状态不翻转                                         | 是     | message 错误提示，审批按钮可重试 |
| adp-select-miss  | op-view 传递的订单 id 无匹配 | selectOrder 返回失败，会话指针不更新                             | 是     | 详情页保持上次/兜底记录，可重试  |
| adp-form-invalid | 必填为空提交                 | 不发写请求，字段红框 + 帮助文案（内建校验）                      | 是     | 校验反馈可见（I17 e2e 锁定）     |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（P1 README §4.1 Pi-b 档：分析篇 §4 交互清单逐条有 e2e 断言，交互契约无一豁免；先红后绿——新接线动作的 e2e 在接线前先断言失败或对既有内建行为补锁定断言）。档位口径注记：「逐条有断言、无一豁免」指不允许**未处置的静默跳过**；处置表中显式裁决为 out-of-scope 的条目（I2/I10/I16，附 non-blocking 理由 + C2 注记）属"逐条有处置"，不构成对档位的违反。最低证明：`antdpro-mock-backend.test.ts` 写操作单测全绿 + §4 处置表中每条"接线锁定/内建锁定"项 ≥1 条程序化 e2e 断言（testid 可见性/数据变化/getComputedStyle；截图仅视觉附件）。

## Execution Plan

> 顺序 Phase。Phase 1 写端点基座先行（后续接线全部依赖）；Phase 2–4 按页面族接线；Phase 5 回写与自查收口。

### Phase 1 - mock 写端点基座（先红后绿）

Status: completed
Targets: `apps/playground/src/complex-pages/shared/mock-backend-antdpro.ts`、`shared/showcase-env.ts`（≤10 行胶水，如需）、`__tests__/antdpro-mock-backend.test.ts`

- Item Types: `Fix | Decision | Proof`

- [x] Decision——写端点语义裁定：5 个 post 端点定名与契约——`AntdPro__saveOrder`（新建/编辑 upsert）、`AntdPro__deleteOrders`（ids 批量删除）、`AntdPro__approveOrder`（id + decision: approve/reject，状态翻转）、`AntdPro__submitForm`（通用表单 payload → 成功 + id）、`AntdPro__selectOrder`（记录会话当前订单指针，供详情页无参读取——支撑 I6 op-view 跨页取数，机制归 Phase 2 裁定）；miss 行为按 Failure Paths 裁定（adp-save-miss 的 upsert-vs-失败二选一）并落字本计划
- [x] Proof——写操作单测先红后绿：每端点 ≥2 条（成功路径 + Failure Path）、会话内持久性断言（删除后 list 端点不再返回该行）——先于 Fix 编写，对未实现分支断言失败
- [x] Fix——`createAntdProFetcherBranch` 扩展 post 分支：写操作修改 in-memory orders db，同一 session 内跨页可观察（删除行在重新导航后仍不存在）；`mock-backend.ts` 零触碰，`showcase-env.ts` 零改动或仅 ≤10 行胶水且不回涨 700 行红线

> **Phase 1 Decision 注记（写端点契约落字，2026-08-29）**
>
> - `AntdPro__saveOrder`（post）：body 接受 `id?/customer?/channel?/payType?/amount?/owner?` 任意子集。id 命中 → 原位 patch，返回 `{ ok:true, id, created:false }`；**adp-save-miss 裁定：upsert 语义**——id 未命中按新建落库（返回 `created:true`），沿 showcase `User__save` 先例，编辑/新建共用端点语义自洽；无 id → 生成 `A<max+1>`。新建行 **unshift 至数组头**（"最新在前"列表语义，与 AntD Pro table-list 默认倒序一致），保证 I14"新行出现在列表首屏"可断言；orderNo 由 id 派生 `SO202608<pad(seq,4)>`，createdAt 取当前时刻。
> - `AntdPro__deleteOrders`（post）：`ids` 接受数组或逗号分隔串（表达式求值形态防御）；空/缺失 ids → `{ ok:true, deleted:0 }`（adp-del-empty）；删除后同 session 内 orders/orderDetail 不再返回该行（单测断言）。
> - `AntdPro__approveOrder`（post）：`id + decision('approve'|'reject')`；approve→`done`、reject→`cancelled`（种子数据 A1002=processing→done、A1003=pending→cancelled，翻转两端可观察）；id/decision 非法或未命中 → `status:1` 失败分支 `{ ok:false }`，状态不翻转（adp-approve-miss，ajax `messages.failed`/onError 路径可重试）。
> - `AntdPro__submitForm`（post）：通用 payload 原样接收 → `{ ok:true, id }`（body 无 id 时生成会话级 id）；无独立持久化态（提交结果由 navigate 承载）。
> - `AntdPro__selectOrder`（post）：`id` 命中 → 记录 session 当前订单指针，返回 `{ ok:true, id }`；未命中 → `status:1` 失败、指针不更新（adp-select-miss）。配套读端点回退链：`AntdPro__orderDetail` 未携带 id 参数 → 会话指针 → `A1001` 兜底（直访兼容，P2a 初屏 e2e 06/07 零回归）。
> - 实现落点：全部分支体在 `mock-backend-antdpro.ts`（459 行 <500 治理线）；`showcase-env.ts` **零改动**（680 行，分支签名本就透传 method/body）；`mock-backend.ts` 零触碰（463 行未回涨）。
> - Proof 先红后绿证据：新增 9 条写端点单测先行编写并跑红（9 failed / 200 passed），Fix 后全绿（`pnpm test` 68 tasks 全绿，含 playground 209/209）。

Exit Criteria:

- [x] 写端点契约（端点名/入参/miss 行为）已落字本计划 Decision 注记
- [x] `pnpm --filter @nop-chaos/flux-playground test -- antdpro-mock-backend` 全绿且含新增写操作用例（21 条 antdpro mock 单测：12 既有 + 9 新增写操作）
- [x] `showcase-env.ts` ≤700 行（680，零改动）、`mock-backend.ts` 463 行未回涨（`wc -l` 实测 2026-08-29）

### Phase 2 - list 页交互接线与锁定

Status: completed
Targets: `page-schemas/antdpro-list.json`、`tests/e2e/antdpro-replica-interactions.spec.ts`（或 visual spec 追加，按 500 行阈值裁定）

- Item Types: `Fix | Decision | Proof`

- [x] Fix——I5 批量操作：勾选行后批量删除接 `AntdPro__deleteOrders` → 删除选中行 + 刷新（component:refresh）+ 成功 message；表顶"已选择 N 项"反馈与「取消选择」按既有 crud 选择集 scope 表达（`$crud.selection`/`hasSelection`；数组 length 表达不可达时降级为 hasSelection 二态文案，裁定落字）——G-B3 实测证据记录
- [x] Decision——I6 跨页行 id 传递机制裁定：flux navigate 仅接受 url/back/replace（`flux-runtime/src/action-adapter.ts:393-410`），playground 路由不透传页面 id 之外的查询参数（`route-model.ts` pageId 口径），且路由文件不在 In Scope——在既有原语内裁定传递机制：候选 ①`AntdPro__selectOrder` 写会话当前订单指针 + 详情页无参读取（Phase 1 已定契约）；②op-view 改页内 detail dialog（sundial task-detail-dialog 先例）；裁定结论落字，Phase 4 数据一致性断言据此执行
- [x] Fix——I6 行操作：`op-view` → 按上述裁定机制打开 `antdpro-detail-basic`（selectOrder 指针路径或页内 dialog 路径）；`op-edit` → openDialog 预填表单 → 提交 `AntdPro__saveOrder` → 关窗 + 刷新；`op-delete` → I7 确认流
- [x] Fix——I7 删除确认：确认 dialog（`[secondary, primary]` 按钮序，沿 R3 沉淀规范）→ 确认后 `AntdPro__deleteOrders` 单条 → 关窗 + 刷新 + message；Esc/取消不删除
- [x] Fix——I14 新建：`antdpro-list-new` → openDialog 新建表单 → 提交 `AntdPro__saveOrder` → 关窗 + 刷新，新行出现在列表首屏可断言
- [x] Decision——I4 工具栏 options：refresh 已接线（P2a）；密度/列设置在 G-E/G-F2 缺口下的处置裁定——候选路径：①双渲染模拟（两份表格节点 + 互补 visible 表达，plan460 settings rail 先例）②按钮保持静态 + G-E 实测证据入 C2 回写；全屏按钮裁决（预期 out-of-scope：无全屏原语）；裁定结果与理由落字
- [x] Decision——I2 查询形态切换（LightFilter）与 I10 行展开/树形：P2 名单 9 页不含该形态/列表数据集无树形语义——裁决 out-of-scope 并登记 C2 回写注记（若实测发现可低成本模拟则改接线，落字理由）
- [x] Proof——I1/I3/I8/I9 既有内建行为 e2e 锁定：展开/收起字段数变化、查询后页码回 1、页码切换重取数（总数区间变化）、`orderNo` 列排序翻转首行顺序

> **Phase 2 Decision 注记（2026-08-29）**
>
> - **I6 裁定 = 候选 ①（`AntdPro__selectOrder` 会话指针）**。op-view 先 post selectOrder（data `{id: '${id}'}`）再 navigate `#/complex-pages/antdpro-detail-basic`；`AntdPro__orderDetail` 读端点改为无参调用（回退链 显式 id → 会话指针 → A1001 兜底，P2a 初屏 e2e 06/07 零回归）。弃候选 ②：dialog 路径需在 list 页复刻整套详情 UI，且无法服务 detail-advanced 同源取数。数据一致性断言按指针机制执行（Phase 2 e2e 03 已断 orderNo/customer 行级一致；Phase 4 补金额精确断言）。
> - **I4 裁定**：①refresh 维持 P2a 接线（批量删除/新建/编辑/删除链路中的 component:refresh 已由 e2e 01/04/05/06 反复锁定）。②**列设置实测修正预测缺口**——crud 原语已有 `columnSettings: { enabled: true }`（列显隐勾选 + 上移/下移，overlay dropdown，`table-column-settings.tsx`），Current Baseline "列显隐无 schema 表达"结论对列显隐维度不成立：已原生接线（e2e 07 锁定勾选隐藏/恢复），静态 `antdpro-toolbar-columns` 按钮**裁决移除**（与原生触发器重复，保留即死按钮，违 P1 README §4.2）。③**密度**：G-E L2 缺口成立（`flux-renderers-data`/`flux-renderers-basic` 源码 grep `density` 零命中复测），候选 ① 双渲染否决（plan460 已实测其维护成本，且本计划零新增 CSS 无法承载密度档样式差异），**候选 ② 采纳：`antdpro-toolbar-density` 静态保留**（理由=密度无 schema 表达通道，非接线遗漏），证据入 C2 回写。④全屏：复刻名单无全屏按钮（P2a 未复刻该 icon），out-of-scope 维持，无 C2 义务。
> - **I2/I10 out-of-scope 维持**：I2（LightFilter 形态切换）——9 页名单不含该形态，页内无 Segmented 承载，维持 out-of-scope + C2 注记；I10（行展开/树形）——实测 crud 无 expandable 通道（`CrudSchema extends BaseSchema`，expandable 为 table schema 专属字段）且数据集无树形语义，维持 out-of-scope + C2 注记。
> - **I5 G-B3 实测证据**：`$crud.selectionCount` 在 toolbar 文案模板可达（e2e 01 断言「已选择 10 项」）、`$crud.selectedRowKeys` 经 ajax data 透传批量删除成功、`hasSelection` 门控 + `component:clearSelection` 取消选择可用（e2e 02）；「批量栏 alert 包络」无语义件（toolbar 文案 + 按钮 + visible 手拼），归 C2 G-B3 回写素材。
> - **I3 实测发现（页码回 1 非完整内建）**：renderer `submitQueryValues` 只更新 query 状态、**不重置分页**（`onQueryReset` 分支则同步重置分页，两分支不对称）。本计划以 schema 级接线补齐：crud `onQuerySubmit` → `setValue` 写 `$_crud.antdpro-list-crud.pagination = {currentPage:1, pageSize:10}`（e2e 09 断言第 2 页搜索后回第 1 页且首行为 A1001）。**同源实测发现两条 renderer 级 finding（登记 C2/D1 候选，本计划零 packages/ 改动不修）**：①loadAction 查询提交不重置分页（与 reset 不对称）；②分页/排序触发的 reactive loadAction 重派发在无 crud scope 投影上下文求值 `${query.keyword ?? ''}` 抛错（每次一条 `[showcase] action error` console error；实际加载由 effect 派发完成，功能正确）。附带实测：将模板改写为 optional-chaining（`query?.keyword`）或任何可解析的 `$_crud.*` 依赖会引发 reactive 派发 ↔ settle 分页回写无限循环（页面假死）——故模板维持原样，e2e 对分页/排序三例以 fixture `allowConsoleErrors(2)` 登记该已知噪声（用例内注释注明），非静默豁免。
> - **接线注记（dialog 表单预填）**：openDialog `args.data` 只进入 dialog scope（弹窗正文模板可读），**form 字段初值必须声明在 form 节点自身的 `data`**（对齐 `flux-guide/examples/crud-with-dialog-and-search-form.md` 双声明先例）；编辑对话框 customer 预填 + 保存由 e2e 04 锁定。
> - 新建交互 spec 独立文件 `tests/e2e/antdpro-replica-interactions.spec.ts`（11 用例；visual spec 269 行 + 交互体量超 ~500 行阈值，按 P1 README §2.2 拆分规则落新文件）。

Exit Criteria:

- [x] I5/I6/I7/I14 接线 e2e 全绿（每条 ≥1 程序化断言，含删除后行消失、新建后行出现的 db 可观察断言）
- [x] I1/I3/I8/I9 锁定 e2e 全绿；I2/I4/I10 裁定落字本计划（含证据归类）
- [x] `npx playwright test tests/e2e/antdpro-replica-interactions.spec.ts --reporter=list` 全绿（11/11；`antdpro-replica-visual.spec.ts` 10/10 零回归）

### Phase 3 - form 族提交接线与锁定

Status: completed
Targets: `page-schemas/antdpro-form-basic.json`、`antdpro-form-grouped.json`、`antdpro-form-dialog.json`、`antdpro-form-step.json`

- Item Types: `Fix | Proof`

- [x] Fix——I12 整页/分组表单：`submit` → 校验通过后 `AntdPro__submitForm` → 成功 message → navigate `antdpro-result`；`reset` → form 重置（空态可见）
- [x] Fix——I11 分步表单：wizard 校验前进（空必填不可前进，内建）+ 末步提交 `AntdPro__submitForm` → navigate `antdpro-result`；上一步数据保留可断言
- [x] Fix——I14 弹窗表单：form-dialog 页内弹窗提交接 `AntdPro__submitForm` → 成功关窗（与 P2a 的打开链路闭环）
- [x] Proof——I17 校验反馈锁定：空提交断言红框类/帮助文案可见且无写请求副作用（mock 端点计数不变）；I18 键盘最小锁定：dialog 打开态按 Esc 关闭

> **Phase 3 接线注记（2026-08-29）**
>
> - **submit 链路形态**：按钮 `onClick: {action:'submitForm'}`（FormContext 解析所属 form）→ 内建校验（`required` 失败不发请求，`onSubmitSuccess` 不触发）→ form `submitAction`（ajax post `AntdPro__submitForm`，`includeScope: '*'`）→ `onSubmitSuccess`（navigate `antdpro-result`）。reset 接 `component:reset` + form schema id（form handle `reset` 契约：清 values + fieldStates，校验态一并清除，e2e 13 断言）。
> - **成功 message 与 navigate 的时序裁定（实测发现）**：playground 每个复杂页 host 各自挂载 `<Toaster/>`（`render-host.tsx`），navigate 立即换页会连旧页 Toaster 一起卸载，`messages.success` toast 存活 <100ms 不可观察（e2e 14 首轮实测 0 toast）。处置：submitAction 保留 `messages.success`，navigate 动作加 `control: {debounce: 1200}` 延迟跳转——toast 可观察 ≥1.2s 后到达 result 页，对齐 AntD Pro「message → 延迟跳转」参考行为；schema 级解决，零 packages/ 改动。弹窗表单（I14）不 navigate，`messages.success` 原样可观察（e2e 16），无需延迟。
> - **I11 实测发现（wizard 卸载即清发布值）**：`valuesPath` 发布在 form runtime dispose 时会回写 `undefined`（`form-runtime.ts` setupExternalPublication 清理分支），而 wizard 非 `mountOnEnter` 模式下非激活步不渲染、离开步的 form 会卸载——`antdproStep.step1` 被清空、返回上一步输入框为空。处置：wizard 声明 `mountOnEnter: true`（访问过的步保持挂载，form 不卸载），确认步跨步读取 `${antdproStep.step1.*}` 与「上一步数据保留」随之成立（e2e 15 三点断言：确认步回显、返回后输入值保留、末步提交可达 result）。
> - **I17「无写请求副作用」的观察手段**：`createAntdProFetcherBranch` 增设 opt-in 端点计数钩子 `window.__antdproEndpointCalls`（e2e `addInitScript` 预建对象才生效，生产恒为 no-op；mock-backend-antdpro.ts 466 行 <500 治理线）。e2e 17 断言空提交后计数器无 `AntdPro__submitForm` 键 + 页面未跳转。
> - **已登记已知噪声**：故意空提交触发校验失败时，playground 宿主 `onActionError`（render-host.tsx）记一条 `[showcase] action error` console.error——host 层日志通道行为，非渲染器缺陷；e2e 13/17 以 `allowConsoleErrors(1)` 登记并注释，非静默豁免。
> - **先红后绿证据**：首轮 e2e（接线后、修复前）12/13/14/15/17/19/20/23 共 8 条红（缺 owner 必填未填、toast 被 navigate 卸载、refreshSource args 形态错误、选择列错位），修复后 23/23 全绿。

Exit Criteria:

- [x] basic/grouped/step 三页提交链路 e2e 全绿（提交后可达 result 页、mock 收到 payload）
- [x] I11/I17/I18 锁定 e2e 全绿
- [x] `npx playwright test <form 用例> --reporter=list` 全绿（12–18 共 7 条 + 既有 11 条零回归，23/23；`antdpro-replica-visual.spec.ts` 10/10 零回归）

### Phase 4 - detail 与 result 接线

Status: completed
Targets: `page-schemas/antdpro-detail-basic.json`、`antdpro-detail-advanced.json`、`antdpro-result.json`

- Item Types: `Fix | Decision | Proof`

- [x] Fix——审批操作（I5 同族写路径）：`antdpro-approve-approve/reject` → `AntdPro__approveOrder` → 状态翻转在详情/列表两端可观察 + message
- [x] Fix——I13 result 动作组：主按钮 → navigate `antdpro-list`；次按钮 → navigate `antdpro-form-basic`（再填一份）
- [x] Fix——detail-basic `back` → navigate `antdpro-list`
- [x] Decision——detail-basic `print`：无打印原语，裁定处置（预期 out-of-scope：浏览器打印归宿主能力，按钮静态保留或移除，落字理由 + 是否入 C2 注记）
- [x] Proof——op-view → detail-basic 的行级数据一致性 e2e（按 Phase 2 裁定机制的等价断言：selectOrder 指针路径 = 详情字段值等于所点行 mock 值；dialog 路径 = 弹窗字段值等于所点行 mock 值）

> **Phase 4 接线与裁定注记（2026-08-29）**
>
> - **审批接线形态**：approve/reject 按钮 `onClick: ajax post AntdPro__approveOrder`，data `{id: '${detail?.id ?? ""}', decision}`（page scope 读 data-source `detail`），`messages.success` → `then: refreshSource`。**实测修正**：`refreshSource` 的目标参数必须写在 action 层（`targetId: 'detail'`，经 `compileTargeting` 进 `invocation.targeting`），写在内建先例 `dashboard-filter-lab` 同款位置；放 `args.targetId` 不被读取（首轮 e2e 19 实测 `refreshSource requires targetId` 红条）。
> - **状态翻转双端断言**：approve——详情端（detail-advanced steps `data-current-index` 1→3，processing→done）+ 列表端（同 session 回 list，SO2026080101 行含「已完成」）；reject——详情端（detail-basic 状态 tag `status-pending`→`status-cancelled` 可见性翻转）+ 列表端（SO2026080102 行含「已关闭」）。种子数据 A1002=processing、A1003=pending 按契约两端翻转可观察（Phase 1 注记兑现）。会话指针链路：list op-view（selectOrder）→ hash 导航 detail-advanced → 审批 → 回列表/详情，全程零直传 id。
> - **print 裁定 = 静态保留（out-of-scope）**：理由=①浏览器打印归宿主能力（`RendererEnv` 无 print 通道，`packages/` 改动被 Non-Goals 禁止）；②该按钮是 P2a 已交付静态复刻面的一部分（AntD Pro 详情页头三键位），移除反而改变 P2a 初屏结果面（visual e2e 06 断言其可见）。C2 注记：回写 ③ 携带一条素材行「打印 host 能力候选（window.print 型 env 通道），未分级，D1 输入池」。
> - **先红后绿证据**：首轮 e2e 19/20 红（refreshSource args 形态），修复后全绿；23（行级一致性）首轮红（选择列错位取列），修正后 green——断言改读行内 orderNo/customer/amount 三字段与详情三 testid 等值，金额走 `toHaveText` 精确匹配。

Exit Criteria:

- [x] 审批翻转链路 e2e 全绿（approve 与 reject 各 ≥1 断言）
- [x] result/detail 导航链路 e2e 全绿；print 裁定落字
- [x] `npx playwright test <detail/result 用例> --reporter=list` 全绿（19–23 共 5 条 + 既有 18 条零回归，23/23）

### Phase 5 - C2 回写、分析篇对照与复刻验收自查

Status: completed
Targets: `docs/analysis/ui-review/C2-capability-gaps.md`（§3 追加）、`docs/analysis/ui-review/P1-reference-apps/ant-design-pro.md`（对照注记/事实勘误）、本计划

- Item Types: `Proof | Decision`

- [x] C2 追加回写（不重开初版表）：G-B3 批量栏实测证据（schema 层选择集/批量动作可达深度与降级点）、G-E 密度/列设置实测证据（I4 裁定结论）、ProLayout 三布局承载实测结论（分析篇 §7 预登记项的回写义务）
- [x] 分析篇对照落字：§4 交互清单逐条"预测缺口 vs 实测缺口"对照注记（仅矛盾时做事实勘误并记勘误行）
- [x] AI 模板感自查（P1 README §4.2）：接线后无"demo 占位"按钮残留（对照 Current Baseline 静态清单逐个核对终态：接线/裁决移除/静态保留理由）；数据全部经 mock 端点流动
- [x] 样式契约自查（§4.3）：本计划零新增 CSS（预期）；`git status` 变更面仅 In Scope 清单
- [x] 处置表终态落字：I1–I18 逐条终态（接线锁定/内建锁定/裁决）汇总进本计划「§4 交互处置终态表」

> **Phase 5 自查记录（2026-08-29）**
>
> - **C2 回写 ③ 已落盘**（追加区，初版表零改动）：G-B3 可达面/降级点 + 导出按钮素材、G-E 密度缺口成立/列显隐维度预测修正/拖拽排序与固定列仍缺、ProLayout 三布局无实测证据不新增行、4 条新增素材行（I3 分页不对称 + reactive 重派发、wizard valuesPath 卸载清发布值、toast 与页级 host 绑定、打印 host 能力候选）。
> - **分析篇对照已落盘**：§4.1 逐条对照表（预测/实测/终态/e2e 锚点）+ §7 P2b 回写结论 + 3 条事实勘误行（table-list gap 说明收窄、§5 列显隐保真度上调、wizard mountOnEnter 注意点）。
> - **AI 模板感自查（Current Baseline 静态清单逐钮终态）**：
>   | 静态按钮 | 终态 |
>   | --- | --- |
>   | `antdpro-list-new` | 接线（e2e 06，openDialog→saveOrder→refresh） |
>   | `antdpro-list-export` | 静态保留——导出/下载归宿主能力，无 env 通道；与 print 同族登记 C2 回写 ③ 素材行 |
>   | `antdpro-op-view/op-edit/op-delete` | 接线（e2e 03/04/05） |
>   | `antdpro-list-bulk-delete` | 接线（e2e 01/02，deleteOrders + selectionCount 反馈 + clearSelection） |
>   | `antdpro-toolbar-refresh` | 接线（P2a，e2e 01/04/05/06 链路反复触发） |
>   | `antdpro-toolbar-density` | 静态保留——密度档 G-E L2 缺口，无 schema 表达通道（I4 裁定，非接线遗漏） |
>   | `antdpro-toolbar-columns` | 裁决移除（Phase 2 已删，与原生 columnSettings 触发器重复） |
>   | `antdpro-basic-reset/submit`、`antdpro-grouped-reset/submit` | 接线（e2e 12/13/14/17） |
>   | `antdpro-dialog-cancel/confirm` | 接线（e2e 16/18，closeSurface / submitForm→closeOnSubmit） |
>   | `antdpro-step` 上一步/下一步/完成 | renderer 内建（`wizard-prev/next` testid），完成接 `onComplete` 提交（e2e 15） |
>   | `antdpro-detail-basic-print` | 静态保留——print 裁定（宿主能力；移除会破坏 P2a 初屏复刻面） |
>   | `antdpro-detail-basic-back` | 接线（e2e 22） |
>   | `antdpro-approve-approve/reject` | 接线（e2e 19/20） |
>   | `antdpro-result-primary/secondary` | 接线（e2e 21） |
>   结论：**零"demo 占位"按钮残留**——每个静态保留均有归因（宿主能力族/能力缺口族）且登记 C2 素材，其余全部接线或内建。数据流：list/detail/dashboard 三读端点 + 5 写端点全部经 mock fetcher 流动（e2e 断言 db 可观察变化），schema 无写死展示数组。
> - **样式契约自查**：`git status --porcelain` 零 `.css` 变更、零 `packages/` 变更（实测 2026-08-29）；变更面 = In Scope 文件（8 张 schema（list/form×4/detail×2/result，Phase 2 已含 list）、mock-backend-antdpro、mock 单测、interactions spec）+ 治理文档（C2/分析篇/roadmap/本计划与 P3a plan）+ e2e 截图 artifacts（复刻页视觉状态同步，P2a 先例随码入库）。`mock-backend.ts` 463 行、`showcase-env.ts` 680 行零触碰；`mock-backend-antdpro.ts` 466 行（+7，含计数钩子）<500 治理线。

Exit Criteria:

- [x] C2 §3 追加段与分析篇对照注记在盘
- [x] I1–I18 处置终态表落字，无未处置项
- [x] `git status --porcelain` 仅含 In Scope 文件（另有计划治理文档与 e2e 截图 artifacts，均随本计划闭环，见上方自查记录）
- [x] `pnpm --filter @nop-chaos/flux-playground typecheck` 与包级 test 全绿（全量验证归 Closure Gates；typecheck 全 workspace 37/37、playground 单测 209/209 实测绿）

## §4 交互处置终态表（Phase 5 落终态；W=接线锁定 B=内建锁定 A=显式裁决）

| I#  | 交互            | 终态处置（e2e 锚点 = interactions spec 用例号）                                                                           |
| --- | --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| I1  | 查询区展开/收起 | B 内建锁定（filterTogglable，e2e 08）                                                                                     |
| I2  | 查询形态切换    | A out-of-scope（名单外形态，C2 回写 ③ 注记）                                                                              |
| I3  | 查询/重置       | B+W（展开/收起 08；页码回 1 经 onQuerySubmit schema 接线补齐，e2e 09；renderer 不对称 finding 入 C2/D1）                  |
| I4  | 工具栏 options  | B+W+A（refresh W；列显隐 B 原生 columnSettings，e2e 07，静态重复按钮已移除；密度 A 静态保留 G-E L2；全屏 A 名单外无义务） |
| I5  | 批量操作        | W 接线（deleteOrders + 批量栏反馈，e2e 01/02；导出按钮静态保留，宿主能力族）                                              |
| I6  | 行操作列        | W 接线（view 指针路径 e2e 03/23；edit e2e 04）                                                                            |
| I7  | 删除确认        | W 接线（确认 dialog，取消/Esc 不删除，e2e 05）                                                                            |
| I8  | 分页            | B 内建锁定（重取数，e2e 10）                                                                                              |
| I9  | 列排序          | B 内建锁定（sortable 翻转，e2e 11）                                                                                       |
| I10 | 行展开/树形     | A out-of-scope（crud 无 expandable 通道 + 数据集无树形语义，C2 回写 ③ 注记）                                              |
| I11 | 分步导航        | B+W（formId 校验闸内建 + mountOnEnter 数据暂存 + onComplete 提交接线，e2e 15）                                            |
| I12 | 表单提交        | W 接线（submitForm → message → result，e2e 12/13/14）                                                                     |
| I13 | Result 动作组   | W 接线（navigate 链路，e2e 21）                                                                                           |
| I14 | 弹窗/抽屉编辑   | W 接线（新建 06 / 编辑 04 / 弹窗提交 16 闭环）                                                                            |
| I15 | 页头容器        | 无交互义务（P2a 静态证据）                                                                                                |
| I16 | 框架顶栏        | A out-of-scope（P2a Non-Goals 已排除框架 chrome）                                                                         |
| I17 | 校验反馈        | B 内建锁定（红框 + 帮助文案 + 零写请求副作用，e2e 13/17）                                                                 |
| I18 | 键盘 Esc/Tab    | B 内建最小锁定（Esc 关弹窗，e2e 05/18）                                                                                   |

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: independent sub-agent fresh session `ses_fb3d26ccdffeDayA2Mzzb1gI5B`
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed: R1-Major1 I6 "navigate 携带行 id"在既有原语下不可执行（navigate 仅 url/back/replace、路由文件不在 In Scope）——新增 Phase 2 Decision 裁定跨页 id 传递机制（①`AntdPro__selectOrder` 会话指针 ②页内 detail dialog）、Phase 1 契约补第 5 端点 selectOrder、Failure Paths 增 adp-select-miss 行、Phase 4 Proof 改为按裁定机制的等价断言。R1-Minor1 Phase 1 调序为 Decision→Proof→Fix（先红后绿）；R1-Minor2 Test Strategy 增档位口径注记（显式裁决 ≠ 豁免）。R2 复核零 Blocker/零 Major 达成共识；R2-Minor（Closure Gates "4 个"→"5 个"端点计数漂移）已随共识落字。

## Closure Gates

- [x] 分析篇 §4 交互清单 I1–I18 逐条处置完成且终态表落字（接线锁定/内建锁定/显式裁决，无未处置项）
- [x] 5 个 mock 写端点落地且写操作单测先红后绿全绿
- [x] 接线/锁定交互的 e2e 全绿（程序化断言，无截图证明）
- [x] C2 追加回写与分析篇对照落字完成（roadmap Cross-Cutting 5 义务）
- [x] 无 in-scope live defect 被静默降级；I2/I4/I10/I16/print 裁定均附 non-blocking 理由
- [x] `mock-backend.ts` 463 行未回涨；`showcase-env.ts` ≤700 行
- [x] 零 `packages/` 改动（`git status` 证明）
- [x] roadmap Phase Status 区 P2b 状态同步（review 通过 `todo`→`planned`；closure audit 通过后 `planned`→`done`）
- [x] 受影响的 owner docs 已同步（C2 追加 + 分析篇对照；无矛盾则分析篇不改）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] 目标 e2e：`npx playwright test tests/e2e/antdpro-replica-visual.spec.ts tests/e2e/antdpro-replica-interactions.spec.ts` 全绿（含 P2a 既有 10 条初屏用例零回归；33/33，2026-08-29 实测）

## Deferred But Adjudicated

### I16 框架顶栏（折叠/搜索/通知/头像/主题切换）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: P2a Non-Goals 已排除框架 chrome 复刻，9 张页面不含顶栏区块；全局搜索/通知等缺口已由 C2 G-B1 登记，不影响本计划"交互接线收口"结果面成立
- Successor Required: `no`
- Successor Path: 无（如未来需要属 roadmap 结构性变更，须人工确认）

## Non-Blocking Follow-ups

- I2 查询形态切换（LightFilter/Segmented）与 I10 行展开/树形：Phase 2 Decision 裁决后如维持 out-of-scope，登记 C2 回写注记，不阻塞收口（页面名单与数据集边界，非 live defect）
- G-E 密度档/G-F2 className 表达式绑定的产品化：归 D1 流程，输入含本计划 I4 实测证据

## Closure

Status Note: P2b 收口（2026-08-29）。5 个 mock 写端点（saveOrder/deleteOrders/approveOrder/submitForm/selectOrder）+ list/form×4/detail×2/result 全族交互接线落地；分析篇 §4 交互清单 I1–I18 逐条处置（W 接线 9 / B 内建 6 / A 裁决 4，含 I15 无义务注记）且终态表落字；C2 回写 ③ 与分析篇 §4.1「预测 vs 实测」对照落字（roadmap Cross-Cutting 5 义务兑现）；零 `packages/` 改动；全量验证 full-green（typecheck/build/lint 37/37、test 68 任务含 playground 209/209、`pnpm check` exit 0、目标 e2e 33/33 = visual 10 + interactions 23）。closure audit 通过（approved-with-minors，零 Blocker/Major，1 Minor 文本计数勘误已随收口修正）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session）`ses_fb34349c2ffesT42CsbGgFKTwi`
- Evidence: verdict `approved-with-minors`（零 Blocker/零 Major；F1 Minor = Phase 5 自查记录「7 张 schema」应为 8 张的文本计数漂移，已修正）。审计者独立复跑：playground 单测 28 文件 209/209（含 21 条 antdpro mock）、`tests/e2e/antdpro-replica-interactions.spec.ts` 23/23、`tests/e2e/antdpro-replica-visual.spec.ts` 10/10、`pnpm typecheck` 37/37；`git status --porcelain` 零 `packages/`/零 `.css`；`wc -l` 463/680/466/499 与 plan claim 逐项相符；逐文件核对 5 写端点契约（含 4 条 Failure Path 单测落点）、8 张 schema 接线形状（`control.debounce`/`mountOnEnter`/action 级 `targetId`）、C2 回写 ③ 与分析篇 §4.1/§7 在盘。审计声明：两处未勾 Closure Gate（roadmap 状态同步、audit 证据记录）随本收口一并勾选，`Plan Status` 升 `completed`。

Follow-up:

- 仅 non-blocking：见「Non-Blocking Follow-ups」与 C2 回写 ③ 素材行（I2/I10 形态边界、G-E 密度档与 G-F2 产品化归 D1、I3 renderer 级 finding 归 D1/deep-audit 候选、print/导出宿主能力候选）。无剩余 plan-owned work。
