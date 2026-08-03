# C5.1 layout 网格与流程族逐组件审计（grid/collapse/wizard）

> Plan Status: active
> Mission: component-audit
> Work Item: C5.1
> Last Reviewed: 2026-08-04
> Source: `docs/backlog/component-audit-roadmap.md`（C5.x Phase Details）、`docs/audits/component-audit-checklist.md`（18 维 + 审计卡模板 + 自动修复纪律）、`docs/skills/deep-audit-prompts.md`、`docs/architecture/layout-selection-guide.md`、`docs/architecture/styling-system.md`（布局 renderer 仅 marker 类契约）、`docs/logs/2026/08-03.md`
> Related: 依赖 C0（`2026-08-02-2043-1`，completed）完成后开工；与 C4.2（`2026-08-04-0043-1`）/ C4.3（`2026-08-04-0043-2`）并行独立（均只依赖 C0）。前置基础：08-02 nested-schema 机制（completed）已分类 wizard steps items 的 title/body/actions region 与 value-or-region 语义（layout-renderer-definitions.ts 的 fieldRules）；08-02 params/isolate 迁移语义（`2026-08-02-2`，completed）——C5.x Phase Details 明确「params/isolate 迁移语义（08-02）」为审查重点

## Purpose

对 `flux-renderers-layout` 网格与流程族 3 个组件（grid/collapse/wizard）完成 18 维逐组件审计（每组件一张审计卡，P0/P1/P2/P3 裁决留痕），P0/P1 缺陷在**同一 plan 内自动修复**（test-first + 回归测试 + 受影响包验证门禁），每族完成 ≥1 个真实浏览器组合宿主场景验证（含 bug 73 模式专项检查），最终 3 张审计卡全部 `closed`（P0/P1 清零）。重点维度：3 值所有权三态（collapse 展开态 local/controlled/scope 三态、wizard stepIndex 交互态 vs commit 生命周期态分离）、4 表单参与（wizard 内嵌表单步进校验/提交）、5 DOM 契约（布局 renderer 仅 marker 类、data-current-step-index/data-testid 契约）、6 嵌套 schema 分类（wizard steps 内嵌 region/action、collapse items 08-02 机制复验）、7 事件与 action 契约（wizard beforeEnter/beforeLeave/onComplete、collapse 展开事件 payload）、12 组合宿主场景（dialog 内 wizard、collapse 嵌套表单、grid 响应式）、14 React 19。

## Current Baseline

- **组件与文件**：`grid-renderer.tsx`（156 行）、`collapse-renderer.tsx`（192 行）、`wizard-renderer.tsx`（734 行）+ `process-display-definitions.ts`（146 行，steps/timeline 属 C5.2，不在本 plan 审计范围）。
- **注册定义**：`layout-renderer-definitions.ts`（wizard `:11`、grid `:174`、collapse `:265`）；wizard steps 的 title/body/actions 已分类为 value-or-region/region（fieldRules，08-02 机制）；collapse items title/body region + value/valueOwnership propContracts（`valueOwnership` local/controlled/scope 声明于 `:311` 附近）。
- **设计文档**：`docs/components/{grid,collapse,wizard}/design.md` + `example.json` 存在（wizard 另有 `wizard-flux-vs-amis-analysis.md`）。
- **playground**：3 组件**无 component-lab lab 页**（grid/collapse/wizard 均无 `*-lab-page.tsx`，与 basic/form/data 各族不同——维度 18 注册完整性/playground 覆盖待核对）；demo 宿主在 `apps/playground/src/pages/w3a-w3b-layout-action-family-demo.tsx`（grid `:55`、collapse `:72`、`demo-grid`/`demo-collapse` testid）与 `w2a-data-composition-demo.tsx:140`（wizard，`demo-wizard` testid）。
- **既有单测**：`grid-renderer.test.tsx`（10 用例）、`collapse-renderer.test.tsx`（6 用例）、`wizard-renderer.test.tsx`（16 用例）+ `__tests__/contract-honesty.test.ts`、`wizard-boolean-literal-compile-through.test.ts`。
- **e2e**：`tests/e2e/m3-layout.spec.ts`、`w3a-w3b-layout-action-family.spec.ts`、`layout-family-enhancements.spec.ts`、`w2a-data-composition.spec.ts`（wizard 交互 `:64`）；本族无 `tests/e2e/component-lab/c5-1-host-surfaces.spec.ts`（需新增）。
- **基线**：以 C0 回写基线为准（unit 全绿 58/58；e2e pre-existing 项中本族无归属项——剩余项属 ai/scheduling/content 包，successor C8.1/C9/CV）。

