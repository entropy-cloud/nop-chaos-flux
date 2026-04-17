# 03 API 表面积与契约一致性

- Task ID: `ses_268cac7c9ffeGURGzSgzg1uNv3`
- Source prompt: `docs/skills/deep-audit-prompts.md`

# 维度03审计结论：API 表面积与契约一致性

## 总览

- 发现问题：9 项
  - P1: 3 项
  - P2: 5 项
  - P3: 1 项
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

### [维度03][F1] 测试支撑代码被作为 `flux-renderers-form` 根 API 公开
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\index.tsx:6-12`; `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\__tests__\form-test-support.tsx:22-164`
- **严重程度**: P1
- **发现方式**: 自动化 + 人工复核
- **现状**: 包根导出直接暴露了 `selectOption`、`submitCalls`、`notifyCalls`、`env`、probe renderers 等测试夹具。
- **风险**: 外部代码会把测试实现当成稳定公共 API，后续清理测试支撑将演变成破坏性变更。
- **建议**: 从根 barrel 移除 `./__tests__/form-test-support`；如果确实需要共享测试工具，改成显式子路径如 `@nop-chaos/flux-renderers-form/test-support`。
- **参考文档**: `docs/references/renderer-interfaces.md`

### [维度03][F2] `word-editor-renderers` 没有遵循 renderer 包统一的注册协议
- **文件**: `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\index.ts:1-18`
- **严重程度**: P1
- **发现方式**: 人工复核
- **现状**: 该包只导出普通 React 页面/工具栏/面板组件，没有 `RendererDefinition`、没有 `registerWordEditorRenderers()`、也没有 registry 入口。
- **风险**: 同名 “renderers” 包却不能像其它 renderer 包一样接入 registry，导致跨包契约不一致；同时与 `word-editor-page` 文档表述脱节。
- **建议**: 二选一收敛：要么正式补齐 `word-editor-page` 的 `RendererDefinition`/注册协议；要么将该包明确降格为普通 React 页面包并同步文档。
- **参考文档**: `docs/components/word-editor-page/design.md`, `docs/architecture/capability-projection-manifest.md`

### [维度03][F3] host publisher 的 `RendererDefinition.hostContract` 只在部分包中声明
- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\renderers.tsx:5-17`; `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\renderers.tsx:22-54`; 对照 `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\index.tsx:38-45`
- **严重程度**: P1
- **发现方式**: 人工复核
- **现状**: `designer-page` 已声明 `hostContract`，但 `spreadsheet-page` / `report-designer-page` 作为 host owner 仍未在定义层声明对应 contract。
- **风险**: 编译器/运行时无法统一依据 renderer definition 推断默认 host contract，host capability diagnostics 与发布协议会在不同 domain 包之间漂移。
- **建议**: 为所有 host owner renderer 统一补齐 `hostContract`；如果尚未准备好，则应缩窄文档，不再把未声明者视为默认 publisher。
- **参考文档**: `docs/architecture/capability-projection-manifest.md`

### [维度03][F4] `flux-renderers-basic` 根 API 泄露了内部样式/布局 helper
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src\index.tsx:20-21`; `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src\utils.ts:1-24`
- **严重程度**: P2
- **发现方式**: 人工复核
- **现状**: 根 barrel 公开了 `classNames`、`resolveDirection`、`resolveGap`、`GAP_TOKENS`。
- **风险**: 下游代码会依赖这组带具体布局语义的 helper，反向冻结当前实现细节，阻碍 renderer styling contract 继续收敛。
- **建议**: 取消根导出 `./utils`；仅保留 renderer/schema 层稳定契约，内部 helper 维持私有。
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

### [维度03][F8] 多个 `src/` 文件已成为未接线死代码
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-core\src\core-shell-commands.ts:1-95`; `C:\can\nop\nop-chaos-flux\packages\flux-code-editor\src\extensions\sql\index.ts:1-3`; `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\schema-compiler\index.ts:1-15`
- **严重程度**: P3
- **发现方式**: 自动化 + 人工复核
- **现状**: 这些模块既没有被 package root index 导出，也没有被任何活跃源码引用。
- **风险**: 维护者会误判当前真实 API/实现边界，增加审计噪音与后续误用概率。
- **建议**: 删除无用模块；如果原本 intended public，则必须接回根 barrel 或显式子路径。
- **参考文档**: `docs/architecture/frontend-baseline.md`

### [维度03][F9] `report-designer-renderers` 根 API 暴露了单一实现专用 helper
- **文件**: `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\index.ts:29-35`; `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\report-designer-toolbar-helpers.ts:4-133`
- **严重程度**: P2
- **发现方式**: 自动化 + 人工复核
- **现状**: 包根公开了 `evalBooleanExpr`、`evalTextTemplate`、`toCommand`、`mergeToolbarItems`、`readState`、`buildReportDesignerScopeData`、`useReportDesignerHostScope` 等 toolbar/host wiring helper。
- **风险**: 公共 API 绑定到当前 report designer toolbar/host 的内部实现，阻碍后续重构与契约收敛。
- **建议**: 根 API 保留 renderer definitions、schema/bridge 类型与主组件；实现 helper 改为内部模块或显式内部子路径。
- **参考文档**: `docs/architecture/report-designer/contracts.md`

## 其余每包 API 表面积报告、exports 对齐性、文档完整性总结与优先级建议见原审计输出。核心结论保留如下：

- `flux-renderers-form` 根 API 不应暴露测试支撑。
- `word-editor-renderers` 与其它 domain renderer 的注册协议不一致。
- `flux-react` / `flux-runtime` 根 barrel 暴露了过多内部 wiring primitive。
- `PageStoreApi` 的代码/文档契约未对齐。
- 存在少量未接线死代码文件，建议清理。
