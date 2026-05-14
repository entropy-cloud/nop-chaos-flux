# 维度 05：响应式订阅精度

## 第 1 轮（初审）

### [维度05-01] 多个字段控制器的 non-form fallback 仍退化为整 scope 订阅

- **文件**: `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:133-139`, `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:148-154`, `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:64-73`, `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:66-76`
- **证据片段**:
  ```ts
  const scopeValue = useScopeSelector((data) => (name ? getIn(data, name) : data), Object.is);
  const rawValue = parentForm ? formValue : scopeValue;
  ```
- **严重程度**: P2
- **订阅位置**: object-field / variant-field / detail-view / detail-field 的 non-form fallback 读取分支
- **订阅范围**: 未传 `paths`，实际退化为整份 visible scope 订阅
- **实际需要**: 只订阅 `name` / `scopePath` 对应的绑定路径
- **重渲染频率**: 任意 scope 写入都会唤醒这些字段控制器，即使目标路径未变
- **建议**: 为 non-form `useScopeSelector` 补上对应的 `paths`
- **误报排除**: 这些不是 broad summary reader，而是字段级 value binding/control path
- **复核状态**: 未复核

### [维度05-02] DialogHost/DrawerHost 用整 scope 订阅强制宿主层重渲染

- **文件**: `packages/flux-react/src/dialog-host.tsx:84,173`, `packages/flux-react/src/dialog-host-surface.tsx:50-73`
- **证据片段**:
  ```ts
  function DialogView(props) {
    useSurfaceScopeSnapshot(props.surface.scope);
  }
  ```
- **严重程度**: P2
- **订阅位置**: surface host 根层
- **订阅范围**: 未传 `paths`，直接订阅整个 `scope.readVisible()`
- **实际需要**: 若无宿主层 scope 依赖，应删除；若有，应按具体路径订阅
- **重渲染频率**: surface scope 任意路径变化都会提升为宿主层 rerender
- **建议**: 删除无消费的 whole-scope 订阅，或改为精确路径订阅
- **误报排除**: hook 返回值未被消费，本质是 broad rerender trigger，不是合法 summary read
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度05-03] useHostScope 的 replace 更新丢失 nested path precision

- **文件**: `packages/flux-react/src/workbench/hooks.ts:88-90`, `packages/flux-runtime/src/scope.ts:434-469`
- **证据片段**:
  ```ts
  scope.replace?.(scopeData);
  ```
  ```ts
  const keys = new Set([...Object.keys(current), ...Object.keys(next)]);
  for (const key of keys) {
    if (!Object.is(current[key], next[key])) {
      changedPaths.add(key);
    }
  }
  ```
- **严重程度**: P1
- **订阅位置**: workbench/host projection scope 更新路径
- **订阅范围**: host projection 替换后只发布根级 changed paths
- **实际需要**: deep-path 订阅者应继续获得 nested precision
- **重渲染频率**: host projection 下游即使订阅 deep path，也只能按根级 bucket 被唤醒
- **建议**: 为 host projection replace 引入 nested changed-path 计算或 path-aware patch 更新
- **误报排除**: 这不是 broad host summary reader，而是 deep-path precision 在 host projection 主路径上被结构性抹平
- **复核状态**: 未复核

### [维度05-04] useFieldPresentation 的 dynamic requiredness 在 non-form owner 下欠订阅依赖路径

- **文件**: `packages/flux-renderers-form/src/field-utils/field-presentation.tsx:59-65`, `packages/flux-react/src/field-frame.tsx:117-147`
- **证据片段**:
  ```ts
  const ownerEffectiveRequired = useCurrentValidationValues(
    (values) => isFieldEffectivelyRequired(compiledForm, name, values),
    { enabled: !currentForm, path: name },
  );
  ```
- **严重程度**: P2
- **订阅位置**: field presentation requiredness 计算
- **订阅范围**: 只订阅字段本路径
- **实际需要**: 还应订阅 `requiredWhen` / `requiredUnless` 的依赖路径
- **重渲染频率**: 依赖字段变化时 required marker 可延迟到字段自身变化或更广泛 rerender 后才刷新
- **建议**: 复用 `field-frame` 的 dependency-path 订阅模式
- **误报排除**: 不是理论优化；同仓已存在正确 dependency-path 订阅实现
- **复核状态**: 未复核

