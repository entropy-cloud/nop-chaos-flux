# 维度 18：跨包模式一致性

## 审核范围

检查渲染器注册模式、domain core/renderers 分层、hook 使用、错误处理、store 创建、国际化的跨包一致性。

## 发现清单

### [维度18] detail-field/variant-field 异步操作缺少取消机制

- **涉及包**: `flux-renderers-form-advanced`
- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`, `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`
- **严重程度**: P2
- **不一致类别**: 错误处理
- **包 A 模式**: 其他表单渲染器的异步操作使用 AbortController 取消。
- **包 B 模式**: detail-field 的 draft form 操作和 variant-field 的 async dispatch 缺少 AbortController。
- **统一建议**: 为 detail-field 和 variant-field 的异步操作添加 AbortController 支持。
- **风险**: draft form 泄漏和状态竞态风险。
- **复核状态**: 维度复核通过

### [维度18] flux-code-editor 使用手动循环注册渲染器

- **涉及包**: `flux-code-editor` vs 其他 renderers 包
- **文件**: `packages/flux-code-editor/src/`
- **严重程度**: P3
- **不一致类别**: 注册模式
- **包 A 模式**: 其他 renderers 包使用 `registerRendererDefinitions` 统一注册。
- **包 B 模式**: flux-code-editor 使用手动循环注册。
- **统一建议**: 迁移到 `registerRendererDefinitions` 模式。
- **复核状态**: 维度复核通过

### 已驳回项

1. **domain renderers 使用 useSyncExternalStore 直接访问 domain core store** — 这是标准实践。flow-designer-renderers、spreadsheet-renderers 等访问自己的 domain core store，不是 flux store。使用 useSyncExternalStore 是 Zustand vanilla store 的标准 React 集成方式。
2. **className 使用模式不完全一致** — 仅 1 个非渲染器文件受影响，不影响外部契约。
3. **store 创建模式差异** — 不同 domain 有不同的 store 结构需求，内部实现差异不构成问题。

## 已确认的一致性

- 渲染器注册模式：所有 flux-renderers-\* 包使用 RendererDefinition[] + registerXxxRenderers ✓（code-editor 除外）
- Domain core/renderers 分层：所有 domain 包遵守 core（无 React）→ renderers（React）分层 ✓
- Hook 使用：所有渲染器使用相同的标准 hook 组合 ✓
- Store 创建：所有包使用 Zustand vanilla store + use-sync-external-store ✓
- 国际化：用户可见文本通过 flux-i18n 管理 ✓

## 总结评估

1 个 P2（detail-field/variant-field 异步取消），1 个 P3（code-editor 注册模式）。domain renderers 直接使用 useSyncExternalStore 已确认为合理实践。
