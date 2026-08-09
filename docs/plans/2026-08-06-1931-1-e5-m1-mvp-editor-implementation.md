# 1 Editor Mission E5 M1 MVP 编辑器实现

> Plan Status: completed
> Last Reviewed: 2026-08-07
> Source: `docs/components/roadmap-industrial-hmi-editor.md`（E5 work items E5.1/E5.2/E5.3/E5.4、Phase Details E5、Work Items §E5 表的 M1 交付边界、Cross-Cutting 平台能力复用/双态隔离/spike 先行纪律/测试纪律/人工确认阈值/文档共识审查）、`docs/components/industrial-hmi/editor-initiation.md`（§2.1 五功能域 + §2.2 M1 里程碑边界 + §3 复用点三态 + §6 R3/R5/R7 风险）、`docs/components/industrial-hmi-editor/design-architecture.md`（E2.1，§4.2 双态隔离三层机制 + §4.3 编辑态画布架构 + §4.5 编辑会话模型 + §4.6 事件派发链策略 + §4.8 9 spike 约束）、`docs/components/industrial-hmi-editor/design-renderer.md`（E2.6，§4.1 ScadaEditorCanvasSchema 完整契约 + §4.5 提交语义 + §8.3 React 桥接 + §8.4 测试句柄 + §8.5 句柄面 + §10 DOM marker + §11 实现拆分）、`docs/components/industrial-hmi-editor/design-property-panel.md`（E2.2，§4 schema 抽取 + §5 六类字段 + §6 validate 衔接 + §7 只写声明结构）、`docs/analysis/industrial-hmi-editor/selection-gate-2026-08-06.md`（路径 A 维持 + 9 条设计约束）、`docs/analysis/industrial-hmi-editor/editing-envelope-2026-08-06.md`（编辑态包络裁定建议值）
> Related: `docs/plans/2026-08-06-2118-2-e4-package-infra-and-dependency.md`（E4 上游，包基建 + 空壳注册；本 plan 替换空壳为 M1 实现）、`docs/plans/2026-08-06-2118-1-e3-design-gate-review.md`（E3 设计 gate 终轮复核，设计契约权威输入）、`docs/plans/2026-08-03-2113-4-i7-scada-canvas-renderer.md`（runtime scada-canvas renderer 实现先例，React 桥接/适配层/测试句柄范本）
> Mission: industrial-hmi-editor
> Work Item: E5

## Purpose

执行 industrial-hmi-editor mission 的 **E5 M1 MVP 编辑器实现**：在 E4 包基建（`src/editor/` subpath + `@leafer-in/editor@2.2.9` + 空壳 `scada-editor-canvas` renderer）基础上，落地 M1 交付边界——

1. **E5.1 编辑态画布组件 + 双态切换**：替换 E4 空壳为真正的编辑态画布——装配 leafer App + Editor 实例（路径 A，spike 已验证 `tree:viewport + move:drag:'auto' + editable:true + 真实点击` 手势仲裁成立）、编辑会话模型（working copy + committedBaseline + selection + mode，**M1 不含 undo/redo 栈**——undo-redo 属 M2/E7.2）、适配层骨架（leafer Editor 事件族 → 抽纯 payload + nodeId 映射，**不直传** leafer 循环引用事件）、双态切换（edit ↔ preview：Editor 装配/卸载 + `editable` 注入/撤销 + InteractionOverlay 关闭/启用）、提交语义骨架（manual/auto）、测试句柄 `window.__flux_scada_editor_<cid>`（§8.4 契约）。
2. **E5.2 图元库面板 + 拖拽放置**：图元库面板消费 runtime `symbol-registry`（24 内置 + `listScadaSymbols()` 只读）；拖入放置（palette → canvas）→ 经 `engine.applyDiff` 写回 working copy；画布内**单选 + 拖动 + 缩放 + 旋转**（基于路径 A leafer Editor，复用 spike 验证的 TransformTool/EditBox 原语；**M1 不含多选/框选**——属 M2/E7.2）；编辑态几何字段写回 working copy（经适配层读 target 几何，spike 约束 #5 scale→width-height + rotateGap:45）。
3. **E5.3 属性面板 schema**：消费统一抽取的图元 props schema（扩展 `ScadaSymbolPropSchemaEntry` editor hints：group/label/widget/defaultValue/enum/min/max/required/readonly/visibleWhen）、24 内置图元补全 editor hints、inspector 面板 UI（六类分组：geometry/style/binding/state/animation/event，复用 `@nop-chaos/ui` Field/Input/Select/Combobox/Switch/Slider 等）、编辑期校验衔接 runtime `validateScadaConfig`（即时报错，复用 `SCADA_ERROR_CODES`，不新建第二套规则）、绑定/状态/动画/事件**只写声明结构**（运行时装配零改动，design-property-panel.md §7）。
4. **E5.4 句柄扩展 + 保存/加载**：扩展组件句柄面——**M1 仅** `addSymbol`/`removeSymbol`/`updateSymbol`（入 editor 扩展句柄面，经同一 `ComponentHandleRegistry`；`group`/`ungroup`/`undo`/`redo` 属 M2/E7，**不在 E5 范围**）+ `save`（序列化 working copy → 经 `onSave` 或 config 同步链触发下游 scada-canvas 重建）+ `load`（外部 config 装入 working copy + 重置 session）。

E5 是编辑器 mission 的**首个实现里程碑**：E0（spike）+ E1（选型）+ E2（设计）+ E3（设计 gate）+ E4（包基建）全部为 E5 的前置输入；E5 完成后 E6（M1 gate，独立 review）才可推进。E5 不实现连线/多选/undo-redo（M2/E7）、不实现工具箱对齐分布（M3/E9）、不做编辑态性能最终测量（E6/E9.2）。

## Current Baseline

