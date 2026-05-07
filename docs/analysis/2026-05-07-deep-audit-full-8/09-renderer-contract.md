# 维度 09: 渲染器契约合规性

## 深挖轮次

- 第 1 轮: meta/className/testid/cid pass-through, code-editor raw schema fallback, CRUD internal markers。
- 第 2 轮: more meta/testid/cid gaps, raw schema reads, events `void`, direct store access candidates。
- 第 3 轮: table quickEdit/expanded/fragment region handle issues, loop param issue。
- 第 4 轮: readOnly not blocking writes, input-number raw button。
- 第 5 轮: condition-builder raw schema, advanced controls readOnly, input-number meta/cid。

## 维度复核结论

### 保留

- condition-builder picker/raw schema/meta: `condition-builder.tsx:96-106,142,155`。
- multiple form/composite/tree controls missing `props.meta.className/testid/cid`: `input.tsx`, `array-field.tsx`, `object-field.tsx`, `tree-controls.tsx`。
- code-editor raw `props.schema.name` fallback: `code-editor-renderer.tsx:73`。
- readOnly not blocking: `field-presentation.tsx`, `field-handlers.tsx`, form input and advanced controls。
- advanced controls not passing readOnly to field controller: `array-editor.tsx`, `key-value.tsx`, `tag-list.tsx`, `condition-builder.tsx`, `tree-controls.tsx`。
- input-number root missing `meta.className`/`data-cid`: `input.tsx:457-458`。

### 降级

- CRUD internal `nop-crud-*` markers/events/direct store: no direct store found; marker issue kept lower priority.
- variant/array/detail raw schema/meta: variant/raw schema and array/object meta gaps remain; detail-field wrapping weakens claim.
- table/fragment/loop region handle: quickEdit/expanded/fragment remain; loop region handle itself uses `regions.body.render` and is partly驳回。

## 最终保留项

1. Add contract tests for `props.meta` pass-through and `readOnly` write blocking.
2. Remove raw `props.schema` runtime config fallbacks from condition-builder/code-editor/variant/array patterns.
3. Route table/fragment region rendering through `RenderRegionHandle.render` where applicable.
