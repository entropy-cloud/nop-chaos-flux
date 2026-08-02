# C1.2 basic 结构扩展族逐组件审计（fragment/loop/recurse/reaction/scope-debug/dynamic-renderer）

> Plan Status: completed
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

Status: completed
Targets: `packages/flux-renderers-basic/src/{fragment,loop,structural-loop,recurse,reaction,scope-debug,dynamic-renderer}.tsx`、`basic-renderer-definitions.ts`、`schemas.ts`、`docs/audits/per-component/`

- Item Types: `Proof`

- [x] 审计前核对注册定义：6 组件注册项（type/defaultSchema/fields）与 `schemas.ts` 类型一致性（维度 1/18）；loop 与 structural-loop 的关系与归属（注册为准：structural-loop 为非注册共享引擎，`structural-loop.tsx:126` renderStructuralLoop + `resolveLoopBindings`，归属以 loop/recurse 注册项为准）。
- [x] 逐组件产出审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），裁决留痕。
- [x] 维度重点核查：loop/recurse 行 scope（维度 3/12）：行身份（instancePath repeated frame）、行内值所有权三态（buildSlotBindings + itemData structuralFields + 保留绑定保护）、嵌套行 action args 不污染（region child scope 机制核对 + Phase 3 真机复验）；dynamic-renderer autoLoad 异步生命周期（维度 11）：abort/竞态/stale-clear/失败态/refresh 重试；reaction 事件订阅与 payload 形状（维度 7）+ 订阅清理（维度 15）；fragment 无 DOM 容器语义（维度 5/13）；scope-debug 展开/折叠与 a11y（维度 8）+ 文档缺口（维度 17，无 design.md 事实确认，裁决建议：行为完整 → 补写）。
- [x] 嵌套 schema 分类复验（维度 6）：reaction actions（编译期 artifact）、dynamic-renderer body/loadAction（prop + schemaValidator）、loop items/body params 与 08-02 机制一致；无 deepFields 残留。
- [x] 四态覆盖（维度 10）与测试质量（维度 16）：既有单测断言正确行为（basic-structural/basic-reactions/basic-dynamic-renderer/scope-debug.test 等）、四态/错误路径覆盖、DOM 契约断言（data-slot/data-loading/data-error）核对。
- [x] 文档对照（维度 17）：5 个有 design.md 的组件 ↔ 实现 props/行为核对（发现 flux-guide/07-structural-nodes.md §Recurse 示例 body 声明与实现不符）；scope-debug 缺口裁决：补写（行为完整，见 Phase 2）。

Exit Criteria:

> 本 Phase 交付 6 张审计卡（含裁决），是后续修复的唯一事实来源。

- [x] `docs/audits/per-component/{fragment,loop,recurse,reaction,scope-debug,dynamic-renderer}.md` 6 张卡存在，18 维表完整、`文件:行` 证据可验证。
- [x] 每卡发现清单带 P0/P1/P2/P3 裁决；scope-debug 文档缺口已记录裁决建议（补写 design.md）。

### Phase 2 - P0/P1 自动修复（test-first）

Status: completed
Targets: 发现涉及的 renderer 文件、定义文件、schemas.ts、契约测试文件、e2e spec

- Item Types: `Fix | Proof | Decision`

- [x] 按审计卡逐个处理 P0/P1：**本族审计未发现 P0/P1**（loop/recurse 行 scope 机制与 08-02 structuralFields/region child scope 一致；dynamic-renderer 异步管线已完整；reaction 订阅/清理契约完整）——无 P0/P1 修复项，卡内逐项留痕；P2 低成本项全部当场修复（test-first：renderer-contract-smoke.test.ts 追加断言先红后绿，2 failed → 455 passed）。
- [x] P2 低成本（约 15 分钟内）当场修复：reaction 定义补 `dependsOn` fields + defaultSchema；recurse/dynamic-renderer 补 defaultSchema；flux-guide/07-structural-nodes.md §Recurse 示例修正（去除错误的 body 声明）；scope-debug 补写 design.md + example.json + index.md 条目；flux-guide/flux-types 再生成（catch-up 到 live baseline，含 dependsOn）。其余 P2 无。
- [x] 共性缺陷裁决（Decision）：缺 `defaultSchema` 为同一根因影响 3 组件（recurse/reaction/dynamic-renderer）→ 按 roadmap §7b 当前 plan 内修复 + 事后回写 **CX-3**（planned，引用本 plan 为执行证据）；无根因在公共层的跨包发现。
- [x] 修复后卡内发现标 `fixed` + commit/plan 引用；卡状态流转 `open → fixed-pending-closure`（reaction/scope-debug/dynamic-renderer 三卡；fragment/loop/recurse 无 P0/P1 直接 `closed`）。
- [x] 复杂/跨包 bug 修复按 AGENTS.md Bug Fix Test Coverage Rule 记录到 `docs/bugs/`：**本族无复杂/跨包 bug**（修复均为单包注册项/文档变更，不适用）。
- [x] scope-debug 文档缺口裁决落地：**补写** `docs/components/scope-debug/design.md`（+ example.json + index.md 条目）——组件行为完整（title/defaultExpand/dataPaths/sanitize/折叠订阅均有实现与 focused 测试），不归 CR。

