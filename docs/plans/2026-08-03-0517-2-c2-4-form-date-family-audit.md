# C2.4 form 日期族逐组件审计（input-date/input-datetime/input-time/date-range/input-month/input-quarter/input-year）

> Plan Status: completed
> Mission: component-audit
> Work Item: C2.4
> Last Reviewed: 2026-08-03
> Source: `docs/backlog/component-audit-roadmap.md`（C2.x Phase Details）、`docs/audits/component-audit-checklist.md`（18 维 + 审计卡模板 + 自动修复纪律）、`docs/logs/2026/08-03.md`
> Related: 依赖 C0（`2026-08-02-2043-1`，completed）完成后开工；与 C2.3（`2026-08-03-0517-1`）/ C2.5（`2026-08-03-0517-3`）并行独立（均只依赖 C0）

## Purpose

对 `flux-renderers-form` 日期族 7 个注册组件（input-date/input-datetime/input-time/date-range/input-month/input-quarter/input-year）完成 18 维逐组件审计（每组件一张审计卡，P0/P1/P2/P3 裁决留痕），P0/P1 缺陷在**同一 plan 内自动修复**（test-first + 回归测试 + 受影响包验证门禁），每族完成 ≥1 个真实浏览器组合宿主场景验证（含 bug 73 模式"单测绿但真机失败"专项检查），最终 7 张审计卡全部 `closed`（P0/P1 清零）。本族为 form 族最后的大族（选择控件族 C2.3 并行独立），重点关注日期值格式与三态值所有权、validation（min/max/format）、date 控件交互与真实浏览器输入路径、i18n 与 locale 语义。

## Current Baseline

- **组件与文件**：7 组件注册定义全部在 `date-renderer-definitions.ts`（input-date `:47`、input-datetime `:59`、input-time `:81`、date-range `:101`、input-month `:125`、input-quarter `:137`、input-year `:149`）；渲染实现——`input-date-renderer.tsx`、`input-datetime-renderer.tsx`、`input-time-renderer.tsx`、`date-range-renderer.tsx`、`period-renderers.tsx`（input-month/quarter/year 共享工厂，marker `nop-input-month` `:27`/`nop-input-quarter` `:29`/`nop-input-year` `:31`）、`date/date-field-control.tsx`（共享日期字段控件）、`date/date-utils.ts`（日期工具 + `date-utils.test.ts`）。
- **Schema 契约**：`schemas.ts`——input-date `:316`、input-datetime `:327`、input-time `:339`、input-month|input-quarter|input-year 联合 `:368`（`selectionMode: 'single' | 'range'` 语义见 `:364` 注释）。
- **设计文档**：7 份 design.md 全部存在（`docs/components/{input-date,input-datetime,input-time,date-range,input-month,input-quarter,input-year}/design.md`）。
- **playground**：7 个 lab 页全部存在（`apps/playground/src/component-lab/renderers/{input-date,input-datetime,input-time,date-range,input-month,input-quarter,input-year}-lab-page.tsx`）。
- **既有单测**：`input-date.test.tsx`、`input-date-relative.test.tsx`（relative 快捷值）、`input-datetime.test.tsx`、`date-range.test.tsx`。
- **e2e**：`tests/e2e/w2b-date-family.spec.ts` 已存在（日期族既有覆盖）。
- **历史基础**：日期族经历过相对日期（relative）、date-field-control 共享化、period-renderers 工厂化等演进；i18n key 体系与 C2.2 文本输入族同源（`check:i18n-keys` 基线），日期格式/语言环境语义需逐组件核对。

## Goals

- 7 张审计卡（input-date/input-datetime/input-time/date-range/input-month/input-quarter/input-year）18 维全表 + `文件:行` 证据 + P0/P1/P2/P3 裁决，全部 `closed`（P0/P1 清零）。
- 本族 P0/P1 缺陷 test-first 自动修复（契约/公共层修复 Must automate），P2 低成本当场修复、其余登记卡内 backlog 归 CR。
- ≥1 个真实浏览器组合宿主场景（含 bug 73 模式专项）：候选——form 内日期选择/输入提交（bug 73 模式）、date-range 范围选择、input-month/quarter/year 提交。
- roadmap C2.4 行标 `done`（独立子 agent closure-audit pass 后）。

## Non-Goals

- C2.3/C2.5 及以后族组件（选择控件/markdown-editor/复合族）。
- checklist v2 修订（CG）、审计工具脚本升级（CG）。
- 结构性重构（公共 API/包边界/编译期机制，需人工确认后另立 CX-n；纯行为修复不视为结构性）。
- 各审计卡 P2 backlog（>15 分钟项）归 CR 处理，不在本 plan 内实现。

## Scope

