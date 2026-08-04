# 1 Diff-Path Convergence And Dual-Writer Reconciliation — `flux-renderers-industrial`

> Plan Status: completed
> Last Reviewed: 2026-08-04
> Source: `docs/audits/2026-08-03-1506-multi-audit-industrial-hmi.md` (P1-4, P1-5), `docs/audits/2026-08-03-1506-open-audit-industrial-hmi.md` (P1 type-drop)
> Related: `docs/components/roadmap-industrial-hmi.md`（I5/I6/I10 交付后的 remediation 轮）; `docs/plans/2026-08-04-1235-2-hmi-lifecycle-wiring-plan.md`; `docs/plans/2026-08-04-1235-3-hmi-display-math-manifest-plan.md`

## Purpose

把 `scada-canvas` 的 props 变更 diff 路径收敛为单一事实源：一次 `applyDiff` 必须同时收敛**场景树 + `nodeById` 索引 + `prevRef` 基线**，并让 `component:importConfig` 与 props 同步链共享同一基线，消除"diff 后树/索引/声明读到过期状态"这一类 contract drift（审计 P1-4、P1-5、open-audit type-drop 共 3 个 P1）。

## Current Baseline

- `serialization/diff.ts:71-77` — `diffScadaConfig` 对 `id`/`type` 键直接 `continue`：图元 type 变更（如 rect→ellipse 换形）永远进不了 patch，`applyUpdate` 只能 `node.set` 旧 leafer 节点，新图元永不出现（open-audit P1-C 已确认 live）。`children` 通过 `valuesEqual` 深比较，变化时产出整段 `children` patch；`children: undefined` 会进 patch 但 `applyUpdate:125` 的 `!== undefined` 守卫跳过 → 子树残留。
- `engine/config-adapter.ts:59-72` — `applyDiff` 处理顺序为 `added → removed → updated`：同 id 图元若同时出现在 added 与 removed（type 变更的 remove+add 语义），`buildNode` 先注册新节点，随后 `removeSymbol(id)` 删除的将是**刚构建的新节点**，旧 leafer 节点反而残留舞台——顺序必须先 removed 后 added（或对 added∩removed 去重）。
- `engine/config-adapter.ts:121-146` — `applyUpdate` 只写 leafer 节点、从不更新 `nodeById` 索引 → `getNode(id)`（`config-adapter.ts:28-33` index-hit-first）返回上次 build 的旧对象；`scada-engine.ts:217-235` `getSymbolDeclarations` 消费它，refresh 流水线的 `getStates`/`getAnimations`（`use-scada-engine.ts:53-54` 注入 pipeline options，`dirty-collector.ts:293/:326` 消费）继续合并旧声明，diff 更新的 states/animations 被静默忽略（multi-audit P1-4 已确认 live）。注意：`config-adapter.test.ts:228-260` 已覆盖 children 重建时的 `getConfigNode` 索引同步；真正未覆盖的是**非 children 的 updated id**、states/animations 声明、以及 type-change。
- `scada-canvas.tsx:160-165` `reloadConfig`（`component:importConfig` 句柄）→ `engine.reset(config)` + `reloadBindings(...)`，但**不更新** `useScadaConfigSync` 的 `prevRef` → 下一次 props 变更的 diff 基于过期基线，import 引入的图元被当作 `added` 重建、旧树节点残留（`registry.add` 覆盖 by-id 索引但从不移除旧树节点）→ 重复渲染永不收敛；`status` 也因不走 onBuilt 而停在旧值（multi-audit P1-5 已确认 live）。
- 现有 462/462 单测全绿（95.88% stmts）；open-audit 复核确认 P1-4/P1-5/P1-C 均未修复。
- 机械门：`pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/lint/build/test` 全 PASS；`check:workspace-manifest-deps` 全局 FAIL（P1-1，归 plan `{3}`）。

## Goals

- diff 应用后，`config-adapter.getNode(id)` 与 `getSymbolDeclarations(id)` 返回**新** config 的节点/声明（nodeById 随 applyUpdate/applyDiff 同步）。
- 图元 `type` 变更在 diff 路径被正确执行（remove+add 语义，顺序保证旧节点先销毁），`children: undefined` 产生子树移除 patch。
- `component:importConfig` 后：场景树、绑定域、`prevRef` 基线、`status` 全部与新 config 一致；后续 props 变更 diff 不再产生重复图元。
- 每个 divergence 有一条 focused 回归测试（diff type-change、diff states/animations 生效、import-then-edit 不重复）。

## Non-Goals

