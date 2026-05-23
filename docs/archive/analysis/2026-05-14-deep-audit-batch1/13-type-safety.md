# 维度 13：类型安全与动态边界

## 第 1 轮（初审）

### [维度13-01] `flux-bundle` 公共 facade 把任意对象值错误收窄为必须带 `type`

- **文件**: `packages/flux-bundle/src/types.ts:3-17`, `packages/flux-bundle/types/public-types.d.ts:3-17`, `packages/flux-core/src/types/schema.ts:10-16`
- **证据片段**:

  ```ts
  export type FluxSchemaValue =
    | string
    | number
    | boolean
    | null
    | undefined
    | FluxSchemaNode
    | FluxSchemaValue[];

  export interface FluxSchemaNode {
    type: string;
    [key: string]: FluxSchemaValue;
  }
  ```

- **严重程度**: P2
- **契约条款**: public bundle types 应与 core 的值层语义对齐；只有根 schema node 需要 `type`，普通对象值不应被伪装成 renderer node。
- **现状**: `flux-bundle` 用 `FluxSchemaNode` 同时表示根 schema node 与所有对象值；结果 `FluxSchemaValue` 中任何 object 都被要求带 `type: string`。
- **风险**: 外部消费者在 `data`、`args`、`headers`、普通配置对象等场景下都会被迫写假 `type` 或大量 `as any`。
- **建议**: 将 `FluxSchemaValue` 对齐到 core 的 `SchemaValue/SchemaObject` 结构；把必须有 `type` 的根节点单独保留给 `FluxSchema`。
- **误报排除**: 不是要求放松根 schema 的类型约束；问题在于 value-level object 被错误等同为 renderer node。
- **复核状态**: 未复核

### [维度13-02] `FluxApiRequestContext` 公共类型遗漏 `scope` / `env`，与 runtime 实际 fetcher 上下文失配

- **文件**: `packages/flux-bundle/src/types.ts:26-31,41-45`, `packages/flux-bundle/types/public-types.d.ts:26-31,41-45`, `packages/flux-core/src/types/renderer-api.ts:5-24`
- **证据片段**:
  ```ts
  export interface FluxApiRequestContext {
    signal?: AbortSignal;
    interactionId?: string;
    requestInstanceId?: string;
    [key: string]: unknown;
  }
  ```
  ```ts
  export interface ApiRequestContext {
    scope: ScopeRef;
    env: RendererEnv;
    signal?: AbortSignal;
    interactionId?: string;
    requestInstanceId?: string;
  }
  ```
- **严重程度**: P2
- **契约条款**: public facade 的 `fetcher` 上下文类型应覆盖 runtime 实际提供的稳定字段，尤其是 host 常依赖的 `scope` / `env`。
- **现状**: `flux-bundle` 把 request context 收窄成 signal / interactionId / requestInstanceId，并用索引签名含糊兜底；但 core runtime 的正式类型明确要求 `scope` 和 `env`。
- **风险**: facade 使用者在实现 fetcher、审计日志、scope-aware 鉴权、tenant 注入、请求去重等逻辑时拿不到正确静态类型。
- **建议**: 直接复用或镜像 `ApiRequestContext` 的真实字段，至少把 `scope` / `env` 纳入公共类型，而不是依赖 `[key: string]: unknown` 模糊兜底。
- **误报排除**: 不是要求 bundle 暴露全部 runtime 内部细节；`scope` / `env` 已是 core fetcher 契约的一部分。
- **复核状态**: 未复核

### [维度13-03] `FluxSchemaRendererProps.onActionError` 把 `ctx` 擦成 `unknown`，丢失 `ActionContext` 公共类型

- **文件**: `packages/flux-bundle/src/types.ts:71-78`, `packages/flux-bundle/types/public-types.d.ts:71-78`, `packages/flux-runtime/src/runtime-factory.ts:84-95`, `packages/flux-action-core/src/action-dispatcher/types.ts:12-18,27-33`
- **证据片段**:
  ```ts
  export interface FluxSchemaRendererProps {
    ...
    onActionError?: (error: unknown, ctx: unknown) => void;
  }
  ```
  ```ts
  export function createRendererRuntime(input: {
    ...
    onActionError?: (error: unknown, ctx: ActionContext) => void;
  }): RendererRuntime
  ```
- **严重程度**: P3
- **契约条款**: public renderer facade 暴露的错误回调应保留 stable `ActionContext` 类型，而不是把核心诊断上下文降级成 `unknown`。
- **现状**: runtime 和 action dispatcher 都把 `onActionError` 明确定义为 `(error, ctx: ActionContext)`，但 `flux-bundle` facade 公开给外部的却是 `ctx: unknown`。
- **风险**: 宿主无法安全读取 action type、node/path、interaction metadata 等上下文，只能自行断言或放弃 typed diagnostics。
- **建议**: 在 `flux-bundle` 中公开 `ActionContext` 的等价类型，或直接复用正式类型，保持 public facade 与 runtime contract 一致。
- **误报排除**: 不是追求内部类型全量外露；这里讨论的是已经被 public prop 暴露出来的 callback 参数。
- **复核状态**: 未复核

## 维度复核结论

- [维度13-01]: 保留为 P2。
- [维度13-02]: 保留为 P2。
- [维度13-03]: 保留为 P3。

## 子项复核结论

- 无需额外子项复核。

## 最终保留项

| 编号  | 严重程度 | 文件                                      | 一句话摘要                                                                          |
| ----- | -------- | ----------------------------------------- | ----------------------------------------------------------------------------------- |
| 13-01 | P2       | `packages/flux-bundle/src/types.ts:3-17`  | `flux-bundle` 公共 facade 把任意对象值错误收窄为必须带 `type`                       |
| 13-02 | P2       | `packages/flux-bundle/src/types.ts:26-31` | `FluxApiRequestContext` 公共类型遗漏 `scope` / `env`，与 runtime fetcher 上下文失配 |
| 13-03 | P3       | `packages/flux-bundle/src/types.ts:71-78` | `onActionError` 在公共 facade 中把 `ActionContext` 擦成了 `unknown`                 |
