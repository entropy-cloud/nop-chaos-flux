# 维度 03: API 表面积与契约一致性

## 第 1 轮（初审）

### [维度03-01] Flow Designer host manifest 声明了 args contract，但 provider 主路径用强制转换与默认值绕过结构化校验

- **文件**: `packages/flow-designer-renderers/src/designer-action-provider.ts:55-66`
- **行号范围**: `55-66`
- **证据片段**:
  ```ts
  invoke(method, payload, ctx) {
    switch (method) {
      case 'addNode': {
        const result = adapter.execute({
          type: 'addNode',
          nodeType: String(payload?.nodeType ?? ''),
          position: (payload?.position as { x: number; y: number } | undefined) ?? {
            x: 200,
            y: 120,
          },
          data: payload?.data as Record<string, unknown> | undefined,
  ```
- **严重程度**: P1
- **现状**: `FLOW_DESIGNER_MANIFEST_V1` 发布了 `designer:addNode`、`moveNode`、`setViewport` 等方法的 `FluxValueShape` 参数契约，但运行时 `createDesignerActionProvider()` 没有按 manifest shape 做统一校验，而是通过 `String(...)`、`as { x; y }`、默认 position 等方式把任意 payload 适配成命令。
- **风险**: 编译期/工具侧看到的是 typed host capability contract，运行时 provider 实际接受更宽的对象并静默改写缺失字段；schema 或外部 host 调用中错误 payload 可能被降级成空字符串、默认坐标或错误命令，导致 manifest 不再是真实执行契约。
- **建议**: 像 `spreadsheet-renderers` / `report-designer-renderers` 一样，在 flow designer provider 中引入基于 `designerCapabilities.methods` 的 `validateMethodPayload()`；校验失败应返回结构化 `ActionResult` error，而不是默认化为合法命令。
- **为什么值得现在做**: 当前审计基线是 v1 / 无兼容负担，host manifest 已经从 root entry 公开导出并进入 `RendererDefinition.hostContract`，这已经是 live public API，不应保留“声明严格、执行宽松”的主路径。
- **误报排除**: 这不是“manifest 只服务编译期、runtime 不做 result conformance”的情形；owner 文档明确要求检查 manifest 声明的方法签名和参数 shape 是否在 provider/adapter 端实际 enforce。这里不是结果 shape，而是输入 args shape 被 provider 主路径绕过。
- **历史模式对应**: 对应 deep-audit 共享提示词中维度 03 的“manifest -> provider/adapter payload enforce”专项；也避开了 calibration pattern 5 的“中间态”降级，因为当前 v1 基线不接受公开主路径过渡残留。
- **参考文档**: `docs/architecture/capability-projection-manifest.md:776-790`, `docs/architecture/action-scope-and-imports.md:671-713`, `docs/references/renderer-interfaces.md:177-183`
- **复核状态**: 未复核

### [维度03-02] Flow Designer manifest 与 provider 方法集合不一致，`navigate-back` 只在 wrapper 中临时合成

- **文件**: `packages/flow-designer-renderers/src/designer-manifest.ts:277-283`
- **行号范围**: `277-283`, `122-135`
- **证据片段**:
  ```ts
  'navigate-back': {
    description: 'Invoke the upstream navigation-back handler when the designer host exposes one.',
  },
  beginTransaction: {
    args: {
      kind: 'object',
  ```
  ```ts
  return {
    kind: designerProvider.kind ?? 'host',
    listMethods() {
      const methods = designerProvider.listMethods?.() ?? [];
      if (methods.includes('navigate-back')) {
        return methods;
      }
      return [...methods, 'navigate-back'];
    },
    invoke(method, payload, ctx) {
      if (method === 'navigate-back') {
        return upstreamBackHandler.provider.invoke(upstreamBackHandler.method, payload, ctx);
  ```
