# 33 复杂控件平台协议收敛重构计划

> Plan Status: completed
> Last Reviewed: 2026-04-04
> Source: `docs/analysis/framework-stability-and-complex-control-unification-analysis.md` and `docs/plans/33-review.md` reviewed against current code anchors on 2026-04-04

> **Implementation Status: ✅ COMPLETED (2026-04-04)**
> All 6 phases are landed. Shared workbench protocol/types in `packages/flux-core/src/workbench/`, React host helpers and `WorkbenchShell` in `packages/flux-react/src/workbench/`, Flow Designer and Report Designer migrated to `WorkbenchShell`, Word Editor aligned with datasets/leave-guard, Code Editor source-ref resolvers and event wiring complete.

## 复审结论

- 分析文档的主判断成立：`SchemaRenderer` 核心层不需要推翻，真正未收敛的是复杂控件平台层。
- 这份分析文档适合作为诊断结论，不适合作为执行清单；执行层需要拆成共享协议、Flow 基线提炼、Report 组合落地、Word 工作台收敛、Code Editor 声明面收口几个独立阶段。
- 需要加一个现实校准：`report-designer` 的 schema-driven toolbar / field panel / inspector 已由 `docs/plans/32-report-designer-schema-driven-refactor-plan.md` 落地，因此本计划不重复做 UI schema 化，而是继续推进 spreadsheet 组合、命令面对齐和共享协议收敛。
- 结合二次评审与当前代码复查，本计划还需要 5 个执行层校准：补齐 `flow-designer` 文档基线、在 Phase 0 先写出 `DomainBridge` 草图、把 Report Phase 3 固定为“默认直挂 spreadsheet host”路线、明确 Word 先走 non-schema shell 收敛、把 Code Editor 的 source-ref 解析从 `types.ts` 拆到 runtime helper。

## 与现有计划的关系

- `docs/plans/29-domain-runtime-and-debugger-refactor-plan.md` 关注的是领域包大文件拆分和 orchestrator 收口；本计划关注的是跨复杂控件的共享 host/workbench/session 协议，不重复做文件结构审计。
- `docs/plans/32-report-designer-schema-driven-refactor-plan.md` 已完成，不应在本计划中重新打开；本计划只处理其后续仍未完成的 spreadsheet 组合和 command/session 对齐。
- `docs/plans/24-word-editor-development-plan.md` 仍然是 Word Editor 的功能路线图；本计划只抽取其中与共享工作台协议收敛直接相关的部分。

## Problem

当前最值得处理的不是某一个复杂控件内部的小功能缺口，而是复杂控件之间重复实现了相似壳层和宿主协议，但又没有形成真正共享的抽象，已经开始影响后续维护和一致性。

- `packages/flow-designer-renderers/src/designer-page.tsx:65-247` 已经实现了较成熟的 host shell、host scope、`designer` namespace 注册和 toolbar/inspector/dialogs 同边界渲染，但这些能力仍是 Flow Designer 私有实现。
- `packages/spreadsheet-renderers/src/bridge.ts:13-85` 和 `packages/spreadsheet-renderers/src/page-renderer.tsx:63-128` 已经有稳定的 bridge/snapshot/page-shell 模式，但没有上升为共享协议。
- `packages/report-designer-renderers/src/page-renderer.tsx:51-142` 当前 page 壳层虽然已经支持 schema-driven toolbar / field panel / inspector，但默认 body 路径仍没有挂上 spreadsheet host/canvas，`body` 缺失时只能回退 placeholder/fallback；这与 `docs/architecture/report-designer/design.md:22-49` 描述的双层架构目标不一致。
- `packages/report-designer-renderers/src/report-designer-toolbar-defaults.ts:3-15` 已暴露 `report-designer:undo`、`report-designer:redo`、`report-designer:save`、`report-designer:stopPreview`，但 `packages/report-designer-core/src/commands.ts:7-76` 并未定义对应命令面，说明 toolbar、shell、core 还没有对齐。
- `packages/word-editor-renderers/src/WordEditorPage.tsx:26-235` 仍是独立三栏工作台，直接创建 bridge/store、手工管理保存提示和左右面板，尚未进入统一的 host scope、namespaced action、session/leave-guard 路径。
- `packages/word-editor-core/src/document-io.ts:15-70` 已提供 `saveDatasets()` / `loadDatasets()`，但当前 page 层只接线了 `saveDocument()` / `loadDocument()`，保存边界仍不完整。
- `packages/flux-code-editor/src/types.ts:208-235` 对 `VariableSourceRef`、`FuncSourceRef`、`SQLSchemaSourceRef` 和 SQL variable source 的 source-ref 路径仍未实现真实解析，当前只在内联数据场景正常透传，遇到 source-ref 时静默回退空数组；`packages/flux-code-editor/src/code-editor-renderer.tsx:128-150` 也没有把 change 事件回送到 `props.events.onChange`。
- `docs/architecture/code-editor.md:291-341`、`docs/architecture/report-designer/design.md:290-366` 仍保留了明显超前于当前实现的目标态表述，导致后续抽象容易建立在错误基线上。

