# 02 Industrial HMI Component Audit — HCA11 Editor Infra（编辑器基础设施 23 维包级深审 + 自动修复）

> Plan Status: completed
> Last Reviewed: 2026-08-08
> Mission: industrial-hmi-component-audit
> Work Item: HCA11. Editor infra 审计
> Source: `docs/backlog/industrial-hmi-component-audit-roadmap.md` §HCA11；包级深审 `docs/skills/deep-audit-prompts.md`（23 维；infra 层非复杂交互层，dim 21-23 非必选，若发现定位/集成/测试有效性疑点则触发）；editor renderer 基线 HCA7
> Related: HCA7（前置依赖，editor renderer 层基线，Plan `2026-08-08-1316-1` 收口）、HCA0（done，编排基线）、HCA9（done，connection 层基线——`connection-wiring.ts` 为 connection 子系统接线点）、HCA-BL（successor，bug 归档）、HCA-CR（successor，跨层集中修复）

## Purpose

对 `@nop-chaos/flux-renderers-industrial` 的 **editor infra 层**（`src/editor/` 顶层 9 源文件，~1607 行）做一次完整的 23 维包级深审，把发现的 P0/P1 live defect 立即 test-first 修复，P2 低成本当场修复 / 否则入审计卡 backlog，产出审计记录文件。editor infra 是 SCADA 编辑器的基础设施胶水层——session 模型不可变性、adapter 事件桥节流、runtime 闭包共享、mutator 幂等性、test handle 的 `window` 挂载/卸载直接决定编辑器会话一致性、属性面板/工具箱运行时稳态、以及测试句柄的可重复挂载安全。HCA11 是 industrial 包**最后一个待审计模块族**，完成后 HCA1–HCA11 全 `done`，解锁 HCA-BL / HCA-CR 收敛。

## Current Baseline

> 起草前已逐条核对 live repo（2026-08-08，`packages/flux-renderers-industrial/src/editor/`，`wc -l` 实测对齐 HEAD，与 roadmap §审计对象总览一致）。

### 审计对象：9 源文件（`wc -l` 实测）

- `editor/editor-session.ts`（130）— 编辑器会话模型：working config / selection / mode / commitPolicy 状态容器；不可变更新（produce-style）；session 变更通知。本层 session 真相源。
- `editor/editor-adapter.ts`（205）— adapter 事件桥：editor engine 事件 → React 通知的节流/批处理桥；与 editor-session / undo-redo / connection 协同。
- `editor/editor-working-helpers.ts`（162）— working helpers：从 session 派生 working config / selection / 状态的纯派生函数集（供 panel / toolbox 消费）。
- `editor/runtime-factories.ts`（261）— runtime 闭包工厂：创建并共享 runtime 闭包（handles / events / mutators 装配）；闭包捕获一致性。本层较大文件。
- `editor/runtime-mutators.ts`（248）— runtime mutators：编辑操作 mutator（add/update/remove/group/...）；幂等性 / 纯净性 / selection 同步。
- `editor/toolbox-runtime.ts`（264）— toolbox 运行时：工具箱操作运行时（align/distribute/z-order/clipboard 等命令的 runtime 接线）；本层最大文件。注：align-distribute/z-order **算法本体**在 HCA8（toolbox/）已审，本文件只审 runtime 接线层。
- `editor/connection-wiring.ts`（69）— connection 接线：connection 子系统（HCA9）与 editor infra 的接线点（端点注册 / 联动回调装配）。
- `editor/test-handle-factory.ts`（130）— test handle 工厂：`window.__flux_scada_editor_<cid>` 句柄工厂；mount/unmount 生命周期；test-only 机制。
- `editor/editor-test-handle.ts`（138）— editor test handle：test handle 句柄对象（imperative API 供 e2e 调用）。

### colocated 测试文件（喂入 Phase 回归，不纳入审计对象）

`editor/editor-session.test.ts`、`editor/editor-test-handle.test.ts`、`editor/scada-editor-canvas-regions-session.test.tsx`（session 集成）；以及 integration 测试 `scada-editor-canvas-*.test.tsx`（ops/reactivity/toolbox/grouping/...）覆盖 mutator/runtime 接线。

### 构成依赖（本 plan 不重做，仅抽查回归）

