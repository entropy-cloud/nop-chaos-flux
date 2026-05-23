# UI/UX 设计合规性审查 — Round 01（初扫）

> 审查日期：2026-05-19
> 审查范围：flux-renderers-form, flux-renderers-form-advanced, flux-renderers-data, flux-renderers-basic
> 扫描文件数：35+

---

## 发现列表

### [视角2-1] 删除按钮样式不一致：array-editor 和 array-field 使用始终红色按钮，而 key-value/condition-builder 使用 ghost + hover 变红

- **文件**: `packages/flux-renderers-form-advanced/src/array-editor.tsx:126-141` 和 `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx:169-171` 对比 `packages/flux-renderers-form-advanced/src/key-value.tsx:187-198` 和 `packages/flux-renderers-form-advanced/src/condition-builder/condition-item.tsx:150-159`
- **证据片段**:

  ```tsx
  // array-editor.tsx:126-141 — 始终红色
  <Button
    type="button"
    variant="destructive"
    size="sm"
    disabled={disabled}
    aria-label={`...`}
    onClick={() => { onRemove(index); }}
  >
    {t('flux.form.remove')}
  </Button>

  // array-field.tsx:169 — 始终红色
  <WrappedFieldAction variant="destructive" size="sm" className="mt-1" onClick={() => onRemove(index)}>
    {t('flux.form.remove')}
  </WrappedFieldAction>

  // key-value.tsx:187-198 — ghost + hover 变红
  <Button
    type="button"
    variant="ghost"
    size="sm"
    disabled={disabled}
    className="hover:text-destructive"
    aria-label={`...`}
    onClick={() => onRemove(index)}
  >
    <Trash2Icon className="size-4" />
  </Button>

  // condition-item.tsx:150-159 — ghost + hover 变红
  <WrappedFieldAction
    variant="ghost"
    size="icon-xs"
    className="ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-destructive transition-opacity"
    onClick={onRemove}
    aria-label={t('conditionBuilder.removeCondition')}
  >
    <Trash2Icon className="size-3.5" />
  </WrappedFieldAction>
  ```

- **严重程度**: MEDIUM
- **现状**: 同一语义操作（行级删除），四个组件使用了两种截然不同的视觉模式：`array-editor` 和 `array-field` 使用 `variant="destructive"` 始终显示为红色按钮，文字标签 "Remove"；`key-value` 和 `condition-builder` 使用 `variant="ghost"` 默认低调，hover 时变红，图标 Trash2Icon。同时，`array-editor` 和 `array-field` 的删除按钮缺少 Trash2Icon 图标，只显示文本 "Remove"。
- **行业惯例**: shadcn/ui 和 Ant Design 的惯例是行级删除操作使用低调的 ghost/icon 按钮搭配 Trash 图标（避免列表中大量红色按钮的视觉噪音），批量或不可逆删除使用 destructive variant + 确认对话框。参见 shadcn/ui data-table 示例和 Ant Design 的行操作列设计。删除操作普遍搭配 Trash/Bin 图标以快速传达语义。
- **用户影响**: 用户在 `array-editor`/`array-field` 中看到始终红色的删除按钮排列在每行旁边，形成视觉噪音和紧张感，而在 `key-value`/`condition-builder` 中则看到低调的删除图标。非设计师用户在切换不同表单控件时会注意到这种不一致。同时，`array-editor`/`array-field` 中只能靠阅读按钮文字来识别删除操作，降低扫描效率。
- **建议**: 统一为 `variant="ghost"` + `Trash2Icon` + `hover:text-destructive` 模式。`array-editor.tsx` 第 126-141 行和 `array-field.tsx` 第 169 行应改为：
  ```tsx
  <WrappedFieldAction
    variant="ghost"
    size="icon-xs"
    className="hover:text-destructive"
    onClick={() => onRemove(index)}
    aria-label={ariaLabelText}
  >
    <Trash2Icon className="size-4" />
  </WrappedFieldAction>
  ```
- **复核状态**: 未复核

---

### [视角5-1] chart loading 状态缺少 aria-live，屏幕阅读器无法感知加载状态

- **文件**: `packages/flux-renderers-data/src/chart-renderer.tsx:307-319`
- **证据片段**:
  ```tsx
  {loading ? (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        height: '100%',
      }}
    >
      <Spinner className="size-4" aria-hidden="true" />
      <span>{t('flux.common.loading')}</span>
    </div>
  ) : (
  ```
