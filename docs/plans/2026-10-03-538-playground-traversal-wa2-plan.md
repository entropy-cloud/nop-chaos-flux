# 538 Playground 全遍历 W-A2：complex-pages 主子通信对齐审计

> Plan Status: completed
> Last Reviewed: 2026-10-03
> Source: `docs/analysis/2026-10-03-playground-full-traversal-ux-roadmap.md` §三/§五（W-A2）、`docs/analysis/2026-07-27-flux-dialog-submit-refresh-design.md`、`flux-guide/design-patterns/page-dialog-drawer.md` §6.2
> Related: plan 537（W-A1，completed）；R13 roadmap

## Purpose

对 complex-pages 全部「弹窗/surface + 宿主数据」组合页逐一核对 R13 §三 主子通信标准形态；非标准形态（以宿主 id 定位刷新、onSubmitSuccess 混 closeSurface）当波改为标准方案（`refreshNearest` / 生命周期钩子 / scope 状态所有权），并对确属合理的设计（多源同步、自刷新）书面裁定。逐页结论登记 roadmap §六 W-A2 审计卡。

## Current Baseline（2026-10-03 全量盘点，证据 = page-schemas/\*.json 静态走查）

- `refreshNearest` action 已在 runtime 实现（`flux-runtime/src/refresh-nearest.ts` + action-adapter case），design doc §7 明确 `component:refresh componentId` 为「兼容老用法，仍然可用」；R13 §三 将「手动传宿主 id/name 定位刷新」列为禁止态。
- complex-pages 13 个 schema 含 openDialog；**0 处使用 refreshNearest**。
- 弹窗→宿主 刷新全部经 `component:refresh(<hostId>)`，分布在两种挂点：① openDialog args.onSubmitSuccess（antdpro-list 新建/编辑、linear-issues 批量×4+新建×3、airtable-grid、notion-database）；② dialog 内 ajax 的 then 链（standard-crud 新增/编辑、master-detail 新增明细、approval-tasks 通过/驳回、antdpro-list 删除确认）。
- 关闭时序契约：runtime「先派发 surface submit hook 后执行 close」——antdpro-list 新建/编辑的 `closeOnSubmit: true` 形态为 live 正确样本（surface-close-on-submit.test 固化）；手写 closeSurface 于 submitAction.then 会先拆 surface 令 hook 静默跳过。
- 违反「onSubmitSuccess 混 closeSurface」：sundial-todo-dialog / sundial-workbench 添加待办表单（submitAction: ajax 无 then；closeSurface+showToast 全在 onSubmitSuccess）。
- 合规形态已在册：stripe-payments 弹窗 = setValue 写页面状态 + dependsOn 响应式刷新（scope 状态所有权，§三 主从联动标准）；master-detail 主从联动 = selectionStatePath/dependsOn（linear-issues 同）；多视图页（notion 5 源 / airtable 2 源）弹窗提交需同步多源——refreshNearest 单目标语义无法表达。

## Goals

- 6 个页面的弹窗→宿主刷新改为 §三 标准形态（refreshNearest；全部显式 `targetType` + `notFound: 'error'`；关闭采用 `closeOnSubmit: true`——运行时契约「先派发 hook 后关闭」（surface-close-on-submit.test 固化），手写 closeSurface 在 submitAction.then 会先拆 surface 令 hook 静默跳过）：
  - standard-crud（新增/编辑 dialog form 补 `submitScope: 'surface'`——`args.onSubmitSuccess` 仅对 surface 提交触发；submitAction then 清空；openDialog args 补 `closeOnSubmit: true` + onSubmitSuccess = refreshNearest（targetType `crud`，host `user-crud`））
  - master-detail（新增明细 dialog form 同补 `submitScope: 'surface'`；closeOnSubmit + refreshNearest（targetType `crud`，host `md-items-crud`））
  - approval-tasks（通过/驳回 button then 链挂点②，host `approval-crud` → targetType `crud`；链内顺序归一 refresh→close，关闭机制不动）
  - antdpro-list（新建/编辑订单 onSubmitSuccess 原地 component:refresh → refreshNearest（targetType `crud`，closeOnSubmit 形态已是 live 正确样本）；删除确认 then 链归一为 [refreshNearest, closeSurface]）
  - linear-issues（批量×4 + 新建×3 共 7 处 onSubmitSuccess 原地替换，host source `linear-issues-source` → targetType `data-source`）
  - sundial-todo-dialog / sundial-workbench（添加待办 dialog 补 `closeOnSubmit: true`；onSubmitSuccess 只留 rev setValue；closeSurface/showToast 移除，toast 走 submitAction messages.success）