## Root Cause

- 核心 runtime 先稳定下来后，复杂控件是按各自产品路径独立演进的；共享 workbench / host protocol 从未被正式抽出来，导致正确模式先在单个模块里“长出来”，而不是先被定义为平台能力。
- `flow-designer`、`spreadsheet`、`report-designer`、`word-editor` 面临的问题相似，但落地时分别优先保证“能跑”和“能展示”，于是保存态、busy 态、面板布局、scope 注入、action namespace、resource panel 交互都在各自页面里实现了一遍。
- 文档层混合了“当前已落地基线”和“目标态设计”，但缺少一份中间执行文档去明确哪些能力先统一协议、哪些能力保留领域差异，最终造成实现与文档的双向漂移。
- `code-editor` 这类高级字段控件和 `flow/report/word` 这类页面级设计器复杂度来源不同，但文档和讨论中经常被放进同一抽象层级，增加了过度统一的风险。

## Goals

- 把复杂控件真正需要共享的能力收敛为平台协议：host bridge、host scope/action namespace 接线、session/dirty/save/leave-guard、resource panel 交互、async busy/cancel 语义。
- 保持 `flow-designer` 作为参考实现，把已经验证有效的模式提炼为共享 helper 和规范，而不是重新设计一套新平台。
- 让 `report-designer` 真正建立在 `spreadsheet` 之上，并与共享协议对齐。
- 让 `word-editor` 先并入共享工作台协议，再决定是否继续向 schema-driven 迁移。
- 收口 `code-editor` 的声明面与实现面差距，但保留其“高级字段控件”定位。

## Non-Goals

- 不统一 graph / spreadsheet / word / code 的底层文档模型。
- 不统一 `@xyflow/react`、spreadsheet canvas、`@hufe921/canvas-editor`、CodeMirror 6 的底层引擎接口。
- 不在本计划中把 `word-editor` 一次性改写成完全 schema-driven 的 designer-page。
- 不把 `WordEditorPage` 先强迁成 `RendererComponentProps` renderer 作为本计划前置条件。
- 不把 `code-editor` 提升为新的 designer-core 或独立 page 平台。
- 不重做已经完成的 report-designer schema-driven UI 工作。
- 不为了 `report-designer` 默认 host 组合先引入新的 `spreadsheet-canvas` renderer 类型或默认 `body` schema 机制。

## Fix Plan

**Phase 0 — 冻结共享协议边界与文档基线**

Targets: `docs/architecture/renderer-runtime.md`, `docs/architecture/flow-designer/runtime-snapshot.md`, `docs/architecture/report-designer/design.md`, `docs/architecture/code-editor.md`, new `docs/architecture/complex-control-host-protocol.md`

