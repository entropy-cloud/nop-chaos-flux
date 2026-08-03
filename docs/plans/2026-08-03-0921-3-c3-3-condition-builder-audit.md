# C3.3 condition-builder 逐组件审计

> Plan Status: completed
> Mission: component-audit
> Work Item: C3.3
> Last Reviewed: 2026-08-03
> Source: `docs/backlog/component-audit-roadmap.md`（C3.x Phase Details）、`docs/audits/component-audit-checklist.md`（18 维 + 审计卡模板 + 自动修复纪律；§3「与 deep-audit-prompts 23 维的关系」复杂交互渲染器必选 21-23）、`docs/skills/deep-audit-prompts.md`、`docs/logs/2026/08-03.md`
> Related: 依赖 C0（`2026-08-02-2043-1`，completed）完成后开工；与 C3.1（`2026-08-03-0921-1`）/ C3.2（`2026-08-03-0921-2`）并行独立（均只依赖 C0）。condition-builder 是 form-advanced 唯一复杂交互渲染器——按 checklist §3（复杂交互渲染器必选）追加 deep-audit 维度 21（显示与定位）/22（集成接线与可操作性）/23（测试有效性与假绿）

## Purpose

对 `flux-renderers-form-advanced` condition-builder 单组件完成 18 维逐组件审计（一张审计卡，P0/P1/P2/P3 裁决留痕）并追加 deep-audit 21-23 维（复杂交互渲染器必选），P0/P1 缺陷在**同一 plan 内自动修复**（test-first + 回归测试 + 受影响包验证门禁），完成 ≥1 个真实浏览器组合宿主场景验证（含 bug 73 模式专项检查），最终审计卡 `closed`（P0/P1 清零）。condition-builder 是条件表达式构建器（字段选择 + 操作符选择 + 值输入 + 分组/行增删 + 异步 metadata 加载），历史遗留复杂：异步 metadata 加载曾 abandoned（`2026-06-22-1343-1`），值编辑器 schema-value-editor 曾修复（`condition-builder-schema-value-editor-remediation-plan.md`），b61 曾处理 disabled 卡；维度 11（异步 metadata）、维度 6（值编辑器嵌套 schema 分类）、维度 8（a11y 完整键鼠路径）、维度 12（组合宿主）是本组件重点。

## Current Baseline

- **组件与文件**：单组件 `condition-builder/condition-builder.tsx`（type `:515`，definition 经 `index.tsx` `registerRendererDefinitions` 注册）；子模块：`condition-group.tsx`、`condition-item.tsx`、`field-select.tsx`、`operator-select.tsx`、`value-input.tsx`、`operators.ts`、`utils.ts`、`id-utils.ts`、`types.ts`（`condition-builder` schema type `types.ts:150`）。
- **设计文档**：`docs/components/condition-builder/design.md` 存在（维度 17 可核对）。
- **playground**：`apps/playground/src/component-lab/renderers/condition-builder-lab-page.tsx` 存在。
- **既有单测**：`condition-builder/` 下 `condition-builder-renderer.test.tsx`、`condition-builder.test.ts`、`condition-builder-drift.test.tsx`、`condition-builder-disabled-umbrella.test.tsx`、`condition-builder-formula.test.tsx`、`condition-builder-latency.test.tsx`、`condition-builder-projected-stability.test.tsx`、`condition-builder-cb3-not.test.tsx`、`condition-item.test.tsx`、`field-select.test.tsx`、`operator-select.test.tsx`、`value-input.test.tsx`、`value-input.a11y.test.tsx`、`config-*.test.tsx` 等（维度 16 基础厚）。
- **e2e**：`tests/e2e/condition-builder-formula.spec.ts` 存在；本组件无 `tests/e2e/component-lab/c3-3-host-surfaces.spec.ts`（需新增）。
- **历史基础**：`2026-06-21-0010-e0d-condition-builder-drift-fix-plan.md`、`2026-06-22-0149-1-e3-condition-builder-formula-completion-plan.md`、`2026-06-22-1343-1-e3-condition-builder-async-metadata-loading-plan.md`（**abandoned**——异步 metadata 加载是否落地需 live 核对）、`2026-06-26-1030-2-b61-action-graph-reload-condition-builder-disabled-cards-plan.md`、`447-condition-builder-schema-value-editor-remediation-plan.md` 均 completed；复杂交互渲染器按 checklist §3 必选 deep-audit 21-23。
- **基线**：以 C0 回写基线为准（unit 全绿 58/58；e2e pre-existing 9 项中本组件无归属项，余项属 ai/scheduling/content，successor C8.1/C9/CV）。

