# 维度 09：渲染器契约合规性

## 初审

- 初审发现 6 条，维度复核后按组件重新分组。

## 维度复核

- 保留：`designer-canvas`、`designer-palette`、`designer-field`、report root renderer 系列、`word-editor-page` 的 `onBack` 事件透传。
- 降级：`joinClassNames` 作为次级实现偏差，不单独升级。

## 最终结论

### [维度09] `designer-canvas` live renderer 不接收 `RendererComponentProps`

- **文件**: `packages/flow-designer-renderers/src/designer-page.tsx:515-521`, `packages/flow-designer-renderers/src/index.tsx:95-100`
- **证据片段**:
  ```ts
  export function DesignerCanvasRenderer() {
    return <DesignerCanvasContent />;
  }
  ```
- **严重程度**: P1
- **现状**: 已注册为 live renderer，但组件签名绕开了 renderer root 契约。
- **风险**: `meta.className/testid/cid` 无法透传，live renderer 根 marker 不稳定。
- **建议**: 改为显式接收 `RendererComponentProps` 并转发 root meta。
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: `维度复核通过`

### [维度09] `designer-palette` live renderer 不接收 `RendererComponentProps`

- **文件**: `packages/flow-designer-renderers/src/designer-page.tsx:519-520`, `packages/flow-designer-renderers/src/index.tsx:99-100`
- **证据片段**:
  ```ts
  export function DesignerPaletteRenderer() {
    return <DesignerPaletteContent />;
  }
  ```
- **严重程度**: P1
- **现状**: 与 `designer-canvas` 相同，live renderer 根契约缺失。
- **风险**: 根节点 marker / testid / cid / className 不可控。
- **建议**: 改为 `RendererComponentProps` 模式。
- **参考文档**: `docs/components/designer-palette/design.md`
- **复核状态**: `维度复核通过`

### [维度09] `designer-field` 根节点未透传 `meta` 契约

- **文件**: `packages/flow-designer-renderers/src/designer-field.tsx:16-40`
- **证据片段**:
  ```tsx
  export function DesignerFieldRenderer(props: RendererComponentProps<DesignerFieldSchema>) {
    return <div className="grid gap-1.5">...
  }
  ```
- **严重程度**: P2
- **现状**: 虽然签名正确，但根节点没有消费 `props.meta.className/testid/cid`。
- **风险**: authored root customization 与调试定位失效。
- **建议**: 根节点补齐 `cn(..., props.meta.className)` 和 `data-testid` / `data-cid`。
- **参考文档**: `docs/components/designer-field/design.md`
- **复核状态**: `维度复核通过`

### [维度09] report field-panel / inspector-shell 根契约不完整

- **文件**: `packages/report-designer-renderers/src/field-panel-renderer.tsx:32-36`, `packages/report-designer-renderers/src/inspector-shell-renderer.tsx:26-30`
- **证据片段**:
  ```tsx
  className={joinClassNames('nop-report-designer', props.meta.className)}
  ```
- **严重程度**: P2
- **现状**: 根 marker 过泛，`testid/cid` 缺失，且使用自定义 `joinClassNames`。
- **风险**: root renderer 契约与 shared class merge 语义都不完整。
- **建议**: 补齐专属 marker、`meta` 透传，并统一改用 `cn()`。
- **参考文档**: `docs/components/report-field-panel/design.md`, `docs/components/report-inspector-shell/design.md`
- **复核状态**: `维度复核通过`

### [维度09] report inspector / toolbar 仍硬编码根测试标记并丢失部分 `meta`

- **文件**: `packages/report-designer-renderers/src/report-designer-inspector.tsx:52-57`, `packages/report-designer-renderers/src/report-designer-toolbar.tsx:36-40`
- **证据片段**:
  ```tsx
  data-testid="report-inspector"
  data-testid="report-toolbar"
  ```
- **严重程度**: P2
- **现状**: authored `meta.testid` 被硬编码值覆盖，`meta.className/cid` 也未完整透传。
- **风险**: 多实例自动化与宿主覆写路径不可靠。
- **建议**: 用 `props.meta.testid` 替代硬编码值，并补齐 `className/cid` 透传。
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: `维度复核通过`

### [维度09] `word-editor-page` 的 `onBack` 丢失原始 click event

- **文件**: `packages/word-editor-renderers/src/word-editor-page.tsx:247-249`, `packages/word-editor-renderers/src/word-editor-page.tsx:361-366`
- **证据片段**:
  ```ts
  const handleBack = useCallback(() => {
    void props.events.onBack?.();
  }, [props.events]);
  ```
- **严重程度**: P2
- **现状**: DOM 入口没有把 click event 透传给 runtime event handler。
- **风险**: action 侧失去 `target/currentTarget/preventDefault` 等事件语义。
- **建议**: 改为 `onClick={(event) => void props.events.onBack?.(event)}`。
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: `维度复核通过`

### [维度09] `joinClassNames` 是次级实现偏差

- **文件**: `packages/report-designer-renderers/src/helpers.ts:3-5`
- **证据片段**:
  ```ts
  export function joinClassNames(...parts: Array<string | undefined | false>) {
    return parts.filter(Boolean).join(' ');
  }
  ```
- **严重程度**: P3
- **现状**: 与 `cn()` 约定不一致，但更适合作为 root contract 修复时顺带收口。
- **风险**: class merge 缺少 `tailwind-merge` 语义。
- **建议**: 随 report root renderer 契约修复一起替换为 `cn()`。
- **参考文档**: `AGENTS.md`
- **复核状态**: `已降级`