## Goals

- 3 张审计卡（`docs/audits/per-component/{grid,collapse,wizard}.md`）18 维逐项核对，P0/P1/P2/P3 裁决留痕，`文件:行` 证据，全部 `closed`（P0/P1 清零）。
- 本族 P0/P1 缺陷 test-first 自动修复（契约/公共层修复 Must automate），P2 低成本当场修复、其余登记卡内 backlog 归 CR。
- ≥1 个真实浏览器组合宿主场景（含 bug 73 模式专项）：候选——wizard 步进校验/提交（dialog 内）、collapse 展开态 ownership 切换、grid 响应式/嵌套。
- roadmap C5.1 行标 `done`（独立子 agent closure-audit pass 后）。

## Non-Goals

- C5.2 layout 动作组族（button-group/dropdown-button/steps/timeline——steps/timeline 定义在 `process-display-definitions.ts`，仅 wizard 涉及 steps 语义处交叉核对，不审 C5.2 组件自身）。
- checklist v2 修订（CG）、审计工具脚本升级（CG）。
- 结构性重构（公共 API/包边界/编译期机制，需人工确认后另立 CX-n；纯行为修复不视为结构性）。
- 各审计卡 P2 backlog（>15 分钟项）归 CR 处理，不在本 plan 内实现。

## Scope

### In Scope

- 3 组件 × 18 维审计卡（维度重点：1 Schema 契约（GridSchema/CollapseSchema/WizardSchema 与注册 fields/validate 一致）、2 RendererComponentProps 合规、3 值所有权三态（collapse value/valueOwnership local/controlled/scope 全路径、wizard stepIndex 交互态 vs commit 生命周期态分离——**valueOwnership 三态分层是 C5.x 审查重点**）、4 表单参与（wizard 内嵌表单步进校验/onComplete 提交）、5 DOM 与选择器契约（**布局 renderer 仅 marker 类——grid/collapse/wizard 根只输出 marker 类，样式来自 schema（styling-system.md 契约）**、data-current-step-index/data-last-commit-status/data-testid 契约）、6 嵌套 schema 分类（wizard steps title/body/actions region + beforeEnter/beforeLeave event 分类、collapse items 08-02 机制复验、**params/isolate 迁移语义（08-02）审查**、无 deepFields 残留）、7 事件与 action 契约（wizard beforeEnter/beforeLeave/onComplete payload 形状、collapse 展开/折叠事件、grid 无事件语义核对）、8 a11y（collapse 按钮键盘路径/aria-expanded、wizard 步进导航焦点管理）、9 i18n（wizard 按钮文案 key）、10 四态覆盖（空/加载/错误/禁用——collapse 禁用项、wizard 步进禁用）、11 异步生命周期（wizard beforeEnter/beforeLeave 异步 gate）、12 组合宿主场景（dialog 内 wizard、collapse 嵌套表单/table、grid 嵌套、**bug 73 模式专项**）、13 样式契约（布局仅 marker、无 BEM、stack-_/hstack-_ 使用）、14 React 19、15 性能边界（wizard 步进切换重渲染、collapse 大量项）、16 测试质量（既有测试断言正确行为而非 not-throw、DOM 契约断言、错误路径）、17 文档对照（design.md ↔ 实现 props/行为——wizard-flux-vs-amis-analysis.md 核对）、18 注册/包边界/IO 安全红线（surface 双注册、**3 组件无 component-lab lab 页——维度 18 playground 覆盖缺口核查**））。
- P0/P1 自动修复（test-first）+ P2 低成本即时修复。
- 真实浏览器宿主场景（wizard 步进校验/提交、collapse 展开态、grid 嵌套响应式）。
- 审计卡状态流转（open → fixing → fixed-pending-closure → closed）与 daily log 记录。

### Out Of Scope

- C5.2 layout 动作组族（button-group/dropdown-button/steps/timeline）。
- checklist v2 修订（CG）。
- 结构性重构（需人工确认后另立 CX-n）。
- e2e pre-existing 剩余项（ai/scheduling/content 包，successor C8.1/C9/CV）。

## Failure Paths

