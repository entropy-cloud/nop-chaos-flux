# 2 scheduling + content/ai 域 P2 修复（barcode/drag/calendar/kanban/gantt + i18n 文案 + 测试质量）

> Plan Status: completed
> Mission: component-audit
> Work Item: P2-backlog:scheduling-content
> Last Reviewed: 2026-08-07
> Source: `docs/audits/2026-08-07-1747-open-audit-component-audit.md`（2-4 部分/2-13/2-14/2-15/2-17/2-18/2-19/2-20）、`docs/audits/2026-08-07-1747-multi-audit-component-audit.md`（22-14/23-1/23-2/23-4）
> Related: `docs/plans/2026-08-07-1747-1-scheduling-p1-remediation.md`（completed——1-4/1-5/1-6/1-7/1-8/1-11 已收口，其中 use-calendar-drag-create 的 pointercancel 会话处理已落地，本批 2-14 仅剩 3 个 hook）、`docs/plans/2026-08-07-1023-3-kanban-public-component-helpers-precision-typing.md`（completed）

## Purpose

把 `docs/backlog/component-audit-roadmap.md` Follow-up Backlog「2026-08-07-1747 两轮审计 P2」中 **scheduling + content/ai 域** 的 12 条 P2 收口：barcode 连续同值扫描丢弃、3 个 drag hook 无 pointercancel、calendar 键盘 down 未知 resourceId、barcode/kanban/carousel/qrcode 硬编码英文文案、gantt 键盘日期编辑事件契约裁决、copy 提示 setTimeout 无卸载清理、scheduling 侧死导出清理，以及 gantt design.md @deprecated 同步与 3 条测试质量加固（kanban 假绿测试、gantt onTaskEdit 双路径断言、kanban-handle 句柄行为覆盖）。

## Current Baseline

- **barcode 连续同值扫描静默丢弃**（2-13，确定）：三层独立丢弃点叠加——(1) `use-barcode-detect.ts:102-105` `decoded.barcode === lastResultRef.current` 单值 key 抑制 setResult；(2) `barcode-scanner-overlay.tsx:147-149` consume-once guard `lastConsumedKeyRef` 按 `barcode|format` 键在 `batchMode` 分支**之前**无条件 return；(3) `barcode-queue-utils.ts:20-24` 同 rawValue 的 **pending** 项被标 duplicate 不入队（autoSubmit 只提交 pending，第二条同值丢失；已提交项 enqueue 有独立重复条目先例 :26-36）。批量模式连续同值数据丢失。
- **3 个 drag hook 无 pointercancel**（2-14，很可能）：`use-gantt-drag.ts`/`use-gantt-link-draw.ts`/`use-calendar-drag.ts` 只监听 pointermove/pointerup（live grep 零 pointercancel）——浏览器 pointercancel（触摸滚动中断、OS 手势）后 ghost 残留 + 窗口监听悬挂 + 后续 pointerup 误提交 drop（gantt 留 `gantt-drop-indicator` 0.3 opacity）。`use-calendar-drag-create` 已由 1747-1 Phase 3 修复（1-8），不在本批。
- **calendar 键盘 down 未知 resourceId 移入 resource[0]**（2-15，确定）：`calendar.tsx:320-325` `findIndex` → -1 时 `direction === 'down'` 得 `targetIdx = 0` 通过守卫落位首个资源，无守卫。
- **barcode/kanban 硬编码英文文案**（2-17，确定）：`use-barcode-camera.ts:96-99` 相机错误原文（overlay.tsx:257 仅 fallback 走 t()）；`barcode-scanner-overlay.tsx:350` `dup` 字面量；`kanban/hooks/use-kanban-board-effects.ts:146` `Dragging card: ${...}` aria-live 播报不走 t()（同族播报均走 t()）。
- **carousel/qrcode 硬编码文案**（2-18，确定）：`carousel.tsx:270` `` `Slide ${index+1}` `` placeholder、`qrcode.tsx:109` `` `QR code for ${valueStr}` `` aria-label 不走 t()。
- **gantt 键盘日期编辑派发 onTaskDragEnd 而非 onTaskEdit**（2-19，很可能）：`gantt.tsx:218,231,242,253` 键盘 move-up/move-down/resize-left/resize-right 走 `eventsRef.current.onTaskDragEnd`（:169 真实拖拽路径的 onTaskDragEnd 不属裁决范围）——design.md §8.1 语义切分（onTaskDragEnd=拖拽、onTaskEdit=编辑型），键盘日期改期是编辑型变更，host 以 onTaskEdit 持久化会静默漏改；存在「键盘即拖拽等价物」合理解读，需契约裁决。
- **copy 提示 setTimeout 无卸载清理**（2-20，确定）：`ai-feedback.tsx:51` / `ai-bubble/renderers/markdown.tsx:111` 1500ms `setCopied(false)` 卸载后 setState。
- **scheduling 死导出**（2-4 部分，确定）：`gantt/undo-stack.ts:63` `BatchUpdateTaskCommand` 生产零实例化（仅 undo-stack.test.ts 消费）；`use-calendar-drag-create.ts` 返回值块（:253-262）中 `availableTypes`/`dragCreateState` 生产零消费（calendar.tsx:384 只解构行为 API）。
- **gantt design.md @deprecated 漂移**（22-14）：`gantt.types.ts:160-178` 6 字段（scales/startDate/endDate/childrenField/initiallyExpanded/progressBarHeight）已 @deprecated，design.md §4/§5 仍列为 live props。
- **测试质量**：`kanban-renderer.test.tsx:418-448` 受控模式用例 if/else 条件性跳过（addCard 按钮永远找不到 → else 分支断言恒真，23-1）；gantt onTaskEdit 编辑保存与行内提交两条生产派发路径从未被端到端断言（23-2）；`kanban-handle.test.tsx:129-137` scrollToCard/scrollToColumn 仅登记方法名未 invoke 行为（23-4，P3）。
- **验证基线**：2026-08-07 全量 typecheck/build/lint 32/32、test 59/59（scheduling 893 / content 289 / ai 家族全绿）、`pnpm check` exit 0。