### In Scope

- 7 组件 × 18 维审计卡（维度重点：1 Schema 契约（fields 与 schemas.ts 一致、dateFormat/format/inputFormat/min/max/relative/selectionMode 声明与默认值）、2 RendererComponentProps 合规、3 值所有权三态（日期值格式与受控 echo、defaultValue/initValue/valueStatePath、清空/重置、越界 clamp）、4 表单参与（name/required/validation 挂接、min/max 校验、提交数据形状（字符串/时间戳/范围数组）、校验错误展示与清除、data-field-\*）、5 DOM 与选择器契约（data-field/data-renderer/data-value/data-testid、date-field-control 共享控件 DOM 契约）、6 嵌套 schema 分类（无 deepFields 残留、内嵌 action 分类）、7 事件与 action 契约（onChange payload 形状与日期值语义、normalizeActionEvent 语义）、8 a11y（date 控件键盘操作路径（原生 input date/自定义面板）、焦点管理、aria-label 走 i18n）、9 i18n（日期格式/语言环境、placeholder/快捷文案 key 存在性）、10 四态覆盖（空值/加载（relative 异步？）/错误/禁用/readOnly）、11 异步生命周期（若有 dateSource/异步默认值：abort/竞态；无则 n-a 注明）、12 组合宿主场景、13 样式契约（widget 自样式 vs 布局仅 marker）、14 React 19、15 性能边界（date-field-control 共享渲染 key 稳定性、range 双面板）、16 测试质量（既有 4 组测试断言正确行为）、17 文档对照（7 份 design.md ↔ 实现 props/行为）、18 注册/包边界/IO 安全红线（日期字符串解析安全性、无 XSS 注入面、注册定义与 bundle 导出完整））。
- P0/P1 自动修复（test-first）+ P2 低成本即时修复。
- 真实浏览器宿主场景（form 内日期控件组合提交（bug 73 模式）、date-range 范围选择与提交）。
- 审计卡状态流转（open → fixing → fixed-pending-closure → closed）与 daily log 记录。

### Out Of Scope

- C2.3/C2.5 及以后族组件。
- checklist v2 修订（CG）。
- 结构性重构（需人工确认后另立 CX-n）。
- e2e pre-existing 其余 8 项（ai/scheduling/content 包，successor C8.1/C9/CV）。

## Failure Paths

| 可测场景编号         | 触发                                       | 行为（含错误码）                           | 可重试 | 用户可见表现             |
| -------------------- | ------------------------------------------ | ------------------------------------------ | ------ | ------------------------ |
| host-date-submit     | form 内 input-date 选择/输入并提交（真机） | 日期值进入 store 并提交正确（bug 73 模式） | 是     | 提交结果正确回显         |
| host-range-submit    | date-range 起止选择并提交                  | 范围值（[start,end]）形状正确进 store      | 是     | 起止值正确回显           |
| host-period-submit   | input-month/quarter/year 提交              | 值（含 valueFormat 语义）正确进 store      | 是     | 提交值正确回显           |
| host-valid-bound     | min/max 越界输入                           | 校验错误正确展示与清除，不崩溃             | 是     | 错误提示可见、清除后消失 |
| host-controlled-echo | 受控日期值外部更新                         | echo 正确、无 stale 值、无循环             | 是     | 值随外部 scope 同步      |

## Test Strategy

本档选择：**必须自动化** —— 日期控件是表单核心回归路径（AGENTS.md 测试分层第一档），且本族涉及值形状契约（日期字符串/时间戳/范围）、校验参与与真实浏览器输入路径；契约/公共层修复必须 test-first（先写失败复现测试再实现）。验证门禁：受影响包 `pnpm --filter @nop-chaos/flux-renderers-form typecheck/build/lint/test` + `tests/e2e/w2b-date-family.spec.ts` 回归 + 本族新增宿主场景 Playwright（programmatic DOM 断言，禁截图诊断）。

## Execution Plan

