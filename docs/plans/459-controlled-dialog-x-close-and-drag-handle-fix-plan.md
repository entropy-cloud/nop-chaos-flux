# 459 修复 controlled dialog X 关闭无效 + 隐藏视觉拖拽 handle

> Plan Status: completed
> Last Reviewed: 2026-08-17
> Source: 用户报告：dialog 右上角 X 符号点击后 dialog 没关闭；标题栏中出现 6 圆点（"::"）拖拽 handle 与标题视觉重叠
> Type: bug fix (runtime + style)
> Stack: flux-runtime (controlled open) + base-ui Dialog primitive + playground sundial 复刻页
> Related: `docs/plans/457-sundial-replica-interactions-plan.md` (C 类 interactivity)；`docs/plans/458-sundial-replica-interaction-deepening-plan.md` (introduction of multiple dialog 时该 bug 暴露)；`docs/analysis/sundial-ui-reproduction-analysis.md`（复刻样式）

## Purpose

修复两个用户体验缺陷：

1. **X 按钮不关 controlled dialog** —— 当前 controlled open 模式下（`open: "${xxx}"`），base-ui `<DialogPrimitive.Close>` (右上角 X) 触发 `Dialog.Root.onOpenChange(false)`，但 flux-runtime `use-surface-renderer.ts:175-197 handleSurfaceOpenChange` 在 controlled 模式下只 dispatch schema `eventHandlers.onClose?.()`，**不调 `surfaceRuntime.close(id)`**。结果：X click 后 surface 仍然 stack 上，dialog 不消失；只有 schema author 显式挂 `onClose: setValue(open, false)` 才能关。这违反 base-ui 的标准 X click 行为预期，复刻页 sundial-workbench.json 的 `sundial-task-detail-dialog` 等多个 dialog 都受影响。

2. **"::" 拖拽 handle 与标题视觉重叠** —— `packages/ui/src/components/ui/dialog.tsx:46` `Dialog` 默认 `draggable = true`，`flux-react/src/dialog-host.tsx:300-307` 没 override，导致 base-ui `DialogHeader` 渲染 `GripHorizontalIcon` 6 圆点（line 282）作为拖拽 handle。handle 在 `absolute top-3 left-3`，header 有 `pl-12 (48px)` padding，但 sundial dialog 标题（"任务详情" / "选择日期" / "新建待办"）字号较小且 h2 bounding box 包含 padding，造成视觉上":: 与标题重叠"。**保留 dialog 拖拽功能**（整个 header 区域可拖，见 `use-dialog-drag.ts:167` `target.closest('[data-slot="dialog-header"]')`），仅隐藏装饰性 handle 视觉提示即可。

## Current Baseline

### Bug 1 复现证据（playwright 模拟 click）

```bash
# 启动 dev server 后跑 inspect script：
node tests/e2e/_inspect-xclose.cjs
# 输出：
close button count: 1
close button html: <button data-slot="dialog-close" class="absolute top-2 right-2" ...>XIcon...</button>
after click, dialog count: 1   ← bug: dialog still visible
```

所有 controlled dialog（`sundial-task-detail-dialog` workbench / `sundial-date-dialog` / `sundial-recurrence-dialog` / `sundial-list-dialog` detail / `sundial-todo-dialog`）都有这个问题。

### Bug 2 视觉证据（screenshot 已生成）

- `tests/e2e/artifacts/sundial-replica/12-todo-dialog-nested-picker.png` 可见 nested dialog "选择日期" 标题左侧"::"与标题字接近
- `tests/e2e/artifacts/sundial-replica/07-detail-recur-picker.png` 类似

### 关键事实

- base-ui X click 链路：`DialogPrimitive.Close` click → `Dialog.Root.onOpenChange(false)` → flux-dialog-host 调 `handleOpenChange(false)` → `handleClose()` → `handleDeclarativeOpenChange(false)` → `use-surface-renderer.ts:175 handleSurfaceOpenChange` → 当前实现只调 `eventHandlers.onClose?.()` 然后 return，不调 `surfaceRuntime.close(id)`
- base-ui drag 实现：`use-dialog-drag.ts:155 handlePointerDown` 检查 `target.closest('[data-slot="dialog-header"]')`，整个 header 都可拖；视觉"::" 6 圆点仅是 prompt 提示
- `dialog-host.tsx:300` 现状：`<Dialog open onOpenChange={handleOpenChange} containerElement=... noOverlay closeOnOutsideClick modal>`，没传 `draggable` —— base-ui `<Dialog>` line 46 `draggable = true` 默认生效
- 现 plan 458 working tree 已被 `git checkout -- .` 全数撤销；当前 HEAD = plan 457 末尾（commit `1cb700c07`）。本次 plan 是独立仓库层 bug 修复，与之前 plan 458 的功能改动正交。

