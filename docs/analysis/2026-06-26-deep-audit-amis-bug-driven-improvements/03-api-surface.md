# 维度 03：API 表面积与契约一致性

## 第 1 轮（初审）

### [维度03-01] crud-renderer 运行期读 props.schema.item/card（compile-once 违约）

- **文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:449-476`
- **证据片段**:
  ```ts
  449: const rawSchema = props.schema;
  460: item: rawSchema.item,
  469: card: rawSchema.card,
  476: ? props.helpers.render(carrierSchema, { scope: crudScope, pathSuffix: listMode })
  ```
- **严重程度**: P1
- **现状**: CRUD list/cards carrier 每渲染从 `props.schema`（原始 schema 节点）读 `item`/`card` 子 schema，拼成 carrier schema 后 `helpers.render()` 触发再编译，违反 compile-once。同包 dynamic-renderer 已示范正确路径。
- **风险**: 每次分页/选择变化重编译；靠 React Compiler memoize + keyed-remount workaround 掩盖；移除即回归。`runtime-raw-schema-read` suspect 标 high。
- **建议**: 把 item/card 声明为 region，运行期用 `props.regions.item.render(...)` 消费，删 carrier 重编译与 remount workaround。
- **误报排除**: 非 type annotation/normalize/注释——`rawSchema.item/card` 真实注入 `helpers.render` 入参并触发渲染。
- **复核状态**: 维度复核通过（独立复核保留 P1）。与维度 09-01 同源，合并为 AUDIT-02。

### [维度03-02] crud-renderer 3 处 as unknown as 合成 renderer props

- **文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:363,376-381,389`
- **证据片段**:
  ```ts
  363: const tableEvents = props.events as unknown as RendererComponentProps<TableSchema>['events'];
  376: templateNode: props.templateNode as unknown as RendererComponentProps<TableSchema>['templateNode'],
  378: node: { ...props.node, scope: crudScope } as unknown as RendererComponentProps<TableSchema>['node'],
  389: regions: props.regions as RendererComponentProps<TableSchema>['regions'],  // 单 as（兼容）
  ```
- **严重程度**: P1
- **现状**: CRUD 伪装成 table 上游，手工合成 `RendererComponentProps<TableSchema>`，对 events/templateNode/node 用 `as unknown as` 欺骗类型系统。`regions` 用单 `as` 证明可区分兼容/不兼容字段。
- **风险**: table 对 templateNode 形状的依赖在 CRUD 合成路径下静默错配。**复核修正**: 非"全仓唯一处 as unknown as"（renderer src 共 ~16 处）；真正独特的是"合成完整 RendererComponentProps 调用 sibling renderer"。
- **建议**: 引入类型诚实 delegation helper，或抽 loose-props 内部函数，把 cast 收敛到有注释的命名 seam。
- **误报排除**: 非低代码动态边界（两个具体已知 schema 间强转）；非测试代码。
- **复核状态**: 维度复核通过（独立复核保留 P1，修正"唯一处"措辞）。与维度 09-02、13-01 同源，合并为 AUDIT-03。

### [维度03-03] flux-react /unstable 与稳定 barrel 大面积重叠

- **文件**: `packages/flux-react/src/unstable.ts:1-28` vs `src/index.tsx:6-30,101`
- **证据片段**:
  ```ts
  // unstable.ts
  export { RenderNodes } from './render-nodes.js';
  export { rendererHooks } from './hooks.js';
  export { ActionScopeContext, ClassAliasesContext, ..., RuntimeContext, ScopeContext, FormContext, ... } // 11 contexts
  ```