## Goals

- barcode 批量模式下连续同值不丢数据（重复条目正确入队/标记）。
- 3 个 drag hook 补齐 pointercancel 终结路径（清 ghost/监听，不误提交）。
- calendar 键盘 down 未知 resourceId 不静默落位首个资源（fail-closed 守卫）。
- 5 处硬编码英文文案（barcode 相机错误/dup、kanban aria-live、carousel Slide、qrcode aria-label）走 t()，i18n keys 补齐。
- gantt 键盘日期编辑事件契约裁决（onTaskDragEnd vs onTaskEdit）并落地，design.md 同步。
- ai-feedback/ai-bubble markdown 的 copy 提示定时器卸载清理。
- scheduling 死导出清理、gantt design.md @deprecated 同步、3 条测试质量加固。

## Non-Goals

- 不处理 calendar/kanban/gantt 未登记的其他行为改动（如 WIP canDrop 语义歧义——审计记录不报告项）。
- 不做 i18n key 体系重构（沿用 `useFluxTranslation().t()` 既有约定，按包内既有 key 风格新增）。
- 不修改拖拽 DnD 库或换实现。
- 不重跑全量 e2e 之外的场景扩展（2-19 裁决如需宿主验证，仅加 focused e2e）。

## Scope

### In Scope

- `packages/flux-renderers-scheduling/src/`：`barcode-input/hooks/use-barcode-detect.ts`、`use-barcode-camera.ts`、`barcode-input/barcode-scanner-overlay.tsx`、`barcode-input/barcode-queue-utils.ts`、`gantt/hooks/use-gantt-drag.ts`、`use-gantt-link-draw.ts`、`gantt.tsx`、`gantt/undo-stack.ts`、`calendar/hooks/use-calendar-drag.ts`、`calendar/calendar.tsx`、`calendar/hooks/use-calendar-drag-create.ts`、`kanban/hooks/use-kanban-board-effects.ts` 及对应测试。
- `packages/flux-i18n/src/locales/{en-US,zh-CN}.ts`（i18n keys 所在，`flux.barcode.*` 既有命名空间 :988-1017；scheduling 包内无 locales 目录）。
- `packages/flux-renderers-content/src/carousel.tsx`、`qrcode.tsx`；`packages/flux-renderers-ai/src/`（ai-feedback、ai-bubble markdown）。
- `docs/components/gantt/design.md`。
- `docs/backlog/component-audit-roadmap.md` Follow-up Backlog 对应条目勾选（2-4/2-13/2-14/2-15/2-17/2-18/2-19/2-20/22-14/23-1/23-2/23-4）。

