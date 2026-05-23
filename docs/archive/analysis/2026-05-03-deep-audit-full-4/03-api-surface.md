# 维度03 API 表面积与契约一致性

- 初审发现数: 4
- 复核结果: 保留 1 / 降级 3 / 驳回 0

### [维度03] `flux-react` 根入口公开了过多内部编排面

- **文件**: `packages/flux-react/src/index.tsx:11-12,49`
- **证据片段**:

```ts
export { mergeActionContext, createHelpers, EMPTY_SCOPE_DATA, RenderNodes } from './helpers';
export { rendererHooks } ...
```

- **严重程度**: P2
- **现状**: 根入口公开 `RenderNodes`、`createHelpers`、raw contexts 等低层编排对象。
- **风险**: provider 拓扑和渲染编排细节会被外部依赖，难以调整 React 运行时内部结构。
- **建议**: 将这些对象迁到 `internal`/`unstable` 子路径，根入口只保留稳定 hooks/context surface。
- **为什么值得现在做**: live consumer 已存在，再晚会进一步放大 semver 包袱。
- **误报排除**: 不是在否定 `useRendererRuntime()` 这类稳定公开 API。
- **历史模式对应**: internal orchestration leakage。
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/references/renderer-interfaces.md`
- **复核状态**: `维度复核通过`

## 已降级

- `flux-react` 继续作为 `flux-runtime` facade: 有边界噪音，但已有一定上层统一导入意图，降为 P3。
- `flux-core` 公开 `isReportedImportError` / `markImportErrorReported`: 哨兵 helper 暴露不必要，但 live 外部消费极少，降为 P3。
- `flux-code-editor` 公开 `codeEditorFieldRules`: 属于不必要的 compiler metadata 暴露，降为 P3。
