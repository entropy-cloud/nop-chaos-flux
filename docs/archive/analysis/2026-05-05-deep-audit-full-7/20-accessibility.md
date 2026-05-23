# 维度 20：可访问性（WCAG）

## 第1轮初审

### [维度20] select 渲染器的错误文本未关联到实际可聚焦触发器

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx:160-179`
- **严重程度**: P1
- **WCAG 准则**: 3.3.1 / 4.1.2

### [维度20] tree 控件的搜索框缺少可访问名称

- **文件**: `packages/flux-renderers-form-advanced/src/tree-controls.tsx:123-130`
- **严重程度**: P2
- **WCAG 准则**: 3.3.2 / 4.1.2

### [维度20] tree 控件的异步加载/错误状态未通过 live region 宣告

- **文件**: `packages/flux-renderers-form-advanced/src/tree-controls.tsx:181-185,262-266`
- **严重程度**: P2
- **WCAG 准则**: 4.1.3

### [维度20] condition-builder 的字段/操作符/value 子控件缺少可访问名称

- **文件**: `packages/flux-renderers-form-advanced/src/condition-builder/field-select.tsx:69-82`, `packages/flux-renderers-form-advanced/src/condition-builder/operator-select.tsx:23-31`, `packages/flux-renderers-form-advanced/src/condition-builder/value-input.tsx:60-66`
- **严重程度**: P1
- **WCAG 准则**: 3.3.2 / 4.1.2

### [维度20] table 列过滤搜索框缺少列级名称

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:188-200`
- **严重程度**: P2
- **WCAG 准则**: 3.3.2 / 4.1.2

## 深挖第2轮追加

### [维度20] radio-group / checkbox-group 的异步错误文本未被控件本身关联

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx:295-311,348-369`
- **严重程度**: P1
- **WCAG 准则**: 3.3.1 / 4.1.2

### [维度20] variant-field 的 select 模式选择器没有可访问名称

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:307-316`
- **严重程度**: P1
- **WCAG 准则**: 3.3.2 / 4.1.2

### [维度20] array-editor / key-value 子项错误消息未通过 `aria-describedby` 关联到输入框

- **文件**: `packages/flux-renderers-form-advanced/src/array-editor.tsx:63-102`, `packages/flux-renderers-form-advanced/src/key-value.tsx:66-151`
- **严重程度**: P1
- **WCAG 准则**: 3.3.1 / 4.1.2

### [维度20] condition-builder 的拖拽手柄缺少键盘可操作语义与名称

- **文件**: `packages/flux-renderers-form-advanced/src/condition-builder/condition-item.tsx:107-113`, `packages/flux-renderers-form-advanced/src/condition-builder/condition-group.tsx:358-370`
- **严重程度**: P1
- **WCAG 准则**: 2.1.1 / 4.1.2

## 深挖第4轮追加

### [维度20] 基础文本输入未把必填语义下发到真实 input 控件

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx:49-60`, `packages/flux-react/src/field-frame.tsx:197-210`
- **严重程度**: P2
- **WCAG 准则**: 1.3.1 / 4.1.2

### [维度20] key-value 行删除后未恢复合理焦点

- **文件**: `packages/flux-renderers-form-advanced/src/key-value.tsx:153-169,360-377`
- **严重程度**: P2
- **WCAG 准则**: 2.4.3 / 3.2.1

## 深挖第5轮追加

### [维度20] detail-field / detail-view 的默认触发按钮文案硬编码且缺少上下文名称

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:44-47,216-227`, `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:48-50,295-307`
- **严重程度**: P2
- **WCAG 准则**: 2.4.6 / 3.3.2

### [维度20] detail draft 顶部错误文本未作为状态消息宣告

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-surface.tsx:64-73`
- **严重程度**: P2
- **WCAG 准则**: 4.1.3 / 3.3.1

### [维度20] data tree 的 `treeitem` 结构缺少层级位置信息且空树仍暴露 tree 语义

- **文件**: `packages/flux-renderers-data/src/tree-renderer.tsx:94-111,195-205`
- **严重程度**: P2
- **WCAG 准则**: 1.3.1 / 4.1.2

## 深挖统计

- 第1轮发现数：7
- 第2轮新增：5
- 第3轮新增：0
- 第4轮新增：2
- 第5轮新增：3

## 维度复核结论

- 初审与深挖共 14 项，独立复核后保留 10 项、降级 4 项。
- 复核后高优先级问题主要集中在真实焦点控件未关联错误/必填语义、关键交互缺少可访问名称，以及键盘不可操作的拖拽手柄。

## 子项复核结论

- `[维度20] select 渲染器的错误文本未关联到实际可聚焦触发器`: 保留。错误文本只渲染为旁边的 `<span>`，没有关联到真实 `SelectTrigger`。
- `[维度20] tree 控件的搜索框缺少可访问名称`: 保留。只有图标和 placeholder，无法形成稳定可访问名称。
- `[维度20] tree 控件的异步加载/错误状态未通过 live region 宣告`: 保留。加载/错误状态只是普通文本节点，没有 `aria-live` / `role="status|alert"`。
- `[维度20] condition-builder 的字段/操作符/value 子控件缺少可访问名称`: 保留。读屏下难以判断各控件用途。
- `[维度20] table 列过滤搜索框缺少列级名称`: 保留。只有通用 placeholder，没有把当前列名暴露为可访问名称。
- `[维度20] radio-group / checkbox-group 的异步错误文本未被控件本身关联`: 降级。错误上下文缺失属实，但弱于完全不可操作。
- `[维度20] variant-field 的 select 模式选择器没有可访问名称`: 降级。通常处在已有字段上下文内，严重度低于 P1。
- `[维度20] array-editor / key-value 子项错误消息未通过 aria-describedby 关联到输入框`: 降级。错误文本本身用了 `role="alert"`，并非完全不可感知。
- `[维度20] condition-builder 的拖拽手柄缺少键盘可操作语义与名称`: 保留。键盘用户基本无法把它当作可操作控件使用。
- `[维度20] 基础文本输入未把必填语义下发到真实 input 控件`: 保留。必填/`aria-required` 只落在外层容器上。
- `[维度20] key-value 行删除后未恢复合理焦点`: 保留。删除行后没有像 array-editor 那样显式恢复焦点。
- `[维度20] detail-field / detail-view 的默认触发按钮文案硬编码且缺少上下文名称`: 保留。泛化的 `Edit` 在多处并列时缺少上下文。
- `[维度20] detail draft 顶部错误文本未作为状态消息宣告`: 保留。只是普通 `<p>`，没有状态消息语义。
- `[维度20] data tree 的 treeitem 结构缺少层级位置信息且空树仍暴露 tree 语义`: 降级。empty tree 仍暴露 `role="tree"` 成立，但“层级/位置信息缺失”不算明显致命缺陷。
