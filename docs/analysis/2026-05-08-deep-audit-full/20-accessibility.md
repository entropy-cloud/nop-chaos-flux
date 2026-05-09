# 20 Accessibility

- 深挖轮次: 1
- 深挖发现数: 4

## 第 1 轮初审

### [维度20-01] RadioGroup 的 options source 错误未与单选组建立程序化关联

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\renderers\input.tsx:310-330`
- **行号范围**: 310-330
- **证据片段**:
  ```tsx
  <RadioGroup
    data-slot="radio-group-options"
    value={selectedValue}
    disabled={loading || presentation.effectiveDisabled}
    aria-required={props.props.required ? true : undefined}
    aria-invalid={presentation.showError ? true : undefined}
  >
  ...
  {errorMessage ? (
    <span data-slot="radio-group-error" role="alert">
      {errorMessage}
    </span>
  ) : null}
  ```
- **严重程度**: P2
- **WCAG 准则**: 1.3.1 Info and Relationships / 3.3.1 Error Identification / 4.1.2 Name, Role, Value
- **影响**: options source 加载失败后，错误只作为独立 `role="alert"` 出现；之后键盘或读屏用户聚焦到单选组时，控件本身没有 `aria-describedby` / `aria-errormessage` 指向该错误，难以确认当前单选组为何不可正常选择。
- **修复建议**: 为 radio-group source error 生成稳定 `id`，并把 `aria-describedby` 和必要时的 `aria-errormessage` 挂到 `RadioGroup`，与 checkbox-group / select 的 source error 关联方式保持一致。
- **为什么值得现在做**: 这是同一文件中 select、checkbox-group 已修复的 source error 关联模式的遗漏，修复面小且能直接补齐同类控件一致性。
- **误报排除**: 这不是已关闭的 checkbox-group source errors；当前证据是 live code 中 radio-group 独立渲染错误文本但未把错误 ID 关联到可交互 group。
- **历史模式对应**: plan 226 的 “labels, names, and status associations” 家族；属于已修复模式旁边的 live residual。
- **参考文档**: `docs/skills/deep-audit-prompts.md` 维度 20；`docs/plans/226-accessibility-follow-up-plan.md`
- **复核状态**: 未复核

### [维度20-02] input-tree / tree-select 的 source 错误没有关联到 tree 或触发按钮

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\tree-controls.tsx:185-205`
- **行号范围**: 185-205, 239-299
- **证据片段**:
  ```tsx
  <TreeOptionList
    options={options}
    value={value}
    multiple={multiple}
    showPathLabel={props.props.showPathLabel === true}
    searchable={props.props.searchable === true}
    disabled={presentation.effectiveDisabled || optionsSourceState?.loading === true}
  />
  ...
  {sourceError ? (
    <span data-slot="input-tree-source-error" role="alert">
      {sourceError}
    </span>
  ) : optionsSourceState?.loading === true ? (
  ```
- **严重程度**: P2
- **WCAG 准则**: 1.3.1 Info and Relationships / 3.3.1 Error Identification / 4.1.2 Name, Role, Value
- **影响**: tree options 来源失败时，错误文本只作为 alert 出现；`role="tree"` 容器和 `tree-select` 的触发 `Button` 都没有 `aria-describedby` 指向 source error。读屏用户稍后回到控件时无法从控件上下文获知错误原因。
- **修复建议**: 为 `input-tree-source-error` / `tree-select-source-error` 生成稳定 ID；`InputTreeRenderer` 将其关联到 `TreeOptionList` 内的 `role="tree"`，`TreeSelectRenderer` 将其关联到触发按钮，并在必要时设置 `aria-invalid`。
- **为什么值得现在做**: tree 控件是维度 20 重点交互组件；当前代码已经为 loading 使用 `role="status"`，补齐 error association 可以低成本完成同类状态语义闭环。
- **误报排除**: 这不是 plan 226 明确要求不要重报的 checkbox-group source errors；也不是要求完整 APG tree rewrite，而是 live source error 与具体控件缺少程序化关系。
- **历史模式对应**: 与 plan 226 中 table loading fallback、checkbox-group source errors、array/keyvalue child errors 同属 “状态/错误文本存在但未关联到控件” 模式。
- **参考文档**: `docs/skills/deep-audit-prompts.md` 维度 20；`docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

### [维度20-03] ConditionBuilder 多选新增控件把可聚焦 NativeSelect 设为透明，键盘焦点缺少可见指示

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\condition-builder\value-input.tsx:216-240`
- **行号范围**: 216-240
- **证据片段**:
  ```tsx
  <div className="relative">
    <NativeSelect
      id={inputIdPrefix ? `${inputIdPrefix}-select` : undefined}
      className="absolute inset-0 w-full opacity-0"
      aria-label={t('conditionBuilder.valueLabel')}
      disabled={disabled}
      value=""
      onChange={(e) => {
  ```
