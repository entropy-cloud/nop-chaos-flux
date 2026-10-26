# 753 NRP-5 preview adapter + profile 装配 + demo 信封化 + e2e + 收口（nop-report）

> Plan Status: completed
> Last Reviewed: 2026-10-26
> Source: `docs/backlog/report-designer-nop-report-roadmap.md`（NRP-5 work item）、`docs/plans/640-nop-report-profile-plan.md` Phase 6/7（设计种子，superseded）、`docs/architecture/report-designer/nop-report-profile.md` §10/§14
> Related: `docs/plans/749/750/751/752-...`（NRP-1..4，completed）

## Purpose

实现 `nop-report` preview adapter（沿用既有 preview 单 owner/abort 序列）、profile 装配函数（`createNopReportProfile` + `createNopReportAdapters`，含 live flux registry 注册的 renderer definitions），把 playground host demo 从 mock（静态字段源 + stub preview + 空模板种子）切换为真实形状信封装配，新增端到端 Playwright spec（程序化断言），并完成 roadmap owner-doc 收口。

## Current Baseline

- preview 通道：`PreviewAdapter{id, preview(args): Promise<PreviewResult>}`（`adapters.ts:41-57`）；`report-designer:preview`/`stopPreview` 单 owner 序列 + abort（`core-dispatch.ts` preview case + `ctx.startPreviewRun`）；`getPreviewProviderId` = `profile.previewId ?? config.preview.provider`（`runtime/registry.ts`）。全仓无生产 preview adapter（host demo 用内联 stub）。
- 装配缺失：`packages/report-designer-nop-report` 有全部单件 adapter（NRP-2/3/4）但无 `createNopReportProfile`/装配函数；renderer definitions（NRP-4）无 live 注册点。
- demo：`apps/playground/src/pages/report-designer-host-demo.tsx` 用 `createReportTemplateDocument(createEmptyDocument())` 种子（非信封）、静态 `fieldSources`（来自 `report-designer-demo-shared.ts`）、内联 `host-preview` stub；`createDesignerRegistry({register})` 支持追加 renderer definitions；`window.__REPORT_DESIGNER_HOST__` hooks（getDocument/getPreviewCalls）。
- e2e：`tests/e2e/report-designer-host.spec.ts`（既有断言：字段面板 4 项、A1='Alpha'、preview calls `{mode:'inline'}`、dirty/save/undo-redo、空模板回退）；fixtures `tests/e2e/fixtures.js`。
- provider 加载已接线：core `initialize()` → `refreshDerivedState()` → `refreshFieldSources()`（`core.ts:292`（initialize）→ `:218`（refreshDerivedState）→ `:226` 调 `refreshFieldSources`（定义 `:396`）），provider-backed 字段源在 mount 时加载。
- NRP-4 renderer definitions：`createNopReportRendererDefinitions({expressionEditor?, referencePicker?})`（`src/renderers.tsx`）。

## Goals

- `createNopReportPreviewAdapter(options)`：`preview()` 内先经 `createNopReportTemplateCodec().exportTemplate(document)` 导出信封，再调用宿主注入的 `previewEndpoint({envelope, mode, signal})`，结果映射为 `PreviewResult`；abort 信号透传。
- 装配：`createNopReportProfile(options?)`（固定 id 的一条 `ReportDesignerProfile`，`inspectorSchemaId='nop-report-default'`）；`createNopReportAdapters(options)` 返回填满六类 map 的 `Partial<ReportDesignerAdapterRegistry>`（datasets 字段源、cell-binding drop、preview、template codec、expression editor、reference picker）。
- demo 信封化：host demo 改为从真实形状信封（workbook + xpt，含 XPT cell model）经组合 codec 导入种子；字段源/预览/inspector/拖放全部经 profile 装配；renderer definitions 注册进 demo registry；保留既有 window hooks 与既有 e2e 可观测行为（A1='Alpha'、字段面板 4 项、preview `{mode:'inline'}`）。
- 新 e2e `tests/e2e/nop-report-profile.spec.ts`（程序化断言）：选中带 XPT model 的 cell → inspector XPT 输入反映信封值 → 编辑触发 updateMeta（dirty probe）→ 字段面板来自 provider → preview 走 profile adapter。
- owner-doc 收口：`nop-report-profile.md` 去拟议语气改最终态；`docs/components/report-designer-page/design.md` 如契约变更同步；roadmap §5 NRP-5 回写。

