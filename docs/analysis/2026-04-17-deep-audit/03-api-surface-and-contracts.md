# 03 API 表面积与契约一致性

- Task ID: `ses_268cac7c9ffeGURGzSgzg1uNv3`
- Source prompt: `docs/skills/deep-audit-prompts.md`

# 维度03审计结论：API 表面积与契约一致性

## 总览

- 校准后保留问题：4 项
  - P1: 1 项
  - P2: 3 项
- 自动化检查覆盖：
  - 根 barrel / `package.json#exports` 对齐
  - `packages/*/src/index.ts(x)` 公开导出扫描
  - 死代码候选文件扫描
  - 跨包 `RendererComponentProps` / `ScopeRef` / `FormStoreApi` / `PageStoreApi` 引用扫描
- 人工复核覆盖：
  - host publisher 契约一致性
  - 公开 API 是否泄露内部实现
  - 文档与代码契约是否一致

## 已核对且未发现异常

- `RendererComponentProps` 使用口径基本一致：各 renderer 包均直接从 `@nop-chaos/flux-core` 引入，没有发现 `flux-react` 再导出一个不同版本并被混用。
- `ScopeRef` 接口与 `createScopeRef()` 实现匹配，没有发现缺项或签名漂移。
- 未发现“类型从 A 包 `import type` 后在 B 包 re-export 并附加不同约束”的实质性案例。
- `FormStoreApi` 已有较完整的参考文档：`docs/references/form-validation-runtime-types.md:307-364`。

### [维度03][F1] `flux-renderers-form` 测试支撑已从根 API 收口

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\index.tsx:6-12`; `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\__tests__\form-test-support.tsx:22-164`
- **严重程度**: 已修复
- **发现方式**: 自动化 + 人工复核
- **现状**: 根 barrel 已移除测试夹具导出；共享测试工具改为显式子路径 `@nop-chaos/flux-renderers-form/test-support`。
- **落地**: `packages/flux-renderers-form/src/index.tsx`, `packages/flux-renderers-form/src/test-support.tsx`, `packages/flux-renderers-form/package.json`, `vite.workspace-alias.ts`, `tsconfig.base.json`，以及相关测试引用已同步更新。
- **参考文档**: `docs/references/renderer-interfaces.md`

### [维度03][F2] `word-editor-renderers` 注册协议与文档契约已收敛

- **文件**: `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\index.ts:1-18`
- **严重程度**: 已修复
- **发现方式**: 人工复核
- **现状**: `word-editor-page` 已补齐 `RendererDefinition`、`registerWordEditorRenderers()`、host manifest、`word-editor:*` namespace provider，并改为通过 `SchemaRenderer` 接入 playground。
- **落地**: `packages/word-editor-renderers/src/renderers.tsx`, `src/types.ts`, `src/word-editor-manifest.ts`, `src/word-editor-action-provider.ts`, `src/WordEditorPage.tsx`, `apps/playground/src/pages/WordEditorPage.tsx`。
- **参考文档**: `docs/components/word-editor-page/design.md`, `docs/architecture/capability-projection-manifest.md`

### [维度03][F3] host publisher 的 `RendererDefinition.hostContract` 已补齐并接入编译诊断

- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\renderers.tsx:5-17`; `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\renderers.tsx:22-54`; 对照 `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\index.tsx:38-45`
- **严重程度**: 已修复
- **发现方式**: 人工复核
- **现状**: `spreadsheet-page`、`report-designer-page`、`word-editor-page` 已在 renderer definition 上声明 `hostContract`，schema compiler 也已支持从 renderer definition 自动解析 host manifest、`xui:version` 和 capability publication attribution。
- **落地**: `packages/spreadsheet-renderers/src/renderers.tsx`, `packages/report-designer-renderers/src/renderers.tsx`, `packages/word-editor-renderers/src/renderers.tsx`, `packages/flux-runtime/src/schema-compiler/shape-validation.ts`, `packages/flux-runtime/src/schema-compiler/host-action-validation.ts`, `packages/flux-runtime/src/schema-compiler-diagnostics.test.ts`。
- **参考文档**: `docs/architecture/capability-projection-manifest.md`