- **严重程度**: P2
- **WCAG 准则**: 2.4.7 Focus Visible / 2.1.1 Keyboard / 4.1.2 Name, Role, Value
- **影响**: 键盘用户 Tab 到该 `NativeSelect` 时，实际获得焦点的是透明控件；可见的 `Badge` 只是视觉外壳且没有 `focus-within` 样式或焦点同步，用户可能不知道焦点当前位置，也难以可靠操作新增选项。
- **修复建议**: 避免把真实可聚焦控件完全透明；可改用可见 `NativeSelect`/`Button`/`Combobox`，或至少给外层容器添加 `focus-within` 可见焦点环并保证可见外壳与真实控件尺寸完全一致。
- **为什么值得现在做**: 该控件位于 condition-builder 的核心值编辑路径，修复局部且能避免键盘用户在复杂条件编辑中丢失焦点。
- **误报排除**: 这不是 plan 226 已关闭的 “condition-builder between labels” 或 “selected badge delete mouse-only”；当前问题是新增选项的透明 `NativeSelect` 导致 focus visible 缺失，是不同 live residual。
- **历史模式对应**: 维度 20 的 keyboard/focus management 家族；与历史 “可点击但无等价键盘/焦点反馈” 问题同类。
- **参考文档**: `docs/skills/deep-audit-prompts.md` 维度 20；`packages/ui/src/index.ts`
- **复核状态**: 未复核

### [维度20-04] CheckboxRenderer 的 required 状态没有传递到实际 checkbox 控件

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\renderers\input.tsx:226-249`
- **行号范围**: 226-249
- **证据片段**:
  ```tsx
  <Checkbox
    id={name ? `${name}-control` : undefined}
    checked={checked}
    disabled={presentation.effectiveDisabled}
    aria-invalid={presentation.showError ? true : undefined}
    aria-label={optionLabel}
    onFocus={handlers.onFocus}
    onCheckedChange={(checked) => handlers.onChange(Boolean(checked))}
  />
  ```
- **严重程度**: P2
- **WCAG 准则**: 1.3.1 Info and Relationships / 3.3.2 Labels or Instructions / 4.1.2 Name, Role, Value
- **影响**: schema 声明 checkbox 必填时，字段外层 FieldFrame 可能展示 required marker，但实际获得焦点的 checkbox 没有 `aria-required`；读屏用户在控件焦点处可能无法获知该 checkbox 是必填项。
- **修复建议**: 与 text/select/radio/checkbox-group 一致，在 `Checkbox` 上添加 `aria-required={props.props.required ? true : undefined}`，并确认 FieldFrame 克隆后的 described-by/error 关联仍正常合并。
- **为什么值得现在做**: 同一文件中多数基础表单控件已经显式传递 `aria-required`，checkbox 是明显遗漏，修复范围很小。
- **误报排除**: 这不是要求替换 raw HTML 或重构字段壳；当前控件已经使用 `@nop-chaos/ui` Checkbox，问题仅是 required 状态未落到实际可聚焦控件。
- **历史模式对应**: 表单字段 label/error/required association 漏洞；与 plan 226 的 label/status association 收口方向一致但不属于其列出的已修复项。
- **参考文档**: `docs/skills/deep-audit-prompts.md` 维度 20；`docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度20-05] ConditionBuilder picker 模式的实际触发按钮没有继承字段错误/必填关联

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\condition-builder\condition-builder.tsx`
- **行号范围**: 156-165
- **证据片段**:
  ```tsx
  <div className={cn('nop-condition-builder', className)} data-testid={testid} data-cid={cid}>
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="flex h-9 w-full items-center justify-between px-3 py-2 text-sm"
            disabled={disabled}
  ```
- **严重程度**: P2
- **WCAG 准则**: 1.3.1 Info and Relationships / 3.3.1 Error Identification / 4.1.2 Name, Role, Value
- **影响**: `embed=false` 时键盘和读屏用户实际聚焦的是 Popover 触发 `Button`，但字段级 label、required、invalid、error description 只会由外层 FieldFrame 关联到非聚焦容器；用户聚焦按钮时难以获知该 condition-builder 字段是否必填或当前为何无效。
- **修复建议**: 在 picker 模式为触发按钮传入字段级 `aria-invalid`、`aria-describedby` / `aria-errormessage`，并用稳定 ID 关联 FieldFrame 的 label/description/error；required 状态可通过描述文本或合适的 composite/group 语义传达，避免只落在外层非聚焦容器。
- **为什么值得现在做**: picker 模式是 condition-builder 的紧凑交互入口，修复局部且能补齐复杂字段在实际焦点目标上的错误/状态关系。
- **误报排除**: 这不是 plan 226 已收口的 “between inputs 无名” 或 selected badge 删除路径；当前问题发生在 `embed=false` 的 Popover 触发按钮，是另一个 live focus target 的字段状态关联缺失。
- **历史模式对应**: “状态/错误文本存在但未关联到实际控件” 家族；与已修复的 checkbox-group、array/key-value child error association 属同类 residual。
- **参考文档**: `docs/skills/deep-audit-prompts.md` 维度 20；`docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

