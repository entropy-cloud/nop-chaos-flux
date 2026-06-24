# W4b 流程展示组（steps / timeline）

> Plan Status: completed
> Last Reviewed: 2026-06-24
> Source: `docs/components/roadmap.md` W4b；`docs/components/{steps,timeline}/design.md`（契约已立约）
> Related: roadmap 依赖图 `L0 → W4b`（无前置阻塞，与 W3d/W4a 互相独立）；W3a collapse/wizard value 三态分层（steps valueOwnership 复用）；W1c list 集合展示范式（timeline item 归一化复用）
> Mission: components
> Work Item: W4b

## Purpose

把 roadmap W4b（流程展示组，2 个组件）从"2 份 design.md 已立约、代码 0%"推进到"2 个 renderer 实现 + 注册 + playground + e2e + roadmap W4b 标 done"。

2 个组件合成一个 owner plan（遵循 guide Rule 22/26：同一展示族优先合成 owner plan），理由：同属 `flux-renderers-layout` 包的流程/时间展示 renderer，共享 `RendererComponentProps` 消费范式、同一注册路径、同一 proof path、同一 owner-doc obligation（2 份 design §3 归属 drift 收敛 basic→layout）。design §12 各自标注的最大风险（steps↔wizard owner 混叠、timeline↔steps/list 混为一类）正是要求一次性厘清三者边界。

## Current Baseline

> 截至 2026-06-24 的 live repo 核查结论（read-only）：

- **2 个 renderer 均未实现**：`packages/flux-renderers-layout/src/` 无 steps/timeline（现有：grid/collapse/button-group/dropdown-button/wizard）；`amis-baseline-matrix.md` L75-76 两组件均标 `targetContract` / wave 4。
- **目标包已 bootstrap**：`flux-renderers-layout` 已落地 5 个 renderer（W2a wizard + W3a/W3b），`layoutRendererDefinitions` + `registerLayoutRenderers(registry)` 就绪——2 个 renderer 直接追加，**无新包工作**。
- **value 三态分层范式已就绪（steps 复用）**：W3a `collapse-renderer.tsx` 已建立 `valueOwnership` local/controlled/scope 三态分层 + `valueStatePath`；W2a `wizard-renderer.tsx` 建立步骤交互/lifecycle 状态分层。steps 的当前步骤值复用该三态分层（design §4 `valueOwnership`/`valueStatePath`）。
- **集合展示 item 归一化范式已就绪（timeline 复用）**：W1c `list` + `cards` 已建立 items 集合归一化 + region/`value-or-region` 范式；timeline 的 items（time/title/detail/icon/level）归一化直接套用。
- **ui primitives**：`@nop-chaos/ui` 无专门 steps/timeline primitive（shadcn 无等价物）——按 layout 包 marker 模式自建（设计 §10：根节点输出 marker，视觉类由组件内部 feature surface 控制）。
- **owner-doc drift（包归属，系统性）**：steps/timeline design §3 全部写"预期归属 `flux-renderers-basic`"，但 roadmap（权威包分配）将 W4b 划归 `flux-renderers-layout`（NEW 包）。2 份 §3 需收敛。
- **边界已立约（design §1/§12）**：`steps` 是轻量步骤进度展示/轻交互（当前步骤值），不承担完整多步流程 owner 语义（由 `wizard` 承担）；`timeline` 是按时间顺序展示事件项的展示型集合，无流程 owner。三者（steps/wizard/timeline）职责分层已立约。
- **纯展示/轻交互，无请求下沉约束**：items/value 由表达式或既有 loader 提供，无挂载期数据请求语义。

## Goals

- `steps`：步骤进度 renderer（`items`/`value`/`defaultValue`/`valueOwnership` local|controlled|scope/`valueStatePath`/`orientation`，item 含 title/description/status，`onChange`），当前步骤值复用 W3a value 三态分层，落 `flux-renderers-layout`，marker `nop-steps`。
- `timeline`：时间线展示集合 renderer（`items`/`mode`/`orientation`/`reverse`，item 含 time/title/detail/icon/level），展示型无 owner 状态，落 `flux-renderers-layout`，marker `nop-timeline`。
- 2 个 `RendererDefinition` 合入 `layoutRendererDefinitions` 随 `registerLayoutRenderers` 注册；playground 演示页 + e2e（程序化断言）+ focused 单测。
- roadmap W4b 标 done + amis-baseline-matrix 2 组件 `targetContract→runtime`；2 份 design §3 归属 drift 收敛 basic→layout。
- 实现时厘清 steps/wizard/timeline 三者边界（design §12 风险），不产生 owner 混叠。

## Non-Goals

- 不把 `steps` 退化为多步流程 owner（design §1/§12：完整流程提交 lifecycle 由 `wizard` 承担，steps 只展示/轻交互当前步骤）。
- 不实现 timeline 的导航/workflow owner 语义（design §2：保持简单稳定的时间线 contract）。
- 不实现 steps/timeline 的远程 items loader 装配（design §9 标注可由 loader/source 提供，首版聚焦静态 + 表达式 items）。
- 不实现 W4a（audio/video/carousel/qrcode，归 content 包，独立 plan）。