### [维度03][F4] `flux-renderers-basic` 根 API 泄露了内部样式/布局 helper

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src\index.tsx:20-21`; `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src\utils.ts:1-24`
- **严重程度**: P2
- **发现方式**: 人工复核
- **现状**: 根 barrel 之前公开了 `classNames`、`resolveDirection`、`resolveGap`、`GAP_TOKENS`；本轮已移除 `./utils` 根导出。
- **风险**: 若仍有外部消费者，后续需要通过显式内部子路径或局部复制处理，而不应继续冻结在根公共面。
- **建议**: 保持 `packages/flux-renderers-basic/src/utils.ts` 为内部实现文件，不再回滚到根 API。
- **参考文档**: `docs/architecture/styling-system.md`

### [维度03][F5] `flux-react` 根 API 暴露了大量内部 wiring primitive

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\index.tsx:4-9`; `C:\can\nop\nop-chaos-flux\packages\flux-react\src\index.tsx:42-57`; `C:\can\nop\nop-chaos-flux\packages\flux-react\src\helpers.tsx:66-143`; `C:\can\nop\nop-chaos-flux\packages\flux-react\src\contexts.ts:15-34`
- **严重程度**: P2
- **发现方式**: 人工复核
- **现状**: 包根公开了 `RuntimeContext`/`ScopeContext` 等 context、`createHelpers`、`mergeActionContext`、`rendererHooks`、`EMPTY_SCOPE_DATA` 等低层实现对象。
- **风险**: 外部包会直接绑定 React host wiring，而不是绑定稳定 hooks/renderer boundary；这会放大未来重构的破坏面。
- **建议**: 将公共面收敛到已文档化的 hooks、组件、Workbench API；对 wiring primitive 改成内部子路径或补齐正式文档。
- **参考文档**: `docs/references/renderer-interfaces.md`, `docs/references/terminology.md`

### [维度03][F6] `flux-runtime` 根 API 暴露了未被参考文档定义的运行时内脏

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\index.ts:52-62`; `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\api-cache.ts:129-143`; `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\request-runtime.ts:97-176`
- **严重程度**: P2
- **发现方式**: 人工复核
- **现状**: 根 barrel 公开了 `createProjectedScopeStore`、`createReadonlyScopeBinding`、`publishOwnerStatus`、`resolveCacheKey`、`prepareApiData`、`buildUrlWithParams` 等低层 helper。
- **风险**: 其它包或外部调用方把内部机制当作稳定扩展点，导致 runtime 实现细节被公共 API 锁死。
- **建议**: 将确属内部的 helper 移出根 barrel；若要保留公开，则在 references/architecture 中明确其稳定性与使用边界。
- **参考文档**: `docs/references/renderer-interfaces.md`, `docs/architecture/flux-runtime-module-boundaries.md`

### [维度03][F7] `PageStoreApi` 代码契约已收敛，但文档仍冲突且缺少完整参考说明

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-core\src\types\runtime.ts:189-195`
- **严重程度**: P2
- **发现方式**: 人工复核
- **现状**: 代码中 `PageStoreApi` 只有 `getState/subscribe/setData/updateData/refresh`；`terminology.md` 也已移除 dialog ownership，但 `docs/architecture/flux-core.md` 仍写着 “dialogs” 属于 `PageStoreApi`。
- **风险**: 包消费者会读到相互矛盾的 ownership 说明，而且缺少类似 `FormStoreApi` 的方法级参考文档。
- **建议**: 修正 `docs/architecture/flux-core.md`，并为 `PageStoreApi` 补一份方法级 reference。
- **参考文档**: `docs/architecture/flux-core.md`, `docs/references/terminology.md`, `docs/references/renderer-interfaces.md`

### [维度03][F8] “死代码”结论已从主结论移除

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-core\src\core-shell-commands.ts:1-95`; `C:\can\nop\nop-chaos-flux\packages\flux-code-editor\src\extensions\sql\index.ts:1-3`; `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\schema-compiler\index.ts:1-15`
- **严重程度**: 已移除
- **发现方式**: 自动化 + 人工复核
- **现状**: 复核后不能整体按“死代码”成立；其中一部分更接近内部 barrel 或后续切片保留位。
- **建议**: 仅将真正长期未接线的单文件候选留给后续逐项清理，不再把 F8 作为统一缺陷结论保留。
- **参考文档**: `docs/architecture/frontend-baseline.md`

### [维度03][F9] `report-designer-renderers` 根 API 暴露了单一实现专用 helper

- **文件**: `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\index.ts:29-35`; `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\report-designer-toolbar-helpers.ts:4-133`
- **严重程度**: P2
- **发现方式**: 自动化 + 人工复核
- **现状**: 包根公开了 `evalBooleanExpr`、`evalTextTemplate`、`toCommand`、`mergeToolbarItems`、`readState`、`buildReportDesignerScopeData`、`useReportDesignerHostScope` 等 toolbar/host wiring helper。
- **风险**: 公共 API 绑定到当前 report designer toolbar/host 的内部实现，阻碍后续重构与契约收敛。
- **建议**: 根 API 保留 renderer definitions、schema/bridge 类型与主组件；实现 helper 改为内部模块或显式内部子路径。
- **参考文档**: `docs/architecture/report-designer/contracts.md`

## 当前剩余重点

- `flux-react` / `flux-runtime` 根 barrel 仍需要进一步区分“事实公共扩展点”与“内部 wiring primitive”。
- `PageStoreApi` 的 architecture/reference 文档仍需补齐并与代码一致。
- `report-designer-renderers` 根导出仍偏宽，但本轮未在没有外部消费证据的前提下继续硬砍公共面。
