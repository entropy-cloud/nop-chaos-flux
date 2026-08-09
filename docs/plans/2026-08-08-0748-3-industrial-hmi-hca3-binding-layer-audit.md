# 03 Industrial HMI Component Audit — HCA3 Binding Layer（数据绑定管线 23 维包级深审 + 自动修复 + dirty-collector 拆分裁决）

> Plan Status: completed
> Last Reviewed: 2026-08-08
> Mission: industrial-hmi-component-audit
> Work Item: HCA3. Binding 层审计
> Source: `docs/backlog/industrial-hmi-component-audit-roadmap.md` §HCA3；包级深审 `docs/skills/deep-audit-prompts.md`（23 维，**复杂交互层 → 维度 21 显示与定位正确性 / 22 集成接线与可操作性 / 23 测试有效性与假绿 必选**）
> Related: HCA0（done，编排基线）、HCA2（N2 同批 plan，engine 层；binding 与 engine 的 flushFrame/订阅接合面由本 plan 交叉核验）、`docs/plans/2026-08-06-0900-3-industrial-hmi-engine-lifecycle-viewport-robustness.md`（completed，P2-1 动画/binding 优先级契约已文档化）、`docs/plans/2026-08-05-2129-1-industrial-hmi-expression-unification.md`（completed，binding 表达式一元化已收口）

## Purpose

对 `@nop-chaos/flux-renderers-industrial` 的 **binding 层**（7 文件，~1,700 行）做一次完整的 23 维包级深审（复杂交互层，维度 21-23 必选），把发现的 P0/P1 live defect 立即 test-first 修复，P2 低成本当场修复 / 否则入审计卡 backlog，并对 **`dirty-collector.ts` 665 行超 500 阈值** 给出拆分 Decision（本 plan 落地拆分 / 移交 HCA-CG），产出审计记录文件。binding 是 industrial 包的数据绑定管线核心（点表 / 反向索引 / 脏收集合帧 / 值→状态 / 动画时钟 / flux 求值），其正确性决定 SCADA 画面是否如实反映实时数据。

## Current Baseline

> 起草前已逐条核对 live repo（2026-08-08，`packages/flux-renderers-industrial/src/binding/`，行号对齐 HEAD）。

- **binding 7 文件 + 行数（`wc -l` 实测，与 roadmap §审计对象总览 一致）**：
  - `point-store.ts`（330）— `PointStore`（point value get/set + 监听器订阅 / 收集 / 通知）。
  - `reverse-index.ts`（126）— symbol→points 反向索引（绑定解析后预计算，支持 O(1) 解绑）。
  - `dirty-collector.ts`（665）— `RefreshPipeline`（collect / flushFrame / `collectBindings` / `evaluateFlux` / `reportError` / 订阅收集）。**665 行 > 500 WARN 阈值（`check:oversized-code-files` WARN 桶；脚本 `WARN_LINES=500` / `ERROR_LINES=700`，665 ≤ 700 故非 ERROR 桶；exit 1 来自 binding 目录之外 14 个 >700 行文件）**。
  - `value-to-state.ts`（59）— value→visual state 映射（阈值/范围 → 状态 key）。
  - `animator.ts`（269）— 动画时钟（rAF 驱动，per-property 增量 collect 到 dirty-collector）。
  - `bind-resolver.ts`（139）— 绑定解析（config bindings → point→symbol 绑定图）。
  - `flux-eval.ts`（111）— `evaluateFlux`（flux-runtime 薄包装 + 订阅收集）。
- **已收口的先验修复（构成基线，本 plan 不重做，仅 Phase 3 抽查回归）**：
  - P2-1 动画/binding 优先级契约文档化（binding/state 合帧 > animation 增量；animation 仅在无 binding 属性生效）+ focused 测试锁定（`dirty-collector.ts:270-273` precedence 注释 + `design-data-binding.md:130`）。
  - P2-4 evaluateFlux cause-chain 端到端保留（`dirty-collector.ts:382-406` `syncExpressionPoint` 透传 `outcome.error` + `:660-664` `reportError(key, code, message, error?)` 转发）。
  - binding 表达式一元化（2129-1，`@{}` 拒识 + `${expr}` 唯一语法）。
  - binding-expression scope 订阅并集（2129-3 multi P1-1，`use-scada-points-bridge.ts:105-132,243-249`）。