## Non-Goals

- 不做真实后端 preview HTTP 调用（demo/e2e 用注入回调；真实 endpoint 由宿主提供）。
- 不做 band/canvas 语义渲染（roadmap §9）。
- 不重构 `report-designer-demo.tsx`（另一 demo 页，保留为通用 core 演示）。

## Scope

### In Scope

- `packages/report-designer-nop-report/src/preview-adapter.ts`、`profile.ts` + focused 测试；`index.ts` 导出。
- `apps/playground/src/pages/report-designer-host-demo.tsx` 信封化改造。
- `tests/e2e/nop-report-profile.spec.ts` 新增；既有 `report-designer-host.spec.ts` 如断言漂移则同步修正。
- owner-doc：`nop-report-profile.md`、`docs/components/report-designer-page/design.md`（如变更）、roadmap、daily log。

### Out Of Scope

- 二进制 xlsx、样式模型、canvas band 渲染。

## Failure Paths

| 可测场景编号           | 触发                                     | 行为（含错误码）                                                         | 可重试 | 用户可见表现     |
| ---------------------- | ---------------------------------------- | ------------------------------------------------------------------------ | ------ | ---------------- |
| preview-endpoint-error | 注入的 previewEndpoint reject            | `PreviewResult{ok:false,error}`；`preview.running` 复位（单 owner 序列） | 是     | 预览错误提示     |
| preview-abort          | 预览中再次触发/取消                      | 旧请求 abort，不覆盖 `preview.running`/`lastResult`                      | 是     | 显示最新一次结果 |
| envelope-seed-invalid  | demo 信封被改坏（Toggle 空模板按钮旁路） | 既有 invalid-document 回退路径不回归                                     | 是     | 空模板渲染       |

## Test Strategy

本档选择：`必须自动化`。

- preview adapter focused 测试（信封导出、endpoint 映射、abort、错误路径）先红后绿。
- 装配 focused 测试：profile 字段/registry 六类 map 齐备且 id 对齐。
- e2e 用程序化断言（DOM/data-slot/window hooks），非仅截图。

## Execution Plan

### Phase 1 - preview adapter + profile 装配

Status: completed
Targets: `packages/report-designer-nop-report/src/preview-adapter.ts`、`profile.ts`、`__tests__/preview-adapter.test.ts`（装配测试同文件，收口勘误：独立 profile-assembly 文件未另立）

- Item Types: `Proof | Fix`

- [x] Proof（先红）：preview adapter focused 测试——导出信封传入 endpoint、结果映射、endpoint reject → `{ok:false,error}`、abort 透传。
- [x] Proof（先红）：装配测试——`createNopReportProfile` 的 id/ids 与 `createNopReportAdapters` 六类 map 的 adapter id 逐一对应；**显式断言 provider 拾取链**（`config.fieldSources[].id` ∈ `profile.fieldSourceIds` 且 entry 带 `provider`，经 `loadFieldSources` 实际加载——`runtime/field-sources.ts:49-55` 静默 continue 的耦合不可只靠 id 相等断言）；codec 为 NRP-2 组合 codec；命令链冒烟（importTemplate 用装配 registry 走通）。
- [x] Fix（实现两个装配函数 + preview adapter；index.ts 导出。

Exit Criteria:

- [x] focused 测试全绿；装配 registry 经 `createReportDesignerCore` 冒烟通过。

### Phase 2 - demo 信封化 + e2e

Status: completed
Targets: `apps/playground/src/pages/report-designer-host-demo.tsx`、`tests/e2e/nop-report-profile.spec.ts`、（如需）`tests/e2e/report-designer-host.spec.ts`

- Item Types: `Proof | Fix`

- [x] Fix（demo 改造——真实形状信封种子（经组合 codec）、profile 装配（adapters + byProfile inspector + renderer definitions 注册）、保留 window hooks 与既有可观测行为。
- [x] Proof（新 e2e spec——信封 XPT 值反映到 inspector、编辑触发 updateMeta（dirty probe）、provider 字段面板、preview 走 profile adapter；全部程序化断言。
- [x] Fix（既有 host spec 断言如漂移同步修正（字段标签/计数来源变化）。

