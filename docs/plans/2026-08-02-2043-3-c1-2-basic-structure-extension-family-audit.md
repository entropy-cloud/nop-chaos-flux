# C1.2 basic 结构扩展族逐组件审计（fragment/loop/recurse/reaction/scope-debug/dynamic-renderer）

> Plan Status: active
> Mission: component-audit
> Work Item: C1.2
> Last Reviewed: 2026-08-02
> Source: `docs/backlog/component-audit-roadmap.md`（C1.x Phase Details）、`docs/audits/component-audit-checklist.md`（18 维 + 审计卡模板 + 自动修复纪律）、`docs/logs/2026/08-02.md`
> Related: 依赖 C0（`2026-08-02-2043-1`）完成后开工；与 C1.1（`2026-08-02-2043-2`）并行独立

## Purpose

对 `flux-renderers-basic` 结构扩展族 6 个注册组件（fragment/loop/recurse/reaction/scope-debug/dynamic-renderer）完成 18 维逐组件审计（每组件一张审计卡），P0/P1 缺陷在**同一 plan 内自动修复**（test-first），每族 ≥1 个真实浏览器组合宿主场景验证，6 张审计卡全部 `closed`。重点维度：loop/recurse 行 scope 正确性（嵌套行身份/值所有权）、dynamic-renderer autoLoad 与条件渲染生命周期、reaction 订阅与事件生命周期、fragment 无 DOM 容器契约、scope-debug 文档缺口（无 design.md，维度 17 记录）。

## Current Baseline

- **组件与文件**：6 组件均在 `packages/flux-renderers-basic/src/` 平铺目录（fragment.tsx、loop.tsx、structural-loop.tsx、recurse.tsx、reaction.tsx、scope-debug.tsx、dynamic-renderer.tsx；structural-loop 非注册 type，归属以注册为准）；注册定义 `basic-renderer-definitions.ts`（scope-debug `:307`、dynamic-renderer `:320`、reaction `:383`）；schema 类型 `schemas.ts`。
- **设计文档**：fragment/loop/recurse/reaction/dynamic-renderer 5 组件有 design.md（`docs/components/{fragment,loop,recurse,reaction,dynamic-renderer}/design.md`）；**scope-debug 无 design.md**（维度 17 预期记录文档缺口，由本 plan 裁决补写或归 CR）。
- **playground**：lab 页存在（fragment/loop/recurse/scope-debug/reaction/dynamic-renderer-lab-page.tsx，recurse 有 .test.tsx）。
- **e2e 既有覆盖**：`tests/e2e/component-lab/` 下 navigation.spec.ts、layout-content.spec.ts、action-logic.spec.ts、smoke.spec.ts 等可能覆盖 loop/reaction/dynamic-renderer 场景（执行时核对，缺口在 Phase 3 补宿主场景）。
- **相关机制已落地**：08-01 field-selector 契约；08-02 嵌套 schema 分类机制（region/action 语义、行 scope 不污染嵌套 action args）；08-02 plan-1 修复了 dropdown-button 行 scope 污染（loop 行内 action 属同类风险，需复验）。
- **基线**：以 C0 回写的基线为准（unit 0 失败；e2e pre-existing 9 属 ai/scheduling/content 包，不在本族）。

## Goals

- 6 张审计卡（`docs/audits/per-component/{fragment,loop,recurse,reaction,scope-debug,dynamic-renderer}.md`）18 维逐项核对完成，裁决留痕，`文件:行` 证据。
- 本族 P0/P1 全部 test-first 自动修复；P2 低成本当场修复，其余登记卡内 backlog 归 CR。
- ≥1 个真实浏览器组合宿主场景（programmatic DOM 断言）通过，含行 scope 嵌套场景（loop 行内 dialog/action，bug 73/行污染模式专项检查）。
- 6 张审计卡全部 `closed`；scope-debug 文档缺口完成裁决（补 design.md 或登记 CR）。
- 共性缺陷按 roadmap §7 主动处理（CX-n 插入或 plan 内多阶段优先修复）。

## Non-Goals

- 不审计 basic 包其余组件（C1.1/C1.3 覆盖：page/container/flex/tabs/dialog/drawer、text/button/badge/icon）。
- 不处理跨族公共层结构性重构（需人工确认）。
- 不修复 e2e pre-existing 9 失败。

## Scope

### In Scope

- 6 组件 × 18 维审计卡（维度重点：1 Schema 契约、2 RendererComponentProps 合规、3 值所有权三态（loop/recurse 行 scope）、5 DOM 选择器契约与 marker、6 嵌套 schema 分类 08-02 复验（reaction events/dynamic-renderer body/loop items）、7 事件与 action 契约、8 a11y（reaction 交互、scope-debug 展开）、10 四态覆盖（dynamic-renderer 空/加载/错误/禁用）、11 异步生命周期（dynamic-renderer autoLoad）、12 组合宿主场景、14 React 19、17 文档对照（scope-debug 缺口）、18 注册/包边界/IO 安全红线）。
- P0/P1 自动修复（test-first）+ P2 低成本即时修复。
- 真实浏览器宿主场景（loop 行内嵌套 action/dialog、dynamic-renderer 切换加载、recurse 深层结构）。
- 审计卡状态流转与 daily log 记录。

