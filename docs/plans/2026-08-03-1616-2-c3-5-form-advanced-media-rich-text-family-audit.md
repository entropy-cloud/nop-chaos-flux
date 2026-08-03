# C3.5 form-advanced 媒体与富文本族逐组件审计

> Plan Status: active
> Mission: component-audit
> Work Item: C3.5
> Last Reviewed: 2026-08-03
> Source: `docs/backlog/component-audit-roadmap.md`（C3.x Phase Details）、`docs/audits/component-audit-checklist.md`（18 维 + 审计卡模板 + 自动修复纪律；§3「与 deep-audit-prompts 23 维的关系」复杂交互渲染器必选 21-23）、`docs/skills/deep-audit-prompts.md`、`CONTEXT.md`（CRUD 域设计语言——uploadAction/loadAction 类 action 显式声明原则与本族一致）、`docs/logs/2026/08-03.md`
> Related: 依赖 C0（`2026-08-02-2043-1`，completed）完成后开工；与 C3.4（`2026-08-03-1616-1`）/ C4.1（`2026-08-03-1616-3`）并行独立（均只依赖 C0）。历史机制：08-02 nested-schema-field-classification（completed）已把 tree `searchSource`/`childrenSource`、input-file `uploadAction`/`deleteAction` 分类为 actionValue（tree-controls.tsx:487,493,504 声明——维度 6 复验基础）；E3 输入上传增强计划（`2026-07-21-0800-3-input-content-upload-enhancement-plan.md`，completed）

## Purpose

对 `flux-renderers-form-advanced` 媒体与富文本族 5 组件（editor/input-file/input-image/tree-select/input-tree）完成 18 维逐组件审计（5 张审计卡，P0/P1/P2/P3 裁决留痕），P0/P1 缺陷在**同一 plan 内自动修复**（test-first + 回归测试 + 受影响包验证门禁），完成 ≥1 个真实浏览器组合宿主场景验证（含 bug 73 模式专项检查与上传失败路径专项），最终全部审计卡 `closed`（P0/P1 清零）。editor 是 TipTap WYSIWYG 富文本（复杂交互渲染器），tree-select/input-tree 是带远程懒加载/搜索的树选择（复杂交互渲染器）——按 checklist §3 三者必选 deep-audit 21-23 维。重点维度：11 异步生命周期（upload 请求下沉与失败路径、树懒加载 childrenSource abort/竞态/失败/重试、env IO 边界 INV-1）、6 嵌套 schema 分类（08-02 机制落地后复验）、18 安全红线（editor sanitize、URL 协议、附件）、8 a11y（树键盘导航/焦点、editor 可编辑区）。

## Current Baseline

- **组件与文件**（均属 `flux-renderers-form-advanced`）：
  - `editor-renderer.tsx`（schema type `:307` + renderer def `:389`；TipTap WYSIWYG；`editor-schemas.ts` 共享 schema/工具栏类型；`__tests__/editor-renderer.test.tsx` 存在）
  - `input-file-renderer.tsx`（type `:15`；`upload-field.tsx`/`upload-schemas.ts` 共享上传机制——`uploadAction`/`deleteAction` 已分类 actionValue；`__tests__/upload-file-enhancements.test.tsx` 存在）
  - `input-image-renderer.tsx`（type `:41`；基于 input-file 上传链；**专属单测待核对**）
  - `tree-controls.tsx`：input-tree（type `:137` + def `:482`）/ tree-select（type `:311` + def `:528`）共享 `tree-options.ts`/`tree-option-list.tsx`/`tree-control-controllers.ts`；`searchSource`/`childrenSource` 已声明 actionValue（`tree-controls.tsx:487-504`）