- **E4 包基建已落地（方案 A 裁定）**：`packages/flux-renderers-industrial/src/editor/` subpath 存在（7 文件：`index.ts` 导出 `registerScadaEditorRenderers` + 类型 / `scada-editor-canvas.tsx` 空壳组件（`data-status="shell"`）/ `renderer-definitions.ts` 空壳定义（最小 fields config/width/height）/ `schemas.ts` 最小 schema + `ScadaEditorCanvasEvents` 类型 / `styles.css` / 两个测试）；`@leafer-in/editor@2.2.9` 依赖已引入（package.json:28）；subpath `/editor` export + `tsconfig.base.json` paths + `vite.workspace-alias.ts` 三通道接线完成；`examples.manifest.json` `runtime` 含 `scada-editor-canvas`；playground `App.tsx` subpath import 注册。**模块图隔离证明**：主入口 `src/index.ts` 零 editor 引用 + `src/` 无 `@leafer-in/editor` runtime import（grep 4 hits 全为 JSDoc）。
- **设计契约已稳定（E2 产出 + E3 gate 通过 + 共识审查达成）**：6 份 design-\*.md 落地于 `docs/components/industrial-hmi-editor/`，其中 E5 消费 3 份（`design-architecture.md` E2.1 / `design-renderer.md` E2.6 / `design-property-panel.md` E2.2）；E3 设计 gate `docs/analysis/industrial-hmi-editor/e3-design-gate-review.md` verdict `pass-with-minors`（0B/0M/1m+1n 已落地）；6 文档跨文档一致性核对 PASS。
- **选型结论（路径 A 维持，spike 已验证）**：spike 报告 `docs/analysis/industrial-hmi-editor/spike-2026-08-05.md` 三项全绿——E0.1 手势仲裁成立（`tree:viewport + move:drag:'auto' + editable:true + 真实点击`，深探针 P1 验证）/ E0.2 六大 Editor 事件族 0 漂移（载荷真实抽取，`results-e0.2-*.json`）/ E0.3 编辑态性能候选达标（10k 选区 32.2fps ≥30，覆盖物方案 A 采纳）；R1（选型变更）不触发。**9 条 spike 设计约束**（selection-gate §5）作为 E5 实现权威输入：① editable:true 双态切换 / ② 真实点击选中 / ③ editor.move 适配层抽纯 payload+nodeId（禁直传）+ 节流起止帧 / ④ editor.cancel() 替代 list=[] / ⑤ scale→width-height + rotateGap:45 / ⑥ 框选 selectKeep:true（**M1 不实现框选，M2/E7.2 落地**）/ ⑦ group/ungroup 结构 diff（**M2/E7**）/ ⑧ InnerEditor 依赖 inner-editor 插件 / ⑨ 覆盖物方案 A。
- **runtime 复用点（E5 直接消费，禁止重复实现）**：
  - 引擎层 `engine/scada-engine.ts`（24 公开方法，其中 18 命令面：applyAttrs/applyDiff/exportConfig/importConfig/reset/destroy/fit/center 等 + tree/ground/sky 三层 + viewport 插件 + ConfigAdapter nodeById O(1)）；
  - 序列化面 `serialization/`（`parse.ts` parseScadaConfig / `validate.ts` validateScadaConfig + SCADA_ERROR_CODES 衔接 / `serialize.ts` serializeScadaConfig（恒不输出 `editable`，grep 证实）/ `config-types.ts` ScadaConfig/ScadaSymbolNode/ScadaBinding/ScadaAnimation/ScadaStateDeclaration/ScadaSymbolEvent/ScadaConfigDiff / `diff.ts` diffScadaConfig）；
  - 图元注册表 `symbols/symbol-registry.ts`（registerScadaSymbol + listScadaSymbols 只读）/ `symbols/symbol-types.ts`（ScadaSymbolDefinition + ScadaSymbolPropSchemaEntry 现状仅 `{type}` 6 种粗粒度）/ `symbols/register-builtin.ts`（24 内置定义）/ `symbols/composite.ts`（compositePropSchema :114-135）；
  - 句柄面 `renderer/hooks/use-scada-handles.ts`（SCADA_HANDLE_METHODS 9 方法常量，:11-21）；
  - React 桥接范本 `renderer/hooks/use-scada-engine.ts`（fabric ref/effect + dispose 范本 + ResizeObserver + 测试句柄挂载）/ `renderer/hooks/use-scada-config-sync.ts`（full/diff 同步判定，提交语义衔接点）；
  - 事件派发 `createNormalizedActionEvent`（`@nop-chaos/flux-react` 导入，单参数签名 `{ type, ...payload }`；runtime 使用先例 `renderer/hooks/use-scada-events.ts:3 import + :88 调用`）；
  - 测试句柄 `engine/test-handle.ts`（mount/remove 模式）。
- **编辑态包络（E1.2 裁定建议值，R7 待人工确认）**：拖拽响应 ≥30fps @ 选区 ≤1k primary / 编辑操作响应 <100ms / 内存 ≤320MB / 编辑器本体 runtime 最终验证留 E6（M1 gate）。E5 实现需对齐包络约束（适配层节流、不每帧入栈），但**数值化最终验证属 E6/E9.2**，E5 不闭环。
- **roadmap Phase Status**：E5 `todo`（本 plan 激活时 → `planned`）；E4 `done`（前置已满足）；E6 `todo`（后继 gate）。
- **真实剩余 gap**：E4 空壳组件无 Editor 装配 / 无编辑会话模型 / 无双态切换 / 无适配层 / 无测试句柄；图元库面板未实现；拖拽放置未实现；属性面板 schema 未抽取（`ScadaSymbolPropSchemaEntry` 未扩展）；inspector UI 未实现；编辑器扩展句柄（addSymbol/removeSymbol/updateSymbol）未注册；save/load 提交语义未实现。

## Goals

- **E5.1**：`scada-editor-canvas` renderer 从空壳升级为真正的编辑态画布——装配 leafer App + Editor 实例（`new App({ editor: {} })`，spike §1.5 #1）+ 编辑会话模型（`ScadaEditorSession`：workingConfig/committedBaseline/selection/mode，M1 子集）+ 适配层骨架（Editor 事件族抽纯 payload+nodeId，禁直传 leafer 循环引用）+ 双态切换（edit ↔ preview）+ 测试句柄 `window.__flux_scada_editor_<cid>`（§8.4 契约：session 投影 + editor/engine/app 实例 + switchMode/setSelection/clearSelection/save/load）。
- **E5.1**：双态隔离 R5 落地——三层隔离（图元 editable 开关 / 编辑会话 working copy 分离 / 事件派发链隔离）+ 4 项不泄漏验证（editable 不进序列化 / working copy 不直改下游 config / 适配层不派发 `symbol:*` action / unmount 无残留）。
- **E5.2**：图元库面板渲染 24 内置图元（`listScadaSymbols()` 只读）+ 拖入放置（palette → canvas，经 `addSymbol` 写 working copy）+ 画布内单选/拖动/缩放/旋转（复用 leafer Editor 原语，spike 约束 #2 真实点击选中）+ 几何字段写回 working copy（适配层读 target 几何，spike 约束 #5）。
- **E5.3**：`ScadaSymbolPropSchemaEntry` 扩展 editor hints（group/label/widget/defaultValue/enum/min/max/required/readonly/visibleWhen，**新增字段全 optional，runtime 装配零影响**）+ 24 内置图元补全 editor hints + inspector 面板 UI（六类分组 + 字段 widget 渲染，复用 `@nop-chaos/ui`）+ `extractPanelFields`/`parseFieldErrors` 纯逻辑（单测先行）+ validate 衔接（即时报错）。
- **E5.4**：editor 扩展句柄注册（addSymbol/removeSymbol/updateSymbol 经 `ComponentHandleRegistry`，runtime 9 句柄保留）+ 错误码注册（`editor-errors.ts` 独立映射函数，前缀 `industrial.scada.editor.error.<code>`）+ save/load 提交语义（manual 缺省：序列化 working copy → `onSave` 派发 + 经 config 同步链触发下游重建；load：替换 working copy + 重置 session）。
- roadmap Phase Status 回写（E5: `todo` → `planned` 本 plan 激活时；→ `done` 留待 E6 gate + closure-audit 通过）；daily log 记录。

## Non-Goals

- **不实现 undo-redo**（M2/E7.2）：编辑会话模型在 M1 不含 undo/redo 栈与 `component:undo()`/`component:redo()` 句柄（design-undo-redo.md 明确 undo-redo 属 P1 M2）；`onSessionChange` 载荷的 `canUndo`/`canRedo` 在 M1 恒为 false（留 E7.2 接通）。
- **不实现连线**（M2/E7.1）：pipe-junction 端点吸附、`custom.connections` 声明写入、折线重拖、连接联动属 E7.1；属性面板的 `connections` 虚拟字段在 M1 不编辑（仅 pipe-junction 图元可见，M1 走 json-editor fallback 或隐藏）。
- **不实现多选/框选**（M2/E7.2）：画布内交互仅单选（spike 约束 #2）；框选 selectArea + selectKeep:true（spike 约束 #6）属 E7.2。
- **不实现 group/ungroup 句柄**（M2/E7）：`component:group()`/`component:ungroup()` 属 E7（结构 diff + nodeId 重映射）。
- **不实现工具箱对齐/分布/层级/复制粘贴/图元库管理**（M3/E9.1）：design-toolbox.md 能力属 E9。
- **不做编辑态性能最终测量**（E6/E9.2）：E5 实现对齐包络约束（节流/不每帧入栈），但 benchmark 复测 + R7 数字最终确认属 E6/E9.2 + 人工。
- **不修改 runtime `scada-canvas` renderer / runtime 复用点面**（E5 只在 `src/editor/` subpath 内实现，runtime 面只读消费；`ScadaSymbolPropSchemaEntry` 扩展属 runtime 类型但**只新增 optional 字段**，runtime 装配不读新字段，零行为变更——design-property-panel.md §4.2 扩展原则）。
- **不变更选型主路径**（路径 A，E1 已裁定；E5 只消费 spike 验证结论）。
- **不做 M1 交付边界最终裁定**（属 E6.2 gate「§2.2 范围级确认」，E5 按文档化 M1 边界实现，E6 确认）。

