# 464 Three.js 集成 I1.1 设计共识审查计划

> Plan Status: active
> Last Reviewed: 2026-09-13
> Source: `docs/backlog/threejs-integration-roadmap.md`（I1.1）、`docs/components/threejs-integration/design.md`（v4）、`docs/analysis/threejs-integration-analysis.md` §7–§8（plan 463 产出）
> Related: 前置 plan 463（I0.1 调研，closed）；后续 I2.1/I2.2/I3.1/I4.1 以本计划产出的 v5 文档集为 owner doc

## Purpose

把设计文档 v4 经 3 轮独立 sub-agent 共识审查修订为可实施的 **v5 设计文档集**：确认 Flux 表达式桥接方案与工业协议集成方案，修正 I0.1 发现的全部 API 不匹配，消除文档超重（72 KB → 拆分为聚焦文档集）。产出物是 I2/I3/I4 四个 execution plan 的唯一设计契约。

## Current Baseline

- 设计 v4（`docs/components/threejs-integration/design.md`，72 KB，2323 行）已超出仓库 50 KB 拆分线（AGENTS.md：docs 40 KB 内、50 KB 必拆）。同仓先例 `docs/components/industrial-hmi/`（与 `-editor/`）采用**纯分册**结构（design-engine/design-renderer/design-data-binding/design-symbols.md，无总览文件）。v5 采用「design.md 总览（架构 + 决策记录 + 索引）+ 分册」是在先例上的新结构选择：总览承载裁定记录，分册承载各方案契约。
- plan 463（I0.1）已在调研文档 §8.1 固化 v4 API 用法核对表，10 条中 2 ❌（#1/#3）、2 ⚠️（#2/#7）、6 ✅：
  - ❌ #1 `formulaCompiler.compileExpression()` 产物喂 `evaluateWithState` 类型不匹配（`CompiledExpression` ≠ `DynamicRuntimeValue`，`compiled-value-types.ts:19-24,117-128`）；live 证明路径是 `compileValue()` + `evaluateValue()`（`use-scada-points-bridge.ts:357-367`）。
  - ❌ #3 `GLTFLoader.loadAsync` 第 4 参 AbortSignal 不存在（three 0.186 `Loader.js:91` 仅 `(url, onProgress)`）。
  - ⚠️ #2 v4 的 `extractExpressionDepsViaProbe` 实现劣于 industrial live 版（宽容 Proxy probe scope、五态判别）。
  - ⚠️ #7 v4 将 events 注册为 `kind: 'prop'`，理由"避免违反 compiler 约束"未指明出处；平台标准是 `kind: 'event'` → `props.events`（`renderer-core.ts:268`，`contract-honesty.ts:446` 校验）。
- 调研文档 §8.2 固化两项待裁定分歧：(a) R3F vs 裸 Three.js；(b) 新建 `flux-renderers-3d` vs 扩展 industrial。
- 调研文档 §7.3 勘误：industrial 包内无 `openSocket` 调用；socket 契约在 `flux-core/src/types/renderer-api.ts:136-167`（同步返回 + `onmessage` 属性赋值 + capability check），host 实现在 `apps/playground/src/env/socket-impl.ts`。
- roadmap I1 已知工作项定义：设计 v4 共识审查（3 轮 sub-agent，超限升级人工）、Flux 表达式桥接方案确认、工业协议集成方案确认。
- 当前验证基线（2026-09-13）：typecheck/build/lint 39/39、test 72 任务 12,185 passed / 0 failed、check exit 0。

## Goals

- 产出 v5 设计文档集（`docs/components/threejs-integration/` 下拆分为 design.md 总览 + design-renderer.md + design-data-binding.md + design-protocol.md + design-ai-generation.md），每册 ≤ 40 KB，全部 API 引用与 live 契约一致。
- 两项方案确认落地为文档最终态：表达式桥接（compileValue/evaluateValue 路径 + `analyzeBindingSubscriptions` 对齐 industrial `analyzeFluxSubscriptions` 模式）与工业协议（`RendererEnv.openSocket` 契约 + capability check + ReconnectionManager 指数退避 + 抖动）。
- 两项分歧裁定记录决策与理由：(a) 渲染技术路线；(b) 包落点。
- 3 轮独立 sub-agent 共识审查完成，每轮 findings 与处理结果留痕。

