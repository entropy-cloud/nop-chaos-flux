# 545 interaction-state IS-2 Gantt 域修复批——拖拽提交后滚动归零 + 滚动容器序列模板

> Plan Status: completed
> Last Reviewed: 2026-10-07
> Source: `docs/backlog/interaction-state-quality-roadmap.md`（IS-2，种子清单 6）；`docs/skills/interaction-state-audit-prompt.md`（V1 滚动位置保持）；plan 543 期间 live 观察（scroll-sync 异步改写）
> Related: `docs/plans/544-interaction-state-is1-flow-designer-plan.md`（同轨道 IS-1）；`docs/plans/543-interaction-state-is0-audit-infra-plan.md`（IS-0 基建）。编号注记：545 与 `2026-10-04-545-editor-designer-p10-undo-coalesce-hook-plan.md` 双占（沿 543/544 既有双占模式），引用带全文件名消歧

## Purpose

按 V1 读数协议修复 gantt "拖拽 bar 提交后横向滚动归零"（种子 6，已 live 确定性复现并定位根因），顺手修复侦察发现的 grid scrollLeft 污染 store 附带缺陷；对 `#/gantt`、`#/gantt-states`、`#/gantt-perf-scale` 三页跑序列审查，沉淀滚动容器类交互序列模板供 IS-5 复用。

## Current Baseline

**根因链（2026-10-07 live 探针 + 源码双证，确定性 3/3 复现）**

- 复现手势：`#/gantt` 滚动 timeline 到 900 → `resize-left` 第 4 根 bar（向右拖）→ 提交后 +150ms scrollLeft=476（smooth 动画中）→ +850ms **=0**。move-whole/resize-right/最大滚动/gantt-states 手势不复现。
- **写入 trap 铁证**：无重挂载（DOM 探针存活）、无 scrollWidth 收缩（全程 4880，钳制前提不成立）；`WRITE scrollLeft → 0 (was 900)` 的 JS 堆栈 = **`scrollToToday`**（gantt.tsx:316-323，React Compiler 编译名 t24，served :602）。
- 机制：挂载居中 effect（gantt.tsx:327-334，ux-r8）源码 deps 为 `[ganttReady, scrollToToday, store]`，编译后有效依赖为 `[ganttReady, scrollToToday, store.scaleRange]`（React Compiler memo gate `$[76] !== store.scaleRange`，served 产物逐字核实）——拖拽提交 `store.updateTask`（gantt-store.ts:242-262）内 `computeScaleRange`（:85）**重算并更换 scaleRange 对象引用** → effect 重跑 → `container.scrollLeft = Math.max(0, todayX − clientWidth/2)`——demo 时间轴起点≈今天−pad → todayX < clientWidth/2 → **Math.max 钳 0**；`gantt.css:103 scroll-behavior: smooth` → 指数衰减动画（900→476→…→1→0，~500ms）。
- roadmap 原始三候选证伪/修正：钳制链不成立（无宽度收缩）；ganttReady 重挂载不成立（探针存活；且 #/gantt 首渲染即 ready）；zoomToFit 重置 `_scrollLeft`（gantt-store.ts:451）仅"适应"按钮触发、与本缺陷无关。roadmap 候选表述与 live 根因的偏差在本计划收口时就地勘误。
- 滚动容器定位口径：`[data-slot="gantt-scale"]` 本体是 sticky 元素**不是**滚动容器，其 parentElement（gantt.tsx:619 `overflow-auto` div）才是；plan 543 期间"同步读 0"的观察即误选 sticky 元素所致（本次已修正口径；dev log 543 段的原结论随本计划 Phase 3 就地勘误）。

**附带缺陷（侦察发现，顺手修）**

- `hooks/use-gantt-scroll.ts:42-49`：grid 容器的横向 scrollLeft 与 timeline 的横向 scrollLeft **竞写同一个 `store._scrollLeft`**（grid 默认宽 320 < demo 列宽 600 常驻横向可滚）——windowing（timescale/cellgrid）语义是 timeline 值，grid 横向滚动会污染 zoom 中心锚定值（gantt-store.ts:405-420 消费）。
- producer 无瞬态守卫问题在本根因下不需要：DOM scrollLeft 无常规写回方，守卫属过度设计；effect 语义修正（下）即断根因。

**测试口径**