Exit Criteria:

> 本 Phase 交付"发现清零或已裁定"，卡状态与代码行为一致。

- [x] 全部 P0/P1 已修复（卡内标 `fixed` + 证据）或已显式裁定延期（仅允许依赖未落地跨 plan 机制者，标「机制落地后复验」并登记）；无静默跳过。（本族无 P0/P1；P2 全部当场修复；P3 卡内记录。）
- [x] 受影响包 `pnpm --filter @nop-chaos/flux-renderers-basic typecheck && build && lint && test` 绿（455 tests，含新增回归断言）；workspace typecheck/lint 31/31、build 31/31。

### Phase 3 - 组合宿主真实浏览器场景

Status: completed
Targets: `tests/e2e/component-lab/` 新增/修改 spec、playground lab 页

- Item Types: `Proof | Fix`

- [x] 设计并实现 ≥1 个本族真实浏览器组合宿主场景（programmatic DOM 断言）：新增 `tests/e2e/component-lab/c1-2-host-surfaces.spec.ts` **3 用例全绿**——(1) loop 行内 action/dialog 提交（行 scope 不污染，bug 73/行污染模式）；(2) dynamic-renderer loadAction 失败 → renderer-owned 错误态（`[data-error]` 壳内诊断，页面不崩）；(3) recurse 深层结构（6 层真机渲染无栈溢出）+ maxDepth 截断（Level 2 不渲染）。配套 lab 场景：loop-lab-page 新增 row-edit 场景（探针 `window.__loopRowEditProbe`）、dynamic-renderer-lab-page 新增 failing-load 场景、recurse-lab-page 新增 deep/maxDepth 场景。
- [x] 行 scope 专项检查：针对 bug 73/行污染模式，验证 loop 行内嵌套 action args 提交正确——行 A 提交 `{rowId:'row-a', rowName:'Alice', nick:'N1-Alice'}`、行 B 提交 `{rowId:'row-b', rowName:'Bob', nick:'N2-Bob'}`，dialog 标题逐行求值（'Edit Alice'/'Edit Bob'），**无跨行污染 → pass**（08-02 plan-1 dropdown-button 修复的同类风险在 loop 行内复验通过）。
- [x] 宿主场景发现的新缺陷按 Phase 2 流程修复（test-first）：**无产品缺陷发现**（动态错误态断言初始因浏览器 zh-CN locale 文案 '错误:' 导致断言字符串不匹配——测试侧修正为 locale 无关断言 'Request failed (status=500)'；recurse 断言初始命中 scope-debug JSON 文本（strict mode violation）——测试侧改为 `.nop-text` 作用域定位器，均为测试侧修正，非产品缺陷）。
- [x] 既有相关 e2e（action-logic/navigation/layout-content/smoke + exploratory keyboard-focus-and-teardown scope-debug 用例）在本族改动后回归：**88/88 全绿**。

Exit Criteria:

> 本 Phase 交付"真实浏览器行为成立"。

- [x] 宿主场景 spec 通过（Playwright，programmatic DOM 断言）；本族改动回归 spec 绿（c1-2-host-surfaces 3/3 + 相关回归 88/88）。
- [x] 行 scope 专项检查结论记录于 daily log（pass，见 `docs/logs/2026/08-02.md` C1.2 记录）。

### Phase 4 - 族内回归与审计卡 closure

Status: completed
Targets: 6 张审计卡、`docs/logs/2026/08-02.md`、`docs/backlog/component-audit-roadmap.md`（C1.2 行）

- Item Types: `Proof`

