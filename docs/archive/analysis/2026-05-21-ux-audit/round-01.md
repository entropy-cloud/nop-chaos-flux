# UI/UX 设计合规性审查 - Round 01

## 视角4：表单交互模式

### [视角4-01] InputTree / TreeSelect 搜索无结果时直接留白

- **文件**: `packages/flux-renderers-form-advanced/src/tree-controls.tsx:204-230`
- **证据片段**:
  ```tsx
  <div
    data-slot="tree-option-items"
    role="tree"
    aria-label={props.ariaLabel}
    aria-multiselectable={props.multiple || undefined}
    aria-describedby={describedBy}
    aria-errormessage={props.errorMessage}
    aria-invalid={props.invalid || undefined}
    aria-busy={props.loading || undefined}
  >
    {filteredOptions.map((option) => (
  ```
- **严重程度**: MEDIUM
- **现状**: `TreeOptionList` 在启用搜索后只渲染 `filteredOptions.map(...)`，没有 `filteredOptions.length === 0` 的空结果分支。用户输入一个不存在的关键词时，树面板会直接变成空白区域。
- **行业惯例**: shadcn/ui 的 Combobox 模式通常会提供 `Empty`/`ComboboxEmpty` 一类的“无匹配结果”反馈；本仓库的 `condition-builder` 相关选择器也有明确空态。
- **用户影响**: 用户会看到“什么都没有”的面板，无法判断是没有匹配项、还在加载，还是组件出错。这是正常使用中会直接注意到的交互断点。
- **建议**: 在 `filteredOptions.length === 0` 时渲染明确空状态，例如 `data-slot="tree-option-empty"` 的提示节点，或复用 `@nop-chaos/ui` 的 `Empty`；仅在有结果时渲染 `role="tree"` 列表。
- **复核状态**: 未复核

## 视角5：Loading 和空状态

### [视角5-01] DynamicRenderer 维护 loading 状态但没有任何内建加载反馈

- **文件**: `packages/flux-renderers-basic/src/dynamic-renderer.tsx:42-48,140-147`
- **证据片段**:

  ```tsx
  function createDynamicRendererState(
    loadAction?: DynamicRendererSchema['loadAction'],
  ): DynamicRendererState {
    return {
      loadActionKey: getLoadActionKey(loadAction),
      loading: Boolean(loadAction),
      error: loadAction ? undefined : 'loadAction is required',
      schema: null,
    };
  }

  return (
    <div className={cn('nop-dynamic-renderer', props.meta.className)}>
      {asReactNode(props.regions.body?.render())}
    </div>
  );
  ```

- **严重程度**: MEDIUM
- **现状**: 组件明确维护 `loading` 状态，但最终渲染只处理 `error`、`schema` 和 body fallback，没有针对 `visibleState.loading` 的可见反馈。
- **行业惯例**: 行业常见的异步子树加载都会提供 `Spinner`、Skeleton 或状态文案；本审查基准也要求 loading 应使用 `Spinner` 而不是静默回退。
- **用户影响**: 动态 schema 首次加载较慢时，用户只会看到静止内容或空白占位，容易误判为点击无效或页面卡住。
- **建议**: 增加显式 loading 分支，例如在 `visibleState.loading && !visibleState.schema && !visibleState.error` 时渲染 `Spinner + role="status" aria-live="polite"`；如需可定制，可增加 `loading` region 或 `loadingContent`。
- **复核状态**: 未复核

### [视角5-02] DetailSurface 确认中状态只有文案切换，没有 Spinner

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-surface.tsx:75-82`
- **证据片段**:
  ```tsx
  <Button
    type="button"
    onClick={props.onConfirm}
    disabled={props.confirming}
    aria-label={props.confirming ? t('flux.form.confirming') : t('flux.common.confirm')}
  >
    {props.confirming ? t('flux.form.confirming') : t('flux.common.confirm')}
  </Button>
  ```
- **严重程度**: MEDIUM
- **现状**: 草稿确认/提交时，按钮仅把文案从“确认”切到“确认中”，没有任何 `Spinner` 或更强的视觉加载指示。
- **行业惯例**: shadcn/ui 与主流 CRUD/表单对话框都会在提交中按钮内展示 `Spinner`，可选配合文案，避免纯文本状态变化过于隐蔽。
- **用户影响**: 当确认动作需要等待时，用户只能依赖细微文案变化判断是否已提交，反馈偏弱，容易重复点击或误以为无响应。
- **建议**: 在 `props.confirming` 时将按钮内容改为 `Spinner + confirming 文案`，例如 `<Spinner className="size-4" aria-hidden="true" />` 加文案 `<span>`。
- **复核状态**: 未复核

### [视角5-03] CRUD 会把自定义空状态内容降级成纯文本

- **文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:227-228,236-258`
- **证据片段**:

  ```tsx
  const emptyContent = resolveCrudSlotContent('empty', { fallback: defaultEmptyLabel });
  const tableEmpty = typeof emptyContent === 'string' ? emptyContent : defaultEmptyLabel;

  const base: Record<string, unknown> = {
    type: 'table',
    source: filteredRows as BaseSchema['data'],
    columns: normalizedSchema.columns ?? [],
    empty: tableEmpty,
  };
  ```