- 新增一份规范文档，明确哪些能力属于共享复杂控件协议，哪些能力继续留在各 domain core 内部；文档里先给出 `DomainBridge<Snapshot, Command, Result>` 的最小 TypeScript 草图，以及它与 `SpreadsheetBridge`、Flow host wiring、Word non-schema shell 的映射示意。
- 先把 package placement 写清楚：纯类型和无副作用 helper 放进 `@nop-chaos/flux-core`；React 侧 host wiring helper 放进 `@nop-chaos/flux-react`；视觉层 `WorkbenchShell` 若要服务 `WordEditorPage` 这类非 renderer 页面，API 必须保持 React-level，而不是默认绑定 `RendererComponentProps`；不要在第一步就创建新 package。
- 校正文档中的目标态/现状态边界，特别是 `report-designer` 的默认 body 仍未挂上 spreadsheet host、`code-editor` 的 source-ref 空数组回退语义和事件接线缺口、以及 `flow-designer` 的 `runtime-snapshot` 文档与当前 host scope 注入实现的漂移。

Exit criteria: 后续所有实现工作都有统一术语、共享协议草图和所有权说明，不再混用“已经存在的共享能力”和“准备抽取的共享能力”。

**Phase 1 — 在 `flux-core` / `flux-react` 中抽取共享 host protocol 与 lifecycle helpers**

Targets: new `packages/flux-core/src/workbench/*.ts`, new `packages/flux-react/src/workbench/*.ts`, `packages/flux-core/src/index.ts`, `packages/flux-react/src/index.tsx`

- 在 `@nop-chaos/flux-core` 中新增纯协议类型，从最小 `DomainBridge<Snapshot, Command, Result> = { getSnapshot(); subscribe(); dispatch(); }` 出发，再补 `WorkbenchSessionState`、`BusyActionState`、`ResourceBrowserInteractionPolicy` 等横切状态。
- 在 `@nop-chaos/flux-react` 中新增不带 domain 语义的 React helper，用于把现有 domain runtime/wiring 适配到共享 contract，例如 bridge snapshot 订阅、host scope 合并、namespace provider 注册、leave-guard/session 状态桥接。
- 第一阶段不强迫所有 domain 产出完全同形的 bridge 对象；`SpreadsheetBridge` 可以直接实现该 contract，`flow-designer` 则先用 wrapper/helper 表达现有 core + command adapter 组合。
- 第一阶段不抽视觉层 `WorkbenchShell`，只先抽取已被 `flow-designer`、`spreadsheet`、`report-designer` 证明会重复的协议与 wiring helper。
- 如果共享 surface 仍然不稳定，不创建新 package；先在现有核心链路里把可复用最小面固定下来。

Exit criteria: `flow-designer` 与 `spreadsheet` 至少能落到同一套 bridge/session/helper contract 上，而不是各自维护相似但互不兼容的本地接口；Flow 可以先通过 wrapper 达标，不要求第一步就重写成字面同形 bridge。

**Phase 2 — 把 Flow Designer 提炼成共享基线的参考实现**

Targets: `packages/flow-designer-renderers/src/designer-page.tsx`, `packages/flow-designer-renderers/src/designer-context.ts`, related tests/docs

- 用 Phase 1 的共享 helper 替换 `designer-page` 中可抽离的 host scope、namespace 注册、snapshot 订阅和 session 汇总逻辑，但不改变 `DesignerCore`、`DesignerContext`、`DesignerCommandAdapter` 的领域边界。
- 把当前 Flow Designer 的 host shell、host scope 数据暴露模式、toolbar/inspector/dialogs 同边界执行路径沉淀为共享基线，而不是继续作为单模块经验代码存在。
- 保持现有行为不变，让 `flow-designer` 成为后续 `report-designer` 与 `word-editor` 的迁移参照，而不是再设计第二个“理论完美版”。

Exit criteria: Flow Designer 成为“共享协议 + 领域扩展”的第一份真实样板，后续模块迁移时不需要重新猜测 host wiring 组织方式。

**Phase 3 — 让 Report Designer 真正落在 Spreadsheet Host 之上**

Targets: `packages/report-designer-renderers/src/page-renderer.tsx`, `packages/report-designer-renderers/src/bridge.ts`, `packages/report-designer-renderers/src/host-data.ts`, `packages/report-designer-core/src/core.ts`, `packages/report-designer-core/src/commands.ts`, `packages/report-designer-renderers/src/report-designer-toolbar-defaults.ts`, related tests/docs