### Out Of Scope

- 其他包的 i18n/行为项（2-18 之外 content 项、2-17 之外 scheduling 项）。
- 工具链与门禁改造。

## Failure Paths

| 场景               | 触发                               | 预期行为                                                      | 可重试 | 用户可见表现             |
| ------------------ | ---------------------------------- | ------------------------------------------------------------- | ------ | ------------------------ |
| drag 中断          | 触摸滚动/OS 手势触发 pointercancel | ghost/指示器清除、窗口监听移除、无 drop 提交                  | 是     | 拖拽干净取消，无残留视觉 |
| calendar 键盘 down | 事件 resourceId 不在 resources 中  | 不移动（保持原位），无资源切换                                | 是     | 无意外跨资源移动         |
| gantt 键盘改期     | ArrowLeft/Right/move/resize        | 按裁决契约派发（onTaskEdit 或明确记录 onTaskDragEnd 等价物）  | 是     | host 持久化不静默漏改    |
| 连续同值扫描       | 批量扫两个相同条码                 | 两条均产生处理（入队或显式 duplicate 标记可提交，按裁决落地） | 是     | 批量数据不丢失           |

## Test Strategy

本档选择：**建议有测**（行为修复 2-13/2-14/2-15/2-18/2-20 全部 test-first 先红后绿；2-19 为契约裁决项——契约/公共层修复按「必须自动化」纪律先写失败测试再实现；2-17 i18n 按既有 i18n key 断言模式补测；测试质量项 23-1/23-2/23-4 本身即测试）。

## Execution Plan

### Phase 1 - barcode + content/ai i18n 与定时器清理

Status: completed
Targets: `barcode-input/hooks/use-barcode-detect.ts`、`barcode-input/barcode-scanner-overlay.tsx`、`barcode-input/barcode-queue-utils.ts`、`use-barcode-camera.ts`、`carousel.tsx`、`qrcode.tsx`、`ai-feedback.tsx`、`ai-bubble/renderers/markdown.tsx`、`packages/flux-i18n/src/locales/{en-US,zh-CN}.ts`

- Item Types: `Decision | Fix | Proof`

- [x] 2-13 三层丢弃点收口（先裁决语义再落地）：连续同值在 **batch 模式**下应每条均产生处理（对齐已提交项 enqueue 重复条目先例 :26-36）——(1) detect 层去重/抑制窗口按模式调整（batch 放行连续同值，非 batch 保持防误触，补 1 条 detect 层非 batch 去重用例锁定）；(2) overlay consume-once guard（:147-149 无条件 return 位于 batchMode 分支之前）对 batch 模式按会话/扫描序放行；(3) queue 层 pending 同值裁决（入队新条目或显式 duplicate 标记且可提交）。裁决记录于 daily log；非 batch 防误触由 overlay C9 consume-once（`barcode-scanner-overlay.test.tsx:230`）与 queue duplicate 既有用例（`barcode-queue.test.ts:24,66`）锁定。
- [x] 2-17 barcode 部分：相机错误文案走 t()（新增 `flux.barcode.*` keys）；`barcode-scanner-overlay.tsx:350` `dup` 改 t()。
- [x] 2-18 carousel `Slide ${index+1}` placeholder、qrcode `QR code for ${valueStr}` aria-label 走 t()（content 包 i18n keys）。
- [x] 2-20 `setCopied(false)` 定时器卸载清理（ai-feedback.tsx:51、ai-bubble/renderers/markdown.tsx:111；useEffect cleanup 或 timeout ref）。

Exit Criteria:

- [x] 2-13 用例先红后绿：batch 模式连续同值 ×2 均产生处理（入队新条目或显式 duplicate 标记且可提交）；非 batch 防误触由 detect 层新增去重用例 + 既有 overlay/queue 用例锁定。
- [x] i18n 新 keys 在 en-US/zh-CN 双注册，`check:i18n-keys` 无新增命中；对应组件断言走 t()。
- [x] ai 包测试绿（copy 定时器清理用例）。

### Phase 2 - drag pointercancel 终结路径

Status: completed
Targets: `gantt/hooks/use-gantt-drag.ts`、`use-gantt-link-draw.ts`、`calendar/hooks/use-calendar-drag.ts`

- Item Types: `Fix | Proof`

