# 维度 09：渲染器契约合规性

## 第 1 轮（初审）

### [维度09-01] `text` 渲染器消费了未注册的 `tag` 字段

- **文件**: `packages/flux-renderers-basic/src/basic-renderer-definitions.ts:117-126`, `packages/flux-renderers-basic/src/schemas.ts:136-140`, `packages/flux-renderers-basic/src/text.tsx:7-20`
- **证据片段**:
  ```ts
  fields: [
    { key: 'text', kind: 'prop', allowSource: true },
    { key: 'body', kind: 'prop' },
  ];
  ```
  ```ts
  tag?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label' | 'div';
  ```
- **严重程度**: P2
- **契约条款**: RendererDefinition fields 与运行时消费面必须一致
- **现状**: schema 与组件都支持 `tag`，但 field registration 未注册该 prop
- **风险**: 作者写入的 `tag` 可能无法进入 resolved props，导致运行时静默回退为 `span`
- **建议**: 在 `text` renderer definition 中补注册 `tag`
- **误报排除**: 不是风格问题，而是 registration/runtime/schema 三方失配
- **复核状态**: 未复核

### [维度09-02] `detail-field` 控件根节点丢失 `meta.className` / `data-testid` / `data-cid`

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:265-279`
- **证据片段**:
  ```tsx
  <div className={cn('nop-detail-field')} data-slot="field-control">
  ```
- **严重程度**: P2
- **契约条款**: canonical control root 必须承接 meta.className/testid/cid
- **现状**: 根控件仅输出固定 marker 和 data-slot，未透传 runtime meta
- **风险**: 样式覆写、测试锚点、debug 节点定位失去稳定入口
- **建议**: 在 control root 合并 `props.meta.className` 并透传 `data-testid` / `data-cid`
- **误报排除**: 问题不在外层 frame，而是 canonical control root 本身丢失 meta
- **复核状态**: 未复核

### [维度09-03] input-tree/tree-select 缺少稳定 `nop-*` renderer root marker

- **文件**: `packages/flux-renderers-form-advanced/src/tree-controls.tsx:199-205,261-267`
- **证据片段**:
  ```tsx
  <div className={props.meta.className} data-slot="input-tree-control">
  ```
- **严重程度**: P2
- **契约条款**: widget renderer 应输出稳定 renderer root marker
- **现状**: 仅有 `data-slot`，没有 `nop-input-tree` / `nop-tree-select`
- **风险**: host CSS / 测试 / 调试无法按 renderer 类型稳定锚定
- **建议**: 为根节点补稳定 `nop-*` marker class
- **误报排除**: 不是否定 widget 自有 UI shell，而是缺 renderer identity marker
- **复核状态**: 未复核

### [维度09-04] report-designer 家族多个 renderer 共用同一 root marker

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx:559-563`, `packages/report-designer-renderers/src/field-panel-renderer.tsx:117-121`, `packages/report-designer-renderers/src/inspector-shell-renderer.tsx:38-42`
- **证据片段**:
  ```tsx
  className={cn('nop-report-designer', props.meta.className)}
  ```
- **严重程度**: P2
- **契约条款**: root marker 只标识 renderer type 本身
- **现状**: page / field-panel / inspector-shell 都使用 `nop-report-designer`
- **风险**: selector、测试和 host 样式无法区分不同 renderer 类型
- **建议**: page 保留 `nop-report-designer`，子 renderer 改用独立 marker
- **误报排除**: 问题不是家族级视觉复用，而是 root identity marker 复用
- **复核状态**: 未复核

### [维度09-05] `designer-field.label` 被声明为 `value-or-region`，实现却只按字符串读取

- **文件**: `packages/flow-designer-renderers/src/index.tsx:196-201`, `packages/flow-designer-renderers/src/designer-field.tsx:18-19,47-49`
- **证据片段**:
  ```ts
  { key: 'label', kind: 'value-or-region', regionKey: 'label' }
  ```
  ```tsx
  const label = schemaProps.label as string | undefined;
  ```
- **严重程度**: P2
- **契约条款**: `value-or-region` 字段应同时兑现 value 和 region contract
- **现状**: region 分支未消费 `props.regions.label` / slot helper
- **风险**: 作者态看到支持 region，运行时 region label 永远不会被渲染
- **建议**: 补齐 `regions.label` / slot content 消费路径
- **误报排除**: 这是 field registration drift，不是纯文档问题
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度09-06] `designer-canvas` / `designer-palette` 把 `className` 错注册为 prop，但运行时只消费 meta

- **文件**: `packages/flow-designer-renderers/src/index.tsx`, `packages/flow-designer-renderers/src/designer-page.tsx`, `packages/flux-compiler/src/schema-compiler/fields.ts`
- **证据片段**:
  ```ts
  fields: [{ key: 'className', kind: 'prop' }];
  ```