- 将 `report-designer-page` 从“shell + fallback canvas”推进到真实的“spreadsheet host + report semantic layer”组合；这一阶段明确采用“默认渲染路径直接组合现有 spreadsheet host React 组件”的路线，不新增新的 `spreadsheet-canvas` renderer 类型，也不依赖默认 `body` schema 才能看到真实 canvas。
- 保持 `ReportDesignerBridge extends SpreadsheetBridge` 的现有类型关系不动，重点改成让 `page-renderer`、`host-data` 和默认 body 路径真正建立在这层组合之上，而不是继续用本地 `hostData` + fallback placeholder 维持平行 page shell。
- 把 `report-designer-core` 一并纳入这一阶段：当前 core 会 clone 并独占 `document`，因此若要与真实 spreadsheet host 共享 selection/history/runtime 事实，需要增补显式的 sync/adapter surface，而不是假设只改 renderer 就足够。
- 对齐 toolbar 与 core command surface：要么在 `report-designer-core` 中补齐 `undo`、`redo`、`save`、`stopPreview` 等命令，要么在落地前先从默认 toolbar 移除这些动作，不能继续保持“按钮存在但命令不存在”的状态。
- 让 inspector、field panel、preview 状态都通过共享 host/session 协议暴露给 schema 片段，而不只是本地 `hostData` 对象。

Exit criteria: `report-designer-page` 在未显式提供 `body` schema 时也会挂载真实 spreadsheet host，toolbar 动作与 core 命令面对齐，report host 不再依赖 fallback-only 路径，且 renderer/core 之间有明确的 spreadsheet sync boundary。

**Phase 4 — 在共享协议稳定后抽取 `WorkbenchShell` 与交互规范**

Targets: new shared shell module under `packages/flux-react/src/workbench/` or a dedicated package only if the visual API proves stable and generic, plus architecture docs

- 当 `flow-designer` 与 `report-designer` 都已经基于同一套 host/session helper 运行后，再抽视觉层 `WorkbenchShell`，覆盖 header/toolbar/statusbar、左右面板折叠、拖拽调宽、窄屏 fallback、主工作区优先级等共同问题。
- `WorkbenchShell` 必须保持 React-level/presentational API，可同时服务 `designer-page` 这类 Flux renderer 页面和 `WordEditorPage` 这类普通 React 页面；Flux 特有的 scope/action wiring 继续留在独立 helper 中，不绑进视觉壳。
- 同步定义资源面板交互规范：主点击负责选中或插入，编辑/删除/更多作为次级动作，drag-and-drop 不是唯一入口，必须提供键盘或 click-to-insert 等价路径。
- 同步定义异步主动作规范：busy、disable/stop 切换、防重入、可取消语义、结果反馈。
- 只有在 visual shell API 已经稳定、同时被 Flux renderer 页面和 non-schema 页面验证复用，且明显超出 `flux-react` 现有职责时，才创建独立 package；否则继续在 `flux-react` 内部维持最小共享实现。

Exit criteria: `flow-designer` 与 `report-designer` 不再各自维护一套不同的面板布局和 busy/save 交互约定。

**Phase 5 — 把 Word Editor 向共享 workbench/session 协议靠拢**

Targets: `packages/word-editor-renderers/src/WordEditorPage.tsx`, `packages/word-editor-core/src/document-io.ts`, related hooks/tests/docs

- 先用共享 `WorkbenchShell`、session/dirty/save/leave-guard 和资源面板规范替换 `WordEditorPage` 当前的手工三栏页壳；这一阶段不要求先把 `WordEditorPage` 改写成 `RendererComponentProps` renderer，也不把接入 schema fragments 作为前置条件。
- 接线 `saveDatasets()` / `loadDatasets()`，把文档保存和数据集保存范围显式化，避免继续把数据集状态隐含留在 page 层之外。
- 逐步把工具栏、左侧资源面板、右侧大纲/属性区的主动作和次级动作整理到统一规范里，但保留 `CanvasEditorBridge` 与当前 store 体系。
- 若 `word-editor` 需要 namespaced action，只引入最小的 `word-editor:*` shell 层命令；如果后续证明必须迁入 Flux renderer 体系，再另开 follow-up plan，不在本阶段新增新的 designer-core 或强制 renderer migration。