- **HCA7**（editor renderer 层，Plan `2026-08-08-1316-1` 收口）：`scada-editor-canvas.tsx` 是 infra 层的 React 宿主；2 hooks（use-editor-engine/use-editor-handles）消费 runtime-factories 产物。
- **HCA9**（done，connection）：`connection-wiring.ts` 是 connection 子系统的接线点，connection 算法本体已审。
- **HCA8**（done，panels）：toolbox-runtime.ts 的 align-distribute/z-order/clipboard 命令**算法本体**在 `toolbox/` 已审，本 plan 只审 runtime 接线。
- **HCA10**（done，undo-redo）：runtime-mutators 与 undo-redo-adapter 共享 `ScadaConfigDiff` 载荷。

### owner doc 现状

- `docs/components/industrial-hmi-editor/design-architecture.md`（session / adapter / runtime 架构）。
- `docs/components/industrial-hmi-editor/design-toolbox.md`（toolbox runtime）。
- `docs/components/industrial-hmi/editor-initiation.md`（10 runtime 复用点 + R 系列）。
  Phase 3 核对这些章节与 live infra 一致性。

### 包级机械健康

`pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/lint/test` 全绿（HEAD 基线 ~1315 tests / 97 test files）。

## Goals

- 对 9 源文件逐文件完成 23 维包级深审，产出带 `文件:行` 证据的 finding 清单（P0/P1/P2/P3 triage）。
- 所有确认的 P0/P1 live defect test-first 修复（failing-first proof 先于 fix，断言结果值而非 not.toThrow）。
- P2 低成本当场修复并带回归测试；P2 高成本 / P3 入审计卡 backlog（归 HCA-CR）。
- owner doc（design-architecture.md、design-toolbox.md、editor-initiation.md）与 live infra 一致性核对 + 必要同步。
- 产出审计记录文件 `docs/audits/2026-08-08-*-hca11-editor-infra.md`。

## Non-Goals

