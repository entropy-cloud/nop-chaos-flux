# 维度 05：响应式订阅精度

## 第 1 轮（初审）

## 零发现结论

本轮已先消费主 agent 提供的 suspect 基线，并逐项回到 live code / owner docs 复核。未发现新的、值得作为第 1 轮初审发现上报的响应式订阅精度问题。

### 关键文件 / 候选与排除理由

- `packages/flux-react/src/render-nodes.tsx:315-346`
  - 候选：`reactive-render-read`，`const currentOwnSnapshot = nextEntry.scope.readOwn();`
  - 复核：读取发生在 `useLayoutEffect` 内，用于 fragment scope commit-phase reconciliation；不是 render-phase reactive read，也不是未订阅的渲染依赖读取。
  - 排除理由：符合 `renderer-runtime.md` 中“runtime-owned React boundaries commit-safe”的边界；上一轮也已明确排除该类 scanner false-positive。
- `packages/report-designer-renderers/src/page-renderer.test-support.tsx:51-73`
  - 候选：3 个 `broad-scope-selector`，未传 explicit `paths`。
  - 复核：均为测试 support probe renderer，selector 返回标量或单个对象引用：`runtime?.dirty`、`selectionTarget?.kind`、`reportStatus`；不在产品主渲染热路径。
  - 排除理由：可作为测试工具改进项加 `paths`，但当前缺少真实热路径、过宽订阅或用户可见性能风险证据，不作为维度 05 缺陷。
- `packages/flux-renderers-basic/src/scope-debug.tsx`
  - 复核：上一轮保留过“全 scope 序列化订阅”。live code 当前已收敛为默认折叠不订阅，展开后才订阅；并支持 `dataPaths` 传给 `useScopeSelector(..., { paths })`。
  - 排除理由：旧问题已不按原形态存在；剩余行为属于显式 opt-in debug renderer 的展开态功能，不作为新的第 1 轮发现重复上报。
- `packages/flux-react/src/hooks.ts` / `packages/flux-react/src/hook-subscriptions.ts`
  - 复核：`useScopeSelector` 支持 `paths` 并通过 `createScopeSubscribe` 按 `ScopeChange.paths` 过滤；`useOwnScopeSelector` 只订阅 own snapshot identity。
  - 排除理由：未见 `getSnapshot` 每次构造新对象导致订阅循环或 selector 必然失稳的问题。
- `packages/flux-react/src/hooks/use-form-hooks.ts`
  - 复核：form/path hooks 使用 `subscribeToPath` / `subscribeToPaths`；field-state hooks 走 `createFormFieldStateSubscribe`，满足 P7 per-path subscription 要求。
  - 排除理由：未见 FieldFrame 旧式全 `form.values` 广播订阅模式。
- `packages/flux-react/src/node-renderer.tsx`
  - 复核：`useSyncExternalStore` 用于 import frame commit 后发布，snapshot 返回 ref/current frame；不是每次 snapshot 新对象。
  - 排除理由：未发现 NodeRenderer 强制父级随子级重渲染的订阅精度缺陷。
- 其他抽样路径：`packages/flux-renderers-data/src/crud-renderer-state.ts`、`packages/flux-renderers-data/src/table-renderer/use-table-*.ts`、`packages/flux-renderers-form/src/field-utils/field-handlers.tsx`、`packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts` 均已使用 path-aware `useScopeSelector` / `useCurrentFormState`，对象/数组 selector 配有自定义 equality，未作为问题上报。

## suspect 复核表

| suspect                | 位置                                                                       | 复核结论 | 理由                                                                    |
| ---------------------- | -------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------- |
| `reactive-render-read` | `packages/flux-react/src/render-nodes.tsx:340`                             | 排除     | `useLayoutEffect` commit-phase scope diff，不是 render-phase 响应式读取 |
| `broad-scope-selector` | `packages/report-designer-renderers/src/page-renderer.test-support.tsx:52` | 排除     | 测试 probe；读取 `runtime.dirty` 标量，非产品热路径                     |
| `broad-scope-selector` | `packages/report-designer-renderers/src/page-renderer.test-support.tsx:62` | 排除     | 测试 probe；读取 `selectionTarget.kind` 标量，非产品热路径              |
| `broad-scope-selector` | `packages/report-designer-renderers/src/page-renderer.test-support.tsx:72` | 排除     | 测试 probe；读取 `reportStatus` 引用，缺少真实重渲染风险证据            |

## 检查范围

- 自动化候选：`pnpm check:audit-reactive-render-reads` / `pnpm check:audit-suspects` 提供的 4 个候选。
- 手工抽查：`useScopeSelector` 与 path-aware 使用点、`useSyncExternalStore` snapshot 返回形态、form/path hooks 的 `subscribeToPath` / `subscribeToPaths`、`NodeRenderer` / `RenderNodes`、对象/数组 selector 是否有 equality 稳定性保护、旧 scope-debug retained finding 是否仍存在。

## 总结评估

本轮候选主要是 scanner noise 或测试 support probe。当前主路径已基本遵守 owner docs 中的响应式订阅要求：字段状态走 per-path form subscription，scope selector 支持 paths，NodeRenderer/RenderNodes 的 suspect 不构成 render-phase 未订阅读取。

## 建议第 2 轮深挖方向

未发现新的高价值问题。若仍需第 2 轮，可只做窄范围确认：

- 继续抽查 designer/report/word host projection 的 snapshot identity 是否稳定。
- 检查测试 support probe 是否值得低优先级补 `paths`，但不建议作为缺陷推进。
- 复核 `scope-debug` 展开态在大 scope 下是否需要文档化为显式调试成本，而不是再报旧问题。

## 维度复核结论

- 零发现复核：未发现需报告问题。（抽查范围包括 `renderer-runtime.md` / `flux-runtime-module-boundaries.md` / `form-validation.md` owner docs，以及 `useScopeSelector` / form hooks / `NodeRenderer` / `RenderNodes` / `scope-debug` / report test probes / data-table CRUD hooks / code-editor binding 等 live code 响应式订阅路径。）

## 子项复核建议

无。

## 最终保留项

无最终保留项。