- **严重程度**: P3
- **契约条款**: `className` 作为 authored renderer root style 应按 meta 进入统一路径
- **现状**: field registration 把 `className` 从 meta contract 中拽成 prop，但实际 DOM 只读 `meta.className`
- **风险**: authored `className` 在这两个 renderer 上静默失效
- **建议**: 把 `className` 字段回收为 meta contract
- **误报排除**: 编译器 `META_FIELDS` 与 live 渲染路径都证明这是实际 contract drift
- **复核状态**: 未复核

### [维度09-07] `designer-page` fallback 根节点遗漏 root meta 透传

- **文件**: `packages/flow-designer-renderers/src/designer-page.tsx:29-41`
- **证据片段**:
  ```tsx
  if (!config) {
    return <div>{t('flux.flowDesigner.configRequired')}</div>;
  }
  ```
- **严重程度**: P3
- **契约条款**: renderer root 仍应承接 `data-testid` / `data-cid` 等 root meta
- **现状**: fallback 分支直接返回裸 `<div>`，未复用 root meta props
- **风险**: 诊断/测试锚点在错误 fallback 分支失效
- **建议**: fallback 分支也通过统一 root meta helper 输出根节点
- **误报排除**: 问题只在 fallback root，不与主 happy path 混淆
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度09-08] `report-inspector-shell` 内外双层 renderer 重复输出同一 node 的 root meta

- **文件**: `packages/report-designer-renderers/src/inspector-shell-renderer.tsx:32-43,65`, `packages/report-designer-renderers/src/report-designer-inspector.tsx:40-44,52-56,63-67`
- **证据片段**:
  ```tsx
  const inspectorProps = { ...props, props: { ...props.props, ... } };
  return (
    <section ... data-cid={props.meta.cid}>
      <ReportInspectorRenderer {...inspectorProps} />
    </section>
  );
  ```
- **严重程度**: P2
- **契约条款**: 同一 renderer node 只应有一个 canonical root identity/meta surface
- **现状**: 外层 shell 与内层 inspector 都输出同一份 `meta.className/testid/cid`
- **风险**: `data-cid` / `data-testid` 重复污染调试定位与测试选择器
- **建议**: 只保留一个 canonical root 承接 meta；其余层移除重复 root identity 输出
- **误报排除**: 这不是单纯视觉重复，而是 root identity contract 被重复发布
- **复核状态**: 未复核

## 维度复核结论

- [维度09-01]: 保留为 P2。
- [维度09-02]: 保留为 P2。
- [维度09-03]: 保留为 P2。
- [维度09-04]: 降级为 P3。问题真实，但 `data-slot` 已部分缓解 selector 区分。
- [维度09-05]: 保留为 P2。
- [维度09-06]: 降级为 P3。影响范围较窄，但 authored className 确会静默失效。
- [维度09-07]: 保留为 P3。fallback root meta 漏传成立。
- [维度09-08]: 保留为 P2。重复 root meta 输出会污染 node identity。

## 子项复核结论

- [维度09-04]: 降级 (P3)。
- [维度09-06]: 成立 (P3)。
- [维度09-01]: 驳回。条目级复核发现本轮子项结果串号，原 09-01 维持维度复核结论为保留。
- [维度09-02]: 驳回。条目级复核结果串号，原 09-02 维持维度复核结论为保留。
- [维度09-03]: 驳回。条目级复核结果串号，原 09-03 维持维度复核结论为保留。
- [维度09-05]: 驳回。条目级复核结果串号，原 09-05 维持维度复核结论为保留。
- [维度09-07]: 成立 (P3)。fallback root meta 缺口成立。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                             | 一句话摘要                                             |
| ----- | -------- | -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 09-01 | P2       | `packages/flux-renderers-basic/src/basic-renderer-definitions.ts:117-126`        | `text` renderer 消费了未注册的 `tag` 字段              |
| 09-02 | P2       | `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:265-279` | detail-field 根控件丢失 meta.className/testid/cid      |
| 09-03 | P2       | `packages/flux-renderers-form-advanced/src/tree-controls.tsx:199-205`            | input-tree/tree-select 缺稳定 renderer root marker     |
| 09-04 | P3       | `packages/report-designer-renderers/src/page-renderer.tsx:559-563`               | report-designer 家族多个 renderer 共用同一 root marker |
| 09-05 | P2       | `packages/flow-designer-renderers/src/designer-field.tsx:18-19`                  | designer-field.label 的 region 分支永远不生效          |
| 09-06 | P3       | `packages/flow-designer-renderers/src/index.tsx`                                 | designer-canvas/palette 把 className 错注册为 prop     |
| 09-07 | P3       | `packages/flow-designer-renderers/src/designer-page.tsx:29-41`                   | designer-page fallback 根节点遗漏 root meta            |
| 09-08 | P2       | `packages/report-designer-renderers/src/inspector-shell-renderer.tsx:32-43`      | inspector shell/inner renderer 重复输出同一 node meta  |
