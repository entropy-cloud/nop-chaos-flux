# 02 Industrial HMI 2026-08-05-0653 Audit P1 Remediations

> Plan Status: completed
> Last Reviewed: 2026-08-05
> Source: `docs/audits/2026-08-05-0653-open-audit-industrial-hmi.md`（2×P1）+ `docs/audits/2026-08-05-0653-multi-audit-industrial-hmi.md`（2×P1），mission `industrial-hmi` / `packages/flux-renderers-industrial`
> Related: `docs/plans/2026-08-04-2243-1-hmi-lifecycle-destruction-pipeline-hardening.md`（W3 引入方，本 plan Phase 4 修正其残留回归）、`docs/components/roadmap-industrial-hmi.md`（Follow-up Backlog 收 P2）

## Purpose

把 2026-08-05-0653 两份 open 审计（open-ended adversarial + multi-dimensional）登记的 **4 条 P1** 全部收口到「live 缺陷已修 + focused regression proof 已入库 + 受影响 owner doc 已同步 + 仓库硬门禁恢复绿」。两份审计的 P2（共 15 条）不进本 plan，已 triage 到 roadmap Follow-up Backlog（见各审计 §Priority Summary 与 roadmap 新增子节）。

## Current Baseline

> 起草前已逐条核对 live repo（2026-08-05），下列事实均经源码/测试/门禁实测确认。

- **包级健康**：`pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/lint/test` 全绿（**615/615 tests / 43 files**，较前一轮 562/40 增 53 tests）。
- **P1-1（open）已确认 live**：`packages/flux-renderers-industrial/src/serialization/diff.ts:3-30` 的 `SYMBOL_KEYS` 字面量数组**不含 `'flow'`**；而 `config-types.ts:78` 声明 `flow?: {...}`、`validate.ts:200-211` 校验 `flow`、`pipe-junction.ts:90,106` 在 create + `applyProps` 双路径消费 `flow`。→ diff 路径对 `flow` 变更失明（机械遗漏）。
- **P1-2（open）已确认 live**：`packages/flux-renderers-industrial/src/symbols/sensor-control/indicator.ts:42-45` 复合子序为 `[lamp(body), housing]`——`housing` 是覆盖全 bounds 的不透明 `Rect({fill:'#455a64'})`，后入子在 leafer `Group` 中渲染在上层 → 彩色灯体被完全遮挡。同包其余复合图元（motor/pump/fan/valve/gauge/...）均为 `[background_body, active_part]` 序，indicator 是唯一逆序离群点。`sensor-control-symbols.test.ts` 直读 mock 节点 `.fill`（mock 不建模 z-order）→ 单测盲于该缺陷。
- **P1-1（multi）已确认 live**：`symbols/visual-state.ts:48-82` 的 revert 经 `collector.collect` 汇入帧尾；`binding/dirty-collector.ts:322-336` 先 `collectBindings`（binding 值入 `pending`）再 `collectStates`（state:change → `applyState` revert → 同一 `pending` last-write-wins 覆盖 binding 值）。→ binding+state-style 同字段图元从 alarm 态退出到 unstyled 态时，引擎停在 base/reset 值而非 binding 值。`state-visual.test.ts:309-314`（alarm-storm frame 3）仅断言 `toHaveBeenCalledTimes(1)`，无 fill-value 断言 → 回归被隐藏。该回归由 plan `2026-08-04-2243-1` Phase 3 W3 引入（`visual-state.ts:27-31` Decision 仅裁定 active-vs-revert 二路 owner，漏掉 binding-vs-revert 三路交互）。
- **P1-2（multi）已确认 live**：`pnpm check:oversized-code-files` **FAIL**——`packages/flux-renderers-industrial/src/renderer/scada-points-bridge.test.tsx` = **769 行**、`src/engine/scada-engine.test.ts` = **718 行**（实测，与源 multi-audit 一致），均 > 700 硬限（`scripts/check-oversized-code-files.mjs` `ERROR_LINES=700`，无 test 豁免，接入 `pnpm check`）。该包由「上一轮 0 失败」退化为「2 失败」。
- **回归测试落点已确认**：flow diff 回归 → `serialization/serialization.test.ts`；indicator z-order → `symbols/sensor-control/sensor-control-symbols.test.ts`；W3 revert → 扩展 `symbols/state-visual.test.ts` frame 3。三者**均非**上述 2 个超限文件，故 Phase 1 拆分与 Phase 2-4 新增测试无物理耦合（但 Phase 1 先行可保持门禁全程绿）。
- **受影响 owner doc**：`docs/components/industrial-hmi/design-symbols.md`（§4.4 flow 契约、I9.3 indicator）、`docs/components/industrial-hmi/design-data-binding.md`（state-style + binding 交互）、`visual-state.ts:27-31` W3 Decision 注记（需补 binding-vs-revert 三路裁定）。