- **严重程度**: MEDIUM
- **现状**: chart loading 状态中的包裹 `<div>` 没有 `role="status"` 或 `aria-live` 属性。Spinner 有 `aria-hidden="true"`。对比 `table-loading-overlay.tsx` 的正确做法：外层 div 有 `role="status" aria-live="polite"`。
- **行业惯例**: WAI-ARIA APG 和 shadcn/ui 规范要求 loading 状态使用 `role="status"` + `aria-live="polite"` 确保屏幕阅读器能播报状态变化。
- **用户影响**: 使用屏幕阅读器的用户在 chart 加载数据时不会收到任何反馈，认为图表为空白。
- **建议**: 给包裹 div 添加 `role="status" aria-live="polite"`。修改 chart-renderer.tsx 第 308 行：
  ```tsx
  <div
    role="status"
    aria-live="polite"
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      height: '100%',
    }}
  >
  ```
- **复核状态**: 未复核

---

### [视角3-1] condition-item 删除按钮默认完全隐藏（opacity-0），仅 hover/focus 时显示

- **文件**: `packages/flux-renderers-form-advanced/src/condition-builder/condition-item.tsx:150-159`
- **证据片段**:
  ```tsx
  <WrappedFieldAction
    variant="ghost"
    size="icon-xs"
    className="ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-destructive transition-opacity"
    onClick={onRemove}
    aria-label={t('conditionBuilder.removeCondition')}
  >
    <Trash2Icon className="size-3.5" />
  </WrappedFieldAction>
  ```
- **严重程度**: LOW
- **现状**: 删除按钮默认 `opacity-0`，只有鼠标 hover 到行上或元素获得焦点时才显示。虽然 `focus:opacity-100` 确保键盘焦点时可见，但用户需要 Tab 到按钮才能发现它。相比之下，`condition-group` 的删除按钮始终可见。
- **行业惯例**: Ant Design 和 AG Grid 的行操作按钮通常始终可见或使用更温和的隐藏方式（如 `opacity-50` 默认态 + hover 时 `opacity-100`）。完全隐藏（`opacity-0`）使鼠标用户无法扫描到删除入口。
- **用户影响**: 鼠标用户需要先 hover 到条件行上才能看到删除按钮。键盘用户可以 Tab 到按钮，但发现路径较长。这在现代 UI 中较为常见（如 GitHub issue labels），非设计师用户不被告知时可能不会特别注意到。
- **建议**: 将 `opacity-0` 改为 `opacity-40`，保持 hover 时 `opacity-100`：
  ```tsx
  className =
    'ml-auto text-muted-foreground opacity-40 group-hover:opacity-100 focus:opacity-100 hover:text-destructive transition-opacity';
  ```
- **复核状态**: 未复核

---