- [x] 2-14 三 hook 补 pointercancel：与 pointerup 同等终结（清 ghost/`gantt-drop-indicator`/窗口监听、复位会话态、不提交 drop）；对齐 `use-calendar-drag-create.ts` 已落地模式（1747-1）。
- [x] 用例：pointercancel 后 ghost 清除 + 监听移除 + 无 drop 派发（每个 hook 至少 1 条）。

Exit Criteria:

- [x] 三 hook 测试先红后绿；scheduling 包测试绿。
- [x] `rg "pointercancel" packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-drag.ts packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-link-draw.ts packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-drag.ts` 非零。

### Phase 3 - calendar + kanban（resourceId 守卫 / i18n / 测试质量）

Status: completed
Targets: `calendar/calendar.tsx`、`kanban/hooks/use-kanban-board-effects.ts`、`kanban-renderer.test.tsx`、`kanban-handle.test.tsx`

- Item Types: `Fix | Proof | Follow-up`

- [x] 2-15 `calendar.tsx:320-325` 键盘 down：`resourceIdx === -1` 时 fail-closed（不移动），补守卫用例。
- [x] 2-17 kanban 部分：`use-kanban-board-effects.ts:146` aria-live 播报走 t()（`flux.kanban.*` key，对齐同族播报）。
- [x] 23-1 `kanban-renderer.test.tsx:418-448` 假绿修复：用 `getAllByText('+ 添加卡片')` 定位真实按钮点击后断言（或删除该用例并注明行为已由 kanban-handle.test.tsx 承担——二选一裁决）。
- [x] 23-4 `kanban-handle.test.tsx` 补 scrollToCard/scrollToColumn invoke 用例：存在 id 返回 `{ok:true}` + 不存在 id 返回 `{ok:false}`。
- [x] 2-4 部分：`use-calendar-drag-create.ts` 返回值块（:253-262）`availableTypes`/`dragCreateState` 死返回值——确认零消费后从返回值移除（或登记为保留 API），同步测试。

Exit Criteria:

- [x] 2-15/2-17 用例先红后绿；23-1 断言真实按钮（或删除裁决记录）；23-4 两条 invoke 用例绿。
- [x] `rg "availableTypes|dragCreateState" packages/ --glob '!**/*.test.*' --glob '!**/dist/**'` 零命中或登记说明。
- [x] scheduling 包测试绿。

### Phase 4 - gantt（键盘编辑事件契约 + design.md + 测试路径）

Status: completed
Targets: `gantt.tsx`、`docs/components/gantt/design.md`、`gantt.test.tsx`

- Item Types: `Decision | Fix | Proof`

- [x] 2-19 契约裁决：`gantt.tsx:218,231,242,253` 键盘编辑型变更（move-up/move-down/resize-left/resize-right）改派发 `onTaskEdit`（对齐 editor onCommit / grid onCellCommit / 键盘 Delete 三路径，22-07 家族约定），或裁决维持 onTaskDragEnd 并显式记录「键盘即拖拽等价物」解读 + design.md §8.1 语义补丁——裁决记录于 daily log；若改派发则对齐 eventCtx 全量 ctx（`{ event, evaluationBindings, scope }`）。
- [x] 23-2 gantt.test.tsx 端到端路径断言：渲染 Gantt + events.onTaskEdit，经真实 UI 路径触发编辑器保存与行内提交，断言收到 `{ _taskId, changes }` 且 ctx 携带 evaluationBindings（22-07 两条生产路径最终事件首次被断言）。
- [x] 22-14 gantt design.md §4/§5 同步 6 个 @deprecated 字段（scales/startDate/endDate/childrenField/initiallyExpanded/progressBarHeight）标注（对齐 calendar @reserved 先例）。
- [x] 2-4 部分：`gantt/undo-stack.ts:63` `BatchUpdateTaskCommand` 生产零实例化——裁决删除（含测试引用同步）或登记为公共 API 保留。

Exit Criteria:

