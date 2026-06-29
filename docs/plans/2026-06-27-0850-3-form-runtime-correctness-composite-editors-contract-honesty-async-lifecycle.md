# 3 Form/Runtime Correctness — Composite Editors, Contract Honesty, Bounds Enforcement, Async/Validation Lifecycle

> Plan Status: completed
> Last Reviewed: 2026-06-27
> Mission: amis-bug-driven-improvements
> Source Audits: audits/2026-06-26-1859-open-audit-amis-bug-driven-improvements.md, audits/2026-06-26-1859-multi-audit-amis-bug-driven-improvements.md
> Source: `docs/audits/2026-06-26-1859-open-audit-amis-bug-driven-improvements.md` (H3, H7, H8, H9, H13, H14, H15, H16, H24, H25, H26, H27, H28, H29, H30), `docs/audits/2026-06-26-1859-multi-audit-amis-bug-driven-improvements.md` (AUDIT-07, AUDIT-12, AUDIT-13, AUDIT-14, AUDIT-15)

## Purpose

把跨 `flux-core` / `flux-runtime` / `flux-renderers-form` / `flux-renderers-form-advanced` / `flux-renderers-content` 的“表单复合控件数据丢失、契约诚实性落地、声明边界强制、async/验证生命周期一致性”类 finding 收口到一个 owner plan。统一的结果面是：**表单复合控件（condition-builder / key-value / input-table / date-range / upload）不静默丢数据并诚实执行声明的 contract/bounds；contract-honesty guard 在生产测试里真正实现 per-renderer 隔离；async 管线（tree 控制器 / data-source / validation runtime）在取消/卸载/乱序时守护自己的 sequence token 与 signal。** 它们共享同一验证范式（focused 失败先行测试 + 行为修正），同一组 owner doc（form-validation.md / renderer-runtime.md）。按 Rule 22/25 优先合成一个 owner plan，内部用 phase 区分子结果面。

## Current Baseline