- 红证据手势稳定 3/3；拖拽手势沿 `gantt-bars-and-links.spec.ts:110-126` 惯例（boundingBox + mouse steps）。
- 挂载居中既有契约：`gantt-mount-timing.test.tsx:189-206` 断言挂载后 `timeline.scrollLeft > 0`——修复必须保留首次挂载居中。
- 三页差异：`#/gantt`（14 任务、无 loading、首渲染即 ready）；`#/gantt-states`（状态矩阵变体，含 loading/baselines）；`#/gantt-perf-scale`（500 任务/2000 连线、日期固定 2026-07-01 起）。
- 既有 e2e 无任何"拖拽后滚动保持"断言（roadmap 判断核实属实）；滚动断言仅 Today 按钮与纵向同步。

## Goals

- 种子 006：任意 bar 拖拽提交后 timeline scrollLeft 保持不变（V1；本批红手势 + 一般手势），首次挂载居中契约不回退。
- 附带缺陷：grid 横向滚动不再写 `store._scrollLeft`（zoom 锚定只消费 timeline 语义）。
- 三页 §4 序列审查完成，findings 全量进台账（P0/P1 随批先红后绿，P2/P3 裁决），滚动容器类序列模板沉淀（IS-5 复用）。
- 种子 006 台账 verified；roadmap IS-2 状态回写与候选表述勘误。

## Non-Goals

- zoomToFit/「适应」按钮的重置语义（产品行为，保留；仅在其与其他机制复合致损时另行裁决）。
- producer 瞬态守卫、scroll 来源标记（本根因下属过度设计）。
- gantt-states 的 loading 分支结构改造（early-return 三分支保持）。
- 纵向 scrollTop 同步机制（已有测试覆盖，不动）。

## Scope

### In Scope

- `packages/flux-renderers-scheduling/src/gantt/gantt.tsx`（挂载居中 effect 抽显式 deps hook）、`hooks/use-gantt-initial-center.ts`（新建）、`hooks/use-gantt-scroll.ts`（grid 横向不写 store）及各自单测。
- `tests/e2e/gantt-scroll-preservation.spec.ts`（新建，V1 先红后绿 + 滚动容器序列模板消费方）。
- `tests/e2e/helpers/scroll-container-sequence.ts`（新建：滚动容器通用 open/scroll/read 序列 helper）。
- `docs/audits/interaction-state/is2-gantt/`（证据卡）+ ledger 更新 + roadmap 回写勘误。

### Out Of Scope

- gantt-store 的 zoom/undo/CPM 逻辑；demo schema 内容；perf-scale 页性能优化。

## Failure Paths

不适用：纯渲染器交互修复，无错误处理/API 契约/鉴权/外部集成路径。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（V1 不变量回归 + 用户报告缺陷）。Proof 先行：红 e2e（现 live 可确定性复现），组件级单测锁 effect 语义（挂载居中一次 + scaleRange 更新不重写）。

## Execution Plan

### Phase 1 - 种子 006：拖拽提交滚动保持（V1）

Status: completed
Targets: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx`、`hooks/use-gantt-initial-center.ts`（新建）、`tests/e2e/gantt-scroll-preservation.spec.ts`（新建）

- Item Types: `Proof | Fix`

- [x] Proof（先红）：`gantt-scroll-preservation.spec.ts`——`#/gantt` 滚动 timeline 至 900 → resize-left 手势（nth3 bar，抓点 `box.x + 3` 绝对偏移——resize 判定阈值为左/右 6px（gantt-bars.tsx:67-69））→ 前置断言 bar 左缘已增长（自证 resize 路径生效）→ 提交后 +1s 断言 scrollLeft 与基线偏差 ≤20px（容差覆盖 resize 收缩 scaleRange 的合法钳制；红证据 = 旧实现衰减归 ~0）。move-whole 手势在旧实现下即保持（一般手势回归面，与 Current Baseline 观察一致），其用例为回归锁而非先红项。
- [x] Fix：挂载居中 effect 抽为显式 deps 独立 hook `useGanttInitialCenter`（新文件 `hooks/use-gantt-initial-center.ts`，deps 显式含 scaleRange 与回调身份）+ didInitialCenter ref 守卫——居中只执行一次，且行为不再依赖 React Compiler 对 deps 的增强（源码/编译环境一致，根治本缺陷的『靠 compiler 隐式换依赖』成因）；Today 按钮（header 命令）与 `scrollToTask`/`scrollToToday` schema action 路径保持原行为（用户显式触发，允许滚动）。
- [x] Fix：组件级契约——既有 `gantt-mount-timing.test.tsx` 挂载居中契约零修改通过（居中一次语义保留）。【执行期降级】计划稿的组件级单测②（scaleRange 更新不改写）实现后经探针考古发现 happy-dom 下判别链不闭合（rerender 的 act 内 effect 先于用户滚动触发 + scrollWidth=0 写入时序异常），按 draft review R2 认可的 C 方案精神移除；判别性完全由红 e2e 承担（compiler-true，stash 还原旧实现可复现红 3/3）。无包内 useGanttInitialCenter 专属单测（hook 为 12 行守卫胶水，行为面由 e2e 与挂载契约共同覆盖）。
- [x] Proof：ledger `IS-gantt-001` pending→found（红证据）→fixed。