| 可测场景编号       | 触发                              | 行为（含错误码）                                         | 可重试 | 用户可见表现         |
| ------------------ | --------------------------------- | -------------------------------------------------------- | ------ | -------------------- |
| host-wizard-step   | wizard 步进 Next/Back + 校验      | 步进切换正确、校验失败阻止前进、onComplete 提交正确      | 是     | 步骤/校验/提交正确   |
| host-wizard-gate   | beforeEnter/beforeLeave 异步 gate | 异步 gate 等待/拒绝语义正确、状态回显                    | 是     | 步进切换被 gate 控制 |
| host-collapse      | collapse 展开态切换（三态）       | local/controlled/scope 三态展开行为正确、事件 payload 对 | 是     | 面板展开/折叠正确    |
| host-grid          | grid 嵌套/响应式渲染              | 网格列布局正确、嵌套内容渲染正确、仅 marker 类           | 是     | 网格布局正确         |
| host-wizard-dialog | dialog 内 wizard 步进提交         | 组合宿主下步进/校验/提交正确（bug 73 模式专项）          | 是     | 组合宿主行为正确     |

## Test Strategy

本档选择：**必须自动化** —— wizard 是布局族核心交互回归路径（stepIndex 交互态 vs commit 生命周期态分离契约 + 内嵌表单校验/提交 + beforeEnter/beforeLeave 异步 gate），collapse valueOwnership 三态是 C5.x 审查重点；契约/公共层修复必须 test-first（先写失败测试再实现）。验证门禁：受影响包 `pnpm --filter @nop-chaos/flux-renderers-layout typecheck/build/lint/test` + 相关 e2e 回归（`m3-layout.spec.ts`、`w3a-w3b-layout-action-family.spec.ts`、`layout-family-enhancements.spec.ts`、`w2a-data-composition.spec.ts`）+ 本族新增宿主场景 Playwright（programmatic DOM 断言）。

## Execution Plan

### Phase 1 - 逐组件 18 维审计与审计卡产出

Status: planned
Targets: `packages/flux-renderers-layout/src/{grid,collapse,wizard}-renderer.tsx`、`layout-renderer-definitions.ts`、`schemas.ts`、`docs/audits/per-component/`

- Item Types: `Proof`

- [ ] 审计前核对注册定义：3 组件注册项（type/fields/propContracts/fieldRules）与各自 schema 一致（维度 1/18）；wizard steps fieldRules（title/body/actions value-or-region/region、beforeEnter/beforeLeave event）与 collapse items fieldRules（title/body region）08-02 机制核对。
- [ ] 产出 3 张审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），P0/P1/P2/P3 裁决留痕（checklist §3）。
- [ ] 维度重点核查：值所有权三态（维度 3：collapse valueOwnership local/controlled/scope 全路径——`collapse-renderer.tsx:42` ownership 读取与三态分支、wizard stepIndex 交互态 vs commit 生命周期态分离）；params/isolate 迁移语义（维度 6：08-02 机制在 wizard/collapse items 上的落地——`fieldRules` 的 params/isolate 声明与实际求值一致）。
- [ ] 事件与 action 契约（维度 7：wizard beforeEnter/beforeLeave/onComplete payload 形状与 dispatch、collapse 展开事件）与 a11y（维度 8：collapse 键盘路径/aria-expanded、wizard 步进焦点管理）。
- [ ] 异步生命周期（维度 11：wizard beforeEnter/beforeLeave 异步 gate——abort/竞态/失败态）与性能边界（维度 15：wizard 步进切换重渲染、collapse 大量项渲染）。
- [ ] 测试质量（维度 16）：既有 grid/collapse/wizard 测试断言正确行为而非 not-throw、DOM 契约断言、错误路径——假绿核查（含 `contract-honesty.test.ts` 覆盖项）。
- [ ] 文档对照（维度 17）：3 组件 design.md ↔ 实现 props/行为逐项核对；wizard-flux-vs-amis-analysis.md 与实现一致性；layout-selection-guide.md 对 grid 的定位（grid vs flex vs container 选择语义）。
- [ ] playground 覆盖核查（维度 18）：3 组件无 component-lab lab 页——记录缺口并裁决（补页或标记 P2/P3 归 CR/CG）。

Exit Criteria:

> 本 Phase 交付 3 张审计卡（含裁决），是后续修复的唯一事实来源。