- 不处理第一帧/ready 生命周期语义（multi-audit P1-2/P1-3、open-audit background/viewport 字段）——归 plan `{2}`。
- 不改 `scada-canvas` 公共 schema/events/handles 契约（`importConfig` 句柄签名不变，只改内部同步链）。
- 不处理显示/坐标数学缺陷（P1-6/P1-7/P1-9）与 manifest 门（P1-1）——归 plan `{3}`。
- 不引入组态 JSON 新字段。

## Scope

### In Scope

- `serialization/diff.ts`：type 变更 → remove+add；`children: undefined` → 子树移除 patch；相关纯逻辑单测（`src/serialization/serialization.test.ts` 中 `diffScadaConfig` describe 块，仓库无 `__tests__/` 目录、测试平铺同位）。
- `engine/config-adapter.ts`：`applyDiff` 顺序修正（removed → added → updated / added∩removed 去重）；`applyUpdate` 同步 `nodeById`（含子树与 group 自身）；type 变更处理（remove+rebuild）。
- `scada-canvas.tsx`/`use-scada-handles.ts`/`use-scada-config-sync.ts`：importConfig 汇入 props-config 同步链（更新 `prevRef` 或走统一 reset 通道）。
- 回归测试：3 组（diff type-change、diff 后新声明生效、import-then-edit 幂等）。

### Out Of Scope

- 绑定值合并/点表 value 保留（open-audit P2 `reloadBindings` wipe）→ roadmap Follow-up Backlog。
- `onBuilt` 语义/ready 双发（P1-3）→ plan `{2}`（本 Plan Phase 3 触发的 onBuilt 必须遵循 plan `{2}` 的 change 基准守卫，见 Phase 3 说明）。

## Failure Paths

| 可测场景编号     | 触发                                  | 行为（含状态码/错误码）                                                                                  | 可重试 | 用户可见表现                  |
| ---------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------ | ----------------------------- |
| diff-type-change | props config 中同 id 图元 type 变更   | diff 产出 removed+added；`applyDiff` 先销毁旧图元再按新 type 构建，树中无残留                            | 是     | 图元按新形状渲染，无重复残留  |
| diff-decl-sync   | diff 更新某图元 `states`/`animations` | `getSymbolDeclarations` 返回新声明；新状态/动画生效，旧状态停止                                          | 是     | 设备故障色/动画随 diff 更新   |
| import-then-edit | importConfig 后再改 props config      | 基线已同步；diff 不把 import 图元当 added 重建；onBuilt 不因空 diff 重跑重复触发（遵守 plan `{2}` 守卫） | 是     | 无重复渲染，status 恢复 ready |

## Test Strategy

本档选择：**必须自动化**（核心回归路径 —— props 变更 diff 是 `design-renderer.md §4.3` 承诺的增量更新机制，public contract drift）。Proof 项在 Fix 项之前（TDD 序）。

## Execution Plan

### Phase 1 - Diff 生成契约修正（type 变更 + children 移除）

Status: completed
Targets: `packages/flux-renderers-industrial/src/serialization/diff.ts`, `src/serialization/serialization.test.ts`（`diffScadaConfig` describe 块，平铺同位）

- Item Types: `Fix | Proof`
- [x] `Proof` — 先写失败用例：同 id type 变更 → 断言 diff 含 removed+added 且无 updated（当前实现产出空 patch 直接失败）；children→undefined → 断言 patch.children 为 `[]`（当前实现产出 `children: undefined` patch 失败）。
- [x] `Fix` — `diffScadaConfig`：对 `next` 中与 `prev` 同 id 但 `type` 不同的图元，不产出 `updated` patch，改产出 `removed`（旧 id）+ `added`（新节点），保证 `applyDiff` 走 remove+rebuild 路径。子图元 type 变更无需在 diff 层递归：`children` 为深比较，整段 children patch 由 `applyUpdate` 的 children 分支重建子树时按新 type 构建（Phase 2）。
- [x] `Fix` — `diffScadaConfig`：`children` 差异为 `undefined`（group 变叶子或删除子树）时产出显式 `children: []` patch，使 `applyUpdate:125` 走"移除全部子树"分支而非被 `!== undefined` 守卫跳过。
- [x] `Proof` — 常规字段 diff 行为不回退（现有 `diffScadaConfig` 用例全绿）。

Exit Criteria:

- [x] `serialization.test.ts` 新增用例通过：type-change 与 children-removal 两条行为按上述语义成立，现有 diff 用例无回归。
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck` 通过（局部验证，仅保证后续 Phase 依赖的类型面）。

### Phase 2 - ConfigAdapter 收敛索引与声明（applyDiff 顺序 + nodeById 同步）

Status: completed
Targets: `packages/flux-renderers-industrial/src/engine/config-adapter.ts`, `src/engine/config-adapter.test.ts`

- Item Types: `Fix | Proof`
- [x] `Proof` — 先写失败用例：同 id type 变更经 applyDiff 后，树中无旧节点残留、`getNode(id)` 返回新节点（当前 add-before-remove 顺序下失败）；diff 更新某图元 `states`/`animations` 后 `engine.getSymbolDeclarations(id)` 返回新声明（当前 nodeById 不更新失败）。
- [x] `Fix` — `applyDiff` 处理顺序改为 `removed → added → updated`（或对 added∩removed 的同 id 做 remove-then-rebuild 去重），保证 type 变更场景旧节点先销毁、新节点后构建，`registry`/`nodeById` 与树三者一致。
- [x] `Fix` — `applyUpdate`：children 分支现有"先移除旧子树再按新 children 重建"逻辑保留，补充 `nodeById.set(id, 新节点对象)`（group 自身 + 重建后的子树由 `buildNode` 注册）；非 children patch 也刷新 `nodeById.set(id, 最新节点对象)`（applyDiff 传入新 config 后，从新 config 取对应节点）。
- [x] `Fix` — `applyDiff` 结束时用**新 config** 校准所有 `updated`/`added` id 的 `nodeById`。plumbing 提示：`scada-engine.ts:297-299` 的 `applyDiff(diff, nextConfig)` 已把 nextConfig 传入并 `setConfig(config)`，执行者在现有链路延伸即可（`applyUpdate` 需要新节点对象时从 nextConfig 取），避免另起通道。
- [x] `Proof` — 现有 `config-adapter.test.ts` 全绿（含 children 索引同步既有用例），新增用例覆盖"非 children updated id"与"声明（states/animations）"两个缺口。

Exit Criteria:

- [x] `config-adapter.test.ts` 通过：applyDiff 后 `getNode`/`getSymbolDeclarations` 返回新 config 对应节点（至少 states/animations 两条断言），type-change 场景无残留。
- [x] 局部 typecheck 通过。

### Phase 3 - importConfig 汇入 props 同步链（基线统一）

Status: completed
Targets: `src/renderer/scada-canvas.tsx`, `src/renderer/hooks/use-scada-config-sync.ts`, `src/renderer/hooks/use-scada-handles.ts`, `src/renderer/scada-canvas-lifecycle.test.tsx`, `src/renderer/scada-handles.test.tsx`

- Item Types: `Fix | Decision | Proof`
- [x] `Proof` — 先写失败用例：importConfig → 改 props config（移动一个既有图元，**编辑对象必须源自 import 场景**——即新 props config 需包含 import 引入的 id，否则对过期 prevRef 只产生 updated patch、测不出重复）→ 断言场景树无重复节点、`data-status` 恢复 `ready`（当前 prevRef 过期导致重复，失败）；importConfig 立即生效且**持久**断言（树节点数 = import config 图元数，且 effect 重跑沉降后 import 不被 props 回刷）。
- [x] `Decision` — import 持久性机制（防 effect 重跑回刷）：importConfig 会经 `reloadBindings → setRuntime(新对象)` 触发 `useScadaConfigSync` effect 重跑（deps `[config, runtime, reloadBindings]`，use-scada-config-sync.ts:121）；若重跑时用 prevRef=imported config 对 props config 算 diff，非空 diff 会把树刷回 props config——import 变 no-op 闪回。机制：`useScadaConfigSync` 暴露命令式 `syncImported(config)`：置 `prevRef.current = config` + 置 skip-next 标记（本次 self-induced 重跑直接 return，不碰树）+ `engine.reset(config)` + `reloadBindings` + onBuilt（change 基准守卫，遵守 plan `{2}` Phase 2 语义）。skip-next 标记仅吞掉同一次提交内的 setRuntime 重跑；其后 props 变更照常从 imported 基线 diff。
- [x] `Fix` — 按 Decision 落地：`useScadaConfigSync` 新增 `syncImported` 出口（含 skip-next 与基线更新）；`scada-canvas.tsx` `reloadConfig` 从直接 `engine.reset` 改为调用 `syncImported`（`use-scada-handles.ts` 句柄签名不变）。
- [x] `Proof` — 确认 import 路径后 props 再变更时：diff 基线 = import 后的 config，不把 import 图元当 added 重建（Phase 2 的 nodeById 收敛保证树无残留）；同提交内 setRuntime 重跑不回刷。

Exit Criteria:

- [x] 回归测试通过：import-then-edit 场景树无重复、status ready；importConfig 立即生效且持久（effect 重跑沉降后不被 props 回刷）。
- [x] 包内全量测试 `pnpm --filter @nop-chaos/flux-renderers-industrial test` 通过（本 Plan 三个 Phase 的 focused 验证收口）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立 fresh-session 子 agent ×3（R1 `ses_034ef9d65ffe5A8pqJ0YTnVUM7`、R2 `ses_034e46dc5ffe2OKJxkoI8aECsc`、R3 `ses_034dce29bffeiMd7mM1oWuKFxW`）
- Verdict: `pass`（R3；R1 `fail` 1 Major + 6 Minor，R2 `fail` 1 Major + 1 Minor，均已修正）
- Rounds: 3
- Findings addressed: R1-M1 applyDiff add-before-remove 顺序击败 type-change fix → Phase 2 新增 removed→added 顺序/去重 Fix；R1-M2 getStates/getAnimations 注入位引用修正（use-scada-engine.ts:53-54 + dirty-collector.ts:293/:326）；R1-M3 测试路径修正为平铺同位文件（无 `__tests__/`）；R1-M4 baseline 覆盖声明收窄（config-adapter.test.ts:228-260 已有 children 索引用例）；R1-M5 移除"递归遍历 children"误导（children 深比较走 applyUpdate 子树分支）；R1-M6 跨 plan ready 双发 → Phase 3 明示遵守 plan `{2}` change 基准守卫；R2-M1 import 持久性机制缺失（setRuntime effect 重跑会非空 diff 回刷 import）→ Phase 3 新增 `Decision`（syncImported + skip-next 一次性标记 + prevRef 更新 + change 守卫 onBuilt）；R2-m1 nextConfig plumbing 引用补全（scada-engine.ts:297-299）。R3 仅 4 Minor（Proof 场景辨析、skip-next 同提交竞态、props-wins 契约表述、applyDiff nextConfig 顺序提示）——已采纳其中 Proof 场景辨析与 applyDiff 顺序提示，其余为记录级提示不阻塞。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复：P1-4（nodeById 过期）、P1-5（importConfig 双写源）、open P1-C（diff type-drop、children 残留）——按 Phase 1-3 行为语义在 live repo 验证
- [x] 相关 public contract 无意外变更（`importConfig` 句柄签名不变；diff 输出形状变化仅限 type/children 两场景，有测试固化）
- [x] 3 组回归测试（diff type-change / diff 后声明生效 / import-then-edit 幂等）全绿并入库
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] `docs/components/industrial-hmi/design-renderer.md` §4.3 diff 语义如因实现修正产生契约文字变化，已同步；否则 No owner-doc update required
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

- 无。本 Plan 内所有 P1 均为 in-scope `Fix` 项，无 deferred 项。

## Non-Blocking Follow-ups

- 不适用——所有条目均在 in-scope 内；关联 P2（diff 相关点表 value 保留等）已在 roadmap-industrial-hmi.md `## Follow-up Backlog` 登记。