## Non-Goals

- 不写任何 `packages/` 实现代码（I2.1 起）。
- 不改 roadmap 结构/优先级（AI 无权重排 work item）。
- 不产出 AI 提示模板终稿与 Gemini API 集成细节实现级规范（I4.1 计划内细化，v5 只定接口面）。
- 不修改 `flux-core`/`flux-react` 公共契约（若审查发现需要平台能力扩展，记录为 I2.x 的 Decision 项，不在本计划实现）。

## Scope

### In Scope

- `docs/components/threejs-integration/` 下 v5 文档集创作（v4 单文件拆分 + 全量修订）。
- 3 轮独立 sub-agent 共识审查（每轮 fresh session，findings 留痕于 plan）。
- roadmap I1 状态同步；daily log 记录。

### Out Of Scope

- 任何代码、测试、playground 改动。

## Failure Paths

不适用：纯文档计划，无运行时错误面。审查超限（3 轮后仍有 Blocker/Major 未收敛）时按 roadmap 规则升级人工，plan 记录升级点后保持 active。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：不适用——纯文档（docs/ 下）计划，无行为变更；proof 是 3 轮审查记录 + 文档与 live repo 的一致性抽查。

## Execution Plan

### Phase 1 - v5 设计文档集起草

Status: planned
Targets: `docs/components/threejs-integration/`

- Item Types: `Fix | Decision`

- [ ] 裁定分歧 (a) 渲染技术路线并写入 design.md 决策节（含理由与被拒替代方案）。
- [ ] 裁定分歧 (b) 包落点并写入 design.md（含包结构、依赖声明、与 `vite.workspace-alias.ts`/`tsconfig.base.json`/root `tsconfig.json` project references 的接入清单——仅文档记录，不改配置）。
- [ ] 修正 v4 全部 ❌ 项：表达式编译路径改 `compileValue()`/`evaluateValue()`；`loadAsync` 取消语义改 generation-guard；`extractExpressionDepsViaProbe` 按 industrial live 语义（宽容 Proxy scope + 五态判别）描述。
- [ ] 裁定 events 处理（v4 `kind: 'prop'` vs 平台 `kind: 'event'`）并修订 renderer definition 章节。
- [ ] 表达式桥接方案定稿（design-data-binding.md）：`analyzeBindingSubscriptions` 对齐 `analyzeFluxSubscriptions`（仅认 `${expr}`、纯路径直取、复杂表达式 probe、deps-empty 嫌疑上报）、编译缓存随 config 清空、pendingUpdates 缓存 + rAF flush 合帧、错误去重上报。
- [ ] 工业协议方案定稿（design-protocol.md）：`openSocket` capability check、同步返回、`onmessage` 属性赋值、ReconnectionManager（指数退避 + ±25% 抖动 + maxRetries + reset 语义）、tag→scope 写入路径。
- [ ] v4 单文件拆分为五册，每册头部标注版本 v5 与状态，design.md 保留总览 + 架构图 + 决策记录 + 分册索引；v4 的历史迭代叙事不迁入（符合 owner doc 只写最终态原则）。

Exit Criteria:

- [ ] 五册文档存在于 `docs/components/threejs-integration/`，单册 ≤ 40 KB，互相引用闭合（无断链）。
- [ ] §8.1 核对表 10 条在 v5 中逐条可追溯（2 ❌ + 2 ⚠️ 各有对应修正文本；6 ✅ 无回归）。
- [ ] 两项分歧的裁定节包含「决策 + 理由 + 被拒替代方案 + live 证据引用」。

### Phase 2 - 3 轮独立 sub-agent 共识审查

Status: planned
Targets: `docs/plans/464-threejs-i1-design-review-plan.md`（审查记录在本 plan 的 Review Rounds 节）

- Item Types: `Proof | Fix`

- [ ] Round 1：fresh sub-agent 按 guide 四项（可想象性分析/格式完整性/内容稳健性/引用准确性；对设计文档，「内容稳健性」含方案与 live 契约的一致性）审查 v5 文档集，产出 findings；起草者修订。
- [ ] Round 2：fresh sub-agent 复审（重点：上轮 Blocker/Major 是否真修复 + 新 gap）；起草者修订。
- [ ] Round 3：fresh sub-agent 终审（零 Blocker/Major 判定）；如仍有 Blocker/Major 未收敛，按 roadmap 规则升级人工并在 plan 记录。
- [ ] 每轮审查 verdict、findings 摘要、处理结果记录于本 plan「Review Rounds」节。