## Goals

- **4 条 P1 live 缺陷全部修复**并各配 focused regression proof（断言结果值/可见性，非仅 call-count / 仅 mock 属性）。
- **`pnpm check:oversized-code-files` 对 industrial 包恢复 0 失败**（2 个超限测试文件拆分到 < 700 行）。
- **mock↔real drift 防线增强**：indicator 修复同时补一条能捕获 z-order 逆序的测试（mock render-order 追踪 或 e2e 像素探测，二选一），关掉「mock 盲于 z-order」这一类而不仅单例。
- **W3 Decision 注记补全三路裁定**，防止后续重构再次漏判 binding-vs-revert 交互。
- **owner doc 同步**到 live baseline（仅限真正改变行为的项）。

## Non-Goals

- 不处理 15 条 P2（已 triage 到 roadmap Follow-up Backlog，各带源审计路径可追溯）。
- 不重构 `SYMBOL_KEYS` 的生成方式为派生自类型（P2 级 follow-up；本 plan 仅机械补 `'flow'` + 回归测试。是否再加 lint 守卫见 Deferred）。
- 不改 `leafer-ui-mock` 全量 z-order / 类型强转 / 几何重算建模（mission 级 mock 加固，超出本 4-P1 收口范围；本 plan 仅在 indicator 一处补最小 z-order 可观测断言）。
- 不重新仲裁 W3 合帧 owner 方案（active=`collectStates`、revert=`StateVisualApplier` 经 `collector.collect` 合帧——该裁定保留；本 plan 仅修 revert 不应覆盖同帧 binding 值的交互缺陷）。
- 不动其它包的 14 个超限文件（非本 mission / 非本审计来源）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/serialization/diff.ts`（`SYMBOL_KEYS` 补 `'flow'`）。
- `packages/flux-renderers-industrial/src/symbols/sensor-control/indicator.ts`（复合子序 swap 为 `[housing, lamp]`）。
- `packages/flux-renderers-industrial/src/symbols/visual-state.ts`（revert 路径：同字段已有 binding 时跳过 revert collect）+ `binding/dirty-collector.ts` 或 `reverse-index` 只读查询（按实现选择最小侵入点）。
- 拆分 `src/renderer/scada-points-bridge.test.tsx`（768）与 `src/engine/scada-engine.test.ts`（717）为聚焦兄弟文件，均 < 700 行。
- 新增/扩展 focused regression：`serialization/serialization.test.ts`、`symbols/sensor-control/sensor-control-symbols.test.ts`、`symbols/state-visual.test.ts`。
- owner doc 同步：`design-symbols.md`（如涉及）、`design-data-binding.md`（state-style+binding 交互语义）、`visual-state.ts:27-31` W3 Decision 注记补三路裁定。

### Out Of Scope

- 其它 14 个 workspace 超限文件、其它 mission 的 mock 加固、`SYMBOL_KEYS` 派生 lint、`POINT_KEYS` 覆盖审计、15 条 P2。

## Failure Paths

> 涉及运行时数据所有权（Phase 4 binding-vs-revert）与视觉语义（Phase 3 z-order），列关键可测场景。

| 场景编号               | 触发                                                   | 行为                                                              | 可重试 | 用户可见表现                                                                      |
| ---------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| flow-toggle-ignored    | host 同版本 config prop 改 `flow.enabled`（diff 路径） | diff 应产出 `updated[].patch.flow`，pipe `applyProps` 收到新 flow | 是     | 管道流动动画按新 enabled 开/关（修复前：冻结在旧值）                              |
| indicator-lamp-hidden  | 渲染 `scada-sensor-control-indicator`（任意状态）      | lamp 在 housing 之上绘制，状态色可见                              | n/a    | 灯体显示 run/stop/fault 状态色（修复前：只见深色矩形）                            |
| revert-shadows-binding | binding+state-style 同字段图元，alarm→unstyled 退出    | 引擎停在 binding 解析值（如同帧 collectBindings 写入值）          | 是     | 退出报警态后显示 binding 数据色（修复前：显示 base/reset 空值，持续到下次点变化） |

## Test Strategy

档位选择：`必须自动化`

理由：4 条 P1 中 3 条为运行时行为/视觉契约缺陷（flow diff 失明、indicator z-order、W3 revert-vs-binding），1 条为硬门禁。每条修复都必须配 focused regression proof，且 proof 须断言**结果值/可见性**而非仅 call-count / mock 属性。按 plan-authoring-guide「必须自动化」档，Proof 项应在 Fix 项之后同 Phase 内落地（门禁类 Phase 1 除外——其 proof 即门禁通过本身）。flow diff 与 W3 revert 属核心回归路径，必须先写 failing test 再修（见各 Phase Proof 项）。

## Execution Plan

### Phase 1 - 拆分 2 个超限测试文件（恢复 oversized 硬门禁）

Status: completed
Targets: `packages/flux-renderers-industrial/src/renderer/scada-points-bridge.test.tsx`（768）、`packages/flux-renderers-industrial/src/engine/scada-engine.test.ts`（717）

- Item Types: `Fix`

> 先行 Phase：恢复 `pnpm check:oversized-code-files` 对本包的绿灯，使后续 Phase 新增测试落在已组织的聚焦文件结构中。拆分纯机械（按既有 `describe` 域边界切分），不改测试语义/断言。

- [x] **拆分 `scada-points-bridge.test.tsx`（769 → 主文件 + 兄弟诊断文件，均 < 700）**：按既有 `describe` 域边界分离 `analyzeFluxSubscriptions` / `reportOnce` 去重 / `flux-compile-failed` / `flux-deps-empty` / reload-clear 等诊断类测试到兄弟文件（如 `scada-points-bridge-diagnostics.test.tsx`），主文件保留 bridge 主路径（订阅/求值/点值下发）。共享 fixture 若重复可顺手提取到 `test-support/`（与 P2-2 boilerplate 收敛方向一致，但不强制全量收敛——本项只为满足 < 700）。
- [x] **拆分 `scada-engine.test.ts`（718 → 主文件 + 聚焦兄弟文件，均 < 700）**：按 `describe` 域分离 lifecycle / scene-tree / viewport / hit / overlay / image-cache / declarations 等块到聚焦兄弟文件。仅移动、不改断言。
- [x] **（与上两项二选一，非叠加）豁免兜底**：仅当某文件因强内聚确实不宜拆分时，按 `scripts/check-oversized-code-files.mjs` 的 `OVERSIZED_EXEMPTIONS` 登记并附引用理由（AGENTS.md 偏好拆分，豁免为最后手段；当前 `OVERSIZED_EXEMPTIONS` 仅有 2 个非 industrial 条目，本包无既有豁免）。

Exit Criteria:

> 仅写本 Phase 可观测结果 + 保证后续 Phase 能继续的局部检查。全量验证归 Closure Gates。

- [x] `pnpm check:oversized-code-files` 对 `packages/flux-renderers-industrial` 0 失败（两个原超限文件及其拆分兄弟均 < 700 行；可用 `pnpm check:oversized-code-files 2>&1 | grep flux-renderers-industrial` 为空 验证）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial test` 仍 **615/615** 全绿（拆分仅移动测试，数量不变、无丢失）。

