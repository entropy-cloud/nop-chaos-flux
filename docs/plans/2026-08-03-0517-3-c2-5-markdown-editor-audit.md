# C2.5 markdown-editor 逐组件审计

> Plan Status: active
> Mission: component-audit
> Work Item: C2.5
> Last Reviewed: 2026-08-03
> Source: `docs/backlog/component-audit-roadmap.md`（C2.x Phase Details）、`docs/audits/component-audit-checklist.md`（18 维 + 审计卡模板 + 自动修复纪律）、`docs/logs/2026/08-03.md`
> Related: 依赖 C0（`2026-08-02-2043-1`，completed）完成后开工；与 C2.3（`2026-08-03-0517-1`）/ C2.4（`2026-08-03-0517-2`）并行独立（均只依赖 C0）。本族完成后 form 族 C2.x 全部收官，form 包审计剩余为 C3.x（form-advanced 复合族，不在本 plan scope）

## Purpose

对 `flux-renderers-form` markdown-editor 单组件完成 18 维逐组件审计（一张审计卡，P0/P1/P2/P3 裁决留痕），P0/P1 缺陷在**同一 plan 内自动修复**（test-first + 回归测试 + 受影响包验证门禁），完成 ≥1 个真实浏览器组合宿主场景验证（含 bug 73 模式"单测绿但真机失败"专项检查），最终审计卡 `closed`（P0/P1 清零）。本组件是 form 族中唯一的编辑面+实时预览混合组件，安全红线（markdown 渲染 sanitize）是维度 18 重点；编辑器文本输入路径与 C2.2 文本输入族同源（Textarea），但预览渲染链路独立，需专项核对 XSS 注入面。

## Current Baseline

- **组件与文件**：单组件 `markdown-editor-renderer.tsx`（type 定义 `:174`，预览 fallback `data-slot="markdown-editor-preview-fallback"` `:129`，实现为 markdown 源码编辑（Textarea）+ 实时预览，文件头注释 `:141`）；注册经 `definitions.ts` → `formRendererDefinitions` → `registerFormRenderers`。
- **Schema 契约**：`schemas.ts:382`（`type: 'markdown-editor'`）。
- **设计文档**：`docs/components/markdown-editor/design.md` 存在（无 example.json，与多数 form 族组件不同——维度 17 可核对是否需要补）。
- **playground**：`apps/playground/src/component-lab/renderers/markdown-editor-lab-page.tsx` 存在。
- **既有单测**：`markdown-editor.test.tsx`。
- **e2e**：`tests/e2e/w3d-markdown-editor.spec.ts` 存在。
- **历史基础**：markdown 渲染的 sanitize 语义与 content 包 `markdown` 组件（C6.1 归属）共享依赖链路；编辑面 Textarea 路径在 C2.2 已审计（本组件复用其宿主契约，仅增量核对）；预览渲染 markdown 解析库与 sanitize 门禁需专项核对（与 content 包 C6.1 的 markdown 组件交叉，共性发现需按 §7 处理或显式交接 C6.1）。

## Goals

- 1 张审计卡（markdown-editor）18 维全表 + `文件:行` 证据 + P0/P1/P2/P3 裁决，`closed`（P0/P1 清零）。
- 本组件 P0/P1 缺陷 test-first 自动修复（契约/公共层修复 Must automate），P2 低成本当场修复、其余登记卡内 backlog 归 CR。
- ≥1 个真实浏览器组合宿主场景（含 bug 73 模式专项）：候选——form 内 markdown-editor 编辑+预览提交（bug 73 模式）、markdown 源码含潜在 XSS 载荷时预览渲染安全（sanitize 门禁）、受控值 echo。
- roadmap C2.5 行标 `done`（独立子 agent closure-audit pass 后）；form 族 C2.x 收官留痕。

## Non-Goals

- C2.3/C2.4 及以后族组件（选择控件/日期族/复合族 C3.x）。
- content 包 `markdown` 组件（C6.1 归属；本 plan 仅核对共享 sanitize 依赖链并交接共性发现）。
- checklist v2 修订（CG）、审计工具脚本升级（CG）。
- 结构性重构（公共 API/包边界/编译期机制，需人工确认后另立 CX-n；纯行为修复不视为结构性）。
- 各审计卡 P2 backlog（>15 分钟项）归 CR 处理，不在本 plan 内实现。

## Scope

### In Scope