Exit Criteria:

- [ ] 3 轮审查记录完整（轮次/agent/verdict/findings→处理映射）。
- [ ] 终审轮 verdict 为零 Blocker / 零 Major（或已记录升级人工）。

### Phase 3 - 收尾同步

Status: planned
Targets: `docs/backlog/threejs-integration-roadmap.md`, `docs/logs/<实际完成日>.md`

- Item Types: `Proof`

- [ ] 核对 roadmap I1 状态与本 plan 生命周期一致（`planned` 已在 draft review 通过时置位，见 Draft Review Record；closure audit 通过时由收尾环节置 `done`，见 Closure 节）。
- [ ] roadmap I2.1/I2.2/I3.1/I4.1 四行「设计文档」列由 v4 单文件改指 v5 文档集对应分册。
- [ ] 实际完成日的 daily log（`docs/logs/YYYY/MM-DD.md`）记录 v5 定稿与审查结论。

Exit Criteria:

- [ ] roadmap Phase Status / Work Items 表 / 设计文档列与本 plan 及 v5 文档集一致；daily log 含审查轮次与结论。

## Review Rounds

> Phase 2 执行时填写。

## Draft Review Record

> 由独立子 agent（fresh session）填写。

- Reviewer / Agent: independent sub-agent（general-purpose fresh session）
- Verdict: `pass-with-minors`（R1 fail 0B/3M/4Minor → 修订；R2 定向复核 revised 0B/1M/1Minor → 再修订；R2 报告确认两处为一行修订、修后即达成共识，无需第三轮整审）
- Rounds: 2
- Findings addressed: M1 §8.1 计数改 2❌+2⚠️+6✅（09-13 daily log 同源错误已实际更正入库，R2 复核确认）；M2 industrial-hmi 先例改「纯分册、无总览」，v5 总览为新结构选择，40KB 目标改引 AGENTS.md 规则；M3 roadmap `todo→planned` 移至本 plan 升 active 时执行、Phase 3 改为一致性核对 + I2–I4 设计文档列同步、Closure 节注明 `planned→done` 时点；Minor-1 Closure Gates 增独立 `pnpm check:docs-garbled`；Minor-2 Phase 3 log 目标改「实际完成日」；Minor-3 审查维度对齐 guide 原词；Minor-4 verdict 词表改用 guide 词表；R2 Major-1 daily log 更正落盘、R2 Minor-5 Phase 3 Targets 去 09-13 硬编码。

## Closure Gates

> 纯文档计划（仅 `docs/` 变更）：按 plan guide 模板说明删除 `pnpm typecheck`/`build`/`test` 条目；保留 `pnpm lint`（lint 链含 check-active-doc-code-anchors 文档锚点门禁）、`pnpm check` 与 `pnpm check:docs-garbled`（独立 script，文档乱码门禁——对纯文档计划最相关）。

- [ ] Phase 1–3 全部 Exit Criteria 勾选完毕
- [ ] v5 文档集与 live repo 契约一致（审查终审确认）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [ ] 受影响的 owner docs 已同步（v5 文档集即 owner doc；roadmap 已同步）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm lint`
- [ ] `pnpm check` 零新增 red hit
- [ ] `pnpm check:docs-garbled`

## Deferred But Adjudicated

### AI 提示模板终稿与 Gemini API 集成规范

- Classification: `out-of-scope improvement`（I4.1 的计划内细化项）
- Why Not Blocking Closure: v5 只需冻结 AI 生成接口面（JSON Schema + 验证器契约）；提示词工程与具体 API 集成属 I4.1 execution plan 范围，不阻塞 I2/I3 实施。
- Successor Required: `yes`
- Successor Path: I4.1 计划（roadmap I4.1）

## Non-Blocking Follow-ups

- 无

## Closure

> closure audit 通过时，收尾环节同步 roadmap I1 `planned` → `done`（roadmap Rule：不得提前标 done）。

Status Note: 待关闭时填写

Closure Audit Evidence:

- Auditor / Agent: 待 closure audit
- Evidence: 待定

Follow-up:

- I4.1 细化 AI 提示模板与 Gemini 集成规范（见 Deferred）