### Phase 2 - 修复 diffScadaConfig 丢弃 flow 字段（open P1-1）

Status: completed
Targets: `packages/flux-renderers-industrial/src/serialization/diff.ts`、`serialization/serialization.test.ts`

- Item Types: `Proof`（failing-first）→ `Fix`

- [x] **PROOF（先写失败测试）**：在 `serialization/serialization.test.ts` 加用例——构造 `prev`/`next` config 仅 `flow.enabled` 不同（true→false），断言 `diffScadaConfig(prev, next).updated[0].patch.flow` 等于新 `flow` 对象（当前实现该测试失败：patch 不含 flow）。再加一条 `flow.speed` / `flow.dash` 变更的回归。
- [x] **FIX**：`diff.ts:3-30` `SYMBOL_KEYS` 在 `'textSize'` 与 `'custom'` 之间补 `'flow'`（与 `config-types.ts:78` 声明序对齐）。
- [x] **PROOF（集成层）**：加一条断言 `engine.applyDiff(diff, next)` 后 pipe-junction 的 `applyProps` 收到新 `flow`（通过 spy 或 engine 状态间接验证），证明 diff→engine→applyProps 链路贯通。

Exit Criteria:

- [x] failing-first 测试在 Fix 前红、Fix 后绿；`diffScadaConfig` 对仅 `flow` 变更产出非空 `updated[].patch.flow`。
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial test` 全绿（含新增 flow 用例）。

### Phase 3 - 修复 scada-sensor-control-indicator 绘制顺序（open P1-2）

Status: completed
Targets: `packages/flux-renderers-industrial/src/symbols/sensor-control/indicator.ts`、`symbols/sensor-control/sensor-control-symbols.test.ts`

- Item Types: `Fix` → `Proof`

- [x] **FIX**：`indicator.ts:42-45` 复合子序 swap 为 `[{ name: 'housing', node: housing }, { name: 'body', node: lamp }]`（housing 先作背景、lamp 后绘于上层）。`name:'body'` 角色保留在 `lamp` 上，确保 `applyCompositeProps` 状态色路由不变。
- [x] **PROOF（z-order 可观测）**：补一条能捕获子序逆序的测试——优先方案：扩展 `leafer-ui-mock` 使 `Group.add` 记录入序（render order），断言 indicator 的 render-order 首位是 housing、lamp 在后（housing 背景层）。若 mock 扩展成本过高，退路方案：在 `tests/e2e/scada-demo.spec.ts` 加像素探测——挂载 indicator + 在 lamp 中心采样像素，断言匹配声明的状态色（非 housing 的 `#455a64`）。**必须二选一落地**，以关闭「mock 盲于 z-order」类而不仅单例。