- 不审计 editor renderer（HCA7）/ panels（HCA8）/ connection（HCA9）/ undo-redo（HCA10）。
- 不重审 toolbox 算法本体（align-distribute/z-order/clipboard，HCA8 done）；不重审 connection 算法本体（HCA9 done）；不重审 serialization diff 载荷（HCA4 done）。
- 不做 HCA-BL（bug 归档）/ HCA-LL（lesson 沉淀）全量汇总——本 plan 仅产出本层 finding 喂入 successor。
- 不改 editor infra 公共面或 `ScadaConfigDiff` 载荷契约（除非审计发现 contract drift）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/editor/editor-session.ts`
- `packages/flux-renderers-industrial/src/editor/editor-adapter.ts`
- `packages/flux-renderers-industrial/src/editor/editor-working-helpers.ts`
- `packages/flux-renderers-industrial/src/editor/runtime-factories.ts`
- `packages/flux-renderers-industrial/src/editor/runtime-mutators.ts`
- `packages/flux-renderers-industrial/src/editor/toolbox-runtime.ts`
- `packages/flux-renderers-industrial/src/editor/connection-wiring.ts`
- `packages/flux-renderers-industrial/src/editor/test-handle-factory.ts`
- `packages/flux-renderers-industrial/src/editor/editor-test-handle.ts`
- 审计记录 `docs/audits/2026-08-08-*-hca11-editor-infra.md`。
- owner doc `docs/components/industrial-hmi-editor/design-architecture.md` + `design-toolbox.md` + `docs/components/industrial-hmi/editor-initiation.md`（仅当审计发现 drift 时同步）。
- 任一 P0/P1 fix 的 focused regression test。

### Out Of Scope

- `src/editor/renderer/`（HCA7）、`src/editor/{palette,inspector,toolbox}/`（HCA8）、`src/editor/connection/`（HCA9）、`src/editor/undo-redo/`（HCA10）。
- `*.test.ts` / `*-fixtures.ts` / `index.ts` barrel（测试基础设施 / 聚合导出，不纳入审计对象，仅作回归喂入）。
- `src/renderer/`（HCA1）、`src/engine/`（HCA2）、`src/binding/`（HCA3）、`src/serialization/`（HCA4）、`src/symbols/`（HCA5/HCA6）。
- HCA-BL/LL/CR/CV/CG 全量汇总（本 plan 仅喂入 finding）。

## Failure Paths

> editor infra 层是编辑器基础设施胶水，无外部 IO / 鉴权 / API 契约。失败路径关注点是 session 一致性、mutator 幂等性、test handle 挂载安全。

| 可测场景编号           | 触发                                                               | 行为                                              | 可重试 | 用户可见表现                         |
| ---------------------- | ------------------------------------------------------------------ | ------------------------------------------------- | ------ | ------------------------------------ |
| session-mutable-update | editor-session 外部直接 mutate working config（绕过 produce）      | session 不可变性守卫拒绝 / 检测，不静默污染真相源 | 否     | 属性面板/工具箱状态不一致被阻断      |
| adapter-throttle-stale | editor-adapter 节流窗口内多次 engine 事件                          | 批处理为单次通知，不丢事件 / 不重复派发           | 否     | panel 单次刷新（非抖动）             |
| mutator-non-idempotent | 同一 mutator 连续调用两次（同载荷）                                | 幂等：第二次无副作用 / selection 不漂移           | 否     | 重复操作不产生重复符号 / 不误改      |
| runtime-closure-stale  | runtime-factories 闭包捕获过期 session/engine 引用                 | 闭包刷新机制保证引用最新；不调用过期引擎          | 否     | 编辑操作作用于最新会话（非陈旧状态） |
| test-handle-leak       | test-handle-factory unmount 后 `window.__flux_scada_editor_*` 残留 | unmount 清理 `window` 属性 + 解绑句柄；无内存泄漏 | 否     | 重载页面无 stale test handle         |

## Test Strategy

本档选择：**建议有测**

editor infra 是编辑器基础设施胶水层（session 一致性 / 事件桥节流 / mutator 幂等 / test handle 挂载），非注册 renderer。审计前无已知 P0/P1 live defect。任何审计中确认的 P0/P1 live defect 按 roadmap 自动修复契约 test-first（failing-first proof 先于 fix）；P2 修复 same-PR 带回归。验证以 `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/test` + 关键行为抽查（session 不可变 / mutator 幂等 / test handle mount-unmount / adapter 节流批处理）为主。交互闭环变更追加 e2e（`scada-editor-interaction-correctness.spec.ts`）。

## Execution Plan

### Phase 1 - 逐文件 23 维包级深审 + finding triage

Status: completed
Targets: `packages/flux-renderers-industrial/src/editor/`（9 源文件）、`docs/audits/2026-08-08-1316-hca11-editor-infra.md`

- Item Types: `Proof | Decision`

- [x] 逐文件过 `docs/skills/deep-audit-prompts.md` 23 维。重点维度：
  - **session 模型不可变性**（editor-session.ts）：working config / selection / mode 的更新路径是否全部经不可变 produce；外部直接 mutate 的守卫；session 变更通知的时序。
  - **adapter 事件桥节流/批处理**（editor-adapter.ts）：engine 事件 → React 通知的节流窗口；批处理不丢事件 / 不重复派发；节流期间销毁的清理（重入/竞态）；与 undo-redo / connection 协同的事件序。
  - **working helpers 纯派生**（editor-working-helpers.ts）：派生函数纯净性（无副作用）；空 selection / 空 config 的边界；派生与 session 真相源一致。
  - **runtime 闭包共享**（runtime-factories.ts）：闭包捕获 session/engine 引用是否始终最新；handles/events/mutators 装配顺序；闭包泄漏 / 过期引用。
  - **mutator 幂等性 / 纯净性**（runtime-mutators.ts）：add/update/remove/group mutator 同载连续调用的幂等；selection 同步；载荷（`ScadaConfigDiff`，HCA4/HCA10 基线）形状一致。
  - **toolbox runtime 接线**（toolbox-runtime.ts）：align/distribute/z-order/clipboard **命令接线**（非算法本体，本体 HCA8 已审）；命令与 session/mutator 的接线正确性；clipboard 新 ID 分配接线。
  - **connection 接线**（connection-wiring.ts）：connection 子系统（HCA9）端点注册 / 联动回调装配；接线点与 editor transform 互斥（HCA9 #1 watch-only residual 的接线侧复核）。
  - **test handle 挂载安全**（test-handle-factory.ts + editor-test-handle.ts）：`window.__flux_scada_editor_<cid>` mount/unmount 清理；无 `window` 属性残留 / 句柄泄漏；test-only 机制不污染生产路径；INV-1 边界（test handle property 赋值非 IO 边界，HCA7 dim18 已裁定）。
  - **错误处理 / 类型安全**：空 session / 缺失 cid / NaN 坐标 / 超大 selection 的降级；diff entry cast、unknown 操作类型守卫。
  - **架构边界**：层依赖方向（infra 不应反向依赖 renderer/panel）；公共面最小化；editor subpath 隔离（`/editor` 不污染 runtime bundle）。
  - 若发现定位/集成/测试有效性疑点，触发 dim 21/22/23（toolbox-runtime 命令接线可能触发 dim 22 集成接线）。
- [x] 重点抽查边界值：空 working config / 空 selection / 单符号 selection / mutator 同载连续调用 / adapter 节流窗口边界 / test handle mount→unmount→重 mount / 缺失 cid / group 嵌套 mutator。
- [x] 产出 `docs/audits/2026-08-08-*-hca11-editor-infra.md`：逐文件 finding 表（维度 / 结论 / `文件:行` 证据 / P0-P3 triage）。

Exit Criteria:

> 写法原则：只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续的局部检查；全量验证归 Closure Gates。

- [x] 审计记录文件存在，含 9 文件逐文件 finding 表 + 每条 `文件:行` 证据经 live 核对。
- [x] 所有 finding 已 triage 为 P0/P1/P2/P3 之一（无未分类项）。

### Phase 2 - P0/P1 自动修复 + P2 低成本修复（test-first）

Status: completed
Targets: Phase 1 finding 中标 P0/P1 的源文件 + 对应 `*.test.ts`

- Item Types: `Fix | Proof`

- [x] 对每条 P0/P1 finding：先写 failing-first focused test（断言正确结果值 / 行为，非 not.toThrow），再修代码使转绿。
- [x] P2 低成本（<~30 行 / 单文件 / 无公共面变更）当场修复并带回归测试；P2 高成本入审计卡 backlog（归 HCA-CR）。
- [x] 每条 fix 在审计记录文件回写状态（fixed / recorded）+ fix 落点 `文件:行`。

Exit Criteria:

- [x] 所有 P0/P1 finding 的 failing-first test 存在且转绿（断言结果值）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/test` 全绿（包级局部验证）。
- [x] 审计记录 finding 状态已回写。

