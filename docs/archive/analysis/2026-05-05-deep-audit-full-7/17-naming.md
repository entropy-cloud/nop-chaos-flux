# 维度 17：命名与术语一致性

## 第1轮初审

### [维度17] `flux-code-editor` 公开 source-ref 仍使用 `dataPath`

- **文件**: `packages/flux-code-editor/src/types.ts:87-99,173-178`, `packages/flux-code-editor/src/source-resolvers.ts:13-21,37-52,68-83`
- **严重程度**: P3
- **冲突名称**: `dataPath` vs `path`
- **统一建议**: 公开类型统一为 `path`，必要时仅内部兼容读取旧 `dataPath`。

## 深挖第2轮追加

### [维度17] `word-editor` 快捷键 hook 用 `scopeRef` 指代 DOM ref，和 `ScopeRef` 术语撞名

- **文件**: `packages/word-editor-renderers/src/hooks/use-word-editor-shortcuts.ts:5-12,24-30`, `packages/word-editor-renderers/src/word-editor-page.tsx:52,245`
- **严重程度**: P3
- **冲突名称**: `scopeRef` vs `ScopeRef`
- **统一建议**: DOM 容器引用统一改为 `rootRef` / `containerRef`。

## 深挖第4轮追加

### [维度17] `createFlowDesignerRegistry` 名称仍与实际 `register/extend` 语义不符

- **文件**: `packages/flow-designer-renderers/src/index.tsx:108-113`, `packages/flux-core/src/registry.ts:9-12,52-60`
- **严重程度**: P3
- **冲突名称**: `createFlowDesignerRegistry` vs `register/extend` 语义
- **统一建议**: 对原地注册到现有 registry 的操作统一使用 `register*` 或 `extend*`。

## 深挖统计

- 第1轮发现数：1
- 第2轮新增：1
- 第3轮新增：0
- 第4轮新增：1

## 维度复核结论

- 初审与深挖共 3 项，独立复核后保留 1 项、降级 2 项。
- 仅 `dataPath` vs `path` 的公开双词汇被保留；其余命名更偏局部噪音或轻度语义漂移。

## 子项复核结论

- `[维度17] flux-code-editor 公开 source-ref 仍使用 dataPath`: 保留。它是作者可见的公开类型/解析入口，且与项目已推荐的 canonical `path` 形成双词汇。
- `[维度17] word-editor 快捷键 hook 用 scopeRef 指代 DOM ref，和 ScopeRef 术语撞名`: 降级。命名有噪音，但只存在于包内 hook 与单一调用点，影响面很小。
- `[维度17] createFlowDesignerRegistry 名称仍与实际 register/extend 语义不符`: 降级。函数确实没有“创建”新 registry，但只是轻度语义漂移。
