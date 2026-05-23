# 维度 09：渲染器契约合规性

## 第1轮初审

### [维度09] `designer-field` 已注册为 live renderer，但未声明显式 field metadata

- **文件**: `packages/flow-designer-renderers/src/index.tsx:92-95`, `packages/flow-designer-renderers/src/designer-field.tsx:17-21`
- **严重程度**: P2
- **契约条款**: live renderer 的 authored 字段应在 `fields` 中显式声明。
- **现状**: 组件实际消费 `label/name/fieldType/options`，定义中却没有 `fields`。
- **建议**: 补齐至少 `label/name/fieldType/options`。

### [维度09] `designer-field` 根节点缺少语义 marker，且在 root 上偷偷固化默认布局

- **文件**: `packages/flow-designer-renderers/src/designer-field.tsx:39-46`
- **严重程度**: P2
- **现状**: root 无稳定 marker，且 `meta.className` 缺省时回退到 `grid gap-1.5`。
- **建议**: 补稳定 marker，并移除 root fallback 隐式布局。

### [维度09] `report-designer-renderers` 用自定义字符串拼接替代 `cn()` 合并 renderer root className

- **文件**: `packages/report-designer-renderers/src/helpers.ts:3-4`, `packages/report-designer-renderers/src/inspector-shell-renderer.tsx:27-31`, `packages/report-designer-renderers/src/field-panel-renderer.tsx:33-37`
- **严重程度**: P2
- **现状**: live renderer root 走本地 `joinClassNames()`，未使用 `cn()`。
- **建议**: 统一改为 `cn()`。

### [维度09] `code-editor` 根节点把 `data-cid` 直接绑到 `node.cid`

- **文件**: `packages/flux-code-editor/src/code-editor-renderer.tsx:179-184`
- **严重程度**: P3
- **现状**: `data-testid` 走 `meta.testid`，但 `data-cid` 直接读 `props.node.cid`。
- **建议**: 改为 `props.meta.cid`。

## 深挖第3轮追加

### [维度09] `report-inspector` / `report-field-panel` / `report-inspector-shell` 的 live field metadata 与实际消费字段不一致

- **文件**: `packages/report-designer-renderers/src/renderers.tsx`, `packages/report-designer-renderers/src/report-designer-inspector.tsx`, `packages/report-designer-renderers/src/field-panel-renderer.tsx`, `packages/report-designer-renderers/src/schemas.ts`
- **严重程度**: P2
- **现状**: 注册面仅声明少数字段，但 live 代码还消费 `emptyLabel/noSelectionLabel/showFieldSourceHeader/dragEnabled/fieldSources` 等。
- **建议**: 补齐 `fields`/必要的 `propContracts`。

### [维度09] `report-toolbar` / `report-inspector` 为 `data-testid` 注入硬编码默认值

- **文件**: `packages/report-designer-renderers/src/report-designer-toolbar.tsx:35-42`, `packages/report-designer-renderers/src/report-designer-inspector.tsx:59-64`
- **严重程度**: P3
- **现状**: 在无 `meta.testid` 时注入默认 DOM 契约。
- **建议**: 统一仅透传 `props.meta.testid`。

## 深挖第4轮追加

### [维度09] `designer-canvas` / `designer-palette` 已 live 注册，但 field metadata 未覆盖实际透传的 `testid/cid`

- **文件**: `packages/flow-designer-renderers/src/index.tsx:96-104`, `packages/flow-designer-renderers/src/designer-page.tsx:54-58,523-528`
- **严重程度**: P3
- **现状**: 注册面只声明 `className`，但 root bridge 还稳定透传 `data-testid` / `data-cid`。
- **建议**: 若这是 authored 面，补充 metadata；否则收敛说明为 meta-only bridge。

### [维度09] `report-toolbar` 的 live field metadata 未覆盖实际命令驱动字段