## Closure

Status Note: 三 Phase 全部落地并逐项勾选；closure-audit（独立 fresh-session 子 agent，task `ses_034cbb95cffeWQKu1Ckcf1Noye`）判定 `approved`（live 复核源码 + 测试 + workspace 门禁，无 interface-vs-semantics gap、无静默降级、执行者未自审勾选 audit 项）；workspace 全量验证 typecheck 32/32、build 32/32、lint 32/32、test 59/59（包级 468/34）全绿。审计状态不回写（audits 为 {1}/{2}/{3} 三 plan 共享，plan `{2}`/`{3}` 未执行）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session 子 agent（task `ses_034cbb95cffeWQKu1Ckcf1Noye`，输入仅 task plan + diff summary + verification output）
- Evidence: 判定 `approved`——live 复核 5 个源码文件 + 4 个测试文件与 Phase 1-3 语义逐项吻合（diff.ts type-change/children、config-adapter 顺序/nodeById 校准、use-scada-config-sync skip-next 身份守卫 + change 基准 onBuilt、scada-canvas reloadConfig → syncImported、use-scada-handles 未动）；重跑包级 468/34 与 workspace 门禁全绿；无静默降级（P2 入 roadmap backlog、audits 保持 planned 符合 scope 拆分）；执行者未自审勾选 audit 项。

Follow-up:

- 无 remaining plan-owned work；关联 P1 收口衔接：`docs/plans/2026-08-04-1235-2-hmi-lifecycle-wiring-plan.md`（ready 生命周期恰一次依赖本 Plan 已落地的 change 基准守卫）、`docs/plans/2026-08-04-1235-3-hmi-display-math-manifest-plan.md`。