- 1 组件 × 18 维审计卡（维度重点：1 Schema 契约（fields 与 schemas.ts 一致、默认值/placeholder/预览开关 prop）、2 RendererComponentProps 合规、3 值所有权三态（markdown 源码值受控 echo、defaultValue/initValue/valueStatePath、清空/重置）、4 表单参与（name/required/validation 挂接、提交数据形状、校验错误展示与清除、data-field-\*）、5 DOM 与选择器契约（data-field/data-renderer/data-value/data-testid、编辑面与预览面 marker/data-slot 契约、`markdown-editor-preview-fallback`）、6 嵌套 schema 分类（无 deepFields 残留、内嵌 action 分类）、7 事件与 action 契约（onChange payload 形状、normalizeActionEvent 语义）、8 a11y（编辑面 textarea label/aria、预览面可访问性语义、键盘路径）、9 i18n（placeholder/预览 toggle 文案 key 存在性）、10 四态覆盖（空值/加载/错误/禁用/readOnly）、11 异步生命周期（无远程请求则 n-a 注明；若有预览异步则核对）、12 组合宿主场景、13 样式契约（widget 自样式 vs 布局仅 marker）、14 React 19、15 性能边界（大文档实时预览重渲染、key 稳定性）、16 测试质量（markdown-editor.test.tsx 断言正确行为）、17 文档对照（design.md ↔ 实现 props/行为）、18 注册/包边界/IO 安全红线（**markdown 预览渲染 sanitize 门禁——XSS 注入面专项**，与 content 包 markdown 组件（C6.1）共享依赖链核对，共性发现按 §7 处理或显式交接））。
- P0/P1 自动修复（test-first）+ P2 低成本即时修复。
- 真实浏览器宿主场景（form 内 markdown-editor 编辑+提交（bug 73 模式）、XSS 载荷 sanitize 验证）。
- 审计卡状态流转（open → fixing → fixed-pending-closure → closed）与 daily log 记录。

### Out Of Scope

- C2.3/C2.4 及以后族组件；content 包 `markdown` 组件审计（C6.1）。
- checklist v2 修订（CG）。
- 结构性重构（需人工确认后另立 CX-n）。
- e2e pre-existing 其余 8 项（ai/scheduling/content 包，successor C8.1/C9/CV）。

## Failure Paths

| 可测场景编号     | 触发                                       | 行为（含错误码）                                  | 可重试 | 用户可见表现            |
| ---------------- | ------------------------------------------ | ------------------------------------------------- | ------ | ----------------------- |
| host-md-submit   | form 内 markdown-editor 编辑并提交（真机） | markdown 源码进入 store 并提交正确（bug 73 模式） | 是     | 提交结果正确回显        |
| host-md-xss      | markdown 源码含恶意 HTML/脚本载荷          | 预览渲染 sanitize 生效、无脚本执行                | 是     | 载荷以文本/安全形态呈现 |
| host-md-echo     | 受控 markdown 值外部更新                   | echo 正确、无 stale 值、无循环                    | 是     | 值随外部 scope 同步     |
| host-md-disabled | disabled/readOnly 态编辑面                 | 不可编辑、预览正常、不崩溃                        | 是     | 只读表现正确            |

## Test Strategy

本档选择：**必须自动化** —— markdown-editor 涉及安全红线（sanitize 门禁，维度 18）与表单核心提交路径，sanitize/契约类修复必须 test-first（先写失败复现测试再实现）；XSS 载荷场景必须以断言（无脚本执行/载荷不渲染为 HTML）验证而非截图。验证门禁：受影响包 `pnpm --filter @nop-chaos/flux-renderers-form typecheck/build/lint/test` + `tests/e2e/w3d-markdown-editor.spec.ts` 回归 + 本组件新增宿主场景 Playwright（programmatic DOM 断言）。

## Execution Plan

### Phase 1 - 逐组件 18 维审计与审计卡产出

Status: planned
Targets: `packages/flux-renderers-form/src/renderers/markdown-editor-renderer.tsx`、`definitions.ts`、`schemas.ts`、`docs/audits/per-component/`

- Item Types: `Proof`