### Phase 1 - 逐组件 18 维审计与审计卡产出

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/{date-renderer-definitions.ts,input-date-renderer.tsx,input-datetime-renderer.tsx,input-time-renderer.tsx,date-range-renderer.tsx,period-renderers.tsx}`、`date/{date-field-control.tsx,date-utils.ts}`、`schemas.ts`、`docs/audits/per-component/`

- Item Types: `Proof`

- [x] 审计前核对注册定义：7 组件注册项（type/fields/componentCapabilityContracts）与 `schemas.ts` 类型一致（维度 1/18）；period-renderers 共享工厂 3 组件（input-month/quarter/year）注册与渲染映射完整性核对。
- [x] 逐组件产出审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），P0/P1/P2/P3 裁决留痕（checklist §3）。
- [x] 维度重点核查：值所有权三态（维度 3：日期值格式语义（valueFormat/inputFormat）、受控 echo、defaultValue/initValue/valueStatePath、清空/重置、min/max 越界 clamp）；表单参与（维度 4：name/required/min/max 校验挂接、提交数据形状（单值字符串/时间戳、range [start,end]）、校验错误展示与清除、data-field-\* 与 08-01 契约对齐）。
- [x] 值形状契约专项（维度 3/4/7）：input-date/input-datetime/input-time/date-range/period 五类值语义与 design.md/AMIS baseline 对照；onChange payload 形状（normalizeActionEvent 语义）。
- [x] a11y 专项（维度 8）：date 控件键盘完整操作路径（原生 input date 降级 vs 自定义面板）、焦点管理、aria-label 走 i18n（维度 9 交叉）。
- [x] 四态覆盖（维度 10）与测试质量（维度 16：input-date/input-date-relative/input-datetime/date-range 既有测试断言正确行为）；React 19 规范（维度 14）、性能边界（维度 15：date-field-control 共享渲染 key 稳定性）。
- [x] 文档对照（维度 17）：7 份 design.md ↔ 实现 props/行为逐项核对；quick-reference.md 词条准确性。

Exit Criteria:

> 本 Phase 交付 7 张审计卡（含裁决），是后续修复的唯一事实来源。

- [x] `docs/audits/per-component/{input-date,input-datetime,input-time,date-range,input-month,input-quarter,input-year}.md` 7 张卡存在，18 维表完整、`文件:行` 证据可验证。
- [x] 每卡发现清单带 P0/P1/P2/P3 裁决；无 P0/P1 的卡标记 `closed`，其余 `open`；值形状契约结论已记录。

### Phase 2 - P0/P1 自动修复（test-first）

Status: completed
Targets: 发现涉及的 renderer/定义文件、schemas.ts、契约测试文件、e2e spec

- Item Types: `Fix | Proof | Decision`

- [x] 按审计卡逐个处理 P0/P1：先写复现/回归测试（断言正确行为，非仅 not-throw），再实现修复；DOM/选择器契约变更追加 focused 契约测试与 e2e（test-first 证据：复现测试先于实现）。
- [x] P2 低成本（约 15 分钟内）当场修复；其余登记卡内 backlog 归 CR。
- [x] 共性缺陷裁决（Decision）：同一根因影响 ≥2 组件/跨包/公共层（如 date-field-control 共享层、period-renderers 工厂）的发现 → 按 roadmap 自动修复机制 §7 处理（当前 plan 内多阶段优先修复并事后回写 CX-n，或插入 CX-n work item）；根因单点的 `shared:` 标记归 CR。
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

- [x] 设计并实现 ≥1 个本族真实浏览器组合宿主场景（programmatic DOM 断言，禁截图诊断）：候选——form 内 input-date/date-range/input-month 组合提交（bug 73 模式：输入 → store 更新 → 提交值正确）、date-range 起止选择写回、min/max 越界校验展示与清除。
- [x] bug 73 模式专项检查：在宿主场景中显式验证单测绿但真机失败类风险（真实浏览器输入日期 → store 更新 → 提交值形状正确）。
- [x] 宿主场景发现的新缺陷按 Phase 2 流程修复（test-first）。
- [x] 既有相关 e2e（`tests/e2e/w2b-date-family.spec.ts` 等）在本族改动后回归。

Exit Criteria:

> 本 Phase 交付"真实浏览器行为成立"。

- [x] 宿主场景 spec 通过（Playwright，programmatic DOM 断言）；本族组件改动的回归 spec 绿（含 w2b-date-family.spec.ts）。
- [x] bug 73 模式专项检查结论记录于 daily log（pass 或带证据 fail→已修复）。

### Phase 4 - 族内回归与审计卡 closure

Status: completed
Targets: 7 张审计卡、`docs/logs/2026/08-03.md`、`docs/backlog/component-audit-roadmap.md`（C2.4 行）

- Item Types: `Proof`

- [x] 全卡复查：18 维表结论与最终代码一致；P0/P1 清零；卡状态全部 `closed`（含 fixed-pending-closure → closed 流转）。
- [x] 本族范围回归：`pnpm --filter @nop-chaos/flux-renderers-form test` + 相关 e2e spec 全绿；如本 plan 触及公共层（flux-react/field-frame/编译器），追加受影响包验证并记录。
- [x] daily log 记录：7 卡 closure 汇总、修复清单（commit/plan 引用）、宿主场景结果、CX-n 插入（如有）与决策。
- [x] 若插入了 CX-n：同步更新 roadmap Work Item Status 表（新行 + 依赖边/注释）并按 §7b（事后回写：父 plan closure 后标 done）/§7c（正常生命周期）走；结构性 CX-n 执行前标注待人工确认。
- [x] roadmap C2.4 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审）。

Exit Criteria:

> 本 Phase 交付"可进入 closure-audit 的完成态"。

- [x] 7 张审计卡全部 `closed`；`docs/audits/per-component/` 汇总可读。
- [x] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session（task `ses_03ba624d3ffeVKhl0C1HgPo9B2`）
- Verdict: `pass`（零 Blocker/Major；2 Minor 已处理：checklist「§5.4」引用改「§3 自动修复纪律」、「§7c 走生命周期」改「§7b/§7c」）
- Rounds: 1
- Findings addressed: 全部文件/行引用经 live repo 核对通过（date-renderer-definitions.ts:47/:59/:81/:101/:125/:137/:149、schemas.ts:316/:327/:339/:368、period-renderers.tsx:27/:29/:31 marker、date/date-field-control.tsx 与 date/date-utils.ts、7 份 design.md、7 lab 页、4 测试文件、w2b-date-family.spec.ts）；Minor 已处理。

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。

- [x] 7 张审计卡存在、18 维表完整、P0/P1 清零、全部 `closed`
- [x] 全部 in-scope P0/P1 已 test-first 修复并有回归测试；无被静默降级到 deferred 的 live defect/contract drift
- [x] ≥1 个真实浏览器组合宿主场景通过（含 bug 73 模式专项检查）
- [x] 值形状契约（单值/范围/period）已核对并收敛（发现已修复或显式裁定）
- [x] 共性缺陷已按 §7 处理（CX-n 插入/合并或当前 plan 内修复，决策记录在卡与 daily log）
- [x] 受影响的 owner docs 已同步到 live baseline（design.md/quick-reference/roadmap 表按发现实际影响为准）
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

Status Note: 2026-08-03 四 Phase 全部执行完成。7 卡 closed、P0/P1 清零（P1×2：input-datetime `timeFormat` 零行为、period 族 `shortcuts` 零行为；P2×6 含共享 CX-7 日历 locale + i18n 硬编码文案 + 四态测试加固）、宿主场景 4/4、workspace 全量验证绿（typecheck 31/31、build 31/31、lint 31/31、test 58/58，form 包 677→700 tests）。Closure Gates「独立子 agent closure-audit」项已由 mission-driver CLOSURE_VERIFY 阶段 fresh session 独立审计 pass 后勾选并回填下方证据（form 包 700/700 与 c2-4 e2e 4/4 独立重跑绿、7 卡与代码落点核验通过）；roadmap C2.4 行标 `done`、CX-7 按 §7b 事后回写标 `done`（本 plan 为执行证据）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session（mission-driver CLOSURE_VERIFY 阶段，本 session；执行 session 不自审）
- Evidence: 独立复核通过——(1) 7 张审计卡全部 `closed`、18 维表完整、P0/P1 清零（P1-1 timeFormat / P1-2 shortcuts 卡内标 fixed，input-month/quarter/year 同根因共享修复）；(2) 代码落点核验：`date/date-field-control.tsx` timeFormat 秒粒度 + Calendar locale（enUS/zhCN 映射）+ i18n labels、`input-datetime-renderer.tsx` timeFormat prop、`period-renderers.tsx` shortcuts chips（`period-shortcut-*` testid）、`date-range-renderer.tsx` locale + i18n、`flux-i18n` `flux.date.*` 14 keys zh/en；(3) 独立重跑验证：`pnpm --filter @nop-chaos/flux-renderers-form test` **84 files / 700 tests 全绿**、`npx playwright test tests/e2e/component-lab/c2-4-host-surfaces.spec.ts` **4/4 全绿**（含 bug 73 模式 host-family-submit）；(4) roadmap C2.4 行 `done`、CX-7 按 §7b 标 `done`（本 plan 为执行证据）；(5) deferred 诚实性：P3 项卡内记录归 CR、e2e pre-existing 8 项归属 C8.1/C9/CV（C0 裁定）、无 P0/P1 静默降级；(6) owner-doc 同步：7 份 design.md §4/§4.1/§7.1 已同步（timeFormat/shortcuts/displayFormat/locale）、daily log `docs/logs/2026/08-03.md` C2.4 收口证据节已记录

Follow-up:

- 无 remaining plan-owned work；各卡 P3 项（date-field-control 焦点/失焦挂 PopoverContent、valueFormat 非法 token 无 schema 校验、date-range sr-only data-range-kind 断言钩子、外部越界值只读展示、input-time placeholder 原生不渲染、period 逐键即时提交、displayFormat 秒分辨率语义已文档化）登记卡内归 CR 归集。
