# 09 渲染器契约合规性

- 初审发现数: 5
- 维度复核: 完成
- 子项复核: 3
- 最终结果: 保留 1 / 降级 1 / 驳回 3

## 保留

### [维度09] `frameWrap:none` 下多类 wrapped field renderer 丢失根级 `meta`

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`, `packages/flux-react/src/node-frame-wrapper.tsx`, `packages/flux-react/src/field-frame.tsx`
- **证据片段**:
  ```tsx
  if (frameWrapMode === 'none') {
    return <>{props.children}</>;
  }
  ```
  ```tsx
  <Input type={inputType} name={name || undefined} value={inputValue} />
  ```
- **严重程度**: P1
- **契约条款**: 支持 `wrap: true` 的 renderer 在 `frameWrap:none` 下仍应保留 `meta.className/testid/cid` 的根级透传。
- **现状**: `NodeFrameWrapper` 跳过 `FieldFrame` 后，输入族和 `detail-field` 没有自行完整接住根级 `meta`。`input-text/input-email/input-password/textarea` 会同时丢 `className/testid/cid`；`select/checkbox/switch/radio-group/checkbox-group` 仍会丢 `testid/cid`。
- **建议**: 为这些 renderer 在 `frameWrap:none` 分支提供稳定根元素并透传 `meta.*`，或显式禁止该分支。
- **为什么值得现在做**: 这是 live renderer contract 缺口，已经影响测试锚点、调试锚点和 consumer `className` 落点。
- **误报排除**: 子项复核用 `variant-field` 的正向实现做了对照，确认 `frameWrap:none` 不是天然可以放弃根级契约的例外。
- **历史模式对应**: wrapper-owned meta 被默认壳层吞掉，关闭壳层后 renderer 自身没补上。
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: 子项复核通过

## 已降级

- 多个高级字段 renderer 与 `FieldFrame` 重复写入 `data-cid/data-testid`: **已降级**
  - 复核确认 `tag-list`、`array-editor`、`key-value`、`array-field`、`object-field`、`input-tree/tree-select` 等存在重复写入，但目前更像冗余与契约不够干净，不如 `frameWrap:none` 缺口那样直接造成功能断裂。

## 已驳回

- `detail-field` 丢失根级 meta: **并入上方保留项，不单独重复统计**
- `fieldset.collapsed` 镜像 resolved prop: **已驳回**
  - 复核确认它与 `docs/components/fieldset/design.md` 中“初始折叠态 + 本地 UI 状态”的设计一致。
- 输入族 wrapper marker/className 层级漂移: **已驳回为独立问题**
  - 复核只保留了其中与 `frameWrap:none` 直接相关的 root/meta 契约缺口。