### [维度05-05] PageRenderer 读取 `refreshTick` 时仍走 broad scope subscription

- **文件**: `packages/flux-renderers-basic/src/page.tsx:18-20`
- **证据片段**:
  ```ts
  const refreshTick = useScopeSelector((scopeData) => Number(scopeData?.refreshTick ?? 0));
  ```
- **严重程度**: P3
- **订阅位置**: page renderer 根层
- **订阅范围**: 整份 scope visible snapshot
- **实际需要**: 只订阅 `refreshTick`
- **重渲染频率**: 任意 page scope 写入都会唤醒 PageRenderer
- **建议**: 增加 `paths: ['refreshTick']`
- **误报排除**: 问题虽轻，但确实偏离 selective subscription baseline
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度05-06] `report-inspector-shell` 内外双层 renderer 重复输出同一 root meta 标记

- **文件**: `packages/report-designer-renderers/src/inspector-shell-renderer.tsx:32-43,65`, `packages/report-designer-renderers/src/report-designer-inspector.tsx:40-44,52-56`
- **证据片段**:
  ```tsx
  <section className={cn('nop-report-designer', props.meta.className)}
    data-testid={props.meta.testid}
    data-cid={props.meta.cid}
  >
  ```
  ```tsx
  <section className={cn('nop-report-inspector', props.meta.className)}
    data-testid={props.meta.testid}
    data-cid={props.meta.cid}
  >
  ```
- **严重程度**: P2
- **订阅位置**: inspector shell / inner inspector renderer root output path
- **订阅范围**: 重复 root identity meta 输出会扩大测试/调试命中范围
- **实际需要**: 同一 renderer node 只应有一个 canonical root identity/meta 输出面
- **重渲染频率**: 会污染 `data-cid` / `data-testid` 选择器与调试定位，不是频率问题而是 identity 精度问题
- **建议**: shell 与 inner inspector 之间明确一个 canonical root，避免重复透传同一份 meta
- **误报排除**: 这不是纯样式问题，而是 root identity precision 被重复输出
- **复核状态**: 未复核

## 维度复核结论

- [维度05-01]: 驳回。主公共字段控制路径已补齐 non-form `paths`，旧问题不再是当前 live 缺陷。
- [维度05-02]: 降级为 P3。仍是 broad host subscription，但更像低风险宿主层冗余刷新。
- [维度05-03]: 保留为 P2。host projection replace 的 nested path precision 丢失仍成立。
- [维度05-04]: 保留为 P2。non-form dynamic requiredness 欠订阅依赖路径仍与 current field-frame baseline 不一致。
- [维度05-05]: 保留为 P3。PageRenderer broad subscription 成立，但影响较轻。
- [维度05-06]: 保留为 P2。root meta 的重复输出会污染测试/调试 identity 精度。

## 子项复核结论

- [维度05-02]: 降级 (P3)。宿主层 broad subscription 只放大外壳层刷新。
- [维度05-03]: 成立 (P2)。replace 只发布顶层 changed paths，deep-path precision 确实丢失。
- [维度05-04]: 降级 (P3)。问题主要局限在 non-form owner 且当前消费面有限。
- [维度05-05]: 降级 (P3)。轻量 broad subscription，可排后处理。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                        | 一句话摘要                                                |
| ----- | -------- | --------------------------------------------------------------------------- | --------------------------------------------------------- |
| 05-02 | P3       | `packages/flux-react/src/dialog-host.tsx:84,173`                            | Dialog/Drawer host 仍保留 broad scope 订阅                |
| 05-03 | P2       | `packages/flux-react/src/workbench/hooks.ts:88-90`                          | host projection `replace()` 只发布根级 changed paths      |
| 05-04 | P3       | `packages/flux-renderers-form/src/field-utils/field-presentation.tsx:59-65` | non-form requiredness 欠订阅依赖路径                      |
| 05-05 | P3       | `packages/flux-renderers-basic/src/page.tsx:18-20`                          | PageRenderer 读取 `refreshTick` 时仍是 broad subscription |
| 05-06 | P2       | `packages/report-designer-renderers/src/inspector-shell-renderer.tsx:32-43` | inspector shell/inner renderer 重复输出同一 root meta     |