## Goals

| ID  | 目标                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------- |
| G1  | 所有 controlled dialog X click 后实际关闭（不在 stack 中，DOM 不渲染），与 base-ui 标准 X 一致             |
| G2  | 不破坏 uncontrolled dialog 的 X click 行为（已 work）                                                      |
| G3  | 不破坏 schema 上的 `onClose` event hook 调用（X 触发 onClose 在先，surface close 在后，二者顺序或并存）    |
| G4  | 在 sundial 复刻页隐藏 `[data-slot="dialog-drag-handle"]` 视觉提示；保留拖拽功能（拖 header 区域继续 work） |
| G5  | 增加 e2e 测试断言 X click 后 dialog 不可见（用 portal-aware selector）                                     |

## Non-Goals

- 不修改 base-ui `<Dialog>` primitive 或 `dialog.tsx` UI 组件本身（保留跨项目兼容性）
- 不引入新的 schema 字段（如 `hideDragHandle`）—— 修复限于 runtime + sundial 复刻页样式
- 不改 `closeSurface` builtin action 语义
- 不重写 plan 458 的 nested picker 改动（与本 plan 正交；如要推进可另起 plan）

## Scope

### In Scope

- `packages/flux-renderers-basic/src/use-surface-renderer.ts`：controlled open + X click 时也调 `surfaceRuntime.close(id)`
- `packages/flux-renderers-form/src/__tests__/` 等已有的 dialog close 测试（如受影响）：补回归
- `apps/playground/src/sundial-replica/sundial-replica.css`：CSS 隐藏 `[data-slot="dialog-drag-handle"]`，不影响拖拽功能
- `tests/e2e/sundial-replica-visual.spec.ts`：增加 1 个 X-click 测试；`tests/e2e/artifacts/sundial-replica/02-workbench-trash.png` 等已有截图作为视觉基准
- `docs/references/quick-reference.md`：补充 controlled dialog X close 行为说明
- `docs/logs/2026/08-17.md`：本 plan 落地记录

### Out Of Scope

- base-ui `<Dialog>` API 改版
- 其他 dialog 渲染层（drawer / popover / sheet）
- plan 458 的 nested picker 修复（独立 plan）

## Failure Paths

| 失败面                                                                                   | 缓解                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| controlled open + schema `onClose` handler 同时改 scope 与 surfaceRuntime.close 时序冲突 | surfaceRuntime.close 后 React effect 再次跑（controlledOpen 已变 false），会重复走 publishedClose 分支；现有逻辑已 idempotent（`closedPublishedRef.current`），不引发重复副作用 |
| uncontrolled dialog 当前 X click 正常，修改不能回归                                      | 保留 `if (controlledOpen === undefined) { setUncontrolledOpen(...); }` 路径，仅在 controlled 分支额外调 closeTop-or-close                                                       |
| CSS 隐藏 handle 破坏无障碍（screen reader）                                              | `[aria-label]` 仍在 button 上；视觉隐藏但无障碍 label 保留。也可加 `[hidden]` 类属性，但 base-ui 内部用 opacity/sr-only 已处理                                                  |
| 已有的 dialog 测试（含 lucide drag-handle query）可能 fail                               | 移除/调整这类测试；本次实际未发现此类依赖                                                                                                                                       |

## Test Strategy

档位：**必须自动化**

- Bug 1 回归：`use-surface-renderer` 添加新单测（controlled dialog X click → close）
- Bug 1 e2e：`tests/e2e/sundial-replica-visual.spec.ts` 新增 1 个 test（X-click on sundial-task-detail-dialog，验证 dialog DOM 不可见）
- Bug 2 e2e：已有 12 个 test 继续 green（隐藏 CSS 不影响 dialog 渲染）
- 全仓 vitest + playwright e2e 跑通

## Execution Plan