### [视角8-1] input-number 的 suffix 和 stepper 可能视觉重叠

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx:536-569`
- **证据片段**:

  ```tsx
  // line 519: Input has conditional right padding
  className={cn(prefix && 'pl-8', suffix && 'pr-8', showStepper && 'pr-16')}

  // line 536-540: suffix is absolutely positioned at right-3
  {suffix ? (
    <span data-slot="suffix" className="pointer-events-none absolute right-3 text-sm text-muted-foreground">
      {suffix}
    </span>
  ) : null}

  // line 541-569: stepper is absolutely positioned at right-1
  {showStepper ? (
    <span data-slot="stepper" className="absolute right-1 flex flex-col">
      <Button ... className="h-4 w-6 ..." >
        <ChevronUpIcon className="size-3" />
      </Button>
      <Button ... className="h-4 w-6 ..." >
        <ChevronDownIcon className="size-3" />
      </Button>
    </span>
  ) : null}
  ```

- **严重程度**: MEDIUM
- **现状**: 当 `suffix` 和 `showStepper` 同时启用时，suffix 定位在 `right-3`（12px），stepper 定位在 `right-1`（4px），两者宽度为 `w-6`(24px)。suffix 文字从右侧 12px 处开始，stepper 从右侧 4px 处开始。suffix 文字和 stepper 按钮区域会重叠。Input 的 padding 被设为 `pr-16`（64px），但这只影响文本输入区域，不影响绝对定位元素。
- **行业惯例**: Ant Design InputNumber 将 suffix 放在 stepper 左侧（中间有间距），避免重叠。MUI 也确保 suffix 和 increment/decrement 按钮不重叠。
- **用户影响**: 当用户同时配置 suffix（如 "元"、"kg"）和 stepper 时，suffix 文字和 stepper 上下箭头会视觉重叠，无法正常阅读。这是一个功能性视觉障碍。
- **建议**: 将 suffix 左移，避免与 stepper 重叠。修改 line 537 的定位：
  ```tsx
  <span data-slot="suffix" className={cn(
    "pointer-events-none absolute text-sm text-muted-foreground",
    showStepper ? "right-10" : "right-3"
  )}>
  ```
  同时将 Input 的 className 逻辑调整为 `suffix && showStepper ? 'pr-24' : suffix ? 'pr-8' : showStepper ? 'pr-16' : ''`。
- **复核状态**: 未复核

---

### [视角10-1] CRUD 分页使用纯文本 "第X页/共Y页"，而独立 Table 使用完整 Pagination 组件

- **文件**: `packages/flux-renderers-data/src/crud-renderer-toolbar.tsx:108-133` 对比 `packages/flux-renderers-data/src/table-renderer/table-pagination-bar.tsx`
- **证据片段**:
  ```tsx
  // crud-renderer-toolbar.tsx — 纯文本分页
  case 'pagination':
    return (
      <div className="flex items-center gap-2">
        <PaginationPrevious text={t('flux.pagination.previous')} ... />
        <span className="text-sm text-muted-foreground">
          {t('flux.pagination.page', {
            current: pagination.currentPage,
            total: summary.total != null ? Math.ceil(summary.total / pagination.pageSize) : '?',
          })}
        </span>
        <PaginationNext text={t('flux.pagination.next')} ... />
      </div>
    );
  ```
- **严重程度**: MEDIUM
- **现状**: CRUD 的 toolbarLayout `pagination` 模块只提供 Previous/Next + 纯文本 "第X页/共Y页"，不能直接跳转到特定页。独立 Table 使用 shadcn/ui 的完整 Pagination 组件，提供页码按钮、省略号和直接点击跳转。同一应用中两个高频组件的分页交互方式不一致。
- **行业惯例**: Ant Design 和 MUI 的分页组件在表格场景中提供一致的页码跳转能力。shadcn/ui Pagination 组件也提供完整的页码按钮模式。
- **用户影响**: 用户在 CRUD 列表页需要多次点击 Next 才能跳到远处页码，而在独立 Table 中可以直接点击页码。这是一个实际的操作效率差异，非设计师用户在频繁翻页时会注意到。
- **建议**: 将 `crud-renderer-toolbar.tsx` 的 pagination 模块替换为使用与 `table-pagination-bar.tsx` 相同的完整 Pagination 组件，或至少添加页码按钮。
- **复核状态**: 未复核

---

## 按严重程度排序

| 序号 | 严重程度 | 标题                             | 文件                                                    |
| ---- | -------- | -------------------------------- | ------------------------------------------------------- |
| 1    | MEDIUM   | 删除按钮样式不一致（含缺少图标） | array-editor / array-field / key-value / condition-item |
| 2    | MEDIUM   | suffix 与 stepper 视觉重叠       | input.tsx:536-569                                       |
| 3    | MEDIUM   | chart loading 缺少 aria-live     | chart-renderer.tsx:307-319                              |
| 4    | MEDIUM   | CRUD 与 Table 分页交互不一致     | crud-renderer-toolbar.tsx:108-133                       |
| 5    | LOW      | condition-item 删除按钮完全隐藏  | condition-item.tsx:150-159                              |

## 按组件分组

| 组件                                                       | 发现数 | 涉及视角 |
| ---------------------------------------------------------- | ------ | -------- |
| array-editor / array-field / key-value / condition-builder | 1      | 视角2    |
| input-number (input.tsx)                                   | 1      | 视角8    |
| chart-renderer                                             | 1      | 视角5    |
| crud-renderer-toolbar                                      | 1      | 视角10   |
| condition-item                                             | 1      | 视角3    |

## 总体评估

**整体质量: 良好**

经过对 4 个渲染器包共 35+ 个文件的全面审查，项目在图标语义一致性、ARIA 可访问性、状态指示、对话框/弹出层、颜色使用等方面做得很好。发现的 5 个问题中，无 HIGH 级别。最值得优先修复的是 input-number 的 suffix/stepper 重叠问题和删除按钮一致性。

### 可暂缓项（不计入发现统计）

1. `table-pagination-bar.tsx` 的分页信息可能需要 i18n 翻译。
2. `detail-surface.tsx` 的确认/取消按钮顺序为 Cancel-then-Confirm，shadcn/ui 也用此模式，可接受。