- **文件**: `packages/report-designer-renderers/src/renderers.tsx:87-90`, `packages/report-designer-renderers/src/report-designer-toolbar.tsx:15-32`
- **严重程度**: P2
- **现状**: `itemsOverride` 承载核心 toolbar 命令/状态结构，但注册契约几乎不可见。
- **建议**: 为 `itemsOverride` 增加结构性 contract。

## 深挖第5轮追加

### [维度09] `key-value` / `array-editor` / `tag-list` / `condition-builder` 的 live field metadata 只保留 `formLabelFieldRule`

- **文件**: `packages/flux-renderers-form-advanced/src/key-value.tsx`, `packages/flux-renderers-form-advanced/src/array-editor.tsx`, `packages/flux-renderers-form-advanced/src/tag-list.tsx`, `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx`
- **严重程度**: P2
- **现状**: live 代码消费 `name/required/addLabel/itemLabel/tags` 等核心输入，但注册面仅保留 label rule。
- **建议**: 补齐关键 prop field metadata。

### [维度09] `input-text` / `textarea` / `checkbox` / `switch` 的 live field metadata 仍显著低估实际输入面

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx:39-57,185-258,374-425`
- **严重程度**: P2
- **现状**: 基础 field renderer 实际消费 `name/required/readOnly/placeholder/rows/option`，注册面却只剩 `formLabelFieldRule`。
- **建议**: 为基础 field renderer 补齐关键 prop field metadata。

## 深挖统计

- 第1轮发现数：4
- 第2轮新增：0
- 第3轮新增：3
- 第4轮新增：2
- 第5轮新增：2

## 维度复核结论

- 初审与深挖共 10 项，独立复核后保留 5 项、降级 1 项、驳回 4 项。
- 最终保留项集中在真正违反 root/meta/field declaration 契约的 live renderer；依赖默认 field rule 的基础 field renderer 不再作为违约项继续上报。

## 子项复核结论

- `[维度09] designer-field 已注册为 live renderer，但未声明显式 field metadata`: 保留。组件实际消费 `label/name/fieldType/options`，而定义层没有 `fields`。
- `[维度09] designer-field 根节点缺少语义 marker，且在 root 上偷偷固化默认布局`: 保留。当前既无稳定根 marker，又在 root fallback 中固化 `grid gap-1.5`。
- `[维度09] report-designer-renderers 用自定义字符串拼接替代 cn() 合并 renderer root className`: 降级。属于明显风格偏差，但对当前 root class 合并语义影响较小。
- `[维度09] code-editor 根节点把 data-cid 直接绑到 node.cid`: 保留。规范要求 DOM root 走归一化的 `props.meta.cid`，直接读 `node.cid` 属于契约漂移。
- `[维度09] report-inspector / report-field-panel / report-inspector-shell 的 live field metadata 与实际消费字段不一致`: 保留。定义层只声明少数字段，但 live 代码还消费多个作者侧 prop。
- `[维度09] report-toolbar / report-inspector 为 data-testid 注入硬编码默认值`: 保留。root `data-testid` 应仅透传 `props.meta.testid`，硬编码默认值会制造额外 DOM 契约。
- `[维度09] designer-canvas / designer-palette 已 live 注册，但 field metadata 未覆盖实际透传的 testid/cid`: 驳回。`testid/cid` 属于全局 `meta` 通道，不是必须写进 renderer `fields` 的 authored prop。
- `[维度09] report-toolbar 的 live field metadata 未覆盖实际命令驱动字段`: 驳回。顶层字段 `itemsOverride` 已在 `fields` 中声明，缺少更细粒度 contract 更像增强项。
- `[维度09] key-value / array-editor / tag-list / condition-builder 的 live field metadata 只保留 formLabelFieldRule`: 驳回。当前基线仍依赖默认 prop 分类承接共享字段，证据不足以定为现行违约。
- `[维度09] input-text / textarea / checkbox / switch 的 live field metadata 仍显著低估实际输入面`: 驳回。现行规范示例本就将这类基础 field renderer 建模为 `fields: [formLabelFieldRule]`。