Exit criteria: Word Editor 至少在页面壳层、保存边界、busy/leave-guard、资源面板交互上与 Flow/Report 共享同一套约定，同时保留当前底层编辑引擎、领域模型和普通 React page 入口。

**Phase 6 — 收口 Code Editor 的实现面，避免被错误纳入 designer 平台**

Targets: `packages/flux-code-editor/src/types.ts`, new `packages/flux-code-editor/src/source-resolvers.ts`, `packages/flux-code-editor/src/code-editor-renderer.tsx`, `packages/flux-code-editor/src/use-code-mirror.ts`, `packages/flux-code-editor/src/index.ts`, `docs/architecture/code-editor.md`, related tests

- 实现 `VariableSourceRef`、`FuncSourceRef`、`SQLSchemaSourceRef` 和 SQL variable source 的真实解析路径；纯类型和内联同步 resolver 继续留在 `types.ts`，scope/API 读取逻辑放进新的 runtime resolver/helper 模块，不把 host lookup/fetch 行为塞进类型文件。至少补齐 scope source，API source 视现有 fetch boundary 分层落地。
- 让 `code-editor-renderer` 在 change 路径里通过 Flux 事件系统触发 `props.events.onChange`，保持 focus/blur/change 语义一致。
- 把 source-ref + change event 这部分收口视为可在 Phase 0 完成后并行推进的 contract fix；fullscreen、SQL execution busy/result 面的交互约束再对齐到共享 async-action 规范，但保持它作为字段控件的轻量定位。
- 同步更新 `docs/architecture/code-editor.md`，把未落地的未来设想与当前已支持能力明确分层，避免继续被误读为“平台级设计器”。

Exit criteria: Code Editor 的文档声明面和真实实现面对齐，source-ref 与 change event 可用，但组件仍保持字段级 renderer 定位。

**Phase 7 — 文档收口、回归测试和遗留清理**

Targets: touched architecture docs, package tests, `docs/logs/`, optionally follow-up plans for leftover issues

- 每个阶段完成后都更新架构文档和当日日志，不把共享协议的最终形状只留在实现细节里。
- 为 shared host protocol、shared session helper、report-on-spreadsheet 组合、word shell 迁移、code-editor source-ref/change event 增加对应测试。
- 若某个模块在执行中暴露新的领域问题，另开新计划，不在本计划中顺手扩大范围。

Exit criteria: 平台协议有规范文档、参考实现、跨模块验证和明确的遗留边界，不再依赖单篇分析文档维持共识。

## Scope

- `docs/architecture/complex-control-host-protocol.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flow-designer/runtime-snapshot.md`
- `docs/architecture/report-designer/design.md`
- `docs/architecture/code-editor.md`
- `packages/flux-core/src/workbench/*.ts`
- `packages/flux-react/src/workbench/*.ts(x)`
- `packages/flow-designer-renderers/src/designer-page.tsx`
- `packages/flow-designer-renderers/src/designer-context.ts`
- `packages/spreadsheet-renderers/src/bridge.ts`
- `packages/report-designer-core/src/core.ts`
- `packages/report-designer-core/src/commands.ts`
- `packages/report-designer-renderers/src/page-renderer.tsx`
- `packages/report-designer-renderers/src/bridge.ts`
- `packages/report-designer-renderers/src/host-data.ts`
- `packages/report-designer-renderers/src/report-designer-toolbar-defaults.ts`
- `packages/word-editor-renderers/src/WordEditorPage.tsx`
- `packages/word-editor-core/src/document-io.ts`
- `packages/flux-code-editor/src/types.ts`
- `packages/flux-code-editor/src/source-resolvers.ts`
- `packages/flux-code-editor/src/code-editor-renderer.tsx`
- `packages/flux-code-editor/src/use-code-mirror.ts`
- `packages/flux-code-editor/src/index.ts`
- 相关 package manifests（若 shared shell 提取改变依赖边）
- 相关测试文件与 `docs/logs/2026/04-04.md`