## Scope

### In Scope

- 2 个 renderer 实现，遵循 `RendererComponentProps`（读 `props.props`/`props.regions`/`props.meta`/`props.events`/`props.helpers`；timeline 无 owner 状态，steps 当前步骤值用 value 三态分层）。
- steps 复用 W3a `valueOwnership`/`valueStatePath` 三态分层；timeline 复用集合 item 归一化范式。
- 2 个 `RendererDefinition` 合入 `layoutRendererDefinitions` 注册 + playground 演示页 + e2e + focused 单测。
- roadmap W4b 标 done + amis-baseline-matrix 2 组件 `targetContract→runtime` + 2 份 design §3 drift 收敛。

### Out Of Scope

- steps 多步流程提交 lifecycle（`wizard` 范畴）。
- timeline 导航/workflow owner。
- steps/timeline 远程 items loader。

## Failure Paths

| 场景                               | 触发                                         | 行为                                                   | 可重试 | 用户可见表现               |
| ---------------------------------- | -------------------------------------------- | ------------------------------------------------------ | ------ | -------------------------- |
| steps-items-empty                  | `items` 空                                   | 渲染 empty 态，不抛错                                  | 否     | 步骤区显示空态             |
| steps-value-out-of-range           | `value` 越过 items 边界                      | clamp 到最近有效步骤，不越界渲染                       | 否     | 高亮首/末步，无崩溃        |
| steps-valueOwnership-scope-no-path | `valueOwnership:scope` 但缺 `valueStatePath` | 降级为 local controlled 并告警                         | 否     | 步骤仍可切换，值不写 scope |
| timeline-items-empty               | `items` 空                                   | 渲染 empty 态                                          | 否     | 时间线区显示空态           |
| timeline-item-missing-field        | item 缺 time/title                           | 渲染该项时缺字段位降级（不渲染该子节点），不影响其他项 | 否     | 该项显示已有字段，无崩溃   |

## Test Strategy

档位选择：`建议有测`

理由：2 个均为展示/轻交互组件（非鉴权/对外 API）。steps 的 value 三态分层（local/controlled/scope 写回）、value 越界 clamp、timeline item 归一化/`reverse`/`orientation` 是回归风险点，配 focused 单测；关键交互（steps 切换/写回、timeline 渲染/反转）配 e2e（程序化断言）。按 AGENTS.md 每个新组件必须有 playground 示例 + e2e。

## Execution Plan

### Phase 1 - steps（步骤进度 + value 三态）

Status: completed
Targets: 新增 `packages/flux-renderers-layout/src/steps-renderer.tsx`；`layout-renderer-definitions.ts`、`schemas.ts`、`index.ts`；playground route-model + example；`tests/e2e/`

- Item Types: `Decision | Fix | Proof`

- [x] **Decision**：steps↔wizard 边界裁定 —— steps 只承担步骤进度展示/轻交互（当前步骤值 + `onChange`），不承担多步流程提交 lifecycle（`wizard` 范畴）。当前步骤值复用 W3a `valueOwnership`（local/controlled/scope）+ `valueStatePath` 三态分层，不新建第二套值模型。**退化分支显式实现**：`valueOwnership:scope` 但缺 `valueStatePath` 时，须显式降级为 local controlled + dev 告警（注意复用源 `collapse-renderer.tsx` 的 `setExpanded` 在该态当前是 silent no-op，steps 不可照搬该 no-op，须实现可交互的降级）。裁定写入 design + log。
- [x] **Fix**：实现 steps（items 归一化 title/description/status + 当前步骤 value 三态 + `orientation` 横/纵 + value 越界 clamp + 空 items empty 态），输出 `nop-steps` marker。
- [x] **Fix**：`RendererDefinition` 合入 `layoutRendererDefinitions`，随 `registerLayoutRenderers` 注册；schema + 字段分类（design §4/§5）；收敛 steps design §3（basic→layout）。
- [x] **Proof**：focused 单测 —— item 归一化、value 三态写回（local/controlled/scope + `valueStatePath` 缺失降级）、value 越界 clamp、orientation 横/纵、空 items empty。
- [x] **Proof**：playground 演示页（三态 + 横/纵 + 表达式 items）+ e2e（程序化断言：切换步骤→value 写回正确；scope 模式写 scope）。

Exit Criteria:

- [x] steps 落地于 `flux-renderers-layout`，输出 marker，随 `registerLayoutRenderers` 注册；value 三态写回 + 越界 clamp focused 单测通过；切换/写回 e2e 程序化断言通过。
- [x] steps 不承担流程 owner（与 wizard 边界清晰）；steps design §3 收敛为 layout。

### Phase 2 - timeline（时间线展示集合）

Status: completed
Targets: 新增 `packages/flux-renderers-layout/src/timeline-renderer.tsx`；`layout-renderer-definitions.ts`、`schemas.ts`、`index.ts`；playground route-model + example；`tests/e2e/`

