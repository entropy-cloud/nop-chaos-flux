# 维度 16：文档与代码一致性

## 第 1 轮（初审）

### [维度16-01] `field-binding-and-renderer-contract` 的 Frozen Contract Matrix 仍把 `META_FIELDS` 权威冻结集写成 6 项，但 live compiler 仍按 8 项运行

- **文件**: `C:\can\nop\nop-chaos-flux\docs\architecture\field-binding-and-renderer-contract.md:232-255,403-408`; `C:\can\nop\nop-chaos-flux\packages\flux-core\src\constants.ts:1-10`; `C:\can\nop\nop-chaos-flux\packages\flux-compiler\src\schema-compiler\fields.ts:36-85`
- **证据片段**:
  ```ts
  export const META_FIELDS = new Set([
    'id',
    'className',
    'frameClassName',
    'when',
    'visible',
    'hidden',
    'disabled',
    'testid',
  ]);
  ```
- **严重程度**: P1
- **现状**: 文档前半段虽然说明这是目标 baseline，但后面的 `Frozen Contract Matrix` 与 `Global META_FIELDS Frozen Set` 仍把“冻结后的 `META_FIELDS` 最小集合”写成 `{ id, className, visible, hidden, disabled, testid }` 并作为权威决策展示；但 live code 仍把 `frameClassName`、`when` 保留在 `META_FIELDS`，compiler 也继续对这 8 个字段执行 `meta` 编译。
- **风险**: 当前架构文档会直接误导后续重构、审计和 renderer authoring，以为 `frameClassName` / `when` 已退出全局 meta 基线；但 live compiler 并没有同步收敛。这会制造“文档判定已冻结、代码实际上未迁移”的假一致。
- **建议**: 二选一收口：要么更新 live code 以匹配文档冻结集；要么把文档改写为目标态/演进方向，而不是写成当前基线和 frozen contract。
- **为什么值得现在做**: 这是 compiler 级核心 contract，不是边缘说明文案；文档与代码分叉会持续污染后续的所有 schema field adjudication。
- **误报排除**: 这不是拿设计愿景挑代码刺。文档明确写了“冻结后的权威决策”“Global META_FIELDS Frozen Set”，而 live compiler 直接消费的仍是另一套集合。
- **历史模式对应**: architecture doc 提前把目标态写成已落地 baseline，但 compile/runtime 主路径并未同步迁移。
- **参考文档**: `docs/architecture/field-binding-and-renderer-contract.md`
- **复核状态**: 未复核

### [维度16-02] `action-scope-and-imports` 描述的 `ComponentHandleRegistry` 规范形状已与导出接口和 runtime 行为分叉

- **文件**: `C:\can\nop\nop-chaos-flux\docs\architecture\action-scope-and-imports.md:260-297`; `C:\can\nop\nop-chaos-flux\packages\flux-core\src\types\renderer-component.ts:65-84`; `C:\can\nop\nop-chaos-flux\packages\flux-action-core\src\action-dispatcher\action-runners.ts:65-80`
- **证据片段**:
  ```ts
  interface ComponentHandleRegistry {
    register(handle: ComponentHandle): void;
    unregister(handle: ComponentHandle): void;
    resolve(
      target: ComponentTarget,
    ):
      | { kind: 'found'; handle: ComponentHandle }
      | { kind: 'not-found' }
      | { kind: 'ambiguous'; matches: readonly ComponentHandle[] };
  }
  ```