## Scope

### In Scope

- **E5.1 编辑态画布组件 + 双态切换 + 编辑会话 + 适配层骨架 + 测试句柄**：
  - `Proof`：前置验证——核对 E4 `done`（roadmap E4 = `done`，`src/editor/` 空壳存在）+ spike 报告 + 设计契约稳定；未就绪则等待。
  - `Fix`：替换 `scada-editor-canvas.tsx` 空壳为编辑态画布——`useEditorEngine`（Editor 实例生命周期：mount `new App({ editor: {} })` + 初始 config 装载 + editable 注入 + 测试句柄挂载；unmount destroy 幂等；resize ResizeObserver → engine.setSize 防抖到帧）。
  - `Fix`：`editor-session.ts`（`ScadaEditorSession` M1 子集：workingConfig/committedBaseline/selection/mode，**不含 undoStack/redoStack**——留 E7.2；域内部 ref 持有，不进 scope）。
  - `Fix`：`editor-adapter.ts` 骨架（Editor 事件族监听：editor.move/scale/rotate/skew/select/hover → 抽纯 payload + nodeId 映射，**禁直传 leafer 循环引用事件**，spike §2.5 关键约束；transform 族节流起止帧占位（M1 单选场景节流逻辑骨架，M2 多选完善）；**不派发 `symbol:*` action**，R5 隔离；editor.cancel() 清空选区，spike 约束 #4）。
  - `Fix`：双态切换——edit 模式（Editor 装配 + 图元 editable:true 注入 + InteractionOverlay 关闭）/ preview 模式（Editor 卸载 + editable:false + InteractionOverlay 启用 → 行为等同运行态 scada-canvas，派发 `symbol:*` action）；经 `mode` prop + `switchMode` 测试句柄 + `onModeChange` 事件。
  - `Fix`：`editor-test-handle.ts`（`window.__flux_scada_editor_<cid>` mount/remove，§8.4 契约：session 只读投影 + editor/engine/app 实例 + switchMode/setSelection/clearSelection/save/load）。
  - `Fix`：renderer-definitions.ts 补全 fields（mode/commitPolicy/viewport/regions/events 整体 prop，对齐 design-renderer.md §4.3 D-1 裁定）+ schemas.ts 补全 ScadaEditorCanvasSchema 完整字段。
  - `Fix`：styles.css + DOM marker（design-renderer.md §10：8 个 marker + data-slot，根容器 `data-slot="scada-editor-canvas"` + canvas `data-slot="scada-editor-canvas-canvas"`）。
  - `Proof`：单选 + 拖动 + 缩放 + 旋转 e2e（真实浏览器 Playwright 程序化断言，经测试句柄读 session.workingConfig 几何字段变化；禁截图判定）；双态切换 e2e（edit 模式不派发 symbol:click / preview 模式派发）；不泄漏验证（serialize 后 config 无 editable 字段）。
- **E5.2 图元库面板 + 拖拽放置**：
  - `Fix`：图元库面板（`palette` region）消费 `listScadaSymbols()` 只读列出 24 内置图元（类型 + 显示名，复用 runtime 注册表，**不重复注册图元定义**）。
  - `Fix`：拖入放置——palette 项 → canvas 拖放（HTML5 drag-drop 或 pointer 事件，经 `addSymbol` 句柄写 working copy + engine.applyDiff 装配到画布）。
  - `Fix`：画布内单选 + 拖动 + 缩放 + 旋转（复用 leafer Editor 原语，真实点击选中 spike 约束 #2；适配层读 target 几何写回 working copy，spike 约束 #5 scale→width-height + rotateGap:45）。
  - `Proof`：拖入放置 + 单选拖动 + 缩放 + 旋转 e2e（经测试句柄读 working copy 几何字段 + Editor 选区 nodeIds）。
- **E5.3 属性面板 schema + inspector UI + validate**：
  - `Fix`：扩展 `symbols/symbol-types.ts` `ScadaSymbolPropSchemaEntry`（新增 optional 字段：group/label/description/widget/defaultValue/min/max/step/enum/required/readonly/visibleWhen；`ScadaPropFieldGroup` + `ScadaPropEditorWidget` 类型，design-property-panel.md §4.2）。**既有 `type` 字段不变，runtime 装配零影响**。
  - `Fix`：24 内置图元定义补全 editor hints（group/label/widget/defaultValue 等，逐图元对齐 design-property-panel.md §5 六类字段；geometry/style 字段从现有 props 推导）。
  - `Proof`：`extractPanelFields(definition)` + `parseFieldErrors(validateErrors)` 纯逻辑单测（按六类分组 + widget 推导 + visibleWhen 评估 + defaults 权威源；纯逻辑单测先行，design-property-panel.md §11）。
  - `Fix`：inspector 面板 UI（`inspector` region）：消费 `useEditorSession` 选中图元 → `extractPanelFields` 生成字段集 → 六类分组渲染（geometry/style/binding/state/animation/event）→ 字段 widget 渲染（复用 `@nop-chaos/ui` Field/Input/Textarea/Select/NativeSelect/Combobox/Switch/Slider；binding/state/animation/event 走 json-editor M1 fallback）→ onChange 经 `updateSymbol` 句柄写 working copy。
  - `Fix`：validate 衔接——字段编辑后调 `validateScadaConfig(workingConfig)`（复用 runtime 单一事实源，**不新建第二套规则**，design-property-panel.md §6）；`parseFieldErrors` 解析 scope path → 字段级错误 UI（红色文本 + tooltip，复用 `@nop-chaos/ui` Field error 状态）。
  - `Proof`：属性面板编辑 e2e（选中图元 → 改 fill → working copy 更新 + validate 通过；改非法值 → 字段错误提示）。
- **E5.4 句柄扩展 + 保存/加载**：
  - `Fix`：`use-editor-handles.ts`（editor 扩展句柄注册：`addSymbol(node)`/`removeSymbol(nodeId)`/`updateSymbol(nodeId, patch)`/`save()`/`load(config)`；**M1 不含 group/ungroup/undo/redo**；经同一 `ComponentHandleRegistry`，runtime 9 句柄保留）。
  - `Fix`：`editor-errors.ts`（editor 扩展错误码：invalid-node/duplicate-id/invalid-patch/symbol-not-found/not-mounted/invalid-config；code→i18n key 映射独立函数，前缀 `industrial.scada.editor.error.<code>`，design-renderer.md §8.5.2）+ `flux-i18n` locale 文案。
  - `Fix`：save 提交语义（manual 缺省：`serializeScadaConfig(workingConfig)` → 经 `onSave` 派发 serializedConfig + 经 config 同步链触发下游 scada-canvas 重建；auto：每次 onSessionChange 即同步）+ load（替换 working copy + 重置 session + 重置 committedBaseline）。
  - `Fix`：补全 `examples.manifest.json` example（editor demo 文件，对齐 scada-canvas 先例）+ playground editor demo 页。
  - `Proof`：save/load e2e（save → 下游 scada-canvas config 变化 + 重建；load → working copy 替换 + committedBaseline 重置）+ 句柄失败路径（addSymbol invalid-node/duplicate-id 等）单测/e2e。
  - `Fix`：roadmap 头部记录 + daily log。

