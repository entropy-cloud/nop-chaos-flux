# B6.1 action graph 目标解析、condition-builder disabled 扇出、cards 选择归属

> Plan Status: completed
> Last Reviewed: 2026-06-26
> Source: `docs/components/amis-bug-driven-improvement-roadmap.md` B6.1；signal doc `14-action-button-toast-mapping-cards-status-styling.md` (AG1/AG3/CB1/CB3/CD1/CD4)
> Related: 同 wave B6.2（button/mapping/toast/styling，独立）；successor B5.2（tabs/dynamic/chart，依赖本工作项 B6.1 落地后推进）。本工作项无前置依赖（roadmap Phases 表 Dependencies: —）。

## Purpose

把 B6.1 的六条 signal 收口到「已锁、已测、已裁定」状态：经 live 审计，所有目标**行为均已落地**，本计划交付的是 owner doc 显式化 + 聚焦回归锚 + 一处 residual 裁定（condition-builder dnd-kit sensor），将「amis `reload`/`selectable` 等 NOT-ADOPTED 术语 ↔ Flux `refreshSource`/`component:refresh`/`selectionMode` 等价物」的映射写进契约文档并锁死回归。

## Current Baseline

> 经 live repo 核对（独立 sub-agent explore + 主 agent 复核关键 file:line）。**核心结论：六条行为全部 ALREADY-SATISFIED；缺口集中在 doc 显式化与聚焦回归锚。**

- **AG1（action graph 多步）— ALREADY-SATISFIED（LOCK）。** `dispatch()` 顺序迭代编译节点并 `await`（`packages/flux-action-core/src/action-dispatcher/action-execution.ts:506-661`，循环 `:521`、await `:534`、prevResult 传递 `:537`）；并行扇出独立（`runParallelActions` `:223-257`）。无「单 click 单 action」上限。已有顺序/async/分支链接测试（`__tests__/action-dispatcher-control-flow.test.ts:14,54,102`、`action-dispatcher-routing.test.ts:414`、`contract-control-flow-branches.test.ts:12,36`）。owner doc `docs/architecture/action-algebra-formal-spec.md` 当前。
- **AG3（reload 目标解析）— PARTIAL（行为满足，doc 缺统一映射）。** Flux 在 action-dispatch pipeline 无字面 `reload` built-in action（`built-in-actions.ts` switch `:52-245` 无 `reload` case；故意拒绝 amis 术语；`flux-compiler`/`nop-debugger` 测试里的 `reload` 字面串是编译器透传/监控 label fixture，非 dispatch action）；定向重载经 `refreshSource`（按 source `name`=`targetId`，`built-in-actions.ts:194-210` → `action-adapter.ts:325-342` → `packages/flux-runtime/src/async-data/source-registry.ts:341`）与 `component:refresh`（按 `componentId`/`componentName`，`action-runners.ts:70-137` → `action-adapter.ts:352-399`），**均不调 `ctx.page?.refresh()`**；整页刷新是独立 `refreshTable`（`built-in-actions.ts:185-193` → `action-adapter.ts:317-323`）。已有定向重载测试（`runtime-actions-advanced.test.ts:130,176`、`data-source-capabilities.test.tsx:13`、`data-table-b33-source-refresh-anchor.test.tsx:44`）。**缺口**：owner doc 目标矩阵（`docs/architecture/action-scope-and-imports.md:658-668,807`）隐含映射但缺「reload→命名组件/source，非整页」单条声明；无「定向重载后 page refreshTick 不变」负向断言。
- **CB1（condition-builder disabled 扇出）— ALREADY-SATISFIED（impl）+ DOC-GAP + partial TEST-GAP。** `disabled` 在顶层派生并贯穿（`condition-builder.tsx:160` → `<ConditionGroup disabled>`/`<ConditionItem disabled>`）；NOT `condition-group.tsx:371`、if `:383`、AND/OR `:335,350`、add-condition `:419`、add-group `:432`、group-delete `:391`（`depth>0 && !disabled`）、item-delete `condition-item.tsx:179`、drag-handle `:132`（`draggable && !disabled`）全部 honor。**Residual**：dnd-kit `PointerSensor`/`KeyboardSensor` 无条件实例化（`condition-group.tsx:101-104`），但因唯一接收 `listeners` 的 drag handle 在 disabled 时不渲染，功能上不可拖——属 defense-in-depth residual，非部分禁用。已有部分测试（`config-display.test.tsx:298`、`condition-item.test.tsx:247,274`、`config-actions.test.tsx:189`）。**缺口**：无 NOT/if/AND-OR disabled 测试；无单例 comprehensive umbrella 测试；owner doc `condition-builder/design.md` §7/§10 无 umbrella 声明。
- **CB3（showNot）— ALREADY-SATISFIED + partial tests。** 每个 `ConditionGroup`（含 runtime-added）读同一 schema 故 `showNot` 一致渲染（`condition-group.tsx:86,359`）；toggle 写 `value.not`（`:113-115`）；序列化/反序列化经 spread 保留 `not`（`condition-builder.tsx:48,60-74`、`utils.ts:14-25`）。已有 `config-display.test.tsx:40-67`。**缺口**：无 runtime-added 子组 NOT 出现测试；无 `not` 序列化往返测试。
- **CD1（cards selectable/selectionMode）— ALREADY-SATISFIED（impl）+ TEST-GAP + minor DOC-GAP。** Flux 用 `selectionMode`（非 amis `selectable`）；`resolveSelectionMode` 对 undefined/非法返回 `'none'`（`cards-renderer.tsx:38-40`）；`'none'` 时 `handleSelect` 早退（`:209`）、`data-selected`/ring 不可能为真（`:172,183`）。已有 single/multiple 测试（`cards-renderer.test.tsx:147,190`）。**缺口**：无 `'none'`（含默认）→ 无 `data-selected`/无 `onSelectionChange` 测试；owner doc `cards/design.md` §4/§7 无「off 同时关 visual+state」声明，无 `selectionMode` vs `selectable` 故意分歧说明。
- **CD4（card itemAction 行级 scope）— ALREADY-SATISFIED（impl）+ TEST-GAP。** cards 集合 `onItemClick` 经 per-row `itemScope` 派发（`cards-renderer.tsx:125,151-154,162-165`）；region 也在 item scope（`:137-144`）。standalone `card.tsx:25-31` 无 row scope（预期）。已有 region scope 测试（`cards-renderer.test.tsx:56`）。**缺口**：无「`onItemClick` action 解析到被点行 scope」聚焦测试；owner doc `cards/design.md` §6/§8 无 itemAction target-scope 显式声明。