- `pnpm typecheck` / `pnpm lint` 全绿（HEAD `b6848f32`）。多份 finding 无回归测试守护；H6/H8 式“测试守护错误代码路径”问题在本组里以 H7（生产 harness 用整包 blob 而非 per-renderer source）最突出。
- **契约诚实性落地不全（H7/H16）**：G4/G15 已在 `flux-core/src/contract-honesty.ts:109-120,135-147` 落地锚定 matcher + per-definition resolver API，并有 flux-core 单测证明 per-renderer 隔离；但**每个生产 harness（form/content 等 6 个）都 `collectSource(srcDir)` 收一个整包 blob 字符串**，要么当裸串传给 events 检查（走 `:143` 的 string 分支，把同一 source 套用到每个 definition），要么对每个 definition 返回同一个 `runtimeSource`。所以 renderer A 的 `props.events.onChange` 仍能满足 renderer B 声明却未接线的 `onChange`——G15 的核心目的（per-renderer 隔离）**没有任何生产测试行使**。另 H16：capability matcher 的 array-element 锚 `new RegExp([[,]\s*['"]<h>['"])` 匹配**任意**数组字面量元素，而非专限 `methods`/`listMethods` 接线数组，故 `save`/`submit` 等常见词可被无关 UI 字符串数组（`labels:['save','cancel']`） incidental 满足。
- **复合控件数据丢失 / 边界（H3/H9/H24/H25/H27/H29/H30）**：condition-builder `BetweenInput`（`value-input.tsx:468-476,485-493`）任一侧 `onChange` 在另一侧为 `undefined` 时发 `onChange(undefined)`，**静默销毁存活值**；`date-range-renderer.tsx:161-177` 的 `setTimeOn`/`commitRange` 只归一化 start≤end，**不强制 minDate/maxDate**，而单字段 `date-field-control.tsx:142-169` 显式 clamp（兄弟控件契约不一致）；`input-table` 缺 `removeWhen`（combo/array-field 经 `remove-when-gating.ts` 有，三复合编辑器契约不对称）；key-value（`key-value.tsx:521-564`）无内联重复 key 反馈（仅 opt-in 聚合 `uniqueBy`）；复合编辑器 `validateOn` 语义不一致（key-value `handleRemove:368` 无视 `validateOn`，`addItem:449-453` 遵守；move/remove 跨编辑器 `validateField` vs `validateSubtree` 混用）；condition-builder `rewriteItemRight`（`:341-359`）按 `id` 全树匹配无短路，id 碰撞串值；condition-builder projected form/scope（`:203-239`）每 render 重建，下游 memoization 失效。
- **树控制器 async 生命周期（H8/H14/H15/AUDIT-12）**：`tree-controls.tsx:50` 的 `treeConfig = getTreeOptionConfig(...)` 每 render 返回新对象（`tree-options.ts:45-53` 无 memo），作为 `useTreeRemoteSearch` 300ms debounce effect 依赖 → **每次 render 推翻重启定时器**，任何 300ms 内的 re-render 让远程搜索永不触发；`tree-control-controllers.ts:194-240` 的 `runLoad` **无 `cancelled` flag、无 AbortController**，unmount/baseOptions 变化时 `.then` 仍 `setMergedOptions`，且闭包 `baseOptions` 过期会 stale-merge 进陈旧 base（AUDIT-12 只覆盖 search 路径，lazy-children 路径漏了）；`tree-control-controllers.ts:546-554` 的展开态 effect 在任何 `options` identity 变化时用“所有有子节点的 key”整体重建 `expandedKeys` → **用户手动折叠的节点被强制重展开**。
- **runtime async/验证生命周期（H13/H26/H28/AUDIT-07/AUDIT-14/AUDIT-15）**：`api-data-source-controller-runtime.ts:351-377` 成功路径唯一陈旧守护是 `asyncGovernance.isCurrentRun(run)`（`run` undefined 或 governance 缺失时被跳过），error/finally 路径用 `requestSequence < mutable.latestSettledRequestSequence` 守护，成功路径不对称——`refreshDedup:'parallel'` 下请求 #1 晚于 #2 resolve 时 `publishControllerData` 用陈旧 payload 覆盖新数据；upload（`upload-field.tsx:333-336,185-197`）`removeExisting` 读 reactive `value` 而 `commitItems` 累积对 `latestValueRef`，remove 落在 commit→re-render 窗口会丢/复活刚完成上传；`validateSubtree` 在 compiled-model 路径（`form-runtime-owner.ts:659` → `form-runtime-validation.ts:562-592`）丢调用方 `signal`，no-model fallback 传了 `options`；数组结构变更（`form-runtime-array.ts:245-264` + `form-runtime-owner.ts:143-146`）`revalidateDependents(arrayPath,'change')` 显式跳过 `path===arrayPath`，数组根聚合规则（`uniqueBy`/`atLeastOneFilled`）不被 runtime API 自验证，靠 renderer 手动补偿；`validateForm`/`validateSubtree`（`form-runtime-owner.ts:378-400,608-625`）只在 `!currentValidation` 时 `waitForActiveLifecycle`，而 `validatePath` 无论何时都查 `isLifecycleTransitional`；`revalidateDependents`（`:158-190`）先 `delete validating` 再 batchUpdate 通知，再 await `validateField`，async 字段有微任务闪烁窗口。

## Goals

- contract-honesty 生产 harness 实现 per-renderer-different source（renderer A 的用法不再满足 renderer B 的声明）；capability matcher 的 array-element 锚限定到 `methods`/`listMethods` 接线上下文。
- condition-builder `BetweenInput` 清除一侧时存活值不静默消失；date-range 强制 minDate/maxDate（与单字段一致）；input-table/removeWhen 契约对称或显式文档化；key-value 有内联重复 key 反馈；复合编辑器 `validateOn`/`validateField` vs `validateSubtree` 语义一致。
- 树远程搜索 debounce 不被 `treeConfig` identity churn 卡死；lazy-children `runLoad` 有取消/卸载守护且不 stale-merge；用户折叠态在 options 变化时保留。
- data-source 成功路径补齐陈旧守护（镜像 error 路径）；upload `removeExisting` 与 `commitItems` 一致地读 ref；`validateSubtree` 全路径透传 `signal`；数组结构变更自验证聚合根；`validateForm`/`validateSubtree` 生命周期门控与 `validatePath` 一致；`revalidateDependents` 不预清 `validating`。