## Goals

- 1 张审计卡（`docs/audits/per-component/condition-builder.md`）18 维逐项核对 + deep-audit 21-23 维，P0/P1/P2/P3 裁决留痕，`文件:行` 证据，`closed`（P0/P1 清零）。
- 本组件 P0/P1 缺陷 test-first 自动修复（契约/公共层修复 Must automate），P2 低成本当场修复、其余登记卡内 backlog 归 CR。
- ≥1 个真实浏览器组合宿主场景（含 bug 73 模式专项）：候选——form 内 condition-builder 构建条件并提交（提交值形状）、CRUD 行内/弹层内使用（投影稳定性）、disabled 态整体禁用（b61 复验）。
- roadmap C3.3 行标 `done`（独立子 agent closure-audit pass 后）。

## Non-Goals

- C3.1/C3.2/C3.4/C3.5 及以后族组件；CRUD 本体（C4.2）。
- checklist v2 修订（CG）、审计工具脚本升级（CG）。
- 结构性重构（公共 API/包边界/编译期机制，需人工确认后另立 CX-n；纯行为修复不视为结构性）。
- 各审计卡 P2 backlog（>15 分钟项）归 CR 处理，不在本 plan 内实现。

## Scope

### In Scope

- 1 组件 × 18 维审计卡 + deep-audit 21-23 维（维度重点：1 Schema 契约（fields 与 types.ts 一致、expression/expressionV2 双模式、metadata 配置）、2 RendererComponentProps 合规、3 值所有权三态（expression 值受控 echo、defaultValue/initValue/valueStatePath、重置/清空）、4 表单参与（name/required/validation 挂接、提交数据形状、校验错误展示与清除、data-field-\*）、5 DOM 与选择器契约（data-field/data-renderer/data-value/data-testid、组/行/字段/操作符/值输入 marker 契约）、6 嵌套 schema 分类（值编辑器内嵌 schema 按 08-02 机制分类、无 deepFields 残留——schema-value-editor 修复复验）、7 事件与 action 契约（onChange payload 形状、normalizeActionEvent 语义）、8 a11y（字段/操作符/值输入完整键鼠路径、焦点管理、aria 语义）、9 i18n（placeholder/操作符文案 key 存在性）、10 四态覆盖（空/加载/错误/禁用/readOnly——b61 disabled 复验）、11 异步生命周期（**metadata 异步加载：abort/竞态/失败态/重试、env IO 边界 INV-1——`2026-06-22-1343-1` abandoned 后该路径实际落地状态 live 核对**）、12 组合宿主场景（form 内构建条件提交、CRUD 行内/弹层内、投影稳定性）、13 样式契约（widget 自样式）、14 React 19、15 性能边界（大条件树渲染、行增删 O(n²)、key 稳定性）、16 测试质量（断言正确行为而非 not-throw、DOM 契约断言、错误路径、config 测试有效性）、17 文档对照（design.md ↔ 实现 props/行为）、18 注册/包边界/IO 安全红线（surface 双注册、metadata 远程加载走 env IO 边界 INV-1））；deep-audit 21（条件行/分组显示与定位正确性——嵌套分组、宽度、滚动）、22（集成接线与可操作性——form/弹层/CRUD 集成）、23（测试有效性与假绿——既有 condition-builder-\* 测试是否真断言行为）。
- P0/P1 自动修复（test-first）+ P2 低成本即时修复。
- 真实浏览器宿主场景（form 内 condition-builder 构建条件并提交（bug 73 模式）、disabled 态、若 metadata 异步存在则验证远程加载失败/重试）。
- 审计卡状态流转（open → fixing → fixed-pending-closure → closed）与 daily log 记录。

### Out Of Scope

- C3.1/C3.2/C3.4/C3.5 及以后族组件；CRUD 本体（C4.2）。
- checklist v2 修订（CG）。
- 结构性重构（需人工确认后另立 CX-n）。
- e2e pre-existing 剩余项（ai/scheduling/content 包，successor C8.1/C9/CV）。

## Failure Paths