执行期注记（Phase 1）：单测②实现后经探针考古发现 happy-dom 下判别链仍不闭合（rerender 的 act 内 effect 先于用户滚动触发，且 scrollWidth=0 下写入值读回时序异常）——按 draft review R2 已批准的 C 方案精神诚实降级：移除单测②，判别性完全由红 e2e 承担（compiler-true，stash 可复现），hook 守卫为设计修复；e2e 基线断言改"轮询至稳定取值"（mount 居中 smooth 动画与 set 竞争，固定值断言假红）；±20px 容差覆盖 resize 收缩 scaleRange 的合法钳制。

Exit Criteria:

- [x] V1 e2e 先红后绿（resize 手势确定性红 3/3 → 绿；move 手势为回归锁——旧实现即保持）。键盘编辑与 undo 同经 `updateTask` 换 scaleRange 引用，hook 守卫一并覆盖（compiler-true 判别由红 e2e 承担）。
- [x] 组件级契约绿（gantt-mount-timing 挂载居中契约零修改通过）；单测②按执行期注记降级移除，scaleRange 更新不改写的判别由红 e2e（compiler-true，stash 3/3）承担。
- [x] gantt 家族既有 e2e 零回归（gantt-\* 全绿）。

### Phase 2 - 附带缺陷：grid 横向滚动污染 store

Status: completed
Targets: `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-scroll.ts`、`gantt.tsx`（写入点归属：回调生产者在 hook，无条件写 store 的回调体在 gantt.tsx:210）、`hooks/use-gantt-scroll.test.ts`

- Item Types: `Proof | Fix`

- [x] Proof（先红）：单测——模拟 grid 容器横向 scroll 事件（scrollLeft=200）→ 断言 `store.scrollLeft` 不被改写为 200（windowing 语义 = timeline 值）；纵向同步既有用例不回退（use-gantt-scroll.test.ts 共 6 例，其中 2 例直接断言纵向双向）。旧实现 grid 横向会写入 → 必挂。
- [x] Fix：grid 来源的横向 scrollLeft 不再写入 store（写入点在 `gantt.tsx` 挂接回调：按来源分流或 hook 回调签名带 source；仅纵向 scrollTop 参与同步/回写，timeline 横向仍写）。若 zoom 中心锚定（gantt-zoom-fit.test）依赖 grid 值的用例存在则逐条裁定留痕。
- [x] Proof：ledger 附带缺陷登记（新 finding 行，类别 B、P2、fixed-in-batch）。

Exit Criteria:

- [x] 判别单测先红后绿；`use-gantt-scroll.test.ts` 全绿（纵向同步零回归）。
- [x] `gantt-zoom-fit.test.ts` / `gantt-store.test.ts` 全绿（zoom 路径零回归）。

### Phase 3 - 三页序列审查、滚动容器模板与台账收口

Status: completed
Targets: `tests/e2e/helpers/scroll-container-sequence.ts`（新建）、`docs/audits/interaction-state/is2-gantt/`、`docs/backlog/interaction-state-quality-roadmap.md`

- Item Types: `Proof | Fix | Decision`

- [x] Proof：按 prompt §4/§6 滚动容器类序列对三页跑审查（滚动到非零 → 数据变更交互 → V1 读数；Today/zoom/适应命令路径读数；gantt-states loading 变体挂载滚动行为；perf-scale 大数据下滚动保持），证据卡落 `docs/audits/interaction-state/is2-gantt/findings.md` + 原始读数 JSON；新 findings 全量进 ledger（P0/P1 随批先红后绿，P2/P3 裁决三态）。
- [x] Fix：滚动容器类序列模板 `scroll-container-sequence.ts`（scroll 容器定位、settle 轮询、V1 读写数、拖拽手势封装），被本批 spec 真实消费（≥2 处），供 IS-5 表格/时间线批复用。
- [x] Decision：roadmap 就地勘误——种子 6 候选表述（钳制链/ganttReady/zoomToFit）与 live 根因（挂载居中 effect deps 引用比较 + smooth）不符，原文处附注勘误；**`docs/logs/2026/10-07.md` 543 段执行期发现 1（"scroll-sync 异步改写 scrollLeft"）就地附注勘误**（该结论被本根因推翻：系 sticky 元素误选 + 挂载居中 effect 重跑所致）；Phases 表 IS-2 行 Plan 列填本计划文件名；IS-2 状态回写（todo→planned 于转 active，planned→done 于 audit 后）。
- [x] Proof：ledger `IS-gantt-001` 复检 flip verified。