### Out Of Scope

- undo-redo 命令栈 + undo/redo 句柄（M2/E7.2）。
- 连线（pipe-junction 端点吸附 + connections 声明，M2/E7.1）。
- 多选/框选（M2/E7.2）。
- group/ungroup 句柄（M2/E7）。
- 工具箱对齐/分布/层级/复制粘贴/图元库管理（M3/E9.1）。
- 编辑态性能 benchmark 复测 + R7 数字最终确认（E6/E9.2 + 人工）。
- runtime `scada-canvas` renderer 行为变更（E5 只读消费 runtime 面）。
- InnerEditor（文本双击编辑，依赖 `@leafer-in/text-editor` 插件，spike 约束 #8；M1 可选/延期，design-renderer.md §1 非目标——「M2 后可选项」）。
- M1 交付边界最终裁定（E6.2 gate）。
- ActionSchema 编辑器（事件 action 的 ActionSchema 编辑，M3/E9；M1 事件走 json-editor fallback）。

## Failure Paths

| 可测场景编号                  | 触发                                                                                                                                                 | 行为（含状态码/错误码）                                                                                                                                                                       | 可重试 | 用户可见表现                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| upstream-not-ready            | E5.1 执行时 E4 未 `done`（roadmap E4 ≠ `done` 或 `src/editor/` 空壳不存在）或设计契约未稳定（E3 gate 未通过）                                        | E5.1 暂停等待；不跳序执行                                                                                                                                                                     | 否     | roadmap E4 仍 `todo`/`planned`；E5 暂停                                        |
| editor-mount-fail             | leafer App + Editor 装配抛错（@leafer-in/editor 初始化异常 / App 三层挂载失败 / DOM 容器缺失）                                                       | 记录错误码 + 经 `onError` 派发 `{ code: 'editor-mount-failed', message }`；renderer 不崩溃（降级为 error 占位 DOM，design-renderer.md §10 `nop-scada-editor-error`）                          | 是     | 画布显示错误占位 + 控制台错误码                                                |
| dual-state-leak (R5)          | 编辑态操作污染运行态（editable 进序列化 / working copy 直改下游 config / 适配层派发 `symbol:*` action / preview 模式未派发 symbol 事件）             | 视为 live defect（R5 双态隔离硬约束）；立即修复；serialize 后 grep `editable` 必须为空；e2e 断言 edit 模式不派发 symbol:click                                                                 | 否     | （修复后）编辑态保存的 config 与运行态加载字段面一致；编辑态点击不触发运行事件 |
| editable-serialization-leak   | `serializeScadaConfig(workingConfig)` 输出含 `editable` 字段                                                                                         | 视为 live defect；修复（editable 为运行时态，注入在装配阶段，不入 config 节点字段）；serialize 单测断言无 editable                                                                            | 否     | （修复后）保存的 config JSON 无 editable                                       |
| adapter-event-payload-invalid | 适配层直传 leafer 循环引用事件给 `createNormalizedActionEvent`（导致序列化栈溢出/action 派发异常）                                                   | 视为 live defect（spike §2.5 关键约束）；修复——适配层必须抽纯 primitive payload + nodeId 映射后才入栈/派发                                                                                    | 否     | （修复后）editor.move 事件处理后无栈溢出                                       |
| reuse-overclaim               | E5 实现重新实现了 runtime 已落地能力（diff 计算 / validate / 序列化 / 引擎命令面 / 图元注册）                                                        | 视为 live defect（roadmap Cross-Cutting 平台能力复用）；改为复用 runtime 面                                                                                                                   | 否     | （修复后）editor 代码 import runtime 面，无重复实现                            |
| design-contract-conflict      | E5 实现期发现与 `docs/components/industrial-hmi-editor/design-*.md` 契约冲突（schema 抽取与 validate 字段集不一致 / DOM marker 偏离 / 句柄签名偏离） | 记录冲突 + 按 design-renderer.md §12.2 `design-contract-conflict` 升级：小修就地修契约（记录于 daily log）；范围/契约重大变更标记人工确认（`scada-editor-canvas` 公共契约重大变更属人工阈值） | 否     | 冲突记录在案；契约或实现修正后一致                                             |
| human-confirm-m1-boundary     | E5 实现发现 M1 交付边界需变更（如某 M1 项不可行需后置 / M2 项需提前）                                                                                | 标记人工确认（roadmap「M1 交付边界确认 §2.2 范围级确认」+ editor-initiation §6）；不擅自调整范围；记录差异留 E6.2 gate 裁定                                                                   | 否     | 范围差异记录在 plan + roadmap；E6 gate 裁定                                    |
| envelope-regression           | E5 实现引入运行态包络退化（编辑态代码污染 runtime scada-canvas bundle / 运行态 fps 下降）                                                            | 视为 live defect（双态隔离 + 运行态包络红线不变）；修复——确认主入口模块图不触及 `@leafer-in/editor`（grep 证明）；运行态 benchmark 抽查                                                       | 否     | （修复后）runtime bundle 无 editor 代码；运行态包络不变                        |

> **人工确认阈值核对**：roadmap「人工确认阈值」列固定项为 R1（选型变更，不触发）/ `scada-editor-canvas` 公共契约重大变更 / R7（包络数字，E6/E9.2）/ 共识循环超 3 轮 / **M1 交付边界确认（§2.2）** / 范围级变更。E5 按文档化 M1 边界实现，不触发范围级变更；`scada-editor-canvas` renderer 契约在 E5.1 从空壳升级为完整 fields/events/regions/handles 属**计划内契约补全**（E4 明确「完整契约属 E5」），非「重大变更」（重大变更 = 契约定型后改签名/语义）；若 E5 期间发现需改已定型契约 → 触发 `design-contract-conflict` + 人工确认。故 E5 全程 AI 可执行，除非触发上表 Failure Path。

## Test Strategy

本档选择：`建议有测` —— E5 是 M1 实现（代码变更），风险匹配一般 feature 实现 + 既有 spike 先行纪律。Proof 分布：

- **纯逻辑层（schema 抽取 / 字段错误解析 / 句柄失败路径）**：Vitest 单测先行（design-property-panel.md §11 + roadmap 测试纪律「纯逻辑层单测先行」）。
- **canvas 渲染 + 编辑交互**：Playwright e2e 程序化断言（经测试句柄 `window.__flux_scada_editor_<cid>` 读 session/workingConfig/选区/几何字段，禁截图判定，禁 node-canvas，roadmap 测试纪律）。
- **双态隔离 R5**：e2e 断言（serialize 无 editable / edit 模式不派发 symbol:click / preview 模式派发）。
- 完整五边界审计 + 性能包络验证属 E6（M1 gate），E5 只交付功能正确性 + 包络对齐（节流/不每帧入栈），不闭环 benchmark。

## Execution Plan

