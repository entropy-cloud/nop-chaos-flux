# C5.1 layout 网格与流程族逐组件审计（grid/collapse/wizard）

> Plan Status: completed
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

Status: completed
Targets: `packages/flux-renderers-layout/src/{grid,collapse,wizard}-renderer.tsx`、`layout-renderer-definitions.ts`、`schemas.ts`、`docs/audits/per-component/`

- Item Types: `Proof`

- [x] 审计前核对注册定义：3 组件注册项（type/fields/propContracts/fieldRules）与各自 schema 一致（维度 1/18）；wizard steps fieldRules（title/body/actions value-or-region/region、beforeEnter/beforeLeave event）与 collapse items fieldRules（title/body region）08-02 机制核对。
- [x] 产出 3 张审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），P0/P1/P2/P3 裁决留痕（checklist §3）。
- [x] 维度重点核查：值所有权三态（维度 3：collapse valueOwnership local/controlled/scope 全路径——`collapse-renderer.tsx:42` ownership 读取与三态分支、wizard stepIndex 交互态 vs commit 生命周期态分离）；params/isolate 迁移语义（维度 6：08-02 机制在 wizard/collapse items 上的落地——`fieldRules` 的 params/isolate 声明与实际求值一致）。
- [x] 事件与 action 契约（维度 7：wizard beforeEnter/beforeLeave/onComplete payload 形状与 dispatch、collapse 展开事件）与 a11y（维度 8：collapse 键盘路径/aria-expanded、wizard 步进焦点管理）。
- [x] 异步生命周期（维度 11：wizard beforeEnter/beforeLeave 异步 gate——abort/竞态/失败态）与性能边界（维度 15：wizard 步进切换重渲染、collapse 大量项渲染）。
- [x] 测试质量（维度 16）：既有 grid/collapse/wizard 测试断言正确行为而非 not-throw、DOM 契约断言、错误路径——假绿核查（含 `contract-honesty.test.ts` 覆盖项）。
- [x] 文档对照（维度 17）：3 组件 design.md ↔ 实现 props/行为逐项核对；wizard-flux-vs-amis-analysis.md 与实现一致性；layout-selection-guide.md 对 grid 的定位（grid vs flex vs container 选择语义）。
- [x] playground 覆盖核查（维度 18）：3 组件无 component-lab lab 页——记录缺口并裁决（P2 低成本当场补页，Phase 3 落地）。

Exit Criteria:

> 本 Phase 交付 3 张审计卡（含裁决），是后续修复的唯一事实来源。

- [x] `docs/audits/per-component/{grid,collapse,wizard}.md` 卡存在，18 维表完整、`文件:行` 证据可验证。
- [x] 卡内发现清单带 P0/P1/P2/P3 裁决；无 P0/P1 的卡标记 `closed`，否则 `open`；08-02 机制复验结论已记录。（grid 卡 P0/P1 无、P2×2 在本 plan 内修复故留 `open` 至 Phase 4 收口；collapse/wizard 卡含 P1，`open`）

### Phase 2 - P0/P1 自动修复（test-first）

Status: completed
Targets: 发现涉及的 renderer/子模块文件、schema 文件、契约测试文件、e2e spec

- Item Types: `Fix | Proof | Decision`

- [x] 按审计卡处理 P0/P1：先写复现/回归测试（断言正确行为，非仅 not-throw），再实现修复；DOM/选择器契约变更追加 focused 契约测试与 e2e（test-first 证据：复现测试先于实现）。
- [x] P2 低成本（约 15 分钟内）当场修复；其余登记卡内 backlog 归 CR。
- [x] 共性缺陷裁决（Decision）：全部发现为**组件单点根因**——wizard P1-1（死字段移除）/P1-2（文档漂移）/P1-3（visible 语义，wizard 内部）/P2-1（guard 抛错兜底，wizard 内部）/P2-2（错误展示 + i18n key，i18n 增 key 为纯增量）、collapse P1-1（scope-degrade 移植 steps 既有模式，根因在 collapse 单点）、grid P2-2（resolveGap 对齐，根因在 grid 单点）——**无 ≥2 组件/跨包公共层根因，无 CX-n 插入**（决策记录于各卡 + daily log）。
- [x] 修复后卡内发现标 `fixed` + commit/plan 引用；卡状态流转 `open → fixing → fixed-pending-closure`。
- [x] 复杂/跨包 bug 修复按 AGENTS.md Bug Fix Test Coverage Rule 记录到 `docs/bugs/`（参考 `docs/bugs/73-*.md` 格式）——本 plan 无复杂跨包 bug（全部单点根因），无需新记录。

Exit Criteria:

> 本 Phase 交付"发现清零或已裁定"，卡状态与代码行为一致。