- [x] 全卡复查：18 维表结论与最终代码一致（defaultSchema/dependsOn 补入后 D1 结论与代码一致）；P0/P1 清零（本族无 P0/P1，P2 全部当场修复，P3 卡内记录）；卡状态全部 `closed`（fragment/loop/recurse 直闭；reaction/scope-debug/dynamic-renderer 经 fixed-pending-closure → closed）。
- [x] 本族范围回归：`pnpm --filter @nop-chaos/flux-renderers-basic test` 455 全绿 + 相关 e2e（c1-2-host-surfaces 3/3、action-logic/layout-content/navigation/smoke/exploratory 88/88）全绿；触及公共层（无——修复均为 basic 包注册项 + 文档 + flux-guide 生成类型），未追加其他包验证（flux-guide 生成类型经 workspace typecheck/lint 覆盖）。
- [x] daily log 记录：6 卡 closure 汇总、修复清单（commit/plan 引用）、宿主场景结果（行 scope 专项 pass）、CX-3 插入（planned，事后回写）与决策、scope-debug 文档缺口裁决（补写 design.md）。
- [x] 若插入 CX-n：**CX-3 已插入**（planned，引用本 plan 为执行证据，roadmap §7b 事后回写形态，父 plan closure-audit pass 后一并标 done，不走 §7c 完整生命周期）；非结构性（纯注册项补齐），无需人工确认。
- [x] roadmap C1.2 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审）。

Exit Criteria:

> 本 Phase 交付"可进入 closure-audit 的完成态"。

- [x] 6 张审计卡全部 `closed`；`docs/audits/per-component/` 汇总可读。
- [x] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置）。

## Draft Review Record

- Reviewer / Agent: 独立子 agent fresh session（task `ses_03d3862e2fferRZviQ7hV4hx2n`，两轮 review）
- Verdict: `pass`
- Rounds: 2
- Findings addressed: R1 Major-1 已处理（组件路径 `src/renderers/` → 平铺 `src/`，Baseline 与 Phase 1 Targets 已修正）；R2 确认无新 Blocker/Major。

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。

- [x] 6 张审计卡存在、18 维表完整、P0/P1 清零、全部 `closed`
- [x] 全部 in-scope P0/P1 已 test-first 修复并有回归测试；无被静默降级到 deferred 的 live defect/contract drift（本族无 P0/P1；P2 全部当场修复并有回归断言；P3 卡内记录）
- [x] ≥1 个真实浏览器组合宿主场景通过（含行 scope 专项检查——loop 行内 dialog 提交 payload 逐行正确，bug 73/行污染模式复验 pass）
- [x] 共性缺陷已按 §7 处理（CX-3 插入 planned，§7b 事后回写；决策记录在卡与 daily log）
- [x] scope-debug 文档缺口已裁决（补 design.md + example.json + index.md 条目），受影响的 owner docs 已同步到 live baseline
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（task `ses_03cad223cffeto4wjWEHA5fHaC`，verdict `approved`，见 Closure 节）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

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

Status Note: 已完成 —— 四 Phase 全部执行并勾选（18 维审计 6 卡 / P2 自动修复（test-first，本族无 P0/P1）/ 组合宿主真机场景 3 用例含行 scope 专项 / 族内回归与卡 closure）。6 卡 `closed`、P0/P1 清零、CX-3 事后回写（planned）、宿主 e2e 3/3、回归 88/88、full e2e 777 passed / 43 skipped / 9 failed（9 项与 C0 基线逐项一致，属 ai/scheduling/content 包，本族外，watch-only residual）、workspace typecheck/build/lint 31/31 + test 58/58 全绿。独立 closure audit 通过（见下），roadmap C1.2 已标 `done`。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session（task `ses_03cad223cffeto4wjWEHA5fHaC`）
- Evidence: verdict `approved`（2 Minor 非阻塞：卡内个别行号引用偏移、diff-summary 措辞）；live-repo 复核全部 6 卡 18 维表与 `文件:行` 证据（~20 处抽查）、Phase 勾选与 Exit Criteria 文本一致性、代码修复落点（defaultSchema :117/:348/:412、dependsOn :420）、宿主 spec 3 用例断言、scope-debug design.md、flux-guide Recurse 示例、roadmap CX-3 行、deferred 分类诚实性，并亲自重跑 unit 455/455、e2e c1-2 3/3、回归 action-logic+layout-content 28/28、workspace typecheck 31/31。2 Minor 已处理（卡内行号引用已重同步；Minor-2 为报告措辞非仓库问题）。证据另见 `docs/logs/2026/08-02.md` C1.2 收口记录。

Follow-up:

- CX-3（planned）：父 plan closure 后由 mission-driver 按 roadmap §7b 标 `done`（纯注册项补齐，无需人工确认）。
- 卡内 P2 backlog：无（全部当场修复）；P3 仅卡内记录。
- no remaining plan-owned work。
