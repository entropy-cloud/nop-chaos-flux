# 02 Industrial HMI Test Fidelity / False-Green Elimination（2026-08-05-2129 audit P2 子集）

> Plan Status: active
> Mission: industrial-hmi
> Work Item: 2026-08-05-2129 post-remediation audit P2（test-fidelity 子集）
> Last Reviewed: 2026-08-06
> Source: `docs/audits/2026-08-05-2129-multi-audit-industrial-hmi.md` `[P2-12]`/`[P2-13]`/`[P2-14]`/`[P2-15]`（dim 23/14 test effectiveness），登记于 `docs/components/roadmap-industrial-hmi.md` Follow-up Backlog「2026-08-05-2129 post-remediation audit P2」子节
> Related: `docs/plans/2026-08-05-2129-1-industrial-hmi-expression-unification.md`（P2-12/P2-13 漂移的根因——I18 表达式一元化迁移测试）、`docs/plans/2026-08-05-2129-3-industrial-hmi-audit-p1-remediations.md`（同轮 P1 收口）

## Purpose

把 2026-08-05-2129 multi-audit 登记的 4 条 **test-fidelity P2**（dim 23/14）收口到「测试断言结果值/可观测行为，而非 `not.toThrow()` 或验一等价副本」。

共同缺陷模式：测试**标题声称验证 X**，但**断言的是无关点 / 弱 `not.toThrow()` / 内联的等价副本**，使得被测行为退化时测试仍绿（false-green）——CI 绿不反映真实行为，未来回归会被静默放过。这 4 条均落在 `packages/flux-renderers-industrial` 测试套件，互不物理耦合，但共享同一收口判据（false-green 消除 + 断言结果值）。

**本计划仅改测试（false-green 消除），不改产品运行时行为、不改源码、不改 warn 文案。**

## Current Baseline

> 起草前已逐条核对 live repo（2026-08-06），下列事实均经测试文件源码实测确认。

- **multi P2-12 已确认 live**：`packages/flux-renderers-industrial/src/serialization/expression-codemod.test.ts:25` 内联了一份 `migrateContent` 副本（注释 `:17` 自述「与 scripts/...的 patterns 同源」），但**缺 `QUOTED_DOLLAR_PATTERN`**（生产 `scripts/scada-expression-codemod.mjs:31` 有该 pattern；测试内联副本仅含 2 patterns，生产含 3）。即测试验的是 divergent 副本而非生产函数——生产 codemod 修改 patterns 时测试不会感知。注：该文件的 warn 文案断言（`:107/113/117`）与 `validate.ts` warn 消息（`:398/404/420/426`）已正确指向 `scada-expression-codemod.mjs`（draft 评审核对，无文件名漂移）；本条仅修「内联副本 → import 生产函数 + 补 QUOTED_DOLLAR_PATTERN 覆盖」。
- **multi P2-13 已确认 live**：`packages/flux-renderers-industrial/src/binding/binding-expression-unification.test.ts:459-473` 标题/注释声称验证 `?? ''` 兜底（point `blank`，声明 `source:'expression'` 但缺 `expression` 字段），但 `:473` 断言的是无关点 `expect(harness.pointStore.getPointValue('a')).toBe(1)`——`blank` **从未被断言**。即「`expression ?? ''` 空串兜底」分支被一条 test bless 为已覆盖，实际零断言。
- **multi P2-14 已确认 live**：`packages/flux-renderers-industrial/src/scada-canvas-smoke.test.tsx:35-52`（test 1，标题 "compiles and renders the real scada-canvas renderer with **scene build**"）仅断言 `handles.length > 0`（`:51`，等价 not.toThrow），**未断言图元入树**（rect-1）或 `data-status==='ready'`。空/失败场景构建会过（`renderFrames`/handles 满足即绿）。注：同文件 test 2（`:70`）已有 `data-status==='ready'`，但 test 1（"scene build"）无任何场景图断言；本条 residual 即给 test 1 补「rect-1 入树 + ready」断言（经 `window.__flux_scada_<cid>` 句柄 `getSymbol('rect-1')` 或 tree 查询 + root `data-status`）。
- **multi P2-15 已确认 live**：`packages/flux-renderers-industrial/src/binding/variables-optional-contract.test.ts:254`（"空 config（仅 version + symbols）：pipeline 仍可构造并 flushFrame"）唯一断言 `expect(() => pipeline.flushFrame(() => undefined)).not.toThrow()`——未验 `flushFrame` 返值（应 `false`，无脏块）或 `applyAttrs` 未被调。空 config 退化（误返 true / 误调 applyAttrs）会过。
- **包级机械健康**：`pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/lint/test` 全绿（2129-3 收口后基线 ~687 tests / 54 files）。本 plan 仅扩/改测试，不引入新源码模块。

