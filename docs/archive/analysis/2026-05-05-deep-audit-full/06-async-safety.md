# 维度 06：异步模式与取消安全

## 初审

- 初审提出 4 条，其中 3 条经复核保留，1 条降级。

## 维度复核

- 保留：report designer 启动期 field source 双加载。
- 保留：report designer mount `void core.refreshFieldSources()` 无 catch。
- 保留：form `initAction` effect 无 cancel / 无 catch。
- 降级：word editor save 失败反馈不足。

## 最终结论

### [维度06] report designer 启动期 field source 双加载会重复请求并允许旧结果覆盖新结果

- **文件**: `packages/report-designer-core/src/core.ts:187-210`, `packages/report-designer-core/src/core.ts:285-311`, `packages/report-designer-renderers/src/page-renderer.tsx:96-98`
- **证据片段**:
  ```ts
  void refreshDerivedState();
  useEffect(() => {
    void core.refreshFieldSources();
  }, [core]);
  ```
- **严重程度**: P1
- **现状**: core 创建与页面挂载各自触发一次 field source 加载，两条链路彼此不互斥。
- **风险**: 重复远程请求、stale overwrite、字段面板闪烁。
- **建议**: 合并启动期刷新入口，或增加 single-flight / request version 防护。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: `子项复核通过`

### [维度06] report designer mount 的 fire-and-forget 刷新缺少 rejection 收口

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx:96-98`, `packages/report-designer-core/src/core.ts:285-309`, `packages/report-designer-core/src/runtime/field-sources.ts:59`
- **证据片段**:
  ```ts
  useEffect(() => {
    void core.refreshFieldSources();
  }, [core]);
  ```
- **严重程度**: P1
- **现状**: `provider.load()` reject 会一路冒泡到被 `void` 丢弃的 effect Promise。
- **风险**: 未处理 Promise 拒绝，字段面板停留在空/旧状态而无显式反馈。
- **建议**: 在调用点补 `.catch(...)`，或在 `refreshFieldSources()` 内统一 catch 并写入可见错误状态。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: `子项复核通过`

### [维度06] form `initAction` 仍是无 cancel、无 catch 的 fire-and-forget effect

- **文件**: `packages/flux-renderers-form/src/renderers/form.tsx:256-267`
- **证据片段**:
  ```ts
  lastInitKeyRef.current = activationKey;
  void initAction(undefined, { scope: lifecycleScope, form: ownedForm });
  ```
- **严重程度**: P2
- **现状**: 表单初始化生命周期 action 没有 `AbortController` / cleanup，也没有 rejection 收口。
- **风险**: 初始化请求失效后仍回写、异常被隐藏到未处理 Promise 路径。
- **建议**: 为 `initAction` 增加 cancel 和 catch，必要时记录到 form lifecycle status。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: `维度复核通过`

### [维度06] word editor save 失败反馈不足

- **文件**: `packages/word-editor-renderers/src/word-editor-page.tsx:219-243`
- **证据片段**:
  ```ts
  const result = await actionProvider.invoke('save', undefined, {} as any);
  if (result.ok) {
    setSaveMessage(...)
  }
  ```
- **严重程度**: P3
- **现状**: `ok:false` 分支缺少显式 UI 反馈。
- **风险**: 用户只能看到“没反应”，但这更偏 UX/可观测性不足而非取消安全主缺陷。
- **建议**: 为失败结果补 toast/status 反馈。
- **参考文档**: `docs/bugs/07-submit-concurrent-guard-fix.md`
- **复核状态**: `已降级`
