# 维度 09：渲染器契约合规性

## 审核范围

检查所有 flux-renderers-\* 包中的渲染器组件是否遵循 RendererComponentProps 模式、数据来源、样式契约、data-testid/data-cid 传递。

## 发现清单

### [维度09] 8 个渲染器缺少 data-testid/data-cid 透传

以下渲染器未从 `props.meta` 传递 `data-testid` 和 `data-cid` 到根元素：

#### 1. SelectRenderer

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx`
- **严重程度**: P2
- **现状**: SelectRenderer 未将 `props.meta.testid` 和 `props.meta.cid` 传递到根元素。
- **建议**: 在根元素上添加 `data-testid={props.meta.testid}` 和 `data-cid={props.meta.cid}`。

#### 2. CheckboxRenderer

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx`
- **严重程度**: P2
- **现状**: 同上。

#### 3. SwitchRenderer

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx`
- **严重程度**: P2
- **现状**: 同上。

#### 4. RadioGroupRenderer

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx`
- **严重程度**: P2
- **现状**: 同上。

#### 5. CheckboxGroupRenderer

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx`
- **严重程度**: P2
- **现状**: 同上。

#### 6. ArrayEditorRenderer

- **文件**: `packages/flux-renderers-form-advanced/src/array-editor.tsx`
- **严重程度**: P2
- **现状**: 同上。

#### 7. KeyValueRenderer

- **文件**: `packages/flux-renderers-form-advanced/src/key-value.tsx`
- **严重程度**: P2
- **现状**: 同上。

#### 8. TagListRenderer

- **文件**: `packages/flux-renderers-form-advanced/src/tag-list.tsx`
- **严重程度**: P2
- **现状**: 同上。

### 共性问题

- **契约条款**: AGENTS.md Renderer Component Contract 要求 `data-testid={props.meta.testid}` 和 `data-cid={props.meta.cid}`。
- **风险**: E2E 测试无法通过 testid 定位这些渲染器，影响测试可靠性。
- **建议**: 统一在所有渲染器根元素上传递 testid 和 cid。
- **为什么值得现在做**: 这些渲染器在表单场景中高频使用，缺少 testid 会持续影响 E2E 测试编写。
- **误报排除**: 无。所有其他渲染器都正确传递了 testid/cid。
- **历史模式对应**: 渲染器契约逐步收敛中的遗漏。
- **参考文档**: AGENTS.md "MANDATORY: Renderer Component Contract"
- **复核状态**: 维度复核通过

## 其他检查项

- RendererComponentProps 类型使用 ✓（所有渲染器）
- 数据来源正确（props.props/props.meta/props.regions/props.events）✓
- 无直接 store 访问 ✓
- 无 ad-hoc React context ✓
- 无 prop-drilling chain ✓
- 注册模式正确（RendererDefinition + registerXxxRenderers）✓
- className 使用 cn() 合并 ✓
- regions.render() 正确传递 key ✓

## 总结评估

8 个渲染器缺少 data-testid/data-cid 透传（P2），其余契约项全部合规。初审称"all compliant"但维度复核发现了遗漏。问题集中在 form 和 form-advanced 包的 2 个文件中。