Exit Criteria:

- [x] 三页审查证据卡落盘、新 findings 全量登记（零静默跳过）。
- [x] 模板 helper ≥2 处真实消费（本批 spec 内多用例计），knip 零新增红。
- [x] roadmap 勘误落字且 IS-2 双表回写完成；`IS-gantt-001` verified。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_c21bfdcc-eecd-4778-a89c-1abffb881812）
- Verdict: `pass`（R1 fail 2M+7m → R2 fail 1M（M2 环境缺口：包级 vitest 无 React Compiler，单测②判别前提不成立）→ R3 fail 1M（声称-实况漂移：修订脚本失败致 2 处未落盘——Lessons 2.0 模式 1 实例）→ R4 定点确认 pass）
- Rounds: 4（三次修订迭代）
- Findings addressed: Major 3 条——①红 e2e 手势 "grab 2%" 不触发 resize 判定（6px 阈值）→ 绝对偏移 `box.x+3` + resize 生效前置断言；②组件级单测②判别前提在无 compiler 的 vitest 不成立 → 方案 A：抽显式 deps 独立 hook `useGanttInitialCenter`（根治 compiler 隐式换依赖成因），判别链在 vitest 闭合；③dev log 543 段勘误义务悬空 → 落 Phase 3 Decision 与 Closure Gates。Minor 7 条全落定（写入点归属 gantt.tsx:210/deps 源码-编译口径区分/纵向用例计数/编号双占注记/Plan 列填链/键盘 undo 覆盖注记/第二消费方入 Follow-ups）。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（种子 006 verified + 附带缺陷 fixed + 批内新立 P0/P1）
- [x] 所有 in-scope confirmed contract drifts 已收敛（roadmap 种子 6 候选表述勘误落字）
- [x] 行为/契约结果已达成（V1 在三页成立；挂载居中契约保留；zoom/Today/scrollToTask 显式路径行为不变）
- [x] 必要 focused verification 已完成（挂载居中契约 + 先红后绿 e2e + 家族回归）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap 勘误与状态回写 + `docs/logs/2026/10-07.md` 543 段就地勘误；gantt 组件文档若行为语义变化则注记）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- zoomToFit「适应」按钮的重置语义产品化裁决（当前行为保留）。
- 滚动容器模板 helper 的第二个 spec 级消费方于 IS-5 表格/时间线批补齐（本批以 spec 内多用例消费 ≥2 处为门槛）。
- producer 瞬态守卫/滚动来源标记（若未来引入常规 DOM 写回方再评估）。

## Closure

Status Note: 2026-10-07 收口。三 Phase 全 completed：种子 006（拖拽提交滚动归零）根因 live 写入 trap 铁证定位（挂载居中 effect compiler 增强 deps 重跑 scrollToToday + smooth）并修复（显式 deps hook useGanttInitialCenter + didInitialCenter 守卫），红 e2e（resize 手势 900→~0，stash 3/3）→ 绿（±20px）；附带缺陷 002（grid scrollLeft 污染 zoom 锚定）source 门控修复（契约测试红→绿）；三页 §4 序列审查 9 序列取证（perf-scale 500 任务拖拽提交 3923 精确保持）；滚动容器序列模板 helper 落盘；roadmap 种子 6 勘误 + dev log 543 段勘误落字。五门禁 full-green（typecheck/build/lint 42/42、test 78/78、check exit 0）；gantt 家族 107/107、scheduling 1076/1076、新 spec 2/2。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（general-purpose fresh session，agent_c1f2cbc6-76cb-45ce-861c-e683e9ce44cf）
- Evidence: 3 轮——R1 `issues`（3M：Exit Criteria 与单测②降级实况漂移/红证据 move 手势记录与 stash 实测不符/审计门禁预勾；2m：审计输入变更面失实、loading 变体无读数；3t）→ 退回文本修正（零代码改动）→ R2 `issues`（3 处未落盘 + 1 连带——修订脚本静默 no-op，执行者 dev log 执行期发现 2 模式第 3 次实例）→ 逐处 grep 验证落盘 → R3 `APPROVED` 零 Blocker/零 Major/零 Minor。审计员独立实跑：五门禁 exit 0、scheduling 1076/1076、gantt 家族 107/107、红证据 stash 复现（resize 红 3/3、move 绿 3/3 并据实勘误红面记录）、Phase 2 契约测试红→绿、reconcile OK、接口≠行为三处成立（hook 消费+守卫拦截/source 门控/helper 消费）。

Follow-up:

- 见 Non-Blocking Follow-ups。