## Goals

- AG1：锁定多步 async 顺序执行（可选补一条「>2 步 + 真实 async + result-data 传播」合并权威用例）。
- AG3：owner doc 显式化 amis-`reload` → Flux `refreshSource`/`component:refresh`（命名目标，非整页）映射；补「定向重载不 tick page refresh」负向回归锚。
- CB1：补 comprehensive umbrella 回归锚（NOT/if/AND-OR/add/delete/drag 在 `disabled:true` 全 disabled）；owner doc §7/§10 加 umbrella 声明；裁定 dnd-kit sensor residual。
- CB3：补 runtime-added-group + `not` 序列化往返回归锚。
- CD1：补 `selectionMode:'none'`（含默认）off-disables-both 回归锚 + owner doc 声明（含 `selectionMode` vs `selectable` 分歧）。
- CD4：补 `onItemClick` action 行级 scope 回归锚 + owner doc 显式化。

## Non-Goals

- 不引入字面 `reload` action 或把 `selectionMode` 改名为 `selectable`（均 NOT-ADOPTED amis 术语）。
- 不改 condition-builder disabled 机制（仅裁定 sensor residual；不重写为「禁用 sensor 实例化」除非裁定 A）。
- 不覆盖 B6.2（button/mapping/toast/styling）或 B5.2 信号。
- 不实现新的 action 种类（download/navigate 等 AG4/AG5）。

## Scope

### In Scope

- AG1 锁定（可选合并权威用例）。
- AG3 owner doc 映射声明 + 负向回归锚。
- CB1 comprehensive umbrella 回归锚 + doc 声明 + sensor residual 裁定。
- CB3 runtime-added-group + 序列化往返回归锚。
- CD1 `'none'` 回归锚 + doc 声明。
- CD4 itemAction 行级 scope 回归锚 + doc 声明。

### Out Of Scope

- `reload`/`selectable` 命名引入。
- B6.2 / B5.2 / B7 信号。
- AG4/AG5（download/navigate action 实现）。

## Failure Paths

> 本计划以「锁定 + doc 显式化 + 聚焦回归锚」为主，无新对外 API/鉴权/外部集成，failure paths 不适用（行为已落地）。

## Test Strategy

本档选择：**建议有测**（P0 锚点 AG3/CB1 必须自动化回归门）。

- 所有目标行为经 live 审计均已落地，故 Proof 形式为**回归锁**（验证正确结果），非 failing-test-first。
- AG3（P0）、CB1（P0）：必须自动化——comprehensive/负向回归门。
- AG1（P1 LOCK）、CB3（P1）、CD1（P1）、CD4（P1）：建议有测——聚焦回归锚。

