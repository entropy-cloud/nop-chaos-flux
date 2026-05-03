# 维度02 模块职责与文件边界

- 初审发现数: 6
- 复核结果: 保留 4 / 降级 2 / 驳回 0

### [维度02] `flux-react` 根入口继续漂移为 runtime facade

- **文件**: `packages/flux-react/src/index.tsx:91-95`
- **证据片段**:

```ts
export { publishOwnerStatus } from '@nop-chaos/flux-runtime';
export { createFormComponentHandle } from '@nop-chaos/flux-runtime';
export { executeApiObject } from '@nop-chaos/flux-runtime';
```

- **严重程度**: P2
- **现状**: React 入口继续承担 runtime-owned API 的再导出。
- **风险**: 模块 owner 边界变得模糊，后续 runtime/react 收口会受根入口兼容性拖累。
- **建议**: 明确为受支持 facade，或逐步移除这些 re-export。
- **为什么值得现在做**: 当前再导出项很少，仍处于低成本收敛窗口。
- **误报排除**: 不是在否定正常 hooks/context 导出；只针对 runtime-owned helper。
- **历史模式对应**: convenience re-export 导致 owner 漂移。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: `维度复核通过`

### [维度02] `flow-designer-renderers` 根入口暴露过宽

- **文件**: `packages/flow-designer-renderers/src/index.tsx:23-42,50-136`
- **证据片段**:

```ts
export { DesignerPaletteContent, DesignerCanvasContent, DefaultInspector } ...
export const flowDesignerRendererDefinitions = [
```

- **严重程度**: P2
- **现状**: 根入口同时承担公共 barrel、renderer definitions、xyflow 叶子实现暴露。
- **风险**: 内部实现被提前冻结成公共 API，限制后续重构。
- **建议**: 让根入口只保留稳定 surface；把 definitions 和内部 UI 迁到子路径或 internal 模块。
- **为什么值得现在做**: 该包仍在快速演进，过宽公共面越晚越难收。
- **误报排除**: 不是否定 `register*Renderers` 模式；问题是“入口内联定义 + 叶子实现大面积暴露”。
- **历史模式对应**: entry surface creep。
- **参考文档**: `AGENTS.md`, `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: `维度复核通过`

### [维度02] `word-editor-renderers` 根入口暴露大量叶子 UI

- **文件**: `packages/word-editor-renderers/src/index.ts:15-31`
- **证据片段**:

```ts
export { RibbonToolbar, FontControls, ParagraphControls, InsertControls } ...
export { OutlinePanel, DatasetPanel, TemplateSnippets } ...
```

- **严重程度**: P2
- **现状**: 根入口导出工具栏、面板、对话框等大量实现级组件。
- **风险**: 包内部结构会被外部依赖锁定，降低演进自由度。
- **建议**: 根入口仅保留 `WordEditorPage`、renderer registration、必要 manifest/provider；其余移到子路径。
- **为什么值得现在做**: 当前真实外部使用面仍集中在 registration 层，收口成本低。
- **误报排除**: 不是反对 barrel；是反对把叶子实现当稳定 surface。
- **历史模式对应**: leaf implementation leakage。
- **参考文档**: `AGENTS.md`
- **复核状态**: `维度复核通过`

### [维度02] `word-editor-page.tsx` 职责混合过多

- **文件**: `packages/word-editor-renderers/src/word-editor-page.tsx:48-89,183-199,350-527`
- **证据片段**:

```ts
const bridge = useMemo(...)
const actionProvider = useMemo(...)
return <WorkbenchShell ...>
```

- **严重程度**: P2
- **现状**: 单文件同时承担 host wiring、action/provider、dataset/dialog 状态、shell 布局。
- **风险**: UI 改动会牵连 host/runtime 逻辑，回归只能依赖大集成测试。
- **建议**: 拆成 page controller、dialogs、header/panels 等子模块。
- **为什么值得现在做**: 文件已超过 500 行且已形成明显的正交职责边界。
- **误报排除**: 不是因为 JSX 多；是真正的 owner 混装。
- **历史模式对应**: host-shell accretion。
- **参考文档**: `AGENTS.md`
- **复核状态**: `维度复核通过`

## 已降级

- `packages/flow-designer-renderers/src/designer-page.tsx`: 仍偏厚，但作为 host shell 的边界基本自洽，降为 P3。
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-canvas.tsx`: 适配器层较长但职责仍集中，降为 P3。