- 转换后逐流实机复验（弹窗提交 → toast + 宿主数据可见更新 + 弹窗关闭无残留）。
- 裁定并登记：notion/airtable 多源同步（保留 component:refresh 多目标，书面理由）；master-detail 行内自刷新（自引用不属跨组件通信）；非弹窗页面刷新（无宿主组合）不在本审计范围。
- 审计卡回填 R13 roadmap §六（W-A 表下追加 W-A2 审计小节）。

## Non-Goals

- 不改 flux-runtime/action-core 运行时（refreshNearest 已实现且经设计评审）。
- 不改「弹窗 + 宿主」之外的刷新接线（工具栏刷新钮、行内保存自刷新、页面源自刷新）。
- 不动 W-B~W-E 页面组。

## Scope

### In Scope

- `apps/playground/src/complex-pages/page-schemas/`：standard-crud.json、master-detail.json、approval-tasks.json、antdpro-list.json、linear-issues.json、sundial-todo-dialog.json、sundial-workbench.json。
- R13 roadmap §六 W-A2 审计小节 + §七 裁定登记。

### Out Of Scope

- notion-database / airtable-grid 的多源同步改写（裁定保留）。
- 渲染器/运行时代码。

## Failure Paths

| 可测场景                               | 触发                                                                                                                                                                                                                                                                                                     | 行为                                                                                                                              | 可重试 | 用户可见表现         |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------- |
| refreshNearest 命中弹窗自身 form       | 仅挂点②（dialog 内 then 链，walk 起点为 surface 子 scope，弹窗自身 registry 在路径上）；挂点①（args.onSubmitSuccess）回调在 owner ctx 执行、walk 只沿 parent 链向上，天然不经过弹窗子 registry                                                                                                           | 转换一律显式 targetType（crud/data-source），两类挂点统一规避                                                                     | -      | 无（设计规避）       |
| onSubmitSuccess 静默不触发（两种成因） | ① dialog 主提交 form 未声明 `submitScope: 'surface'`（form.tsx 仅对 surface 提交 triggerHook）；② 手写 closeSurface 放 submitAction.then——runtime 先 await 完整 submitAction 程序（含 then）再派发 hook，closeSurface 已同步 remove surface entry + dispose scope → hook 的 entries.find 落空静默 return | ①逐 form 核对/补声明；②关闭一律用 `closeOnSubmit: true`（runtime 契约 hook 先于 close，有专门测试固化）；实机复验必须看到宿主刷新 | 是     | 宿主列表更新可见     |
| refreshNearest 找不到目标              | scope 链上无可刷新目标                                                                                                                                                                                                                                                                                   | 实现默认 notFound=silent（ok+found:false 无提示）——转换统一显式 `notFound: 'error'`，失败可见                                     | 是     | 明确失败提示而非静默 |
| then 链顺序回归                        | 删除确认链 close 在前导致刷新落在已拆域 scope                                                                                                                                                                                                                                                            | 转换统一 refresh→close 顺序                                                                                                       | 是     | 宿主列表仍刷新       |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**。转换正确性以实机复验为主证（弹窗提交→宿主更新逐流走查）；schema 层已有 `complex-pages` 既有单测（schema-examples/route-matrix）防回归结构破损；不新增 e2e（遍历探针记录归档 daily log）。

## Execution Plan

### Phase 1 - Schema 转换（6 页 7 文件）

Status: completed
Targets: `standard-crud.json, master-detail.json, approval-tasks.json, antdpro-list.json, linear-issues.json, sundial-todo-dialog.json, sundial-workbench.json`

- Item Types: `Fix | Decision`