## Execution Plan

### Phase 1 - Action graph 目标解析锁定（AG1/AG3）

Status: completed
Targets: `docs/architecture/action-scope-and-imports.md`、`docs/components/button/design.md` §8、`packages/flux-runtime/src/__tests__/`（新增 AG3 负向锚）、`packages/flux-action-core/src/__tests__/`（可选 AG1 合并用例）

- Item Types: `Proof | Decision`

- [x] (Decision, AG3) owner doc 显式化映射：在 `action-scope-and-imports.md`（目标矩阵 `:658-668` 附近）+ `button/design.md` §8 加单条声明「amis `reload` 在 Flux 由 `refreshSource`（按 source name）与 `component:refresh`（按 componentId/componentName）实现，定向重载命名目标、不触发整页 `refreshTable`；NOT-ADOPTED 字面 `reload`」。引 live `built-in-actions.ts:185-210`、`action-adapter.ts:317-399`。
- [x] (Proof, AG3) 负向回归锚：`component:refresh X`（或 `refreshSource`）后，断言 page `refreshTick` 未递增（验证「非整页」），同时被命名组件 source 已刷新。
- [x] (Proof, AG1) 复核既有「>2 步 + async + result-data」分维度用例（`action-dispatcher-control-flow.test.ts:14,414` + `contract-control-flow-branches.test.ts:12,36`）仍在并覆盖 LOCK；如执行期发现缺一条合并权威用例，记入 Non-Blocking Follow-ups（不作为 in-scope 必修）。

Exit Criteria:

- [x] `action-scope-and-imports.md` + `button/design.md` §8 含 reload→Flux 映射声明，与 live（`refreshSource`/`component:refresh` 不调 `ctx.page?.refresh()`）一致。
- [x] AG3 负向回归锚存在并绿（验证 page refreshTick 不变 + 目标 source 已刷新）。