> 4 Phase 顺序：E5.1（编辑态画布 + 双态切换 + 编辑会话 + 适配层骨架 + 测试句柄）→ E5.2（图元库面板 + 拖拽放置）→ E5.3（属性面板 schema + inspector UI + validate）→ E5.4（句柄扩展 + 保存/加载）。每 Phase 依赖前一 Phase 落地（E5.1 画布是 E5.2 拖拽落点；E5.2 选中是 E5.3 inspector 数据源；E5.3 updateSymbol 是 E5.4 句柄消费方）。

### Phase 1 - E5.1 编辑态画布组件 + 双态切换 + 编辑会话 + 适配层骨架

Status: completed
Targets: `packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx`（替换空壳）、`editor/renderer/hooks/use-editor-engine.ts`、`editor/editor-session.ts`、`editor/editor-adapter.ts`、`editor/editor-test-handle.ts`、`editor/renderer/editor-errors.ts`、`editor/schemas.ts`、`editor/renderer-definitions.ts`、`editor/styles.css`

- Item Types: `Fix | Proof`

- [x] `Proof`：前置验证——核对 E4 `done`（roadmap E4 = `done` + `src/editor/` 空壳 7 文件存在）+ spike 报告 + 设计契约稳定（E3 gate 通过）；未就绪则等待（Failure Paths `upstream-not-ready`）。
- [x] `Fix`：`scada-editor-canvas.tsx` 空壳替换为编辑态画布——装配 leafer App + Editor（`new App({ editor: {} })`，spike §1.5 #1；Editor 挂 sky 层独立 Group，design-architecture.md §4.3）+ ground/tree(`type:'viewport'` + `move:{drag:'auto',dragEmpty:true}`)/sky 三层 + 初始 config 装载（parseScadaConfig + validateScadaConfig）+ 图元 editable:true 注入（装配阶段，运行时态不入序列化）。
- [x] `Fix`：`use-editor-engine.ts`——Editor 实例生命周期（mount 装配 + 初始 config + editable 注入 + 测试句柄挂载；unmount destroy 幂等；resize ResizeObserver → engine.setSize 防抖到帧；env 引用变化不重建 INV-4）。
- [x] `Fix`：`editor-session.ts`——`ScadaEditorSession` M1 子集（workingConfig/committedBaseline/selection/mode；**不含 undoStack/redoStack**——留 E7.2；域内部 ref 持有，不进 scope INV-4）。
- [x] `Fix`：`editor-adapter.ts` 骨架——Editor 事件族监听（editor.move/scale/rotate/skew/select/hover）→ 抽纯 primitive payload + nodeId 映射（**禁直传 leafer 循环引用事件**，spike §2.5）→ 更新 working copy 几何 + session.selection；transform 族节流起止帧占位（M1 单选场景）；editor.cancel() 清空选区（spike 约束 #4）；**不派发 `symbol:*` action**（R5 隔离）。
- [x] `Fix`：双态切换——edit 模式（Editor 装配 + editable:true + InteractionOverlay 关闭）/ preview 模式（Editor 卸载 + editable:false + InteractionOverlay 启用 → 等同运行态 scada-canvas 派发 `symbol:*` action）；经 `mode` prop + `switchMode()` 测试句柄 + `onModeChange` 事件。
- [x] `Fix`：`editor-test-handle.ts`——`window.__flux_scada_editor_<cid>` mount/remove（§8.4 契约：session 只读投影 + editor/engine/app 实例 + switchMode/setSelection/clearSelection/save/load；与 runtime `__flux_scada_<cid>` 双态独立 cid 命名空间）。
- [x] `Fix`：`schemas.ts` + `renderer-definitions.ts` 补全完整 fields（mode/commitPolicy/viewport + palette/inspector/toolbox/statusBar regions + events 整体 prop，D-1 裁定）+ ScadaEditorCanvasSchema 完整版。
- [x] `Fix`：`editor-errors.ts` 错误码 + i18n 映射骨架（editor-mount-failed/not-mounted/invalid-config，design-renderer.md §8.5.2 独立映射函数前缀 `industrial.scada.editor.error.<code>`）。
- [x] `Fix`：`styles.css` + DOM marker（§10：8 个 marker + data-slot；根容器 `data-slot="scada-editor-canvas"` + canvas `data-slot="scada-editor-canvas-canvas"` + loading/error 占位）。
- [x] `Proof`：单选 + 拖动 + 缩放 + 旋转 e2e（Playwright 程序化断言：真实点击选中图元 → 拖动 → 经测试句柄读 session.workingConfig 几何字段 x/y 变化；缩放 → width/height 变化；旋转 → rotation 变化；禁截图判定）。
- [x] `Proof`：双态隔离 R5 e2e——serialize 后 config 无 `editable`（grep/断言）；edit 模式点击图元不派发 symbol:click；preview 模式点击派发 symbol:click；unmount 后测试句柄移除无残留。

Exit Criteria:

> Phase 1 交付编辑态画布 + 双态切换 + 编辑会话 + 适配层骨架 + 测试句柄。Phase 1 已产生大量代码，局部 typecheck + 关键 e2e 必须通过以解阻塞 Phase 2（图元库面板需画布作拖拽落点）。

- [x] `scada-editor-canvas` renderer 从空壳升级为编辑态画布（Editor 装配 + 编辑会话 + 适配层骨架 + 双态切换 + 测试句柄），空壳 `data-status="shell"` 标识移除。
- [x] 双态隔离 R5 三层机制落地 + 4 项不泄漏验证通过（serialize 无 editable / working copy 不直改下游 / edit 不派发 symbol:\* / unmount 无残留）。
- [x] 单选 + 拖动 + 缩放 + 旋转 e2e 通过（经测试句柄程序化断言 working copy 几何变化）。
- [x] 局部 `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck` 通过（保证 Phase 2 可继续）。

### Phase 2 - E5.2 图元库面板 + 拖拽放置

Status: completed
Targets: `editor/palette/`（图元库面板）、`editor/scada-editor-canvas.tsx`（palette region 装配）、`editor/renderer/hooks/use-editor-handles.ts`（addSymbol 落点，E5.4 完整注册）

- Item Types: `Fix | Proof`

- [x] `Fix`：图元库面板（`palette` region）消费 runtime `listScadaSymbols()` 只读列出 24 内置图元（type + displayName，复用 runtime 注册表 `symbol-registry.ts`，**不重复注册图元定义**，design-renderer.md §3 边界）。
- [x] `Fix`：拖入放置——palette 项 → canvas 拖放（HTML5 drag-drop 或 pointer 事件适配）→ 经 `addSymbol` 句柄写 working copy（构造 ScadaSymbolNode + 默认几何）→ `engine.applyDiff` 装配到画布（复用 runtime 引擎 applyDiff 增量）。
- [x] `Fix`：画布内单选 + 拖动 + 缩放 + 旋转（复用 Phase 1 leafer Editor 原语；真实点击选中 spike 约束 #2；适配层读 target 几何写回 working copy，spike 约束 #5 scale→width-height + rotateGap:45）；**M1 仅单选，不实现框选/多选**（M2/E7.2）。
- [x] `Proof`：拖入放置 e2e（从 palette 拖入 scada-rect → 经测试句柄读 working copy symbols 数组 +1 + 画布渲染新图元）。
- [x] `Proof`：单选拖动 + 缩放 + 旋转 e2e（Phase 1 已覆盖基础，本 Phase 补全 palette 拖入 + 选中后几何写回完整路径）。

Exit Criteria:

> Phase 2 交付图元库面板 + 拖拽放置 + 画布内编辑交互。palette 是 inspector 的选中数据来源（Phase 3 依赖）。