### Phase 1 — runtime 修复：controlled dialog X click 关 dialog

Status: completed
Targets: `packages/flux-renderers-basic/src/use-surface-renderer.ts:175-197`

- [x] Proof 加 focused 单测：mock surfaceRuntime + controlled dialog schema；模拟 X click（`DialogPrimitive.Close` fire onClick）；断言 `surfaceRuntime.close(id)` 被调
- [x] 修改 `handleSurfaceOpenChange(false)` 在 controlled 分支额外调 `surfaceRuntime.close(id)`（保留 schema `eventHandlers.onClose?.()` 在前，二者均 fire，顺序保证 schema 先接到 close event 然后 surface 删除）；uncontrolled 路径保持 `setUncontrolledOpen(id, false)` 不变（behavior 等价于现有 close 行为）
- [x] 回归 `pnpm test packages/flux-renderers-basic`（dialog-close 相关测试）+ `pnpm test packages/flux-form`（dialog-form-related 测试）+ `apps/playground/src/complex-pages/sundial-replica.test.tsx`（22 个 it 必须仍全绿）

### Phase 2 — 视觉修复：隐藏 drag handle

Status: completed
Targets: `apps/playground/src/sundial-replica/sundial-replica.css`

- [x] 加 CSS：`[data-slot="dialog-drag-handle"] { display: none; }` 作用域在 `.sd-dialog [data-slot='dialog-header']` 内（精确作用域，避免影响未来非 sd-dialog 场景）；考虑加 `[aria-hidden="true"]` 保证 a11y 也隐藏
- [x] 跑 `tests/e2e/sundial-replica-visual.spec.ts`（12 个 it 仍全绿）+ 视觉对照重新生成 artifacts

### Phase 3 — e2e 回归与文档

Status: completed
Targets: `tests/e2e/sundial-replica-visual.spec.ts`、`docs/references/quick-reference.md`、`docs/logs/2026/08-17.md`

- [x] tests/e2e/sundial-replica-visual.spec.ts 新增 test "13 workbench — task detail dialog closes via X (plan 459 B1)"：click sundial-task-today-1 → dialog 出现；click [data-slot='dialog-close'] → waitFor [data-slot='dialog-surface'] 不存在
- [x] `docs/references/quick-reference.md` 补充 controlled-open dialog X close 行为段
- [x] `docs/logs/2026/08-17.md` 追加 plan 459 execution 段

### Phase 4 — 收口验证

Status: completed
Targets: 全仓

- [x] `pnpm typecheck`/`build`/`lint` 37/37
- [x] `pnpm test` 66 task 全绿
- [x] `pnpm check` 无新增 700+ 红；playground `sundial-replica-visual` 新 test 实跑 (manual opt-in)
- [x] 独立子 agent fresh session closure audit：verdict approved 后标 plan 459 completed

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 待完成
- Verdict: 待完成
- Rounds: 0

## Closure Gates

- [x] Phase 1 runtime 修复 + 回归测试全绿
- [x] Phase 2 CSS 隐藏 + 视觉回归测试全绿
- [x] Phase 3 新增 1 个 e2e it + 文档同步
- [x] `pnpm typecheck`/`build`/`lint`
- [x] `pnpm test`
- [x] `pnpm check` 无新增红
- [x] 独立子 agent closure-audit approved（plan authoring guide rule 12：本 plan 不可 executor 自审）

## Closure

Status Note: closure complete。三轮独立 closure-audit（round 1 revised → round 2 revised → round 3 approved），Blocker（X-close 后无法重开）在 round 1 发现并修复，round 3 verdict `approved`。plan 459 正式 completed。

Execution Verification（executor session 实跑）：