- [ ] 审计前核对注册定义：markdown-editor 注册项（type/fields/componentCapabilityContracts）与 `schemas.ts:382` 一致（维度 1/18）；预览渲染依赖链（markdown 解析库与 sanitize 机制）定位。
- [ ] 产出审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），P0/P1/P2/P3 裁决留痕（checklist §3）。
- [ ] 维度重点核查：值所有权三态（维度 3：markdown 源码值受控 echo、defaultValue/initValue/valueStatePath）；表单参与（维度 4：name/required/validation、提交数据形状、data-field-\* 与 08-01 契约对齐）；DOM 契约（维度 5 + `check:audit-missing-renderer-markers`：data-field/data-renderer/data-value/data-testid、编辑面与预览面 data-slot）。
- [ ] **安全红线专项（维度 18）**：markdown 预览渲染 sanitize 门禁核对——恶意 HTML/script/img onerror/链接协议载荷在预览中的表现（escaped or removed）；与 content 包 `markdown` 组件（C6.1）共享依赖链核对；共性缺陷按 §7 处理或显式交接 C6.1（卡内记录）。
- [ ] a11y 专项（维度 8）：编辑面 textarea label/aria、预览面语义；i18n（维度 9：placeholder/文案 key 存在性）。
- [ ] 四态覆盖（维度 10：空值/加载/错误/禁用/readOnly）与测试质量（维度 16：markdown-editor.test.tsx 断言正确行为而非 not-throw）；React 19 规范（维度 14）、性能边界（维度 15：大文档实时预览重渲染）。
- [ ] 文档对照（维度 17）：design.md ↔ 实现 props/行为逐项核对；example.json 缺失是否影响可读性（低优先，P3 级）；quick-reference.md 词条准确性。

Exit Criteria:

> 本 Phase 交付 1 张审计卡（含裁决），是后续修复的唯一事实来源。

- [ ] `docs/audits/per-component/markdown-editor.md` 卡存在，18 维表完整、`文件:行` 证据可验证。
- [ ] 卡内发现清单带 P0/P1/P2/P3 裁决；无 P0/P1 则标记 `closed`，否则 `open`；sanitize 门禁核对结论已记录。

### Phase 2 - P0/P1 自动修复（test-first）

Status: planned
Targets: 发现涉及的 renderer/定义文件、schemas.ts、契约测试文件、e2e spec

- Item Types: `Fix | Proof | Decision`

- [ ] 按审计卡处理 P0/P1：先写复现/回归测试（断言正确行为，非仅 not-throw；XSS 场景断言无脚本执行），再实现修复；DOM/选择器契约变更追加 focused 契约测试与 e2e（test-first 证据：复现测试先于实现）。
- [ ] P2 低成本（约 15 分钟内）当场修复；其余登记卡内 backlog 归 CR。
- [ ] 共性缺陷裁决（Decision）：sanitize 依赖链或公共层发现影响 ≥2 组件/跨包 → 按 roadmap 自动修复机制 §7 处理（当前 plan 内优先修复并事后回写 CX-n，或插入 CX-n work item；涉及 content 包 `markdown` 组件的共性根因 → 显式交接 C6.1 并记录）；根因单点 `shared:` 标记归 CR。
- [ ] 修复后卡内发现标 `fixed` + commit/plan 引用；卡状态流转 `open → fixing → fixed-pending-closure`。
- [ ] 复杂/跨包 bug 修复按 AGENTS.md Bug Fix Test Coverage Rule 记录到 `docs/bugs/`（参考 `docs/bugs/73-*.md` 格式）。

Exit Criteria:

> 本 Phase 交付"发现清零或已裁定"，卡状态与代码行为一致。

- [ ] 全部 P0/P1 已修复（卡内标 `fixed` + 证据）或已显式裁定延期（仅允许依赖未落地跨 plan 机制者，标「机制落地后复验」并登记）；无静默跳过。
- [ ] 受影响包 `pnpm --filter @nop-chaos/flux-renderers-form typecheck && build && lint && test` 绿（含新增回归测试）。

### Phase 3 - 组合宿主真实浏览器场景

Status: planned
Targets: `tests/e2e/component-lab/` 新增/修改 spec、playground lab 页

- Item Types: `Proof | Fix`

- [ ] 设计并实现 ≥1 个本组件真实浏览器组合宿主场景（programmatic DOM 断言，禁截图诊断）：候选——form 内 markdown-editor 编辑+预览+提交（bug 73 模式：输入 → store 更新 → 提交值正确）、XSS 载荷预览 sanitize 验证（断言载荷不以 HTML 形态执行/呈现）。
- [ ] bug 73 模式专项检查：在宿主场景中显式验证单测绿但真机失败类风险。
- [ ] 宿主场景发现的新缺陷按 Phase 2 流程修复（test-first）。
- [ ] 既有相关 e2e（`tests/e2e/w3d-markdown-editor.spec.ts`）在本组件改动后回归。