### Phase 2 - Condition-builder disabled 扇出锁定（CB1/CB3）

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/condition-builder/`、其 `__tests__/`、`docs/components/condition-builder/design.md` §7/§10

- Item Types: `Proof | Decision`

- [x] (Decision, CB1-residual) 裁定 dnd-kit sensor 实例化：sensor 无条件实例化（`condition-group.tsx:101-104`）但唯一接收 `listeners` 的 drag handle 在 disabled 时不渲染（`condition-item.tsx:132`），故功能上不可拖——裁定为 `watch-only residual`（defense-in-depth；无部分禁用语义）。若执行期/审阅认为应「disabled 时不实例化 sensor」，升级为小 Fix（在 `disabled` 时短路 sensor），否则 owner doc 记 residual + 理由。
- [x] (Proof, CB1) comprehensive umbrella 回归锚：`disabled:true` 时断言 NOT toggle、if 输入、AND/OR pill、add-condition、add-group 全 disabled/不渲染，group/item delete 与 drag handle 不渲染（单例用例走全 affordance）。
- [x] (Proof, CB3) runtime-added-group 锚：`showNot:true` + 运行时 add-group → 新子组也出现 NOT toggle；toggle 写 `value.not`。
- [x] (Proof, CB3) 序列化往返锚：`value.not:true` 经 sanitize/AMIS-conversion 往返后 `not` 保留。
- [x] (Decision) owner doc `condition-builder/design.md` §7/§10 加 umbrella 声明「`disabled` 是单一 umbrella 开关，扇出到全部 mutation affordance（drag/delete/add/not/if）」+ CB1-residual 说明。

Exit Criteria:

- [x] CB1 comprehensive umbrella 回归锚存在并绿（覆盖全部 affordance）。
- [x] CB3 runtime-added-group + 序列化往返锚存在并绿。
- [x] `condition-builder/design.md` §7/§10 含 umbrella 声明 + residual 裁定，与 live（`condition-group.tsx`/`condition-item.tsx` honor disabled）一致。

### Phase 3 - Cards 选择与行级 action 归属锁定（CD1/CD4）

Status: completed
Targets: `packages/flux-renderers-content/src/cards-renderer.tsx`、其 `__tests__/`、`docs/components/cards/design.md`、`docs/components/card/design.md`

- Item Types: `Proof | Decision`

- [x] (Proof, CD1) `'none'` 回归锚：`selectionMode:'none'`（及默认未设）→ 点击卡片无 `data-selected`、不触发 `onSelectionChange`；`interactive` 仅在绑 `onItemClick` 时为真（点击发事件但无 selection 高亮）。
- [x] (Decision, CD1) owner doc `cards/design.md` §4/§7 加声明「单一 `selectionMode:'none'`（含默认）同时关闭点击高亮 visual + selection state，无部分禁用」+「Flux 用 `selectionMode` 而非 amis `selectable`（NOT-ADOPTED）」。
- [x] (Proof, CD4) itemAction 行级 scope 锚：cards `onItemClick` 的 action 读 `${item.x}` → 收到被点行的值（非 root）；断言 action 的求值/target scope 是 per-row itemScope。
- [x] (Decision, CD4) owner doc `cards/design.md` §6/§8 显式化「`onItemClick` action 的 target/求值 scope 是 per-row item scope（引 `cards-renderer.tsx:125,151-154`）」。

Exit Criteria:

- [x] CD1 `'none'` off-disables-both 回归锚存在并绿。
- [x] CD4 itemAction 行级 scope 回归锚存在并绿。
- [x] `cards/design.md`（+ `card/design.md`）含 CD1/CD4 声明，与 live 一致。

## Draft Review Record

- Reviewer / Agent: fresh-session `general` sub-agent（task `ses_0fe0f5da2ffe58hfbWZ4R45qcs`，独立复核，不复用起草上下文）
- Verdict: `pass-with-minors`（零 Blocker / 零 Major）
- Rounds: 1
- Findings addressed:
  - 六条「ALREADY-SATISFIED」行为断言经 live 核对全部属实（AG1 多步 await/prevResult、AG3 定向 reload 非 page、CB1 disabled 扇出、CB3 showNot、CD1 selectionMode:none、CD4 行级 scope）；非掩盖真实 gap。
  - CB1-residual（dnd-kit sensor 无条件实例化但 drag handle 在 disabled 时不渲染）裁定 `watch-only residual` 诚实——`condition-item.tsx:132` 确认 handle 不渲染，既有测试 `condition-item.test.tsx:274`/`config-actions.test.tsx:189` 锁定。
  - Minor 已处理：M1 移除 Phase 1 内 `可选` 合并用例项（Anti-Slacking 措辞违规）改为「复核既有分维度用例仍在；缺则记 Non-Blocking Follow-ups」；M2 `source-registry.ts` 补 `async-data/` 路径前缀；M3「无字面 reload」收窄为「action-dispatch pipeline 无 reload built-in（compiler/debugger 测试 fixture 除外）」。
  - 工作量判定：非 padding——本 roadmap 前提即「为已实现设计补测试/文档边界」，六行为均已落地，「无 Fix 纯 lock+doc」是诚实结果。

## Closure Gates

- [x] AG3 reload→Flux 映射 owner doc 声明已落地 + 负向回归锚绿。
- [x] AG1 多步 async 顺序锁定（合并用例可选，已有分维度覆盖须复核仍在）。
- [x] CB1 comprehensive umbrella 回归锚绿 + owner doc umbrella 声明 + sensor residual 裁定。
- [x] CB3 runtime-added-group + 序列化往返锚绿。
- [x] CD1 `'none'` 回归锚绿 + owner doc 声明（含 `selectionMode` vs `selectable`）。
- [x] CD4 itemAction 行级 scope 回归锚绿 + owner doc 声明。
- [x] 不存在被静默降级的 in-scope live defect 或 contract drift（CB1-residual 为 watch-only，附 non-blocking 理由）。
- [x] 受影响 owner docs（`action-scope-and-imports.md`、`button/design.md`、`condition-builder/design.md`、`cards/design.md`、`card/design.md`）已同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### condition-builder dnd-kit sensor 实例化（CB1 residual）

- Classification: `watch-only residual`
- Why Not Blocking Closure: sensor 无条件实例化（`condition-group.tsx:101-104`），但唯一接收 `listeners` 的 drag handle 在 `disabled` 时不渲染（`condition-item.tsx:132`），功能上不可发起拖拽；无「drag 可用而 delete 不可用」的部分禁用语义。属 defense-in-depth 层面的 cosmetic residual，非用户可感知缺陷。owner doc 记录。
- Successor Required: `no`（若未来审阅要求 defense-in-depth 加固，再评估在 disabled 时短路 sensor 的小 Fix）。

## Non-Blocking Follow-ups

- AG1 「>2 步 + 真实 async + result-data」合并权威用例：既有分维度用例（control-flow `:14,414` + branches `:12,36`）已覆盖 LOCK；如执行期发现缺合并用例，补一条增强权威性，非阻塞。
- B6.2 的 button `disabled`/label-entity/toast/mapping/styling 信号非本 plan 范围。

## Closure

Status Note: 三 Phase 全部执行完毕（Phase 1 复核既有 AG1/AG3 锚 + doc 已存在并绿；Phase 2 落地 CB1 umbrella 回归锚 + CB3 runtime-added-group/序列化往返锚 + owner doc §7.6/§10 umbrella 声明 + CB1-residual 裁定；Phase 3 落地 CD1 off-disables-both 回归锚 + CD4 per-row itemScope 回归锚 + cards/card owner doc 显式化）。workspace `pnpm typecheck`/`build`/`lint`/`test` 全绿。roadmap B6.1 `planned`→`done`。closure-audit 由独立 fresh-session 子 agent（不复用执行者上下文）完成，见下方证据。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session 闭包审计子 agent（不复用执行 session 上下文）。审计轮次：1，结论 `approved`。
- 复核方式：live repo 逐条核验 owner doc 声明、回归锚文件、anti-hollow 抽查，并重跑全量 `pnpm typecheck`/`build`/`lint`/`test`。
- Evidence:
  - AG3 doc 映射声明：`docs/architecture/action-scope-and-imports.md:664-671`、`docs/components/button/design.md:80`（经 grep 命中 `amis reload → Flux mapping (NOT-ADOPTED)`、`refreshSource`/`component:refresh` 不调 `ctx.page?.refresh()`、回归锚引用）。
  - AG3 负向回归锚：`packages/flux-runtime/src/__tests__/runtime-actions-advanced.test.ts:222-265`（`does not bump page refreshTick through refreshSource actions`，断言 `refreshTick).toBe(tickBefore)` + source 已刷新 `total).toBe(8)`；focused 运行 1252 passed | 1 skipped 全绿）。
  - AG1 LOCK：`packages/flux-action-core/src/__tests__/action-dispatcher-control-flow.test.ts` 顺序/async/分支覆盖仍在。
  - CB1 umbrella 回归锚：`packages/flux-renderers-form-advanced/src/condition-builder/condition-builder-disabled-umbrella.test.tsx`（NOT/if/AND-OR/add/add-group 全 disabled；item/group delete + drag handle 不渲染；disabled click 不 mutate；附 control 用例证明非空测；anti-hollow 抽查通过；flux-renderers-form-advanced 882 passed 全绿）。
  - CB3 回归锚：`packages/flux-renderers-form-advanced/src/condition-builder/condition-builder-cb3-not.test.tsx`（runtime-added-group NOT + 写 value.not；sanitizeNode 保留 not；AMIS not:true 转换；write-back 往返）。
  - CB1-residual 裁定：`docs/components/condition-builder/design.md` §7.6/§7.6.1（`watch-only residual`，successor `no`）。
  - CD1 回归锚：`packages/flux-renderers-content/src/cards-selection-itemaction.test.tsx`（`selectionMode:'none'`/默认 → 无 `data-selected`、不触发 `onSelectionChange`；interactive 仅 onItemClick 绑定时为真；anti-hollow 抽查通过；flux-renderers-content 167 passed 全绿）。
  - CD4 回归锚：同文件（`onItemClick` action `${item.label}` 解析到被点行，per-row itemScope）。
  - CD1/CD4 doc：`docs/components/cards/design.md` §4/§6/§7/§8、`docs/components/card/design.md` §8（经 grep 命中 `selectionMode` vs `selectable` NOT-ADOPTED、off-disables-both、per-row itemScope）。
  - 全量验证：`pnpm typecheck`（55/55 tasks）、`pnpm build`（29/29 tasks）、`pnpm lint`（29/29 tasks，0 errors；1 pre-existing combobox virtualizer warning 与本 plan 无关）、`pnpm test`（55/55 tasks 全绿）。
  - Deferred honesty：`Deferred But Adjudicated` 仅含 CB1-residual（`watch-only residual`，附 non-blocking 理由），无 in-scope live defect / contract drift / owner-doc drift 被静默降级。
  - 五点一致性：`Plan Status: completed` / 三 Phase `Status: completed` / 三 Phase Exit Criteria 全 `[x]` / Closure Gates 全 `[x]` / 本 Closure 证据一致。

Follow-up:

- AG1 「>2 步 + 真实 async + result-data」合并权威用例为 non-blocking enhancement（既有分维度用例已覆盖 LOCK），非 confirmed defect。
- CB1-residual（dnd-kit sensor 无条件实例化）watch-only，successor `no`（若未来要求 defense-in-depth 加固再评估）。
- B6.2（button/mapping/toast/styling）独立推进；B5.2 现可推进（依赖 B6.1 已 done）。无 plan-owned 剩余 debt。
