# 726 审计修复 R2·R2.4：契约补测—form/data 族（P1-MA4.2-003/004/005 + MR4.0 案 B 归并注记）

> Plan Status: completed
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` R2.4（MR2.0/plan 713 展开；MR4.0/plan 718 案 B：4.2-002 capability 族成员归并 R3.12，本行名已收窄 003/004/005）；`docs/audits/2026-10-21-1330-arm2-MA4.2-basic-tests.md` §P1-MA4.2-003/004/005（各含最小补强规格）；owner doc `docs/architecture/form-validation.md`（003 校验参与承诺）+ `docs/architecture/action-scope-and-imports.md:664-677`（004 乱序治理承诺）
> Related: MR4.0 裁决区案 B（4.2-002 ∈ 9.2-001 五成员族 → R3.12 canonical）；先例 plan 723/724（同构契约补测全链）
> 编号 runway：725 为 R2.3（本线）；726 本 plan；ARC 线从 727 起避开

## Purpose

为 form/data 族三条「关键契约零判别测试」finding 补测：003 array-field 标量子项 required 校验链（发布+recurse-submit ~100 行生产代码零引用）；004 CRUD/Form stale-result 治理族（runtime 有 unit、form 有 mock 测试、e2e 有偶发网——三层各一块绿灯但无一层对「乱序到达」有判别断言）；005 serverPagination 响应纠正写回（实现孤岛，全包测试 0 命中）。三条 finding 回填 `closed`。本行为纯补测（零实现变更），案 B 归并注记已在 roadmap 行名与 arm2-index 指针在案（4.2-002 修复行=R3.12，本行不处置）。

## Current Baseline（2026-10-24 live，HEAD `b7976664c` 实测）

- **003**：`packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx:431-456`（registerField validate→collectScalarArrayItemErrors）+:464-516（registerChildContract recurse-submit 契约 getState/triggerValidation→publishScalarArrayItemErrors，triggerValidation :495-509）；`scalarItemRequired = scalarItemField?.required === true`（:299）。全包测试对链 grep 0 引用（复核）；唯一相关件 `array-field-schema-coverage.test.tsx:32-67` 仅断言 label 存在。测试惯用法：`array-field-v12f-add-icon.test.tsx`（array-field schema 形状 `itemKind:'scalar'` + `item:[{type:'input-text'}]`）、`b32-array-submit-and-validate.test.tsx`（renderSchema 全 defs + submitAction ajax + makeCapturingFetcher + `[data-slot="field-error"]` 断言）。
- **004**：`packages/flux-renderers-data/src/crud-renderer-load.ts:293-302`（cancelled settle 早退——"A newer dispatch owns loading state"）；loadAction probe 惯用法 `crud-loadaction-infinite.test.tsx`（`createDataSchemaRenderer` + `onActionScopeChange` registerNamespace('probe',{kind:'host',invoke}) 返回 `{ok:true,data}`）；二次加载触发器惯用法 `crud-query-and-pagination.test.tsx:182`（toolbar button `onClick:{action:'component:refresh', componentId}`→loadResult.reload() 代际递增）；load-state 属性 `crud-renderer.tsx:543` `data-load-state`。
- **005**：`crud-renderer-load.ts:336-343`（serverPagination 纠正写回 `paginationStatePath`）+ `crud-renderer-state.ts:325-345`（响应顶层 `page|currentPage`/`pageSize|perPage` → serverPagination 提取）+ `:415` 注释自认循环防护 "Fix 3 once implemented" 未落地、循环 "self-stabilizing (at most 1 extra fetch)"。现有测试 makePageData 已带 page/pageSize（纠正面被无谓踩过但从未断言）；`paginationStatePath` 默认 `${ownerStatePath}.pagination`（crud-renderer-ownership.ts:62）。
- roadmap R2.4 行 `todo`（:101）；arm2-index :143（003）/:144（004）/:145（005）状态 `open`、修复列 R2.4；4.2-002 行指针已归 R3.12（案 B 已落，本行无动作）。

## Goals

- 三条契约测试落地（form-advanced 集成 1 + data 集成 2），各带红证（临时变异实现，复员后提交）。
- 三 finding 回填 `closed`；roadmap R2.4 翻转。

## Non-Goals

- 不改任何实现代码（补测行纪律——005 的循环防护 "Fix 3" 缺口保持现状，测试钉的是「自稳定至多 1 次额外 fetch」的现行为）；不处置 4.2-002（归 R3.12）；不处理 MA4.2 P2/P3 区；并发线隔离。

## Scope（必填节）

### In Scope

- `packages/flux-renderers-form-advanced/src/__tests__/array-field-scalar-required-submit.test.tsx`（新建，003）
- `packages/flux-renderers-data/src/__tests__/crud-stale-result-governance.test.tsx`（新建，004）
- `packages/flux-renderers-data/src/__tests__/crud-server-pagination-writeback.test.tsx`（新建，005）
- `docs/audits/arm2-index.md` 回填 + daily log + roadmap R2.4 翻转（激活/收口两提交）

### Out Of Scope

- 实现代码变更；4.2-002（R3.12）；R2.5-R2.15 与 R3.x；并发线（ARC WIP、docs/index.md、platform-hardening-roadmap.md、P0-MA5.1-002 plan）。

## Failure Paths

| 可测场景编号 | 触发                                                            | 行为                                                                                 | 用户可见表现         | 可重试 |
| ------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------- | ------ |
| api-shape    | 集成 API 形状与规格不符（probe/refresh/submit 接线）            | 以既有同类测试先例校正规格，plan 补记                                                | 不适用（测试行为面） | 是     |
| timing-flake | 乱序/纠正场景在 CI 假时钟下不稳定                               | 用确定性 deferred（手动 resolve）而非真实延时；仍不稳则 plan 补记并改双 waitFor 结构 | 不适用               | 是     |
| contract-gap | 写测试中发现契约本身与审计描述不符（如 005 写回路径已带 Fix 3） | 停：就地勘误 arm2-index 行并按实际契约钉正确语义                                     | 不适用               | 否     |

## Test Strategy

本档选择：**必须自动化**——本 plan 即测试；红证 = 临时变异实现（每测试一处），变异复员后提交，红证输出入 plan。判别机制（Rule 13）：003 变异共享根（collectScalarArrayItemErrors 直返 []，同时瘫痪 registerField validate 与 triggerValidation 两路）→ 错误不出现 + submit 穿透（fetcher 被调）→ 双断言红；004 去掉 cancelled 代际早退（onSettle 无条件 settle）→ cancelled 结果走 !ok 分支翻 error 态（新请求的状态所有权被破坏）→ data-load-state 保持 ready 断言红；005 删纠正写回块（其本身即唯一二次加载触发器）→ 无第二次调用（或 bindings 仍 page-1 形状）→ 红。

## Execution Plan

### Phase 1 - 三测试落地（各先红后绿）

Status: completed
Targets: 三测试文件

- Item Types: `Proof`

- [x] T1（003，form-advanced 集成，renderSchema 全 defs 惯用法）：`tags:['']` + array-field itemKind scalar + item input-text required + submitAction ajax（makeCapturingFetcher 捕获）+ submit 按钮 → 断言：提交后 `[data-slot="field-error"]` 出现（required 消息）**且** fetcher 调用数 0；随后填值再提交 → fetcher 调用数 1（证拦截因校验而起，非空转）。红证：**M-A**（review R1 B1 勘正——registerField validate 路径与 recurse-submit 路径独立并存，单删一支仍有另一支守护，必须变异共享根）`collectScalarArrayItemErrors` 改直返 `[]`（共享根，同时瘫痪 ：431-456 registerField validate 与 ：495-509 triggerValidation）→ 错误不出现 + fetcher 被调 → 红。
- [x] T2（004，data 集成，probe + component:refresh 惯用法；**probe 必须 abort-aware**——review R1 B2：宿主 namespace invoke 结果被直接 await 无 abort 竞态，非 abort-aware 的 late resolve 会以 ok:true 进 onSettle，绿代码也会投影 Stale 行）：probe invoke 将返回值与 `ctx.signal` 竞速——signal abort 时 reject AbortError（`crud-loadaction-infinite.test.tsx:52` 证 ctx.signal 在场；reject 经 dispatch 吞出于 crud-renderer-load.ts:400，无 unhandled rejection）。流程：page-mode crud + loadAction probe——第 1 次调用挂起 deferred；点击 toolbar refresh（component:refresh→loadResult.reload() 代际递增+abort 前 controller）→ 第 2 次调用同步返回 'Fresh-' 行 → waitFor 可见；此时 resolve 第 1 次为 'Stale-' 行 → 断言：'Stale-' 零出现、'Fresh-' 行仍在、crud 根 `data-load-state` 保持 `ready`（新请求 own loading；被 abort 的旧结果以 `{ok:false,cancelled:true}` 进 onSettle 走 ：293 早退）。红证：**M-B** `crud-renderer-load.ts` onSettle 删 `result.cancelled` 早退分支（无条件 settle）→ cancelled-not-ok 结果进入 `!result.ok` 分支（:298-308）→ load-state 翻 `error`/错误 notify → T2 的 `data-load-state` 保持 ready 断言红（红证语义=「旧请求不再 own 状态」被破坏，非「Stale 行出现」）。
- [x] T3（005，data 集成，probe 惯用法）：loadAction probe 恒响应 `{items:[page-3 rows], total:500, page:3, pageSize:50}`（顶层 page/pageSize = 纠正形状）→ 断言：第二次 load 调用的 `evaluationBindings.pagination` 为 `{currentPage:3, pageSize:50}`（纠正写回生效）+ load 调用总数有界（≤3，自稳定无循环；自稳定注记：现行为至多 1 次额外 fetch，Fix 3 缺口不钉死具体次数）+ 渲染行与 page-3 数据一致。红证：**M-C** 删 `crud-renderer-load.ts:336-343` 纠正写回块（其本身即唯一二次加载触发器）→ 无第二次调用（或 bindings 仍 page-1 形状）→ 红。〔review R1 m2〕

Exit Criteria:

- [x] 三测试绿证 + 三红证留痕：**M-A** 红 1（collectScalarArrayItemErrors 直返 []→required 断言与 fetcher 零调用断言红）；**M-B** 红 1（cancelled 早退禁用→onError 收到 loadAction failed）；**M-C** 红 1（写回块删除→无第二次调用，loadBindings[1] undefined）——变异均 git checkout 复员，实现文件 diff 空。〔执行注记二则：①scalarItemRequired 源自 scalarItemValidation 元数据非 item 内 input required（array-field.tsx:291-299），规格以 coverage-test 惯用法校正；②「错误消息出现」以发布目标面 fieldStates 探针判别（array-field 标量项无项级错误渲染槽，Probe 双腿确认 submit 阻断+放行行为契约完整）〕
- [x] form-advanced + data 两包套件全绿：form-advanced 175 文件/1225 用例、data 187 文件/1263 用例（并发线 form-advanced 同包 in-flight 编辑〔composite-schemas.ts + detail-view 测试删除，非本 plan 范围〕如实归因——首跑全仓 2 红为并发中间态，隔离复跑与本绿窗复核均净）

### Phase 2 - 索引回填与收口

Status: completed
Targets: arm2-index、roadmap、daily log

- Item Types: `Proof`

- [x] arm2-index 三行回填：:143（003）/:144（004）/:145（005）→ `closed` + 注记（含红证机制）；4.2-002 案 B 注记核对不动（指针 R3.12 已在）；Last Updated 滚动（open 56→53）
- [x] roadmap R2.4 `planned`→`done` 翻转（IN closure commit；激活提交 73b7b11ca 已先行翻转）

Exit Criteria:

- [x] arm2-index 三行状态与注记实测一致（open 56→53 grep 复核）；roadmap R2.4 行 `done`（收口提交内）
- [x] daily log R2.4 条目在场（随收口落）

## Closure Gates

- [x] 全量门禁：typecheck 44/44 + build 44/44 + lint 44/44 + test 82/82（绿窗复核；并发 ai 包一次模块级 React max-depth 误红复跑 104/104 全绿归因 flake；并发 form-advanced 同包 in-flight 2 红隔离复跑归因并发中间态）
- [x] `pnpm check` 全链绿（并发 ARC console-baseline 红已由该线自行消除；knip-baseline 3 hits 本轮处置：stryker.formula.conf.mjs 注册 files + audit:mutants:formula script、R1.4 barcode-media-io 2 类型注册〔INV-2 待人审的 in-design API，注记披露遮蔽机制〕；mobile 线 2 类型由该线自行注册）
- [x] 三红证全部复员（array-field-scalar-validation.ts / crud-renderer-load.ts git diff HEAD 空）
- [x] 独立 closure audit（fresh sub-agent `agent_0fde7d3a`，输入=plan+diff summary+验证输出）：**approved** 0B/0M/2m（m1 ARC bffaea342 swept T1 入其 arc-component-gap 提交〔出处注记随收口提交，T1 不再重复 staging〕；m2 T3「恰 2 次」措辞弱化建议随下次触碰）——checklist 1-8 全 PASS，auditor 独立重演全部 3 变异逐一同色 + 复员干净 + open 53 程序化验证 + check 全链独立复跑 exit 0
- [x] 收口提交（flip `done` IN commit；记录复核结论）

## Deferred But Adjudicated

- **005 循环防护口径**：MA4.2 报告指出实现注释自认 "Fix 3 once implemented" 未落地——本行为补测行，钉的是**现状**（自稳定至多 1 次额外 fetch），断言用「调用总数有界 ≤3」而非「恰 2 次」，为未来 Fix 3 落地留兼容空间；Fix 3 本体修复归后续行（若 MV/后续审计判定需要）。Classification: optimization candidate。Successor Required: 暂否（Fix 3 非审计排定工作项，缺口已在 arm2-index 实现注记在案）。
- **004 治理族边界**：runtime 层竞态面（MA4.1 C 轮最强面）已有 unit，本行只钉渲染器消费侧（data 包真实入口乱序场景）——form 段 F-02（mock 后验证）缺口属过度 mock 模式，其修复（若需）随 family 后续行。Classification: watch-only residual。Successor Required: 否（最小补强规格即本行范围）。

## Draft Review Record

- R1（fresh sub-agent agent_6362b928，2026-10-24）：**FAIL** 0B/2M/3m——B1 M-A 非判别（registerField 与 recurse-submit 两路独立并存，单删一支另一支仍守护→变异改共享根 collectScalarArrayItemErrors 直返 []）；B2 T2 非 abort-aware（宿主 invoke 直接 await 无 abort 竞态，late resolve 以 ok:true 进 onSettle 绿代码也投影 Stale→probe 与 ctx.signal 竞速 + 红证语义改写为状态所有权破坏）；m1 行号 :464-516、m2 T3 红措辞（写回块=唯一二次触发器）、m3 Deferred 缺 Classification/Successor 标签。B1/B2 深链证据：form-runtime-owner.ts:506-531、action-execution.ts:456-465、crud-renderer-load.ts:400 等 live 链全核。
- R2（同一评审 agent 复审，2026-10-24）：B1/B2 实质确认已解（判别力经 live 链验证）；**M1** Test Strategy 行 003/005 子句残留旧措辞（已随本激活提交统一）；m1' Classification 词表（已改 optimization candidate / watch-only residual）；m2' 全角！（已改）。M1/m1'/m2' 落地后达成 **pass-with-minors 共识**（评审者预设路径：应用即零 B/M，准予 active）。

## Non-Blocking Follow-ups

- 无（003/004/005 最小补强即全量规格；P2/P3 区审计已记录不排工作项）。

## Closure

- [x] R2 共识（pass-with-minors，M1/m1'/m2' 随激活落）后激活提交（Status→`active` + roadmap R2.4 `todo`→`planned` IN commit `73b7b11ca`）
- [x] 执行 Phase 1/2 → Closure Gates 全过 → closure audit **approved**（`agent_0fde7d3a`，0B/0M/2m）→ 收口提交（Status→`completed`、flip `done` IN commit）
- [x] Closure audit 记录：三变异独立重演全部同色（M-A 红 1/M-B 红 1/M-C 红 1）+ 复员后 diff 空 + 三测试复跑绿；open 53 程序化核验（73 行全 tokenized 零歧义）；knip 注册处置核验 exit 0；T1 出处注记（ARC bffaea342 sweep，非本线提交引入）；「恰 2 次」措辞与 ≤3 断言一致性核可（下次触碰弱化）。
- [ ] 执行 Phase 1/2 → Closure Gates 全过 → closure audit PASS → 收口提交（Status→`completed`、flip `done` IN commit、记录复核结论于本节）