## Goals

- **4 条 false-green 各配「断言结果值/可观测行为」的强化断言**：
  - P2-12：测试 import 生产 `migrateContent`（弃内联副本）+ 补 `QUOTED_DOLLAR_PATTERN` 覆盖用例（生产改 patterns 时测试感知）。
  - P2-13：补 `expect(pointStore.getPointValue('blank'))` 断言 `?? ''` 兜底实际产出（空串经 flux 求值的结果）。
  - P2-14：test 1 补「rect-1 入树 + `data-status==='ready'`」断言。
  - P2-15：补 `expect(pipeline.flushFrame(...)).toBe(false)` + `applyAttrs` mock 未被调断言。
- **false-green 防御**：每条修复同时确保「被测行为退化时测试转红」（failing-first 思路：先构造退化场景确认红，再固化正确断言）。

## Non-Goals

- 不改产品运行时行为/契约（仅 test 强化；不改错误码/语义/通道/源码）。
- 不重构 `analyzeFluxSubscriptions` / `evaluateFlux` / pipeline（归 sibling plan `2026-08-06-0746-3` 或后续）。
- 不处理同轮其余 P2（multi P2-1..P2-11、open P2-1..P2-10）。
- 不动 `scripts/scada-expression-codemod.mjs` 生产实现（它已是权威；本 plan 让测试对齐它）。
- 不动 `validate.ts` warn 文案（draft 评审核对：已正确指向 `scada-expression-codemod.mjs`，无漂移）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/serialization/expression-codemod.test.ts`（P2-12：import 生产函数 + 补 QUOTED_DOLLAR_PATTERN 用例）。
- `packages/flux-renderers-industrial/src/binding/binding-expression-unification.test.ts`（P2-13：补 `blank` 断言）。
- `packages/flux-renderers-industrial/src/scada-canvas-smoke.test.tsx`（P2-14：test 1 补场景图 + ready 断言）。
- `packages/flux-renderers-industrial/src/binding/variables-optional-contract.test.ts`（P2-15：补 flushFrame 返值 + applyAttrs 未调断言）。

### Out Of Scope

- 其余测试文件、`validate.ts`（warn 文案已正确）、生产源码运行时行为。
- `scripts/scada-expression-codemod.mjs`（权威生产函数，不改）。

## Test Strategy

档位选择：`建议有测`

本档选择：**建议有测**——本计划交付物本身即为测试强化（false-green 消除）。每条 Fix 的「验证」即被强化后的测试断言结果值（failing-first：退化场景转红、正确行为转绿）。无需额外 e2e；包级单测全绿 + 4 条断言经手验「退化转红」。

## Execution Plan

### Phase 1 - 四条 false-green 强化

Status: planned
Targets: `expression-codemod.test.ts`、`binding-expression-unification.test.ts`、`scada-canvas-smoke.test.tsx`、`variables-optional-contract.test.ts`

- Item Types: `Fix | Proof`

- [ ] **P2-12（codemod 等价副本 → 生产函数）**：`expression-codemod.test.ts` 删除内联 `migrateContent` 副本（`:21-` 区段），改为 `import { migrateContent } from '<workspace-root>/scripts/scada-expression-codemod.mjs'`（相对路径以实测为准）；新增一条用例覆盖 `QUOTED_DOLLAR_PATTERN`（如 `migrateContent("flux: '$analog.temp'")` 断言改写为 `${analog.temp}` 且 count>0），关闭「生产改 patterns 测试不感知」。**可行性注记**：生产脚本 top-level `import { readFileSync, writeFileSync } from 'node:fs'`（`scada-expression-codemod.mjs:22`），但 `migrateContent` 本体纯函数（fs 仅 `migrateFile` 用）；本包 vitest 为 node 兼容环境（`node:fs` 可解析），故跨 workspace 相对导入可行（旧注释 `:15-18`「无法跨 workspace 导入」为过虑）。**fallback**：若实测导入失败（如 vitest config 限制），退路为保留内联副本但 (a) 补齐 `QUOTED_DOLLAR_PATTERN` 达 parity + (b) 加一条「读生产 patterns 断言内联副本同步」守护测试（ divergence 即转红）。Proof：临时改坏生产 `QUOTED_DOLLAR_PATTERN` 确认新用例转红（failing-first），恢复后转绿。
- [ ] **P2-13（blank 兜底断言）**：`binding-expression-unification.test.ts:459-473` 在触发 `syncExpressionPoint('blank')` 后补 `expect(harness.pointStore.getPointValue('blank')).toBe(...)`（`expression ?? ''` 空串兜底经 flux 求值的实际产出，以 live 行为准——空串 `${}` 求值结果）。Proof：临时让 `?? ''` 兜底返非空串确认断言转红，恢复后转绿。
- [ ] **P2-14（scene build 真断言）**：`scada-canvas-smoke.test.tsx` test 1（`:35-52`）在 `handles.length>0` 之后补：经 `window.__flux_scada_<cid>` 句柄断言 `getSymbol('rect-1')` 为 truthy（图元入树）+ `root.getAttribute('data-status')==='ready'`。Proof：临时把 `validConfig.symbols` 清空确认 `getSymbol('rect-1')` 断言转红，恢复后转绿。
- [ ] **P2-15（空 config flushFrame 真断言）**：`variables-optional-contract.test.ts:242-254` 把 `not.toThrow()` 替换/补强为 `expect(pipeline.flushFrame(() => undefined)).toBe(false)`（无脏块返 false）+ 断言 `applyAttrs` mock（经 harness 注入）`not.toHaveBeenCalled()`。Proof：临时让 flushFrame 误返 true / 误调 applyAttrs 确认断言转红，恢复后转绿。

Exit Criteria:

> 本 Phase 交付 = 4 条 false-green 消除。只写本 Phase 真正交付的可观测结果 + 保证后续能继续的局部检查（plan guide Minimum Rule 18，全量验证归 Closure Gates）。

- [ ] 4 条被强化测试在「正确行为」下绿；每条均经手验「被测行为退化时转红」（failing-first 记录于 commit/proof）。
- [ ] `expression-codemod.test.ts` 不再含内联 `migrateContent` 副本，改为 import 生产函数；`QUOTED_DOLLAR_PATTERN` 有专属覆盖用例。
- [ ] 包级 `pnpm --filter @nop-chaos/flux-renderers-industrial test` 全绿（局部 typecheck 通过，证明 import .mjs 无类型/解析问题）。

## Draft Review Record

> 起草后、执行前的独立审查证据（plan guide `Plan Review Rule`）。由独立子 agent（fresh session）填写。

- Reviewer / Agent: independent fresh-session sub-agents（R1 `ses_02ba9622effeAPS0RMHDzWEOEA`、R2 `ses_02ba18b04ffebTfJ8DoqEhV5Dh`、R3 `ses_02b9e48f7ffe0WO6zI1LHSYSGz`）
- Verdict: `pass`（R3 共识轮零 Blocker / 零 Major）
- Rounds: 3（R1 `revise` → R2 `revise` 残留 → R3 `pass`）
- Findings addressed: R1 **Blocker**——移除凭空捏造的 `scada-ln.mjs`「附带发现」（live 实证 `validate.ts` warn + 测试断言均已正确指向 `scada-expression-codemod.mjs`，`rg scada-ln src/` 零命中），相应从 Goals/Non-Goals/Scope/Phase/Exit/Closure Gates 清除该 fabricated scope，P2-12 收窄为「import 生产函数 + 补 QUOTED_DOLLAR_PATTERN 覆盖」单一目标；R1 minor——P2-15 路径 `src/__tests__/` → `src/binding/`（live 实证）；R2 Major——Purpose 残留「codemod 文件名」措辞清除；R2 minor——P2-12 补 `node:fs` 跨 workspace 导入可行性注记 + parity fallback。参考准确性 4 条 false-green（P2-12/13/14/15）均经 live 核对。

## Closure Gates

- [ ] 4 条 false-green（P2-12/P2-13/P2-14/P2-15）均已强化为「断言结果值/可观测行为」，且各经 failing-first 验证（退化转红）。
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope 项。
- [ ] 受影响 owner doc：本计划为测试强化，无 design-\*.md 契约/行为变更（执行时复核确认）。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Non-Blocking Follow-ups

- 其余 2026-08-05-2129 P2（multi P2-1..P2-11、open P2-1..P2-10）归 sibling plan（`2026-08-06-0746-1` doc-drift / `2026-08-06-0746-3` diagnostic residual）或后续 mission 节奏。

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<明确写 no remaining plan-owned work，或记录 non-blocking follow-up>>