- [x] 全部 P0/P1 已修复（卡内标 `fixed` + 证据）或已显式裁定延期（仅允许依赖未落地跨 plan 机制者，标「机制落地后复验」并登记）；无静默跳过。（P1×4 全部 fixed：wizard P1-1/P1-2/P1-3 + collapse P1-1；P2×8 fixed + P2-b backlog ×2 显式登记卡内归 CR）
- [x] 受影响包 `pnpm --filter @nop-chaos/flux-renderers-layout typecheck && build && lint && test` 绿（含新增回归测试）。（81 tests 全绿，+8：wizard ×5 + collapse ×2 + grid ×1）

### Phase 3 - 组合宿主真实浏览器场景

Status: completed
Targets: `tests/e2e/component-lab/c5-1-host-surfaces.spec.ts`（新增）、playground demo/lab 页

- Item Types: `Proof | Fix`

- [x] 设计并实现 ≥1 个本组件真实浏览器组合宿主场景（programmatic DOM 断言，禁截图诊断）：新增 **3 个 lab 页**（`grid-lab-page.tsx`/`collapse-lab-page.tsx`/`wizard-lab-page.tsx`，补上维度 18 缺口——P2 低成本当场补页裁决）+ `data-c5c1-host.ts` 宿主 schema 模块 + `LAYOUT_RENDERER_ROUTES`（grid/collapse/wizard 3 条，C5.2 successor 补其余 4 条）+ `COMPONENT_LAB_COVERAGE_MANIFEST` 3 条（smoke.spec.ts 自动覆盖 58/58 含新条目）；lab-renderer 路由不经 `DOMAIN_RENDERER_ROUTES`（`playground-entry-pages.spec.ts` ROUTE_ASSERTIONS 仅覆盖 domain 路由，lab 路由由 smoke.spec 门禁——核对结论：无需 ROUTE_ASSERTIONS 更新）；route-matrix 计数测试同步含 LAYOUT_RENDERER_ROUTES。
- [x] bug 73 模式专项检查：**host-wizard-dialog 真机 5/5 通过**——dialog 内 wizard 步进/校验/提交链路成立（portal/focus 环境实证）。过程中发现并适配两个宿主设计事实：(a) dialog 内容渲染于页级 portal（`data-slot="dialog-surface"`，非 scenario stage 内）——断言按 portal 定位；(b) dialog 内容 scope 写为**本地分支语义**（openDialog 建 child scope，setValue 写不进页级 scope——scope 模型设计行为非缺陷）——onComplete 信号改用 host window probe（dialog-edit-submit.spec.ts 同款跨 scope 模式），断言 probe + `data-last-commit-status=success`。
- [x] 宿主场景发现的新缺陷按 Phase 2 流程修复（test-first）：宿主阶段未发现新渲染器缺陷（3 个失败均为测试用例作者错误——断言文本格式/portal 定位/scope 模型理解，修正用例后全绿）。
- [x] 既有相关 e2e（`m3-layout.spec.ts`、`w3a-w3b-layout-action-family.spec.ts`、`layout-family-enhancements.spec.ts`、`w2a-data-composition.spec.ts`）在本族改动后回归——**全绿**（85 passed 首轮 + smoke 58/58 含新增 3 条目）。

Exit Criteria:

> 本 Phase 交付"真实浏览器行为成立"。

- [x] 宿主场景 spec 通过（Playwright，programmatic DOM 断言）；相关既有 e2e 回归绿。（c5-1-host-surfaces **5/5**：host-grid + host-collapse + host-wizard-step + host-wizard-gate + host-wizard-dialog；m3-layout 7/7 + w3a-w3b 5/5 + layout-family-enhancements 9/9 + w2a-data-composition 3/3 + smoke 58/58）
- [x] bug 73 模式专项检查结论记录于 daily log（pass 或带证据 fail→已修复）。（host-wizard-dialog **pass**，证据与宿主设计事实记录于 daily log `docs/logs/2026/08-04.md` C5.1 节）

### Phase 4 - 组件回归与审计卡 closure

Status: completed
Targets: 审计卡、`docs/logs/2026/08-04.md`、`docs/backlog/component-audit-roadmap.md`（C5.1 行）

- Item Types: `Proof`