- **已知 governance 项（非 live defect，本 plan 内 Decision 裁定）**：`dirty-collector.ts` 665 行 > 500 WARN 阈值——roadmap §HCA3 / §HCA-CG 均标记「拆分评估」。本 plan 裁定：本 plan 内落地拆分（建议按职责切 collect / flushFrame / evaluateFlux / reportError 为独立模块，保持公共面 `RefreshPipeline` 不变，主文件拆后 < 500 行即出 WARN 桶）或移交 HCA-CG。
- **包级机械健康**：`pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/lint/test` 全绿；`check:oversized-code-files` 对 `dirty-collector.ts` 当前为 **WARN**（665 行，500<665≤700，非 ERROR 桶，不在 typecheck/lint/test 链路；脚本仅根 `pnpm check` 调用）。

## Goals

- 对 binding 7 文件逐文件完成 23 维包级深审（维度 21-23 必选），产出带 `文件:行` 证据的 finding 清单（P0/P1/P2/P3 triage）。
- 所有确认的 P0/P1 live defect test-first 修复（failing-first Proof 先于 Fix，断言结果值而非 not.toThrow）。
- P2 低成本当场修复并带回归测试；P2 高成本 / P3 入审计卡 backlog（归 HCA-CR）。
- 重点核验复杂交互正确性：脏收集合帧顺序（collect → collectBindings → flushFrame，last-write-wins per (symbolId,property)）、animation vs binding 同属性优先级（P2-1 契约成立 + 测试覆盖）、flux 求值订阅收集（订阅并集 + 解绑对称 + 无泄漏）、point-store 监听器清理（subscribe/unsubscribe 对称 + Store dispose）、animator rAF 生命周期（start/cancel 对称 + 无孤儿帧）。
- **`dirty-collector.ts` 665 行拆分 Decision**：本 plan 落地拆分（保持公共面不变 + 全量回归绿）或移交 HCA-CG 并写明 Why Not Blocking Closure。
- owner doc `docs/components/industrial-hmi/design-data-binding.md` 与 live baseline 一致性核对 + 必要同步。
- 产出审计记录文件 `docs/audits/2026-08-08-*-hca3-binding-layer.md`。

## Non-Goals

