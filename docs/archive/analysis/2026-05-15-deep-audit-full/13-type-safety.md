# 维度 13：类型安全与动态边界

## 第 1 轮（初审）

### [维度13-01] `normalizeNodeInput()` 在数组判定失败后仍强行断言为 `TemplateNode[]`，会把坏数据直接推进渲染主路径

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\flux-react\src\render-nodes.tsx:150-165`
  - `C:\can\nop\nop-chaos-flux\packages\flux-react\src\render-nodes.tsx:410-418`
- **证据片段**:
  ```ts
  if (Array.isArray(input)) {
    if (input.every(isTemplateNode)) return input;
    if (isSchemaArray(input)) return compileNodes(input);
    return input as TemplateNode[];
  }
  ```
- **严重程度**: P1
- **分类**: 危险
- **现状**: 在数组分支里，若输入既不是 `TemplateNode[]`，也不是 `SchemaInput`，代码仍直接 `return input as TemplateNode[]`。
- **真实风险**: 任意坏数组会被伪装成已编译节点数组送入 `NodeRenderer`，后续按 `node.id`、`node.component`、`node.regions` 等契约消费，存在真实渲染期崩溃或错误分支执行风险。
- **建议**: 判定失败时返回 `null` 或诊断错误，不要用断言吞掉非法输入；若要支持混合可渲染数组，应显式扩展 `RenderNodeInput` 契约并逐项归一化。
- **为什么值得现在做**: 这里已经有两层守卫，判定失败后再强行断言说明是明确的类型逃逸口，不是合理动态边界。
- **误报排除**: 这不是在抱怨低代码输入天然动态；问题在于代码已尝试校验，却在失败后仍把不合法数据当合法处理。
- **历史模式对应**: 对应 dynamic boundary 校验失败后被 unsafe cast 强行穿透的真实缺陷。
- **参考文档**: `AGENTS.md`、`docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

## 检查范围

- 重点人工审阅：`packages/flux-react/src`、`packages/flux-runtime/src`、`packages/flux-core/src`
- 外围公开面抽查：`packages/report-designer-renderers/src`
- 检查模式：`any`、`as any`、`as unknown as`、`@ts-ignore/@ts-expect-error`、公开导出面中的可收紧类型

## 初审排除项

- 低代码动态边界、注册表 existential 擦除、Host 注入、公式系统、多态 Action 结构本身未机械上报。
- 本轮在核心范围内未发现需报告的 `@ts-ignore/@ts-expect-error` 条目。

## 维度复核结论

- [维度13-01]：降级为 P2。unsafe cast 兜底存在，但当前公开主路径已有前置守卫，现阶段不足以认定为 P1 级现网缺陷。

## 最终保留项

| 编号 | 严重程度 | 文件 | 一句话摘要                   |
| ---- | -------- | ---- | ---------------------------- |
| 无   | -        | -    | 本维度无通过独立复核的保留项 |