- **严重程度**: P2
- **现状**: Manifest 将 `designer:navigate-back` 声明为 designer host capability，但基础 `createDesignerActionProvider()` 的 `listMethods()` / `switch` 并不包含该方法；只有 `createDesignerActionProviderWithUpstreamBack()` 在存在 upstream back handler 时把它合成进方法表。
- **风险**: Tooling/编译诊断会认为 `designer:navigate-back` 是稳定 host capability，但具体运行时 provider 可能返回 unknown method，形成“manifest 可调用、provider 未发布”的公开契约漂移。
- **建议**: 二选一收敛：要么把 `navigate-back` 从 `FLOW_DESIGNER_MANIFEST_V1` 移到一个明确可选/region-specific/upstream capability contract；要么让基础 designer provider 显式实现该方法并在无 upstream handler 时返回稳定的 unavailable 结果。
- **为什么值得现在做**: 当前 manifest 通过 `flow-designer-renderers/src/index.tsx` root entry 公开导出，且 `designer-page` renderer definition 带 `hostContract`；这会影响 schema authoring 与 host action validation 的公共面。
- **误报排除**: 这不是“region-scoped capability publication”本身的问题；region-scoped 说明可见范围，但不能解释同一 manifest 方法在 provider 方法表中时有时无、且没有 manifest 层 optional 标识。
- **历史模式对应**: 对应 reopened adjudications 中“旧问题旁边的新 residual”口径：不是重报 flow designer host bridge 存在性，而是 manifest/provider 方法集合一致性的新 live contract 问题。
- **参考文档**: `docs/architecture/capability-projection-manifest.md:589-614`, `docs/architecture/action-scope-and-imports.md:440-453`
- **复核状态**: 未复核

### [维度03-03] `@nop-chaos/flux-react/unstable` 已成为一线 renderer 主路径依赖，公开 API 表面积与 RendererComponentProps/hooks 契约分裂

- **文件**: `packages/flux-react/src/unstable.ts:1-28`
- **行号范围**: `1-28`
- **证据片段**:
  ```ts
  export { mergeActionContext, createHelpers, EMPTY_SCOPE_DATA } from './helpers.js';
  export { RenderNodes } from './render-nodes.js';
  export { rendererHooks } from './hooks.js';
  export type { FormLayoutContextValue } from './contexts.js';
  export {
    ActionScopeContext,
    ClassAliasesContext,
    ComponentRegistryContext,
    FormContext,
    FormLayoutContext,
    NodeMetaContext,
  ```