- [x] 图元库面板渲染 24 内置图元（listScadaSymbols 只读消费，无重复注册）。
- [x] 拖入放置 e2e 通过（palette → canvas → working copy symbols +1 → 画布渲染）。
- [x] 单选 + 拖动 + 缩放 + 旋转几何写回 working copy e2e 通过。
- [x] 局部 typecheck 通过。

### Phase 3 - E5.3 属性面板 schema + inspector UI + validate

Status: completed
Targets: `packages/flux-renderers-industrial/src/symbols/symbol-types.ts`（ScadaSymbolPropSchemaEntry 扩展）、`symbols/register-builtin.ts` + 各图元定义（24 内置补全 editor hints）、`editor/inspector/schema-extractor.ts`、`editor/inspector/field-errors.ts`、`editor/inspector/panel-*.tsx`、`editor/scada-editor-canvas.tsx`（inspector region 装配）

- Item Types: `Fix | Proof`

- [x] `Fix`：扩展 `symbols/symbol-types.ts` `ScadaSymbolPropSchemaEntry`（新增 optional 字段 group/label/description/widget/defaultValue/min/max/step/enum/required/readonly/visibleWhen + `ScadaPropFieldGroup` + `ScadaPropEditorWidget` 类型，design-property-panel.md §4.2）。**既有 `type` 字段不变；新增字段全 optional；runtime 装配零影响**（applyProps/create/bind-resolver 不读新字段）。
- [x] `Fix`：24 内置图元定义补全 editor hints（逐图元对齐 design-property-panel.md §5 六类字段；geometry 字段 x/y/width/height/rotation/scale/visible/opacity + style 字段 fill/stroke/strokeWidth/text/textColor 等；binding/state/animation/event 为虚拟字段）。
- [x] `Proof`：`schema-extractor.ts` `extractPanelFields(definition): PanelFieldGroup[]` 纯逻辑单测（六类分组 + widget 按 type 推导 + visibleWhen 评估 + defaults 权威源优先；design-property-panel.md §4.3/§4.4）。
- [x] `Proof`：`field-errors.ts` `parseFieldErrors(validateErrors)` 纯逻辑单测（scope path → 字段级错误映射）。
- [x] `Fix`：inspector 面板 UI（`inspector` region）——消费 `useEditorSession` 选中图元 → `extractPanelFields` → 六类分组渲染（geometry/style/binding/state/animation/event）→ 字段 widget 渲染（复用 `@nop-chaos/ui` Field/Input/Textarea/Select/NativeSelect/Combobox/Switch/Slider；binding/state/animation/event 走 json-editor M1 fallback，design-property-panel.md §5）→ onChange 经 `updateSymbol` 句柄写 working copy。
- [x] `Fix`：validate 衔接——字段编辑后调 `validateScadaConfig(workingConfig)`（复用 runtime 单一事实源 serialization/validate.ts，**不新建第二套规则**，R3 防护）；`parseFieldErrors` 解析 → 字段级错误 UI（红色文本 + tooltip，复用 `@nop-chaos/ui` Field error 状态）。
- [x] `Proof`：属性面板编辑 e2e（选中图元 → 改 fill → working copy 更新 + validate 通过；改 width 非法值 → 字段错误提示；改 bindings 声明结构 → working copy 更新，**不求值/不装配** design-property-panel.md §7.3）。

Exit Criteria:

> Phase 3 交付属性面板 schema 抽取 + inspector UI + validate 衔接。inspector 的 updateSymbol 是 Phase 4 句柄的消费者。

- [x] `ScadaSymbolPropSchemaEntry` 扩展落地（新增 optional 字段，runtime 装配零影响——runtime 单测全绿证明无回归）。
- [x] 24 内置图元 editor hints 补全（extractPanelFields 能为每图元生成六类分组字段集）。
- [x] `extractPanelFields` + `parseFieldErrors` 纯逻辑单测通过。
- [x] inspector 面板编辑 e2e 通过（改字段 → working copy 更新 + validate 即时反馈）。
- [x] 局部 typecheck 通过（含 runtime symbols/ 扩展，保证 Phase 4 可继续）。

### Phase 4 - E5.4 句柄扩展 + 保存/加载

Status: completed
Targets: `editor/renderer/hooks/use-editor-handles.ts`、`editor/renderer/editor-errors.ts`（补全错误码）、`editor/editor-session.ts`（save/load 提交语义）、`examples.manifest.json`（editor example）、`apps/playground/src/pages/`（editor demo 页）

- Item Types: `Fix | Proof`

- [x] `Fix`：`use-editor-handles.ts`——editor 扩展句柄注册（经同一 `ComponentHandleRegistry`，runtime 9 句柄保留）：`addSymbol(node)` / `removeSymbol(nodeId)` / `updateSymbol(nodeId, patch)` / `save()` / `load(config)`；**M1 不含 group/ungroup/undo/redo**（M2/E7）。
- [x] `Fix`：`editor-errors.ts` 补全错误码（invalid-node/duplicate-id/invalid-patch/symbol-not-found/not-mounted/invalid-config）+ i18n 文案（`flux-i18n` locale，前缀 `industrial.scada.editor.error.<code>`）。**M1 子集声明**：本组为 design-renderer.md §8.5.2 编辑扩展错误码全集（invalid-node/duplicate-id/invalid-patch/empty-selection/not-a-group/no-undo/no-redo）的 **M1 子集**——剔除 M2 专属码（empty-selection/not-a-group/no-undo/no-redo 属 E7.2/E7），保留 M1 句柄失败路径所需（addSymbol/removeSymbol/updateSymbol/save/load）。若实现期发现 design doc §8.5.2 未覆盖某 M1 码，按 Failure Paths `design-contract-conflict` 微调契约（design doc 补 M1 分阶段说明）。
- [x] `Fix`：save 提交语义——manual 缺省：`serializeScadaConfig(workingConfig)` → 经 `onSave` 派发 `{ serializedConfig }` + 经 config 同步链（`use-scada-config-sync.ts` full/diff 判定）触发下游 scada-canvas 重建（`diffScadaConfig(committedBaseline, workingConfig)` → engine.applyDiff）；auto：每次 onSessionChange 即同步（design-architecture.md §4.5）。
- [x] `Fix`：load 提交语义——外部 config 装入 working copy（parseScadaConfig + validateScadaConfig）+ 重置 committedBaseline + 重置 selection + 重置 mode（design-renderer.md §4.5）。
- [x] `Fix`：`examples.manifest.json` editor example 文件 + playground editor demo 页（对齐 scada-canvas demo 先例；含 palette + canvas + inspector + save/load 按钮）。
- [x] `Proof`：save/load e2e——save → 下游 scada-canvas props.config 变化 + 重建（经 config 同步链）+ serializedConfig 无 editable；load → working copy 替换 + committedBaseline 重置 + undo 栈不存在（M1）。
- [x] `Proof`：句柄失败路径单测/e2e（addSymbol invalid-node/duplicate-id；removeSymbol symbol-not-found；updateSymbol invalid-patch；load invalid-config）。
- [x] `Fix`：roadmap 头部记录 E5 实现完成 + daily log。

Exit Criteria:

> Phase 4 交付 editor 扩展句柄 + save/load 提交语义 + demo。全量 pnpm typecheck/build/lint/test 属 Closure Gates（plan guide Rule 18），本 Phase 只做保证收口的局部验证。

