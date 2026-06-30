# {1} Carousel a11y Pause Correctness And React19 Memo Hygiene

> Plan Status: completed
> Mission: amis-bug-driven-improvements
> Source Audits: audits/2026-06-26-1859-open-audit-amis-bug-driven-improvements.md
> Last Reviewed: 2026-06-27
> Source: open-ended adversarial audit — F1 (shared pause flag clobbers offscreen-pause), F2 (reduced-motion read once, never re-evaluated), F6 (redundant useMemo + no-deps ref-mirror effect)

## Purpose

收口本 mission 在 `flux-renderers-content` 的 carousel 渲染器引入的 a11y/正确性缺陷与 React19 规范漂移：让 auto-advance 明确承诺的 WCAG 2.2.2 行为（hover/focus/offscreen 暂停、尊重 reduced-motion）真正成立，并清理违反 `docs/skills/react19-best-practices-review.md` 的冗余手工 memoization。

## Current Baseline

起草前已对照 live repo 抽查核实（`packages/flux-renderers-content/src/carousel.tsx`，共 286 行）：

- **F1（mission-introduced，certain）**：auto-advance effect 在 `:88-132`。`let paused`（`:96`）是单一共享布尔；`resume()`（`:105-107`）无条件 `paused = false`；`IntersectionObserver` 回调（`:117-119`）直接写 `paused`。三个独立暂停来源（hover / focus / offscreen）共用一个会被互相 clobber 的标志。已 traced 交错序列：hover → 滚出视口（observer 置 true）→ `mouseleave` → `resume()` 置 false → **offscreen 时仍在自动推进**，正是 observer 想阻止的行为。effect 注释 `:86-87` 声称 WCAG 2.2.2 合规，契约被静默违反。
- **F2（mission-introduced，certain）**：`:92-95` `window.matchMedia('(prefers-reduced-motion: reduce)')` 在 effect setup 时读一次即 early `return`；无 `addEventListener('change', …)`，reduced-motion 不在 deps `[autoPlay, interval, api]`（`:132`）内。后果：(a) mount 时 reduced-motion 开则永不 auto-play，即使用户 later 关闭；(b) 运行中开启 reduced-motion 不会停止已存在的 interval。
- **F6（mission-introduced，low，convention drift）**：`:56-60` 无依赖数组的 ref-mirror `useEffect`（每次 commit 后都跑，做非外部同步工作）；`:134-178` 手写 `useMemo` 生成 component handle，deps `[api, props.id, slotProps.name, items.length]` 恰好等于 React Compiler 会自动推导的反应集（其余读取都经由 ref，Compiler 视为非反应），属无 `eslint-disable` 理由的冗余手工 memo。本组件未发现 `'use no memo'`，故 Compiler 在此生效。
- **无回归测试**：审计明确指出 pause-source 交错与 reduced-motion 切换均无回归测试覆盖（"several exactly because the relevant behaviour has no regression test"）。

## Goals

- **F1**：三个暂停来源各自独立跟踪（`hovered` / `focused` / `visible`），在 interval tick 内派生 `paused = hovered || focused || !visible`；任一来源的 resume 不再 clobber 其他来源。
- **F2**：reduced-motion 变化被响应式监听；运行中 interval 在 reduced-motion 开启时停止，关闭且仍 autoPlay 时恢复。
- **F6**：移除冗余 `useMemo`（交由 Compiler），将无依赖 ref-mirror effect 改为 render-time latest-ref 赋值（文档化的 "latest ref" 模式）。

## Non-Goals

- 不改 carousel 的视觉/DOM 结构、embla 集成、indicators/controls 行为。
- 不处理 dynamic-renderer / form 的 lifecycle race（Plan {3}）。
- 不处理 responseAdaptor 契约（Plan {2}）。
- 不回写已 `completed` 的历史计划（Minimum Rule 21）。

## Scope

### In Scope

- `packages/flux-renderers-content/src/carousel.tsx`：`:56-60`（ref-mirror effect）、`:88-132`（auto-advance effect，含 F1 pause 重构 + F2 reduced-motion 响应）、`:134-178`（handle memo）。
- 新增/扩展回归测试（pause-source 交错 + reduced-motion 双向切换）。

### Out Of Scope

- embla `Carousel` 内部实现、`@nop-chaos/ui` 的 carousel 原语。
- 其他 content 家族渲染器（alert/markdown/html 等）。
- indicators/controls 的交互逻辑。

## Failure Paths

不适用。本计划不涉及错误处理、API 契约、鉴权或外部集成（a11y 行为修复，无错误码语义）。

## Test Strategy

档位选择：**建议有测**

本计划为 a11y/交互行为修复（非鉴权、非对外 API 契约、非流式回压）。但 F1 属组合爆炸型缺陷（两个独立正确的特性在组合下失效）且当前无任何回归测试，F2 是无测试的运行时偏好响应——均需 focused 回归测试锁定正确行为、防止重构回退。Proof 项在对应 Phase 内先于/伴随 Fix。

## Execution Plan