Exit Criteria:

- [x] `indicator.ts` 复合子序为 `[housing, lamp]`（housing 背景、lamp 上层）；`name:'body'` 仍在 lamp。
- [x] z-order 可观测测试入库并通过（mock render-order 追踪 或 e2e 像素探测二选一）；该测试在 swap 前应红、swap 后绿（自验）。
- [x] `sensor-control-symbols.test.ts` 既有 indicator 断言（直读 `.fill`）仍绿（确认 state 色路由未破坏）。

### Phase 4 - 修复 W3 revert 覆盖同帧 binding 值（multi P1-1）

Status: completed
Targets: `packages/flux-renderers-industrial/src/symbols/visual-state.ts`、`binding/dirty-collector.ts`（或 `reverse-index.ts` 只读查询）、`symbols/state-visual.test.ts`、`visual-state.ts:27-31` W3 Decision 注记

- Item Types: `Proof`（failing-first，扩展 frame 3）→ `Fix` → `Decision`（注记补三路裁定）

- [x] **PROOF（先补缺失断言，使其先红）**：扩展 `state-visual.test.ts:309-314` alarm-storm frame 3——在 `toHaveBeenCalledTimes(1)` 之外，断言 `frame3Arg['s0']?.fill === <binding 解析值>`（按测试 config 即 `flag-i` 点值 `2`，或 binding 解析后的预期色）。当前实现该断言失败（fill 为 base/reset）。确认该测试 config 确为 binding+state-style 同字段（`bindings:{fill:{point:'flag-i'}}` + `states.*.style.fill`）。
- [x] **FIX**：在 `StateVisualApplier.applyState` revert 分支（`visual-state.ts:61-74`），revert 某字段前查该 symbol 是否有该字段的 binding（经 `reverseIndex.getBindings(symbolId)?.[key]`）。若有 binding，**跳过该字段的 revert collect**——同帧 `collectBindings` 已把 binding 值写入 `pending`，是正确终值。无 binding 时 revert 行为不变。注意：若 binding 源点本轮未变化（binding 未重算），engine 暂留 active 态值——这是独立的既有边缘 case，记入 Non-Blocking Follow-ups，不在本 Phase 处理。
- [x] **DECISION（注记同步）**：更新 `visual-state.ts:27-31` W3 Decision 注记，补三路裁定——「active-state owner=`collectStates`、revert owner=`StateVisualApplier` 经 collector 合帧；**当 revert 字段同时存在 binding 时，binding 胜出（revert 跳过该字段），因 collectBindings 已在同帧写入 binding 解析值**」。同步 `docs/components/industrial-hmi/design-data-binding.md`（state-style + binding 同字段交互语义，仅当该文档确有相关章节需对齐时）。