## 不在 Scope 内的事项

- 统一各 domain core 的文档模型和序列化格式。
- 替换底层第三方编辑引擎。
- 将所有复杂控件一次性迁移到同一页面 schema 结构。
- 顺手处理与本计划无关的 playground、debugger、UI package 问题。

## Effort

- 预计 12-18 个工作日。
- 建议拆成 7 个独立执行切片：文档基线、共享协议/helper、Flow 基线提炼、Report 默认 host 组合、WorkbenchShell 抽取、Word 收敛、Code Editor 收口。
- `code-editor` 的 source-ref / `onChange` contract fix 可在 Phase 0 后与 Flow/Report 迁移并行推进；async-action 交互约束在共享规范稳定后收尾。
- 每个切片单独提交或单独 PR，避免出现跨 4 个以上包的大爆炸改动。

## Verification

优先做分阶段、分包验证，最后再做全仓验证。

```bash
pnpm --filter @nop-chaos/flux-core typecheck
pnpm --filter @nop-chaos/flux-core build
pnpm --filter @nop-chaos/flux-core lint
pnpm --filter @nop-chaos/flux-core test

pnpm --filter @nop-chaos/flux-react typecheck
pnpm --filter @nop-chaos/flux-react build
pnpm --filter @nop-chaos/flux-react lint
pnpm --filter @nop-chaos/flux-react test

pnpm --filter @nop-chaos/flow-designer-renderers typecheck
pnpm --filter @nop-chaos/flow-designer-renderers build
pnpm --filter @nop-chaos/flow-designer-renderers lint
pnpm --filter @nop-chaos/flow-designer-renderers test

pnpm --filter @nop-chaos/spreadsheet-renderers typecheck
pnpm --filter @nop-chaos/spreadsheet-renderers build
pnpm --filter @nop-chaos/spreadsheet-renderers lint
pnpm --filter @nop-chaos/spreadsheet-renderers test

pnpm --filter @nop-chaos/report-designer-core typecheck
pnpm --filter @nop-chaos/report-designer-core build
pnpm --filter @nop-chaos/report-designer-core lint
pnpm --filter @nop-chaos/report-designer-core test

pnpm --filter @nop-chaos/report-designer-renderers typecheck
pnpm --filter @nop-chaos/report-designer-renderers build
pnpm --filter @nop-chaos/report-designer-renderers lint
pnpm --filter @nop-chaos/report-designer-renderers test

pnpm --filter @nop-chaos/word-editor-core typecheck
pnpm --filter @nop-chaos/word-editor-core build
pnpm --filter @nop-chaos/word-editor-core lint
pnpm --filter @nop-chaos/word-editor-core test

pnpm --filter @nop-chaos/word-editor-renderers typecheck
pnpm --filter @nop-chaos/word-editor-renderers build
pnpm --filter @nop-chaos/word-editor-renderers lint
pnpm --filter @nop-chaos/word-editor-renderers test

pnpm --filter @nop-chaos/flux-code-editor typecheck
pnpm --filter @nop-chaos/flux-code-editor build
pnpm --filter @nop-chaos/flux-code-editor lint
pnpm --filter @nop-chaos/flux-code-editor test

pnpm typecheck
pnpm build
pnpm lint
pnpm test
```

## 变动文件清单