- Item Types: `Fix | Proof`

- [x] **Fix**：实现 timeline（items 归一化 time/title/detail/icon/level + `mode`/`orientation`/`reverse` + 缺字段项降级 + 空 items empty），无 owner 状态，输出 `nop-timeline` marker。
- [x] **Fix**：`RendererDefinition` 合入 layout 注册；schema + 字段分类（design §4/§5）；收敛 timeline design §3（basic→layout）。
- [x] **Proof**：focused 单测 —— item 归一化（time/title/detail/icon/level）、`reverse` 反转、`orientation` 横/纵、`mode` 切换、缺字段项降级、空 items empty。
- [x] **Proof**：playground 演示页 + e2e（程序化断言：items 渲染顺序、`reverse` 反转后 DOM 顺序、level→视觉）。

Exit Criteria:

- [x] timeline 落地于 `flux-renderers-layout`，输出 marker，随 `registerLayoutRenderers` 注册；item 归一化/reverse/orientation focused 单测 + e2e 程序化断言通过。
- [x] timeline 无流程 owner 语义（与 steps/list 边界清晰）；timeline design §3 收敛为 layout。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 独立 sub-agent（fresh session，task `ses_10934c159…`）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Minor（已修复）—— `valueOwnership:scope` 缺 `valueStatePath` 的退化分支须显式实现（local controlled 降级 + dev 告警），不可照搬复用源 `collapse-renderer.tsx` `setExpanded` 在该态的 silent no-op；已在 Phase 1 Decision 注明。

## Closure Gates

> 关闭条件：本 section 及每个 Phase Exit Criteria 全部 `[x]` 后，经独立子 agent closure-audit，方可将 Plan Status 改 `completed`。

- [x] 2 个 renderer（steps/timeline）全部落地并注册于 `flux-renderers-layout`
- [x] steps 复用 W3a value 三态分层、不承担流程 owner；timeline 展示型无 owner；三者（steps/wizard/timeline）边界清晰
- [x] 行为/契约结果已达成（focused 单测 + e2e 程序化断言全绿）
- [x] 2 份 design §3 归属 drift 收敛 basic→layout
- [x] roadmap W4b 标 done + amis-baseline-matrix 2 组件 `targetContract→runtime`
- [x] 不存在被静默降级到 deferred 的 in-scope live defect / contract drift
- [x] 受影响 owner docs（2 份 design.md、roadmap、amis-baseline-matrix）已同步 live baseline
- [x] 独立子 agent（fresh session）closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### steps/timeline 远程 items loader 装配

- Classification: `optimization candidate`
- Why Not Blocking Closure: design §9 标注 items 可由 loader/source 提供；首版聚焦静态 + 表达式 items，远程 loader 不影响展示契约成立。
- Successor Required: `no`

## Non-Blocking Follow-ups

- steps 与 wizard 在多步流程场景的进一步协作模式（design §12 风险）——首版边界已清晰，深度协作属后续。
- timeline 的导航/锚点跳转增强（design §2 排除 workflow owner，锚点属可选增强）。

## Closure

Status Note: 2 个 renderer（steps/timeline）全部落地注册于 `flux-renderers-layout`，含 focused 单测（layout 包 50 tests）+ e2e 程序化断言（4 tests）+ playground 演示页。steps 复用 W3a valueOwnership 三态分层（scope 缺 valueStatePath 显式降级 local controlled + dev 告警，Draft Review minor 已修复）、value 越界 clamp、orientation；timeline 展示型无 owner、reverse/mode/orientation、缺字段项降级。2 份 design §3 basic→layout 收敛；roadmap W4b done；amis-baseline-matrix 2 组件 runtime。全量 `pnpm typecheck/build/lint/test` 全绿。

Closure Audit Evidence:

- Auditor / Agent: 独立 sub-agent（fresh session，task `ses_10817ed05ffemrDf2LLuaaXz9X`）
- Verdict: `approved`
- Evidence: 通读 plan + live repo 核对。steps-renderer.tsx `nop-steps` marker + valueOwnership 三态 + clampIndex + scope-degradation（`scopeDegraded`→`ownership='local'` + `warnScopeDegraded()`，非 silent no-op，Draft Review minor 已修复）；timeline-renderer.tsx `nop-timeline` marker + reverse/mode/orientation + 缺字段降级 + 无 owner 状态。focused 单测断言结果（scope 写回 `scope:b`、clamp 99→2、reverse `['Third','Second','First']`、缺字段项不崩）。owner-doc drift 已收敛（steps/timeline design §3 → layout、roadmap W4b done、matrix runtime）。deferred 仅 remote items loader（legit non-blocking）。独立重跑 `pnpm --filter flux-renderers-layout test/typecheck/lint` 全绿。

Follow-up:

- steps/timeline 远程 items loader 属 non-blocking（见 Deferred）。
- 无 in-scope remaining debt。