Exit Criteria:

> 本 Phase 交付"真实浏览器行为成立"。

- [ ] 宿主场景 spec 通过（Playwright，programmatic DOM 断言）；w3d-markdown-editor.spec.ts 回归绿。
- [ ] bug 73 模式专项检查结论记录于 daily log（pass 或带证据 fail→已修复）。

### Phase 4 - 族内回归与审计卡 closure

Status: planned
Targets: 审计卡、`docs/logs/2026/08-03.md`、`docs/backlog/component-audit-roadmap.md`（C2.5 行）

- Item Types: `Proof`

- [ ] 全卡复查：18 维表结论与最终代码一致；P0/P1 清零；卡状态 `closed`（含 fixed-pending-closure → closed 流转）。
- [ ] 本组件范围回归：`pnpm --filter @nop-chaos/flux-renderers-form test` + 相关 e2e spec 全绿；如本 plan 触及公共层（flux-react/field-frame/编译器），追加受影响包验证并记录。
- [ ] daily log 记录：卡 closure 汇总、修复清单（commit/plan 引用）、宿主场景结果、sanitize 交接结论（C6.1 共性发现如有）、CX-n 插入（如有）与决策、**form 族 C2.x 收官留痕**。
- [ ] 若插入了 CX-n：同步更新 roadmap Work Item Status 表（新行 + 依赖边/注释）并按 §7b（事后回写：父 plan closure 后标 done）/§7c（正常生命周期）走；结构性 CX-n 执行前标注待人工确认。
- [ ] roadmap C2.5 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审）。

Exit Criteria:

> 本 Phase 交付"可进入 closure-audit 的完成态"。

- [ ] 审计卡 `closed`；`docs/audits/per-component/` 汇总可读。
- [ ] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置、form 族 C2.x 收官记录）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session（task `ses_03ba61639ffe3EieJG9UTUKg9N`）
- Verdict: `pass`（零 Blocker/Major；2 Minor 已处理：checklist「§5.4」引用改「§3 自动修复纪律」、「§7c 走生命周期」改「§7b/§7c」）
- Rounds: 1
- Findings addressed: 全部文件/行引用经 live repo 核对通过（markdown-editor-renderer.tsx:174 type 与 :129 data-slot、schemas.ts:382、definitions.ts 导出、design.md 存在且无 example.json、lab 页、markdown-editor.test.tsx、w3d-markdown-editor.spec.ts、preview 经 content 包 markdown renderer 渲染 + sanitize 链）；Minor 已处理。

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。

- [ ] 审计卡存在、18 维表完整、P0/P1 清零、`closed`
- [ ] 全部 in-scope P0/P1 已 test-first 修复并有回归测试；无被静默降级到 deferred 的 live defect/contract drift
- [ ] ≥1 个真实浏览器组合宿主场景通过（含 bug 73 模式专项检查）
- [ ] sanitize 门禁核对完成（XSS 载荷场景断言成立）；与 content 包 markdown（C6.1）的共性发现已处理或显式交接
- [ ] 共性缺陷已按 §7 处理（CX-n 插入/合并或当前 plan 内修复，决策记录在卡与 daily log）
- [ ] 受影响的 owner docs 已同步到 live baseline（design.md/quick-reference/roadmap 表按发现实际影响为准）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
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

### e2e pre-existing 其余 8 项（ai/scheduling/content 包）

- Classification: `watch-only residual`
- Why Not Blocking Closure: C0 已逐项裁定为 mission 未触及包失败，successor 归属 C8.1/C9/CV；不在本组件 scope。
- Successor Required: `yes`
- Successor Path: C8.1/C9/CV work item

## Non-Blocking Follow-ups

- 审计中发现但裁定为 P3（风格 nit/注释）的项仅卡内记录，不处理。
- 工具脚本新增模式（若有）记入卡内，CG 统一升级。

## Closure

Status Note: 完成时填写

Closure Audit Evidence:

- Auditor / Agent: 待独立子 agent
- Evidence: 待执行后回填

Follow-up:

- 待执行后回填