| File | Change | Lines affected |
|------|--------|---------------|
| `docs/architecture/complex-control-host-protocol.md` | 新增共享 host/workbench/session 协议规范 | ~180-260 |
| `docs/architecture/flow-designer/runtime-snapshot.md` | 校正 host scope 注入现状与共享协议映射 | ~40-100 |
| `docs/architecture/report-designer/design.md` | 校正 report/spreadsheet 组合落地状态与共享协议接线约束 | ~40-80 |
| `docs/architecture/code-editor.md` | 收口当前已支持能力、source-ref fallback 语义与 future phases 边界 | ~60-140 |
| `packages/flux-core/src/workbench/*.ts` | 新增纯协议类型与无副作用 helper | ~120-220 |
| `packages/flux-react/src/workbench/*.ts(x)` | 新增 host wiring helper，并在 API 稳定时抽 React-level `WorkbenchShell` | ~220-380 |
| `packages/flow-designer-renderers/src/designer-page.tsx` | 切换到共享 helper，保留领域逻辑 | ~60-140 |
| `packages/flow-designer-renderers/src/designer-context.ts` | 收口 host scope 数据暴露与共享 helper 接线 | ~40-100 |
| `packages/report-designer-core/src/core.ts` | 增补 spreadsheet host 同步/adapter surface，避免 renderer-only 假设 | ~60-160 |
| `packages/report-designer-renderers/src/page-renderer.tsx` | 默认路径直接组合 spreadsheet host，而不是 fallback placeholder | ~140-260 |
| `packages/report-designer-core/src/commands.ts` | 对齐 toolbar 需要的命令面 | ~20-80 |
| `packages/report-designer-renderers/src/bridge.ts` | 保持既有继承关系并让默认 host 路径真正消费该组合 | ~20-60 |
| `packages/report-designer-renderers/src/host-data.ts` | 让 host data 改从 composed spreadsheet/report snapshot 派生，而不是本地平行 shape | ~40-100 |
| `packages/word-editor-renderers/src/WordEditorPage.tsx` | 接入 React-level shared shell/session，保持普通 React 页面入口 | ~120-220 |
| `packages/word-editor-core/src/document-io.ts` | 接线 datasets save/load 或补足 session helper 支撑 | ~20-60 |
| `packages/flux-code-editor/src/types.ts` | 保持 public types / inline resolver，移除对 runtime source lookup 的错误承载 | ~20-60 |
| `packages/flux-code-editor/src/source-resolvers.ts` | 新增 scope/API source-ref 解析 helper | ~80-180 |
| `packages/flux-code-editor/src/code-editor-renderer.tsx` | 接线 `onChange` 事件并接入 runtime source resolver | ~40-120 |
| `packages/flux-code-editor/src/use-code-mirror.ts` | 视需要补强 change/focus/blur 桥接细节 | ~10-40 |
| `packages/flux-code-editor/src/index.ts` | 导出新增 source resolver surface | ~10-30 |

## 风险与回退

- 风险 1：共享协议抽象过早，结果只适配 `flow-designer`，却无法自然覆盖 `word-editor`。回退策略：先抽类型和 helper，不先抽视觉壳；任何 visual shell 都在第二个 domain 证明复用后再落地。
- 风险 2：`report-designer` 组合 spreadsheet host 时破坏 snapshot identity 或 command 流程。回退策略：保留 page 级旧实现直至新的 bridge + body 组合通过包级测试，再删除 fallback-only 路径。
- 风险 3：`word-editor` 页壳迁移不自觉扩大成完整 Flux renderer migration，反而把 Phase 5 变成新平台接入工程。回退策略：先替换外层 React-level shell/session，不把 `WordEditorPage` 改成 `RendererComponentProps` 作为前置条件；若 schema 化确有必要，再另开计划。
- 风险 4：`code-editor` 为了接入共享规范而被过度平台化。回退策略：只迁移 source-ref、change event、busy/result 约定，不引入新的 page shell、designer action 或 core store。
- 风险 5：workspace 级验证可能再次撞上 unrelated blocker。回退策略：以受影响包的分包验证为主，并在执行记录中明确区分已有阻塞和本计划新增回归。

## 成功标准

- `flow-designer`、`spreadsheet`、`report-designer` 至少共享同一套 host bridge / session / action wiring 协议。
- `report-designer-page` 在默认渲染路径上即可运行真实 spreadsheet host，而不是 fallback canvas。
- `word-editor` 使用共享的 workbench shell/session 规范，并明确 document 与 datasets 的保存边界，同时保留普通 React page 入口。
- `code-editor` 的 source-ref 通过真实 runtime resolver 路径可用，change event 与文档声明面对齐，同时仍保持字段控件定位。
- 共享协议有架构文档、参考实现和测试，而不是继续停留在分析结论或单模块经验中。
