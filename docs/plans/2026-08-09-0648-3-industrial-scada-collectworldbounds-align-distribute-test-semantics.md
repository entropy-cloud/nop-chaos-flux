# N3 Industrial SCADA collectWorldBounds 假绿测试修复 + align-distribute 坐标语义裁定

> Plan Status: active
> Last Reviewed: 2026-08-09
> Source: `docs/backlog/industrial-hmi-component-audit-roadmap.md` Follow-up Backlog（P2-5 / 本轮-12，源 audit `docs/audits/2026-08-08-1712-open-audit-industrial-hmi-component-audit.md:312` 与 `:303` 本轮 P2 簇）
> Related: `docs/plans/2026-08-08-0900-2-industrial-hmi-editor-p2-test-fidelity-docs-drift-remediation.md`（#5 align-distribute group-relative 收敛 watch-only residual 来源）；`docs/plans/2026-08-09-0648-1-industrial-scada-design-doc-file-tree-references.md`（N=1 doc 轮）；`docs/plans/2026-08-09-0648-2-industrial-scada-editor-i18n-polish.md`（N=2 i18n 轮）
> Mission: industrial-hmi-component-audit

## Purpose

收口两个测试保真度/坐标语义 finding：① 修复 `collectWorldBounds` 父偏移累加的假绿测试（fixture 父 group 置于原点，使累加逻辑无论对错都通过）；② 裁定并记录 align-distribute 对 group 子节点的坐标语义（局部 vs world），确认 M3 扁平算法的接受状态并同步 owner doc。两者同属编辑器「测试保真 + 坐标语义」结果面。

## Current Baseline

live 仓库现状（2026-08-09 核对）：

- **P2-5 假绿** `src/editor/editor-working-helpers.test.ts:105-111`：用例 `collectWorldBounds accumulates parent offset for group children` 用 `configWithCustom`，其中父 group `g1` 位于 `x:0, y:0`（注释 `:108`「j2 is child of g1 (x:0,y:0)」）。父偏移为 0 → 子节点 world == local，**累加逻辑无论正确与否都断言通过**（false-green）。同型 fixture 见 `src/editor/connection/connection-adapter.test.ts:33-42`（per finding）。
- **本轮-12** `src/editor/toolbox/align-distribute.ts:5-6` docstring **已显式声明**：「M3 采用扁平算法（T1 接受）：不解析 group 嵌套相对坐标，按图元顶层 bounds（x/y/width/height）计算」。`align-distribute.test.ts:159-184` 已有 `alignSelection group-relative convergence recheck` describe 块，明文记录 M3 局部坐标限制（`:175-184` 注释「group child coordinates are parent-relative … documented M3 flat-algorithm, T1 trade-off」）。
- owner doc `docs/components/industrial-hmi-editor/design-toolbox.md §4.2.1` 描述对齐/分布算法，但**未显式记录**「不解析 group 嵌套相对坐标 / M3 扁平算法 / 局部坐标」限制（与代码 docstring + 测试注释存在表述 gap）。
- 前序：plan `2026-08-08-0900-2` 已将 align-distribute group-relative 列为 `watch-only residual`（#5），本轮确认该裁定并补 owner doc 表述，不改行为。

## Goals

- P2-5：`collectWorldBounds` 父偏移累加有**真正能区分对错**的 focused 测试（fixture 父 group 非零偏移，断言子节点 world = local + 父偏移）。
- 本轮-12：align-distribute 坐标语义裁定为「M3 接受局部坐标扁平算法」（与既有 docstring/测试一致），并在 owner doc `design-toolbox.md §4.2.1` 显式记录该限制，消除 doc↔code 表述 gap。
- 无行为变更（本轮-12 维持 watch-only residual；P2-5 仅测试加强）。

## Non-Goals

- 不改 `collectWorldBounds` / `alignSelection` / `distributeSelection` 的实现行为（仅测/文档）。
- 不把 align-distribute 从「局部坐标扁平算法」升级为「world 坐标解析」（M3/T1 已接受局部语义；升级属未来 feature，非本轮）。
- 不处理 P2-9/P2-10/P2-11（doc，归 N=1）、P2-6/P2-7（i18n，归 N=2）。
- 不重写已 completed 的 plan `2026-08-08-0900-2`（#5 watch-only 裁定有效，本轮仅补 owner doc 表述）。

## Scope

### In Scope

- `src/editor/editor-working-helpers.test.ts`（P2-5 假绿修复）
- `src/editor/connection/connection-adapter.test.ts`（P2-5 同型 fixture 加强，per finding）
- `docs/components/industrial-hmi-editor/design-toolbox.md` §4.2.1（本轮-12 owner doc 表述同步）
- `src/editor/toolbox/align-distribute.test.ts`（确认/微调收敛测试表述，若 owner doc 同步后测试注释需对齐）

### Out Of Scope

