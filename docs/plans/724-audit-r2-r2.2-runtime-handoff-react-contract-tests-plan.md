# 724 审计修复 R2·R2.2：契约补测—运行时交接面+react（P1-MA4.1-005/006/007 + P1-MA4.2-001）

> Plan Status: active
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` R2.2（MR2.0/plan 713 展开，归并依据「compiler→runtime→react 接缝同验证路径」）；`docs/audits/2026-10-21-0415-arm2-MA4.1-core-runtime-tests.md` §P1-MA4.1-005/006/007；`docs/audits/2026-10-21-1330-arm2-MA4.2-basic-tests.md` §P1-MA4.2-001（各含最小补强规格）；owner doc `docs/architecture/renderer-runtime.md` :241（structuralWhen 守卫职责）、:230/:250/:682（meta 投影）
> Related: bug notes `docs/bugs/51-structuralwhen-runtime-react-handoff-contract-fix.md`、`docs/bugs/30-form-runtime-setvalue-setlastchange-missing-rerender-fix.md`、`docs/bugs/163-import-overlay-captures-schema-event-setValue-writes.md`；Cross-Cutting 11（判别纪律）；先例 plan 723（R2.1 同构契约补测全链）
> 编号 runway：723 为 R2.1（本线）；724 本 plan；ARC 线从 725 起避开

## Purpose

为运行时交接面+react 四条「关键契约零判别测试」finding 补测：005/006/4.2-001 为守卫补测（现实现守约，先证绿再以临时变异证红）；007 为**现状钉子（characterization）**——bug163 缺陷本体 open（MA4.1 给出「先钉现状或修复后钉正确语义，随 MR2 裁决」两可裁决权，MR2.0/plan 713 将其归入 R2.2 **补测**行、未授权修复），故钉当前写捕获语义并显式注记缺陷未修；同时按 MR2.0 追加授权（roadmap :250 展开器规则「向本 roadmap 追加具体修复工作项行」+ MR2.0 行『追加 R2.n 行』）为本体缺陷登记 successor 行 **R2.15**，使确认 live 的缺陷零主归属问题不悬空（review R1 M1）。四 finding 回填 `closed`（007 附缺陷-open + successor=R2.15 注记）。

## Current Baseline（2026-10-24 live，HEAD `8ae2e4ded` 实测）

- **005** 交接链锚点：编译产出 `packages/flux-compiler/src/schema-compiler/node-compiler.ts:123`（`structuralWhen = metaProgram.when`）+:574（装入 TemplateNode）；runtime 消费 `packages/flux-runtime/src/node-runtime.ts:187-196`（`structuralWhen !== undefined` 优先，回落 `meta.when`）+:213（`normalizeBooleanLike(...) ?? true`）；react 门 `packages/flux-react/src/node-renderer-resolved.tsx:436`（`when === false → return null`）。全仓测试 `grep structuralWhen --include="*.test.*"` **0 命中**（本会话复核）；bug51 note 声称的守护文件 `schema-renderer-runtime-monitoring.test.tsx` 今天不存在（flux-react/src/**tests**/ 58 文件无此名）。owner doc 锚 renderer-runtime.md:241。
- **006** 快照键契约 live：`form-runtime.ts:131-136` `setLastChange`（revision 递增 + 新对象）→ `:145` `getLastChange: () => lastChange` → store adapter `store-backed-scope-adapter.ts:21`（`getLastChange` 直通）→ `node-renderer-resolved.tsx:119-121` 以 `getLastChange()` 为 useSyncExternalStoreWithSelector 快照键。`setValue`（form-runtime.ts:539-560，setLastChange 调用于 ：555）与 `executeSetValues`（form-runtime-values.ts:108 起）各自在写前调 `setLastChange`。既有测试（`form-runtime-values.test.ts:124-171`）只捕手造 deps 的 change 对象断言 `paths` 内容——**无一处对真实 store 断言两次写引用不同**（审计：「断言维度从引用 identity 变化退化为方法被调用/paths 内容」）。
- **007** 缺陷路径 live：`node-renderer.tsx:189-201`（importBindings 非空则 `createChildScope` 装 overlay）→ `runtime-factory.ts:331-345`（createChildScope **不传 `input.update`**；`scope.ts:440` 委托钩子在 API 上可行）→ `scope.ts:515-537`（update 只写 `ownStore`，无父委托）。schema-event setValue 经 `helpers.dispatch(action, { scope: nodeInstance.scope })`（node-renderer.tsx）落 overlay。仅 fixture 缓解面（ai-coverage 去 imports）被 e2e 钉；unit/integration 写语义零守护。bug163 note `## Successor Required` 声明 successor 必需但未命名归属——本 plan 以 R2.15 行落地归属。
- **4.2-001** 框架投影 gate：`node-renderer-resolved.tsx:436`（`when === false || !visible || hidden → return null`）。28 个含 `visible:false` 的测试文件全为组件自读面（wizard/columns）或 mock-prop 层；框架 gate 假分支写反全仓全绿（审计 Round A / A-01）。
- roadmap R2.2 行 `todo`（:99）；arm2-index 四行修复列 `R2.2`、状态 `open`（:136/:137/:138/:141）。

