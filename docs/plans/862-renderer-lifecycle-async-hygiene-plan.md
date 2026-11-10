# 862 渲染器生命周期与异步卫生（共享请求中止 / 浮动校验 promise / 挂载标记 / 竞态与指针取消）

> Plan Status: completed（draft review round 2 pass-with-minors；closure audit approved，见 Closure Audit Evidence）
> Last Reviewed: 2026-11-10
> Source: `docs/analysis/2026-11-06-full-repo-deep-audit.md` §3（L1–L10）
> Related: `docs/architecture/renderer-runtime.md`、AGENTS.md「React 19 Best Practices」、本仓规范上报通道 `reportRuntimeHostIssue`（flux-core）

## Purpose

收口 2026-11-06 深审 L 组：渲染器包中卸载/StrictMode/竞态/浮动 promise 导致的用户可见故障（下拉"加载失败"、保存失败通知被吞、地图回写旧区域、触屏拖拽残留）与静默资源泄漏。每条缺陷先写在旧实现下必挂的判别测试，再修复。

## Current Baseline（全部经执行会话亲核或子代理读码确认，行号为 2026-11-06 live）

- L1 `flux-renderers-form/src/renderers/use-dict-options.ts:25-37,79-103`：`loadDictShared` 用首个调用方 signal 发起共享请求；条目 `.finally` 才删除。文件头注释声称"abort 只撤自己的订阅"与代码不符。StrictMode 下 re-run 拿到已中止的 promise → 错误态。
- L2 浮动 `validateField`/`validateAt`：`flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts:73,77,94,97`；`flux-renderers-mobile/src/wheel-picker.tsx:57`、`wheel-date-picker.tsx:57`、`wheel-time-picker.tsx:44`、`wheel-cascader.tsx:115`；`flux-renderers-form-advanced/src/write-field-value.ts:26`、`flux-renderers-form-advanced/src/tag-list.tsx:44,127`（`void currentValidationScope.validateAt(...)`，draft review 补入）——全仓 `void .validate(Field|At)(` 共 11 个调用行，全部在本清单内。`packages/flux-runtime/src/form-runtime-validation.ts` 非取消错误重抛；主路径用 `attachValidationRejectionHandler`（`flux-renderers-form/src/field-utils/field-handlers.tsx`）。
- L3 `word-editor-renderers/src/hooks/use-word-editor-state.ts:82,108-112`、`flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:76-79`：`mountedRef` 只在 cleanup 置 false，effect 体不复位。
- L4 `flux-renderers-map/src/use-map-geojson.ts:62-125`：`.then` 不判结果 `cacheKey` 是否当前。
- L5 `flux-renderers-scheduling/src/kanban/hooks/use-kanban-column-resize.ts:46-75`：无卸载清理、无 pointercancel。
- L6 `flux-renderers-scheduling/src/gantt/gantt-layout.tsx:44-66`：无 pointercancel。
- L7 `flux-renderers-data/src/use-url-filter-sync.ts:97,121-127`：重试 timer 未清理；`restoredRef` 守卫未在 effect 开头检查。
- L8 `flux-renderers-form/src/field-utils/field-handlers.tsx:286-306`：`adapter.out` generation 仅异步路径递增。
- L9 `flux-renderers-data/src/table-renderer/use-table-lazy-children.ts:38,65,80`：`mountedRef` 从未置 false。
- L10 `use-dict-options.ts:21`：`inFlightDictLoads` 强引用 Map 以函数为 key 不删除。

## Goals

- L1：共享请求持有自己的 AbortController + 订阅引用计数；单个消费者 abort 只退订，最后一个退订才中止共享请求；中止后条目立即移除。修正文件头注释为真实语义。
- L2：所有浮动校验调用接入与主路径一致的拒绝处理（复用 `attachValidationRejectionHandler` 或等价 `.catch → reportRuntimeHostIssue`）。
- L3：effect 体内置 `mountedRef.current = true`（对齐 `packages/flux-renderers-form-advanced/src/upload-field.tsx:179` 先例）。
- L4：结果写回前校验所属 key 仍为当前（latest-key ref 或按 key abort）。
- L5/L6：补 pointercancel 与卸载清理。
- L7–L10：按 Baseline 所述逐条修复。