- **严重程度**: P1
- **现状**: 文档仍把 `register()` 写成返回 `void`，把 `resolve()` 写成 tagged union，并把 `ComponentTarget` 限定为 `componentId/componentName`。但 live exported interface 是 `register(...): () => void`、`resolve(...): ComponentHandle | undefined`，而 runtime action path 还显式支持 `_targetCid`。
- **风险**: 这会让依赖架构文档实现 component targeting、registry adapter 或调试工具的代码直接对错契约编程。尤其 `_targetCid` 已经是 live action error contract 的一部分，文档继续省略会误导上层集成和审计。
- **建议**: 让 architecture doc 回到 live baseline，至少与 `flux-core` 导出的接口和 `component:<method>` action runner 的 target contract 完全一致；若想保留 tagged union 作为未来目标，需要显式标注为 proposal，而不是 normative shape。
- **为什么值得现在做**: `ComponentHandleRegistry` 是跨包动作分发核心契约，文档漂移会直接外溢到 host integration、designer shell 和调试链路。
- **误报排除**: 不是把实现细节强塞给文档。这里偏差发生在架构文档明说的 “Normative shape” 和 `flux-core` 公开导出接口之间。
- **历史模式对应**: 文档中的“规范接口”与公开类型导出分叉，导致跨包集成按照不存在的契约实现。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`
- **复核状态**: 未复核

### [维度16-03] `renderer-interfaces` 仍把 `RendererResolvedProps` 记为 `Record<string, any> & Partial<S>`

- **文件**: `C:\can\nop\nop-chaos-flux\docs\references\renderer-interfaces.md:221-225`; `C:\can\nop\nop-chaos-flux\packages\flux-core\src\types\renderer-core.ts:112-127`
- **证据片段**:
  ```ts
  - `RendererResolvedProps<S>` defaults to `Record<string, any> & Partial<S>` so runtime prop bags stay honest for low-code dynamic fields without forcing every schema-only field into `props`.
  ```
- **严重程度**: P2
- **现状**: 参考文档仍声称 `RendererResolvedProps<S>` 默认是 `Record<string, any> & Partial<S>`；但 live exported type 已切成 `Record<string, unknown>` 加 `Omit<Partial<RemoveIndexSignature<S>>, ...>`，并显式重新注入 `className`、`frameClassName`、`disabled`、`testid`、`cid`、`readOnly`、`required` 等运行时字段。
- **风险**: 这会让读参考文档的人错误理解 renderer 边界的真实类型形状，继续写出建立在 `any` 或全量 `Partial<S>` 假设上的 helper、断言或 docs。
- **建议**: 把 reference doc 更新为当前导出类型，并说明为什么从 `any` 收窄到 `unknown` 以及哪些字段是 runtime reinjected props。
- **为什么值得现在做**: 这是 renderer authoring 的直接参考文档，继续保留旧签名会放大本轮正在审计的动态边界误解。
- **误报排除**: 不是苛责参考文档不逐字贴源码；文档标题已经写明 “Current typing baseline”，但其内容与 live exported type 不一致。
- **历史模式对应**: reference doc 停留在旧类型时代，而公开 API 已经演进，形成误导性类型基线。
- **参考文档**: `docs/references/renderer-interfaces.md`
- **复核状态**: 未复核

## 初审结论

- 保留 3 项 doc/code 不一致问题，均直接影响架构基线或公开类型理解。

## 维度复核结论

- 结论: 部分保留。
- 理由: 三项里有两项属于直接可核对的公开契约漂移，应保留。`16-01` 不能按原表述整项保留，因为文档 Rule 5 已明确说“这是目标 baseline，而不是当前实现现状”；但同一文档后半段又把 6 项 `META_FIELDS` 写成 `Frozen Contract Matrix` / `Global META_FIELDS Frozen Set` 的权威契约，这部分与 live code 形成实质不一致。`16-02` 的 `ComponentHandleRegistry` 形状与 `16-03` 的 `RendererResolvedProps` baseline 都能被导出类型或运行时代码直接反证，不是纯 aspirational wording。

## 子项复核结论

- `16-01`: 缩窄保留。仅保留 `Frozen Contract Matrix / Global META_FIELDS Frozen Set` 与 live 8 项实现不一致这一 concrete mismatch。
- `16-02`: 保留。`action-scope-and-imports.md` 中 `ComponentHandleRegistry` / `ComponentTarget` 的 normative shape 与公开类型、运行时行为分叉。
- `16-03`: 保留。`renderer-interfaces.md` 把 `RendererResolvedProps` 记成旧的当前基线。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                                                                                                                           | 一句话摘要                                                                                      |
| ----- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 16-01 | P1       | `docs/architecture/field-binding-and-renderer-contract.md:383-409`; `packages/flux-core/src/constants.ts:1-10`; `packages/flux-compiler/src/schema-compiler/fields.ts:36-85`                   | `Frozen Contract Matrix` 仍把 `META_FIELDS` 权威冻结集写成 6 项，但 live compiler 仍按 8 项运行 |
| 16-02 | P1       | `docs/architecture/action-scope-and-imports.md:260-297`; `packages/flux-core/src/types/renderer-component.ts:65-84`; `packages/flux-action-core/src/action-dispatcher/action-runners.ts:65-80` | `ComponentHandleRegistry` 架构文档与导出接口、runtime target contract 分叉                      |
| 16-03 | P2       | `docs/references/renderer-interfaces.md:221-225`; `packages/flux-core/src/types/renderer-core.ts:112-127`                                                                                      | `renderer-interfaces` 仍把 `RendererResolvedProps` 记为旧的 typing baseline                     |