- **严重程度**: P2
- **现状**: `/unstable` 本应隔离"未承诺稳定"API，却把稳定 barrel 已导出的 RenderNodes、11 contexts、createFormComponentHandle、createReadonlyScopeBinding 等再次导出。5 个包测试经 `/unstable` 导入稳定 contexts。对照 flow-designer-renderers/unstable（与稳定 barrel 完全不相交）知本项目知道正确切片，唯独 flux-react 未做。
- **风险**: unstable 承诺失效（删 unstable 符号在稳定面仍存在→无破坏信号）；消费方分不清 canonical 路径。
- **建议**: `/unstable` 仅导出稳定 barrel 不含的符号；测试导入迁回 `.`。
- **误报排除**: 非"看起来不优雅"——unstable subpath 契约语义被实质打破，有正确实现样本对照。
- **复核状态**: 维度复核通过（保留 P2 → AUDIT-05）。

### [维度03-04] flux-renderers-form-advanced 生产源经 /unstable 取 flux-runtime 符号（flux-runtime 仅 devDep）

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/projected-scope.ts:1`（re-export）+ `src/projected-owner-scope.ts:57`（运行期使用）；`package.json`（flux-runtime 仅 devDep）
- **证据片段**:
  ```ts
  // detail-view/projected-scope.ts:1
  export { createProjectedScopeStore as createProjectedScopeHelpers } from '@nop-chaos/flux-react/unstable';
  // projected-owner-scope.ts:57
  const { readSnapshot, store } = createProjectedScopeHelpers(parentScope, buildPayload);
  ```
- **严重程度**: P2
- **现状**: `createProjectedScopeStore` canonical owner 是 flux-runtime，但该包仅 devDep；生产源经 flux-react/unstable 透传绕道。`check-workspace-manifest-deps` 因 flux-react 是合法生产 dep 而通过，gate 未捕获。**复核修正路径**: 运行期消费方是 `src/projected-owner-scope.ts`，不是 `detail-view/projected-owner-scope.ts`（后者不存在）。
- **风险**: 稳定生产包把"unstable"当稳定依赖通道——语义矛盾；隐藏对 flux-runtime 的真实生产依赖；收敛 /unstable 时构建断裂。
- **建议**: 把 flux-runtime 提升为生产 dependency，从 canonical 路径导入。
- **误报排除**: 非迁移切片——已发布稳定 renderer 包生产源文件。
- **复核状态**: 维度复核通过（保留 P2，修正路径 → AUDIT-06）。

### [维度03-05] quick-reference.md 把 flux-bundle npm 名误记为 @nop-chaos/flux-bundle

- **文件**: `docs/references/quick-reference.md:30` vs `packages/flux-bundle/package.json:2`
- **严重程度**: P2（与维度 16-01 同源，合并为 AUDIT-22，最终 P3）
- **现状**: 实际 npm 名是 `@nop-chaos/flux`；同仓 audit-tooling.md 已正确。host 按误名安装会找不到包。
- **复核状态**: 与维度 16 合并去重 → AUDIT-22。

## 维度复核结论

- [03-01]: 保留 P1 → AUDIT-02。
- [03-02]: 保留 P1 → AUDIT-03（修正"唯一处"措辞）。
- [03-03]: 保留 P2 → AUDIT-05。
- [03-04]: 保留 P2 → AUDIT-06（修正消费方路径）。
- [03-05]: 与 16-01 合并去重 → AUDIT-22。

## 最终保留项

| 编号  | 严重程度 | 文件                               | 摘要                                                     |
| ----- | -------- | ---------------------------------- | -------------------------------------------------------- |
| 03-01 | P1       | `crud-renderer.tsx:449-476`        | 运行期读 props.schema + 再编译（合并 AUDIT-02）          |
| 03-02 | P1       | `crud-renderer.tsx:363-389`        | as unknown as 合成 props（合并 AUDIT-03）                |
| 03-03 | P2       | `flux-react/src/unstable.ts`       | /unstable 重导稳定符号（合并 AUDIT-05）                  |
| 03-04 | P2       | `form-advanced projected-scope.ts` | 生产源经 /unstable 取 flux-runtime 符号（合并 AUDIT-06） |
| 03-05 | P3       | `quick-reference.md:30`            | 包名误记（合并 AUDIT-22）                                |