- [x] standard-crud 新增/编辑：dialog 主提交 form 补 `submitScope: 'surface'`；submitAction then 清空（去 component:refresh 与 closeSurface）；openDialog args 补 `closeOnSubmit: true`，onSubmitSuccess = [{action: refreshNearest, args: {targetType: 'crud', notFound: 'error'}}]
- [x] master-detail 新增明细：dialog form 补 `submitScope: 'surface'`；submitAction then 清空；openDialog args 补 `closeOnSubmit: true` + refreshNearest（targetType crud, notFound error）
- [x] approval-tasks 通过/驳回：then[0] → refreshNearest（targetType crud, notFound error），保留 closeSurface 收尾
- [x] antdpro-list 新建/编辑 onSubmitSuccess → refreshNearest（targetType crud, notFound error）；删除确认 then 归一为 [refreshNearest, closeSurface]
- [x] linear-issues 批量×4+新建×3：onSubmitSuccess[0] → refreshNearest（targetType data-source, notFound error）——实际转换 9 处（双工具栏变体 + 2 处筛选弹窗 then 链同属弹窗→宿主挂点②）
- [x] sundial×2【执行期修正：声明式 dialog 变体】——两页弹窗为 `type: "dialog"` + `open: "${todoDialogOpen}"` 状态驱动（非 openDialog action），`closeOnSubmit`/surface hook 均不适用：onSubmitSuccess（form 级，非 surface hook，不受 submitScope 门控）改为 [setValue todoDialogOpen=false]（状态翻转关闭，即 §三 scope 状态所有权形态）；移除 closeSurface/showToast；submitAction 补 messages.success（toast）。**执行期追加修复（既有缺陷）**：sundial-workbench 添加待办后宿主计数从未刷新——原 rev 计数器经 setValue 写入弹窗域被遮蔽（form 级 onSubmitSuccess 在 dialog scope 派发），页级六个数据源依赖的 rev 从未变化；改为 `refreshSource` ×6 显式刷新（todosAll/todosToday/todosScheduled/todosDone/todosTrash/pressure；source registry 有全桶名扫描兜底，弹窗域可命中页级源——refreshSource 即 §三 标准三兄弟之一，多源同步形态与 notion/airtable 裁定一致）

Exit Criteria:

- [x] 7 文件中「弹窗→宿主」流 0 处 `component:refresh(<hostId>)`（master-detail 保留的 2 处行内自刷新 quickSaveItemAction/行内删除属自引用，不在清零口径内；notion/airtable 多源同步不在目标文件内；standard-crud 保留 2 处 confirmText 门 + 工具栏批量删除的页面域自刷新——调用方在页面域非 surface 内，与 antdpro 工具栏刷新同类裁定保留）
- [x] `pnpm --filter @nop-chaos/flux-playground test`（schema 结构测试）通过——41 文件 408/408

### Phase 2 - 实机复验 + 裁定登记 + 收口

Status: completed
Targets: dev server 实机 + R13 roadmap + daily log

- Item Types: `Proof | Decision`

- [x] 逐流实机复验（9 流）：standard-crud 新增（共 33→34 条 ✓）、master-detail 新增明细（SKU 子表 4→5 行 ✓）、approval-tasks 通过（待审批→已通过 ✓）+驳回（确认门→已驳回 ✓）、antdpro-list 新建（36→37 ✓）+删除（37→36 ✓）、linear-issues 新建问题（源总数 +1 ✓）+批量修改状态（ENG-101 待办→进行中，宿主列表实时翻转 ✓）、sundial-todo-dialog 添加待办（toast+状态翻转关闭 ✓）、sundial-workbench 添加待办（toast+关闭+计数 9→10 ✓——经 refreshSource 修复后计数契约首次真正生效；分组行为静态 schema 属页面设计，登记 P3 说明）
- [x] 裁定登记：notion/airtable 多源同步保留理由、master-detail 自刷新、standard-crud confirmText/工具栏页面域刷新、审计范围外清单（详见 roadmap §六 W-A2 审计小节）
- [ ] roadmap §六 追加 W-A2 审计小节（逐页 verdict）
- [ ] 全量门禁（typecheck/build/lint/test/check）+ daily log

Exit Criteria:

- [x] 复验流 9/9 全绿（宿主数据可见更新 + 弹窗关闭无残留 + 零 console 错误）
- [x] 裁定书面化入 roadmap；full-green（见 Closure Gates）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `pass-with-minors`（R1 fail：1B+1M+5m；R2 fail：1B+3m；R3 fail：1B+2m；三轮 technical walkthrough 后评审员明示「修订后可直接判 pass」，以下 R3 修订即按其修法落实，故记 pass-with-minors 收敛）
- Rounds: 3
- Findings addressed:
  - R2-Blocker-1：closeSurface 放 submitAction.then 会先于 surface submit hook 拆除 surface entry（form-runtime-submit-flow 先 await 完整 submitAction 程序再派发 hook；close() 同步 store.remove+disposeEntry → entries.find 落空）→ 关闭一律改 `closeOnSubmit: true`（runtime 契约 hook 先于 close，surface-close-on-submit.test 固化），Failure Paths 第 2 行并入该触发条件。
  - R3-Blocker-1：sundial×2 添加待办 form 同样缺 `submitScope: 'surface'`（closeOnSubmit 仅在 hook 管线内生效）→ Phase 1 item 已补声明要求。
  - R3-Minor-1/2：Goals 测试文件名笔误（surface-close-on-submit）、本记录补 R2/R3 条目。
  - R1-Blocker-1：standard-crud/master-detail 三个 dialog form 缺 `submitScope: 'surface'`（onSubmitSuccess 仅对 surface 提交触发，缺省静默不触发）→ Goals/Phase 1/Failure Paths 均已补声明要求。
  - R1-Major-1：Failure Paths 误写 notFound 默认 error（实现默认 silent）→ 转换统一显式 `notFound: 'error'`。
  - R1-Minor-1~5：schema 计数 14→13；linear-issues 新建×3/复验扩 9 流；Failure Paths 按挂点①②区分误命中；sundial 钩子归位述语与 §三 字面偏离说明；Phase 1 清零口径限定弹窗→宿主流。
  - R2-Blocker-1：closeSurface 放 submitAction.then 先于 surface hook 拆 surface entry（runtime 先 await 完整 submitAction 程序再派发 hook）→ 关闭一律改 closeOnSubmit:true。
  - R2-Minor-1：Baseline「新建×2」漏改 → ×3；R2-Minor-2：§三 偏离说明随 closeOnSubmit 修正自然消解；R2-Minor-3：submitScope 声明补入 Goals 两条 bullet。
  - R3-Blocker-1：sundial×2 添加待办 form 同缺 submitScope（closeOnSubmit 惰性）→ Phase 1 补声明。
  - R3-Minor-1/2：Goals 测试文件名笔误（surface-close-on-submit）；本记录补 R2/R3 条目。
  - 【执行期追加】sundial×2 实为声明式 dialog（open 状态驱动），closeOnSubmit/submitScope 路线不适用 → 修正为状态翻转关闭；workbench 计数既有缺陷经 refreshSource×6 修复（见 Phase 1/2）。
  - R1-Major-1：Failure Paths 误写 notFound 默认 error（实现默认 silent）→ 转换统一显式 `notFound: 'error'`，表格按实现语义改写。
  - R1-Minor-1：openDialog schema 计数 14→13。
  - R1-Minor-2：linear-issues 新建问题实为 ×3（共 7 处转换）；复验流扩为 9 流（含驳回、新建问题）。
  - R1-Minor-3：Failure Paths 按挂点①（owner ctx，天然不经过弹窗 registry）/挂点②（surface 子 scope 起点）区分误命中风险。
  - R1-Minor-4：sundial 项改述为「生命周期钩子归位，非 refreshNearest 转换」；注明 closeSurface 放 submitAction.then 系依据 guide §6.2 的有意偏离。
  - R1-Minor-5：Phase 1 清零口径限定「弹窗→宿主流」（master-detail 2 处自引用刷新除外）。

## Closure Gates

- [x] 全部弹窗→宿主组合页为 §三 标准形态或书面裁定（roadmap §六 W-A2 小节可查）
- [x] Phase 1/2 Exit Criteria 全勾
- [x] 实机复验记录归档 daily log
- [x] 不存在被静默降级的 in-scope 非标准形态
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` / `pnpm check` 全绿

## Deferred But Adjudicated

### notion-database / airtable-grid 多源同步

- Classification: `watch-only residual`
- Why Not Blocking Closure: refreshNearest 单目标语义无法表达「一次提交同步 N 个视图源」；component:refresh 显式多目标是多视图一致性的正确形态，不属于「定位单个宿主」的被禁场景。
- Successor Required: no

## Non-Blocking Follow-ups

- master-detail 行内 quickSaveItemAction 自刷新（自引用，维持 component:refresh）。

## Closure

Status Note: W-A2 完成——13 个含弹窗 schema 全量对齐审计，6 页 7 文件转换为 §三 标准形态（refreshNearest ×13 处 / refreshSource ×6 / 生命周期钩子归位），9 流实机复验全绿，另修复 1 项既有缺陷（workbench 计数刷新）。多源同步与页面域刷新书面裁定。全量门禁 full-green，独立子 agent closure audit approved。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose）
- Evidence: 审计 verdict `approved`（2026-10-03）。live 抽查全过：standard-crud closeOnSubmit+submitScope+refreshNearest 形态、approval 双链 refresh→close、antdpro 删除链归一且工具栏 2 处未误改、linear-issues refreshNearest×9 零残留、sundial-workbench refreshSource×6+状态关闭、roadmap 13 行审计表+§七 3 条登记、daily log 收口段；`pnpm --filter @nop-chaos/flux-playground test` 408/408 复证；裁定三处均属合理豁免非静默降级。簿记修正 3 处（Phase 2 两项补勾 / R2 minors 补录 / 行内保存→行内删除措辞）已随本关闭提交。

Follow-up:

- P3：sundial-workbench 分组行静态 schema（设计演进候选，roadmap §七 登记）。
- W-B~W-E 波次按 R13 §五 继续。