### Out Of Scope

- C1.1/C1.3 组件。
- checklist v2 修订（CG）。
- 结构性重构（需人工确认后另立 CX-n）。

## Failure Paths

| 可测场景编号          | 触发                           | 行为（含错误码）                                         | 可重试 | 用户可见表现              |
| --------------------- | ------------------------------ | -------------------------------------------------------- | ------ | ------------------------- |
| host-loop-row-scope   | loop 行内 action/dialog 提交   | 行 scope 求值正确、提交值不跨行污染（bug 73/行污染模式） | 是     | 每行独立提交结果正确      |
| host-dynamic-autoload | dynamic-renderer autoLoad 切换 | 加载态/错误态/空态渲染正确，无竞态残留                   | 是     | 加载指示 → 内容或错误提示 |
| host-reaction-event   | reaction 事件触发订阅路径      | 事件 payload 形状正确、订阅清理无泄漏                    | 是     | 目标节点按配置更新        |
| host-recurse-deep     | recurse 深层/循环结构          | 无死循环、无栈溢出、终止条件生效                         | 否     | 结构正常渲染              |

## Test Strategy

本档选择：**必须自动化** —— 行 scope 求值、autoLoad 异步生命周期、事件契约属核心回归路径（AGENTS.md 测试分层第一档）；契约/公共层修复必须 test-first。验证门禁：受影响包 `pnpm --filter @nop-chaos/flux-renderers-basic typecheck/build/lint/test` + 宿主场景 Playwright（programmatic DOM 断言）。

## Execution Plan

### Phase 1 - 逐组件 18 维审计与审计卡产出

Status: planned
Targets: `packages/flux-renderers-basic/src/{fragment,loop,structural-loop,recurse,reaction,scope-debug,dynamic-renderer}.tsx`、`basic-renderer-definitions.ts`、`schemas.ts`、`docs/audits/per-component/`

- Item Types: `Proof`

- [ ] 审计前核对注册定义：6 组件注册项（type/defaultSchema/fields）与 `schemas.ts` 类型一致性（维度 1/18）；loop 与 structural-loop 的关系与归属（注册为准）。
- [ ] 逐组件产出审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），裁决留痕。
- [ ] 维度重点核查：loop/recurse 行 scope（维度 3/12）：行身份、行内值所有权三态、嵌套行 action args 不污染；dynamic-renderer autoLoad 异步生命周期（维度 11）：abort/竞态/失败态/重试；reaction 事件订阅与 payload 形状（维度 7）+ 订阅清理（维度 15）；fragment 无 DOM 容器语义（维度 5/13）；scope-debug 展开/折叠与 a11y（维度 8）+ 文档缺口（维度 17，无 design.md 的事实确认与裁决建议）。
- [ ] 嵌套 schema 分类复验（维度 6）：reaction events/actions、dynamic-renderer body、loop items 与 08-02 机制一致；无 deepFields 残留。
- [ ] 四态覆盖（维度 10）与测试质量（维度 16）：既有单测断言正确行为、四态/错误路径覆盖、DOM 契约断言。
- [ ] 文档对照（维度 17）：5 个有 design.md 的组件 ↔ 实现 props/行为核对；scope-debug 缺口裁决（补写 vs 归 CR）。

Exit Criteria:

> 本 Phase 交付 6 张审计卡（含裁决），是后续修复的唯一事实来源。

- [ ] `docs/audits/per-component/{fragment,loop,recurse,reaction,scope-debug,dynamic-renderer}.md` 6 张卡存在，18 维表完整、`文件:行` 证据可验证。
- [ ] 每卡发现清单带 P0/P1/P2/P3 裁决；scope-debug 文档缺口已记录裁决建议。

### Phase 2 - P0/P1 自动修复（test-first）

Status: planned
Targets: 发现涉及的 renderer 文件、定义文件、schemas.ts、契约测试文件、e2e spec

- Item Types: `Fix | Proof | Decision`

- [ ] 按审计卡逐个处理 P0/P1：先写复现/回归测试（断言正确行为），再实现修复；DOM/选择器契约变更追加 focused 契约测试与 e2e（test-first 证据：复现测试先于实现 commit）。
- [ ] P2 低成本（约 15 分钟内）当场修复；其余登记卡内 backlog 归 CR。
- [ ] 共性缺陷裁决（Decision）：同一根因 ≥2 组件/跨包/公共层 → 按 roadmap §7 处理（plan 内多阶段优先修复并事后回写 CX-n，或插入 CX-n）；根因单点的 `shared:` 归 CR。
- [ ] 修复后卡内发现标 `fixed` + commit/plan 引用；卡状态流转 `open → fixing → fixed-pending-closure`。
- [ ] 复杂/跨包 bug 修复按 AGENTS.md Bug Fix Test Coverage Rule 记录到 `docs/bugs/`。
- [ ] scope-debug 文档缺口裁决落地：补写 `docs/components/scope-debug/design.md`（若组件行为完整）或登记 CR（若需行为澄清），裁决留痕。

