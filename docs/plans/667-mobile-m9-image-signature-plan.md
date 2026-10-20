# 667 Mobile M9 图像与手写组计划

> Plan Status: completed
> Last Reviewed: 2026-10-20
> Source: `docs/components/mobile-native-components-roadmap.md` M9（M9a ImageViewer 手势预览 / M9b Signature 签名）；交互基线 `docs/analysis/2026-10-19-mobile-advanced-libs-deep-research.md` §4.1（vant ImagePreview 双指触点缩放 + 缩放态冻结横翻仲裁；vant Signature undo 2026-03 增强）与 §5 L153（arco image-preview iOS 防模糊）
> Related: `docs/plans/664-mobile-m6-gesture-infrastructure-plan.md`（M6 底座）、`docs/plans/666-mobile-m8-bottom-panels-plan.md`（弹层壳先例）、`docs/plans/507-missing-components-l2-3-input-signature-plan.md`（既有 input-signature）

## Purpose

交付图像与手写两能力：M9a `image-viewer`（手势预览弹层：双指触点缩放、双击 1↔2、多图横翻、下滑关闭、缩放态冻结横翻仲裁）为**新增** mobile 渲染器；M9b 手写签名为**既有 `input-signature`（flux-renderers-form，plan 507）的能力增强**——补二次贝塞尔平滑、undo/export 句柄方法与 onChange 事件，不新建 mobile 签名组件（避免与既有能力 1:1 重复的双实现，与「不建 `*-mobile` 双实现」红线同源）。

## Current Baseline

- M6–M8 已落地（commits 249821d7f/09c177080/9922a1e21）：VelocityTracker、rubberband、MomentumAnimator、useLockScroll、弹层壳模式（wheel-picker-popup/action-sheet 先例）；ui 包既有 `useGlobalZIndex`（M0.1，commit 540cb8e40）。
- 包测试基线 30 文件 / 342 用例全绿（plan 666 收口值）；定义面 13 类型（MM-11 钉死）。
- **image-viewer 无既有代码**（全仓 grep 零命中）；**signature 已有 `input-signature`**（flux-renderers-form：`signature-renderer.tsx`/`schemas-signature.ts`/`signature-renderer-definitions.ts` + 9 focused 测试，plan 507）——既有能力：pointer canvas 采集、per-stroke undo、clear、`toDataURL` 导出、penColor/penWidth/height/backgroundColor/clearable、disabled、DPR 缩放、外部 value echo、`useStandardFieldHandle` 句柄 `['clear','reset']`。**净增量缺口**：二次贝塞尔平滑（既有为 lineTo）、`onChange` 事件（笔画结束派发 dataURL）、句柄 `undo`/`export` 方法。
- jsdom 无 canvas 2D context / toDataURL；既有先例 `input-signature.test.tsx` 的 `stubCanvas` 同时 mock getContext+toDataURL+Image。
- `input-image`/`verification-code` 等既有表单组件与本计划无耦合。

## Goals

- **M9a `image-viewer`**：受控打开的图片预览弹层（遮罩 + 黑底）：①双指捏合以触点为中点缩放（scale 1–4 clamp + translate matrix，双指中点跟随）；②双击在 1↔2 缩放切换（以点击点为中心）；③多图 `images` 横向翻页（translateX 轮播 + 页码指示）；④单图/首末页下拉关闭（rubberband 跟手 + 越过阈值松手关闭）；⑤缩放态（scale>1）冻结横翻仲裁；⑥`onClose`/`onChange`(当前页) 事件；遮罩点击关闭。
- **M9b `input-signature` 增强**（flux-renderers-form，非新组件）：①笔迹二次贝塞尔平滑（quadraticCurveTo 中点法，替代 lineTo）；②句柄方法扩展 `undo`（空栈 no-op）/`export`（返回 png dataURL）——经 `useStandardFieldHandle` methods 扩展；③`onChange` 事件（笔画结束派发 dataURL）；④以上均有 focused 测试。
- MM-11 演进（13→14 定义）+ playground `/m9-image-signature` + e2e。