### [维度20-06] tree-select 必填/无效状态没有落到实际可聚焦触发按钮

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\tree-controls.tsx`
- **行号范围**: 210-216, 241-248
- **证据片段**:
  ```tsx
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldController(name, {
    disabled: props.meta.disabled,
    required: Boolean(props.props.required),
    readOnly: Boolean(props.props.readOnly),
  });
  ...
  <Button
    type="button"
    variant="outline"
    aria-label={fieldLabel}
    disabled={presentation.effectiveDisabled || presentation.readOnly || optionsSourceState?.loading === true}
  >
  ```
- **严重程度**: P2
- **WCAG 准则**: 1.3.1 Info and Relationships / 3.3.1 Error Identification / 3.3.2 Labels or Instructions / 4.1.2 Name, Role, Value
- **影响**: schema 声明 `tree-select` 必填或验证失败时，FieldFrame/外层容器可能显示状态，但键盘焦点实际停在触发 `Button`；该按钮没有 `aria-invalid`、错误描述关联，也没有通过描述传达 required 状态，读屏用户在焦点处无法确认当前字段状态。
- **修复建议**: 为 tree-select 触发按钮合并 FieldFrame 生成的 description/error ID，设置 `aria-invalid`，并通过 `aria-describedby` 关联必填说明和错误文本；若继续使用 button 作为触发器，不要把 required 只放在外层容器。
- **为什么值得现在做**: tree-select 是 advanced form 的核心选择控件；当前代码已经计算 required/presentation，补齐到实际焦点目标成本低且能避免复杂树选择场景下的状态丢失。
- **误报排除**: 这不是现有 [维度20-02] 的 options source error 未关联问题；本条关注普通字段 required/invalid 状态没有传递到 tree-select 触发按钮，也不是 plan 226 已关闭的 tree keyboard baseline。
- **历史模式对应**: 表单字段 label/error/required association residual；与基础 input/select 已落到实际控件的模式不一致。
- **参考文档**: `docs/skills/deep-audit-prompts.md` 维度 20；`docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度20-07] WrappedFieldAction 自定义 role=button 移除了浏览器焦点轮廓但没有提供替代 focus-visible 样式

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\wrapped-field-action.tsx:21-22,108-116`
- **行号范围**: 21-22, 108-116
- **证据片段**:
  ```tsx
  const baseClass =
    'group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border font-medium transition-all outline-none select-none';
  ...
  return (
    <span
      {...rest}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled ? 'true' : undefined}
      className={getWrappedFieldActionClasses(variant, size, className, disabled)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
  ```
- **严重程度**: P2
- **WCAG 准则**: 2.4.7 Focus Visible / 2.1.1 Keyboard / 4.1.2 Name, Role, Value
- **现状**: `WrappedFieldAction` 用 `span role="button"` 实现键盘可聚焦控件，并通过 `outline-none` 移除默认焦点轮廓，但基础样式没有 `focus-visible:ring-*`、`focus-visible:border-*` 或等价可见焦点反馈。
- **影响**: condition-builder、tag-list、array-field 等高级表单中的新增、删除、切换类操作可以 Tab 到达并用键盘触发，但键盘用户无法可靠看到当前焦点位置。
- **修复建议**: 优先改用 `@nop-chaos/ui` 的 `Button`；如必须保留 `span role="button"`，在 `WrappedFieldAction` 基础类中补齐与 `Button` 一致的 `focus-visible` ring/border 样式。
- **为什么值得现在做**: 这是共享封装，一处修复可覆盖多个高级表单组件的键盘焦点可见性。
- **误报排除**: 这不是要求替换所有 raw HTML；当前控件明确被做成可聚焦交互控件，并主动移除了默认 outline，却没有等价替代焦点样式。
- **历史模式对应**: keyboard/focus management residual；不是 plan 226 已收口的单个 condition-builder 删除控件问题。
- **参考文档**: `docs/skills/deep-audit-prompts.md` 维度20；`packages/ui/src/index.ts`
- **复核状态**: 未复核

### [维度20-08] TagList 的 required/invalid/error 状态停留在非聚焦容器，未关联到实际 toggle 按钮

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\tag-list.tsx:70-76,85-109`
- **行号范围**: 70-76, 85-109
- **证据片段**:

  ```tsx
  if (required && currentTags.length === 0) {
    return [
      {
        path: name,
        rule: 'required',
        message: `${labelText} requires at least one tag`,
      },
    ];
  }
  ```

  ```tsx
  <div
    className={cn('nop-tag-list', 'flex flex-wrap gap-2.5', props.meta.className)}
    data-slot="field-control"
    data-testid={props.meta.testid}
    data-cid={props.meta.cid}
  >
    {tags.map((tag) => {
      const active = value.includes(tag);

      return (
        <WrappedFieldAction
          key={tag}
          variant={active ? 'secondary' : 'outline'}
          size="sm"
          disabled={presentation.effectiveDisabled || presentation.readOnly}
  ```

- **严重程度**: P2
- **WCAG 准则**: 1.3.1 Info and Relationships / 3.3.1 Error Identification / 3.3.2 Labels or Instructions / 4.1.2 Name, Role, Value
- **现状**: `tag-list` 支持 required 校验，但实际可聚焦的是每个 `WrappedFieldAction` toggle；这些按钮只设置 `aria-pressed`，没有接收字段级 `aria-required`、`aria-invalid`、`aria-describedby` / `aria-errormessage`。
- **影响**: 字段验证失败或必填时，读屏用户聚焦某个 tag toggle 只能听到按钮状态，无法从焦点上下文获知整个 tag-list 字段必填或当前错误原因。
- **修复建议**: 为 tag-list 建立 `role="group"`/稳定 label 和错误描述关系，并将错误/required 状态通过 group 或每个实际 focus target 的 `aria-describedby` 明确关联；必要时让 `WrappedFieldAction` 支持透传字段状态。
- **为什么值得现在做**: 该组件已有 runtime required 校验，补齐程序化状态关联能直接闭环当前字段语义。
- **误报排除**: 这不是要求所有视觉 tag 都有额外 ARIA；问题只针对已经可聚焦、可切换、参与字段校验的真实交互按钮。
- **历史模式对应**: “字段状态存在但未关联到实际焦点目标” residual；不同于已报告的 condition-builder picker/tree-select。
- **参考文档**: `docs/skills/deep-audit-prompts.md` 维度20；`docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

### [维度20-09] SwitchRenderer 的 required 状态没有传递到实际 switch 控件

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\renderers\input.tsx:255-277`
- **行号范围**: 255-277
- **证据片段**:
  ```tsx
  function SwitchRenderer(props: RendererComponentProps<SwitchSchema>) {
    const name = String(props.props.name ?? '');
    const { value, handlers, presentation } = useFormFieldController(name, {
      adapter: booleanValueAdapter,
      disabled: props.meta.disabled,
      required: Boolean(props.props.required),
      readOnly: Boolean(props.props.readOnly),
    });
  ...
      <Switch
        id={name ? `${name}-control` : undefined}
        checked={checked}
        disabled={presentation.effectiveDisabled}
        aria-invalid={presentation.showError ? true : undefined}
        aria-label={String(props.props.label ?? name)}
  ```
- **严重程度**: P2
- **WCAG 准则**: 1.3.1 Info and Relationships / 3.3.2 Labels or Instructions / 4.1.2 Name, Role, Value
- **现状**: `SwitchRenderer` 将 `required` 传入字段 controller/validation，但实际可聚焦 `Switch` 只设置了 `aria-invalid` 和 `aria-label`，没有 `aria-required` 或等价 required 描述。
- **影响**: schema 声明 switch 必填时，读屏用户聚焦 switch 本身无法获知该字段是必填项，只能依赖外层非焦点 FieldFrame 的视觉 required marker。
- **修复建议**: 与 input/select/radio/checkbox-group 的模式一致，把 required 状态传递到实际 `Switch`，或通过 `aria-describedby` 关联稳定 required 说明。
- **为什么值得现在做**: 同文件基础控件大多已经传递 required，switch 是同类遗漏，修复范围小。
- **误报排除**: 这不是重复 checkbox required；当前证据是 switch 独立 renderer 中同样计算 required 但未落到实际 switch 控件。
- **历史模式对应**: 表单 required/state association residual。
- **参考文档**: `docs/skills/deep-audit-prompts.md` 维度20；`docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

### [维度20-10] ConditionBuilder 嵌套分组删除按钮的可访问名称退化为“×”

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\condition-builder\condition-group.tsx:252-260`
- **行号范围**: 252-260
- **证据片段**:
  ```tsx
  {
    depth > 0 && onRemove && (
      <WrappedFieldAction
        variant="outline"
        size="icon-xs"
        className="absolute -right-2 -top-2 z-10 rounded-full text-muted-foreground hover:text-destructive hover:border-destructive shadow-sm"
        onClick={onRemove}
        title={removeGroupLabel}
      >
        ×
      </WrappedFieldAction>
    );
  }
  ```
- **严重程度**: P2
- **WCAG 准则**: 2.4.6 Headings and Labels / 3.3.2 Labels or Instructions / 4.1.2 Name, Role, Value
- **现状**: 嵌套 condition group 的删除控件是 `WrappedFieldAction`，可访问名称来自可见文本 `×`；`title={removeGroupLabel}` 不能可靠替代按钮名称，且存在文本内容时通常不会成为主要 accessible name。
- **影响**: 读屏用户聚焦该控件时可能只听到 “× button” 或类似符号名称，无法判断这是删除分组操作，尤其在多个嵌套条件组中风险更高。
- **修复建议**: 为该控件显式传入 `aria-label={removeGroupLabel}`，并保留 `×` 作为视觉内容；如改用 `Button`，同样提供明确 `aria-label`。
- **为什么值得现在做**: 修复局部且不会改变交互模型，可以直接提升 condition-builder 嵌套分组的可理解性。
- **误报排除**: 这不是 condition-builder 已收口的 between label 或 selected badge 删除问题；当前问题是 nested group remove 的 accessible name 只剩符号。
- **历史模式对应**: 自定义图标/符号按钮缺少明确 accessible name。
- **参考文档**: `docs/skills/deep-audit-prompts.md` 维度20；`packages/ui/src/index.ts`
- **复核状态**: 未复核

## 深挖第 4 轮追加

未发现新的问题。深挖结束。
