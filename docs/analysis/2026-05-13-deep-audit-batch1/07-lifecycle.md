# 维度 07：生命周期与副作用归属

## 第 1 轮（初审）

### [维度07-01] form `statusPath` 发布仍由 renderer effect 订阅并驱动

- **文件**: `packages/flux-renderers-form/src/renderers/form-status-publication.ts`
- **证据片段**:

  ```ts
  useEffect(() => {
    if (!statusPath || !parentScope) {
      return;
    }

    function publishStatus() {
      const summary = buildFormStatusSummary(
        ownedForm.store.getState(),
        ownedForm.id,
        ownedForm.name,
        ownedForm.getScopeState().validating ? 1 : 0,
      );

      publishOwnerStatus(resolvedParentScope, resolvedStatusPath, summary);
    }
  ```

- **严重程度**: P2
- **effect 职责**: 订阅 `FormRuntime` store、聚合 form 语义摘要、向外层 scope 发布/清理 `statusPath`
- **应归属层级**: runtime 层
- **现状**: `FormRuntime` 自己拥有提交/校验/dirty/touched 等生命周期，但外部发布仍靠 renderer mount/unmount 的 React effect 维持。
- **建议**: 把 `statusPath` 绑定下沉到 `FormRuntime`/runtime status-owner 基础设施；renderer 只声明路径，不再自己订阅 store 和做 cleanup。
- **为什么值得现在做**: 继续放在 renderer effect 会把 owner-publication 语义绑定到 React 挂载时序，而不是 form owner 生命周期本身。
- **误报排除**: 不是泛泛指责 effect；代码直接读取 `ownedForm.store`、调用 runtime helper、并负责外部 path cleanup，已经越过纯 UI/host wiring 边界。
- **历史模式对应**: form status publication 仍为 renderer-side effect。
- **参考文档**: `docs/components/form/design.md`, `docs/architecture/form-external-publication-and-reserved-bindings.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

### [维度07-02] form `valuesPath` 快照发布也仍由 renderer effect 承担

- **文件**: `packages/flux-renderers-form/src/renderers/form-status-publication.ts`
- **证据片段**:

  ```ts
  useEffect(() => {
    if (!valuesPath || !parentScope) {
      return;
    }

    function publishValues() {
      const values = ownedForm.store.getState().values;
      if (Object.is(lastPublishedValues, values)) {
        return;
      }

      lastPublishedValues = values;
      resolvedParentScope.update(resolvedValuesPath, values);
    }
  ```

- **严重程度**: P2
- **effect 职责**: 监听 form values 变化并向 parent scope 做只读快照发布/卸载清理
- **应归属层级**: runtime 层
- **现状**: `valuesPath` 的外部发布边界没有成为 form owner 的内建职责，而是 renderer effect 的附加副作用。
- **建议**: 将 `valuesPath` 作为 `FormRuntime` 的正式 publication 能力；让 runtime 统一负责首发、增量更新、卸载清理。
- **为什么值得现在做**: `valuesPath` 是正式外部契约，不是 renderer 私有行为；现在这条主路径把外部可见数据绑定到 React effect 生命周期，后续 host/offscreen/remount 行为会更难推理。
- **误报排除**: 不是在挑剔“用了 effect”；问题在于 effect 直接持有 owner 外部发布职责，并直接改写 parent scope。
- **历史模式对应**: form values publication renderer-owned。
- **参考文档**: `docs/components/form/design.md`, `docs/architecture/form-external-publication-and-reserved-bindings.md`, `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度07-03] `renderer-basic` 共享 `statusPath` hook 在每次摘要更新时先清空再重发

- **文件**: `packages/flux-renderers-basic/src/status-hooks.ts`; `packages/flux-renderers-basic/src/page.tsx`; `packages/flux-renderers-basic/src/tabs.tsx`
- **证据片段**:

  ```ts
  export function useStatusPathPublication<TSummary>(
    scope: ScopeRef | undefined,
    statusPath: string | undefined,
    summary: TSummary,
  ) {
    useEffect(() => {
      publishOwnerStatus(scope, statusPath, summary);

      return () => {
        publishOwnerStatus(scope, statusPath, undefined);
      };
    }, [scope, statusPath, summary]);
  }
  ```

- **严重程度**: P2
- **effect 职责**: owner `statusPath` 发布与 cleanup
- **应归属层级**: React 层
- **现状**: `page`/`tabs` 共用的 hook 把“依赖变化 cleanup”与“真正卸载 cleanup”混为一体；`summary` 每次变化都会先写一次 `undefined`，再写新 summary。
- **建议**: 删除这个局部实现，统一改用 `packages/flux-react/src/status-path.ts` 的稳定发布语义；至少要区分 target-change/unmount cleanup 与同 target summary update。
- **为什么值得现在做**: 这是主路径对外状态契约；当前实现会制造额外的 `undefined -> nextSummary` 抖动，影响 sibling/host/debugger 对 `statusPath` 的观察稳定性。
- **误报排除**: 不是单纯“重复造轮子”；这里的 cleanup 语义本身就错，且 live 被 `page`/`tabs` 使用。
- **历史模式对应**: 错误语义的共享 status hook 扩散到多个 renderer。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

### [维度07-04] `RenderNodes` 用未受控 microtask 和 cleanup `setState` 维持 fragment scope 提交门闩

- **文件**: `packages/flux-react/src/render-nodes.tsx`
- **证据片段**:
  ```ts
  useLayoutEffect(() => {
    if (!shouldUseFragmentScope || !fragmentBindings) {
      if (hasCommittedFragmentScope) {
        queueMicrotask(() => {
          setHasCommittedFragmentScope(false);
        });
      }
      return;
    }
  ```
- **严重程度**: P1
- **effect 职责**: fragment scope commit gating、cache 生命周期清理
- **应归属层级**: React 层
- **现状**: 提交门闩依赖 `queueMicrotask` 异步翻转本地 state，且卸载 cleanup 里直接 `setState`。这些更新没有取消/序列保护，生命周期正确性取决于微任务执行时机。
- **建议**: 去掉 cleanup `setState`；将 fragment scope commit 状态改成可同步推导或使用可取消的 versioned flush 机制，避免悬空 microtask 改写过期实例。
- **为什么值得现在做**: 这是 `RenderNodes` 热路径，而且仓库刚有过该路径的 setState/render-phase 历史事故；继续把可见性门闩绑定到未受控 microtask，会在快速切换、卸载、严格模式重放下留下真实生命周期风险。
- **误报排除**: 不是重复报告已修复的“render 期写 store”；当前问题是修复后残留的另一类生命周期不安全实现。
- **历史模式对应**: `RenderNodes` 历史 setState/render 路径的后续残留。
- **参考文档**: `docs/bugs/15-render-nodes-setstate-during-render-fix.md`, `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度07-05] `RenderNodes` 在 fragment scope 身份切换时会回退到 parent scope 渲染

- **文件**: `packages/flux-react/src/render-nodes.tsx`
- **证据片段**:
  ```ts
  const fragmentScopeEntry = matchesFragmentScopeEntry(cachedFragmentScope, fragmentScopeIdentity)
    ? cachedFragmentScope
    : undefined;
  const fragmentScope = shouldUseFragmentScope ? fragmentScopeEntry?.scope : undefined;
  const scope = explicitScope ?? fragmentScope ?? currentScope;
  ```
- **严重程度**: P1
- **effect 职责**: fragment child scope 创建、提交门闩、scope cache 切换
- **应归属层级**: React 层
- **现状**: fragment scope identity 变化时，本次 render 可能回退到 `currentScope`，再依赖后续异步门闩切回新 scope。
- **建议**: identity 变化时显式触发重新绑定到新 scope 的 render，而不是允许 `fragmentScope ?? currentScope` 回退。
- **为什么值得现在做**: 这会把 slot/fragment 子树短暂渲染到错误数据域里。
- **误报排除**: 不是与 `[维度07-04]` 相同的 microtask 风险；这里是 scope identity-change 分支上的 correctness bug。
- **历史模式对应**: commit 状态与真实 scope 激活状态脱节
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/bugs/15-render-nodes-setstate-during-render-fix.md`
- **复核状态**: 未复核

### [维度07-06] source observer / source-prop controller 生命周期未绑定 `RendererRuntime`

- **文件**: `packages/flux-react/src/use-source-value.ts`; `packages/flux-react/src/use-node-source-props.ts`; `packages/flux-react/src/schema-renderer.tsx`
- **证据片段**:
  ```ts
  const [observer] = useState<SourceObserver>(() => runtime.createSourceObserver());
  const [controller] = useState(() => createNodeSourcePropController(node, runtime));
  ```
- **严重程度**: P2
- **effect 职责**: React hook 持有 runtime-owned source 执行器/observer/controller，并在组件生命周期内驱动其运行与清理
- **应归属层级**: runtime 资源归属仍应是 runtime；React hook 只应持有与当前 runtime 同步的壳
- **现状**: `observer` / `controller` 只在首次 mount 时构造；若 `SchemaRenderer` 替换了 `runtime`，子树不会强制 remount，但旧 observer/controller 仍继续使用旧 runtime。
- **建议**: 让这两类 hook 以 `runtime` 为显式生命周期键；runtime 变更时重建并 dispose 旧实例。
- **为什么值得现在做**: 这会把 runtime-owned 副作用留在一个已经退役的 runtime 上，形成悬空资源路径。
- **误报排除**: 不是泛泛讨论 runtime prop 很少变化；代码已经明确支持 runtime 实例替换，而这些 hook 没有跟随更新。
- **历史模式对应**: runtime-owned effect 资源被 React 本地实例长期持有
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度07-07] node/import-owned `ActionScope` 只有创建没有释放