### Phase 3 - owner doc 一致性核对 + 回归抽查 + bug 喂入

Status: completed
Targets: `docs/components/industrial-hmi-editor/design-architecture.md`、`design-toolbox.md`、`docs/components/industrial-hmi/editor-initiation.md`、审计记录、HCA-BL 引用

- Item Types: `Fix | Follow-up`

- [x] 核对 `design-architecture.md`（session / adapter / runtime 架构）+ `design-toolbox.md`（toolbox runtime）+ `editor-initiation.md`（runtime 复用点 + R 系列）与 live infra 一致；仅当发现 drift 时同步（无 drift 不写）。
- [x] 抽查构成依赖回归：HCA7 renderer 宿主消费 / HCA9 connection 接线 / HCA10 undo-redo 载荷（`ScadaConfigDiff` 形状与 mutator 消费一致）。
- [x] 把本层复杂 / 跨层 bug 候选汇总到审计记录「喂入 HCA-BL」节（正式归档动作在 HCA-BL，本 plan 不产出 `docs/bugs/` 卡片）。

Exit Criteria:

- [x] design-architecture.md + design-toolbox.md + editor-initiation.md 经 rg/读核对待无 drift（或有同步 commit）。
- [x] 构成依赖回归抽查通过。
- [x] HCA-BL 喂入节存在（含 bug 候选清单 + `文件:行`，或明确「无复杂/跨层 bug 候选」+ 理由）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立子 agent（fresh session）反复 review 直到共识后填写。

- Reviewer / Agent: 独立子 agent fresh session `ses_0202fd981ffeiJMercR48VaQ28`
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major。1 Nit 已落地：n-1（机械健康基线 test 数 `~1302+` 与 HCA10 收口记录 1315 不一致）已更新为 `~1315`（`~`/`+` 限定词下非实质，closure 时 live 验证覆盖）。Live repo 全量复核通过：9 源文件行数精确（130/205/162/261/248/264/69/130/138，Σ=1607），toolbox-runtime(264) 为最大文件；3 个 owner doc + 3 个 colocated test 路径存在；roadmap HCA11=`todo`、依赖 HCA7；HCA11 不在「复杂交互层追加维度」清单（仅 HCA2/HCA3/HCA8/HCA9/HCA10）；`connection-wiring.ts` 位于 `src/editor/` 顶层（infra）而非 `src/editor/connection/`（HCA9 scope）——scope 边界清晰无重叠；3-phase 结构与 sibling HCA10 一致。