- [ ] `docs/audits/per-component/{grid,collapse,wizard}.md` 卡存在，18 维表完整、`文件:行` 证据可验证。
- [ ] 卡内发现清单带 P0/P1/P2/P3 裁决；无 P0/P1 的卡标记 `closed`，否则 `open`；08-02 机制复验结论已记录。

### Phase 2 - P0/P1 自动修复（test-first）

Status: planned
Targets: 发现涉及的 renderer/子模块文件、schema 文件、契约测试文件、e2e spec

- Item Types: `Fix | Proof | Decision`

- [ ] 按审计卡处理 P0/P1：先写复现/回归测试（断言正确行为，非仅 not-throw），再实现修复；DOM/选择器契约变更追加 focused 契约测试与 e2e（test-first 证据：复现测试先于实现）。
- [ ] P2 低成本（约 15 分钟内）当场修复；其余登记卡内 backlog 归 CR。
- [ ] 共性缺陷裁决（Decision）：公共层/跨包发现（items 嵌套 schema 机制、region/value-or-region 公共层）影响 ≥2 组件/跨包 → 按 roadmap 自动修复机制 §7 处理（当前 plan 内优先修复并事后回写 CX-n，或插入 CX-n work item）；根因单点 `shared:` 标记归 CR。
- [ ] 修复后卡内发现标 `fixed` + commit/plan 引用；卡状态流转 `open → fixing → fixed-pending-closure`。
- [ ] 复杂/跨包 bug 修复按 AGENTS.md Bug Fix Test Coverage Rule 记录到 `docs/bugs/`（参考 `docs/bugs/73-*.md` 格式）。

Exit Criteria:

> 本 Phase 交付"发现清零或已裁定"，卡状态与代码行为一致。

- [ ] 全部 P0/P1 已修复（卡内标 `fixed` + 证据）或已显式裁定延期（仅允许依赖未落地跨 plan 机制者，标「机制落地后复验」并登记）；无静默跳过。
- [ ] 受影响包 `pnpm --filter @nop-chaos/flux-renderers-layout typecheck && build && lint && test` 绿（含新增回归测试）。

### Phase 3 - 组合宿主真实浏览器场景

Status: planned
Targets: `tests/e2e/component-lab/c5-1-host-surfaces.spec.ts`（新增）、playground demo/lab 页

- Item Types: `Proof | Fix`

- [ ] 设计并实现 ≥1 个本组件真实浏览器组合宿主场景（programmatic DOM 断言，禁截图诊断）：候选——wizard 步进校验/onComplete 提交（含 dialog 内 wizard，bug 73 模式专项：单测绿真机失败类风险）、collapse 展开态三态切换、grid 嵌套/响应式渲染；若使用新 lab 页路由，同步在 `playground-entry-pages.spec.ts` 的 ROUTE_ASSERTIONS 补该路由断言（先例：08-03 路由覆盖门禁）。
- [ ] bug 73 模式专项检查：wizard 组合宿主真机步进/校验/提交链路（dialog 内交互类风险）。
- [ ] 宿主场景发现的新缺陷按 Phase 2 流程修复（test-first）。
- [ ] 既有相关 e2e（`m3-layout.spec.ts`、`w3a-w3b-layout-action-family.spec.ts`、`layout-family-enhancements.spec.ts`、`w2a-data-composition.spec.ts`）在本族改动后回归。

Exit Criteria:

> 本 Phase 交付"真实浏览器行为成立"。

- [ ] 宿主场景 spec 通过（Playwright，programmatic DOM 断言）；相关既有 e2e 回归绿。
- [ ] bug 73 模式专项检查结论记录于 daily log（pass 或带证据 fail→已修复）。

### Phase 4 - 组件回归与审计卡 closure

Status: planned
Targets: 审计卡、`docs/logs/2026/08-04.md`、`docs/backlog/component-audit-roadmap.md`（C5.1 行）

- Item Types: `Proof`