## Non-Goals

- 不处理 §3"待确认"三项（数据源控制器复活、dialog-host onConfirm、scada forceRender）——需先确认调用方存在，挂 Follow-up。
- 不重构请求执行器/数据源注册表（审计确认健康）。

## Scope

### In Scope

- Current Baseline 列出的 16 个源文件位点（form / form-advanced / code-editor / mobile / word-editor / scheduling / map / data 共 8 包）及其判别测试

### Out Of Scope

- flux-runtime / flux-react 核心运行时
- 新增 lint/scanner 规则（浮动 promise 已有 `find-async-without-failure-path` 覆盖面；本 plan 只修位点）

## Failure Paths

| 场景               | 触发                                                              | 行为                                                | 可重试 | 用户可见表现            |
| ------------------ | ----------------------------------------------------------------- | --------------------------------------------------- | ------ | ----------------------- |
| dict-shared-abort  | 同 dict 两下拉框，一个卸载 / StrictMode 重跑                      | 另一消费者照常得到选项                              | 否     | 下拉选项正常            |
| validator-throws   | 自定义校验器抛非取消错误（mobile/code-editor/form-advanced 路径） | 走 `reportRuntimeHostIssue`，无 unhandled rejection | 否     | console/notify 统一上报 |
| strictmode-remount | StrictMode / Activity 重挂载后保存失败、扫码聚焦                  | 失败通知照常出现；scanOnFocus 照常打开              | —      | 正常                    |
| geojson-race       | A→B 切换且 A 晚到                                                 | 地图保持 B                                          | 否     | 显示当前区域            |
| pointer-cancel     | 触屏拖拽被系统手势取消 / 拖拽中卸载                               | 监听移除，不回写过期宽度，body 样式复原             | —      | 无残留                  |

## Test Strategy

档位选择：`必须自动化`——核心回归路径（用户可见数据错误/静默吞错）。每个 Fix 前先写旧实现必挂的判别测试；StrictMode 相关用例必须在 `<React.StrictMode>` 下渲染。

## Execution Plan

### Phase 1 - 判别性测试先行（红）

Status: completed（2026-11-10，红证据 `_tmp/audit-1106/862-red.log`）
Targets: 各包 colocated 测试（按包既有放置约定）

- Item Types: `Proof`

- [x] L1：两个同 dictName 消费者，卸载其一 → 另一个拿到选项（宿主 `loadDict` 响应 signal）；StrictMode 单消费者拿到选项
- [x] L2：校验器抛错 → 无 unhandled rejection 且上报通道被调（每个包至少一处代表位点：code-editor binding / mobile wheel-picker / form-advanced writeFieldValue）
- [x] L3：StrictMode 下 word-editor mountedRef 机制断言（保存失败 notify 的上游守卫）；barcode `scanOnFocus` → 扫码层打开
- [x] L4：A 慢 B 快 → 最终 geojson 为 B
- [x] L5/L6：pointercancel 后 document 监听移除 / body 样式复原；卸载后 pointerup 不触发回写
- [x] L7–L9：各写一条可观测断言（卸载后 timer 不再调用 applyToForm；依赖变化不重复恢复；卸载后 lazy children 不写状态；迟到 adapter.out 不覆盖同步写入）
- [x] 实跑确认旧实现下红，红输出存 `_tmp/audit-1106/862-red.log`（L10 为内存持有面，以 WeakMap 类型约束 + 单测断言条目不随 env 累积代替）

Exit Criteria:

- [x] 每条 L 缺陷至少一个旧实现必挂的判别测试，红证据在案

### Phase 2 - 修复