- **严重程度**: MEDIUM
- **现状**: `crud` 解析到的 `empty` 只要不是字符串，就会被直接丢弃并回退成 `defaultEmptyLabel`；这会抹掉图标、说明、CTA 等 richer empty content。
- **行业惯例**: 同一 CRUD / Table 体系中的空状态通常应保留完整内容能力，而不是只允许纯文本；本仓库 `TableRenderer` 也支持 richer `emptyContent` 透传。
- **用户影响**: 同样的“无数据”场景下，独立 Table 可以展示更完整的空状态，而 CRUD 里只能剩一行普通文字，造成明显的跨组件体验断层。
- **建议**: 不要把 `emptyContent` 强制收窄为字符串；应把完整解析结果透传给 table 的 `empty`/region，或为 CRUD -> Table 建立可传递 ReactNode 的空状态通道。
- **复核状态**: 未复核

## 视角6：对话框和弹出层

### [视角6-01] DetailSurface 的 drawer 模式没有可见的头部关闭按钮

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-surface.tsx:107-115`
- **证据片段**:
  ```tsx
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>{props.title}</DrawerTitle>
    </DrawerHeader>
    <DrawerBody>
      <div data-slot={props.bodySlot}>{props.children}</div>
    </DrawerBody>
    <DrawerFooter>{footer}</DrawerFooter>
  </DrawerContent>
  ```
- **严重程度**: MEDIUM
- **现状**: drawer 详情面板只渲染标题、正文和 footer，没有右上角关闭按钮；用户只能依赖 footer 按钮、遮罩点击或 Escape 退出。
- **行业惯例**: 常见 Dialog/Drawer 设计都会提供稳定可见的头部关闭按钮（X），尤其在长表单或长滚动面板里，退出路径应始终可见。
- **用户影响**: 当 drawer 内容较长时，用户在中上部或中部阅读/编辑时，看不到直接关闭入口，需要额外滚动到底部找 Cancel/Close，退出成本偏高。
- **建议**: 在 `DrawerHeader` 增加 `DrawerClose`/ghost icon button，或在 `@nop-chaos/ui` Drawer 层提供 `showCloseButton` 能力，并在 `DetailSurface` 默认启用。
- **复核状态**: 未复核

## 按严重程度排序的问题清单

1. [视角4-01] `packages/flux-renderers-form-advanced/src/tree-controls.tsx` - InputTree / TreeSelect 搜索无结果时直接留白
2. [视角5-01] `packages/flux-renderers-basic/src/dynamic-renderer.tsx` - DynamicRenderer 维护 loading 状态但没有任何内建加载反馈
3. [视角5-02] `packages/flux-renderers-form-advanced/src/detail-view/detail-surface.tsx` - DetailSurface 确认中状态只有文案切换，没有 Spinner
4. [视角5-03] `packages/flux-renderers-data/src/crud-renderer.tsx` - CRUD 会把自定义空状态内容降级成纯文本
5. [视角6-01] `packages/flux-renderers-form-advanced/src/detail-view/detail-surface.tsx` - DetailSurface 的 drawer 模式没有可见的头部关闭按钮

## 按组件分组的问题清单

- `tree-controls`
  - [视角4-01] 搜索无结果时直接留白
- `dynamic-renderer`
  - [视角5-01] loading 无可见反馈
- `detail-surface`
  - [视角5-02] confirming 仅文案切换，没有 Spinner
  - [视角6-01] drawer 模式无可见头部关闭按钮
- `crud-renderer`
  - [视角5-03] rich empty content 被压扁为纯文本

## 总体评估

Round 01 的新问题主要集中在三类：

1. 异步反馈偏弱：`dynamic-renderer` 与 `detail-surface` 都存在 loading/confirming 反馈不够可见的问题。
2. 搜索/空状态反馈不完整：树选择控件的“无结果”直接留白，CRUD 还会主动丢失 richer empty content。
3. 弹出层退出路径不够稳定：`detail-surface` 的 drawer 模式缺少始终可见的头部关闭入口。