## Non-Goals

- 不新建 mobile 签名组件（`input-signature` 已覆盖，红线同源：不建双实现）。
- 不做 iOS 缩放防模糊补偿（arco 方案，img 宽高重写 + 反向 scale）——Deferred 节预登记。
- 不做 viewer 旋转/保存按钮、signature 压感/多指书写。
- 不做 viewer 的缩放拖拽边界回弹动画精调（clamp 即可）。
- 不改 `@nop-chaos/ui`。

## Scope

### In Scope

- `packages/flux-renderers-mobile/src/`：`image-viewer.tsx`、`viewer-matrix.ts`（缩放/位移 matrix 纯函数）+ 测试、schemas/extended 注册/导出/styles。
- `packages/flux-renderers-form/src/renderers/signature-renderer.tsx` + 测试：平滑/undo/export/onChange 增强。
- `packages/flux-runtime/src/input-component-handle.ts` + `packages/flux-react/src/hooks/use-input-component-handle.ts`：`InputHandleMethod` 联合扩展 `'undo' | 'export'`（bindings 槽位 + switch case；Protected Area plan-first 凭据 = 本 plan + draft review，M8c ui 包 ask-first 同口径）。
- `docs/components/image-viewer/design.md`（含手势仲裁表）、`docs/components/input-signature/design.md` 增补（平滑/undo/export/onChange 契约）。
- playground 演示页 + e2e。

### Out Of Scope

- `input-signature` 之外的 form 包改动；iOS 防模糊（Deferred）；旋转/压感/多指。

## Failure Paths

| 可测场景编号          | 触发                          | 行为                                         | 可重试 | 用户可见表现 |
| --------------------- | ----------------------------- | -------------------------------------------- | ------ | ------------ |
| `pinch-clamp`         | 双指张合越界                  | scale clamp [1,4]，matrix 以触点中点为不动点 | 是     | 平滑缩放     |
| `zoom-freeze-paging`  | scale>1 时横滑                | 平移图片（clamp 边界），不翻页               | 是     | 平移浏览     |
| `swipe-down-close`    | 首页/未缩放下滑超阈值         | 关闭 viewer                                  | 是     | 关闭         |
| `images-empty-or-oob` | images 空 / initialIndex 越界 | 空态/钳制首末页，不抛错                      | 是     | 空态或边界页 |
| `image-load-error`    | 图片加载失败                  | 占位标记，viewer 其余功能可用                | 是     | 破图占位     |
| `undo-empty-stack`    | 无笔画时 undo                 | no-op 不抛错                                 | 是     | 无变化       |
| `ctx-missing-degrade` | 运行时 getContext 缺失        | 降级为只读占位（对齐既有 hasContext 路径）   | 是     | 占位         |

## Test Strategy

档位选择：**必须自动化**（matrix 纯函数与手势仲裁是正确性契约；canvas 增强以既有 `stubCanvas` 先例覆盖——其同时 mock getContext+toDataURL+Image，`onChange` dataURL 断言依赖 toDataURL stub）。

## Execution Plan

### Phase 1 - M9a viewer-matrix 纯函数 + image-viewer

Status: completed
Targets: `packages/flux-renderers-mobile/src/{viewer-matrix,image-viewer}.{ts,tsx}`、`viewer-matrix.test.ts`、`image-viewer.test.tsx`、schemas/extended 注册、MM-11 门禁更新（13→14）

- Item Types: `Proof`、`Fix`