- 不审计 engine（HCA2）/ serialization（HCA4）/ symbols（HCA5/HCA6）/ renderer hooks（HCA1）。
- 不重做已收口的 P2-1 / P2-4 / 表达式一元化 / 订阅并集（仅 Phase 3 抽查回归）。
- 不改 animation/binding 优先级语义（P2-1 已裁定 binding/state > animation；本 plan 仅复核契约成立 + 测试覆盖，不改 precedence）。
- 不改 `evaluateFlux` 薄包装为平台深度集成（2129-1 follow-up 决策 ③ 已锁「保持薄包装现状」）。
- 不做 HCA-BL / HCA-LL 全量汇总——本 plan 仅产出本层 finding 喂入。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/binding/` 7 文件（见 Current Baseline 清单）。
- `dirty-collector.ts` 拆分（若 Decision = 本 plan 落地）：按职责切分为独立模块，`RefreshPipeline` 公共面不变。
- 审计记录 `docs/audits/2026-08-08-*-hca3-binding-layer.md`。
- owner doc `docs/components/industrial-hmi/design-data-binding.md`（仅当审计发现 drift 或拆分改变模块清单时同步）。
- 任一 P0/P1 fix 的 focused regression test。

### Out Of Scope

- `src/engine/`（HCA2）、`src/serialization/`（HCA4）、`src/symbols/`（HCA5/HCA6）、`src/renderer/`（HCA1）、`src/editor/`（HCA7-HCA11）。
- HCA-BL bug 卡片正式归档（本 plan finding 喂入，归档动作在 HCA-BL）。
- 非 dirty-collector 的文件行数治理（无其他超阈值项）。

## Test Strategy

本档选择：**必须自动化**

binding 是数据绑定管线核心 + 复杂交互层（合帧顺序 / 动画时钟 / flux 求值 / 订阅生命周期），属核心回归路径，且 dirty-collector 665 行拆分属结构重构（必须全量回归防行为漂移）。任何审计中确认的 P0/P1 live defect + 拆分动作按 roadmap 自动修复契约 **test-first**（failing-first Proof 项必须先于 Fix 项）。关键路径（合帧顺序、优先级、订阅清理对称、animator cancel、evaluateFlux cause-chain）必须有断言正确结果值的 focused test。

## Execution Plan

### Phase 1 - 逐文件 23 维包级深审（维度 21-23 必选）+ finding triage + dirty-collector 拆分 Decision

Status: completed
Targets: `packages/flux-renderers-industrial/src/binding/`（7 文件）、`docs/audits/2026-08-08-0748-hca3-binding-layer.md`

- Item Types: `Proof | Decision`

- [x] 逐文件过 `docs/skills/deep-audit-prompts.md` 23 维（**维度 21 显示与定位 / 22 集成接线 / 23 测试有效性 必选**），重点：脏收集合帧顺序（collect → collectBindings → flushFrame 确定性）、animation vs binding 同属性优先级（P2-1 契约复核 + 测试覆盖）、flux 求值订阅收集（并集 + 解绑对称 + 无泄漏）、point-store 监听器清理（subscribe/unsubscribe 对称 + dispose）、reverse-index 解析正确性 + 增量更新、value-to-state 阈值边界、animator rAF 生命周期（start/cancel 对称 + 无孤儿帧 + 无 binding 属性推进短路径）、bind-resolver 绑定图构建（空 / 重复 / 循环引用）。
- [x] 重点抽查边界值：空点表 / 单点 / 超大点表（10k+）/ NaN/Infinity 值 / 同属性 binding+animation 冲突 / 快速 setPoint 风暴 / dispose 后 setPoint / 订阅泄漏（多次 subscribe/unsubscribe）。
- [x] 产出 `docs/audits/2026-08-08-0748-hca3-binding-layer.md`：逐文件 finding 表 + 维度 21-23 专项节 + 每条 `文件:行` 证据。
- [x] **`dirty-collector.ts` 拆分 Decision**：基于 665 行职责分析，裁定「本 plan 落地拆分」（给出切分方案：collect / flushFrame / evaluateFlux / reportError 模块边界 + `RefreshPipeline` 公共面不变，主文件拆后 < 500 行出 WARN 桶）或「移交 HCA-CG」（写明 Why Not Blocking Closure）。倾向本 plan 落地（拆分是机械操作 + 全量回归可证无行为漂移；本 plan 深审会逐行过 dirty-collector，拆分同时提升可审计性，顺带把 WARN 桶清零；延后到 HCA-CG 也可接受，因 WARN 非硬门禁）。

Exit Criteria:

> 只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续的局部检查。

- [x] 审计记录文件存在，含 7 文件逐文件 finding 表 + 维度 21-23 专项节 + 每条 `文件:行` 证据经 live 核对。
- [x] 所有 finding 已 triage 为 P0/P1/P2/P3 之一（无未分类项）。
- [x] `dirty-collector.ts` 拆分 Decision 已记录（含切分方案或移交理由）。

### Phase 2 - P0/P1 自动修复（test-first，Proof 先于 Fix）+ P2 低成本修复

Status: completed
Targets: Phase 1 finding 中标 P0/P1 的源文件 + 对应 `*.test.ts`（审计结果：零 P0/P1）

- Item Types: `Proof | Fix`

- [x] 对每条 P0/P1 finding：**先写 failing-first focused test**（断言正确结果值 / 行为，非 not.toThrow / call-count），确认红，再修代码使转绿。（审计零 P0/P1 finding，无需 failing-first test）
- [x] P2 低成本（<~30 行 / 单文件 / 无公共面变更）当场修复并带回归测试；P2 高成本入审计卡 backlog（归 HCA-CR）。（P2-BND-1 文件行数治理为 Phase 3 拆分处置，非代码缺陷修复）
- [x] 每条 fix 在审计记录文件回写状态（fixed / recorded）+ fix 落点 `文件:行`。（审计记录 Finding Triage 汇总表已回写：零 P0/P1 + P2-BND-1 拆分 Decision = 本 plan 落地）

Exit Criteria:

- [x] 所有 P0/P1 finding 的 failing-first test 存在、确认过红、转绿（断言结果值）。（零 P0/P1 finding，N/A）
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/test` 全绿（包级局部验证）。（baseline 97 test files / 1307 tests 全绿，2026-08-08）
- [x] 审计记录 finding 状态已回写。

