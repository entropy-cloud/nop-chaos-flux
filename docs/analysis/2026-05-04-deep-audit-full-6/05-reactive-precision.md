# 维度 05：响应式订阅精度

## 复核状态：3×P2 保留

### 发现

### [维度05] editorRuntime selector 冗余订阅

- **文件**: `packages/word-editor-renderers/src/word-editor-page.tsx:123-138`
- **严重程度**: P2
- **订阅位置**: useSyncExternalStoreWithSelector 拉取 8 字段组合对象
- **实际需要**: isDirty/wordCount 已在行 102-114 独立订阅
- **建议**: 移除与已有独立订阅重复的字段
- **复核状态**: 子项复核通过

### [维度05] selection 订阅无 equalityFn

- **文件**: `packages/word-editor-renderers/src/word-editor-page.tsx:116-121`
- **严重程度**: P2
- **订阅位置**: `(state) => state.selection` 返回对象，默认 Object.is
- **建议**: 添加 shallowEqual 作为 equalityFn
- **复核状态**: 子项复核通过

### [维度05] datasets 订阅无 equalityFn

- **文件**: `packages/word-editor-renderers/src/word-editor-page.tsx:140-145`
- **严重程度**: P2
- **建议**: 添加 shallowEqual 防御
- **复核状态**: 子项复核通过

### 正面观察

- ✅ useScopeSelector 默认接受 equalityFn
- ✅ useCurrentFormState 支持 per-path subscription（P7 要求）
- ✅ CRUD selector 配置了 shallowEqualRecords