Exit Criteria:

- [x] `npx playwright test tests/e2e/nop-report-profile.spec.ts` 通过；既有 report-designer e2e 全绿。

### Phase 3 - owner-doc 收口

Status: completed
Targets: `docs/architecture/report-designer/nop-report-profile.md`、`docs/components/report-designer-page/design.md`、roadmap、daily log

- Item Types: `Fix`

- [x] Fix（`nop-report-profile.md` 全文收敛为最终设计状态（§2/§5/§6/§7/§10/§14 拟议语气 → 实现落点；§1.2 样式差距表保留为后续 plan 记录）；page design.md 如契约变更同步。
- [x] Fix（daily log；roadmap §5 NRP-5 随 closure 回写 `done`（五条全 done 收口）。

Exit Criteria:

- [x] owner doc 无「Proposed/待实现」残留；roadmap NRP-1..NRP-5 全 `done`。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-10-26）
- Verdict: `pass-with-minors`（0 Blocker / 0 Major / 2 Minor）
- Rounds: 1
- Findings addressed: Minor 1（core.ts 行号引用修正）、Minor 2（装配测试显式断言 provider 拾取链，已改）。

## Closure Gates

- [x] 所有 in-scope confirmed live defect 已修复（无生产 preview adapter、无装配、demo mock 残留 → 落地）。
- [x] 所有 in-scope confirmed contract drift 已收敛（nop-report-profile.md 最终态）。
- [x] 行为/契约结果已达成：import→edit→preview 链路 e2e 可验证。
- [x] 必要 focused verification 已完成（preview/装配 focused + e2e）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [x] 受影响的 owner docs 已同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（零新增 red）

## Deferred But Adjudicated

### inspector 表单初始值反射信封 XPT 值（prefill）

- Classification: `watch-only residual`
- Why Not Blocking Closure: flux form 字段 `value`/form `data` 经 `useDefaultValuePush` 推送（plan 595 语义：defaultValue 变化时可重推，但用户编辑后不再覆盖；activeMeta 首帧解析期未就绪，消费 EMPTY props 后推送的是空值），activeMeta 在首帧解析期尚未就绪（"null-member access" 宽限路径消费 EMPTY props 后不再重推）；编辑提交链路（updateMeta → dirty → 回写 cellMeta）已 e2e 证明，prefill 属编辑体验增强。e2e 断言已改为不依赖 prefill（信封 XPT 值仍经 codec 落入 semantic.cellMeta，preview-adapter.test 命令链断言覆盖）。
- Successor Required: `no`
- Successor Path: 后续可按 inspector-design.md §14 的"规范化 view model"思路在 inspector shell 层做 target 变更时显式 setValue。

### 真实后端 preview HTTP 端点

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: preview adapter 契约以注入 endpoint 回调收口，真实 URL/协议由宿主决定（`nop-report-profile.md` §10 边界）；本路线图交付前端闭环。
- Successor Required: `no`
- Successor Path: —

## Non-Blocking Follow-ups

- 无。

## Closure

Status Note: 2026-10-26 收口。preview adapter + profile 装配 + demo 信封化 + 新 e2e（3 用例）+ 既有 host e2e（5 用例零漂移）全部落地；独立子 agent closure audit `approved`（0 Blocker / 0 Major / 3 Minor 引用/措辞勘误，已随回写修复）。roadmap §5 NRP-5 随本回写翻 `done`——NRP-1..NRP-5 全部完成，nop-report 路线图收口。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-10-26）
- Evidence: verdict `approved`——preview-adapter/profile 装配逐文件核阅；`npx playwright test` 实跑 8/8（nop-report-profile 3 + report-designer-host 5）exit 0；包内 57 focused tests 全绿；四项向后兼容收敛（updateMeta target 可选化、meta 投影键、字段族契约、标记消费）逐项对照 live 代码确认；Deferred 两条分类诚实（prefill residual 与 e2e 无耦合实证）。

Follow-up:

- inspector prefill 反射（watch-only residual，见 Deferred）；无剩余 plan-owned work。