### Phase 1 - Layered Pause Sources (F1)

Status: completed
Targets: `packages/flux-renderers-content/src/carousel.tsx:88-132`; 新增回归测试

- Item Types: `Fix`, `Proof`

- [x] 重构暂停跟踪：将共享 `let paused` 替换为三个独立标志 `hovered` / `focused` / `visible`；每个监听器只翻转自己的标志（`mouseenter`/`focusin`→对应 true，`mouseleave`/`focusout`→对应 false；observer 写 `visible`）；在 interval tick 内派生 `const paused = hovered || focused || !visible` 再决定是否 `api.scrollNext()`。(`Fix`)
- [x] 新增回归测试，断言交错场景：hover → 滚出视口 → `mouseleave` 后 **不会** 在 offscreen 状态自动推进；回到视口且无 hover/focus 后恢复推进。(`Proof`)

Exit Criteria:

> 写法原则：只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续的局部检查。全量 `pnpm typecheck/build/lint/test` 归 Closure Gates。

- [x] `carousel.tsx` auto-advance effect 内不再存在被 `resume()` 无条件 clobber 的共享布尔；暂停由 3 个独立来源派生（repo-observable）。
- [x] focused 回归测试通过：offscreen + mouseleave 保持暂停；visible + 无 hover/focus 恢复推进。

### Phase 2 - Reactive Reduced-Motion (F2)

Status: completed
Targets: `packages/flux-renderers-content/src/carousel.tsx:88-132`（reduced-motion 段）；新增回归测试

- Item Types: `Fix`, `Proof`

- [x] 订阅 `mediaQueryList` 的 `change` 事件：reduced-motion 运行中开启时停止 interval；关闭且 `autoPlay` 仍成立时恢复 interval。可将其折叠进 Phase 1 的分层暂停模型（如增加 `reducedMotion` 派生项）或作为独立门控，二选一并在实现中注明。**实现提示（draft review minor）**：若用派生 `paused` 标志而非 `clearInterval`，存在最多一个 `interval` tick 的暂停延迟；优先 `change` 回调内直接 `clearInterval`/重起以零延迟满足 WCAG 2.2.2，二者均合规。(`Fix`)

  > Executor note: 实现为独立门控 —— `change` 回调内直接 `clearInterval`/`start()`（零 tick 延迟，采用 draft review minor 的优先建议），reduced-motion 同时不再在 effect setup 时 early-return。

- [x] 新增回归测试，断言双向切换：interval 运行中开启 reduced-motion → 停止；随后关闭 reduced-motion → 恢复推进。(`Proof`)

Exit Criteria:

- [x] reduced-motion 被响应式重评估；effect 不再"读一次即 early return 永久生效"。
- [x] focused 回归测试两个方向（on→stop / off→resume）均通过。

### Phase 3 - React19 Memo Hygiene (F6)

Status: completed
Targets: `packages/flux-renderers-content/src/carousel.tsx:56-60, 134-178`

- Item Types: `Fix`

- [x] 移除手写 `useMemo`（`:134-178`），让 React Compiler 负责 handle 记忆化。(`Fix`)
- [x] 将无依赖 ref-mirror `useEffect`（`:56-60`）替换为 render-time latest-ref 赋值（`activeIndexRef.current = activeIndex;` 等直接在渲染体中赋值，即文档化 "latest ref" 模式），消除"每次 commit 后跑的非外部同步 effect"。(`Fix`)

  > Executor note（机制偏差，满足同一 Exit Criteria）：仓库 lint 配置同时启用 `react-hooks/refs`（error）与 `react-hooks/exhaustive-deps`（error）。draft review 验证了无 `'use no memo'`（Compiler 在 app build 激活），但未覆盖这两条 lint 约束：
  >
  > - render-time `ref.current = value` 写法被 `react-hooks/refs` 拦截（仅当 ref 同帧被 render 读时才豁免，见 `schema-renderer.tsx:125/144`；本组件 debug refs 仅在 handle 方法里读 → 不豁免）。
  > - 移除 `useMemo` 后 render-body handle 会被 `exhaustive-deps` 拦截（"makes the dependencies of useEffect change on every render"）。
  >
  > 故采用 lint 自身建议的等价方案（达成同一目标 + 干净 lint）：(1) handle 移入 register effect 内构造（effect-local，等价 `data-source-renderer.tsx` / `list-renderer.tsx` 既有约定，无需 Compiler 即稳定），deps `[componentRegistry, props.id, props.meta.cid, api, items.length, slotProps.name, autoPlay, loop]`；(2) 消除独立 mirror effect —— `activeIndex` 在 embla select 回调内同步写 `activeIndexRef`（effect-time 写，合规），`autoPlay`/`loop` 改为 handle 直接读（已在 effect deps 中，无陈旧）。结果：useMemo 与无依赖 mirror effect 均移除、handle 跨 slide 变化稳定（运行时回归测试锁定，见 `carousel-autoplay.test.tsx` O-03 用例）、`getDebugData` 仍读最新值。