Status: completed（2026-11-10）
Targets: Current Baseline 列出的 16 个源文件

- Item Types: `Fix`

- [x] L1 + L10：共享请求 AbortController + 引用计数 + 中止即移除；外层改 WeakMap；修正注释
- [x] L2：11 个调用行（7 个文件）接入拒绝处理
- [x] L3：两处 mountedRef 复位
- [x] L4：latest-key 守卫
- [x] L5/L6：pointercancel + 卸载清理
- [x] L7/L8/L9：逐条修复

Exit Criteria:

- [x] Phase 1 判别测试全部转绿；受影响 8 个包测试全绿；既有断言零弱化

## Draft Review Record

- Reviewer / Agent: 独立子代理（fresh session）
- Verdict: round 1 `fail`（1 Major）→ round 2 `pass-with-minors`（零 Blocker/Major；11 行/16 文件计数与全部行号独立复核成立）
- Rounds: 2
- Findings addressed: Major-1（L2 漏 `tag-list.tsx:44,127` 两处同类浮动 `validateAt`）→ 补入 Baseline L2 + 全仓 11 行计数口径；Minor：源文件计数 9→16、L1 行号 :79 起、upload-field 先例补全包路径；round 2 Minor 吸收——L2 位点文件数 9→7、`form-runtime-validation.ts` 补全包路径

## Closure Gates

- [x] L1–L10 全部修复且判别测试先红后绿
- [x] 不存在被静默降级的 in-scope live defect
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（2026-11-10 exit 0）
- [x] `pnpm build`（2026-11-10 exit 0）
- [x] `pnpm lint`（2026-11-10 exit 0）
- [x] `pnpm test`（2026-11-10 exit 0）
- [x] `pnpm check` exit 0

## Deferred But Adjudicated

- L2 辅助函数形态改判：Baseline 原文"复用 attachValidationRejectionHandler"不可行——`field-handlers.tsx` 的原实现未从 `flux-renderers-form` 导出（模块私有），且签名为 `(result, prefix)` 与主路径 console.warn 通道耦合（closure audit 勘误：mobile/code-editor 的 package.json 实际声明依赖 flux-renderers-form，不可行的真实原因是私有导出 + 签名/上报通道差异，非依赖图缺失）。按 plan 允许的"等价 .catch → reportRuntimeHostIssue"路径落本地 helper（mobile 单入口 `validateFieldOnChange`；form-advanced 双函数；code-editor 内联于 hook 文件），带 env 时走 `reportRuntimeHostIssue`（严格优于主路径纯 console.warn），无 env 退化为 console.warn。
- L9 判别测试可观测通道改判：React 19 已移除"卸载后 setState"警告，无法经 console 观测；改用白盒判别——mock `react.useState` 计数 state 写入，卸载后迟到 dispatch 解析不得新增写调用（旧实现红：写调用增加）。
- L3 word-editor 判别粒度改判：完整"保存失败 → env.notify"链路需拉起 word-editor 页宿主，超出单元判别性价比；改为机制级判别——StrictMode 双跑后 hook 返回的 `mountedRef.current === true`（旧实现 false，正是通知被吞的上游守卫），保存失败路径由 barcode scanOnFocus 用例覆盖同族缺陷。
- 测试夹具适配（非断言弱化）：`use-code-editor-binding` 加入 `useRendererRuntime` 后，既有 `use-code-editor-binding.test.tsx`（2 用例）与 mobile `wheel-picker-family.test.tsx` / `wheel-time-picker.test.tsx` 的直接渲染需包 `TestRuntimeProvider`；被测断言零改动。

## 执行中裁决（Phase 1/2 Execution Record，2026-11-10）

