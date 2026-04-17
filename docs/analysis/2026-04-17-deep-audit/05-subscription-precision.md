# 05 响应式订阅精度

- Task ID: `ses_268f5badfffe5d3tQ59Yf96wBo`
- Source prompt: `docs/skills/deep-audit-prompts.md`

### [维度05] 字段展示状态仍通过全表广播订阅
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\field-frame.tsx:61-84`; `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\field-utils.tsx:242-265`
- **严重程度**: P1
- **订阅位置**: `FieldFrame` 内 3 处 `useCurrentFormState(...)`；`useFieldPresentation()` 内 1 处 `useCurrentFormState(...)`
- **订阅范围**: 整个 `FormStoreState` 广播；其中还会在动态 required 场景读取整份 `state.values`
- **实际需要**: 当前字段的 `fieldStates[name]`、该字段聚合错误、`submitting`，以及 `requiredWhen/requiredUnless` 真正依赖到的少量路径
- **重渲染频率**: 大表单中几乎每次任意字段写入都会唤醒所有包着 `FieldFrame` / 使用 `useFieldPresentation` 的字段组件
- **建议**: 将字段展示态改为基于 `subscribeToPath(path, listener)` 的 per-path hook；把 `submitting` 单独订阅；动态 required 只订阅规则引用路径，避免对 `state.values` 全量广播
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/architecture/renderer-runtime.md`

### [维度05] Host projection scope 在 snapshot 变化时重建 ScopeRef
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\workbench\hooks.ts:16-37`
- **严重程度**: P1
- **订阅位置**: `useHostScope()` 中 `useMemo(() => runtime.createHostProjectionScope(...), [parentScope, path, runtime, scopeData, scopeLabel])`
- **订阅范围**: 整个 host projection 对象；`scopeData` 引用一变就新建整颗 host `ScopeRef`
- **实际需要**: 保持 `ScopeRef` 身份稳定，只把 projection 数据写回现有 scope store
- **重渲染频率**: 设计器 / 报表 / spreadsheet host snapshot 每次变化都会触发；会把依赖 `ScopeContext` 的整段子树一起带动
- **建议**: `createHostProjectionScope()` 只在 owner/path 真正变化时创建一次；后续通过 `scope.replace(...)` / store snapshot 更新 projection。当前实现还会放大上层 `useMemo` 失效带来的 scope 抖动
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/architecture/renderer-runtime.md`

### [维度05] DesignerContext 把 snapshot 混入单一 context，导致消费者过宽重渲染
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-page.tsx:303-314,408-465`
- **严重程度**: P1
- **订阅位置**: `DesignerContext.Provider value={ctxValue}`；`ctxValue` 同时包含 `snapshot`、`dispatch`、`config`、`openCreateDialog`
- **订阅范围**: 整个 `DesignerContextValue`
- **实际需要**: 多数消费者只需要稳定命令能力或配置；只有少数组件需要特定 snapshot 字段
- **重渲染频率**: 每次 designer core snapshot 更新都会使所有 `useDesignerContext()` 消费者重渲；包括画布节点/边、palette、toolbar、inspector 等热点组件
- **建议**: 拆分为稳定 context（`dispatch`/`config`/commands）和 snapshot selector hook；snapshot 读取改为 `useSyncExternalStore` + 细粒度 selector，而不是把整份 snapshot 放进单一 context value
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/architecture/renderer-runtime.md`

### [维度05] useOwnedAxisValue 订阅了整份 scope
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src\interaction-owner.ts:12-18`
- **严重程度**: P2
- **订阅位置**: `useScopeSelector((scope) => scope)`
- **订阅范围**: 当前可见 scope 全量数据
- **实际需要**: 仅 `input.statePath` 对应的单一路径值；`local` / `controlled` 模式甚至不需要 scope 订阅
- **重渲染频率**: 当前 scope 下任意字段变化都会唤醒该 hook，即使组件只关心一个 axis 状态
- **建议**: 仅在 `ownership === 'scope' && statePath` 时订阅 `getIn(scopeData, statePath)`；`local` / `controlled` 分支直接跳过 `useScopeSelector`
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/architecture/renderer-runtime.md`