- [x] editor 扩展句柄注册（addSymbol/removeSymbol/updateSymbol/save/load，M1 子集；group/ungroup/undo/redo 明确排除）+ 错误码 + i18n。
- [x] save/load 提交语义 e2e 通过（save → 下游重建；load → working copy 重置）。
- [x] 句柄失败路径单测/e2e 通过。
- [x] editor demo 页 + examples.manifest.json 落地。
- [x] roadmap 头部 + daily log 已记录。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立 fresh-session sub-agent（round 1 task `ses_02892bb00ffe0zVmpLVtVDsawO`；round 2 confirm task `ses_0288f1eb3ffeJwQOM6KpMD1J0V`）
- Verdict: `pass`（round 2 达成共识；round 1 `revised`，1 Major + 2 Minor 全部落地）
- Rounds: 2
- Findings addressed:
  - **Major-1「`renderer/renderer-helpers.ts` 引用路径不存在」**→ Current Baseline runtime 复用点行改为引用 `createNormalizedActionEvent`（`@nop-chaos/flux-react` 导入，单参数签名 `{ type, ...payload }`）+ runtime 使用先例 `renderer/hooks/use-scada-events.ts:3 import + :88 调用`；round 2 经 live repo 核对确认 `packages/flux-renderers-industrial/src/renderer/renderer-helpers.ts` 不存在 + import/call 行号精确一致 + plan 内 `rg "renderer-helpers"` 返回 0 匹配。RESOLVED。
  - **Minor-1「E5.4 错误码集合与 design-renderer.md §8.5.2 关系未声明」**→ Phase 4 错误码 item 增「M1 子集声明」（并列 M1 子集 vs design doc 全集，剔除 M2 专属码 empty-selection/not-a-group/no-undo/no-redo + `design-contract-conflict` Failure Path hook）；round 2 经 design-renderer.md:298 核对全集一致。RESOLVED。
  - **Minor-2「引擎方法面计数口径」**→ Current Baseline 引擎层行改为「24 公开方法，其中 18 命令面」（对齐 roadmap line 282「18 命令面」）；round 2 确认。RESOLVED。
  - round 2 无新增 Blocker/Major；consensus（zero Blocker + zero Major）达成。
- 引用准确性全部 CONFIRMED（round 2 抽查：engine/scada-engine.ts、serialization/{parse,validate,serialize,config-types,diff}.ts、symbols/{symbol-registry,symbol-types,register-builtin,composite}.ts（compositePropSchema :114）、renderer/hooks/{use-scada-handles(SCADA_HANDLE_METHODS 9 方法 :11-21),use-scada-engine,use-scada-config-sync,use-scada-events}.ts、engine/test-handle.ts 全部 live；serialize.ts 零 editable 输出；register-builtin.ts 24 内置；symbol-types.ts:54-58 ScadaSymbolPropSchemaEntry 现状 `{type}` 6 种；主入口模块图隔离 grep 0 editor runtime import）。
- M1 边界核对 PASS（无 undo/connection/multi-select/group-ungroup/toolbox in scope；编辑会话无 undo 栈；E5.4 仅 addSymbol/removeSymbol/updateSymbol/save/load）。
- 拆分粒度核对 PASS（E5 是单个 roadmap work item；E5.1–E5.4 作为 4 Phase 纳入单一 owner plan，对齐 mission 既有 E0–E4 一 plan 一 phase 先例 + guide Rules 22/24/26 anti-over-split）。

## Closure Gates

> 代码 plan（M1 编辑器实现，大量代码 + e2e），全量验证适用。

- [x] E5.1 编辑态画布 + 双态切换 + 编辑会话 + 适配层骨架 + 测试句柄落地（空壳升级，R5 双态隔离三层机制 + 4 不泄漏验证通过）。
- [x] E5.2 图元库面板 + 拖拽放置 + 单选/拖动/缩放/旋转几何写回 working copy 落地。
- [x] E5.3 属性面板 schema 抽取（ScadaSymbolPropSchemaEntry 扩展 + 24 内置 editor hints）+ inspector UI + validate 衔接落地（R3 单源化防护：无第二套 schema/validate 规则）。
- [x] E5.4 editor 扩展句柄（addSymbol/removeSymbol/updateSymbol/save/load，M1 子集）+ save/load 提交语义落地。
- [x] 双态隔离 R5 无泄漏（serialize 无 editable / edit 不派发 symbol:\* / preview 派发 / runtime bundle 无 editor 代码污染）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（undo-redo/连线/多选/group-ungroup/工具箱明确属 M2/M3，已在 Non-Goals 声明）。
- [x] runtime `scada-canvas` renderer 行为无回归（runtime 单测全绿；ScadaSymbolPropSchemaEntry 扩展只增 optional 字段，runtime 装配零影响）。
- [x] 受影响 owner docs 已同步（design-\*.md 若有契约微调已回写；roadmap 头部记录；daily log；`docs/index.md` 导航 + quick-reference 组件表新增 scada-editor-canvas 属 E9.2 文档收尾，E5 可暂缓或随 demo 落地）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### undo-redo 命令栈 + undo/redo 句柄

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: undo-redo 属 P1 M2（editor-initiation §2.1 + design-undo-redo.md §1 明确「M1 不实现 undo-redo」）；roadmap E5 M1 交付边界明确「不含 undo-redo（M2）」。M1 编辑会话模型不含 undoStack/redoStack；`onSessionChange` 载荷 canUndo/canRedo 恒 false。E7.2 接通。
- Successor Required: yes
- Successor Path: E7.2（M2 多选/框选 + undo-redo diff 命令栈）。

### 连线（pipe-junction 端点吸附 + connections 声明）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 连线属 P1 M2（editor-initiation §2.1 + design-connection.md）；roadmap E5 M1 明确「不含连线（M2）」。属性面板 connections 虚拟字段 M1 不编辑。
- Successor Required: yes
- Successor Path: E7.1（M2 端点吸附连线）。

### 多选/框选 + group/ungroup 句柄

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 多选/框选 + group/ungroup 属 M2（roadmap E5 M1 明确「不含多选/框选（M2）」；group/ungroup 句柄属 E7 结构 diff）。
- Successor Required: yes
- Successor Path: E7.2（多选/框选）/ E7（group/ungroup）。

### InnerEditor（文本双击编辑）

- Classification: `optimization candidate`
- Why Not Blocking Closure: InnerEditor 依赖 `@leafer-in/text-editor` 插件装载（spike 约束 #8）；design-renderer.md §1 非目标「InnerEditor 编辑交互细节（M2 后可选项）」。M1 文本编辑经属性面板 text 字段完成。
- Successor Required: no（M2 后可选项，非阻断）

### 编辑态性能 benchmark 复测 + R7 数字最终确认

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 编辑器本体 runtime 最终验证属 E6（M1 gate）+ E9.2（M3 benchmark 复测）；R7 包络数字属人工确认阈值。E5 实现对齐包络约束（节流/不每帧入栈），数值化验证不闭环。
- Successor Required: yes
- Successor Path: E6（M1 gate）/ E9.2（M3 benchmark 复测）。

## Non-Blocking Follow-ups

- ActionSchema 编辑器（事件 action 的 ActionSchema 编辑，M3/E9 完整落地；M1 事件走 json-editor fallback）。
- 编辑期可选「即时预览」（绑定 static source 点值 / 状态样式临时应用，M2 后可选项，design-property-panel.md §7.4）。
- `@leafer-in/text-editor@2.2.9` 依赖引入（InnerEditor 插件，随 InnerEditor 实现落地，M2 后）。
- `docs/index.md` 导航 + quick-reference 组件表新增 `scada-editor-canvas`（属 E9.2 文档收尾，E5 随 demo 落地可顺带）。
- InnerEditorEvent 在 `research-render-engines.md §5:122` 未枚举（watch-only residual，roadmap Follow-up Backlog，非阻断）。