Exit Criteria:

- [x] `carousel.tsx` 内上述 `useMemo` 与无依赖 mirror effect 均已移除；handle 跨 slide 变化仍保持稳定身份；`getDebugData` 仍读取最新值。
- [x] `carousel.tsx` 的 `pnpm lint` 干净（未引入 `react-hooks/react-compiler` 警告）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: independent general sub-agent (fresh session `ses_0fb4b2f81ffepqyZMBuCV8ELQm`)
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed: zero Blocker / zero Major; 3 non-blocking Minors incorporated as executor hints (Phase 2 reduced-motion tick-latency → prefer `clearInterval`-on-change). All carousel references verified against live `carousel.tsx` (effect :88-132, `let paused` :96, ref-mirror :56-60, useMemo :134-178; no `'use no memo'` confirmed).

## Closure Gates

> 关闭条件：本 section 所有条目 + 每个 Phase Exit Criteria 全部 `[x]` 后，才能将 `Plan Status` 改为 `completed`。全量 `pnpm typecheck/build/lint/test` 在此跑一次。

- [x] F1 / F2 / F6 in-scope 缺陷均已修复。
- [x] pause-source 交错 + reduced-motion 双向切换回归测试已落地。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect。
- [x] 受影响 owner doc 已同步到 live baseline（`docs/components/carousel/design.md` §13 已补 WCAG 2.2.2 auto-advance 契约；此前未文档化 → 本计划执行顺带补齐）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`（workspace 55/55 PASS）
- [x] `pnpm build`（content pkg PASS）
- [x] `pnpm lint`（workspace 29/29 PASS）
- [x] `pnpm test`（workspace 55/55 PASS；content pkg 24 files / 179 tests）

## Deferred But Adjudicated

（本计划当前无确认的 deferred 项；如执行中出现，须附 `Why Not Blocking Closure`。）

## Non-Blocking Follow-ups

- 若发现 carousel 的 indicators 键盘可达性与 pause 行为存在更广 a11y 议题，记录为 watch-only residual，不在本 plan 收口。

## Closure

Status Note: F1/F2/F6 全部修复并落地回归测试；workspace typecheck/build/lint/test 全绿；独立 fresh-session closure-audit `pass`（无 Blocker）。Phase 3 因仓库自身 lint（`react-hooks/refs` + `exhaustive-deps` 均 error）采用 lint 建议的等价机制（handle 移入 register effect / activeIndexRef 在 select 回调内更新），达成同一 Exit Criteria，偏差已在 Phase 3 executor note 记录并被审计确认。

Closure Audit Evidence:

- Auditor / Agent: independent general sub-agent, fresh session `ses_0fb2c1cfdffeQ9kB3maSMK8vnT`
- Verdict: pass（zero Blocker / zero Major）
- Evidence: 审计独立读 live `carousel.tsx` 逐条确认 F1（`hovered`/`focused`/`visible` 独立标志 + `paused = hovered || focused || !visible`，无共享/clobber 标志、无 `resume()`）、F2（`addEventListener('change')` + `clearInterval`/restart，setup 不再 early-return 永久生效）、F6（无 `useMemo` 包裹、无 no-deps mirror effect、`activeIndex` 不在 handle deps、`getDebugData` 仍读最新值）。审计经验证复现了 Phase 3 lint-blockade 主张：临时探针在 render-body 写 `ref.current = x`（ref 不在 render 读）→ `react-hooks/refs` 报 `Cannot update ref during render`（exit 1），并确认 `schema-renderer.tsx:125` 因 `:144` 同帧读取而豁免；故偏差机制满足 Exit Criteria。
- 回归测试断言力：审计确认 `carousel-autoplay.test.tsx` 的 F1 交错用例（`:281`/`:314`）、F2 双向用例（`:348`）、O-03 no-churn 用例（`:378`）在 OLD 代码下均会 FAIL（旧共享 `paused` 被 `mouseleave→resume()` 清零；旧无 `change` 监听导致 mid-session reduced-motion 不停；旧 `activeIndex` 为 useMemo dep 导致切播重建 handle 再注册），在 NEW 代码下 PASS。
- Re-run（审计亲自跑）：`vitest run src/carousel.test.tsx src/carousel-autoplay.test.tsx` → 2 files / 18 tests PASS；`eslint src/carousel.tsx src/carousel-autoplay.test.tsx --no-cache` → clean；`typecheck` → clean。执行 session 此前另跑 workspace 全量 typecheck 55/55、lint 29/29、test 55/55。
- Non-blocking minors（审计）：register-effect deps 以 `items.length` 为粒度（沿用 F6 前基线，非本计划引入，watch-only）；`carousel.test.tsx` O-04 仍为 source-grep（现已被 `carousel-autoplay.test.tsx` 的行为测试覆盖，冗余但无害）。

Follow-up:

- 无 plan-owned 残留工作。Non-blocking：若未来 carousel indicators 键盘可达性出现更广 a11y 议题，按 `Non-Blocking Follow-ups` 记 watch-only。