- [ ] 全卡复查：3 卡 18 维表结论与最终代码一致；P0/P1 清零；卡状态 `closed`（含 fixed-pending-closure → closed 流转）。
- [ ] 本组件范围回归：`pnpm --filter @nop-chaos/flux-renderers-layout test` + 相关 e2e spec 全绿；如本 plan 触及公共层（flux-react/field-frame/编译器/嵌套 schema 机制），追加受影响包验证并记录。
- [ ] daily log 记录：卡 closure 汇总、修复清单（commit/plan 引用）、宿主场景结果、08-02 机制复验结论、CX-n 插入（如有）与决策。
- [ ] 若插入了 CX-n：同步更新 roadmap Work Item Status 表（新行 + 依赖边/注释）并按 §7b（事后回写：父 plan closure 后标 done）/§7c（正常生命周期）走；结构性 CX-n 执行前标注待人工确认。
- [ ] roadmap C5.1 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审；已交付全部执行证据，由 mission-driver CLOSURE_VERIFY fresh session 执行 audit 后收口）。

Exit Criteria:

> 本 Phase 交付"可进入 closure-audit 的完成态"。

- [ ] 3 张审计卡全部 `closed`；`docs/audits/per-component/` 汇总可读。
- [ ] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session（task `ses_03779767fffe9DMTE2v4pQO20P`）
- Verdict: `pass`（零 Blocker/Major）
- Rounds: 1
- Findings addressed: 全部文件/行引用经 live repo 核对通过（3 组件行数与测试用例数 grid 10/collapse 6/wizard 16、layout-renderer-definitions.ts wizard `:11`/grid `:174`/collapse `:265` + collapse valueOwnership `:311` + wizard steps fieldRules 08-02 分类、`collapse-renderer.tsx:42` ownership 读取、3 组件 design.md + wizard-flux-vs-amis-analysis.md、**3 组件无 component-lab lab 页核对确认**、demo 宿主 w3a-w3b `:55,72`/w2a `:140` 与 testid、e2e 文件清单（wizard 用例 `:64`）、roadmap C5.1 `todo` 仅依赖 C0、无 3 组件既有审计卡、steps/timeline 正确排除至 C5.2）；无 Major 发现。

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。

- [ ] 3 张审计卡存在、18 维表完整、P0/P1 清零、全部 `closed`
- [ ] 全部 in-scope P0/P1 已 test-first 修复并有回归测试；无被静默降级到 deferred 的 live defect/contract drift
- [ ] ≥1 个真实浏览器组合宿主场景通过（含 bug 73 模式专项检查）
- [ ] 共性缺陷已按 §7 处理（CX-n 插入/合并或当前 plan 内修复，决策记录在卡与 daily log）
- [ ] 受影响的 owner docs 已同步到 live baseline（design.md/quick-reference/roadmap 表按发现实际影响为准）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（mission-driver CLOSURE_VERIFY fresh session 执行）
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 审计卡 P2 backlog（成本 >15 分钟的非阻断体验/文档/测试加固项）

- Classification: `optimization candidate`
- Why Not Blocking Closure: checklist §3 明确 P2 可入审计卡 backlog 由 CR 自动处理；不阻塞本组件 supported baseline 成立。
- Successor Required: `yes`
- Successor Path: CR work item（跨族集中修复）

### 依赖未落地跨 plan 机制的发现（若有，「机制落地后复验」）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 依赖的机制未落地时无法在卡内闭合；按 checklist §3 自动修复纪律（「机制落地后复验」显式登记）由 CR 集中复验，卡内不悬挂。
- Successor Required: `yes`
- Successor Path: CR work item

### 3 组件无 component-lab lab 页（playground 覆盖缺口）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 已有 demo 宿主（w3a-w3b/w2a demo 页 + 对应 e2e）覆盖真实浏览器行为；lab 页补全属体验/覆盖加固，不影响本组件 supported baseline 成立；裁决后若 P2 成本低可当场补，否则归 CR/CG。
- Successor Required: `yes`
- Successor Path: CR/CG work item

### e2e pre-existing 其余项（ai/scheduling/content 包）

- Classification: `watch-only residual`
- Why Not Blocking Closure: C0 已逐项裁定为 mission 未触及包失败，successor 归属 C8.1/C9/CV；不在本组件 scope。
- Successor Required: `yes`
- Successor Path: C8.1/C9/CV work item

## Non-Blocking Follow-ups

- 审计中发现但裁定为 P3（风格 nit/注释）的项仅卡内记录，不处理。
- 工具脚本新增模式（若有）记入卡内，CG 统一升级。

## Closure

Status Note: 待执行（draft 状态，尚未执行）。

Closure Audit Evidence:

- Auditor / Agent: 待独立子 agent fresh session（mission-driver CLOSURE_VERIFY）
- Evidence: —

Follow-up:

- 待 closure-audit 后填写。