- [x] 2-19 裁决落地（派发变更带 test-first 用例，或裁决记录 + design.md 同步）。
- [x] 23-2 端到端用例绿（编辑器保存 + 行内提交双路径）。
- [x] design.md §4/§5 与 gantt.types.ts @deprecated 一致；`check:active-doc-code-anchors` 无新增失效。
- [x] scheduling 包测试绿。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session）round 1 `ses_0235c5c73ffepbisOBciPQqNPC`（revised：1 Major）、round 2 `ses_023559f7dffe3h4DbMF2Z27gFv`（pass-with-minors）
- Verdict: `pass-with-minors`（round 2 共识，零 Blocker 零 Major）
- Rounds: 2
- Findings addressed: round 1 Major M1（2-13 三层丢弃点——detect/overlay consume-once/queue pending 全链路收口 + exit criterion 与 Goals 对齐）已修复；round 1 Minor 全部处理——gantt.tsx 行号更正为 :218/:231/:242/:253、use-calendar-drag-create 返回值块更正为 :253-262、Scope 移除不存在的 `flux-renderers-scheduling/src/locales`（i18n keys 定位 `packages/flux-i18n/src/locales`）；round 2 Minor 处理——queue-utils 行段更正（pending :20-24 / 已提交 :26-36）、非 batch 防误触改为 detect 层新增去重用例 + 既有 overlay/queue 用例双锁定、Failure Paths 措辞与执行项对齐。

## Closure Gates

- [x] 所有 in-scope 已确认 P2 缺陷（2-13/2-14/2-15/2-17/2-18/2-20）已修复并带 focused 测试
- [x] 2-19 契约裁决落地（派发变更 + test-first 或裁决记录 + design.md 同步）
- [x] 2-4 scheduling 死导出清理完成（移除或登记）
- [x] 22-14 gantt design.md @deprecated 同步；23-1/23-2/23-4 测试质量加固完成
- [x] 不存在被静默降级到 deferred 的 in-scope 缺陷
- [x] roadmap Follow-up Backlog 对应条目勾选（2-4/2-13/2-14/2-15/2-17/2-18/2-19/2-20/22-14/23-1/23-2/23-4）并注明 plan 引用
- [x] 受影响的 owner docs 已同步（gantt/design.md）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check` 零新增命中

## Deferred But Adjudicated

无（所有 in-scope 项均为已确认缺陷或契约面缺口，全部入 Fix/Decision/Proof，无延期项）。

## Non-Blocking Follow-ups

- scheduling/content/ai 包其余 open backlog 项（03-02/14-2 等工程链条目）归后续工程治理轮次，不影响本 plan 收口。
- `docs/logs/2026/08-07.md` 登记本轮裁决记录（2-19 键盘编辑事件契约、2-13 去重键、BatchUpdateTaskCommand 去向）。

## Closure

Status Note: 4 Phase 全 completed；12 条 in-scope P2 全部收口（行为修复 test-first 先红后绿——2-13 detect/queue/overlay 三层、2-14 三 hook、2-15 守卫、2-19 键盘编辑契约均经 red 验证）；closure-audit 由独立 fresh session 执行，证据见下。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session）`ses_022e201ffffeSiRRtG6e8aq1Hh`
- Evidence: 三件套（task plan + diff summary + verification output）输入独立复核，verdict **pass**——计划全部 `[x]`（仅 closure-audit gate 一项留待本证据）；代码落地逐项核实（pointercancel 三 hook `use-gantt-drag.ts:148,164,184` / `use-gantt-link-draw.ts:103,112,118` / `use-calendar-drag.ts:155-170`、`availableTypes` 全仓零命中、`BatchUpdateTaskCommand` 全仓零引用、gantt.tsx 键盘四分支 `:222,235,246,257` 走 `dispatchTaskEdit`（`:174`）且 onTaskDragEnd 仅真实拖拽路径（`:169`）、`calendar.tsx:324` fail-closed 守卫、overlay 对象身份 consume-once（`:152-157`）+ `dedupe: !batchMode`（`:88`）+ `alwaysAppend`（`:159`）、design.md §4/§5 六字段 @deprecated（`:64,69,72,76,78,88,230`））；测试实测绿（scheduling 82 files/**917**、ai 64/**514**、content 35/**291**）；23-1 无 if/else 恒真、新增用例无假绿；roadmap 12 行 `[x]` 附 plan 引用 + daily log 执行记录齐全；`git diff --stat` 无构建产物泄漏、`pnpm check` exit 0。唯一 minor：i18n 新增 keys 实为 6 对（非 8），无实质影响。

Follow-up:

- no remaining plan-owned work（Non-Blocking Follow-ups 已列：其余 backlog 归工程治理轮次）。
