# 维度17 命名与术语一致性

- 初审发现数: 2
- 复核结果: 保留 1 / 降级 1 / 驳回 0

### [维度17] `createFlowDesignerRegistry` 名称与实际行为不符

- **文件**: `packages/flow-designer-renderers/src/index.tsx:130-135`, `packages/flux-core/src/registry.ts:9-12`
- **证据片段**:

```ts
export function createFlowDesignerRegistry(baseRegistry: RendererRegistry) {
  registerFlowDesignerRenderers(baseRegistry);
  return baseRegistry;
}
```

- **严重程度**: P3
- **冲突名称**: `createFlowDesignerRegistry` vs `register/extend` 语义
- **冲突位置**: live helper 会 mutate 传入 registry，但名称暗示创建新实例；文档还把它写成无参 creator。
- **统一建议**: 改名为 `extendFlowDesignerRegistry` / `withFlowDesignerRenderers`，或只保留 `registerFlowDesignerRenderers`。
- **为什么值得现在做**: 可直接消除对象所有权与副作用认知错误。
- **误报排除**: 不是在否定 `createRendererRegistry`；真正 create 的 helper 命名是自洽的。
- **历史模式对应**: create\* prefix on mutating helper。
- **参考文档**: `docs/architecture/flow-designer/design.md`, `docs/architecture/flow-designer/api.md`
- **复核状态**: `维度复核通过`

### [维度17] report-designer 的 `selectionTarget` 词汇已收敛，但文档/测试仍传播旧 alias 认知

- **文件**: `packages/report-designer-renderers/src/renderers.integration.test.tsx:382`, `docs/architecture/report-designer/design.md:405-406`, `docs/components/report-designer-page/design.md:85-90`
- **严重程度**: P3
- **冲突名称**: `selectionTarget` vs `selection` / `target`
- **冲突位置**: live host scope 基本已只发布 `selectionTarget`，但文档和测试标题仍把旧 alias 当成有效术语。
- **统一建议**: 文档与测试统一收口到 `selectionTarget`，删除旧 alias 叙述。
- **为什么值得现在做**: 可避免过时结论在后续审计中反复复活。
- **误报排除**: 这不是说 live runtime 仍三套并存；当前问题主要在认知层而非运行时层。
- **历史模式对应**: terminology lag after canonical rename。
- **参考文档**: `docs/references/terminology.md`
- **复核状态**: `已降级`
