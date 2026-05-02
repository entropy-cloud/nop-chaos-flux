# 09 渲染器契约合规性

## 复核统计

- 初审条目: 4
- 维度复核: 完成
- 子项复核: 3 条
- 保留: 2
- 降级: 1
- 驳回: 1

## 保留

### [维度09] `ContainerRenderer` 在 flex-child 路径中偷偷注入默认 gap

- **文件**: `packages/flux-renderers-basic/src/container.tsx:24-29`, `packages/flux-renderers-basic/src/container.tsx:41-57`
- **证据片段**:
  ```tsx
  24: const useFlexChild =
  26: const flexChildGapStyle =
  27:   useFlexChild && !gap.className && !gap.style
  28:     ? { gap: 'var(--space-form-item-gap)' }
  ```
- **严重程度**: P1
- **契约条款**: layout renderer 默认间距应来自 theme CSS 或显式 schema，而不是 renderer code。
- **现状**: 一旦命中 `data-flex` 分支且 schema 未声明 `gap`，renderer 会注入 inline gap style。
- **建议**: 删除 renderer 内 fallback gap，让默认间距完全回到 theme CSS。
- **为什么值得现在做**: inline style 会把默认布局行为固定在 renderer，而不是 schema/theme 层。
- **误报排除**: item review确认 `container` 属于 layout renderer，不适用 widget 自带样式例外。
- **历史模式对应**: layout renderer 硬编码默认布局
- **参考文档**: `docs/architecture/styling-system.md`, `AGENTS.md`
- **复核状态**: `子项复核通过`

### [维度09] code-editor 事件不能形成可归一化的 `ctx.event`

- **文件**: `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts:25-45`, `packages/flux-code-editor/src/use-code-mirror.ts:12-14`, `packages/flux-react/src/helpers.tsx:28-48`
- **证据片段**:
  ```ts
  25: const handleChange = (newValue: string) => {
  31:   props.events.onChange?.({ value: newValue });
  34: const handleFocus = () => {
  38:   props.events.onFocus?.();
  ```
  ```ts
  33:       if (update.docChanged) {
  35:         options.onChange?.(update.state.doc.toString());
  37:       if (update.focusChanged) {
  39:           options.onFocus?.();
  ```
- **严重程度**: P2
- **契约条款**: 非 DOM semantic payload 至少应带 `type`，否则 normalized event 会被丢弃。
- **现状**: `onChange` 只有 `{ value }`，`onFocus/onBlur` 完全无 payload，最终都不能稳定形成 `ActionContext.event`。
- **建议**: 为 code-editor 事件补上 type-bearing semantic payload，必要时保留原始 editor event/metadata。
- **为什么值得现在做**: 这已经影响 action handler/debugger 所见的事件上下文。
- **误报排除**: item review确认 `normalizeActionEvent()` 对无 `type` payload 会返回 `undefined`。
- **历史模式对应**: semantic event payload 未与 action contract 对齐
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: `子项复核通过`

## 已降级

### [维度09] `TreeRenderer` 重复 region 渲染缺少显式 repeated-instance identity

- **文件**: `packages/flux-renderers-data/src/tree-renderer.tsx:80-83`, `packages/flux-react/src/render-nodes.tsx:306-307`
- **证据片段**:
  ```tsx
  80:   const nodeContent = owner.regions.node
  81:     ? owner.regions.node.render({
  82:         bindings: { node, index, depth, key: nodeKey, parentNode },
  ```
  ```ts
  306: const instancePath =
  307:   options?.instancePath ?? ownerNodeInstance?.instancePath ?? currentInstancePath;
  ```
- **严重程度**: P2
- **契约条款**: repeated renderer 应优先显式传 `instancePath`。
- **现状**: tree node region 只传 bindings，最终回退到外层 instancePath。
- **建议**: 为每个树节点 region render 传入独立 `instancePath`，必要时再补 `pathSuffix`。
- **为什么值得现在做**: tree 是当前少数仍未显式携带 repeated identity 的 renderer。
- **误报排除**: item review把问题缩窄为 `instancePath` 缺失，而非泛化到所有 identity 字段。
- **历史模式对应**: repeated region identity contract 漏传
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: `已降级`

## 已驳回

### [维度09] wrapped form controls 把 `meta.className` 只挂在 inner wrapper 而不是 root

- **文件**: `packages/flux-react/src/node-frame-wrapper.tsx:52-65`, `packages/flux-renderers-form/src/renderers/input.tsx:153-327`
- **证据片段**:
  ```tsx
  52:     <FieldFrame
  63:       className={props.resolvedMeta.className}
  ```
- **严重程度**: P3
- **契约条款**: 原 lead 声称 root 没收到 className。
- **现状**: root 实际已通过 `NodeFrameWrapper -> FieldFrame` 收到 `meta.className`；真正的问题只剩部分 inner wrapper 也重复挂同一 className。
- **建议**: 不把原 lead 继续计为 defect；如需整理 inner wrapper className 漂移，可另开低优先级检查。
- **为什么值得现在做**: 防止把“重复挂载”误写成“root 未挂载”。
- **误报排除**: item review已核对 root forwarding 真实存在。
- **历史模式对应**: lead wording overstated
- **参考文档**: `docs/architecture/field-frame.md`
- **复核状态**: `已驳回`

## 零发现

- 各 renderer 包的 `registerXxxRenderers` 模式整体一致。
- 未发现 renderer 直接导入其他包私有 `/src/...` 路径。
- 根 marker class / `data-slot` 使用总体健康。
