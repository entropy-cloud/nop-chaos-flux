# C2.3 form 选择控件族逐组件审计（select/checkbox/checkbox-group/radio-group/switch + button-group-select）

> Plan Status: completed
> Mission: component-audit
> Work Item: C2.3
> Last Reviewed: 2026-08-03
> Source: `docs/backlog/component-audit-roadmap.md`（C2.x Phase Details）、`docs/audits/component-audit-checklist.md`（18 维 + 审计卡模板 + 自动修复纪律）、`docs/logs/2026/08-03.md`
> Related: 依赖 C0（`2026-08-02-2043-1`，completed）完成后开工；与 C2.4（`2026-08-03-0517-2`）/ C2.5（`2026-08-03-0517-3`）并行独立（均只依赖 C0）

## Purpose

对 `flux-renderers-form` 选择控件族 6 个注册组件（select/checkbox/checkbox-group/radio-group/switch/button-group-select）完成 18 维逐组件审计（每组件一张审计卡，P0/P1/P2/P3 裁决留痕），P0/P1 缺陷在**同一 plan 内自动修复**（test-first + 回归测试 + 受影响包验证门禁），每族完成 ≥1 个真实浏览器组合宿主场景验证（含 bug 73 模式"单测绿但真机失败"专项检查），最终 6 张审计卡全部 `closed`（P0/P1 清零）。本族是 C2.x form 族的收尾主力族（C2.1/C2.2 已 done），承接 roadmap「已知组件级缺陷样本」中 `combobox-item` data-value 缺口核对（`select-combobox-lists.tsx:63`，DOM 契约测试冻结该缺口——需以 live 状态复验是否已修复），并承接 C2.1 Non-Blocking Follow-up：form Enter 提交排除清单需核对 checkbox/switch（`role="checkbox"`/`role="switch"`）在 form body 内的交互宿主语义。本族完成后 form 族仅剩 C2.4/C2.5。

## Current Baseline

- **组件与文件**：6 组件注册定义——select `input.tsx:551`、checkbox `input.tsx:593`、switch `input.tsx:602`、radio-group `input.tsx:612`、checkbox-group `input.tsx:626`、button-group-select `input.tsx:643`；渲染实现——`input-choice-renderers.tsx`（select `:382`、switch `:607`、radio-group `:668`，共享 choice 工厂）、`checkbox-group-renderer.tsx`（type 标记 `:43`）、`button-group-select-renderer.tsx`、`select-combobox-lists.tsx`、`select-mobile-renderer.tsx`、`use-select-remote-search.ts`（远程搜索异步生命周期）、`use-dict-options.ts`（dict 选项解析）。
- **Schema 契约**：`schemas.ts`——SelectSchema `:133`（options/groups/dict/multiple/searchable/clearable/filterOption/virtual/optionTemplate/searchSource/searchMergeMode）、RadioGroupSchema `:164`、CheckboxGroupSchema `:169`、CheckboxSchema `:238`、SwitchSchema `:245`、ButtonGroupSelectSchema `:259`。
- **设计文档**：6 组件中 5 份 design.md 存在（`docs/components/{select,checkbox,checkbox-group,radio-group,switch}/design.md` + example.json）；**button-group-select 无 design.md**（2026-08-02 注册，仅 DOM 契约测试 `button-group-select-dom-contract.test.tsx`）——维度 17 文档对照缺口，需补齐或裁定。
- **playground**：6 个 lab 页全部存在（`apps/playground/src/component-lab/renderers/{select,checkbox,checkbox-group,radio-group,switch,button-group-select}-lab-page.tsx`）。
- **既有单测**：`field-controls-dom-contract.test.tsx`（含 `:293` "combobox-item exposes data-value equal to option.value"——roadmap 已知缺陷样本的契约测试，live `select-combobox-lists.tsx:67` 已输出 `data-value`，需复验该样本是否已修复/待回写）、`button-group-select-dom-contract.test.tsx`、`checkbox-group-selection.test.tsx`、`choice-touch-adaptation.test.tsx`、`select-controlled-value-echo.test.tsx`、`select-dict-loading.test.tsx`、`select-enhancements.test.tsx`、`select-option-template.test.tsx`、`select-option-template-click.test.tsx`、`select-remote-search.test.tsx`、`select-responsive.test.tsx`、`select-virtual-filter.test.tsx`。
- **e2e**：无本族专有 spec（`tests/e2e/select-helpers.ts` 仅为 helper）——宿主场景需新增 spec。
- **历史基础**：本族曾经历 select-enhancements（2026-06 系列）、select 移动端适配、remote-search 异步生命周期（`use-select-remote-search.ts`）等演进；`button-group-select` 于 2026-08-02 mission-driver 注册（DOM 契约测试随 C0 基线全绿，见 `docs/logs/2026/08-02.md`）。
- **C2.1 交棒**：form Enter 提交排除清单现覆盖 textarea/button/a/contenteditable/role="button"（C2.1 完成态），checkbox/switch 的 `role="checkbox"`/`role="switch"` 语义是否需纳入排除清单由本族审计裁决（C2.1 plan Non-Blocking Follow-ups 登记，归属 CR 或本族按发现实际处理）。

