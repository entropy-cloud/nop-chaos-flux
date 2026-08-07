# 2 form/data 渲染器 P1 修复（form-load-action 生命周期 + CRUD infinite 累计 + list 事件 ctx + remote search 回显）

> Plan Status: active
> Last Reviewed: 2026-08-07
> Source: `docs/audits/2026-08-07-1747-open-audit-component-audit.md`（1-1/1-2/1-3/1-12）
> Related: `docs/plans/2026-08-06-2306-1-event-dispatch-ctx-full-scan.md`（事件 ctx 全量扫描先例，已收口）、`docs/plans/2026-08-07-1053-1-oversized-code-files-governance-debt.md`（1053-1 拆分载体转移）

## Purpose

把 `flux-renderers-form` 与 `flux-renderers-data` 包本轮审计的 **4 条 P1 发现**一次收口：form `loadAction` 生命周期三缺陷（StrictMode autoLoad 静默丢弃 / 失败永不重试 / refresh 竞态覆写，1-1）、CRUD `loadAction` × `infinite` 组合逐页替换不累计且竞速末页（1-2）、list `onItemClick` 派发缺 `event`/`evaluationBindings` ctx 导致 payload `key` 不可解析且事件 ctx 门禁对别名 receiver 假绿（1-3）、remote search 选中值回显为原始 id（1-12）。全部 test-first 落地。

## Current Baseline

- `form-load-action.ts:40-90`：`loadActionKeyRef.current = activationKey` 在请求启动前置位（:52），cleanup（:84-89）只 abort 不重置 key；StrictMode 双挂载二次 setup 命中 :45 守卫直接 return——aborted 请求永不重启；catch（:68-77）不重置 key——失败后该 activation 的 autoLoad 永久禁用；refresh handler（:98-106）不 bump `loadRequestIdRef`、不带 signal——autoLoad 慢响应在 refresh 后 resolve 时 :61 stale 守卫放行，旧数据覆写新数据。对照先例 `form-init-action.ts:64-66,77-89`（cleanup/catch/finally 均清 in-flight 标记）。
- `crud-renderer.tsx:289-307`：`handleLoadMore` 在 loadAction 模式下仅 bump `paginationStatePath.currentPage` 并返回 `undefined`（load effect 驱动 fetching）；`crud-renderer-load.ts:240` `onSettle` 走 `setRows(normalized.rows)` **整页替换**，全文件无 append/accumulate 路径；`use-infinite-scroll.ts:121-124` 对非 thenable 返回不设 loading 也无 G5 并发守卫；`crud-renderer-schema-builders.ts:62-65` pageSize 随 currentPage 增长（设计文档承诺「累计合并通过 pageSize 增长表达」，design.md:41/:356）——实现路径缺失，实际行为：sentinel 持续可见 → 竞速翻页至末页，最终只显示末页 rows。
- `list-renderer.tsx:101-104,118-121`：onItemClick 派发 `{ type, item, index, key }, { scope: itemScope }`——ctx 仅 scope，缺 `event`/`evaluationBindings`；runtime args 求值只合并 evaluationBindings+scope（action-core.ts:206-208），itemScope 内容为 `{ item, index }`（:75）——payload 成员 `key` 无任何通道，`args: { key: '${key}' }` 得 undefined。同文件 onPageChange/onSelectionChange/onLoadMore 均带完整 ctx（:281-285/:364-375）。且该派发 receiver 为 `owner.events.onItemClick`（owner 为 props 解构别名），`scripts/audit/find-event-dispatch-without-ctx.mjs:60` `DISPATCH_RECEIVER` 正则只匹配 `props.events.X`/`eventHandlers.X`——门禁对该形态全盲，`check:audit-event-dispatch-ctx` 零命中是假绿。
- `input-choice-renderers.tsx:114`：`allOptions = useGroups ? groups.flatMap(...) : rawOptions`，**remoteOptions 永不合并**；`input-choice-utils.ts:180-223` `resolveChoiceComboboxValue`/`TriggerText` 查找失败走 `label: String(value)` 回退——远端搜索选中后 trigger/chip 显示原始 id 而非选项标签；append 模式 `[...rawOptions, ...remoteOptions]` 只影响可见列表，不回写 allOptions。`select-remote-search.test.tsx` 只断言选项列表与 dispatch，未断言选中后回显文本。
- 测试基线：form 736 / data 753 tests 全绿；四条发现对应路径零覆盖（form-loadaction.test.tsx 无 StrictMode 渲染；crud-lifecycle.test.tsx:419-593 仅 source 路径；list 契约测试未对账 `key` 解析；select-remote-search 未断言回显）。

