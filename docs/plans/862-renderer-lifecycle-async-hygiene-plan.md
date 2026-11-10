# 862 渲染器生命周期与异步卫生（共享请求中止 / 浮动校验 promise / 挂载标记 / 竞态与指针取消）

> Plan Status: active（draft review round 2 pass-with-minors，见 Draft Review Record）
> Last Reviewed: 2026-11-06
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

Status: planned
Targets: 各包 colocated 测试（按包既有放置约定）

- Item Types: `Proof`

- [ ] L1：两个同 dictName 消费者，卸载其一 → 另一个拿到选项（宿主 `loadDict` 响应 signal）；StrictMode 单消费者拿到选项
- [ ] L2：校验器抛错 → 无 unhandled rejection 且上报通道被调（每个包至少一处代表位点）
- [ ] L3：StrictMode 下 word-editor 保存失败 → `env.notify` 被调；barcode `scanOnFocus` → 扫码层打开
- [ ] L4：A 慢 B 快 → 最终 geojson 为 B
- [ ] L5/L6：pointercancel 后 document 监听移除 / body 样式复原；卸载后 pointerup 不触发回写
- [ ] L7–L9：各写一条可观测断言（卸载后 timer 不再调用 applyToForm；依赖变化不重复恢复；卸载后 lazy children 不写状态；迟到 adapter.out 不覆盖同步写入）
- [ ] 实跑确认旧实现下红，记入当日 log（L10 为内存持有面，以 WeakMap 类型约束 + 单测断言条目不随 env 累积代替）

Exit Criteria:

- [ ] 每条 L 缺陷至少一个旧实现必挂的判别测试，红证据在案

### Phase 2 - 修复

Status: planned
Targets: Current Baseline 列出的 16 个源文件

- Item Types: `Fix`

- [ ] L1 + L10：共享请求 AbortController + 引用计数 + 中止即移除；外层改 WeakMap；修正注释
- [ ] L2：11 个调用行（7 个文件）接入拒绝处理
- [ ] L3：两处 mountedRef 复位
- [ ] L4：latest-key 守卫
- [ ] L5/L6：pointercancel + 卸载清理
- [ ] L7/L8/L9：逐条修复

Exit Criteria:

- [ ] Phase 1 判别测试全部转绿；受影响 8 个包测试全绿；既有断言零弱化

## Draft Review Record

- Reviewer / Agent: 独立子代理（fresh session）
- Verdict: round 1 `fail`（1 Major）→ round 2 `pass-with-minors`（零 Blocker/Major；11 行/16 文件计数与全部行号独立复核成立）
- Rounds: 2
- Findings addressed: Major-1（L2 漏 `tag-list.tsx:44,127` 两处同类浮动 `validateAt`）→ 补入 Baseline L2 + 全仓 11 行计数口径；Minor：源文件计数 9→16、L1 行号 :79 起、upload-field 先例补全包路径；round 2 Minor 吸收——L2 位点文件数 9→7、`form-runtime-validation.ts` 补全包路径

## Closure Gates

- [ ] L1–L10 全部修复且判别测试先红后绿
- [ ] 不存在被静默降级的 in-scope live defect
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check` exit 0

## Deferred But Adjudicated

（无——执行中若有改判当场落节）

## Non-Blocking Follow-ups

- §3 待确认三项：`api-data-source-controller.ts:147-153` stop 后 refresh 复活；`dialog-host.tsx:242` `void surface.onConfirm?.()`；`scada-engine.ts:407` `forceRender()` 无 destroyed 守卫——需先找到实际调用方再定性。

## Closure

Status Note: <<收口时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<收口时填写>>