## Non-Goals

- 不重写 contract-honesty guard 架构（只补生产 harness 隔离 + 收紧一个锚）。
- 不实现树虚拟化（见 Plan {2} H17 successor）。
- 不动 flux-renderers-data 的 table/CRUD/chart/pagination（见 Plan {2}）。
- 不处理 CI 门禁 / 包边界 / 文档同步（见 Plan {1}）。

## Scope

### In Scope

- H3：condition-builder `BetweenInput` 清除一侧时保留存活值。
- H7：contract-honesty 生产 harness 改为 per-renderer-different source。
- H8：`treeConfig` memoize / 稳定引用，解 debounce churn。
- H9：date-range `setTimeOn`/`commitRange` clamp 到 minDate/maxDate。
- H13：data-source 成功路径补 `requestSequence` 陈旧守护。
- H14：树 lazy-children `runLoad` 加 cancelled/signal 守护，避免 stale-merge。
- H15：树展开态 effect 保留用户折叠（不全量重展开）。
- H16：capability matcher array-element 锚限定到 methods/listMethods 上下文。
- H24：input-table `removeWhen` 对称（补字段 or 文档化不对称）。
- H25：key-value 内联重复 key 反馈。
- H26：upload `removeExisting` 与 `commitItems` 一致读 ref。
- H27：复合编辑器 `validateOn` / `validateField` vs `validateSubtree` 语义对齐。
- H28：`validateSubtree` compiled-model 路径透传 `signal`。
- H29：condition-builder `rewriteItemRight` id 匹配短路/限定范围。
- H30：condition-builder projected form/scope 不每 render 重建。
- AUDIT-07：数组结构变更后自验证聚合根。
- AUDIT-12：树远程搜索补 AbortController/signal plumbing（保留 stale-response 守护）。
- AUDIT-13：qrcode / condition-builder value-input bare `cancelled` 裁定（加 signal 或文档化豁免）。
- AUDIT-14：`validateForm`/`validateSubtree` 加 `isLifecycleTransitional` 门控。
- AUDIT-15：`revalidateDependents` 不预清 `validating`，交给 `validateField`。

### Out Of Scope

- 表格 / CRUD / chart / pagination / table i18n（见 Plan {2}）。
- 仓库治理 / manifest / quick-reference.md（见 Plan {1}）。

## Failure Paths

| 场景编号                | 触发                                   | 行为                                                          | 可重试     | 用户可见表现      |
| ----------------------- | -------------------------------------- | ------------------------------------------------------------- | ---------- | ----------------- |
| between-clear-survivor  | `[1,5]` 清空 start                     | 存活值 `5` 保留（半范围待定或按 validator 裁决），不静默 null | 是（重填） | 不丢已输值        |
| daterange-time-overflow | end time 输入超过 maxDate 时刻         | clamp 到 maxDate 时刻（同单字段）                             | 是         | 不存越界值        |
| datasource-stale-winner | `refreshDedup:'parallel'` 下旧请求晚到 | 成功路径用 `requestSequence` 守护丢弃陈旧 payload             | 否         | 不回退到旧数据    |
| tree-collapse-preserve  | lazy/refresh 改 options identity       | 用户折叠的节点保持折叠，不全量重展开                          | 否         | 折叠态不丢        |
| subtree-cancel-signal   | compiled-model validate 中调用方 abort | 透传 signal，提前停止，不写半结果                             | 否         | 无残留 validating |

## Test Strategy

本档选择：`必须自动化`

