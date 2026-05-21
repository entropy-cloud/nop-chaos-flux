# UI/UX 设计合规性审查 - Round 02

## 视角4：表单交互模式

### [视角4-02] TreeOptionList 的搜索框没有内建清除入口

- **文件**: `packages/flux-renderers-form-advanced/src/tree-controls.tsx:192-202`
- **证据片段**:
  ```tsx
  {
    props.searchable ? (
      <Label data-slot="tree-option-search">
        <SearchIcon className="size-4" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={props.searchLabel}
          placeholder={props.searchLabel}
          disabled={props.disabled}
        />
      </Label>
    ) : null;
  }
  ```
- **严重程度**: LOW
- **现状**: `TreeOptionList` 在 searchable 模式下只渲染搜索图标和普通 `Input`，没有任何清除/重置按钮。这个共享列表同时被 `InputTree` 和 `TreeSelect` 复用，因此两个控件都会继承这个搜索清空缺口。
- **行业惯例**: shadcn/ui 的可搜索选择器、Ant Design 的 Select/TreeSelect 搜索、MUI 的 filter/search 输入通常都会提供 clear affordance（输入尾部 `X`、独立清除按钮或可见 clear icon），避免用户只能逐字退格。
- **用户影响**: 用户在树节点较多、查询词较长时，切换不同搜索尝试会明显变得笨拙；尤其在 `TreeSelect` popover 内，更容易期待一键清空而不是手工删空。
- **建议**: 在 `tree-option-search` 区域为 `query` 增加可见清除入口，例如在 `Input` 右侧追加 `Button variant="ghost" size="icon-xs"` + `XIcon`，仅在 `query` 非空时显示；点击后执行 `setQuery('')`。
- **复核状态**: 未复核

## 视角5：Loading 和空状态

### [视角5-04] Table quick edit 的保存中状态只禁用操作，没有可见的保存反馈

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx:81-92,153-160,191-199`
- **证据片段**:
  ```tsx
  {
    !config?.saveImmediately && saveAction ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!dirty || saving}
        onClick={() => void runSave()}
      >
        {t('flux.common.save')}
      </Button>
    ) : null;
  }
  ```
- **严重程度**: MEDIUM
- **现状**: quick edit 控件维护了 `saving` 状态，但在 UI 上只把保存按钮置灰；按钮文案仍然是固定的“Save”，也没有 `Spinner`、`Saving...`、行内状态文本或覆盖层。dialog quick edit 分支同样只用 `disabled={!dirty || saving}` 控制按钮可用性。
- **行业惯例**: shadcn/ui 风格的异步按钮、Ant Design editable table、MUI async actions 一般都会在保存中显示明确反馈，例如 `Spinner`、`Saving...` 文案，或至少在按钮内切换到 pending 视觉状态，而不是仅仅禁用。
- **用户影响**: 在表格快速编辑这种高频路径里，网络稍慢时用户只能看到按钮突然不可点，但看不到“正在保存”的明确信号，容易误以为点击没生效，进而重复操作或怀疑保存失败。
- **建议**: 为 quick edit 的 `saving` 分支补充内建 pending 反馈：按钮内容改为 `Spinner className="size-4" + t('flux.common.saving')`，或在 inline/dialog 编辑区增加 `role="status" aria-live="polite"` 的保存中状态；若 `saveImmediately` 为 true，也应在输入区附近显示轻量行内保存反馈。
- **复核状态**: 未复核

## 按严重程度排序的问题清单

1. [视角5-04] `packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx` - quick edit 保存中只有禁用，没有可见保存反馈
2. [视角4-02] `packages/flux-renderers-form-advanced/src/tree-controls.tsx` - tree 搜索框缺少一键清除入口

## 按组件分组的问题清单

- `tree-controls`
  - [视角4-02] 共享搜索框无 clear affordance
- `table-quick-edit-cell`
  - [视角5-04] `saving` 状态缺少可见 pending 反馈

## 总体评估

Round 02 继续深挖后，新问题主要集中在两类次级盲区：

1. searchable 控件的微交互收口不完整；
2. 高频编辑路径里的 pending 反馈仍有遗漏。

未再发现新的高价值“空内容透传丢失”根因；这一类在当前可见范围内仍以 CRUD 的已知问题为主。