- **文件**: `packages/flux-runtime/src/runtime-factory.ts`; `packages/flux-react/src/use-node-scopes.ts`; `packages/flux-react/src/node-renderer.tsx`; `packages/flux-core/src/types/actions.ts`
- **证据片段**:
  ```ts
  function createOwnedActionScope(scopeInput: { id?: string; parent?: ActionScope } = {}) {
    ...
    ownedActionScopes.add(actionScope);
    return actionScope;
  }
  ```
- **严重程度**: P2
- **effect 职责**: action-scope 资源创建、namespace 生命周期承载、runtime 清理归档
- **应归属层级**: runtime 层
- **现状**: React 侧会为 `actionScopePolicy: 'new'` 和 import boundary 创建新的 `ActionScope`，但没有 release 通道；runtime 仅在 `runtime.dispose()` 时一次性清空 `ownedActionScopes`。
- **建议**: 给 `ActionScope` 增加显式释放协议，或由 runtime 暴露 `releaseActionScope()`；在 node/import boundary unmount 时对称释放。
- **为什么值得现在做**: 这是标准生命周期对称性缺口，长寿命页面 runtime 中空 action scopes 会持续累积。
- **误报排除**: 不是在挑剔“scope 创建发生在 React”；问题在于 runtime-owned 资源没有配套 release。
- **历史模式对应**: runtime 资源在 React effect 中创建，但未形成成对 cleanup 协议
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度07-01]: 保留 (P2)。form `statusPath` 发布仍由 renderer effect 订阅并驱动。
- [维度07-02]: 降级为 P3。`valuesPath` 仍由 renderer effect 发布，但当前基线更像实现收敛债，而非明确 owner 违约。
- [维度07-03]: 保留 (P2)。`renderer-basic` 共享 `statusPath` hook 仍在依赖变化时先清空再重发。
- [维度07-04]: 保留 (P1)。`RenderNodes` 仍依赖未受控 microtask 与 cleanup `setState` 维持 fragment-scope 门闩。
- [维度07-05]: 保留 (P1)。fragment scope identity 切换时仍可能回退到 parent scope 渲染。
- [维度07-06]: 保留 (P2)。source observer / source-prop controller 生命周期仍未绑定 runtime 替换。
- [维度07-07]: 降级为 P3。node/import-owned `ActionScope` 壳对象会累积，但重资源本身泄漏证据不足。