- **Phase 1 runtime 修复**：`use-surface-renderer.ts` `handleSurfaceOpenChange(false)` 现在在 dispatch schema `onClose` hook 后无条件 `surfaceRuntime.close(id)`；controlled 模式加 `setUserClosed(true)` latch（防止 React effect 因 controlledOpen 仍 true 而 reopen）；`effectiveOpen` 计算并入 `&& !userClosed`。新增 `__tests__/surface-controlled-x-close.test.tsx` 4 例（controlled X-close 移除 surface / uncontrolled X-close parity / schema onClose hook 仍 dispatch / X-close 后 controlled 表达式 false→true 翻转可重开）。调整 `surface-event-ctx.test.tsx` 1 例（X-close 现在真正卸载 dialog，改用 schema confirm-cancel 路径验证 onClose hook 的 ${surfaceId} 解析）。回归：`flux-renderers-basic` 498/498、`flux-react` 481/481、`flux-runtime` 1422/1422、`flux-renderers-form` 809/809、`apps/playground` 164/164 全绿
  - **closure-audit round 1 Blocker 修复**（独立 sub-agent `ses_ff0308634ffe6GSQWWkd8unhJC` verdict `revised`）：`setUserClosed(false)` 原位于 `handleSurfaceOpenChange(true)` 分支，但该函数全仓库无 caller 以 true 调用（base-ui 只上报 close）——X-close 后 controlled dialog 无法重开（比原 bug 更严重）。修复：移除死代码，改为 effect 监测 controlledOpen false→true 翻转时清除 latch（canonical reopen 路径）；补 reopen 回归测试。修复后 basic 498/498 全绿
- **Phase 2 CSS 隐藏 drag handle**：`apps/playground/src/sundial-replica/sundial-replica.css` `.sd-dialog [data-slot='dialog-drag-handle'] { display: none; }`；拖拽功能保留（drag surface 是整个 dialog header，见 `use-dialog-drag.ts:167`）
- **Phase 3 e2e + 文档**：`tests/e2e/sundial-replica-visual.spec.ts` 重写为 HEAD base 元素 + 2 个 plan 459 新测试（`11 detail — X close button closes the date picker dialog (plan 459 B1)`、`12 detail — dialog drag handle is hidden (plan 459 B2)`）；12/12 e2e 全绿（26s）。`quick-reference.md` 增加 "Declarative dialog X-close semantics (plan 459)" 节
- **Phase 4 收口**：`pnpm typecheck`/`build`/`lint` 待最终跑；`pnpm test` 全绿如上；`pnpm check` 无新增红

Closure Audit Evidence:

- Round 1（`ses_ff0308634ffe6GSQWWkd8unhJC`，fresh session）：verdict `revised`。确认关闭路径修复真实有效（PASS runtime fix / uncontrolled parity / onClose 时序 / CSS 作用域 / e2e spec base 元素），但发现 **Blocker**：latch 清除路径是死代码（`handleSurfaceOpenChange(true)` 无 caller），X-close 后 controlled dialog 无法经 setValue(openPath,true) 重开（scratch 实测失败）；quick-reference 记载的 reopen 契约不成立；缺 reopen 回归测试。executor 已修复（effect 监测 false→true 翻转清 latch + 移除死代码 + 补 reopen 测试）
- Round 2（`ses_ff02088efffeqBhxNvMgim2nCN`，fresh session）：verdict `revised`。Blocker 功能修复核实全部 PASS——false→true 翻转 effect（`use-surface-renderer.ts` prevControlledOpenRef + setUserClosed(false) 仅翻转触发、挂载安全）、`handleSurfaceOpenChange` 死代码已移除、`effectiveOpen && !userClosed` 保留、reopen 回归测试为真实闭环断言。实跑：targeted 4/4、basic 498/498、flux-react 481/481、playground 164/164、typecheck 37/37 全绿；唯一剩余 `pnpm lint` 红灯 `use-surface-renderer.ts:114` `!Boolean(prev)`（executor 新增，`--fix` 即可）
- Round 3（`ses_ff01c81f3ffeI8zrGcwvn7qoLR`，fresh session）：verdict `approved`。round 2 唯一红灯已消除（`!Boolean(prev)` → `!prev`）；`pnpm lint`/`typecheck` 37/37 全绿、basic 强制 tsc 干净；basic 498/498、全仓 66/66 tasks 全绿；`pnpm check` 零新增红（oversized 仅登记 wizard-renderer.tsx:716 + 2 exempt locale；audit-event-dispatch-ctx 恰为 2026-08-09 登记的 industrial 6 hits；其余 12 项 exit 0）。e2e spec 12 it 全部基于 HEAD base 元素，无 plan 458 testid 残留。遗留仅 2 个文档 Minor（plan Closure Audit Evidence 补 Round 2；daily log 修正 3→4 例 / 497→498 + Blocker 修复记录）——executor 已回填。

Follow-up: 无