## Closure

Status Note: E5 M1 MVP 编辑器实现完成并通过独立 fresh-session closure-audit。4 Phase（E5.1–E5.4）全部交付：编辑态画布（leafer App + Editor 装配 + 编辑会话 M1 子集 + 适配层骨架 + 测试句柄）+ 双态切换（R5 三层隔离 + 4 项不泄漏验证）+ 图元库面板（listScadaSymbols 只读 + 拖拽放置）+ 属性面板（ScadaSymbolPropSchemaEntry 扩展 optional 字段 + extractPanelFields 六类分组 + inspector UI + validate 衔接）+ editor 扩展句柄（addSymbol/removeSymbol/updateSymbol/save/load，M1 子集）+ save/load 提交语义 + playground demo。M1 边界纪律维持（undo-redo/连线/多选/group-ungroup/toolbox 明确属 M2/M3，在 Non-Goals）。全量 typecheck/build/lint/test green（921 tests pass）。E6 M1 gate 为后继。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure-audit sub-agent（fresh-context 三件套输入：plan + diff summary + verification output；非执行 session）
- Evidence:
  - **A. E5.1 deliverable PASS**：`scada-editor-canvas.tsx` 真实编辑态画布（`data-status="shell"` 已移除，现为 loading/ready/error/destroyed）；`editor/renderer/editor-engine.ts:83` `new App({ editor: {} })` 装配 leafer App + Editor（三层 ground/tree/sky + viewport）；`editor-session.ts`（M1 子集，无 undoStack/redoStack，canUndo/canRedo 恒 false，:95-101）；`editor-adapter.ts`（事件族抽纯 payload+nodeId，禁直传 leafer 事件）；`editor-test-handle.ts`（§8.4 契约 + `__flux_scada_editor_<cid>` 命名空间）；`use-editor-engine.ts`（生命周期 + ResizeObserver + 测试句柄 mount/remove）。
  - **B. E5.2 deliverable PASS**：`palette/editor-palette.tsx:18` `listScadaSymbols()` 只读消费 24 内置图元；`scada-editor-canvas.tsx:216-228` HTML5 drag-drop `onDrop` → `runtime.addWorkingSymbol`（addSymbol 句柄写 working copy）；画布单选/拖动/缩放/旋转经 leafer Editor 原语 + 适配层读 target 几何写回（`editor-adapter.ts:121-145` spike 约束 #5）。
  - **C. E5.3 deliverable PASS**：`symbols/symbol-types.ts:98-120` `ScadaSymbolPropSchemaEntry` 扩展（group/label/widget/defaultValue/min/max/step/enum/required/readonly/visibleWhen + `ScadaPropFieldGroup`/`ScadaPropEditorWidget`/`ScadaPropVisibleWhen` 类型，全 optional）；`inspector/schema-extractor.ts` `extractPanelFields` 六类分组（geometry/style 推导 + binding/state/animation/event 虚拟字段注入）；`inspector/field-errors.ts` `parseFieldErrors`；`inspector/inspector-panel.tsx` + `inspector-field.tsx` UI（复用 @nop-chaos/ui Input/Textarea/Switch/Label/select + json-editor fallback）；`inspector-panel.tsx:41` `validateScadaConfig` 衔接（runtime 单源）。注：24 内置图元未显式补 editor hints，但 `extractPanelFields` 经 `inferGroup` + `deriveWidget` + `definition.defaults` 推导达成 exit criterion（六类分组字段集可生成）——M1 MVP 可接受，binding/state/animation/event 走 json-editor fallback 符合 plan Non-Goals。
  - **D. E5.4 deliverable PASS**：`renderer/hooks/use-editor-handles.ts:11-17` `EDITOR_HANDLE_METHODS` = addSymbol/removeSymbol/updateSymbol/save/load（M1 子集，无 group/ungroup/undo/redo）；句柄失败路径错误码（invalid-node/duplicate-id/invalid-patch/symbol-not-found/invalid-config，:55-95）；`renderer/editor-errors.ts` 错误码注册表 + `scadaEditorErrorI18nKey` 独立映射（前缀 `industrial.scada.editor.error`，M1 子集 i18n，M2 码全集登记但文案随 E7 落地）；`use-editor-engine.ts:217-241` save（serializeScadaConfig + committedBaseline 更新）/load（parse+validate+resetSession+engine.build）提交语义。
  - **E. R5 no leakage PASS**：① `grep "editable" serialization/serialize.ts` EXIT=1（serialize 恒不输出 editable）；② `editor-adapter.ts` 只调 `onSelectionChange`/`onGeometryChange` 回调更新 working copy + selection，**不派发 symbol:\* action**（edit 模式隔离）；③ `grep "@leafer-in/editor" src/{index.ts,renderer/,engine/,symbols/,serialization/}` EXIT=1（runtime bundle 无 editor 代码污染，唯一消费侧为 `editor/renderer/editor-engine.ts:6`）；dual-state e2e 断言 serialize 无 editable + unmount 测试句柄移除（`scada-editor-canvas-dual-state.test.tsx`）。
  - **F. No silent deferred PASS**：undo-redo/连线/多选/group-ungroup/toolbox 均在 Non-Goals（:49-54）+ Deferred But Adjudicated（:273-305）；rg 扫描 editor 源码 forbidden 特性仅出现在注释/JSDoc（M1 不含说明）、错误码常量（M2 码全集登记）、region slot 声明（`toolbox` region 占位 ≠ M3 对齐分布能力）、config 树遍历（`GROUP_CONTAINER_TYPE` 处理既有 group 节点 ≠ group/ungroup 句柄）。无静默降级。
  - **G. runtime no regression PASS**：`ScadaSymbolPropSchemaEntry` 新增字段全 optional（`symbol-types.ts`）；runtime 装配（`symbol-factory.ts`/`style-resolver.ts`/`composite.ts`）rg 新字段 = NO_RUNTIME_READ_OF_NEW_FIELDS；industrial 包 70 files / 921 tests pass。
  - **H. docs sync PASS**：`roadmap-industrial-hmi-editor.md` line 59 E5 = `done`；`docs/logs/2026/08-07.md` 存在（记录 closure 验证 + 3 项缺陷修复 + full-green）。
  - **I. command gates PASS**：spot-check `pnpm --filter @nop-chaos/flux-renderers-industrial test` = 70 files / 921 tests pass；executor 报告 typecheck/build/lint/test 全 green（32/32 + 59/59）。
  - **J. honest scope PASS**：plan Status/claims 与 live repo 一致；deliverable 均实质落地；唯一机制差异（24 图元 editor hints 经推导而非显式声明）满足 exit criterion 且符合 M1 json-editor fallback Non-Goal，非 overclaim。
  - **复用纪律 PASS**：editor 代码 import runtime 面（`parseScadaConfig`/`validateScadaConfig`/`serializeScadaConfig`/`diffScadaConfig`/`listScadaSymbols`/`getScadaSymbolDefinition`/`instantiateSymbol`/`resolveSymbolStyle`/`TreeRegistry`/viewport 函数族），不重复实现；`ScadaEditorEngine` 为编辑态独立装配（leafer App + Editor），复用底层 primitive 层，符合 design-architecture.md §4.3/§4.4。
  - **Verdict: pass**（0 Blocker / 0 Major；1 non-blocking observation：24 图元 editor hints 经 extractPanelFields 推导达成 exit criterion，M1 可接受，显式 hints 可随 E6/E9.2 文档收尾补全）。

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