Exit Criteria:

- [x] failing-first：扩展后的 frame-3 fill-value 断言在 Fix 前红、Fix 后绿。
- [x] `applyState` revert 分支对「有 binding 的字段」跳过 revert collect；既有「无 binding」revert 路径行为不变（既有 revert 单测仍绿）。
- [x] `visual-state.ts:27-31` W3 Decision 注记含 binding-vs-revert 三路裁定一句。
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial test` 全绿（含扩展后的 alarm-storm frame 3）。

## Draft Review Record

> 起草后、执行前的独立审查证据（Plan Review Rule）。由独立子 agent（fresh session，不复用起草者上下文）填写。**达成共识（零 Blocker/Major）前，Plan Status 维持 `draft`。** 首轮即达成共识（pass-with-minors，零 Blocker / 零 Major），Minor 不阻塞、不触发返工，已顺手校正（见下）。

- Reviewer / Agent: 独立 fresh-session sub-agent（task `ses_030bc8938ffeGEwTgA0cfahiKS`，未参与起草）
- Verdict: `pass-with-minors`
- Rounds: 1（首轮即共识：零 Blocker / 零 Major）
- Findings addressed:
  - Minor 1（已校正）：§Current Baseline 两超限文件行数 768/717 → 校正为实测 769/718（与源 multi-audit + live repo 一致；Phase 1 拆分项同步更新）。
  - Minor 2（已校正）：Phase 1 第三项「可选豁免登记」措辞含混（读似叠加任务）→ 改述为「（与上两项二选一，非叠加）豁免兜底」，并补注 `OVERSIZED_EXEMPTIONS` 当前仅 2 个非 industrial 条目。
- Reference 核对结论（审查者逐项 live-repo 复核，全部 CONFIRMED）：
  - open P1-1（flow drop）CONFIRMED：`diff.ts:3-30` `SYMBOL_KEYS` 字面缺 `'flow'`；`config-types.ts:78` 声明 `flow?`；`validate.ts:200-211` 校验；`pipe-junction.ts:90` + `:106` create+applyProps 消费；`serialization.test.ts` 存在。
  - open P1-2（indicator z-order）CONFIRMED：`indicator.ts:42-45` 序为 `[lamp, housing]`；housing 不透明全 bounds Rect `#455a64`；lamp 居中 Ellipse `height*0.72`；`sensor-control-symbols.test.ts` 存在；兄弟复合 motor/pump/valve/fan 均为 `[body, active]` 反序——indicator 唯一离群。
  - multi P1-1（W3 revert）CONFIRMED：`visual-state.ts:68` revert 经 `collector.collect`；`dirty-collector.ts:332` collectBindings 先于 `:336` collectStates；`state-visual.test.ts:313` frame-3 仅断言 `toHaveBeenCalledTimes(1)` 无 fill-value；测试 config `:256-264` 为 binding+state-style 同 `fill` 字段。
  - multi P1-2（oversized）CONFIRMED：`pnpm check:oversized-code-files` FAIL；实测 769/718 均 >700；`check-oversized-code-files.mjs:12` `ERROR_LINES=700`；`OVERSIZED_EXEMPTIONS` 仅 2 个非 industrial 条目；`.ts/.tsx` test 不豁免。
- Coverage check：4/4 P1 覆盖（open P1-1→Phase 2、open P1-2→Phase 3、multi P1-1→Phase 4、multi P1-2→Phase 1）；15 P2（9 open + 6 multi）经 Non-Goals + Non-Blocking Follow-ups 排除至 `roadmap-industrial-hmi.md` backlog；无 P2 伪装成 Fix、无 P1 遗漏/降级。

## Closure Gates

> 关闭条件：本节及每 Phase Exit Criteria 全部 `[x]` 后方可将 Plan Status 改为 `completed`。全量 `pnpm typecheck/build/lint/test` + oversized 门禁在此处一次性跑。

