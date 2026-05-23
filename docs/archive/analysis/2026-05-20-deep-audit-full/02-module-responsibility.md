# 维度 02: 模块职责与文件边界

## 第 1 轮（初审）

### [维度02-01] TaskFlow playground domain library 的 `index.ts` 同时承担入口、namespace provider、projection flush、DSL import/export codec

- **文件**: `apps/playground/src/taskflow-designer-lib/index.ts`
- **行号范围**: `75-352`, `386-665`
- **证据片段**:
  ```ts
  75: export function createNamespace(_context: ImportedNamespaceContext): ActionNamespaceProvider {
  76:   let authoringModel: TaskFlowAuthoringModel | null = null;
  77:   let activeContainerId: string | null = null;
  78:   const containerStack = createContainerStack();
  ...
  102:     invoke(method: string, payload: Record<string, unknown> | undefined, ctx: ActionContext): ActionResult {
  103:       try {
  104:         switch (method) {
  ```
- **严重程度**: P2
- **现状**: `taskflow-designer-lib/index.ts` 是目录入口，但实际内联了 stateful namespace provider、designer projection 读取、container navigation、save/export/import action 分发、nop-task DSL 解析、step conversion、expression helper 与默认模块导出。
- **职责边界**: 职责 A 为 import library entry / default module 导出（`661-665`）；职责 B 为 runtime namespace provider 与 action dispatch switch（`75-352`）；职责 C 为 designer projection snapshot 读取与 GraphDocument 构造（`26-73`）；职责 D 为 nop-task DSL input 类型、import parser、step lowering/props conversion（`386-646`）；职责 E 为 expression helpers（`648-659`）。
- **风险**: 后续补齐 TaskFlow round-trip、XML/YAML codec、decorator、selector/fork/loop 等能力时，入口文件会继续吸收 domain codec 和 runtime action 逻辑；这会让 “import library surface” 与 “TaskFlow domain adapter implementation” 难以分别测试、替换和审计。
- **建议**: 保留 `index.ts` 为薄入口，仅导出 `createNamespace` / `createExpressionHelpers` / default module；拆出 `namespace-provider.ts`、`designer-projection-sync.ts`、`nop-task-dsl-parser.ts`、`step-conversion.ts`，并让 parser/converter 有独立单元测试。
- **为什么值得现在做**: 该文件已进入 `pnpm check:oversized-code-files` 500+ warning（666 行），且 TaskFlow owner 文档明确要求 domain adapter 承担 parse / validate / lower / serialize；趁 codec 仍在 playground lib 内收敛，拆分成本低于后续 XML/YAML 与 decorator round-trip 落地后再拆。
- **误报排除**: 这不是“单纯大文件”。文件名为 `index.ts`，但并非薄 re-export；同时存在 runtime provider、projection sync 和 DSL codec 三类不同变更原因。也不是合理 orchestrator：`parseNopTaskDSL` / `dslStepToTaskFlowStep` 是具体实现算法，不是简单组装。
- **历史模式对应**: 对应本仓库 “入口文件二次膨胀 / implementation leakage into index” 模式；与历史上 `flux-core/src/index.ts` 拆出类型、helpers 后保持入口纯度的收敛方向一致。
- **参考文档**: `docs/skills/deep-audit-prompts.md:622-625`, `docs/architecture/taskflow-visual-designer.md:51-62`, `docs/architecture/taskflow-visual-designer.md:737-754`, `AGENTS.md:168-173`
- **复核状态**: 未复核