## Closure Gates

> **关闭条件**：本 section 所有条目 + 每个 Phase Exit Criteria 全部 `[x]` 后才能 `Plan Status: completed`。全量 `pnpm typecheck/build/lint/test` 是 plan 收口时跑一次的仓库级检查（见 guide Minimum Rule 18）。

- [x] 9 源文件逐文件深审完成，审计记录文件存在且 finding 全 triage。
- [x] 所有 in-scope 确认的 P0/P1 live defect 已 test-first 修复（failing-first proof 存在）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [x] 受影响 owner doc 与 live baseline 一致（或明确无 drift）。
- [x] 必要 focused verification 已完成。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 起草时无已知可延期项。HCA9 #1（connection drag vs viewport-pan）为 watch-only residual，归 HCA9 所有权；若 connection-wiring.ts 接线侧复核发现新缺陷则在本 plan 处理。

## Non-Blocking Follow-ups

- 本层 P2 高成本项 / P3 归 HCA-CR 跨层集中修复。
- 本层 bug 候选喂入 HCA-BL 正式归档。

## Closure

Status Note: 9 源文件 23 维包级深审完成（审计记录 `docs/audits/2026-08-08-1316-hca11-editor-infra.md`）。零 P0；P1-1（importConfig 缺 engine.mode 同步，P1-08 parity mode desync）+ P2-1（cloneConfigSnapshot/save 浅克隆 custom，扩展 P2 #4 的 R5 Layer 2 隔离缺口）test-first 修复并转绿；P2-2（connection-wiring pointerup 容器外卡死）+ P3-1/P3-2 经裁定归 HCA-CR backlog（含 Why-Not-Blocking 理由 + fix 方向）。HCA1–HCA11 全 done，解锁 HCA-BL/HCA-CR 收敛。全量 `pnpm typecheck/build/lint/test` 全绿。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure auditor（fresh session `ses_020036ae8ffe2TUR9zV3sOslGP`，不复用执行者上下文）
- Verdict: approved
- Evidence: 三件套（plan + diff summary + verification output）独立复核 9 项 checklist 全 PASS：① plan 内部一致（Plan Status/3 Phase Status/checkboxes/Closure Gates 无 completed+unchecked 矛盾，仅 closure-audit gate 待本审计填）；② 审计记录 278 行含 9 文件逐文件 finding 表 + 全 triage；③ P1-1 fix live 核对 `toolbox-runtime.ts:235-239` 与 `runtime-mutators.ts:219-221` load() byte-parity，集成测试断言 `engine.currentMode).toBe('edit')`（结果值）；④ P2-1 fix live 核对 `editor-working-helpers.ts:82-85` cloneNodeDeep + `runtime-mutators.ts:193` save() 用 cloneConfigSnapshot，与 `editor-session.ts:127`（P2 #4）同 structuredClone 纪律；⑤ failing-first 4 测试均断言结果值（非 not.toThrow），修复前 RED / 修复后 GREEN；⑥ 3 项 deferred（P2-2/P3-1/P3-2）诚实裁定，无 P0/P1 伪装；⑦ owner doc 无 drift（fix 使 live 对齐本就正确的 doc）；⑧ src/ 无构建产物；⑨ 独立重跑 `pnpm --filter @nop-chaos/flux-renderers-industrial test` = 99 文件 / 1326 测试全绿（baseline 98/1319，+1 文件 / +7 测试）。

Follow-up:

- 本层 P2-2（connection-wiring pointerup 容器外卡死）+ P3-1（undo-redo-adapter.cloneNodeDeep custom 一致性）+ P3-2（handleGeometryChange microtask teardown 竞态）归 HCA-CR 跨层集中修复（含 fix 方向 + Why-Not-Blocking）。
- 本层无复杂/跨层 bug 候选需归 `docs/bugs/`（P1-1/P2-1 单概念局部 defect，审计卡内留痕 + 回归测试覆盖即可）。
- 无其他 plan-owned remaining work。