- `editor-working-helpers.ts` / `align-distribute.ts` 实现逻辑（不改）。
- world 坐标解析升级（未来 feature）。
- `collectWorldBounds` 在 runtime 侧的其他调用点测试（非编辑器 scope）。

## Test Strategy

本档选择：`建议有测`

理由：P2-5 本身是测试保真度修复（Proof 为主）；本轮-12 是 Decision + owner-doc。无新生产代码路径，但需断言结果值的真测试。

## Execution Plan

### Phase 1 - collectWorldBounds 假绿测试修复（P2-5）

Status: planned
Targets: `src/editor/editor-working-helpers.test.ts`、`src/editor/connection/connection-adapter.test.ts`

- Item Types: `Proof`

- [ ] `editor-working-helpers.test.ts:105-111`：fixture 将父 group `g1` 置于非零偏移（如 `x:100, y:50`），断言子节点 `j2` world = local(5,5) + 父偏移 → (105,55)；保留 `collectAllSymbols` 递归断言不受影响
- [ ] failing-first 验证：临时破坏 `collectWorldBounds` 父偏移累加（注释掉累加行），确认新断言**失败**（证明测试能区分对错）；恢复后通过
- [ ] `connection/connection-adapter.test.ts:33-42` 同型 fixture 加强：父 group 非零偏移，断言子节点累加世界坐标（若该处确为同型 false-green；执行时核对，非则记录为无需改）

Exit Criteria:

- [ ] `collectWorldBounds` 测试 fixture 父 group 非零偏移，断言 world = local + 父偏移（真断言，非 0+0）
- [ ] failing-first 验证记录于 plan/daily log（破坏累加 → 断言失败）
- [ ] industrial 包 focused 测通过：`pnpm --filter @nop-chaos/flux-renderers-industrial test`

### Phase 2 - align-distribute 坐标语义裁定 + owner doc 同步（本轮-12）

Status: planned
Targets: `docs/components/industrial-hmi-editor/design-toolbox.md` §4.2.1、`src/editor/toolbox/align-distribute.test.ts`

- Item Types: `Decision | Fix`

- [ ] Decision：确认 align-distribute 维持「M3 局部坐标扁平算法 / T1 接受」裁定（与既有 docstring + 测试注释一致），不升级为 world 解析；理由记录于本 plan
- [ ] `design-toolbox.md §4.2.1` 增一段显式声明：align/distribute 按图元顶层 bounds（局部 x/y）计算，不解析 group 嵌套相对坐标（M3 扁平算法，T1 trade-off）；与 `align-distribute.ts:5-6` docstring + `align-distribute.test.ts:175-184` 注释口径一致
- [ ] 核对 `align-distribute.test.ts` 收敛测试表述与 owner doc 同步后无矛盾（若 doc 措辞变更需测试注释对齐，则一并改；不改测试断言行为）

Exit Criteria:

- [ ] `design-toolbox.md §4.2.1` 显式记录「不解析 group 嵌套相对坐标 / M3 局部坐标」限制（grep 可定位关键词）
- [ ] owner doc 表述与 `align-distribute.ts` docstring + `align-distribute.test.ts` 注释三处口径一致，无矛盾
- [ ] 本轮-12 维持 watch-only residual（无行为变更），裁定理由记录于 plan

## Draft Review Record

- Reviewer / Agent: 独立子 agent fresh session `ses_01c6c28a3ffeWcrDe236G3rGo3`
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 0 Blocker / 0 Major / 3 Minor（M1 P2-5 源 audit 文件名 multi vs open 待执行时核对；M2 docstring 行号 5-6 vs 5-7 off-by-one；M3 connection-adapter.test 同型 false-green 执行时预决——均为 cosmetic/honest hedge，不阻塞）。关键验证：P2-5 false-green 真实成立（fixture g1 x:0/y:0 → 累加为 0）；本轮-12 已在 code docstring + 测试注释裁定，仅 owner doc 缺表述（doc gap 真实）；Anti-Slacking OK（Deferred 分类诚实）。

## Closure Gates

- [ ] `collectWorldBounds` 测试父偏移非零、断言 world=local+offset，failing-first 证据已记录
- [ ] `design-toolbox.md §4.2.1` 显式记录 M3 局部坐标扁平算法限制，与 code docstring + 测试注释三处一致
- [ ] 无生产代码行为变更（本轮-12 维持 watch-only；P2-5 仅测试）
- [ ] 无 in-scope live defect 被静默降级
- [ ] 受影响 owner doc（design-toolbox.md §4.2.1）已同步到 live baseline
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### align-distribute world 坐标解析升级

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: M3/T1 已接受局部坐标扁平算法（docstring + 测试注释 + 本 plan Phase 2 owner doc 三处记录）；world 解析属未来 feature，非当前 contract 缺陷。
- Successor Required: `no`（未来若需 world 解析，由新 feature plan 驱动）

## Non-Blocking Follow-ups

- 无（或明确写：no remaining plan-owned work beyond above）

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<或者明确写 no remaining plan-owned work>>