### [维度02-02] `report-designer-page` renderer 文件同时承担页面渲染、双 core lifecycle、namespace 注册和 report/spreadsheet 同步控制

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx`
- **行号范围**: `45-680`
- **证据片段**:
  ```ts
  442:   const syncingSpreadsheetFromReportRef = useRef(false);
  443:   const lastSyncedSpreadsheetRef = useRef(spreadsheetSnapshot.document);
  444:   const lastAppliedReportSpreadsheetRef = useRef(snapshot.document.spreadsheet);
  445:
  446:   useEffect(() => {
  447:     const nextReportSpreadsheet = snapshot.document.spreadsheet;
  448:
  449:     if (nextReportSpreadsheet === lastAppliedReportSpreadsheetRef.current) {
  ```
- **严重程度**: P2
- **现状**: `page-renderer.tsx` 已达 681 行 warning，并在单个 React component 文件中同时包含 input validation/normalization、report core 与 spreadsheet core 创建、两套 action namespace 注册、core initialize/dispose、report <-> spreadsheet 双向同步控制、host scope 注入、statusPath 发布、WorkbenchShell panels/canvas/dialogs 渲染。
- **职责边界**: 职责 A 为 snapshot slice / equality / input resolver helpers（`45-199`）；职责 B 为 workbench panel frame 与 panel existence helpers（`201-280`）；职责 C 为 report/spreadsheet core 创建、provider/bridge 创建（`282-335`）；职责 D 为 action namespace 注册、初始化、inspector seed、dispose lifecycle（`337-426`）；职责 E 为 report document 与 spreadsheet document 双向同步 controller（`428-479`）；职责 F 为 host scope、regions、panels、statusPath、WorkbenchShell render（`481-680`）。
- **风险**: report canonical document dirty/sync 语义与 visual shell 在同一文件内演进，容易在后续字段面板、inspector、preview、spreadsheet bridge 修改时把 synchronization guard、host projection、panel fallback 互相耦合；同一 reviewer 很难只审 UI shell 或只审 sync lifecycle。
- **建议**: 优先提取非 JSX owner 边界，而不是为行数机械拆 JSX：例如 `useReportDesignerPageRuntime()` 负责 core/provider/lifecycle，`useReportSpreadsheetSync()` 负责 `lastSyncedSpreadsheetRef`/bidirectional sync，`report-designer-page-inputs.ts` 负责 schema props normalization，`report-designer-panels.tsx` 负责 panel frame fallback。
- **为什么值得现在做**: 文件已接近 700 hard gate，且 report docs 对 dirty/sync/canonical document 有明确 owner 语义；把 sync controller 与 shell render 分离能降低后续 canonical spreadsheet subtree、preview cancellation、inspector refresh 的回归面。
- **误报排除**: 不是“复杂 renderer 大文件但 owner 清晰”的机械报告。该文件包含具体 runtime synchronization algorithm（`lastSyncedSpreadsheetRef` / `syncingSpreadsheetFromReportRef`）和 action namespace lifecycle，不只是 JSX shell；这些逻辑有独立 owner 风险和独立测试价值。
- **历史模式对应**: 对应本仓库 “大型 renderer 第一轮提取 controller/hooks 后停止，不为行数继续拆” 的模式；与历史 `table-renderer.tsx` 拆出 table controls / row scope / header/body 子模块类似。
- **参考文档**: `docs/architecture/report-designer/design.md:98-109`, `docs/architecture/report-designer/design.md:311-321`, `docs/architecture/report-designer/design.md:443-450`, `docs/skills/deep-audit-prompts.md:601-607`
- **复核状态**: 未复核

## 工具基线摘要

- 已运行 `pnpm check:oversized-code-files`。
- 输出摘要：80 个文件超过 500 行 warning，0 个文件超过 700 行 error。
- 本轮未手工重新统计全仓行数；只把该命令输出作为 oversized baseline。
- 本轮重点复核了 warning 中可能存在职责混合、入口泄露、owner 漂移或二次膨胀的文件；测试文件的大体积未作为维度 02 主发现处理，除非暴露真实模块边界问题。
- 已重点阅读：`packages/flux-runtime/src/runtime-factory.ts`, `packages/flux-runtime/src/form-runtime-owner.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/form-store.ts`, `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`, `packages/report-designer-renderers/src/page-renderer.tsx`, `apps/playground/src/taskflow-designer-lib/index.ts`, `packages/flux-action-core/src/action-dispatcher/action-execution.ts`, `packages/flow-designer-core/src/core.ts`, `packages/flow-designer-renderers/src/designer-command-adapter.ts`, `packages/flux-renderers-data/src/tree-renderer.tsx`, `packages/flux-renderers-data/src/table-renderer.tsx`。

## 入口文件问题清单

- `apps/playground/src/taskflow-designer-lib/index.ts`: 确认存在入口文件实现细节泄露，已列为 `[维度02-01]`。
- `packages/flux-runtime/src/index.ts`: 当前 11 行，保持薄 re-export；未发现入口实现泄露。
- `packages/flux-core/src/index.ts`: 当前为 re-export / export list；未发现实现逻辑回流。
- `packages/flux-react/src/index.tsx`: 当前为 public surface export list；导出项较多但符合当前 package surface 角色，本轮不作为发现。
- `packages/flux-bundle/src/index.tsx`: 包 facade 入口包含默认 registry/env/renderer factory 组装逻辑；行数较小且符合 facade owner，暂不作为发现。
- `packages/flux-code-editor/src/index.ts`: 入口包含 lazy renderer definition 与 register helper；属于 package registration assembly，暂不作为发现。
- `packages/ui/src/index.ts`: 61 个 export 语句，但 UI package root 作为组件库 barrel 合理；本轮不作为维度 02 发现。

## 目录结构建议

- `packages/flux-runtime/src`: 顶层 entries 约 49 个，已有 owner 文档覆盖多数组件；建议后续新增 runtime 子系统时优先进入现有子目录或新建 focused 子目录，避免继续增加顶层文件。
- `packages/flux-react/src`: 顶层 entries 约 54 个；当前 root export surface 清晰，但 hooks、render-node、workbench、source/status publication 等可在后续较大重构时考虑按 runtime integration / renderer shell / host publication 分组。
- `packages/flow-designer-renderers/src`: 顶层 entries 约 51 个；已有 `designer-xyflow-canvas/`、`dingflow/` 子目录，但 command adapter、host shell、palette/canvas/overlay 文件仍分散。若继续增长，建议按 `commands/`、`host/`、`canvas/`、`tree-mode/` 聚合。
- `packages/report-designer-renderers/src`: 顶层 entries 约 34 个且无子目录；建议在不改变 public API 的前提下按 `page/`、`host/`、`toolbar/`、`field-panel/`、`inspector/` 聚合。`page-renderer.tsx` 的拆分可作为第一步。
- `packages/flux-compiler/src`: 顶层 entries 约 42 个；已有 `schema-compiler/` 子目录且 owner 文档描述清楚。后续新增 compiler shape/rule helpers 应优先进入 `schema-compiler/`，不要回流到顶层。

## 文档-代码偏离清单

- `docs/architecture/taskflow-visual-designer.md` 明确 TaskFlow domain adapter 应拥有 projection sync、validate、lower、serialize/save pipeline；live playground lib 已实现部分 adapter，但全部集中在 `apps/playground/src/taskflow-designer-lib/index.ts`。这是代码组织偏离，不一定是语义未实现，已列为 `[维度02-01]`。
- `docs/architecture/report-designer/design.md` 将 report-designer renderer 层、bridge、host scope、action provider、spreadsheet/report core 分层描述；live `page-renderer.tsx` 语义上基本对齐，但文件边界把多层实现集中在同一 component 文件。已列为 `[维度02-02]`。
- `docs/architecture/flux-runtime-module-boundaries.md` 对 `runtime-factory.ts`、`form-runtime-owner.ts`、`form-runtime.ts`、`form-store.ts` 的当前 ownership 有明确锚点；本轮未把这些文件仅因 500+ warning 报告为缺陷。
- `docs/architecture/array-field.md` 已记录 live implementation 会创建 projected scope / projected FormRuntime view，并绑定 parent owner；`array-field.tsx` 虽超过 500 行，但当前职责与 owner 文档基本一致，本轮未报告。

## 待基线确认项

- 本轮只执行了 `pnpm check:oversized-code-files`，未执行完整 `pnpm check` / `pnpm lint`。
- 顶层目录 entries 统计使用只读 Python 命令辅助生成，作为目录结构建议依据；未作为硬门禁。
- 本轮为初审，所有发现复核状态均为“未复核”；不包含最终复核结论。

## 深挖第 2 轮追加

### [维度02-03] `detail-view.tsx` 在 renderer 文件内吸收 staged owner、draft runtime、值适配、提交回滚与父验证协调

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`
- **行号范围**: `36-544`
- **证据片段**:
  ```ts
  328:     const initialValues = buildDetailDraftInitialValues(adaptedValue, getInitialValues());
  329:
  330:     const newDraftForm = runtime.createFormRuntime({
  331:       id: `detail-view-draft:${scopePath ?? 'static'}:${Date.now()}`,
  332:       initialValues,
  333:       parentScope,
  334:       validation: props.templateNode.validationPlan,
  335:     });
  ```
- **严重程度**: P2
- **现状**: `detail-view.tsx` 已进入 500+ warning，单个 renderer component 同时承担 UI shell、父 form/scope 投影读取、draft `FormRuntime` 创建、`transformIn/validate/transformOut` staged lifecycle、commit patch/update lowering、父验证 settle、失败回滚和 surface 渲染。
- **风险**: 后续补齐 detail-field/detail-view 共享 value adapter、patch overlay、sheet 模式或非 form validation owner 时，变更会继续落到 renderer 文件内，导致 UI shell 修改与 staged owner 语义互相影响；同一 reviewer 很难只审 visual surface 或只审 commit/rollback/validation 流程。
- **建议**: 保留 `DetailViewRenderer` 为薄 renderer；优先提取 `useDetailViewRuntime()` 或 `detail-view-staged-owner.ts` 承担 open/confirm/cancel、draft form 创建、commit rollback、parent validation settle；把 `buildCommittedWrites` / `buildDraftValuesFromCommitResult` 移到纯 helper 并补 focused tests。
- **为什么值得现在做**: 该文件已达 570 行 warning，且 value adaptation 文档明确把 `ValueAdapter` / staged owner helper 视为共享基础设施，不应由具体控件各自内联完整 lifecycle。现在拆分可避免 `detail-field` / `detail-view` / future value-oriented controls 继续复制或修改同一套 owner 流程。
- **误报排除**: 这不是“renderer 较复杂但 owner 清晰”的机械大文件问题；文件内存在具体 runtime owner 创建、提交写入、验证协调和回滚算法，不只是 JSX 组装。也不是 reopened 文档中的“已接受 draft cache 双状态”重报，本条关注模块职责边界，而非判定 staged draft 本身错误。
- **历史模式对应**: 对应本仓库“大型 renderer 第一轮提取 controller/hooks 后停止”的模式；建议类似历史 `table-renderer.tsx` 拆出 controls/row scope/header body，而不是为行数机械拆 JSX。
- **参考文档**: `docs/skills/deep-audit-prompts.md:601-607`, `docs/skills/deep-audit-prompts.md:616-621`, `docs/architecture/value-adaptation-and-detail-field.md:106-140`, `docs/architecture/value-adaptation-and-detail-field.md:167-175`
- **复核状态**: 未复核

### [维度02-04] `schema-compiler/node-compiler.ts` 成为 schema-compiler 拆分后的新中心汇聚点，单函数混合节点组装与多类 feature lowering

- **文件**: `packages/flux-compiler/src/schema-compiler/node-compiler.ts`
- **行号范围**: `69-579`
- **证据片段**:
  ```ts
  533:       validationPlan:
  534:         renderer.scopePolicy === 'form' || schema.type === 'page'
  535:           ? collectValidationModel(
  536:               Object.values(regions)
  ...
  553:       sourcePropKeys: Array.from(sourcePropKeys).sort(),
  554:       sourceStatePropKeys,
  555:       ...(namedActionPlans && Object.keys(namedActionPlans).length > 0 ? { namedActionPlans } : {}),
  556:     };
  ```
- **严重程度**: P2
- **现状**: `node-compiler.ts` 已达 581 行 warning，`createCompileSingleNode()` 内联了 compile failure renderer、field/meta/region 分类循环、lazy eval structural fields、custom field compile error handling、event/lifecycle action compilation、xui import plan、provider wrap plan、validation owner/validation model plan、named action plan、static analysis、data-source/reaction carrier lowering。
- **风险**: `schema-compiler.ts` 已被拆成多个 focused submodules，但 `node-compiler.ts` 正在吸收每个新 node-level feature 的特殊 lowering；后续添加 compile-time transforms、capability contracts、source/reaction 选项或 validation owner 规则时，会继续扩大这个单函数，使 schema shape、runtime provider plan、action/import/source/reaction lowering 的 owner review 边界变模糊。
- **建议**: 不需要把编译 orchestration 拆散成碎片，但应先提取稳定 feature builders：`compile-node-fields.ts` 负责 field loop 输出 props/regions/events/source keys，`compile-node-imports.ts` 负责 importsPlan/prepared imports，`compile-node-validation.ts` 负责 validationOwnerPlan/validationPlan，`compile-node-carriers.ts` 负责 data-source/reaction/named actions。`node-compiler.ts` 保留单节点组装顺序。
- **为什么值得现在做**: 这是历史 `schema-compiler.ts` 拆分后的二次膨胀信号；当前还未超过 700 hard gate，但已是新增 compile feature 的自然落点。趁各 feature lowering 边界仍可按现有 helper 切开，拆分成本低于继续追加 capability/validation/source 规则后再治理。
- **误报排除**: 不是仅因 581 行而报告；文件中已有多个明确 owner 方向的 focused modules（`fields.ts`、`regions.ts`、`tables.ts`、`validation-collection.ts`、`static-analysis.ts`），但 node-level feature lowering 又集中回一个函数。也不是合理薄 orchestrator：该函数不仅调用子模块，还内联构造多类 plan、错误节点、prepared import staticMeta、named action plans 与 source/reaction carriers。
- **历史模式对应**: 对应本仓库“拆分后中心文件二次膨胀 / implementation leakage back into coordinator”的模式；与历史从 `flux-core/src/index.ts`、`schema-compiler.ts` 拆出 focused helpers 的收敛方向一致。
- **参考文档**: `docs/skills/deep-audit-prompts.md:601-607`, `docs/skills/deep-audit-prompts.md:616-621`, `docs/architecture/flux-runtime-module-boundaries.md:65-107`, `docs/architecture/flux-runtime-module-boundaries.md:416-424`
- **复核状态**: 未复核

## 深挖第 3 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度02-01]: 保留 (P2)。live `apps/playground/src/taskflow-designer-lib/index.ts` 仍在入口文件内同时承载 namespace provider、projection flush、`import-json` 的 DSL parse/step conversion 与 default module 导出；虽已有 `projection.ts`/`sync.ts`/`lowering.ts`/`validation.ts`，但 `index.ts` 仍明显不是薄入口。
- [维度02-02]: 保留 (P2)。live `packages/report-designer-renderers/src/page-renderer.tsx` 仍把 core 创建/初始化、双 namespace 注册、report↔spreadsheet 同步守卫、host scope 注入与 WorkbenchShell 渲染集中在单一 renderer 文件内，和 `docs/references/renderer-implementation-guidelines.md` 所述 thin orchestration renderer 基线不符。
- [维度02-03]: 降级为 P3。`packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx` 仍偏重，但 live code 已把 sequencer/draft controller/child validation 外提到 `detail-draft-controller.ts`，且 `docs/architecture/form-validation.md` 明确允许 `detail-view` 在 renderer 打开时创建 child `FormRuntime`；当前更像继续提取本地 controller 的可维护性问题，不足以维持 P2。
- [维度02-04]: 驳回。`packages/flux-compiler/src/schema-compiler/node-compiler.ts` 虽然较大，但其 live 角色仍是“compile single node”的集中编排层；`fields.ts`、`regions.ts`、`validation-collection.ts`、`static-analysis.ts` 等已承担分拆后的专职模块，现状更接近可接受的 compiler orchestration，而非明确的职责越界。

## 子项复核结论

- [维度02-01]: 成立 (P2)。应作为 playground/taskflow 入口文件继续薄化的收口项保留。
- [维度02-02]: 成立 (P2)。应作为 report designer orchestration renderer 继续拆分的收口项保留。
- [维度02-03]: 降级保留 (P3)。可作为后续 detail-view 本地 controller 继续提取的维护性问题进入汇总。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                    | 一句话摘要                                                                      |
| ----- | -------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 02-01 | P2       | `apps/playground/src/taskflow-designer-lib/index.ts`                    | taskflow designer 入口仍非薄入口，混合 namespace/projection/DSL lowering/export |
| 02-02 | P2       | `packages/report-designer-renderers/src/page-renderer.tsx`              | report designer page renderer 仍聚合 core 初始化、双向同步与 host shell 装配    |
| 02-03 | P3       | `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx` | detail-view 仍偏重，但已部分外提，降级为维护性收口项                            |
