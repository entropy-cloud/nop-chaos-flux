# 维度09 渲染器契约合规性

- 初审发现数: 4
- 复核结果: 保留 4 / 降级 0 / 驳回 0

### [维度09] 多个已注册 renderer 绕过 `RenderRegionHandle.render(...)`

- **文件**: `packages/flow-designer-renderers/src/designer-page.tsx:273-289`, `packages/report-designer-renderers/src/page-renderer.tsx:181-216`, `packages/word-editor-renderers/src/word-editor-page.tsx:389-395,458-472`, `packages/spreadsheet-renderers/src/page-renderer.tsx:138-155`, `packages/flux-renderers-basic/src/fragment.tsx:9-15`
- **证据片段**:

```ts
props.helpers.render(props.regions.toolbar.templateNode, { scope, actionScope });
```

- **严重程度**: P2
- **契约条款**: region 已编译成 handle 时，应优先走 `regions.*.render(options)`。
- **现状**: 多个 renderer 在已有 handle 的情况下直接取 `templateNode` 再走 `helpers.render(...)`。
- **风险**: 削弱 region handle 的封装与未来演进空间，形成系统性 contract usage 偏离。
- **建议**: 统一改为 `props.regions.slot?.render({ scope, actionScope })`。
- **为什么值得现在做**: 这是 workbench shell 家族与基础 `fragment` 的共同偏差。
- **误报排除**: 不是 ad-hoc schema 渲染；这里都已经拿到了正式 region handle。
- **历史模式对应**: bypassing compiled render handle.
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: `子项复核通过`

### [维度09] `word-editor-page` 的 DOM click 未透传原始 event

- **文件**: `packages/word-editor-renderers/src/word-editor-page.tsx:240-242,354-359`
- **证据片段**:

```ts
const handleBack = useCallback(() => {
  void props.events.onBack?.();
}, [props.events]);
```

- **严重程度**: P2
- **契约条款**: Event Passthrough Contract
- **现状**: `onClick` 最终丢掉了原始 click event。
- **风险**: 上层 action/event 处理无法稳定依赖 `ActionContext.event` 的统一形态。
- **建议**: 改为 `onClick={(event) => void props.events.onBack?.(event)}`。
- **为什么值得现在做**: 修复面极小，可直接消除契约偏离。
- **误报排除**: 只针对明确 DOM click 入口，不针对普通语义动作。
- **历史模式对应**: dropped native event payload。
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: `维度复核通过`

### [维度09] `report-designer-toolbar` 根节点忽略 `meta.className/testid/cid`

- **文件**: `packages/report-designer-renderers/src/report-designer-toolbar.tsx:36-41`
- **证据片段**:

```tsx
<div className={cn('nop-report-toolbar ...')} data-testid="report-toolbar">
```

- **严重程度**: P2
- **契约条款**: RendererComponentProps meta 透传
- **现状**: 根节点写死 `data-testid`，未合并 `props.meta.className/testid/cid`。
- **风险**: schema/meta 对 renderer 根节点的控制失效。
- **建议**: 合并 `props.meta.className`，透传 `data-testid={props.meta.testid}` 和 `data-cid={props.meta.cid}`。
- **为什么值得现在做**: 属于 renderer contract 的基础动作，改动小、收益稳定。
- **误报排除**: 没有否定其内部 widget 样式，只针对 meta contract。
- **历史模式对应**: hardcoded root test id over meta contract。
- **参考文档**: `AGENTS.md`, `docs/architecture/renderer-runtime.md`
- **复核状态**: `维度复核通过`

### [维度09] `designer-field` 忽略 `meta.disabled/className/testid/cid`

- **文件**: `packages/flow-designer-renderers/src/designer-field.tsx:39-72`
- **证据片段**:

```tsx
return <div className="grid gap-1.5"> ...
<Textarea className="min-h-[110px] resize-y" ... />
```

- **严重程度**: P3
- **契约条款**: RendererComponentProps meta 透传
- **现状**: 根节点和内部输入控件都未接入 `meta` 基础状态。
- **风险**: disabled/className/testid/cid 的 schema/meta 控制无效。
- **建议**: 根节点合并 `props.meta.className`，控件透传 `disabled={props.meta.disabled}`，并输出测试/调试属性。
- **为什么值得现在做**: 属于低成本修复的基础合同缺口。
- **误报排除**: 不是否定 domain context 用法；问题只在 Flux renderer contract 未接齐。
- **历史模式对应**: meta contract omission.
- **参考文档**: `AGENTS.md`, `docs/architecture/renderer-runtime.md`
- **复核状态**: `维度复核通过`