Exit Criteria:

> 本 Phase 交付"发现清零或已裁定"，卡状态与代码行为一致。

- [ ] 全部 P0/P1 已修复（卡内标 `fixed` + 证据）或已显式裁定延期（仅允许依赖未落地跨 plan 机制者，标「机制落地后复验」并登记）；无静默跳过。
- [ ] 受影响包 `pnpm --filter @nop-chaos/flux-renderers-basic typecheck && build && lint && test` 绿（含新增回归测试）。

### Phase 3 - 组合宿主真实浏览器场景

Status: planned
Targets: `tests/e2e/component-lab/` 新增/修改 spec、playground lab 页

- Item Types: `Proof | Fix`

- [ ] 设计并实现 ≥1 个本族真实浏览器组合宿主场景（programmatic DOM 断言）：候选——loop 行内 action/dialog 提交（行 scope 不污染）、dynamic-renderer autoLoad 切换（加载/错误/空态）、recurse 深层结构渲染（按审计卡发现选择）。
- [ ] 行 scope 专项检查：针对 bug 73/行污染模式，验证 loop/recurse 行内嵌套 action args 提交正确（08-02 plan-1 修复的同类风险复验）。
- [ ] 宿主场景发现的新缺陷按 Phase 2 流程修复（test-first）。
- [ ] 既有相关 e2e（action-logic/navigation/layout-content）在本族改动后回归。

Exit Criteria:

> 本 Phase 交付"真实浏览器行为成立"。

- [ ] 宿主场景 spec 通过（Playwright，programmatic DOM 断言）；本族改动回归 spec 绿。
- [ ] 行 scope 专项检查结论记录于 daily log（pass 或带证据 fail→已修复）。

### Phase 4 - 族内回归与审计卡 closure

Status: planned
Targets: 6 张审计卡、`docs/logs/2026/08-02.md`、`docs/backlog/component-audit-roadmap.md`（C1.2 行）

- Item Types: `Proof`

- [ ] 全卡复查：18 维表结论与最终代码一致；P0/P1 清零；卡状态全部 `closed`。
- [ ] 本族范围回归：`pnpm --filter @nop-chaos/flux-renderers-basic test` + 相关 e2e spec 全绿；触及公共层时追加受影响包验证并记录。
- [ ] daily log 记录：6 卡 closure 汇总、修复清单、宿主场景结果、CX-n 插入（如有）与决策、scope-debug 文档缺口裁决。
- [ ] 若插入 CX-n：同步更新 roadmap Work Item Status 表并按 §7c 走生命周期；结构性 CX-n 执行前标注待人工确认。
- [ ] roadmap C1.2 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审）。

Exit Criteria:

> 本 Phase 交付"可进入 closure-audit 的完成态"。

- [ ] 6 张审计卡全部 `closed`；`docs/audits/per-component/` 汇总可读。
- [ ] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置）。

## Draft Review Record

- Reviewer / Agent: 独立子 agent fresh session（task `ses_03d3862e2fferRZviQ7hV4hx2n`，两轮 review）
- Verdict: `pass`
- Rounds: 2
- Findings addressed: R1 Major-1 已处理（组件路径 `src/renderers/` → 平铺 `src/`，Baseline 与 Phase 1 Targets 已修正）；R2 确认无新 Blocker/Major。

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。

- [ ] 6 张审计卡存在、18 维表完整、P0/P1 清零、全部 `closed`
- [ ] 全部 in-scope P0/P1 已 test-first 修复并有回归测试；无被静默降级到 deferred 的 live defect/contract drift
- [ ] ≥1 个真实浏览器组合宿主场景通过（含行 scope 专项检查）
- [ ] 共性缺陷已按 §7 处理（CX-n 插入/合并或当前 plan 内修复，决策记录在卡与 daily log）
- [ ] scope-debug 文档缺口已裁决（补 design.md 或登记 CR），受影响的 owner docs 已同步到 live baseline
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 各审计卡 P2 backlog（成本 >15 分钟的非阻断体验/文档/测试加固项）

- Classification: `optimization candidate`
- Why Not Blocking Closure: checklist §3 明确 P2 可入审计卡 backlog 由 CR 自动处理；不阻塞本族 supported baseline 成立。
- Successor Required: `yes`
- Successor Path: CR work item

### scope-debug 无 design.md（若裁决为归 CR 而非本 plan 补写）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 仅当组件行为需澄清（存在未定行为）时归 CR；若行为完整则本 plan 内补写，不进入此区。
- Successor Required: `yes`
- Successor Path: CR work item（文档对照补查）

## Non-Blocking Follow-ups

- 审计中裁定为 P3（风格 nit/注释）的项仅卡内记录。
- 工具脚本新增模式（若有）记入卡内，CG 统一升级。

## Closure

Status Note: 待执行

Closure Audit Evidence:

- Auditor / Agent: TBD
- Evidence: TBD

Follow-up:

- 待执行后填写（non-blocking 项仅记录于 Non-Blocking Follow-ups）。