- [x] open P1-1：`diffScadaConfig` 对 `flow` 变更产出 `updated[].patch.flow`（focused 测试 + 集成链路 proof 入库）。
- [x] open P1-2：indicator 复合子序为 `[housing, lamp]`，状态色可见（z-order 可观测测试入库）。
- [x] multi P1-1：binding+state-style 同字段图元 alarm→unstyled 退出时引擎停在 binding 值（扩展 frame-3 fill-value 断言入库）。
- [x] multi P1-2：`pnpm check:oversized-code-files` 对 `packages/flux-renderers-industrial` 0 失败。
- [x] W3 Decision 注记含 binding-vs-revert 三路裁定；受影响 owner doc（`design-data-binding.md` 等）已同步或显式标注无需更新。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`（workspace 32/32 successful）
- [x] `pnpm build`（workspace 32/32 successful）
- [x] `pnpm lint`（workspace 32/32 successful）
- [x] `pnpm test`（workspace 59/59 successful；industrial 包 628/628 全绿）

## Deferred But Adjudicated

### SYMBOL_KEYS 派生 lint 守卫

- Classification: `optimization candidate`
- Why Not Blocking Closure: 本 plan 机械补 `'flow'` + 回归测试即收口 P1-1。是否再加 `scripts/check-scada-symbol-keys.mjs`（断言 `SYMBOL_KEYS ∪ {id,type} === keyof ScadaSymbolNode`）属防递归增强，非本 4-P1 收口必需；open 审计 §总评-1 已建议，归 follow-up。
- Successor Required: no（记入 Non-Blocking Follow-ups，按 mission 节奏择期）

### POINT_KEYS 同类覆盖审计

- Classification: `watch-only residual`
- Why Not Blocking Closure: 本 plan 只证 `flow`（symbol 字段）；`POINT_KEYS`（`ScadaPointDeclaration`）是否同样遗漏（如 P2-7 declaration-scale expression 被静默丢弃）是独立 contract gap，已作 P2 进 roadmap backlog。
- Successor Required: no

### binding 源点本轮未变化时的 active 态残留

- Classification: `watch-only residual`
- Why Not Blocking Closure: Phase 4 修「revert 覆盖 binding」主路径；若 binding 源点本轮未变化（binding 未重算），engine 暂留 active 态值——这是 pre-existing 边缘 case，非 W3 引入，影响面窄（需 binding 源点在退出帧恰好不变）。归 follow-up 观测。
- Successor Required: no

## Non-Blocking Follow-ups

- 15 条 P2（9 open + 6 multi）已 triage 到 `docs/components/roadmap-industrial-hmi.md` Follow-up Backlog 新增子节「2026-08-05-0653 post-remediation audit P2」，各带源审计路径 + 代码定位可追溯。
- `SYMBOL_KEYS` 派生 lint 守卫（open 审计 §总评-1 建议）。
- mock 全量 z-order / 类型强转 / 几何重算建模（mission 级 mock 加固，本 plan 仅在 indicator 一处补最小 z-order 断言）。

## Closure

Status Note: 4 P1（open P1-1 flow diff、open P1-2 indicator z-order、multi P1-1 W3 revert-vs-binding、multi P1-2 oversized 门禁）全部修复并各配 focused regression proof（断言结果值/可见性）。包级 628 tests / 46 files 全绿（较 615/43 增 13 tests / 3 files），workspace 全量验证（typecheck/build/lint 32/32 + test 59/59）全绿，`pnpm check:oversized-code-files` industrial 包 0 失败（16→14 ERROR）。W3 Decision 注记 + `design-data-binding.md §4.3` 同步 binding-vs-revert 三路裁定。源审计 `2026-08-05-0653-open-audit` / `2026-08-05-0653-multi-audit` `Audit Status: planned → closed`。15 P2 经 Non-Goals 排除至 roadmap Follow-up Backlog。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure-audit sub-agent（MISSION_DRIVER:2026-08-05-065334-mission-driver，未参与起草 / 未参与执行 session，fresh context 仅输入 plan + diff summary + 验证输出）。
- Audit scope: 五点一致性（Plan Status / 4×Phase Status / 4×Phase Exit Criteria / Closure Gates / docs/logs 收口记录）+ anti-hollow（接口存在 ≠ 行为完成）+ deferred honesty + live-repo 逐条复核。
- Live-repo 复核结果（全部 CONFIRMED，非信任 `[x]` 标记）：
  - Phase 1（oversized 门禁）：`wc -l` 实测 5 个拆分产物均 <700（`scada-points-bridge.test.tsx` 427 / `scada-points-bridge-diagnostics.test.tsx` 391 / `scada-engine.test.ts` 344 / `scada-engine-events-declarations.test.ts` 250 / `scada-engine-plugin-sync.test.ts` 190）；`node scripts/check-oversized-code-files.mjs` ERROR 14 文件清单中 **无 `flux-renderers-industrial` 条目**（先前 grep 命中是该脚本 >500 行 WARN advisory 区段，非 failure）；exit code=1 由其它包 14 个超限文件贡献，与本 plan scope 无关（Non-Goals 已显式排除）。
  - Phase 2（flow diff）：`serialization/diff.ts:27` `SYMBOL_KEYS` 在 `'textSize'` 与 `'custom'` 之间含 `'flow'`（非注释、实际数组元素）；`serialization/serialization.test.ts:542` `describe('diffScadaConfig flow field (plan 2026-08-05-0653-2 Phase 2 open P1-1)')` 含 `patch.flow` 断言用例（flow.enabled / flow.speed / flow.dash / 同值判等 / undefined 双向），非空壳。
  - Phase 3（indicator z-order）：`indicator.ts:48-49` 复合子序为 `[{name:'housing',node:housing},{name:'body',node:lamp}]`（housing 背景层在前、lamp 上层在后，`name:'body'` 仍在 lamp）；`sensor-control-symbols.test.ts:186` `describe('scada-sensor-control-indicator z-order (plan 2026-08-05-0653-2 Phase 3 open P1-2)')` 含 children 入序断言（`children[0]?.name==='housing'`、`children[1]?.name==='body'`）+ 兄弟图元序位对齐断言，关闭「mock 盲于 z-order」类。
  - Phase 4（W3 revert-vs-binding）：`visual-state.ts:76-79` revert 分支 `if (instanceBindings?.[key]) { applied.delete(key); continue; }` 真实存在且被 `applyState` 主循环到达（非死代码）；`state-visual.test.ts:318-321` frame-3 断言 `frame3Arg['s${i}']?.fill).toBe(2)`（binding 解析值，非 call-count）；`visual-state.ts:33-40` W3 Decision 注记含三路裁定一句（active=`collectStates` / revert=本层 / binding 胜出 skip revert）；`docs/components/industrial-hmi/design-data-binding.md:127` 同步「binding-vs-revert 三路裁定」段落。
- Anti-hollow 抽查：4 处 Fix 均在运行时路径——`diff.ts:27` 经 `diffScadaConfig`→`engine.applyDiff`→`pipe-junction.applyProps` 消费（Phase 2 集成 proof 覆盖）；`indicator.ts` 经 `createCompositeGroup` 入 leafer `Group.children`（Phase 3 z-order proof 直读 children 序）；`visual-state.ts:76` 经 `attachTo`→`pipeline.on('state:change')`→`applyState` 调用（alarm-storm frame 3 覆盖）；无空函数体 / `return null` 占位 / 吞异常。
- Deferred honesty：3 项 deferred（`SYMBOL_KEYS` 派生 lint = optimization candidate；`POINT_KEYS` 覆盖审计 = watch-only residual；binding 源点未变 active 残留 = watch-only residual）均带 `Why Not Blocking Closure` 理由，均非 in-scope P1 live defect / contract drift 降级。
- Docs sync：`docs/logs/2026/08-05.md` 已记录本 plan 收口（四 Phase 全绿 + 628/46 包级 + workspace 全量 32/32 + 59/59 + oversized industrial 0 失败）；`design-data-binding.md` 已同步；`design-symbols.md` 无契约文字变化（Phase 3 仅修复绘制序、未改 I9.3 契约语义，按 Minimum Rule 17 不写凑条目）。
- Verdict: `approved` — 五点一致、无 hollow、deferred 诚实、owner-doc 同步、独立 fresh-session 审计完成。Plan 可关闭。