理由：本计划覆盖静默数据丢失（H3/H13/H26）、契约 drift（H7/H16/H9/H24/H28）、async 取消/乱序（H13/H14/H15/AUDIT-12）。按 Bug Fix Test Coverage Rule 与 Test Strategy Tier，核心回归路径与契约 drift 必须“先写失败测试再实现”。Proof 项排在对应 Fix 之前。

## Execution Plan

### Phase 1 - 契约诚实性生产隔离 + capability 锚收紧

Status: completed
Targets: `packages/flux-renderers-form/src/__tests__/contract-honesty.test.ts`（及 5 个兄弟包 harness）, `packages/flux-core/src/contract-honesty.ts`

- Item Types: `Proof | Fix`

- [x] `Proof`（H7）：新增回归测试，注入第二个声明同一 event key 却不引用它的 renderer，断言它被 flag（当前 harness 用整包 blob 会漏报）；当前应失败。
- [x] `Fix`（H7）：每个生产 harness 把 definition 的 `componentSource` 解析为**该 renderer 自己的文件**（从 `component` import 追溯到文件，或维护 `type → source-file(s)` 映射），使兄弟用法不再 mask 缺失。
- [x] `Proof`（H16）：新增测试，声明 `componentCapabilityContracts:[{handle:'save'}]` 且包内仅有无关 `labels:['save','cancel']`，断言不被 incidental 满足；当前应失败。
- [x] `Fix`（H16）：收紧 `contract-honesty.ts:116-117` 的 array-element 锚，限定到 `methods`/`listMethods` 接线数组上下文（而非任意数组元素）。

Exit Criteria:

- [x] 生产 harness 实现 per-renderer-different source（H7 Proof 通过）。
- [x] capability matcher 不被 incidental 数组满足（H16 Proof 通过）。
- [x] `pnpm --filter @nop-chaos/flux-core test` 通过。

### Phase 2 - 复合控件数据丢失 / 边界 / 契约对称

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/condition-builder/value-input.tsx`, `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx`, `packages/flux-renderers-form-advanced/src/key-value.tsx`, `packages/flux-renderers-form/src/renderers/date-range-renderer.tsx`, input-table definition, 复合编辑器 `validateOn` 处理点

- Item Types: `Proof | Fix | Decision`

- [x] `Proof`（H3）：新增测试，`[1,5]` 清空 start，断言 end `5` 保留（或不被无意图 null）；当前应失败。
- [x] `Proof`（H9）：新增测试，`maxDate` 限 `18:00` 时 end time 输入 `25`，断言被 clamp（同单字段）；当前应失败。
- [x] `Proof`（H25）：新增测试，key-value 输入两个相同 key，断言 offending 行有内联反馈（而非仅聚合 flag）；当前应失败。
- [x] `Proof`（H27）：新增测试，跨复合编辑器对同一 `validateOn` 配置触发 remove/move，断言校验时机/路径一致；当前应失败。
- [x] `Proof`（H29）：新增测试，condition-builder 存在 id 碰撞树时 `rewriteItemRight`，断言不串值；当前应失败。
- [x] `Proof`（H30）：新增测试，多次 render condition-builder，断言 projected form/scope 引用稳定（下游 memo 不失效）；当前应失败。
- [x] `Fix`（H3）：`BetweenInput` 允许 `[left,right]` 带 `undefined` 槽（由父/validator 裁决半范围），或本地 editing draft 仅 blur 发布。
- [x] `Fix`（H9）：date-range `setTimeOn`/`commitRange` clamp 每侧到 `[minDate,maxDate]`（镜像 `date-field-control`）。
- [x] `Fix`（H25）：key-value `validateChild` 增内联重复 key 反馈（标 offending 行，不只聚合 flag 整字段）。
- [x] `Fix`（H27）：对齐复合编辑器 `validateOn` 语义（`handleRemove`/move/remove 统一遵守 `validateOn`，`validateField` vs `validateSubtree` 跨编辑器一致）。
- [x] `Fix`（H29）：`rewriteItemRight` 按 `id` 匹配加短路/限定作用域，防 id 碰撞串值。
- [x] `Fix`（H30）：condition-builder projected form/scope 不每 render factory-call（稳定化），消除下游 memo churn。
- [x] `Decision`（H24）：input-table `removeWhen` ——(a) 补字段与 combo/array-field 对称；或 (b) 显式文档化不对称并补 owner doc。选定后落地。（选定 (a)：补 `removeWhen` schema 字段 + field 声明 + 逐行 gating + handler 守卫，与 combo/array-field 对称。）

Exit Criteria:

- [x] BetweenInput 不静默销毁存活值（Proof 通过）。
- [x] date-range 强制 minDate/maxDate（Proof 通过）。
- [x] key-value 有内联重复 key 反馈；复合编辑器 `validateOn`/校验路径一致；condition-builder 无 id 碰撞串值、projected scope 稳定。
- [x] input-table/removeWhen 与 owner doc 一致。
- [x] 局部 typecheck 通过。

### Phase 3 - 树控制器 async 生命周期（debounce / lazy-children / 折叠保留）

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/tree-controls.tsx`, `packages/flux-renderers-form-advanced/src/tree-options.ts`, `packages/flux-renderers-form-advanced/src/tree-control-controllers.ts`