- **设计文档**：`docs/components/{editor,input-file,input-image,input-tree,tree-select}/design.md` 均存在（维度 17 可核对）。
- **playground**：`apps/playground/src/component-lab/renderers/{editor,input-file,input-image,input-tree,tree-select}-lab-page.tsx` 均存在。
- **既有单测（树族厚）**：`tree-options.test.ts`、`tree-control-controllers.test.tsx`、`__tests__/tree-{enable-node-path,virtualization,ui-markers,value-binding,remote-search,control-source-states,cascade,select-responsive,async-lifecycle,values,structure,lazy-children,component-handles-tree}.test.tsx` 等（维度 16 基础厚；维度 11 有 tree-async-lifecycle 直接覆盖）。
- **e2e**：`tests/e2e/w3d-editor.spec.ts`（TipTap WYSIWYG 编辑面）、`tests/e2e/tree-display-ux.spec.ts` 存在；本族无 `tests/e2e/component-lab/c3-5-host-surfaces.spec.ts`（需新增）。
- **历史基础**：E3 输入上传增强计划已落地（upload 请求下沉与失败路径）；08-02 nested-schema 机制已把本族 action 型属性分类（维度 6 复验而非首查）；`2026-07-13` 图标系统与 `2026-07-21-0800-3` 上传增强为相邻族先例。
- **基线**：以 C0 回写基线为准（unit 全绿 58/58；e2e pre-existing 8 项中本族无归属项——C0 原 9 项中 input-suggest 已由 C2.2 修复出列；ai-chat timestamp/ai-rich-text-sender ×5 属 ai 包 Tiptap（C8.1），非本族 editor；w3d-editor flake 已裁定机器状态相关；余项属 scheduling/content，successor C8.1/C9/CV）。

## Goals

- 5 张审计卡（`docs/audits/per-component/{editor,input-file,input-image,tree-select,input-tree}.md`）18 维逐项核对（editor/tree-select/input-tree 追加 deep-audit 21-23 维），P0/P1/P2/P3 裁决留痕，`文件:行` 证据，全部 `closed`（P0/P1 清零）。
- 本族 P0/P1 缺陷 test-first 自动修复（契约/公共层修复 Must automate），P2 低成本当场修复、其余登记卡内 backlog 归 CR。
- ≥1 个真实浏览器组合宿主场景（含 bug 73 模式专项 + 上传失败/懒加载失败路径）：候选——form 内 editor 编辑提交（值形状）、input-file/input-image 上传成功与失败路径（env IO 边界）、tree-select/input-tree 远程 childrenSource 懒加载 + 失败重试。
- roadmap C3.5 行标 `done`（独立子 agent closure-audit pass 后）。

## Non-Goals

- C3.4/C4.x 及以后族组件；CRUD 本体（C4.2）。
- checklist v2 修订（CG）、审计工具脚本升级（CG）。
- 结构性重构（公共 API/包边界/编译期机制，需人工确认后另立 CX-n；纯行为修复不视为结构性）。
- 各审计卡 P2 backlog（>15 分钟项）归 CR 处理，不在本 plan 内实现。

## Scope

### In Scope

- 5 组件 × 18 维审计卡（维度重点：1 Schema 契约（fields 与 editor-schemas/upload-schemas/types 一致）、2 RendererComponentProps 合规、3 值所有权三态（editor HTML 值受控 echo、tree 多选值、upload 值形状）、4 表单参与（name/required/校验挂接、提交数据形状、data-field-_）、5 DOM 与选择器契约（data-field/data-renderer/data-value/data-testid、树节点/上传区 marker 契约）、6 嵌套 schema 分类（**08-02 机制落地后复验**：searchSource/childrenSource/uploadAction/deleteAction 已分类 actionValue，无 deepFields 残留）、7 事件与 action 契约（onChange payload 形状、normalizeActionEvent 语义、upload 完成回调）、8 a11y（树完整键鼠导航/焦点管理/aria、editor 可编辑区语义）、9 i18n（上传/树空态/搜索 placeholder 文案 key）、10 四态覆盖（空/加载/错误/禁用/readOnly——树与上传链）、11 异步生命周期（**upload 请求下沉与失败路径、树 childrenSource 懒加载 abort/竞态/失败/重试、env IO 边界 INV-1**）、12 组合宿主场景（form 内编辑提交、CRUD 行内/弹层内使用）、13 样式契约（widget 自样式）、14 React 19、15 性能边界（树虚拟化、大节点集渲染、key 稳定性）、16 测试质量（断言正确行为而非 not-throw、DOM 契约断言、错误路径、**input-image 专属测试缺口审计**）、17 文档对照（design.md ↔ 实现 props/行为）、18 注册/包边界/IO 安全红线（surface 双注册、**editor sanitize/URL 协议/附件 XSS 红线**、远程加载走 env IO 边界 INV-1））；editor/tree-select/input-tree 追加 deep-audit 21（显示与定位正确性——编辑区/弹层/树展开态）、22（集成接线与可操作性——form/弹层/CRUD 集成、上传接线）、23（测试有效性与假绿——既有 tree-_ 与 editor 测试是否真断言行为）。
- P0/P1 自动修复（test-first）+ P2 低成本即时修复。
- 真实浏览器宿主场景（form 内 editor 编辑提交（bug 73 模式）、input-file 上传成功/失败路径、tree-select/input-tree 远程懒加载 + 失败重试）。
- 审计卡状态流转（open → fixing → fixed-pending-closure → closed）与 daily log 记录。

