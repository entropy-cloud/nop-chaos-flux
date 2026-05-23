# 维度 13：类型安全与动态边界

## 第 1 轮（初审）

### [维度13-01] `flux-bundle` 的公开 renderer API 把真实 contract 擦除成 variadic `any`

- **文件**: `packages/flux-bundle/src/types.ts:42-47`
- **证据片段**:
  ```ts
  export interface FluxRendererDefinition {
    type: string;
    component?: (...args: any[]) => unknown;
    reactComponent?: (...args: any[]) => unknown;
    [key: string]: unknown;
  }
  ```
- **严重程度**: P1
- **现状**: facade 对 bundle 消费者暴露了过宽的 renderer 签名。
- **风险**: 外部注册 renderer 时缺少最基本的 props 结构保护，容易类型通过、运行时失败。
- **建议**: 暴露与 core/react renderer 契约对齐的公开 alias，而不是 `(...args: any[]) => unknown`。
- **为什么值得现在做**: 这是直接影响 bundle 消费者 authoring 体验与安全性的公开类型问题。
- **误报排除**: 不属于低代码动态边界；这是稳定 authoring API，不是动态 schema/host payload。
- **历史模式对应**: public API type erasure.
- **参考文档**: `docs/skills/deep-audit-prompts.md`
- **复核状态**: 未复核

### [维度13-02] `render-nodes.tsx` 在 array shape 检查失败后仍把输入强转成 `TemplateNode[]`

- **文件**: `packages/flux-react/src/render-nodes.tsx:150-165`
- **证据片段**:
  ```ts
  if (Array.isArray(input)) {
    if (input.every((item) => isTemplateNode(item))) {
      return input as TemplateNode[];
    }
    if (isSchemaArray(input)) {
      const compiled = runtime.schemaCompiler.compile(input, strictOptions);
      return extractTemplateNodes(compiled);
    }
    return input as TemplateNode[];
  }
  ```
- **严重程度**: P2
- **现状**: defensive validation 已失败，但函数仍用 type escape 放行。
- **风险**: 异常输入会被延迟到更深的 render 路径才炸出更难诊断的错误。
- **建议**: 改成 diagnostics + null/fail-fast，而不是 fallback cast。
- **为什么值得现在做**: 这属于真实类型防线被显式绕过。
- **误报排除**: 复核已降级为 defensive gap，而非高概率主路径 bug。
- **历史模式对应**: invalid input fallback cast。
- **参考文档**: `docs/references/renderer-interfaces.md`
- **复核状态**: 未复核

### [维度13-03] `use-word-editor-save.ts` 用 `as any` 压过 `ActionContext` 要求

- **文件**: `packages/word-editor-renderers/src/hooks/use-word-editor-save.ts:35`
- **证据片段**:
  ```ts
  const result = await actionProvider.invoke('save', undefined, {
    signal: controller.signal,
  } as any);
  ```
- **严重程度**: P2
- **现状**: 调用方以 `as any` 方式传入不完整 `ActionContext`。
- **风险**: 如果 provider 将来开始读取更多上下文字段，这条调用点会变成隐形炸点。
- **建议**: 把接口收敛到 `Partial<ActionContext>` 或构造真实上下文对象。
- **为什么值得现在做**: 当前实现虽然暂未炸，但 contract 已被显式压过。
- **误报排除**: 复核已降级，不把它当成当前强缺陷；问题属于类型卫生与 future-proofing。
- **历史模式对应**: local `as any` over interface boundary。
- **参考文档**: `docs/skills/deep-audit-prompts.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度13-01]：保留 (P1)。公开 facade 类型擦除成 variadic `any` 的问题成立。
- [维度13-02]：降级为 P2。属于 defensive validation gap。
- [维度13-03]：降级为 P2。当前更像接口卫生问题而非已证明的 live defect。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                  | 一句话摘要                                                     |
| ----- | -------- | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| 13-01 | P1       | `packages/flux-bundle/src/types.ts:42-47`                             | bundle 公开 renderer API 把真实 contract 擦除成 variadic `any` |
| 13-02 | P2       | `packages/flux-react/src/render-nodes.tsx:150-165`                    | array shape 检查失败后仍强转成 `TemplateNode[]`                |
| 13-03 | P2       | `packages/word-editor-renderers/src/hooks/use-word-editor-save.ts:35` | `use-word-editor-save` 用 `as any` 压过 `ActionContext`        |