- [x] 全卡复查：3 卡 18 维表结论与最终代码一致；P0/P1 清零；卡状态 `closed`（含 fixed-pending-closure → closed 流转）。（live 核验：actionNextSaveLabel 移除（grep 零命中）、0-based JSDoc、lastVisibleStepIndex + wizard-step-error + warnScopeDegraded + resolveGap 均落地、lab 页 ×3 存在、宿主 5/5 真机 pass）
- [x] 本组件范围回归：`pnpm --filter @nop-chaos/flux-renderers-layout test`（81/81）+ 相关 e2e spec 全绿（c5-1-host-surfaces 5/5 + m3-layout 7/7 + w3a-w3b 5/5 + layout-family-enhancements 9/9 + w2a-data-composition 3/3 + smoke 58/58）；本 plan 触及 flux-i18n（+2 key 双 locale）与 flux-guide（regenerate）——追加验证：workspace `pnpm typecheck`/`build`/`lint`/`test` 全绿 + `pnpm test:e2e` 全量 874 passed/8 failed（8 项全为 C0 基线 pre-existing，successor C8.1/C9/CV，零新增）。
- [x] daily log 记录：卡 closure 汇总、修复清单（commit/plan 引用）、宿主场景结果、08-02 机制复验结论、CX-n 插入（无）与决策。（`docs/logs/2026/08-04.md` C5.1 节）
- [x] 若插入了 CX-n：无 CX-n 插入（全部组件单点根因），不适用。
- [x] roadmap C5.1 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审；已交付全部执行证据，由 mission-driver CLOSURE_VERIFY fresh session 执行 audit 后收口）。

Exit Criteria:

> 本 Phase 交付"可进入 closure-audit 的完成态"。

- [x] 3 张审计卡全部 `closed`；`docs/audits/per-component/` 汇总可读。（grid/collapse/wizard 卡均 `closed`：P1×4/P2×8 fixed、P2-b backlog ×2 显式登记、P3 ×9 keep）
- [x] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置）。（`docs/logs/2026/08-04.md` C5.1 节：Phase 1-4 摘要 + closure-audit 证据位置 + pre-existing 观察）

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session（task `ses_03779767fffe9DMTE2v4pQO20P`）
- Verdict: `pass`（零 Blocker/Major）
- Rounds: 1
- Findings addressed: 全部文件/行引用经 live repo 核对通过（3 组件行数与测试用例数 grid 10/collapse 6/wizard 16、layout-renderer-definitions.ts wizard `:11`/grid `:174`/collapse `:265` + collapse valueOwnership `:311` + wizard steps fieldRules 08-02 分类、`collapse-renderer.tsx:42` ownership 读取、3 组件 design.md + wizard-flux-vs-amis-analysis.md、**3 组件无 component-lab lab 页核对确认**、demo 宿主 w3a-w3b `:55,72`/w2a `:140` 与 testid、e2e 文件清单（wizard 用例 `:64`）、roadmap C5.1 `todo` 仅依赖 C0、无 3 组件既有审计卡、steps/timeline 正确排除至 C5.2）；无 Major 发现。

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。

- [x] 3 张审计卡存在、18 维表完整、P0/P1 清零、全部 `closed`
- [x] 全部 in-scope P0/P1 已 test-first 修复并有回归测试；无被静默降级到 deferred 的 live defect/contract drift
- [x] ≥1 个真实浏览器组合宿主场景通过（含 bug 73 模式专项检查）
- [x] 共性缺陷已按 §7 处理（CX-n 插入/合并或当前 plan 内修复，决策记录在卡与 daily log）
- [x] 受影响的 owner docs 已同步到 live baseline（design.md/quick-reference/roadmap 表按发现实际影响为准）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（mission-driver CLOSURE_VERIFY fresh session 执行）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

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

Status Note: 已执行完毕（4 Phase 全部 `completed` + 全部执行项/Exit Criteria 勾选；Closure Gates 中 `pnpm typecheck/build/lint/test` 已实测全绿）。**独立子 agent fresh session（mission-driver CLOSURE_VERIFY）closure-audit 已 pass（approved）**：Closure Gates 审计门禁项已勾选、Closure Audit Evidence 已回填、roadmap C5.1 行标已标 `done`——收口动作由审计 session 完成，执行 session 未自审（与 C2.x/C3.x/C4.1/C4.2/C4.3 先例一致）。

执行收口证据（Phase 1-4）：