## Goals

- 四条契约测试落地（flux-react 集成 3 + flux-runtime 单测 1），005/006/4.2-001 各带红证（临时变异实现，复员后提交）；007 带反向红证（临时落地 bug163 修复方向证钉子有判别力）。
- bug163 本体归属落地：roadmap 追加 R2.15 行（Phase 2，MR2.0 追加授权）。
- 四 finding 回填 `closed`（007 附「缺陷本体 open、successor=R2.15」注记）；roadmap R2.2 翻转。

## Non-Goals

- 不改任何实现代码（补测行纪律）；不修 bug163 本体（归 R2.15）；不处理 MA4.1/MA4.2 其余 finding；并发线隔离（ARC 线 content WIP 不入 staging）。

## Scope（必填节）

### In Scope

- `packages/flux-react/src/__tests__/structural-when-runtime-handoff.test.tsx`（新建，005）
- `packages/flux-runtime/src/__tests__/bug30-lastchange-freshness.test.ts`（新建，006——bug-\*.test.ts 命名先例 `bug-validate-overwrite.test.ts`）
- `packages/flux-react/src/__tests__/import-overlay-write-capture.test.tsx`（新建，007，characterization）
- `packages/flux-react/src/__tests__/node-meta-projection-gate.test.tsx`（新建，4.2-001）
- roadmap 追加 R2.15 行（bug163 本体修复 successor，Phase 2）
- `docs/audits/arm2-index.md` 回填 + daily log + roadmap R2.2 翻转（激活/收口两提交）

### Out Of Scope

- 实现代码变更（含 bug163 修复→R2.15）；R2.3-R2.14 与 R3.x；并发线（ARC 719-arc 线 content/react WIP、docs/index.md、platform-hardening-roadmap.md、P0-MA5.1-002 plan）。

## Failure Paths

| 可测场景编号           | 触发                                                      | 行为                                                                              | 可重试 |
| ---------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------- | ------ |
| contract-gap           | 007 探针显示 overlay 写**已**透传（缺陷已消失）           | 停：arm2-index 138 行记录过时，就地勘误并改钉正确语义（升级裁决，不静默钉假现状） | 否     |
| api-shape              | 集成测试 API 形状与规格不符（dispatch/事件/imports 装载） | 以既有同类测试先例（scope-and-reactivity-imports.test.tsx）校正规格，plan 补记    | 是     |
| characterization-drift | 007 钉子在无关提交后翻红                                  | 注记指向本 plan 的现状快照（HEAD `8ae2e4ded`），修复者按 R2.15 改钉正确语义       | 是     |

## Test Strategy

本档选择：**必须自动化**——本 plan 即测试；红证 = 临时变异实现（005 两处、006 两处、4.2-001 一处）+ 007 反向红证（临时落地修复方向一处），变异复员后提交，红证输出入 plan。**诚实边界**（对齐审计 systemic 定性）：`structuralWhen === metaProgram.when`（node-compiler.ts:123 同引用），故「runtime 删 structuralWhen 优先分支但仍评估 meta.when」的纯分支变异在今日树上**行为惰性**——005 守卫钉的是发射面+消费面两端（runtime gating 移除必红、react 门移除必红）；分支优先序仅在编译器未来分化两程序时可观察，作为守卫已知边界记入 plan（不overclaim「任何变异必红」）。

## Execution Plan

### Phase 1 - 四测试落地（005/006/4.2-001 先红〔变异〕后绿；007 先绿〔现状〕再反向红）