| 可测场景编号      | 触发                                             | 行为（含错误码）                                  | 可重试 | 用户可见表现            |
| ----------------- | ------------------------------------------------ | ------------------------------------------------- | ------ | ----------------------- |
| host-cb-submit    | form 内 condition-builder 构建条件并提交（真机） | 条件值进入 store、提交数据形状正确（bug 73 模式） | 是     | 提交结果正确回显        |
| host-cb-disabled  | disabled/readOnly 态 condition-builder           | 全链禁用、不崩溃（b61 复验）                      | 是     | 只读表现正确            |
| host-cb-meta-fail | metadata 远程加载失败（若该路径落地）            | 失败态展示、可重试、不崩溃                        | 是     | 错误提示 + 重试入口可见 |
| host-cb-proj      | CRUD 行内/弹层内使用 condition-builder           | 投影 scope 稳定、编辑不污染行 scope               | 是     | 行内条件编辑正确        |

## Test Strategy

本档选择：**必须自动化** —— condition-builder 是复杂交互渲染器（表单核心回归路径 + 值形状契约），且承接 b61 disabled 复验与 abandoned 异步 metadata 路径 live 核对；契约/公共层修复必须 test-first（先写失败测试再实现）。验证门禁：受影响包 `pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck/build/lint/test` + `tests/e2e/condition-builder-formula.spec.ts` 回归 + 本组件新增宿主场景 Playwright（programmatic DOM 断言）。

## Execution Plan