### Phase 3 - dirty-collector 拆分落地（若 Decision=落地）+ owner doc 同步 + 回归抽查 + bug 喂入

Status: completed
Targets: `packages/flux-renderers-industrial/src/binding/`（拆分后模块）、`docs/components/industrial-hmi/design-data-binding.md`、审计记录、HCA-BL 引用

- Item Types: `Fix | Proof | Follow-up`

- [x] 若 Phase 1 Decision = 落地：按切分方案拆分 `dirty-collector.ts`（`RefreshPipeline` 公共面不变，内部按 collect/flushFrame/evaluateFlux/reportError 切独立模块）；全量回归（`pnpm --filter @nop-chaos/flux-renderers-industrial test`）证无行为漂移；`wc -l` 实测拆分后各模块均 ≤ 500 行（dirty-collector 主文件出 WARN 桶）。（拆分落地：dirty-collector.ts 104 行 / expression-errors.ts 65 行 / refresh-pipeline.ts 469 行，均 ≤ 500；全量回归 97 test files / 1307 tests 全绿）
- [x] 若 Decision = 移交 HCA-CG：在 Deferred But Adjudicated 补条目（Classification: optimization candidate + Why Not Blocking Closure），Phase 3 跳过拆分。（N/A——Decision = 本 plan 落地）
- [x] 核对 `design-data-binding.md` 与 live binding 一致（模块清单 §11、合帧顺序、优先级契约 §4.3）；仅当发现 drift 或拆分改变模块清单时同步。（§11 模块清单已同步：7→9 文件，新增 expression-errors.ts + refresh-pipeline.ts）
- [x] 抽查先验修复回归（P2-1 优先级 / P2-4 cause-chain / 表达式一元化 / 订阅并集 行为仍成立）。（全量回归 1307 tests 全绿，含 P2-1 优先级三组 / P2-4 cycle onError / 表达式一元化全语法 / B3 stateSource / B4 scale 转发 focused 测试）
- [x] 把本层复杂 / 跨层 bug 候选汇总到审计记录「喂入 HCA-BL」节。（审计记录「喂入 HCA-BL」节已存在：零 bug 候选）

Exit Criteria:

- [x] 拆分 Decision 已执行（落地：`wc -l` 实测拆分后各模块 ≤ 500 行 + 全量回归绿；或移交：Deferred 条目已记录）。（dirty-collector.ts 104 / expression-errors.ts 65 / refresh-pipeline.ts 469，均 ≤ 500；97 test files / 1307 tests 全绿）
- [x] `design-data-binding.md` 经 rg/读核对待无 drift（或有同步 commit）。（§11 模块清单已同步拆分后 9 文件；合帧顺序 §4.3 / 优先级契约 §4.3 / 错误码 §9.1 / scale §4.2 / format §4.2 / stateSource §4.5 均一致）
- [x] 先验修复回归抽查通过。
- [x] HCA-BL 喂入节存在（含 bug 候选清单 + `文件:行`）。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立子 agent（fresh session）反复 review 直到共识后填写。

- Reviewer / Agent: 独立子 agent fresh session `ses_021564ad6ffeQI4TowAAD6kqMU`（R1）→ `ses_021516e0dffewi7jX6CVX3duYP`（R2）
- Verdict: `pass`
- Rounds: 2
- Findings addressed: R1 B-1（dirty-collector 665 行被误标为 `check:oversized-code-files` ERROR 桶 + "gate red" 误 urgency + Phase 3 exit criterion "binding 目录 0 失败" 空真；违反 Minimum Rule 1/13 + When Drafting 6-7）——已修正：脚本实为 `WARN_LINES=500`/`ERROR_LINES=700`，665 行属 WARN 桶（非 ERROR），exit 1 来自 binding 目录之外 14 个 >700 行文件；Phase 3 exit criterion 改为 repo-observable `wc -l 实测拆分后各模块 ≤ 500 行`；Closure Gate 同步。R1 Minor m-1（reportError 行号 656-659→660-664）已修正。R2 确认 B-1 已解决、零 Blocker/Major/Minor，live repo 全量复核通过。

## Closure Gates

> 全量 `pnpm typecheck/build/lint/test` 是 plan 收口时跑一次的仓库级检查（见 guide Minimum Rule 18）。

