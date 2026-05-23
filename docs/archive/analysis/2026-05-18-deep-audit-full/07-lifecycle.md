# 维度 07：生命周期与副作用归属

## 第 1 轮（初审）

### [维度07-01] `useSurfaceRenderer` 在未打开状态也预先创建 surface scope，且 cleanup 不拥有对应释放

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src\use-surface-renderer.ts:114-129,326-347`
- **证据片段**:
  ```ts
  const declarativeScope = React.useMemo(
    () =>
      runtime.createChildScope(
        node.scope,
        {
          dialogId: id,
          ...(openingData ?? {}),
          ...(kind === 'drawer' ? { drawerId: id } : {}),
        },
  ```
- **严重程度**: P1
- **effect 职责**: dialog 或 drawer scope 的创建与关闭清理
- **应归属层级**: runtime 层
- **现状**: `declarativeScope` 在 render 或 `useMemo` 阶段无条件创建；当 `effectiveOpen === false` 且 surface 从未真正 `open()` 进 `SurfaceRuntime` 时，unmount cleanup 只会 `close()` 或 `publishClosed()`，不会释放这个未注册的 child scope。
- **建议**: 只在真正 open 时创建 surface scope，并把 scope 生命周期完全收敛到 `SurfaceRuntime.open()`、`close()`、`dispose()`；React hook 只负责把 open 或 close 意图交给 runtime，不应预建 owner scope。
- **为什么值得现在做**: 这是 declarative dialog 或 drawer 主路径；当前实现既违反 opened-entry 才创建 surface scope 的 owner 边界，也会在常见默认关闭、从未打开的路径留下 scope 生命周期残留。
- **误报排除**: 这不是已被驳回的历史 duplicate publishClosed 复述；这里的 live residual 是更具体的 create 或 dispose 不对称：scope 已创建，但未进入 runtime entry 时没有任何释放点。
- **历史模式对应**: surface/runtime cleanup asymmetry；与 scope lifecycle 不对称家族同型。
- **参考文档**: `docs/architecture/renderer-runtime.md`; `docs/architecture/surface-owner.md`
- **复核状态**: 未复核

### [维度07-02] `form.initAction` 仍由 renderer effect 持有，而不是 `FormRuntime` 语义生命周期

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\renderers\form.tsx:219-356`
- **证据片段**:

  ```ts
  useEffect(() => {
    if (!initAction || !importsReady) {
      return;
    }

    if (lastInitKeyRef.current === activationKey) {
      return;
    }
  ```

- **严重程度**: P2
- **effect 职责**: form 初始化语义入口的去重、abort、重试与 dispatch
- **应归属层级**: runtime 层
- **现状**: `submitAction`、`onSubmitSuccess`、`onSubmitError`、`onValidateError` 已经通过 `ownedForm.setLifecycleHandlers(...)` 进入 form owner；但 `initAction` 仍由 renderer `useEffect` 自己维护 `activationKey`、`AbortController`、in-flight 状态与失败处理，导致同一个 form owner 生命周期被拆成 React-effect 半边和 runtime-owner 半边。
- **建议**: 给 `FormRuntime` 增加正式的 init lifecycle 入口，把 activation gating、single-flight、abort、失败状态都收敛到 owner runtime；React 层只 mount 或 dispose `ownedForm`。
- **为什么值得现在做**: 在 v1 baseline 下，`initAction` 已被文档定义为 form 的语义生命周期入口；继续放在 renderer effect，会让 owner 语义依赖 React commit 或 cleanup 时序，难以与 submit 或 validation 家族保持一致。
- **误报排除**: 这不是普通 UI effect，也不是单纯还有个 `useEffect`；effect 里承载的是 form owner 级别的初始化协议、取消治理和幂等判定，属于 runtime 语义而非 DOM 或订阅壳层。
- **历史模式对应**: 对应 form init lifecycle 仍在 renderer effect 的残留模式。
- **参考文档**: `docs/components/form/design.md`; `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度07-03] `node-renderer-resolved.tsx` 仍把 hidden-field owner 语义放在 React effect cleanup 上，且 cleanup 非对称

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\node-renderer-resolved.tsx:318-327`
- **证据片段**:
  ```ts
  React.useEffect(() => {
    hiddenOwner.notifyFieldHidden(fieldName, isFieldHidden);
    return () => {
      hiddenOwner.notifyFieldHidden(fieldName, false);
    };
  }, [fieldName, hiddenOwner, isFieldHidden]);
  ```
- **严重程度**: P1
- **effect 职责**: hidden-field 参与语义的 owner 通知与 cleanup
- **应归属层级**: runtime 层
- **现状**: `node-renderer-resolved.tsx` 在 mount 或 update 时调用 `hiddenOwner.notifyFieldHidden(fieldName, isFieldHidden)`，但 cleanup 无条件调用 `hiddenOwner.notifyFieldHidden(fieldName, false)`。这把组件卸载、error boundary 捕获、owner replacement、React replay 等 React 生命周期事件误当成字段重新可见。
- **建议**: hidden participation 应由 owner-local 参与语义持有，只在真实 hidden 或 visible 转换时撤销 hidden 状态；不要把 React effect cleanup 当作第二套 owner truth。
- **为什么值得现在做**: 这会在错误回退或重挂载窗口把隐藏字段短暂反注册为可见，随后被校验、产生命中不了 UI 的 phantom errors，甚至阻塞 submit。
- **误报排除**: 这不是 `[维度07-02]` 的 `form.initAction` owner 漂移复述；这是另一处仍存活的 runtime 语义藏在 React effect cleanup 层的残留。
- **历史模式对应**: runtime 语义误放到 React cleanup 的残留模式。
- **参考文档**: `docs/architecture/form-validation.md:777-784`; `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度07-04] 声明式 surface 在 scope churn 时复用旧 validationOwner

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src\use-surface-renderer.ts:114-128,196-238`; `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\surface-runtime.ts:120-138,157-159`; `C:\can\nop\nop-chaos-flux\packages\flux-react\src\dialog-host-surface.tsx:75-82`; `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\__tests__\runtime-dialogs-scope.dialog-state.test.ts:66-72,149-156`
- **证据片段**:
  ```ts
  surfaceRuntime.upsert({
    ...existing,
    ...entry,
    validationOwner: existing.validationOwner,
  });
  return;
  ```
- **严重程度**: P1
- **effect 职责**: 维护 declarative surface 打开态期间 `scope` 与 `validationOwner` 的同源绑定，不让可见 subtree scope 与校验 owner 分叉
- **应归属层级**: runtime 层
- **现状**: `useSurfaceRenderer()` 会在 `declarativeScope` 变化时生成新的 `entry.scope`，但命中已存在 entry 后走 `upsert` 分支并强制保留 `existing.validationOwner`。`SurfaceRuntime.open()` 里的 `validationOwner` 是按首次 `scope` 创建的，`SurfaceRuntime.upsert()` 又只是替换 entry，不会基于新 `scope` 重建 owner。与此同时 `dialog-host-surface.tsx` 会把 `scope` 与 `validationOwner` 分别注入上下文，因此 surface subtree 会看到新 scope 加旧 validationOwner 的真实失配。
- **建议**: 把同一 `surfaceId` 下 scope 已变更视为 owner 生命周期切换，而不是普通 entry 更新；要么在 runtime 侧提供原子 replace 或 reopen 路径，先释放旧 `validationOwner` 再按新 `scope` 重建，要么在 React 侧检测 `existing.scope !== declarativeScope` 时走显式 close+open，而不是 `upsert` 加复用 `validationOwner`。
- **为什么值得现在做**: 这会直接把 surface 内字段读取绑定到新 scope、但把校验、错误、touched 状态继续挂在旧 owner 上，形成静默错验；一旦 dialog 或 drawer 承载表单或 field renderer，问题会表现为校验读旧值、错误落错 owner、关闭时才一起暴露。
- **误报排除**: 这不是普通 metadata 更新误判；代码已显式把 `existing.scope === declarativeScope` 作为快路径条件，说明作者认可 scope 变化是特殊事件，但后续仍保留旧 `validationOwner`。也不是 React 层内部实现细节不可观察：`SurfaceScopeProviders` 明确把 `scope` 与 `validationOwner` 独立提供给子树，失配会真实影响 field 或 validation hooks。
- **历史模式对应**: owner 或 scope 脱钩残差：首次创建时 owner 正确绑定，但后续生命周期替换只换可见 scope、不换 owner。
- **参考文档**: `docs/architecture/surface-owner.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度07-01]: 保留 (P1)。`packages/flux-renderers-basic/src/use-surface-renderer.ts` 仍在 `effectiveOpen === false` 时预建 `declarativeScope`，而从未注册进 `SurfaceRuntime` 的路径在 cleanup 里没有对称 `disposeScope`；与 `docs/architecture/surface-owner.md` 的每个 opened surface 才拥有 child scope 基线不符。
- [维度07-02]: 降级。`packages/flux-renderers-form/src/renderers/form.tsx` 的 `initAction` 确实仍由 renderer `useEffect` 驱动，但 live 代码已具备 activation 去重、abort、retry/failure 处理；当前更像 owner 收口未完成的实现残差。
- [维度07-03]: 保留 (P1)。`packages/flux-react/src/node-renderer-resolved.tsx` 仍在 effect cleanup 里无条件 `notifyFieldHidden(fieldName, false)`；这把 unmount/replay/replacement 混同为重新可见，与 owner-scoped hidden participation 规则不一致。
- [维度07-04]: 降级。declarative surface 命中 `existing` 时仍保留 `existing.validationOwner`，而 `scope` 已可替换，失配是 live residual；但触发面较窄，更像 scope-churn 场景下的 watch-level owner mismatch。

## 子项复核结论

- 建议后续复核 `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`：其 hidden-path cleanup 也有 `notifyFieldHidden(..., false)` 对称写法，模式与 `[维度07-03]` 同型。
- 若后续继续推进 `[维度07-04]`，需单独确认 surface 保持打开时 parent scope identity churn 是否已有 focused test；这决定它是否继续仅维持降级。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                        | 一句话摘要                                                   |
| ----- | -------- | --------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 07-01 | P1       | `packages/flux-renderers-basic/src/use-surface-renderer.ts:114-129,326-347` | declarative surface 默认关闭时仍预建 scope 且 cleanup 不对称 |
| 07-03 | P1       | `packages/flux-react/src/node-renderer-resolved.tsx:318-327`                | hidden-field cleanup 会把卸载误报成重新可见                  |