- 红证据：`_tmp/audit-1106/862-red.log`（13 个判别测试文件，全部在旧实现下实跑确认红；L10 以 WeakMap 类型断言 + 条目移除断言代替内存持有观测）。
- 判别测试清单：
  - L1/L10：`packages/flux-renderers-form/src/__tests__/use-dict-options-shared-abort.test.tsx`
  - L8：`packages/flux-renderers-form/src/__tests__/field-handlers-adapter-out-generation.test.tsx`
  - L2（code-editor）：`packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding-validation-rejection.test.tsx`
  - L2（mobile）：`packages/flux-renderers-mobile/src/wheel-picker-validation-rejection.test.tsx`
  - L2（form-advanced）：`packages/flux-renderers-form-advanced/src/write-field-value-validation-rejection.test.ts`
  - L3（word-editor）：`packages/word-editor-renderers/src/hooks/use-word-editor-state-mounted.test.tsx`
  - L3（barcode）：`packages/flux-renderers-scheduling/src/barcode-input-strictmode-remount.test.tsx`
  - L4：`packages/flux-renderers-map/src/use-map-geojson-latest-key.test.tsx`
  - L5：`packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-column-resize-cleanup.test.tsx`
  - L6：`packages/flux-renderers-scheduling/src/gantt/gantt-layout-pointercancel.test.tsx`
  - L7：`packages/flux-renderers-data/src/use-url-filter-sync-cleanup.test.tsx`
  - L9：`packages/flux-renderers-data/src/use-table-lazy-children-unmount.test.tsx`
- 关键决策：
  - L1 共享请求由条目自有 AbortController 持有，消费者 release 仅减引用；最后一个订阅者离开且未 settle 时立即 abort + 删除条目（晚加入者永不复用已中止加载）。StrictMode 下双跑会发起两次 loadDict（语义可接受：判别标准为"单消费者最终拿到选项且无错误态"）。
  - L4 守卫为 `latestKeyRef`（dispatch 时记录、结果写回前比对），cache 写入仍按 key 保留（旧 key 结果不写 state，但仍入缓存无害）。
  - L7 restore 守卫置于 claim 之后，保证一次性恢复 + 多实例 claim 语义同时成立；retry timer 全部登记并在 cleanup 清空。
  - tag-list `syncErrorVisibility` useCallback 依赖补 `runtime`；wheel-picker 系列对 `slotProps.name` 在回调外先收窄为局部常量。
  - 收口验证：8 包 vitest 全绿（form 1127+1 skipped / form-advanced 1105+1 skipped / code-editor 118 / mobile 385 / word-editor-renderers 162 / scheduling 1103 / map 67 / data 1178），8 包 `pnpm --filter <pkg> typecheck` 全部通过；`pnpm typecheck/build/lint/test/check` 留待收口统一执行。

## Non-Blocking Follow-ups

- §3 待确认三项：`api-data-source-controller.ts:147-153` stop 后 refresh 复活；`dialog-host.tsx:242` `void surface.onConfirm?.()`；`scada-engine.ts:407` `forceRender()` 无 destroyed 守卫——需先找到实际调用方再定性。

## Closure

Status Note: L1–L10 全落地，13 个判别测试先红后绿（红证据 862-red.log）；收口阶段消除 lint/test-global-leaks/duplicates 三类新增命中（6 测试文件 renderHook 化、vi.hoisted 计数、mobile helper 单入口化），五命令 exit 0。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理（fresh session）
- Evidence: git diff 逐位点核验 L1–L10（引用计数/WeakMap/mountedRef/latest-key/pointercancel/timer/generation 全部属实）；红证据 13 条目在案且断言针对声称行为；mobile 单入口收口重点抽查（能力探测语义保留、判别测试仍有效）；Deferred 分类诚实（L2 私有导出依据成立，2 条 Minor 文字勘误已按建议回写本 plan）；独立实跑 mobile 385 / form 1127+1skip / data 1178 全绿。全量验证 `_tmp/audit-1106/862-864-verify-final3.log`。详见 docs/logs/2026/11-10.md。

Follow-up:

- §3 待确认三项（数据源控制器复活 / dialog-host onConfirm / scada forceRender）维持 Non-Blocking Follow-up。