### Out Of Scope

- C3.4/C4.x 及以后族组件；CRUD 本体（C4.2）。
- checklist v2 修订（CG）。
- 结构性重构（需人工确认后另立 CX-n）。
- e2e pre-existing 剩余项（ai/scheduling/content 包，successor C8.1/C9/CV）。

## Failure Paths

| 可测场景编号        | 触发                                              | 行为（含错误码）                                   | 可重试 | 用户可见表现            |
| ------------------- | ------------------------------------------------- | -------------------------------------------------- | ------ | ----------------------- |
| host-mr-editor      | form 内 editor 编辑并提交（真机）                 | HTML 值进入 store、提交数据形状正确（bug 73 模式） | 是     | 提交结果正确回显        |
| host-mr-upload-ok   | input-file/input-image 上传成功                   | 文件经 env IO 上传、值回写、预览可渲染             | 是     | 上传态 + 值正确         |
| host-mr-upload-fail | 上传失败（env 拒绝）                              | 失败态展示、可重试、不崩溃                         | 是     | 错误提示 + 重试入口可见 |
| host-mr-tree-lazy   | tree-select/input-tree 远程 childrenSource 懒加载 | 子节点加载正确、失败态可重试、不崩溃               | 是     | 树展开正确              |
| host-mr-sanitize    | editor 注入恶意 HTML（若 sanitize 路径存在）      | 净化为安全内容、不执行脚本（XSS 红线）             | 否     | 仅安全内容渲染          |

## Test Strategy

本档选择：**必须自动化** —— 媒体与富文本族涉及上传请求（对外 IO 契约 + 失败路径）、树远程懒加载（异步生命周期）、editor 富文本（值形状契约 + sanitize 安全红线），均为核心回归路径；契约/公共层修复必须 test-first（先写失败测试再实现）。验证门禁：受影响包 `pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck/build/lint/test` + 相关 e2e 回归（`w3d-editor.spec.ts`/`tree-display-ux.spec.ts`）+ 本族新增宿主场景 Playwright（programmatic DOM 断言）。

## Execution Plan

### Phase 1 - 逐组件 18 维审计与审计卡产出

Status: planned
Targets: `packages/flux-renderers-form-advanced/src/{editor-renderer,input-file-renderer,input-image-renderer,tree-controls,upload-field,upload-schemas,editor-schemas}.tsx`、`docs/audits/per-component/`

- Item Types: `Proof`

- [ ] 审计前核对注册定义：5 组件注册项（type/fields/componentCapabilityContracts）与 schema types 一致（维度 1/18）；08-02 nested-schema 机制落地状态 live 核对（searchSource/childrenSource/uploadAction/deleteAction actionValue 声明）。
- [ ] 产出 5 张审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），P0/P1/P2/P3 裁决留痕（checklist §3）；**editor/tree-select/input-tree 追加 deep-audit 21-23 维**（复杂交互渲染器必选）。
- [ ] 维度重点核查：异步生命周期（维度 11：upload 请求下沉与失败路径、树 childrenSource 懒加载 abort/竞态/失败/重试、env IO 边界 INV-1）；安全红线（维度 18：editor sanitize/URL 协议/附件）；a11y（维度 8：树完整键鼠导航、editor 可编辑区）。
- [ ] 嵌套 schema 分类专项（维度 6）：08-02 机制落地后复验——无 deepFields 残留、action 分类正确（tree-controls.tsx:487-504、upload-schemas.ts 断言）。
- [ ] 测试质量专项（维度 16）：input-image 专属测试缺口审计；既有 tree-\*/editor 测试断言正确行为而非 not-throw（维度 23 联动）。
- [ ] 文档对照（维度 17）：5 个 design.md ↔ 实现 props/行为逐项核对；quick-reference.md 词条准确性。