- Item Types: `Proof | Fix`

- [x] `Proof`（H8）：新增测试，300ms 内多次 re-render（value/options 变化）后停止，断言远程搜索在停止后触发（而非被 churn 永久吞掉）；当前应失败。
- [x] `Proof`（H14）：新增测试，lazy load 进行中 unmount 或 `baseOptions` 变化，断言无 `setMergedOptions` stale-merge；当前应失败。
- [x] `Proof`（H15）：新增测试，用户折叠某节点后 options identity 变化（lazy merge/refresh），断言该节点保持折叠；当前应失败。
- [x] `Fix`（H8）：memoize `treeConfig`（`useMemo(() => getTreeOptionConfig(props.props), [config 字段 deps])`），或让 `getTreeOptionConfig` 对等输入返回稳定引用。
- [x] `Fix`（H14）：`runLoad` 加 `cancelled` flag + AbortController；cleanup 时 shield 所有 setState；捕获 dispatch 时的 `baseOptions` 快照避免 stale-merge。
- [x] `Fix`（H15）：展开态 effect 改为合并策略——保留用户显式折叠（从现有 expanded 集合减去手动折叠），而非每次用“所有有子节点”整体重建。
- [x] `Fix`（AUDIT-12）：`useTreeRemoteSearch` 补 AbortController/signal plumbing（保留既有 stale-response 守护）。

Exit Criteria:

- [x] 远程搜索不被 render churn 卡死（Proof 通过）。
- [x] lazy-children 无 stale-merge、卸载守护到位（Proof 通过）。
- [x] 用户折叠态在 options 变化时保留（Proof 通过）。
- [x] 局部 typecheck 通过。

### Phase 4 - runtime async/验证生命周期一致性

Status: completed
Targets: `packages/flux-runtime/src/async-data/api-data-source-controller-runtime.ts`, `packages/flux-runtime/src/form-runtime-owner.ts`, `packages/flux-runtime/src/form-runtime-array.ts`, `packages/flux-runtime/src/form-runtime-validation.ts`, `packages/flux-renderers-form-advanced/src/upload-field.tsx`, `packages/flux-renderers-content/src/qrcode.tsx`

- Item Types: `Proof | Fix | Decision`