- [x] binding 7 文件逐文件深审完成（维度 21-23 必选），审计记录文件存在且 finding 全 triage。
- [x] 所有 in-scope 确认的 P0/P1 live defect 已 test-first 修复（failing-first proof 存在）。（零 P0/P1 finding，N/A）
- [x] `dirty-collector.ts` 拆分 Decision 已执行（落地：`wc -l` 实测主文件 < 500 行 + 全量回归绿；或诚实移交 HCA-CG + Why Not Blocking Closure）。（落地：dirty-collector.ts 104 / expression-errors.ts 65 / refresh-pipeline.ts 469，均 ≤ 500；1307 tests 全绿）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [x] owner doc `design-data-binding.md` 与 live baseline 一致（或明确无 drift）。（§11 模块清单已同步 9 文件；其余契约一致）
- [x] 必要 focused verification 已完成。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。（独立 closure auditor fresh session 复核：审计记录存在 + 拆分落地 `wc -l` dirty-collector.ts=104/expression-errors.ts=65/refresh-pipeline.ts=469 均 ≤ 500 + design-data-binding.md §11 9 文件已同步 + `pnpm --filter @nop-chaos/flux-renderers-industrial test` 97 files/1307 tests 全绿 + docs/logs/2026/08-08.md 收口记录存在；零 P0/P1 finding 诚实；deferred 仅 P2-BND-1 已落地非偷藏 defect）
- [x] `pnpm typecheck`（32/32 tasks successful）
- [x] `pnpm build`（32/32 tasks successful）
- [x] `pnpm lint`（32/32 tasks successful）
- [x] `pnpm test`（97 test files / 1307 tests passed）

## Deferred But Adjudicated

> Phase 1 Decision = 本 plan 落地拆分（非移交），本节 N/A。以下保留原始模板供审计追溯。

### dirty-collector.ts 665 行拆分（已落地，非移交）

- Classification: `optimization candidate`
- Resolution: **本 plan 落地**（Phase 3 已执行）——dirty-collector.ts 拆分为 dirty-collector.ts(104 行) + expression-errors.ts(65 行) + refresh-pipeline.ts(469 行)，各模块 ≤ 500 行，WARN 桶清零。
- Successor Required: no（已落地）

## Non-Blocking Follow-ups

- 本层 P2 高成本项归 HCA-CR 跨层集中修复。（本层零 P2 高成本项）
- binding 与 engine（HCA2）的 flushFrame/订阅接合面已由本 plan 交叉核验。

## Closure

Status Note: binding 层 7 文件 23 维包级深审完成（维度 21-23 必选），零 P0/P1 live defect——先验修复（P2-1 优先级 / P2-4 cause-chain / 表达式一元化 / 订阅并集 / B1-B4 系列）已扎实覆盖行为正确性。dirty-collector.ts 665 行拆分落地（3 文件均 ≤ 500 行，WARN 桶清零），全量回归 1307 tests 全绿证无行为漂移。owner doc §11 模块清单已同步。本 plan 可关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure auditor（fresh session，不复用执行者上下文）— closure-audit task `2026-08-08-074847-mission-driver`
- Evidence: 逐项复核 live repo：(1) 审计记录 `docs/audits/2026-08-08-0748-hca3-binding-layer.md` 存在，含 7 文件逐文件 finding 表 + 维度 21-23 专项节 + `文件:行` 证据；(2) 拆分落地 `wc -l` 实测 dirty-collector.ts=104 / expression-errors.ts=65 / refresh-pipeline.ts=469，均 ≤ 500 行；(3) `design-data-binding.md` §11 模块清单已同步 9 文件（新增 expression-errors.ts + refresh-pipeline.ts）；(4) `pnpm --filter @nop-chaos/flux-renderers-industrial test` 全绿（97 test files / 1307 tests）；(5) `docs/logs/2026/08-08.md` 收口记录存在。语义复核：零 P0/P1 finding 诚实（先验修复 P2-1/P2-4/表达式一元化/订阅并集/B1-B4 已扎实覆盖），拆分为真实内容非空壳（公共面 RefreshPipeline/DirtyCollector API 不变），deferred 仅 P2-BND-1 且已落地（非偷藏 live defect/contract drift）。五点一致性核对通过。

Follow-up:

- 无 confirmed live defect 残留；HCA-CG 可跳过 dirty-collector 行数治理（已落地）