- [x] Proof: `viewer-matrix.test.ts` 先行——`pinchMatrix({scale, prevScale, anchorX, anchorY, prev})`（不动点缩放：ratio = clamp 后新 scale/旧 scale；translate' = anchor − (anchor − translate)·ratio；**anchor 逐 move 事件取当前双指中点重锚定，即中点跟随语义**）、`clampScale`（[1,4]）、`panClamp(scale, w, h)`（缩放后平移边界）、`resolveGesture` 仲裁（单指未缩放=翻页/下拉、双指=pinch、scale>1 单指=平移）
- [x] Fix: `image-viewer.tsx`——受控 `open`/`images`/`initialIndex`；**双指触摸采集（TouchEvent 以 identifier 为键 map；不复用 useTouch——其单指 touches[0] 快照无法表达双指逐指追踪；jsdom/happy-dom 可合成）**、双击检测（300ms 窗口）、横翻 + 页码、下滑关闭（rubberband + 阈值）、缩放态冻结横翻、遮罩/z-index 栈/滚动锁复用弹层壳模式；**DOM 断言通道：`data-index`（页码）、`data-scale`（当前缩放，e2e 双击断言依赖）**；`ImageViewerSchema` + 注册 + events（onClose/onChange）
- [x] Proof: 组件测试——双击切换 scale（data-scale 1↔2）、缩放态冻结横翻、下滑关闭（onClose）、页码 onChange、空 images/越界 initialIndex、遮罩关闭

Exit Criteria:

- [x] matrix 基准值测试全绿；组件测试全绿；包测试零回归；MM-11 门禁 14 类型通过