Exit Criteria:

> 本 Phase 交付 5 张审计卡（含裁决 + 21-23 维），是后续修复的唯一事实来源。

- [ ] `docs/audits/per-component/{editor,input-file,input-image,tree-select,input-tree}.md` 5 卡存在，18 维表完整 + editor/tree-select/input-tree 21-23 维记录、`文件:行` 证据可验证。
- [ ] 卡内发现清单带 P0/P1/P2/P3 裁决；无 P0/P1 则标记 `closed`，否则 `open`；08-02 机制复验结论已记录。

### Phase 2 - P0/P1 自动修复（test-first）

Status: planned
Targets: 发现涉及的 renderer/子模块文件、schema 文件、契约测试文件、e2e spec

- Item Types: `Fix | Proof | Decision`

- [ ] 按审计卡处理 P0/P1：先写复现/回归测试（断言正确行为，非仅 not-throw），再实现修复；DOM/选择器契约变更追加 focused 契约测试与 e2e（test-first 证据：复现测试先于实现）。
- [ ] P2 低成本（约 15 分钟内）当场修复；其余登记卡内 backlog 归 CR。
- [ ] 共性缺陷裁决（Decision）：公共层/跨包发现（upload-field/upload-schemas 上传链、tree-controls 树机制）影响 ≥2 组件/跨包 → 按 roadmap 自动修复机制 §7 处理（当前 plan 内优先修复并事后回写 CX-n，或插入 CX-n work item）；根因单点 `shared:` 标记归 CR。
- [ ] 修复后卡内发现标 `fixed` + commit/plan 引用；卡状态流转 `open → fixing → fixed-pending-closure`。
- [ ] 复杂/跨包 bug 修复按 AGENTS.md Bug Fix Test Coverage Rule 记录到 `docs/bugs/`（参考 `docs/bugs/73-*.md` 格式）。

Exit Criteria:

> 本 Phase 交付"发现清零或已裁定"，卡状态与代码行为一致。

- [ ] 全部 P0/P1 已修复（卡内标 `fixed` + 证据）或已显式裁定延期（仅允许依赖未落地跨 plan 机制者，标「机制落地后复验」并登记）；无静默跳过。
- [ ] 受影响包 `pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck && build && lint && test` 绿（含新增回归测试）。

### Phase 3 - 组合宿主真实浏览器场景

Status: planned
Targets: `tests/e2e/component-lab/c3-5-host-surfaces.spec.ts`（新增）、playground lab 页

- Item Types: `Proof | Fix`

- [ ] 设计并实现 ≥1 个本族真实浏览器组合宿主场景（programmatic DOM 断言，禁截图诊断）：候选——form 内 editor 编辑+提交（bug 73 模式：HTML 值 → store → 提交值正确）、input-file/input-image 上传成功与失败路径（env IO 边界）、tree-select/input-tree 远程 childrenSource 懒加载 + 失败重试。
- [ ] bug 73 模式专项检查：在宿主场景中显式验证单测绿但真机失败类风险（editor 真机提交、上传真机值回写）。
- [ ] 上传/懒加载失败路径专项：失败态展示、可重试、不崩溃。
- [ ] 宿主场景发现的新缺陷按 Phase 2 流程修复（test-first）。
- [ ] 既有相关 e2e（`tests/e2e/w3d-editor.spec.ts`、`tests/e2e/tree-display-ux.spec.ts`）在本族改动后回归。

Exit Criteria:

> 本 Phase 交付"真实浏览器行为成立"。

- [ ] 宿主场景 spec 通过（Playwright，programmatic DOM 断言）；w3d-editor/tree-display-ux 回归绿。
- [ ] bug 73 模式专项检查结论记录于 daily log（pass 或带证据 fail→已修复）。

### Phase 4 - 组件回归与审计卡 closure