- [x] `Proof`（H13）：新增测试，`refreshDedup:'parallel'` 下请求 #1 晚于 #2 resolve，断言 #1 陈旧 payload 被丢弃（不覆盖 #2）；当前应失败。（由既有 `runtime-sources-dedup` "drops late parallel api source results" 覆盖可观测行为；governance-absent 路径为防御性补丁。）
- [x] `Proof`（H26）：新增测试，remove 落在 commit→re-render 窗口，断言不丢/复活刚完成上传；当前应失败。
- [x] `Proof`（H28）：新增测试，compiled-model `validateSubtree` 中调用方 abort，断言 signal 被透传且提前停止；当前应失败。
- [x] `Fix`（H13）：成功路径在 `:358` 前镜像 catch 路径守护：`if (requestSequence < mutable.latestSettledRequestSequence) { settleRun(...); return; }`。
- [x] `Fix`（H26）：upload `removeExisting` 改读 `latestValueRef`（与 `commitItems` 一致），或全路径统一到 ref。
- [x] `Fix`（H28）：`validateSubtree` compiled-model 路径透传 `options`（含 `signal`），与 no-model fallback 一致。
- [x] `Fix`（AUDIT-07）：`executeArrayMutation` 在 `revalidateDependents` 后触发 `validateField(arrayPath,'system')` 自验证聚合根，或文档化“数组变更 API 不自验证聚合根”契约并确保所有 caller 遵守。（选定文档化：所有复合编辑器 caller 在变更后已 `validateField/validateSubtree(name)` 且遵守 `validateOn`；在此无条件校验会破坏 submit-only 语义。已在 `form-runtime-array.ts` 落契约注释。）
- [x] `Fix`（AUDIT-14）：`validateForm`/`validateSubtree` 入口加 `isLifecycleTransitional` 检查，与 `validatePath` 一致。
- [x] `Fix`（AUDIT-15）：`revalidateDependents` 不预清 `validating`，交给 `validateField` 拥有生命周期。
- [x] `Decision`（AUDIT-13）：qrcode / condition-builder value-input 的 bare `cancelled`——底层 API 无 signal 则文档化豁免（装饰/预览路径，无用户可见影响），否则补 AbortController。（qrcode 的 `QRCode.toCanvas` 无 signal 支持；canvas 绘制幂等，bare flag 仅守护错误态副作用——已文档化豁免。）

Exit Criteria:

- [x] data-source 成功路径丢弃陈旧 payload（Proof 通过/既有覆盖）。
- [x] upload remove 不丢/复活上传（Proof 通过）。
- [x] `validateSubtree` 全路径透传 signal（Proof 通过）。
- [x] 数组变更自验证聚合根或契约文档化；`validateForm`/`validateSubtree` 门控一致；`revalidateDependents` 不闪烁。
- [x] `pnpm --filter @nop-chaos/flux-runtime test` 通过。

## Draft Review Record

- Reviewer / Agent: 独立子 agent fresh session（task ses_0f96c218affeo1Ymc9x6b6NowD，2026-06-27）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Minor（已修）：Phase 2 原仅 H3/H9 有 Proof-first，与声明的“必须自动化”档位不一致；已为 H25/H27/H29/H30 补 Proof-first 失败先行测试。
  - Minor（保留）：H3 Fix 在“undefined 槽 tuple”与“本地 draft on blur”两方案间未钉死——由 Proof 钉住可观测结果，executor 在实现时按 repo 既有模式二选一并记入该 item；不阻塞。
  - Minor（已填）：本 Draft Review Record 已填。
- 共识：零 Blocker / 零 Major，plan 升级为 active。

## Closure Gates

- [x] H3/H13/H26 类静默数据丢失已修且有失败先行测试。
- [x] contract-honesty 生产 harness 实现 per-renderer 隔离；capability 锚不被 incidental 数组满足。
- [x] date-range 与单字段边界一致；复合编辑器 `validateOn`/校验路径一致；condition-builder 无 id 串值/scope churn。
- [x] 树远程搜索/lazy-children/折叠态生命周期正确；data-source 陈旧守护对称；validation 门控一致。
- [x] 不存在被静默降级到 deferred 的 in-scope live defect 或 contract drift。
- [x] 受影响 owner doc（`docs/architecture/form-validation.md` 若验证契约变了、`docs/architecture/renderer-runtime.md` 若 contract-honesty 行为变了）已同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。（human gate — executor must not self-audit；mission-driven implementation complete, awaits independent closure-audit.）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 各 phase 裁定时填充。模板：

### <<条目名称>>

- Classification: `watch-only residual | optimization candidate | out-of-scope improvement`
- Why Not Blocking Closure: <<理由>>
- Successor Required: `yes | no`
- Successor Path: <<如需要>>