Status: pending
Targets: 四测试文件

- Item Types: `Proof`

- [ ] T1（005，flux-react 集成，真 createSchemaRenderer 编译链）：**A** 静态 `when: false` 节点不渲染且挂载探针（自定义 renderer useEffect 记 mount）零次；**B** 控制组 `when: true` 渲染且 mount=1；**C** 表达式 `when: '${gate}'` 初值 false 不渲染 → 经 form setValue 翻转后出现（reactive 回落分支 live）。红证：**M-A** `node-runtime.ts:187-196` 短路 `structuralWhen` 判定为 `true`（bug51 用户可见本体「when:false 仍渲染」）→ A/C 红；**M-B** `node-renderer-resolved.tsx:436` 删 `when === false` 合取项（react 消费面）→ A 红。
- [ ] T2（006，flux-runtime 单测，真 createManagedFormRuntime，沿 bug-validate-overwrite.test.ts 装配惯用法）：**A** `setValue('name','a')` → snap1 = `form.scope.store.getLastChange()`；`setValue('name','b')` → snap2；断言 `snap2 !== snap1`（引用 identity）+ revision 递增 + paths=['name']；**B** `setValues` 两次同样断言 identity 变化（bug30 note 点名双路径）。红证：**M-A** 删 `form-runtime.ts:555-558` setValue 内 `setLastChange({...})` 块 → A 红；**M-B** 删 `form-runtime-values.ts:108` executeSetValues 内 setLastChange 调用 → B 红。
- [ ] T3（007，flux-react characterization，真编译链 + importLoader 惯用法沿 scope-and-reactivity-imports.test.tsx）：**A** 控制组（无 xui:imports）event-text 节点 onClick `{action:'setValue', args:{path:'summary.name', value:'fired'}}` → 兄弟 `${summary.name}` 文本变 'fired'（证 harness 能探测透传，钉子不空转）；**B** 现状钉（容器带 `'xui:imports': [{from:'demo-lib', as:'demo'}]`，写节点与读节点均在容器内）→ 点击后兄弟文本**保持种子值**（写被 overlay ownStore 捕获，缺陷-open 特征行为）。文件头+断言处显式注记：钉的是 HEAD `8ae2e4ded` 的缺陷-open 现状（bug163），修复落地时本测试应随 R2.15 改钉正确语义。反向红证：**M-C** 临时落地修复方向（`runtime-factory.ts` createChildScope 增 `update: (path, value) => parent.update(path, value)` 委托，委托钩子 `scope.ts:440` 在 API 上可行）→ B 翻红（文本变 'fired'）→ 复员。先跑探针确认 B 现状成立（Failure Paths contract-gap 检查），再落钉。
- [ ] T4（4.2-001，flux-react 集成）：同页四普通节点——`visible:false`/`hidden:true`/`when:false`（mount 探针 renderer）+ 可见控制——断言三个 gated 文本均不存在、探针 mount 恰 1（仅控制组）、容器查询零命中。红证：**M-D** `node-renderer-resolved.tsx:436` gate 反转（恒 false，即移除 gate）→ 红（节点渲染 + mount 增至 4）。

Exit Criteria:

- [ ] 四测试绿证 + 五红证留痕：T1 M-A 红 ≥2 / M-B 红 ≥1；T2 M-A 红 ≥2（A 两断言）/ M-B 红 ≥1；T3 M-C 红 1（B 组翻红，A 控制组不受影响）；T4 M-D 红 ≥2——全部复员后 flux-react + flux-runtime 套件全绿（计数实测填入）
- [ ] T3 探针先证现状成立（contract-gap 门通过）

### Phase 2 - 索引回填、successor 归属与收口

Status: pending
Targets: arm2-index、roadmap、daily log

- Item Types: `Proof`