## Goals

- 6 张审计卡（select/checkbox/checkbox-group/radio-group/switch/button-group-select）18 维全表 + `文件:行` 证据 + P0/P1/P2/P3 裁决，全部 `closed`（P0/P1 清零）。
- 本族 P0/P1 缺陷 test-first 自动修复（契约/公共层修复 Must automate），P2 低成本当场修复、其余登记卡内 backlog 归 CR。
- ≥1 个真实浏览器组合宿主场景（含 bug 73 模式专项）：候选——form 内 select 选择写回并提交（bug 73 模式）、远程搜索异步（竞态/失败态）、checkbox-group/switch 值进 store、button-group-select 提交。
- roadmap「已知缺陷样本」`combobox-item` data-value 以 live 状态复验并回写（fixed 或带回证据裁定）。
- roadmap C2.3 行标 `done`（独立子 agent closure-audit pass 后）；C2.1 follow-up（Enter 排除清单）按审计结果处理或显式移入 CR。

## Non-Goals

- C2.4/C2.5 及以后族组件（date/markdown-editor/复合族）。
- checklist v2 修订（CG）、审计工具脚本升级（CG）。
- 结构性重构（公共 API/包边界/编译期机制，需人工确认后另立 CX-n；纯行为修复不视为结构性）。
- 各审计卡 P2 backlog（>15 分钟项）归 CR 处理，不在本 plan 内实现。

## Scope

### In Scope

- 6 组件 × 18 维审计卡（维度重点：1 Schema 契约（fields 与 schemas.ts 一致、searchSource/dict/options 声明）、2 RendererComponentProps 合规、3 值所有权三态（select 受控 echo、checkbox/switch 布尔与 indeterminate、checkbox-group/radio-group 选择集、defaultValue/initValue/valueStatePath）、4 表单参与（name/required/validation、提交数据形状、校验错误展示与清除、data-field-\*）、5 DOM 与选择器契约（data-field/data-renderer/data-value/data-testid、combobox-item data-value 复验、marker 唯一性）、6 嵌套 schema 分类（optionTemplate/searchSource/onChange 内嵌 action 分类、无 deepFields 残留）、7 事件与 action 契约（onChange payload 形状、normalizeActionEvent 语义）、8 a11y（select 组合框 role=combobox/listbox + aria-expanded/controls/activedescendant 沿用 C2.2 input-suggest 契约、checkbox/switch role 语义与键盘路径、键盘完整操作）、9 i18n（noResultsText/searchPlaceholder 等文案与 locale key 存在性）、10 四态覆盖（空选项/加载/错误/禁用/readOnly）、11 异步生命周期（select searchSource 远程搜索 abort/竞态/失败态/重试、dict 加载失败路径）、12 组合宿主场景、13 样式契约（widget 自样式 vs 布局仅 marker）、14 React 19、15 性能边界（大选项虚拟滚动 select-virtual-filter、受控 echo 稳定性、key 稳定性）、16 测试质量、17 文档对照（5 份 design.md ↔ 实现；**button-group-select 文档缺口**）、18 注册/包边界/IO 安全红线（dict/searchSource 走 env IO 边界 INV-1、无 XSS 注入风险面）。
- combobox-item data-value 已知样本复验（维度 5）+ form Enter 提交排除清单核对（C2.1 交棒）。
- P0/P1 自动修复（test-first）+ P2 低成本即时修复。
- 真实浏览器宿主场景（form 内选择控件组合提交（bug 73 模式）、select 远程搜索、button-group-select 提交）。
- 审计卡状态流转（open → fixing → fixed-pending-closure → closed）与 daily log 记录。