## Goals

- 4 条 P1 全部以 `Fix` 收口：loadAction 生命周期与 initAction 对齐（StrictMode 可重跑 / 失败可重试 / refresh 竞态有守卫）；loadAction×infinite 累计合并 rows 且返回 thenable 供并发守卫与 loading/error 反馈；onItemClick 补全 ctx 且 `key` 可解析；remote search 选中值回显选项标签。
- 事件 ctx 门禁扫描器补别名 receiver 形态（`owner.events.X`），修复后全仓重跑确认无假绿。
- 每条修复先红后绿，锁定正确行为断言。

## Non-Goals

- 不处理 CRUD polling/自定义 state path 双 fetch 等 P2（2-8/2-9/2-10，登记 roadmap Follow-up Backlog）。
- 不改变 loadAction/onItemClick 的公开事件契约签名（payload 与 type 不变）。
- 不引入新 schema 字段。

## Scope

### In Scope

- `packages/flux-renderers-form/src/renderers/form-load-action.ts`、`form-load-action.test.tsx`
- `packages/flux-renderers-data/src/crud-renderer.tsx`、`crud-renderer-load.ts`、`use-infinite-scroll.ts`、`crud-renderer-schema-builders.ts`（如累积契约需修正）、`crud-lifecycle.test.tsx`、`crud-infinite-*` 相关测试
- `packages/flux-renderers-data/src/list-renderer.tsx`、list 契约测试
- `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`、`input-choice-utils.ts`、`select-remote-search.test.tsx`
- `scripts/audit/find-event-dispatch-without-ctx.mjs`（DISPATCH_RECEIVER 补别名 receiver 形态）

### Out Of Scope

- 其余事件 ctx 问题（P2 2-7 之外的扫描器增强建议、其它组件派发形态）
- remote search 搜索/过滤行为本身（2-6 append 空结果展示，P2）

## Test Strategy

本档选择：**必须自动化**。4 条均为已确认 live defect、含竞态与组合面（StrictMode/refresh、loadAction×infinite），必须测试先行（Proof 项先于 Fix 项）。

## Execution Plan

### Phase 1 - form loadAction 生命周期（StrictMode / 重试 / refresh 竞态）

Status: planned
Targets: `packages/flux-renderers-form/src/renderers/form-load-action.ts` + `form-load-action.test.tsx`

- Item Types: `Proof | Fix`

- [ ] `Proof` 先红三条（扩展 form-loadaction.test.tsx，或新建 StrictMode 用例）：① StrictMode 双挂载（`renderInStrictMode` 或手工 setup→cleanup→setup 序列）——断言 autoLoad 请求被启动两次（或 aborted 后二次 setup 重启请求），数据最终 hydrate；② loadAction reject（非 AbortError）后翻转某 dep（如 importsReady false→true、或卸载重挂）强制 effect 重跑同 activation——断言 autoLoad 重新发起（initAction 同语义对照）；③ refresh 触发后 autoLoad 慢响应 resolve——断言旧数据不覆写新数据（`setValues` 只被 refresh 数据调用）。
- [ ] `Fix` 1-1：`form-load-action.ts` 对齐 `form-init-action.ts:64-66,77-89` 纪律——cleanup 清除 `loadActionKeyRef`（防 StrictMode 丢弃）；catch/finally 按 controller 身份守卫清除 key（失败可重试）；refresh handler bump `loadRequestIdRef`（或独立请求 id）使 stale autoLoad 响应被 :61 守卫丢弃。
- [ ] `Proof` 修复后三条用例全绿；form 包 736 既有测试零回归。