## 子项复核结论

- [维度07-02]: 成立 (P3)。`valuesPath` 发布仍由 renderer effect 承担，但 owner 文档尚未把它强制收敛为 runtime-owned。
- [维度07-07]: 成立 (P3)。`ActionScope` 壳对象确有 retention，但现有证据更像轻量生命周期债。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                    | 一句话摘要                                                      |
| ----- | -------- | ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| 07-01 | P2       | `packages/flux-renderers-form/src/renderers/form-status-publication.ts` | form `statusPath` 发布仍由 renderer effect 维护                 |
| 07-02 | P3       | `packages/flux-renderers-form/src/renderers/form-status-publication.ts` | `valuesPath` 快照发布仍由 renderer effect 承担                  |
| 07-03 | P2       | `packages/flux-renderers-basic/src/status-hooks.ts`                     | 共享 `statusPath` hook 在更新时先清空再重发                     |
| 07-04 | P1       | `packages/flux-react/src/render-nodes.tsx`                              | fragment-scope 门闩仍依赖未受控 microtask 与 cleanup `setState` |
| 07-05 | P1       | `packages/flux-react/src/render-nodes.tsx`                              | fragment scope 身份切换时可能回退到 parent scope                |
| 07-06 | P2       | `packages/flux-react/src/use-source-value.ts`                           | source observer/controller 未跟随 runtime 替换重建              |
| 07-07 | P3       | `packages/flux-runtime/src/runtime-factory.ts`                          | node/import-owned `ActionScope` 只有创建没有释放                |