### Out Of Scope

- C2.4/C2.5 及以后族组件。
- checklist v2 修订（CG）。
- 结构性重构（需人工确认后另立 CX-n）。
- e2e pre-existing 其余 8 项（ai/scheduling/content 包，successor C8.1/C9/CV）。

## Failure Paths

| 可测场景编号         | 触发                                            | 行为（含错误码）                              | 可重试 | 用户可见表现           |
| -------------------- | ----------------------------------------------- | --------------------------------------------- | ------ | ---------------------- |
| host-choice-submit   | form 内 select/checkbox/switch 组合提交（真机） | 选择值进入 store 并提交正确（bug 73 模式）    | 是     | 提交结果正确回显       |
| host-select-remote   | select searchSource 远程搜索失败/竞态           | abort/失败态正确、无 stale 数据、页面不崩     | 是     | 错误提示或降级本地过滤 |
| host-combobox-value  | combobox-item 点击选择                          | 选项值（含 0/空字符串等 falsy value）正确写回 | 是     | 选中项正确回显         |
| host-bgs-submit      | button-group-select 单/多选提交                 | 值形状（string[]）正确进 store 并提交         | 是     | 提交值正确回显         |
| host-controlled-echo | 受控值外部更新（select/switch）                 | echo 正确、无 stale 值、无循环                | 是     | 值随外部 scope 同步    |

## Test Strategy

本档选择：**必须自动化** —— 选择控件是表单核心回归路径（AGENTS.md 测试分层第一档），且本族涉及 DOM 契约（combobox-item data-value 复验）、异步生命周期（远程搜索）与提交数据形状等契约面；契约/公共层修复必须 test-first（先写失败复现测试再实现）。验证门禁：受影响包 `pnpm --filter @nop-chaos/flux-renderers-form typecheck/build/lint/test` + 本族新增宿主场景 Playwright（programmatic DOM 断言，禁截图诊断）+ 既有相关 e2e 回归。

## Execution Plan