Status: planned
Targets: 审计卡、`docs/logs/2026/08-03.md`、`docs/backlog/component-audit-roadmap.md`（C3.5 行）

- Item Types: `Proof`

- [ ] 全卡复查：18 维 + 21-23 维表结论与最终代码一致；P0/P1 清零；5 卡状态 `closed`（含 fixed-pending-closure → closed 流转）。
- [ ] 本族范围回归：`pnpm --filter @nop-chaos/flux-renderers-form-advanced test` + 相关 e2e spec 全绿；如本 plan 触及公共层（flux-react/field-frame/编译器/env IO），追加受影响包验证并记录。
- [ ] daily log 记录：卡 closure 汇总、修复清单（commit/plan 引用）、宿主场景结果、08-02 机制复验结论、CX-n 插入（如有）与决策。
- [ ] 若插入了 CX-n：同步更新 roadmap Work Item Status 表（新行 + 依赖边/注释）并按 §7b（事后回写：父 plan closure 后标 done）/§7c（正常生命周期）走；结构性 CX-n 执行前标注待人工确认。
- [ ] roadmap C3.5 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审；已交付全部执行证据，由 mission-driver CLOSURE_VERIFY fresh session 执行 audit 后收口）。

Exit Criteria:

> 本 Phase 交付"可进入 closure-audit 的完成态"。

- [ ] 5 张审计卡 `closed`；`docs/audits/per-component/` 汇总可读。
- [ ] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session（task `ses_0394a630cffe3MHfOHFnjw5CVi`）
- Verdict: `pass`（零 Blocker/Major；Minor ×2）
- Rounds: 1
- Findings addressed: 全部文件/行引用经 live repo 核对通过（editor-renderer.tsx `:307/:389`、input-file-renderer.tsx `:15`、input-image-renderer.tsx `:41`、tree-controls.tsx `:137/:482`/`:311/:528` 与 actionValue `:487-504`、uploadAction/deleteAction 08-02 分类、5 design.md/lab 页、14 测试文件、2 e2e spec、E3 计划 completed、roadmap C3.5 `todo` 仅依赖 C0、无既有审计卡）；Minor 已处理：基线补 9→8 项口径（input-suggest 出列）与 w3d-editor flake 裁定说明；tree-\* 测试名缩写枚举 nit 保留（已逐一核实存在）。

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。

- [ ] 5 张审计卡存在、18 维表完整（复杂交互追加 21-23）、P0/P1 清零、全部 `closed`
- [ ] 全部 in-scope P0/P1 已 test-first 修复并有回归测试；无被静默降级到 deferred 的 live defect/contract drift
- [ ] ≥1 个真实浏览器组合宿主场景通过（含 bug 73 模式专项检查 + 上传/懒加载失败路径）
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
- Why Not Blocking Closure: checklist §3 明确 P2 可入审计卡 backlog 由 CR 自动处理；不阻塞本族 supported baseline 成立。
- Successor Required: `yes`
- Successor Path: CR work item（跨族集中修复）

### 依赖未落地跨 plan 机制的发现（若有，「机制落地后复验」）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 依赖的机制未落地时无法在卡内闭合；按 checklist §3 自动修复纪律（「机制落地后复验」显式登记）由 CR 集中复验，卡内不悬挂。
- Successor Required: `yes`
- Successor Path: CR work item

### e2e pre-existing 其余项（ai/scheduling/content 包）

- Classification: `watch-only residual`
- Why Not Blocking Closure: C0 已逐项裁定为 mission 未触及包失败，successor 归属 C8.1/C9/CV；不在本族 scope。
- Successor Required: `yes`
- Successor Path: C8.1/C9/CV work item

## Non-Blocking Follow-ups

- 审计中发现但裁定为 P3（风格 nit/注释）的项仅卡内记录，不处理。
- 工具脚本新增模式（若有）记入卡内，CG 统一升级。

## Closure

Status Note: 待执行（draft → active → completed 流程）。

Closure Audit Evidence:

- Auditor / Agent: 待独立子 agent fresh session（mission-driver CLOSURE_VERIFY 阶段）
- Evidence: 待填写

Follow-up:

- 待填写（或明确 no remaining plan-owned work）。