- **Phase 1**：3 张审计卡产出（`docs/audits/per-component/{grid,collapse,wizard}.md`，18 维表 + `文件:行` 证据 + P0/P1/P2/P3 裁决）；注册定义三方核对完成（layout-renderer-definitions.ts wizard `:11`/grid `:174`/collapse `:265`）；08-02 机制复验结论：steps/collapse/grid items fieldRules 分类一致、beforeEnter/beforeLeave 信封 + live scope 求值实证、无 deepFields；工具脚本本族 0 命中。
- **Phase 2**：P0 ×0；P1 ×4 全部 test-first 修复（wizard P1-1 actionNextSaveLabel 死契约移除 + design §10.2 留痕 + flux-guide regenerate；wizard P1-2 索引基文档对齐 0-based；wizard P1-3 visible:false 语义（nav 过滤 + linear 门跳过 hidden + lastVisibleStep 完成判定）；collapse P1-1 scope-degrade 移植）；P2 ×8 低成本修复（guard 抛错兜底/内联错误区 + i18n/种子契约测试/commit 失败用例/disabled 用例/lab 页 ×3/gap resolveGap 对齐）；P2-b backlog ×2 显式登记（wizard/collapse 推荐句柄，归 CR）；P3 keep ×9。test-first 证据：`__tests__/wizard-c5-1-contract.test.tsx` ×5 + collapse-renderer.test.tsx ×2 + grid-renderer.test.tsx ×1 先红后绿。**共性缺陷裁决（Decision）**：全部组件单点根因 → **无 CX-n 插入**。
- **Phase 3**：`tests/e2e/component-lab/c5-1-host-surfaces.spec.ts` **5/5 全绿**（host-grid / host-collapse / host-wizard-step（内嵌表单步进校验，单测盲区真机补上）/ host-wizard-gate（**bug 73 模式专项**）/ host-wizard-dialog（**bug 73 模式专项**：dialog portal/focus 环境步进+校验+提交链路 + onComplete host probe））；新 lab 页 ×3 + LAYOUT_RENDERER_ROUTES + coverage manifest 3 条（smoke 58/58）；既有相关 e2e 回归全绿（m3-layout 7/7 + w3a-w3b 5/5 + layout-family-enhancements 9/9 + w2a-data-composition 3/3）；宿主适配记录（dialog portal 定位 + dialog 内容 scope 本地写语义 → host probe 跨 scope 信号，均非渲染器缺陷）。
- **Phase 4**：3 卡全部 `closed`（P0/P1/P2 清零 + P2-b backlog 显式登记 + P3 keep）；`pnpm --filter @nop-chaos/flux-renderers-layout typecheck && build && lint && test` 81/81 绿；workspace `pnpm typecheck` 31/31、`build` 31/31、`lint` 31/31、`test` 58/58（--force 实测）全绿；`pnpm test:e2e` 全量 874 passed/43 skipped/8 failed（8 项全为 C0 基线 pre-existing，successor C8.1/C9/CV，零新增）；daily log `docs/logs/2026/08-04.md` C5.1 节已记录收口证据。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session（mission-driver CLOSURE_VERIFY，2026-08-04，closure-audit 独立复核，非执行 session 上下文）
- Verdict: `approved`（零 Blocker/Major）
- Evidence: 独立复核 live repo：3 审计卡 `docs/audits/per-component/{grid,collapse,wizard}.md` 均 `closed`（P1×4/P2×8 fixed、P2-b backlog ×2 显式登记、P3 ×9 keep）；代码落点可核验（actionNextSaveLabel 非测试代码 grep 零命中、wizard-renderer.tsx lastVisibleStepIndex :277/:284 + data-slot="wizard-step-error" :762、collapse-renderer.tsx warnScopeDegraded :28/:62、grid-renderer.tsx resolveGap :109）；回归测试 `__tests__/wizard-c5-1-contract.test.tsx` 存在且断言正确行为；lab 页 ×3（grid/collapse/wizard-lab-page.tsx）+ data-c5c1-host.ts + LAYOUT_RENDERER_ROUTES + coverage manifest；宿主 spec `tests/e2e/component-lab/c5-1-host-surfaces.spec.ts` 5 个真实 Playwright 用例（含 bug 73 模式 host-wizard-dialog）；本审计 re-run `pnpm --filter @nop-chaos/flux-renderers-layout test` 81/81 全绿（11 files）；daily log `docs/logs/2026/08-04.md` C5.1 节记录收口证据；plan 文本五点一致（Plan Status completed / 4 Phase completed / Exit Criteria 全 [x] / Closure Gates 全 [x] / log 一致）；deferred 诚实（P2 backlog → CR、pre-existing e2e → C8.1/C9/CV，均带 non-blocking 理由）；收口动作由本审计 session 完成：Closure Gates closure-audit 项勾选 + Audit Evidence 回填 + Plan Status → completed + roadmap C5.1 行标 `done`

Follow-up:

- no remaining plan-owned work（closure-audit 已 pass，收口动作已完成：Plan Status → completed、Closure Gates 审计门禁项已勾选、roadmap C5.1 行标已标 done）
- 观察（供 CLOSURE_VERIFY 核对）：`pnpm check:oversized-code-files` 为 pre-existing 红（HEAD 基线 14 文件超 700 行；本 plan 使 wizard-renderer.tsx 734→774 入清单；plan gates 全绿；超限文件治理归 CG/CR，非本 plan scope）