- [ ] roadmap 追加 **R2.15** 行：「运行时修复—imports overlay 写透传+通知链（P1-MA4.1-007 缺陷本体 bug163：overlay update 父委托 + bug163 诊断第 2 层通知链根因；T3 钉子随行改钉正确语义）」 owner `renderer-runtime.md`、Source `MR2.0`、Prompt `test-first-implementation-prompt.md`——位置紧随 R2.14 行
- [ ] arm2-index 四行回填：136（005）/137（006）/141（4.2-001）→ `closed` + 修复行指针更新；138（007）→ `closed` + 行内注记「守护钉子落地（characterization，HEAD 8ae2e4ded 现状）；缺陷本体仍 open（bug163），successor=roadmap R2.15（方向：overlay update 父委托 + 通知链根因，bug163 Successor Required 节）」；Last Updated 滚动
- [ ] roadmap R2.2 `planned`→`done` 翻转（IN closure commit；激活提交先行翻转 `todo`→`planned`）

Exit Criteria:

- [ ] arm2-index :136/:137/:138/:141 状态与注记实测一致（grep 复核）
- [ ] roadmap R2.15 行在场且紧跟 R2.14；R2.2 行 `done`（收口提交内）
- [ ] daily log `docs/logs/2026/10-24.md` R2.2 条目在场（四测试 + 五红证 + 门禁计数 + 诚实边界注记 + R2.15 登记说明）

## Closure Gates

- [ ] 全量门禁：typecheck / build / lint 全包（44/44）+ test 全套件绿（并发线 delta 归因口径沿 722/723 先例）
- [ ] `pnpm check`：零新增红（超出已登记 pre-existing 红名单即停）
- [ ] 五红证全部复员（`git diff` 实现文件为空）
- [ ] 独立 closure audit（fresh sub-agent，输入=plan+diff summary+验证输出）：四 finding 闭环判定、红证判别力复核（变异机制指向旧实现缺陷面）、007 characterization 不越权确认（零实现变更、缺陷-open 注记在场、successor=R2.15 在场）
- [ ] 收口提交（flip `done` IN commit；full-green 状态入提交信息）

## Deferred But Adjudicated

- **007 钉现状 vs 修正确语义**：MA4.1 报告将裁决权交给 MR2（「先钉现状或修复后钉正确语义，随 MR2 裁决」：100）；MR2.0/plan 713 将 007 归入 R2.2 补测行（roadmap :99）未授权修复——**裁决：钉现状（characterization）+ 本体归 R2.15**。修复属行为变更（overlay 写语义 + 通知链根因两处），超出补测行边界；缺陷归属经 R2.15 行落地，不悬空（guide When-Closing 11 / Anti-Slacking）。R2.15 执行时 T3 钉子随行改钉正确语义（测试文件头注记已声明）。
- **005 分支优先序行为惰性边界**：structuralWhen 与 meta.when 今日同引用（node-compiler.ts:123），纯分支变异不可判别——裁决：守卫钉发射面+消费面两端，边界记入 Test Strategy 诚实边界节（review R1 认可，可选合成 TemplateNode 单测强化不采纳——成本收益不成立）。

## Draft Review Record

- R1（fresh sub-agent agent_0915b745，2026-10-24）：**FAIL** 0B/2M/3m——M1 bug163 successor 归属悬空（修复：Phase 2 追加 roadmap R2.15 行 + 138 注记改指 R2.15）；M2 模板结构偏差（修复：Closure Gates 提升为 plan 级五门禁、新增 Draft Review Record / Deferred But Adjudicated / Exit Criteria repo-observable 节）；m1 Status 词表（draft→active 于激活提交）；m2 Phase 2 Item Types 改 `Proof`；m3 引用扩至 form-runtime.ts:539-560 / form-runtime-values.ts:108。锚点核验全部通过（005/006/007/4.2-001 源行、0 命中 grep、bug51 守护文件缺失、三先例惯用法在位）。
- R2（同一评审 agent 复审，2026-10-24）：**PASS 共识** 0B/0M/2m——M1/M2 根因修复确认（归属链端到端闭合、门禁复位模板位、44/44 计数核实）；m1' 追加授权引用精确化（已并入激活提交：roadmap :250 + MR2.0 行）；m2' 补 `## Non-Blocking Follow-ups` 节（已并入）。准予 `active`。

## Non-Blocking Follow-ups

- 无（bug163 本体已归 R2.15 successor，非本 plan 剩余工作）。

## Closure

- [ ] R2 复审共识（PASS）后激活提交（Status→`active` + roadmap R2.2 `todo`→`planned` IN commit）
- [ ] 执行 Phase 1/2 → Closure Gates 全过 → closure audit PASS → 收口提交（Status→`completed`、flip `done` IN commit、记录复核结论于本节）