### Phase 1 - 逐组件 18 维审计（含 deep-audit 21-23）与审计卡产出

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/condition-builder/`、`docs/audits/per-component/`

- Item Types: `Proof`

- [x] 审计前核对注册定义：condition-builder 注册项（type/fields/componentCapabilityContracts）与 `types.ts` 一致（维度 1/18）；expression/expressionV2 双模式与 metadata 配置定位。
- [x] 产出审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），P0/P1/P2/P3 裁决留痕（checklist §3）；**追加 deep-audit 21-23 维**（显示与定位/集成接线与可操作性/测试有效性与假绿）。
- [x] 维度重点核查：值所有权三态（维度 3：expression 值受控 echo）；嵌套 schema 分类（维度 6：值编辑器内嵌 schema 按 08-02 机制分类——schema-value-editor 修复复验）；a11y（维度 8：字段/操作符/值输入完整键鼠路径、焦点管理）。
- [x] 异步生命周期专项（维度 11）：**metadata 异步加载路径 live 核对**（`2026-06-22-1343-1` abandoned 后实际落地状态——abort/竞态/失败态/重试、env IO 边界 INV-1）；未落地则卡内记 n-a/「机制落地后复验」。
- [x] 四态覆盖（维度 10：空/加载/错误/禁用/readOnly——b61 disabled 复验）与测试质量（维度 16：既有 condition-builder-\* 测试断言正确行为而非 not-throw、DOM 契约断言、错误路径）；React 19 规范（维度 14）、性能边界（维度 15：大条件树、行增删 O(n²)、key 稳定性）。
- [x] 文档对照（维度 17）：design.md ↔ 实现 props/行为逐项核对；quick-reference.md 词条准确性。

Exit Criteria:

> 本 Phase 交付 1 张审计卡（含裁决 + 21-23 维），是后续修复的唯一事实来源。

- [x] `docs/audits/per-component/condition-builder.md` 卡存在，18 维表完整 + deep-audit 21-23 维记录、`文件:行` 证据可验证。
- [x] 卡内发现清单带 P0/P1/P2/P3 裁决；无 P0/P1 则标记 `closed`，否则 `open`；metadata 异步路径 live 核对结论已记录。

### Phase 2 - P0/P1 自动修复（test-first）

Status: completed
Targets: 发现涉及的 renderer/子模块文件、types.ts、契约测试文件、e2e spec

- Item Types: `Fix | Proof | Decision`

- [x] 按审计卡处理 P0/P1：先写复现/回归测试（断言正确行为，非仅 not-throw），再实现修复；DOM/选择器契约变更追加 focused 契约测试与 e2e（test-first 证据：复现测试先于实现）。
- [x] P2 低成本（约 15 分钟内）当场修复；其余登记卡内 backlog 归 CR。
- [x] 共性缺陷裁决（Decision）：公共层/跨包发现（field-frame、operators/值编辑器共享机制）影响 ≥2 组件/跨包 → 按 roadmap 自动修复机制 §7 处理（当前 plan 内优先修复并事后回写 CX-n，或插入 CX-n work item）；根因单点 `shared:` 标记归 CR。
- [x] 修复后卡内发现标 `fixed` + commit/plan 引用；卡状态流转 `open → fixing → fixed-pending-closure`。
- [x] 复杂/跨包 bug 修复按 AGENTS.md Bug Fix Test Coverage Rule 记录到 `docs/bugs/`（参考 `docs/bugs/73-*.md` 格式）。

Exit Criteria:

> 本 Phase 交付"发现清零或已裁定"，卡状态与代码行为一致。

- [x] 全部 P0/P1 已修复（卡内标 `fixed` + 证据）或已显式裁定延期（仅允许依赖未落地跨 plan 机制者，标「机制落地后复验」并登记）；无静默跳过。
- [x] 受影响包 `pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck && build && lint && test` 绿（含新增回归测试）。

### Phase 3 - 组合宿主真实浏览器场景

Status: completed
Targets: `tests/e2e/component-lab/c3-3-host-surfaces.spec.ts`（新增）、playground lab 页

- Item Types: `Proof | Fix`

- [x] 设计并实现 ≥1 个本组件真实浏览器组合宿主场景（programmatic DOM 断言，禁截图诊断）：候选——form 内 condition-builder 构建条件+提交（bug 73 模式：条件值 → store 更新 → 提交值正确）、disabled 态全链禁用（b61 复验）、CRUD 行内/弹层内投影稳定、metadata 远程加载失败/重试（若路径落地）。
- [x] bug 73 模式专项检查：在宿主场景中显式验证单测绿但真机失败类风险（条件构建真机提交、投影 scope 稳定）。
- [x] 宿主场景发现的新缺陷按 Phase 2 流程修复（test-first）。
- [x] 既有相关 e2e（`tests/e2e/condition-builder-formula.spec.ts`）在本组件改动后回归。

Exit Criteria:

> 本 Phase 交付"真实浏览器行为成立"。

- [x] 宿主场景 spec 通过（Playwright，programmatic DOM 断言）；condition-builder-formula.spec.ts 回归绿。
- [x] bug 73 模式专项检查结论记录于 daily log（pass 或带证据 fail→已修复）。

### Phase 4 - 组件回归与审计卡 closure

Status: completed
Targets: 审计卡、`docs/logs/2026/08-03.md`、`docs/backlog/component-audit-roadmap.md`（C3.3 行）

- Item Types: `Proof`

- [x] 全卡复查：18 维 + 21-23 维表结论与最终代码一致；P0/P1 清零；卡状态 `closed`（含 fixed-pending-closure → closed 流转）。
- [x] 本组件范围回归：`pnpm --filter @nop-chaos/flux-renderers-form-advanced test` + 相关 e2e spec 全绿；如本 plan 触及公共层（flux-react/field-frame/编译器），追加受影响包验证并记录。
- [x] daily log 记录：卡 closure 汇总、修复清单（commit/plan 引用）、宿主场景结果、metadata 异步路径核对结论、CX-n 插入（如有）与决策。
- [x] 若插入了 CX-n：同步更新 roadmap Work Item Status 表（新行 + 依赖边/注释）并按 §7b（事后回写：父 plan closure 后标 done）/§7c（正常生命周期）走；结构性 CX-n 执行前标注待人工确认。
- [x] roadmap C3.3 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审；已交付全部执行证据，由 mission-driver CLOSURE_VERIFY fresh session 执行 audit 后收口）。

Exit Criteria:

> 本 Phase 交付"可进入 closure-audit 的完成态"。

- [x] 审计卡 `closed`；`docs/audits/per-component/` 汇总可读。
- [x] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session（task `ses_03ac7ab35ffeJn3h3yyz1HkQUg`）
- Verdict: `pass-with-minors`（零 Blocker/Major；Minor 已处理：21-23 维规则引用改 checklist §3（「与 deep-audit-prompts 23 维的关系」，`component-audit-checklist.md:60`）、schema-value-editor 计划文件名补 `447-` 前缀）
- Rounds: 1
- Findings addressed: 全部文件/行引用经 live repo 核对通过（condition-builder.tsx `:514-515`、types.ts `:149-150`、9 子模块、design.md + example.json、lab 页、12 测试文件、e2e spec、abandoned/b61/447 历史计划状态、roadmap C3.3 `todo` 仅依赖 C0、无既有审计卡）；Minor 已处理。

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。

- [x] 审计卡存在、18 维表完整 + 21-23 维记录、P0/P1 清零、`closed`
- [x] 全部 in-scope P0/P1 已 test-first 修复并有回归测试；无被静默降级到 deferred 的 live defect/contract drift
- [x] ≥1 个真实浏览器组合宿主场景通过（含 bug 73 模式专项检查）
- [x] 共性缺陷已按 §7 处理（CX-n 插入/合并或当前 plan 内修复，决策记录在卡与 daily log）
- [x] 受影响的 owner docs 已同步到 live baseline（design.md/quick-reference/roadmap 表按发现实际影响为准）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
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

### 依赖未落地跨 plan 机制的发现（若有，「机制落地后复验」，含 metadata 异步路径若未落地）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 依赖的机制未落地时无法在卡内闭合；按 checklist §3 自动修复纪律（「机制落地后复验」显式登记）由 CR 集中复验，卡内不悬挂。
- Successor Required: `yes`
- Successor Path: CR work item

### e2e pre-existing 其余项（ai/scheduling/content 包）

- Classification: `watch-only residual`
- Why Not Blocking Closure: C0 已逐项裁定为 mission 未触及包失败，successor 归属 C8.1/C9/CV；不在本组件 scope。
- Successor Required: `yes`
- Successor Path: C8.1/C9/CV work item

## Non-Blocking Follow-ups

- 审计中发现但裁定为 P3（风格 nit/注释）的项仅卡内记录，不处理。
- 工具脚本新增模式（若有）记入卡内，CG 统一升级。

## Closure

Status Note: 2026-08-03 四 Phase 全部执行完成（Plan Status: completed）。1 卡 closed（18 维 + deep-audit 21-23）、P0/P1 清零（P1-1 readOnly umbrella + P1-2 自定义值编辑器冻结（CX-8 机制消费）+ P1-3 phantom 声明簇 ×22 键移除 + 定义补注册 18 键 + removeConditionLabel 兑现；P2 ×3 fixed）、宿主场景 4/4（bug 73 模式 host-cb-submit + b61 复验 host-cb-disabled + P1-1 真机证明 host-cb-readonly + P1-2 真机证明 host-cb-custom）、formula e2e 回归 4/4、component-lab 196/1skip、w4c 等复合回归 19/19、form-advanced 971 tests 全绿 + typecheck/build/lint 绿 + check:i18n-keys/schema-prop-coverage 绿 + flux-types 重新生成。metadata 异步路径 live 核对：组件级加载 abandoned（设计拒绝）、fields 表达式路线实证 live。共性裁决：P1-2 为 CX-8 机制消费（roadmap CX-8 行已 done，不重复插 CX-n）；P2-4 shared（select renderer combobox readOnly 视觉残留，根因公共层）登记 P2 backlog 归 CR；P1-3 根因单点（types.ts）不插 CX-n。closure-audit 由独立子 agent fresh session（mission-driver CLOSURE_VERIFY 阶段）执行并勾选 Closure Gates closure-audit 项、回填 Audit Evidence、roadmap C3.3 行标 `done` 后收口（执行 session 不自审）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session（mission-driver CLOSURE_VERIFY 阶段，2026-08-03）
- Evidence: 审计 session 独立复核 live repo（非执行 session 上下文）：(1) 1 张审计卡 closed 且 18 维 + 21-23 维结论与最终代码一致（P1-1 `condition-builder.tsx:177` umbrella 含 `presentation.readOnly`、P1-2 value-input.tsx `FormLayoutContext.Provider staticReadOnly`（:151-166）、P1-3 types.ts phantom 键移除（grep 核验 22 键零残留）+ 定义 fields 补注册 18 键 + c3-3-schema-contract-honesty.test.tsx 4 用例、P2×3 fixed——均与最终代码一致）；(2) 13 个新测试用例存在且断言正确行为（readonly-umbrella 5、custom-editor-freeze 4、honesty 4）；(3) 真实浏览器复核（审计 session 实测重跑）：`c3-3-host-surfaces.spec.ts` 4/4、`condition-builder-formula.spec.ts` 4/4；(4) 受影响包门禁实测：`pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck && build && lint && test` 全绿（971 tests 119 files）+ 仓库级 `pnpm typecheck` 31/31 + `check:i18n-keys`/`check:schema-prop-coverage` 绿；(5) deferred 分类诚实（P2-4 shared 归 CR、P3 ×6 卡内记录、addGroupBtnVisibleOn 能力登记 CR backlog；metadata 异步路径为设计拒绝并实证 `${fieldDefs}` 表达式路线 live，非缺陷降级）；(6) 五处一致性（Plan Status / 4 Phase Status / Phase Exit Criteria / Closure Gates / Closure evidence）核对通过；(7) roadmap C3.3 行已标 `done`（closure audit 通过后收口，C2.x/C3.1/C3.2 先例一致）。

Follow-up:

- P2-4 `shared:`（select renderer combobox readOnly 视觉残留）归 CR；P3 ×6 + addGroupBtnVisibleOn 能力登记归 CR；e2e pre-existing 8 项归 C8.1/C9/CV；无 plan-owned 剩余工作（closure-audit 由独立 session 执行）。