Exit Criteria:

- [ ] StrictMode 用例断言 aborted 后二次 setup 重启请求且最终数据 hydrate（修复前红记录）。
- [ ] 失败重试用例断言同 activation 可重新发起（修复前红记录）。
- [ ] refresh 竞态用例断言 stale 响应不覆写（修复前红记录）。
- [ ] form 包 typecheck 通过、focused 测试全绿。

### Phase 2 - CRUD loadAction × infinite 累计合并

Status: planned
Targets: `packages/flux-renderers-data/src/{crud-renderer.tsx,crud-renderer-load.ts,use-infinite-scroll.ts,crud-renderer-schema-builders.ts}` + crud-lifecycle.test.tsx

- Item Types: `Proof | Fix`

- [ ] `Proof` 先红（loadAction×infinite 组合用例，对照 crud-lifecycle.test.tsx:419-593 source 路径既有形态）：① 首页 + 翻页两次——断言 rows 累计（第 1 页 rows + 第 2 页 rows），非整页替换；② 短页不足一屏——断言不发生无谓竞速翻页至末页（请求次数有限、最终展示全部累计 rows）；③ 翻页失败——断言 loading/error 状态由 useInfiniteScroll 表达（thenable 返回）。
- [ ] `Fix` 1-2：`handleLoadMore` loadAction 模式返回 thenable（驱动 loading/error + G5 并发守卫）；`crud-renderer-load.ts:240` 在 infinite+loadAction 模式下 append 合并 rows（**裁决：按累计 pageSize 直接拼接（concat）**，与 pageSize 增长契约 design.md:41/:354-356 一致；不做 key 去重——server 分页按 offset 契约保证无重复）；确认 sentinel 在累计后自然消失，无竞速翻页。
- [ ] `Fix` 1-2 文档同步：`docs/components/crud/design.md:354-356` 累计合并表述与实现对齐（append 语义写明）。
- [ ] `Proof` 修复后用例全绿；crud 既有 753 测试零回归（source 路径行为不变）。

Exit Criteria:

- [ ] infinite+loadAction 组合用例断言 rows 累计与末页稳定（修复前红记录）。
- [ ] handleLoadMore 返回 thenable（测试断言 loading 态出现/并发守卫生效）。
- [ ] data 包 typecheck 通过、focused 测试全绿。

### Phase 3 - list onItemClick 事件 ctx + 扫描器别名 receiver

Status: planned
Targets: `packages/flux-renderers-data/src/list-renderer.tsx` + list 契约测试 + `scripts/audit/find-event-dispatch-without-ctx.mjs`

- Item Types: `Proof | Fix`

- [ ] `Proof` 先红：契约用例——schema `onItemClick: { action }` + `args: { key: '${key}' }`，点击 list item 后断言 action 收到解析后的 `key`（修复前 `${key}` 解析失败）。
- [ ] `Fix` 1-3：`list-renderer.tsx:101-104,118-121` 两处派发补 `{ event, evaluationBindings, scope }`（对齐 :281-285/:364-375 同文件先例；event 为完整 payload，evaluationBindings 含 payload 成员）；payload/type 不变。
- [ ] `Fix` 1-3 扫描器：`find-event-dispatch-without-ctx.mjs:60` `DISPATCH_RECEIVER` 补别名 receiver 形态（`owner.events.X`、及 `props` 解构后的其它常见别名），修复后全仓重跑 `check:audit-event-dispatch-ctx`——零假绿（allowlist 不变）；扩展形态的命中能力经 `scripts/__tests__/` 合成夹具负例单测锁定（修复后 list-renderer 已合规、零命中，故正则判别力由负例单测实证，而非 live 命中）。
- [ ] `Proof` 修复后契约用例全绿；门禁重跑 exit 0；data 包 753 既有测试零回归。