- **严重程度**: P1
- **现状**: `flux-react` package exports map 公开 `./unstable`，并导出 Context、`RenderNodes`、`createHelpers`、runtime helper re-export。多个主路径 renderer 包直接从该 subpath 导入 Context 或 runtime helper，而不是只通过 root entry hooks / `RendererComponentProps` 工作。
- **风险**: “unstable” 实际承担跨包公共 API，导致 renderers 可以绕过 `useRendererRuntime()`、`useRenderScope()`、`useCurrentForm()` 等标准 hook 边界，公开面同时存在稳定 hooks 与 unstable Context 两套契约；后续收敛 Context/provider 结构时会被 first-party package 消费锁死。
- **建议**: 将确属公共契约的 Context/provider 或 helper 提升为明确命名的稳定 API，并在 owner 文档记录使用边界；其余内部 wiring 不应通过 package exports 暴露给主路径 renderer。第一轮可先把各 renderer 对 `unstable` 的使用分类为“必须公共”与“应由 hook/RendererComponentProps 替代”。
- **为什么值得现在做**: v1 基线下不能把 live public subpath 视作临时过渡；`@nop-chaos/flux-react/unstable` 已被 `flux-renderers-form`、`flux-renderers-form-advanced`、`flux-renderers-data`、`flow-designer-renderers`、测试和 host renderer 主路径消费。
- **误报排除**: 不是单纯“存在 unstable export”即报；问题在于该 subpath 已是 package exports map 的公开面，并被一线 renderer 实现导入，直接影响 RendererComponentProps/hooks 契约一致性。
- **历史模式对应**: 命中 calibration pattern 5 的“中间态/过渡态”表象，但当前 v1 override 明确不能用“unstable/迁移中”降级 live public API 问题。
- **参考文档**: `AGENTS.md:118-143`, `docs/references/renderer-interfaces.md:201-226`, `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

### [维度03-04] `flux-renderers-form` root entry 公开 field-utils 与 renderer factory，跨包复用内部字段控制器契约

- **文件**: `packages/flux-renderers-form/src/index.tsx:4-14`
- **行号范围**: `4-14`
- **证据片段**:
  ```ts
  export { FormRenderer } from './renderers/form.js';
  export {
    createFieldValidation,
    createInputRenderer,
    inputRendererDefinitions,
    validateInputFieldSchema,
  } from './renderers/input.js';
  export { fieldsetRendererDefinition } from './renderers/fieldset.js';
  export * from './renderers/shared/index.js';
  export * from './field-utils.js';
  export * from './schemas.js';
  ```
- **严重程度**: P2
- **现状**: form 包 root entry 不只导出 renderer definitions / schemas，还把 `createInputRenderer`、`createFieldValidation`、`field-utils` 下的读取、presentation、handler、hidden-policy 等内部 field controller API 全量公开。`flux-renderers-form-advanced` 已通过 root entry 直接导入 `formFieldRules`、`useFieldPresentation`。
- **风险**: 表单字段内部控制器逻辑被跨包当作稳定 API 后，FormStoreApi/ValidationScopeRuntime/FieldFrame 的内部演进会被 root public surface 锁住；同时 docs 的公开 renderer contract 只描述 `RendererComponentProps`、hooks 与 store/runtime 类型，没有把这些细粒度 field-utils 定义为公共契约。
- **建议**: 收敛为明确分层：root 只导出 renderer 注册、definition、schema 与少量有文档的公共 field extension API；跨包高级字段真正需要的共享能力移到命名稳定 subpath（例如 `./field-extension`）并补充 reference 文档，其余 hook/helper 改为包内私有。
- **为什么值得现在做**: 这已经不是未接线代码；高级表单包主路径依赖这些导出。v1 下如果继续保留 root 全量 re-export，会把当前内部实现形状固化为公共 API。
- **误报排除**: 不是反对高级字段复用基础字段能力；问题是复用边界没有命名、没有文档、且通过 root `export *` 扩散，超出 owner 文档列出的 renderer/runtime 公共契约。
- **历史模式对应**: 对应 calibration pattern 10“跨包一致性想法”需要更强证据；这里的强证据是 root public API 已被另一个 package 主路径消费，形成真实契约锁定风险。
- **参考文档**: `docs/references/renderer-interfaces.md:148-190`, `docs/architecture/form-validation.md`, `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

## 每个包 API 表面积报告