### Phase 2 - M9b input-signature 增强（flux-renderers-form）

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/signature-renderer.tsx`、`__tests__/input-signature.test.tsx`、`docs/components/input-signature/design.md` 增补

- Item Types: `Proof`、`Fix`

- [x] Proof: 测试先行（复用既有 `stubCanvas` 先例 mock getContext+toDataURL+Image，onChange dataURL 断言依赖 toDataURL stub）——①平滑：采集点列后路径含 quadraticCurveTo 中点（stub context 记录调用）；②undo 句柄：strokes 栈非空弹出重绘、空栈 no-op；③export 句柄：返回 toDataURL 结果；④onChange：笔画结束派发 dataURL（前缀 `data:image/png`）；⑤既有 9 用例零回归（平滑重构不破坏采集/undo/clear 既有断言——判别点）
- [x] Fix: `signature-renderer.tsx`——①采集点列二次贝塞尔平滑（中点法）；②`useStandardFieldHandle` methods 扩展 `undo`/`export`（`SIGNATURE_METHODS` 增补 + flux-runtime/react 句柄通道扩展）；③onChange 裁决：表单值通道已在笔画结束提交 dataURL（既有 `commit()` → `handlers.onChange`），独立 ActionSchema 事件属双通道冗余不新增——见 Deferred But Adjudicated；④`docs/components/input-signature/design.md` 增补契约

Exit Criteria:

- [x] `input-signature.test.tsx` 新旧用例全绿（既有 9 用例零回归 = 平滑重构判别点）
- [x] design.md 增补与实现一致

### Phase 3 - 集成面：演示页、e2e、MM-11、roadmap 勘误

Status: completed
Targets: playground `/m9-image-signature`、`tests/e2e/mobile-image-signature.spec.ts`、roadmap M9 行勘误（M9b 行同步勘误为「input-signature 增强」）

- Item Types: `Fix`、`Proof`

- [x] Fix: 演示页（多图 viewer 打开按钮 + input-signature 画板 + 内建 undo/clear 工具条；export 经句柄通道无独立按钮）
- [x] Proof: e2e——viewer 打开/双击缩放（data-scale 断言）/下滑关闭（CDP 拖拽）、signature 笔画后位图导出通道断言（toDataURL 长度基线 + undo 回归）+ 表单值通道（单测）；`setViewportSize` 冒烟
- [x] Fix: roadmap M9 行就地勘误（M9a 状态回写 + M9b 勘误为「input-signature 增强」+ iOS 防模糊 Deferred 注记）——随收口提交

Exit Criteria:

- [x] e2e 全绿；`pnpm check` 除既有 knip xlang 红外零新增红

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `pass`（Round 2；Round 1 fail 1 Blocker + 1 Major）
- Rounds: 2
- Findings addressed:
  - R1-Blocker B1 baseline「signature 无既有代码」为假（input-signature plan 507 已落地，M9b 近全量重复）→ 采纳修法 ③：M9b 改判为 input-signature 能力增强（贝塞尔平滑/onChange/undo+export 句柄），Baseline/Goals/Phase 2/roadmap 勘误全线同步，规避 `*-mobile` 双实现红线
  - R1-Major M1 data-scale e2e 断言通道未声明 → Phase 1 Fix 显式声明 data-index/data-scale DOM 输出
  - R1-Minor m1–m9 全部吸收（useGlobalZIndex 归属、pinchMatrix ratio/中点跟随语义、不复用 useTouch 裁决、stubCanvas 点名、arco §5 L153 勘误、useStandardFieldHandle 先例、MM-11 13→14、Failure Paths +3、i18n 归位）
  - R2-残留 Last Reviewed 随本回填更新、e2e 措辞收敛为真实导出通道

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope contract drifts 已收敛（M9b 双实现风险经 Decision 消除）
- [x] 行为/契约结果已达成（Phase 1–3 Exit Criteria 全勾）
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步（image-viewer design.md 新立 + input-signature design.md 增补 + roadmap M9 行勘误）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（对照既有红集合；零新增）

## Deferred But Adjudicated

### input-signature 独立 onChange ActionSchema 事件（不新增）

- Classification: `out-of-scope improvement`（相对计划 Phase 2 第③项字面）
- Why Not Blocking Closure: 执行时核实 `input-signature` 为表单字段——笔画结束的 dataURL 已由既有 `commit()` → `handlers.onChange` 表单值通道派发（plan 507 值语义不变式），再叠加同 payload 的 ActionSchema 事件属双通道冗余。执行证据：`signature-renderer.tsx` `commit()` 即笔画结束路径。
- Successor Required: `no`
- Successor Path: —

### iOS 缩放防模糊补偿（v1 不做）

- Classification: `optimization candidate`
- Why Not Blocking Closure: img 宽高重写 + 反向 scale 补偿针对高 DPI 下 WebKit 缩放模糊（技术来源 arco image-preview，analysis §5 L153），属渲染质量优化；核心手势契约（缩放/翻页/关闭）不受影响。
- Successor Required: `no`
- Successor Path: —

## Non-Blocking Follow-ups

- viewer 旋转/保存按钮；input-signature 压感/多指。
- i18n：viewer 页码指示 aria-label 如需文案，随实现登记键（对齐 M6 先例）。

## Closure

Status Note: M9a–M9b 全部交付——image-viewer（双指触点中点缩放/双击 1↔2/横翻/下滑关闭/缩放态冻结横翻，viewer-matrix 纯函数基准值测试 11 用例）；input-signature 增强（二次贝塞尔中点平滑、undo/export 句柄经 flux-runtime/react 通道全链扩展、既有 9 用例零回归）；MM-11 14 定义面。全量门禁：typecheck/build/lint 绿、test 82/82（mobile 32 文件 362 用例、form 127 文件 1134 用例、flux-runtime 1555 passed/1556 total）、check 唯一红 = 既有 knip xlang（master 同红）、e2e image-signature 4/4。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose），三轮：R1 `issues`（1 Blocker 句柄断链 + Proof 缺测；1 Blocker 字面色新红；3 Major）→ 回修 → R2 `issues`（M1/M2 假修 + daily log 预写结论、Proof ③ 缺测、计数漂移）→ 回修 → R3 `approved`（附 7 项生效条件，全部随本提交载入）
- Evidence: R1 发现句柄 invoke 断链（switch case 与 bindings 透传两层缺失）、image-viewer 字面色新红、e2e 断言空洞、audit 门禁预勾/Evidence 预填失实、pointer 机制文实漂移；R2 发现回修不完整（e2e/审计复位假修、daily log 预写 R2 结论属 fabricated evidence）与 Proof ③ 缺测；R3 逐项亲证回修真实落地（runtime +3 用例、e2e 重写、审计复位、计数终值化），并如实记录一处回修报告与实况不符（Deferred 注记未落，随生效条件 1 订正）。审计会话 id（agent_f5f74f23-13c4-4993-ab52-c62a040ea3df）；日志指针 `docs/logs/2026/10-19.md` M9 节。