Exit Criteria:

- [ ] onItemClick 契约用例断言 `${key}` 解析成功（修复前红记录）。
- [ ] 扫描器对 `owner.events.X` 形态命中检查通过（新增形态单测或实证一条命中），全仓零假绿。
- [ ] data 包 typecheck 通过、focused 测试全绿。

### Phase 4 - remote search 选中值回显标签

Status: planned
Targets: `packages/flux-renderers-form/src/renderers/{input-choice-renderers.tsx,input-choice-utils.ts}` + `select-remote-search.test.tsx`

- Item Types: `Proof | Fix`

- [ ] `Proof` 先红：remote search 选中远端选项后重渲染——断言 trigger/chip 文本为选项标签而非原始 id（append 与 replace 两种模式）。
- [ ] `Fix` 1-12：选中值回显路径的 allOptions 并入 remoteOptions（`input-choice-renderers.tsx:114` 或 `input-choice-utils.ts:180-223` 消费侧合并），使 `resolveChoiceComboboxValue`/`TriggerText` 能匹配远端选中值；本地过滤行为与可见列表不受影响（可见列表走 `resolveChoiceVisibleOptions(rawOptions, remoteOptions)` 独立路径，合并不回写该路径）。注：`input-choice-renderers.tsx:140` `virtualEnabled` 阈值基于 `allOptions.length`，合并后计数变化需在既有 virtual 测试上确认无回归。
- [ ] `Proof` 修复后用例全绿；form 包 736 既有测试零回归（含 2-6 相关既有行为不回归）。

Exit Criteria:

- [ ] remote search 回显用例断言标签文本（append/replace 双模式，修复前红记录）。
- [ ] form 包 typecheck 通过、focused 测试全绿。

## Draft Review Record

> 由独立子 agent（fresh session）填写，见 `docs/plans/00-plan-authoring-and-execution-guide.md` Plan Review Rule。

- Reviewer / Agent: 独立 review sub-agent `ses_0240dc450ffekmHxJjwOhoxhNk`（fresh session，2026-08-07）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major；Minor 全部处理——① Phase 1 Proof ② 措辞修正（翻转 dep 强制 effect 重跑）；② Phase 3 扫描器实证改合成夹具负例单测（修复后 live 零命中无法实证判别力）；③ Phase 2 Fix 裁决为按累计 pageSize 直接 concat（不做 key 去重，server offset 契约保证）；④ Phase 2 补 design.md:354-356 文档同步项；⑤ Phase 4 注明 `virtualEnabled` allOptions.length 计数影响并加 virtual 回归确认

## Closure Gates

- [ ] 4 条 in-scope P1 发现全部修复并 test-first 落地（Proof 先红记录可查）
- [ ] 事件 ctx 门禁别名 receiver 形态已补，全仓重跑零假绿（allowlist 不变）
- [ ] 无 in-scope live defect 被静默降级到 deferred / follow-up
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`（form/data 包 focused + 全量）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

## Deferred But Adjudicated

无（所有 in-scope 发现均为已确认 live defect，全部入 Fix，无延期项）。

## Non-Blocking Follow-ups

- form/data 包 P2 项（2-1/2-2/2-6/2-8/2-9/2-10 等）已登记 `docs/backlog/component-audit-roadmap.md` Follow-up Backlog，不影响本 plan 收口。

## Closure

Status Note: （完成或关闭时填写）

Closure Audit Evidence:

- Auditor / Agent: （closure-audit 由独立 fresh session 执行后填写）
- Evidence: （task id / daily log link / findings 摘要）

Follow-up:

- 无 remaining plan-owned work（P2 已归 backlog）。
