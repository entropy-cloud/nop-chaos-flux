# 维度 03：API 表面积与契约一致性

## 第 1 轮（初审）

### [维度03-01] `@nop-chaos/flux` 的公开 schema 类型模板把任意对象值错误收窄成必须带 `type` 的 schema node

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-bundle\src\types.ts:3-17`
- **证据片段**:

  ```ts
  export type FluxSchemaValue =
    | string
    | number
    | boolean
    | null
    | FluxSchemaNode
    | FluxSchemaValue[];

  export interface FluxSchemaNode {
    type: string;
    [key: string]: FluxSchemaValue;
  }
  ```

- **严重程度**: P1
- **现状**: `FluxSchemaValue` 递归引用 `FluxSchemaNode`，而 `FluxSchemaNode` 被定义为所有对象值都必须带 `type: string`。
- **风险**: facade 公共类型会把真实 schema 中大量普通对象值，如 `api`、`config`、`headers`、`document`、`params` 等，错误地判成类型非法，直接误导外部 TypeScript 消费者。
- **建议**: 把 facade schema 模板改成允许普通对象值与 renderer node 分离建模，或直接复用主公开契约中的更准确 schema value 类型。
- **为什么值得现在做**: 这已是 plan 253 冻结的 facade published public type template，不修会持续污染宿主侧使用体验。
- **误报排除**: 这不是内部未来设计方向问题；当前错误已进入主公开面，并和 core 真实 schema 契约不一致。
- **历史模式对应**: 对应 facade 公共类型面过度简化导致契约误导的真实 defect。
- **参考文档**: `docs/references/renderer-interfaces.md`、`docs/references/terminology.md`
- **复核状态**: 未复核

### [维度03-02] `@nop-chaos/flux` 的 facade props 和 callback 类型与主公开契约漂移

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\flux-bundle\src\types.ts:71-78`
  - `C:\can\nop\nop-chaos-flux\packages\flux-bundle\src\index.tsx:64-73`
- **证据片段**:
  ```ts
  export interface FluxSchemaRendererProps {
    schemaUrl: string;
    onActionError?: (error: unknown, ctx: unknown) => void;
  }
  ```
- **严重程度**: P1
- **现状**: facade 把 `onActionError` 的上下文类型擦成 `unknown`，并把主公开契约中的可选 `schemaUrl` 收紧为必填。
- **风险**: 宿主只通过 `@nop-chaos/flux` 使用时，会拿到比真实运行时更差且更窄的类型面，隐藏真实能力并制造伪类型错误。
- **建议**: 让 facade props 类型与主公开 renderer/runtime 契约逐项同构，避免自行复制并收窄。
- **为什么值得现在做**: 这是 host-facing facade 的直接公开面问题，会误导外部接入者的编译期认知。
- **误报排除**: 这不是合理 facade 定制；当前收窄与运行时真实支持能力不一致。
- **历史模式对应**: 对应 facade callback/props 类型漂移的公开契约缺陷。
- **参考文档**: `docs/references/renderer-interfaces.md`、`docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

## 检查范围

- 已逐个读取 `packages/*/src/index.ts(x)` 共 25 个包，并对照各自 `package.json` 的 `exports` map。
- 额外抽查：`@nop-chaos/flux-react/unstable`、`@nop-chaos/flow-designer-renderers/unstable`、`@nop-chaos/ui/chart`、`@nop-chaos/flux-renderers-form/definitions`。

## 维度复核结论

- [维度03-01]：降级后经子项复核驳回。最新 live code 已把 `FluxSchemaValue` 对齐 core `SchemaValue`。
- [维度03-02]：降级为 P2。仅 `onActionError` 上下文被擦成 `unknown` 成立；`schemaUrl` 必填指控不成立。

## 子项复核结论

- [维度03-01]：驳回。当前不存在“任意对象值必须带 type”的 facade live defect。

## 最终保留项

| 编号 | 严重程度 | 文件 | 一句话摘要                   |
| ---- | -------- | ---- | ---------------------------- |
| 无   | -        | -    | 本维度无通过独立复核的保留项 |