### Phase 1 - 逐组件 18 维审计与审计卡产出

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/{input.tsx,input-choice-renderers.tsx,checkbox-group-renderer.tsx,button-group-select-renderer.tsx,select-combobox-lists.tsx,select-mobile-renderer.tsx,use-select-remote-search.ts,use-dict-options.ts}`、`schemas.ts`、`docs/audits/per-component/`

- Item Types: `Proof | Fix`

- [x] 审计前核对注册定义与 roadmap 一致性：6 组件注册项（type/fields/componentCapabilityContracts）与 `schemas.ts` 类型一致（维度 1/18）；**roadmap Work Item Status 表 live 核对**：CX-1..CX-4（事后回写 planned 项）父 plan（C1.1/C1.2/C1.3/C2.2）均已 completed + closure audit 通过 → 按 roadmap 自动修复机制 §7b 一并标 `done`（留痕 daily log）；combobox-item data-value 已知缺陷样本 live 复验（`select-combobox-lists.tsx:67` 已输出 data-value + 契约测试 `:293` 存在 → 裁定已修复并回写 roadmap 基线节）。
- [x] 逐组件产出审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），P0/P1/P2/P3 裁决留痕（checklist §3）。
- [x] 维度重点核查：值所有权三态（维度 3：select 受控 echo（select-controlled-value-echo.test.tsx）、checkbox/switch 布尔语义、checkbox-group/radio-group 选择集与 maxSelected/minSelected/checkAll）；表单参与（维度 4：name/required/validation、校验错误展示与清除、data-field-\* 与 08-01 契约对齐）；DOM 契约（维度 5 + `check:audit-missing-renderer-markers`：data-field/data-renderer/data-value/data-testid、combobox-item/option-item data-value 全路径）。
- [x] 异步生命周期专项（维度 11）：select searchSource 远程搜索（`use-select-remote-search.ts` debounce 300ms/abort/竞态/失败态/重试/`searchMergeMode` append/replace）、dict 加载失败路径（`use-dict-options.ts`）；env IO 边界 INV-1 核对。
- [x] 嵌套 schema 分类复验（维度 6）：optionTemplate/searchSource/onChange 内嵌 action 分类与 08-02 机制一致；无 deepFields 残留。
- [x] a11y 专项（维度 8）：select 组合框 ARIA 契约（role=combobox/listbox + aria-expanded/controls/activedescendant，对齐 C2.2 input-suggest 契约）；checkbox/switch 的 role/键盘路径与 form Enter 提交排除清单核对（C2.1 交棒项——form body 内 checkbox/switch 是否需扩展排除语义，裁定后同步 C2.1 结论）；移动端触摸适配（choice-touch-adaptation.test.tsx）。
- [x] 四态覆盖（维度 10：空选项/加载/错误/禁用/readOnly）与测试质量（维度 16：既有 select-\* 测试断言正确行为而非 not-throw）；React 19 规范（维度 14）、性能边界（维度 15：select-virtual-filter 大选项虚拟滚动、key 稳定性）。
- [x] 文档对照（维度 17）：5 份 design.md ↔ 实现 props/行为逐项核对；**button-group-select 无 design.md——按族内 conventions 补齐 design.md（或裁定其注册契约以 DOM 契约测试为准并显式记录）**；quick-reference.md 词条准确性。

Exit Criteria:

> 本 Phase 交付 6 张审计卡（含裁决）与 roadmap 一致性核对结果，是后续修复的唯一事实来源。

- [x] `docs/audits/per-component/{select,checkbox,checkbox-group,radio-group,switch,button-group-select}.md` 6 张卡存在，18 维表完整、`文件:行` 证据可验证。
- [x] 每卡发现清单带 P0/P1/P2/P3 裁决；无 P0/P1 的卡标记 `closed`，其余 `open`；combobox-item data-value 样本复验结论、button-group-select 文档缺口裁定已记录；roadmap CX-1..CX-4 `done` 回写已留痕。

### Phase 2 - P0/P1 自动修复（test-first）

Status: completed
Targets: 发现涉及的 renderer/定义文件、schemas.ts、契约测试文件、e2e spec

- Item Types: `Fix | Proof | Decision`

- [x] 按审计卡逐个处理 P0/P1：先写复现/回归测试（断言正确行为，非仅 not-throw），再实现修复；DOM/选择器契约变更追加 focused 契约测试与 e2e（test-first 证据：复现测试先于实现）。
- [x] P2 低成本（约 15 分钟内）当场修复；其余登记卡内 backlog 归 CR。
- [x] 共性缺陷裁决（Decision）：同一根因影响 ≥2 组件/跨包/公共层的发现 → 按 roadmap 自动修复机制 §7 处理（当前 plan 内多阶段优先修复并事后回写 CX-n，或插入 CX-n work item）；根因单点的 `shared:` 标记归 CR。
- [x] 修复后卡内发现标 `fixed` + commit/plan 引用；卡状态流转 `open → fixing → fixed-pending-closure`。
- [x] 复杂/跨包 bug 修复按 AGENTS.md Bug Fix Test Coverage Rule 记录到 `docs/bugs/`（参考 `docs/bugs/73-*.md` 格式）。

Exit Criteria:

> 本 Phase 交付"发现清零或已裁定"，卡状态与代码行为一致。

- [x] 全部 P0/P1 已修复（卡内标 `fixed` + 证据）或已显式裁定延期（仅允许依赖未落地跨 plan 机制者，标「机制落地后复验」并登记）；无静默跳过。
- [x] 受影响包 `pnpm --filter @nop-chaos/flux-renderers-form typecheck && build && lint && test` 绿（含新增回归测试）。

### Phase 3 - 组合宿主真实浏览器场景

Status: completed
Targets: `tests/e2e/component-lab/` 新增/修改 spec、playground lab 页

- Item Types: `Proof | Fix`

- [x] 设计并实现 ≥1 个本族真实浏览器组合宿主场景（programmatic DOM 断言，禁截图诊断）：候选——form 内 select/checkbox/switch/button-group-select 组合提交（bug 73 模式：输入 → store 更新 → 提交值正确）、select 远程搜索交互（含失败/竞态降级）、combobox-item 含 falsy value（0/''）选项选择写回。
- [x] bug 73 模式专项检查：在宿主场景中显式验证单测绿但真机失败类风险。
- [x] 宿主场景发现的新缺陷按 Phase 2 流程修复（test-first）。
- [x] 既有相关 e2e（complex-form/simple-form/field-controls 等）在本族改动后回归。

Exit Criteria:

> 本 Phase 交付"真实浏览器行为成立"。

- [x] 宿主场景 spec 通过（Playwright，programmatic DOM 断言）；本族组件改动的回归 spec 绿。
- [x] bug 73 模式专项检查结论记录于 daily log（pass 或带证据 fail→已修复）。

### Phase 4 - 族内回归与审计卡 closure

Status: completed
Targets: 6 张审计卡、`docs/logs/2026/08-03.md`、`docs/backlog/component-audit-roadmap.md`（C2.3 行 + CX 行状态核对）

- Item Types: `Proof`

- [x] 全卡复查：18 维表结论与最终代码一致；P0/P1 清零；卡状态全部 `closed`（含 fixed-pending-closure → closed 流转）。
- [x] 本族范围回归：`pnpm --filter @nop-chaos/flux-renderers-form test` + 相关 e2e spec 全绿；如本 plan 触及公共层（flux-react/field-frame/编译器），追加受影响包验证并记录。
- [x] daily log 记录：6 卡 closure 汇总、修复清单（commit/plan 引用）、宿主场景结果、CX-n 插入（如有）与决策、CX-1..4 done 回写与 combobox-item 样本裁定记录。
- [x] 若插入了 CX-n：同步更新 roadmap Work Item Status 表（新行 + 依赖边/注释）并按 §7b（事后回写：父 plan closure 后标 done）/§7c（正常生命周期）走；结构性 CX-n 执行前标注待人工确认。
- [x] roadmap C2.3 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审）。

Exit Criteria:

> 本 Phase 交付"可进入 closure-audit 的完成态"。

- [x] 6 张审计卡全部 `closed`；`docs/audits/per-component/` 汇总可读。
- [x] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置、C2.1 follow-up 处置结论）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session（task `ses_03ba63498ffeBjdTeoeBglKloX`）
- Verdict: `pass`（零 Blocker/Major；2 Minor 已处理：checkbox-group-renderer.tsx `:43` 措辞改「type 标记」、C2.1 follow-up 表述微调）
- Rounds: 1
- Findings addressed: 全部文件/行引用经 live repo 核对通过（input.tsx:551/:593/:602/:612/:626/:643、input-choice-renderers.tsx:382/:607/:668、select-combobox-lists.tsx:67 data-value、schemas.ts 六接口、field-controls-dom-contract.test.tsx:293、5 份 design.md 存在 + button-group-select design.md 缺失、6 lab 页、12 测试文件、无本族 e2e spec、roadmap CX-1..4 planned + §7b 回写逻辑、C2.1 Enter 排除清单交棒）；Minor 已处理。

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。

- [x] 6 张审计卡存在、18 维表完整、P0/P1 清零、全部 `closed`
- [x] 全部 in-scope P0/P1 已 test-first 修复并有回归测试；无被静默降级到 deferred 的 live defect/contract drift
- [x] ≥1 个真实浏览器组合宿主场景通过（含 bug 73 模式专项检查）
- [x] combobox-item data-value 已知样本已复验并回写（fixed 或带回证据裁定）；C2.1 follow-up（Enter 排除清单）已按审计结果处置或显式移入 CR
- [x] 共性缺陷已按 §7 处理（CX-n 插入/合并或当前 plan 内修复，决策记录在卡与 daily log）
- [x] 受影响的 owner docs 已同步到 live baseline（design.md/quick-reference/roadmap 表按发现实际影响为准；button-group-select 文档缺口已补齐或显式裁定）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 各审计卡 P2 backlog（成本 >15 分钟的非阻断体验/文档/测试加固项）

- Classification: `optimization candidate`
- Why Not Blocking Closure: checklist §3 明确 P2 可入审计卡 backlog 由 CR 自动处理；不阻塞本族 supported baseline 成立。
- Successor Required: `yes`
- Successor Path: CR work item（跨族集中修复）

### 依赖未落地跨 plan 机制的发现（若有，「机制落地后复验」）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 依赖的机制未落地时无法在卡内闭合；按 checklist §3 自动修复纪律（「机制落地后复验」显式登记）由 CR 集中复验，卡内不悬挂。
- Successor Required: `yes`
- Successor Path: CR work item

### e2e pre-existing 其余 8 项（ai/scheduling/content 包）

- Classification: `watch-only residual`
- Why Not Blocking Closure: C0 已逐项裁定为 mission 未触及包失败，successor 归属 C8.1/C9/CV；不在本族 scope。
- Successor Required: `yes`
- Successor Path: C8.1/C9/CV work item

## Non-Blocking Follow-ups

- 审计中发现但裁定为 P3（风格 nit/注释）的项仅卡内记录，不处理。
- 工具脚本新增模式（若有）记入卡内，CG 统一升级。

## Closure

Status Note: 2026-08-03 四 Phase 全部执行完成（Plan Status: completed）。6 卡 closed、P0/P1 清零、宿主场景 5/5、workspace 全量验证绿。closure-audit 由独立子 agent 执行（task `ses_03b60f3d0ffe0WzxJ5baVcQWAW`）pass 后收口；roadmap C2.3 行与 CX-5/CX-6 已按 §7b 标 `done`。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session（task `ses_03b60f3d0ffe0WzxJ5baVcQWAW`）
- Evidence: `approved`（零 Blocker/Major；1 Minor 已处理：遗留 debug spec `c2-3-debug.spec.ts` 已删除）。复核范围：plan 文本一致性（Phase 1-4 `completed` + 全部 `[x]`、Plan Status completed、Closure Gates 11 项）、6 卡 18 维表 + ~20 处 `文件:行` 证据抽查、代码修复落点（choiceSingleAdapter/selectedValue 归一/三 marker/form.tsx Enter 排除 + defaultPrevented/searchFailureMessage/dict errorMessage 惰性 t()/fields 补齐/data-value/schemas dict/i18n keys/design.md 补齐）、回归测试断言正确性（7 个测试文件）、form 包 677 tests 与 workspace typecheck 31/31 与 c2-3 e2e 5/5 独立重跑、deferred 诚实性（P3 卡内记录、无 P0/P1 降级、CX-5/CX-6 planned 证据成立、C2.3 未提前标 done）、owner-doc 同步（bgs design.md 新建、radio-group design.md 同步、roadmap 基线回写、daily log）。

Follow-up:

- P3 项（select loading 时 clearable 可用、checkbox-group aria-errormessage 未接、required=false 平台语义）登记卡内归 CR；`check:audit-missing-renderer-markers` 假阴性升级归 CG。