- `@nop-chaos/flux-core`: root entry 聚合 `types.js`、schema diagnostics、validation model、constants、compiled cid、value adapter、registry、class aliases、path/object/schema utilities、runtime host reporting、named action provider、strict mode、workbench 类型、runtime inspection；未发现单独问题。
- `@nop-chaos/flux-runtime`: root entry 导出 runtime factory、module cache、host projection scope type、action scope、component registry、form component handle、scope dependency helpers、status owner、projected scope store、API execution、form status summary；[维度03-03] 间接相关。
- `@nop-chaos/flux-react`: root entry 导出 schema renderer、default env/registry、lazy/auto renderer component、React contract aliases、slot helpers、DialogHost、FieldFrame、标准 hooks、form-state selectors、workbench hooks/shell、container hooks、source/status/form publication hooks、structural loop provider、gap resolver；[维度03-03]。
- `@nop-chaos/flux-compiler`: 导出 schema/action/source/reaction compiler、diagnostics context、host action validation helpers、FluxValueShape validation、validation lowering helpers；无发现。
- `@nop-chaos/flux-action-core`: 导出 action core、operation control、dispatcher、debounce helper；无发现。
- `@nop-chaos/flux-formula`: 导出 formula/expression compiler、parser/evaluator、formula registry、date helper、AST binding、scope dependency collector；无发现。
- `@nop-chaos/flux-i18n`: 导出 i18n 初始化、语言切换、翻译函数、资源添加、hooks、locale bundles；无发现。
- `@nop-chaos/ui`: root entry 批量导出 shadcn/base-ui 风格组件、toolbar、Toaster/toast、`cn`、mobile hook、icon utils、i18n getter setter；无发现。
- `@nop-chaos/flux-renderers-basic`: 导出 schemas、基础 renderer component、`basicRendererDefinitions`、`registerBasicRenderers`；无发现。
- `@nop-chaos/flux-renderers-form`: 导出 form definitions、FormRenderer、input renderer factory/validation helper、fieldset definition、shared field UI、field-utils、schemas；[维度03-04]。
- `@nop-chaos/flux-renderers-form-advanced`: 导出 advanced form renderer components/definitions、condition-builder types、composite schemas、composite item id、tree options、注册函数；[维度03-04] 相关。
- `@nop-chaos/flux-renderers-data`: 导出 schemas、crud schema、table/data-source/chart/tree/crud renderer、data renderer definitions、注册函数；[维度03-03] 相关。
- `@nop-chaos/flux-code-editor`: 导出 code editor schema/types、resolver hooks、CodeMirror hook、lazy renderer definition、注册函数；无发现。
- `@nop-chaos/flow-designer-core`: 导出 domain types、designer core factory/type、config normalize、ELK/tree layout、tree projection、tree domain adapter registry；无发现。
- `@nop-chaos/flow-designer-renderers`: root entry 导入 CSS，导出 schemas、designer action provider、manifest/hostContract/capability publication、renderer definitions/registry helpers；[维度03-01], [维度03-02], [维度03-03] 相关。
- `@nop-chaos/spreadsheet-core`: 导出 spreadsheet document/runtime/config/command 类型、type helpers、core factory；无发现。
- `@nop-chaos/spreadsheet-renderers`: 导出 bridge/snapshot、host action provider、page schema helper/types、renderer definitions、cell style map、toolbar/grid/interactions hooks、manifest/hostContract/capability publication；provider 端实际校验 manifest args；无发现。
- `@nop-chaos/report-designer-core`: 导出 report designer domain types、command types、adapter/profile contracts、core factory；无发现。
- `@nop-chaos/report-designer-renderers`: 导入 CSS，导出 bridge/event emitter、page schema/types、renderer definitions、manifest/hostContract/capability publication、field panel、schemas、host-data hooks/helpers、host action provider、canvas component；provider 端校验 manifest args；无发现。
- `@nop-chaos/word-editor-core`: 导出 canvas editor bridge/store/document IO/template expression/tag/dataset/chart/code model 等 domain API；无发现。
- `@nop-chaos/word-editor-renderers`: 导入 CSS，导出 WordEditorPage、renderer definitions/schema helper、manifest/hostContract/capability publication、word editor action provider；本轮无初审发现。
- `@nop-chaos/nop-debugger`: 导出 debugger types、panel、controller/report/automation/window flag API；无发现。
- `@nop-chaos/flux`: 聚合默认 renderer registry/env/schema renderer，导出 bundle-facing `Flux*` 类型与 CSS root class；无发现。
- `@nop-chaos/tailwind-preset`: 导出 `nopTailwindPreset`；无发现。
- `@nop-chaos/theme-tokens`: TS API 表面积为空模块 `export {}`；无发现。

## 问题清单

- [维度03-01] `packages/flow-designer-renderers/src/designer-action-provider.ts:55-66` — Flow Designer manifest args contract 未在 provider 端结构化 enforce。
- [维度03-02] `packages/flow-designer-renderers/src/designer-manifest.ts:277-283` / `designer-page-helpers.tsx:122-135` — `navigate-back` manifest 方法与基础 provider 方法集合不一致。
- [维度03-03] `packages/flux-react/src/unstable.ts:1-28` — `flux-react/unstable` 已成为一线 renderer 主路径公共 API，分裂标准 hooks/RendererComponentProps 契约。
- [维度03-04] `packages/flux-renderers-form/src/index.tsx:4-14` — form 包 root entry 公开内部 field-utils 与 renderer factory，跨包锁定未文档化字段控制器契约。