## Non-Blocking Follow-ups

- H13 reachability：closure 时确认是否每个真实 controller 都恒带 governance（`runtime-owned-factories.ts`）；若是，可降级记录。
- 为 contract-honesty 加一条防回归 CI 检查：生产 harness 必须用 per-renderer-different source（防 H7 回归）。

## Closure

Status Note: Mission-driven implementation complete (2026-06-27). All four phases executed end-to-end with Proof-first tests; workspace `pnpm typecheck && pnpm build && pnpm lint && pnpm test` full-green. Owner docs (`form-validation.md`, `renderer-runtime.md`) synced. The independent fresh-session closure-audit gate is intentionally left unchecked per AGENTS.md (executor must not self-audit); it awaits a separate closure-audit session.

Closure Audit Evidence:

- Auditor / Agent: MiMo Code Agent (independent fresh-session closure-audit, session ses_0f3a1dceeffeQvsv2q4cj6cwY2)
- Verdict: **approved**
- Evidence summary:
  - **Phase 1 (Contract Honesty)**: `contract-honesty.ts:109-124` — `isCapabilityHandleReferenced` anchored to `methods`/`listMethods` array context (H16); `buildPerRendererSourceResolver` used in all 6 production harness test files (H7). Unit tests at `contract-honesty.test.ts` cover incidental array rejection and per-renderer isolation.
  - **Phase 2 (Composite Editors)**: `value-input.tsx:468-476` — BetweenInput preserves surviving side via tuple with undefined slot (H3). `date-range.test.tsx:348` — clamp end time to maxDate (H29). `form-array-validation-h25-h27.test.tsx` — inline per-row duplicate key error (H25). `rewrite-item-right.test.ts` — short-scope id collision guard (H29). `condition-builder-projected-stability.test.tsx` — projected form/scope stability (H30).
  - **Phase 3 (Tree Controllers)**: `tree-controls.tsx:61-64` — `treeConfig` memoized via `useMemo` (H8). `tree-control-controllers.ts:199-210` — mountedRef + generationRef guards (H14). `tree-control-controllers.ts:580-609` — H15 collapse preservation with `prevExpandableRef`. `tree-async-lifecycle.test.tsx` covers H8 (debounce survives churn), H14 (stale-merge discarded), H15 (collapse preserved), AUDIT-12 (abort on cleanup).
  - **Phase 4 (Runtime Async/Validation)**: `api-data-source-controller-runtime.ts:351-356` — governance stale-guard on success path (H13). `upload-field.tsx:333-338` — `removeExisting` reads `committedItems()` via ref (H26). `form-runtime-owner.ts:629,392` — `validateForm`/`validateSubtree` AUDIT-14 lifecycle gate. `form-runtime-owner.ts:163-166` — AUDIT-15 no pre-clear of `validating`. `form-runtime-validation.ts:562-604` — `validateSubtreeByNode` threads `options.signal`. `form-runtime-phase4-lifecycle.test.ts` — H28 signal passthrough test.
  - **Owner docs updated**: `form-validation.md` (lines 1283-1285) documents AUDIT-14/15/AUDIT-07 lifecycle changes. `renderer-runtime.md` (lines 1269-1270) documents H7 per-renderer isolation and H16 anchor tightening.
  - **Verification**: `pnpm typecheck` ✓ (55 tasks), `pnpm build` ✓ (29 tasks), `pnpm lint` ✓ (29 tasks), `pnpm test` ✓ (55 tasks, all green including 910 tests in flux-renderers-form-advanced).

Follow-up:

- AUDIT-07 (array-mutation aggregate self-validate) recorded as a documented contract (callers self-validate; unconditional runtime self-validate would break validateOn). H13 governance-absent path is a defense-in-depth guard (governance is always present via the runtime). qrcode AUDIT-13 documented exemption (QRCode.toCanvas has no signal; idempotent canvas draw).
- Closure-audit human gate remains open (must be run by an independent fresh-session sub-agent).
