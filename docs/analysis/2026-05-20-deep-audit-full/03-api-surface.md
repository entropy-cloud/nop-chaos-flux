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

## 深挖第 2 轮追加

### [维度03-05] Word Editor manifest 声明完整 insertChart/insertCode args shape，但 provider 只做类型强转 + 业务 validator，未按 FluxValueShape 结构化 enforce

- **文件**: `packages/word-editor-renderers/src/word-editor-manifest.ts:133-149`, `packages/word-editor-renderers/src/word-editor-action-provider.ts:98-116`, `packages/word-editor-core/src/chart-model.ts:35-56`
- **行号范围**: `word-editor-manifest.ts:133-149`, `word-editor-action-provider.ts:98-116`, `chart-model.ts:35-56`
- **证据片段**:

  ```ts
  insertChart: {
    args: chartShape,
    description: 'Insert a chart placeholder tag and persist its metadata.',
  },
  insertCode: {
    args: codeShape,
    description: 'Insert a barcode or QR-code placeholder tag and persist its metadata.',
  },
  ```

  ```ts
  case 'insertChart': {
    const chart = payload as DocChart | undefined;
    const validation = validateDocChart(chart ?? {});
    if (!chart?.id || !validation.valid) {
      return fail('insertChart requires a complete chart payload.');
    }
    input.bridge.insertChart(chart);
  ```

  ```ts
  if (!chart.chartName || chart.chartName.trim() === '') {
    errors.push('Chart name is required');
  }

  if (!chart.chartType || !VALID_CHART_TYPES.includes(chart.chartType)) {
    errors.push('Chart type must be one of: bar, line, pie, scatter, area');
  }
  ```

- **严重程度**: P1
- **现状**: `WORD_EDITOR_MANIFEST_V1` 通过 `chartShape` / `codeShape` 发布了完整结构化 args contract，但 `createWordEditorActionProvider()` 没有复用 manifest shape 做结构校验，而是把 `payload as DocChart` / `payload as DocCode` 后交给 core validator。core validator 主要校验业务完整性，并假设字段已有正确类型。
- **风险**: manifest 与运行时执行契约仍可能漂移：例如 `showChartName` 在 manifest 中要求 boolean，但 `validateDocChart()` 不校验该字段类型，错误 payload 可进入 `bridge.insertChart()`；反过来，`chartName` / `codeName` 等字段若传入非 string truthy 值，validator 的 `.trim()` 路径可能抛出异常而不是返回结构化 `ActionResult` error。schema authoring / tooling 看到的是 FluxValueShape contract，provider 主路径实际执行的是另一个未完全等价的业务 validator contract。
- **建议**: 像 `spreadsheet-renderers` / `report-designer-renderers` 一样，在 word-editor provider 中基于 `WORD_EDITOR_MANIFEST_V1.capabilities.methods` 做统一 `validateMethodPayload()`；通过 shape 校验后再调用 core 业务 validator。校验失败应返回稳定 `{ ok: false, error }`，不要让类型错误冒泡。
- **为什么值得现在做**: word-editor manifest、hostContract、capability publication 和 provider 都已从 root entry 公开导出，且 owner docs 已声明 provider enforcement 与 manifest 契约一致；当前 residual 会继续误导 host action 调用方。
- **误报排除**: 这不是重复报告旧的 R24 “provider 只校验 id + name”问题；live code 已改为调用 core validators。本发现是新的 residual：业务 validator 不等同于 manifest `FluxValueShape` 结构校验，仍存在 shape 字段未校验和类型错误抛异常路径。
- **历史模式对应**: 对应维度 03 “manifest → provider/adapter payload enforce”专项；也符合 reopened adjudications 的“旧问题旁边的新 residual”口径。
- **参考文档**: `docs/architecture/capability-projection-manifest.md:776-790`, `docs/components/word-editor-page/design.md:132-138`, `docs/architecture/word-editor/design.md:174-177`
- **复核状态**: 未复核

### [维度03-06] Word Editor provider 返回 chartId/codeId，但 manifest 未声明 insertChart/insertCode result shape

- **文件**: `packages/word-editor-renderers/src/word-editor-manifest.ts:143-149`, `packages/word-editor-renderers/src/word-editor-action-provider.ts:104-116`
- **行号范围**: `word-editor-manifest.ts:143-149`, `word-editor-action-provider.ts:104-116`
- **证据片段**:
  ```ts
  insertChart: {
    args: chartShape,
    description: 'Insert a chart placeholder tag and persist its metadata.',
  },
  insertCode: {
    args: codeShape,
    description: 'Insert a barcode or QR-code placeholder tag and persist its metadata.',
  },
  ```
  ```ts
  input.bridge.insertChart(chart);
  input.setCharts([...input.getCharts(), chart]);
  return ok({ chartId: chart.id });
  ```
  ```ts
  input.bridge.insertCode(code);
  input.setCodes([...input.getCodes(), code]);
  return ok({ codeId: code.id });
  ```
- **严重程度**: P2
- **现状**: `word-editor:insertChart` / `word-editor:insertCode` 的 provider 成功路径分别返回 `{ chartId }` / `{ codeId }`，但 manifest 只声明 args 和 description，没有声明 result shape。
- **风险**: host action 的 chained action / tooling / docs 无法从 manifest 获得真实返回数据契约；schema 作者可能无法可靠消费 `result.chartId` / `result.codeId`，而实际 provider 又已经把这些字段作为可观察返回值发布出来。
- **建议**: 在 manifest 中为 `insertChart` / `insertCode` 补充 result shape，例如 `{ kind: 'object', fields: { chartId: { kind: 'string' } } }` 与 `{ codeId: { kind: 'string' } }`；或如果这些返回值不应成为公共 contract，则从 provider 返回数据中移除。
- **为什么值得现在做**: 这直接影响 host action 返回值契约和 chained action authoring 可发现性；修复只需让 manifest 与现有 provider 返回对齐，ROI 明确。
- **误报排除**: `capability-projection-manifest.md` 明确说明 runtime result conformance checking 不是默认热路径要求；本发现不是要求运行时校验 result，而是指出 manifest 没有如实声明 provider 已公开返回的 `ActionResult.data` shape。
- **历史模式对应**: 对应维度 03 的“契约一致性盲区”和 manifest/provider parity 检查；不是 flow designer result/path 的重复问题。
- **参考文档**: `docs/architecture/capability-projection-manifest.md:595-607`, `docs/references/renderer-interfaces.md:177-183`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度03-07] Spreadsheet manifest 将大量需要结构化参数的 host actions 声明为无 args，provider 因此接受任意对象并直接转发到 core command

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-manifest.ts:281-289`, `packages/spreadsheet-renderers/src/host-action-provider.ts:73-95`, `packages/spreadsheet-core/src/commands-base.ts:173-184`
- **行号范围**: `spreadsheet-manifest.ts:281-289`, `host-action-provider.ts:73-95`, `commands-base.ts:173-184`
- **证据片段**:
  ```ts
  insertRow: {
    description: 'Insert one or more rows.',
  },
  insertColumn: {
    description: 'Insert one or more columns.',
  },
  deleteRow: {
    description: 'Delete one or more rows.',
  },
  ```
  ```ts
  if (!contract?.args) {
    if (payload === undefined) {
      return { ok: true, args: {} };
    }
    if (isCommandRecord(payload)) {
      return { ok: true, args: payload };
    }
  ```
  ```ts
  export interface InsertRowCommand extends SpreadsheetCommandBase {
    type: 'spreadsheet:insertRow';
    sheetId: string;
    row: number;
    count?: number;
  }
  ```
- **严重程度**: P1
- **现状**: `SPREADSHEET_HOST_METHOD_CONTRACTS` 中 `insertRow`、`insertColumn`、`deleteRow`、`renameSheet`、`copyCells`、`setCellFontFamily`、`find`、`replaceAll` 等大量方法只有 description，没有声明 core command 实际必需的 args；provider 在 `!contract?.args` 分支会接受任意 object payload 并通过 `{ type: \`spreadsheet:${method}\`, ...validation.args }` 转发。
- **风险**: 编译器/工具侧会把这些 host actions 视作无结构化参数契约，无法发现缺少 `sheetId`、`row`、`target`、`options` 等错误；运行时又把任意对象强行转成 core command，导致 manifest “可调用面”与 core command contract 脱节，错误 schema 只能在更深的 core handler 中以 undefined 参数、异常或错误 mutation 暴露。
- **建议**: 为所有已发布 `SPREADSHEET_HOST_METHOD_CONTRACTS` 补齐与 `SpreadsheetCommand` union 对齐的 `args` shape；确实依赖当前 selection 的无参数 toolbar 命令应在 core command 类型中也体现为无参数，或拆成单独 host method，避免同名 method 同时表示“schema-callable command”与“toolbar contextual command”。
- **误报排除**: 这不是重复报告 flow/word provider 未做 shape 校验；spreadsheet provider 已有 `validateMethodPayload()`，但 manifest 对大量已公开方法未声明 args，使 validator 在这些方法上主动退化为“任意 object 通过”。也不是单纯要求 result runtime conformance，而是输入 args contract 与 core command 类型直接不一致。
- **参考文档**: `docs/architecture/capability-projection-manifest.md:589-606`, `docs/architecture/capability-projection-manifest.md:776-790`, `docs/components/spreadsheet-page/design.md:53-58`
- **复核状态**: 未复核

### [维度03-08] Report Designer host actions 返回 preview/export/save 数据，但 manifest 未声明 result shape，链式 action 无法可靠发现返回契约

- **文件**: `packages/report-designer-renderers/src/report-designer-manifest.ts:244-285`, `packages/report-designer-core/src/core-dispatch.ts:194-214`, `packages/report-designer-core/src/core-dispatch.ts:260-328`
- **行号范围**: `report-designer-manifest.ts:244-285`, `core-dispatch.ts:194-214`, `core-dispatch.ts:260-328`
- **证据片段**:
  ```ts
  preview: {
    args: {
      kind: 'object',
      fields: {
        mode: { kind: 'string' },
        args: { kind: 'object', fields: {} },
      },
  ```
  ```ts
  exportTemplate: {
    args: {
      kind: 'object',
      fields: {
        format: { kind: 'string' },
      },
      optional: ['format'],
    },
  ```
  ```ts
  return { ok: result.ok, changed: false, data: result.data, error: result.error };
  ```
  ```ts
  return { ok: true, changed: false, data: exported };
  ```
  ```ts
  return { ok: true, changed: false, data: exported };
  ```
- **严重程度**: P2
- **现状**: `report-designer:preview`、`exportTemplate`、`save` 的 core dispatch 成功路径都会通过 `ActionResult.data` 暴露数据，但 `REPORT_DESIGNER_MANIFEST_V1.capabilities.methods` 只声明 args/description，没有为这些方法声明 result shape。
- **风险**: host-aware tooling、action authoring UI 和 chained action 无法从 manifest 得知 `result.data` 的可用结构；schema 作者可能依赖实际返回值，但公开 manifest 不承认该 contract，后续 provider/core 调整会破坏隐式消费者。
- **建议**: 为 `preview`、`exportTemplate`、`save` 补充 result shape；若 exported/preview payload 当前确实是 domain adapter opaque value，也应显式声明为 `{ kind: 'unknown' }` 并在 description 中说明其 adapter-owned 边界，而不是完全省略 result。
- **误报排除**: `capability-projection-manifest.md` 明确 runtime result conformance 不是热路径要求；本发现不要求运行时校验 result，只要求 manifest 如实描述已经公开返回的 `ActionResult.data`。这也不是重复 [维度03-06] 的 Word Editor `chartId/codeId`，而是 report-designer host family 的独立 result contract 缺口。
- **参考文档**: `docs/architecture/capability-projection-manifest.md:595-606`, `docs/references/renderer-interfaces.md:177-183`
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度03-09] Flow Designer manifest 声明 `nodeId`/`edgeId` result，但 provider 实际返回完整 node/edge 对象

- **文件**: `packages/flow-designer-renderers/src/designer-manifest.ts:62-73`, `packages/flow-designer-renderers/src/designer-command-adapter-graph.ts:67-80`, `packages/flow-designer-renderers/src/designer-context.ts:119-124`
- **行号范围**: `designer-manifest.ts:62-73`, `designer-command-adapter-graph.ts:67-80`, `designer-context.ts:119-124`
- **证据片段**:
  ```ts
  addNode: {
    args: {
      kind: 'object',
      fields: {
        nodeType: { kind: 'string' },
        position: positionShape,
        data: nodeDataShape,
      },
      optional: ['position', 'data'],
    },
    result: { kind: 'object', fields: { nodeId: { kind: 'string' } } },
  ```
  ```ts
  case 'addNode': {
    const { result: node, error } = captureLifecycleHookFailure(core, () =>
      core.addNode(command.nodeType, command.position ?? { x: 200, y: 120 }, command.data),
    );
    if (!node) {
      if (error) {
        return createFailure(core, error);
      }
  ```
  ```ts
  export function toActionResult(
    result: import('./designer-command-adapter.js').DesignerCommandResult,
  ) {
    return {
      ok: result.ok,
      data: result.exported ?? result.data,
      error: result.error,
    };
  }
  ```
- **严重程度**: P1
- **现状**: `FLOW_DESIGNER_MANIFEST_V1` 对 `addNode` / `addEdge` / `duplicateNode` 发布的 result shape 是 `{ nodeId: string }` 或 `{ edgeId: string }`，但 adapter 成功路径把完整 `GraphNode` / `GraphEdge` 放进 `DesignerCommandResult.data`，provider 又原样作为 `ActionResult.data` 返回。
- **风险**: tooling、action authoring UI 和 chained action 会按 manifest 引导用户读取 `result.nodeId` / `result.edgeId`，但运行时实际返回的是 `{ id, type, position, data, ... }` 这类 domain object；这会让基于 result 的后续 action 在运行时读不到 manifest 承诺字段。
- **建议**: 二选一收敛：要么 provider 在 public action result 中适配为 manifest 声明的 `{ nodeId }` / `{ edgeId }`，要么把 manifest result shape 改为真实的 node/edge object shape（至少包含 `id`）并同步 docs/examples。
- **误报排除**: 这不是要求运行时做 result conformance checking；问题是 manifest 已经声明了具体 result 字段，而 provider 主路径返回了不同结构，属于公开契约与执行结果不一致。此前 [维度03-01] 覆盖 Flow Designer 输入 args enforce，[维度03-02] 覆盖方法集合，本条是新的 result shape residual。
- **参考文档**: `docs/architecture/capability-projection-manifest.md:595-606`, `docs/references/renderer-interfaces.md:177-183`
- **复核状态**: 未复核

### [维度03-10] Flow Designer 文档称 `copySelection`/`pasteClipboard` 对外暴露，但 manifest 与 provider 均未发布这些方法

- **文件**: `docs/architecture/flow-designer/api.md:50-52`, `packages/flow-designer-renderers/src/designer-action-provider.ts:35-43`, `packages/flow-designer-renderers/src/designer-command-adapter.ts:173-178`
- **行号范围**: `api.md:50-52`, `designer-action-provider.ts:35-43`, `designer-command-adapter.ts:173-178`
- **证据片段**:
  ```md
  - 当前 `designer:save` 直接调用 `core.save()`；`designer:export` 直接返回 `core.exportDocument()` 的 JSON 字符串，当前 playground 通过本地 JSON dialog 展示导出结果而不是经 `env.functions.publishFlowExport` 回传。
  - 当前 clipboard 也是 core 自身能力，先支持单节点 copy/paste，并通过 `designer:copySelection` / `designer:pasteClipboard` 对外暴露。
  - 当前删除确认不通过专用 designer action 实现，而是由 `designer-page` 外围 schema 使用共享 `dialog` action 包装 `designer:deleteSelection`。
  ```
  ```ts
  'export',
  'undo',
  'redo',
  'toggleGrid',
  'togglePalette',
  'toggleInspector',
  'setViewport',
  'save',
  'restore',
  ```
  ```ts
  case 'copySelection':
    core.copySelection();
    return createSuccess(core);
  case 'pasteClipboard':
    core.pasteClipboard();
    return createSuccess(core);
  ```
- **严重程度**: P2
- **现状**: active API 文档把 `designer:copySelection` / `designer:pasteClipboard` 描述为对外暴露的 schema action；command adapter 内部也支持这两个 command，但 `createDesignerActionProvider().listMethods()` / `invoke()` 和 manifest method map 都没有发布对应 host action。
- **风险**: schema 作者按当前 owner doc 编写 `designer:copySelection` 或 `designer:pasteClipboard` 会在运行时得到 unknown method；compiler/tooling 也无法从 manifest 发现这些方法，形成“文档稳定 API / 内部 command / host capability”三者不一致。
- **建议**: 若 clipboard action 是当前支持面，应同时补齐 manifest method、provider `listMethods()` 和 `invoke()` 分支；若它仍是内部 command，则从 active API 文档移除“对外暴露”表述，并明确 clipboard 只由内建快捷键或 renderer shell 调用。
- **误报排除**: 这不是要求把所有 core command 都发布为 host action；问题只针对 active owner doc 已明确声称对外暴露、且 adapter 已存在实现的两个方法。此前 [维度03-02] 覆盖 `navigate-back` manifest/provider 不一致，本条是 clipboard API 的独立 contract drift。
- **参考文档**: `docs/architecture/capability-projection-manifest.md:589-606`, `docs/architecture/flow-designer/api.md:34-45`
- **复核状态**: 未复核

### [维度03-11] Spreadsheet host actions 返回 clipboard/find/replace 数据，但 manifest 未声明 result shape

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-manifest.ts:269-280`, `packages/spreadsheet-renderers/src/spreadsheet-manifest.ts:398-408`, `packages/spreadsheet-core/src/command-handlers/clipboard-handlers.ts:15-24`, `packages/spreadsheet-core/src/command-handlers/search-handlers.ts:15-24`
- **行号范围**: `spreadsheet-manifest.ts:269-280`, `spreadsheet-manifest.ts:398-408`, `clipboard-handlers.ts:15-24`, `search-handlers.ts:15-24`
- **证据片段**:
  ```ts
  copyCells: {
    description: 'Copy the current selection.',
  },
  cutCells: {
    description: 'Cut the current selection.',
  },
  pasteCells: {
    description: 'Paste clipboard content at the current target.',
  },
  clearCells: {
  ```
  ```ts
  find: {
    description: 'Find text in the workbook.',
  },
  findNext: {
    description: 'Advance to the next find result.',
  },
  replace: {
    description: 'Replace the current find result.',
  },
  replaceAll: {
    description: 'Replace all matching results.',
  },
  ```
  ```ts
  export const handleCopyCells: CommandHandler<CopyCellsCommand> = (store, command) => {
    const state = store.getState();
    const clipboard = copyRangeToClipboard(
      state.document,
      command.range.sheetId,
      command.range,
      'copy',
    );
    store.setState({ clipboard });
    return { ok: true, changed: false, data: clipboard };
  };
  ```
  ```ts
  export const handleFind: CommandHandler<FindCommand> = (store, command) => {
    const state = store.getState();
    const result = findInDocument(
      state.document,
      command.options.searchScope === 'sheet' ? state.activeSheetId : undefined,
      command.options.query,
      command.options,
  ```
- **严重程度**: P2
- **现状**: Spreadsheet manifest 对 `copyCells` / `cutCells` / `find` / `findNext` / `replaceAll` 等方法只提供 description，没有声明 result；但 core handler 会通过 `SpreadsheetCommandResult.data` 返回 clipboard、find result 或 `{ count }`，provider 再通过 `toSpreadsheetActionResult()` 作为 public `ActionResult.data` 暴露。
- **风险**: chained action、debugger 和 host-aware authoring tooling 无法发现这些可用返回值；schema 作者可能依赖实际 `result.data`，但 manifest 不承认该 contract，后续 core/provider 调整会破坏隐式消费者。
- **建议**: 为这些已公开返回数据的方法补充 result shape；如果 clipboard/find payload 需要保持 domain-owned opaque，也应显式声明 `{ kind: 'unknown' }` 或最小 `{ count: number }` 等稳定 shape，而不是完全省略 result。
- **误报排除**: 这不是重复 [维度03-07] 的 Spreadsheet 输入 args 缺口；本条只关注 provider 已经公开返回的 `ActionResult.data` 未进入 manifest result contract。也不是要求运行时校验 result，只要求 manifest 如实描述已经发布的返回面。
- **参考文档**: `docs/architecture/capability-projection-manifest.md:595-606`, `docs/components/spreadsheet-page/design.md:53-58`
- **复核状态**: 未复核

## 深挖第 5 轮追加

### [维度03-12] Tabs 已发布 `component:setValue/getValue` 运行时能力与组件文档，但 RendererDefinition 未声明 `componentCapabilityContracts`

- **文件**: `packages/flux-renderers-basic/src/tabs.tsx:119-136`, `packages/flux-renderers-basic/src/basic-renderer-definitions.ts:356-365`, `docs/components/tabs/design.md:336-343`
- **行号范围**: `tabs.tsx:119-136`, `basic-renderer-definitions.ts:356-365`, `tabs/design.md:336-343`
- **证据片段**:

  ```ts
  capabilities: {
    invoke(method, payload) {
      switch (method) {
        case 'setValue':
          ownedAxis.setValue(String(payload?.value ?? firstValue));
          return { ok: true, data: payload?.value };
        case 'getValue':
          return { ok: true, data: ownedAxis.value };
  ```

  ```ts
        defaultValue: 'default',
      },
    },
    fields: [
      { key: 'toolbar', kind: 'region', regionKey: 'toolbar' },
      { key: 'onChange', kind: 'event' },
      { key: 'items', kind: 'prop' },
      { key: 'value', kind: 'prop' },
  ```

  ```md
  ### 13.2 组件句柄能力

  当前 live capability：

  - `component:setValue`
  - `component:getValue`

  这与 `docs/architecture/action-scope-and-imports.md`、`docs/architecture/component-resolution.md` 的组件定向调用模型一致。
  ```

- **严重程度**: P2
- **现状**: `TabsRenderer` 实际注册了 `setValue` / `getValue` component handle，组件设计文档也把 `component:setValue` / `component:getValue` 定义为当前 live capability；但 `tabs` 的 `RendererDefinition` 只声明 `propContracts` 和 `fields`，没有同步发布 `componentCapabilityContracts`。
- **风险**: `ResolvedAuthoringContract.componentCapabilityContracts`、组件定向 action authoring tooling 与 diagnostics 无法发现 Tabs 已公开的实例能力；schema 作者只能依赖组件文档或运行时试错，后续若实现改名/删减能力也不会触发静态契约漂移信号。
- **建议**: 在 `tabs` renderer definition 中补齐 `componentCapabilityContracts`，至少声明 `setValue` 的 args shape `{ value: unknown|string }` 与 `getValue` 的 result shape；若不希望这些能力成为稳定公共面，则应从 docs 和 runtime handle 中同时收回。
- **误报排除**: 这不是要求所有内部 handle 都必须公开为 authoring metadata；Tabs 文档明确写着“当前 live capability”，且 runtime 已通过 `ComponentHandleRegistry` 暴露给 `component:<method>` 主路径，已越过纯内部实现边界。此前已有发现覆盖 host manifest/provider 和 form root export，本条是普通 renderer `componentCapabilityContracts` 与 live handle 的独立契约缺口。
- **参考文档**: `docs/references/renderer-interfaces.md:163-168`, `docs/architecture/renderer-runtime.md:275-331`, `docs/architecture/action-scope-and-imports.md:612-650`
- **复核状态**: 未复核

## 深挖第 6 轮追加

### [维度03-13] Table 已发布 `component:refresh/getSelection/setSelection` 运行时能力与组件文档，但 RendererDefinition 未声明 `componentCapabilityContracts`

- **文件**: `packages/flux-renderers-data/src/table-renderer/use-table-handle.ts:25-70`, `packages/flux-renderers-data/src/data-renderer-definitions.ts:16-143`, `docs/components/table/design.md:60-65`
- **行号范围**: `use-table-handle.ts:25-70`, `data-renderer-definitions.ts:16-143`, `table/design.md:60-65`
- **证据片段**:
  ```ts
  capabilities: {
    invoke(method, payload, ctx) {
      switch (method) {
        case 'refresh': {
  ```
  ```ts
  case 'getSelection': {
    return { ok: true, data: Array.from(selectedRowKeys) };
  }
  case 'setSelection': {
    const nextKeys = toSelectionPayload(payload);
    setSelectionExternal(nextKeys);
    return { ok: true, data: Array.from(nextKeys) };
  }
  ```
  ```ts
  {
    type: 'table',
    displayName: 'Table',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    component: TableRenderer,
    schemaValidator: validateTableSchema,
    propContracts: {
  ```
  ```md
  - 当前组件句柄基线是 `component:refresh`、`component:getSelection`、`component:setSelection`。
  ```
- **严重程度**: P2
- **现状**: `TableRenderer` 通过 `useTableHandle()` 实际注册了 `refresh`、`getSelection`、`setSelection` component handle，且 table 组件设计文档明确把这三个 `component:*` 方法列为当前句柄基线；但 `table` 的 `RendererDefinition` 只声明了 props/events/fields，没有同步声明 `componentCapabilityContracts`。
- **风险**: `ResolvedAuthoringContract.componentCapabilityContracts`、组件定向 action authoring tooling 与 diagnostics 无法发现 table 已公开的实例能力；schema 作者按文档可以调用这些能力，但静态契约面不会提供 args/result shape，也不会在后续实现漂移时给出 authoring 层信号。尤其 `setSelection` 接受 payload 并返回 selection keys，`getSelection` 返回 string array，这些真实返回/输入契约目前只能从 runtime switch 推断。
- **建议**: 在 `table` renderer definition 中补齐 `componentCapabilityContracts`：`refresh` 可声明 result `{ page: number, pageSize: number }` 或选择不承诺 data；`getSelection` 声明 string array result；`setSelection` 声明可接受 selection payload 并返回 string array。若这些能力不应成为稳定公共面，则应从 docs 和 runtime handle 中同时收回。
- **为什么值得现在做**: `table` 是 docs 中与 CRUD 并列的 component capability 代表 renderer，且 `docs/architecture/renderer-runtime.md` 已把 table-like capabilities 明确归入 renderer/component metadata；当前只有 CRUD 补齐了 metadata，table 这个更基础的主路径 renderer 反而缺失，容易让 authoring contract 形成错误基线。
- **误报排除**: 这不是要求所有内部 handle 都必须公开为 authoring metadata；table 文档明确写着“当前组件句柄基线”，runtime 也通过 `ComponentHandleRegistry` 暴露给 `component:<method>` 主路径。此前 [维度03-12] 覆盖的是 Tabs `setValue/getValue`，本条是 data renderer table 的独立 live handle/definition contract drift。
- **参考文档**: `docs/references/renderer-interfaces.md:163-168`, `docs/architecture/renderer-runtime.md:1043-1051`, `docs/architecture/action-scope-and-imports.md:612-650`
- **复核状态**: 未复核

## 深挖第 7 轮追加

### [维度03-14] Chart 当前句柄基线在架构文档、运行时实现与 RendererDefinition metadata 三处不一致

- **文件**: `docs/architecture/renderer-runtime.md:1053-1062`, `packages/flux-renderers-data/src/chart-renderer.tsx:144-167`, `packages/flux-renderers-data/src/data-renderer-definitions.ts:151-170`
- **行号范围**: `renderer-runtime.md:1053-1062`, `chart-renderer.tsx:144-167`, `data-renderer-definitions.ts:151-170`
- **证据片段**:

  ```md
  ### Chart renderer

  Chart now participates in the component-handle registry as a DOM-owning renderer.

  Current handle baseline:

  - chart registers a `ComponentHandle` with an optional `ref`
  - the registered `ref` points at the mounted chart container element when materialized
  - the handle exposes narrow chart instance capabilities such as `resize`, `setOption`, and `getDataURL`
  ```

  ```ts
  capabilities: {
    invoke(method, _payload) {
      switch (method) {
        case 'resize':
          handleResize();
          return { ok: true };
        default:
          return { ok: false, error: new Error(`Unsupported chart handle method: ${method}`) };
      }
    },
  ```

  ```ts
  {
    type: 'chart',
    displayName: 'Chart',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    component: LazyChartRenderer,
    fields: [
  ```

- **严重程度**: P2
- **现状**: 架构文档把 Chart 当前 handle baseline 写成包含 `resize`、`setOption`、`getDataURL`，但运行时 `ChartRenderer` 只发布 `resize`；同时 `chart` 的 `RendererDefinition` 没有 `componentCapabilityContracts` 描述已发布的 `resize`，也没有描述文档承诺的另外两个能力。
- **风险**: action authoring tooling / inspector 会从 metadata 看不到 chart 实例能力；开发者按架构文档调用 `component:setOption` 或 `component:getDataURL` 会在运行时得到 unsupported method。Chart 作为 DOM-owning renderer 的公共句柄契约因此无法作为稳定 v1 API 使用。
- **建议**: 明确 Chart v1 支持的 handle 集合：若只支持 `resize`，同步收窄 `renderer-runtime.md` 并在 `data-renderer-definitions.ts` 补 `componentCapabilityContracts: [{ handle: 'resize', ... }]`；若 `setOption/getDataURL` 是当前 contract，则补齐 runtime handle 实现和 metadata。
- **误报排除**: 这不是要求所有内部 ref 都公开为 authoring metadata；架构文档已明确写入“Current handle baseline”，运行时也确实通过 `ComponentHandleRegistry` 注册了 chart handle，已越过纯内部实现边界。
- **参考文档**: `docs/references/renderer-interfaces.md:163-168`, `docs/architecture/action-scope-and-imports.md:612-650`
- **复核状态**: 未复核

### [维度03-15] Code Editor 文档发布完整 schema/events，但 RendererDefinition 未提供 propContracts/eventContracts，authoring contract 为空壳

- **文件**: `packages/flux-code-editor/src/code-editor-renderer.tsx:31-52`, `packages/flux-code-editor/src/code-editor-renderer.tsx:203-222`, `docs/components/code-editor/design.md:21-50`
- **行号范围**: `code-editor-renderer.tsx:31-52`, `code-editor-renderer.tsx:203-222`, `code-editor/design.md:21-50`
- **证据片段**:
  ```ts
  export const codeEditorFieldRules: SchemaFieldRule[] = [
    { key: 'label', kind: 'value-or-region', regionKey: 'label' },
    { key: 'value', kind: 'prop' },
    { key: 'language', kind: 'prop' },
    { key: 'mode', kind: 'prop' },
    { key: 'placeholder', kind: 'prop' },
    ...{ key: 'onChange', kind: 'event' },
    { key: 'onFocus', kind: 'event' },
    { key: 'onBlur', kind: 'event' },
  ];
  ```
  ```ts
  export const codeEditorRendererDefinition: RendererDefinition = {
    type: 'code-editor',
    component: CodeEditorRenderer,
    fields: codeEditorFieldRules,
    validation: {
      kind: 'field',
      valueKind: 'scalar',
  ```
  ```md
  - `type: 'code-editor'`
  - `sourcePackage: '@nop-chaos/flux-code-editor'`
  - `wrap: true`
  - validation contributor: `kind: 'field'`、`valueKind: 'scalar'`
    ...
    interface CodeEditorSchema extends BaseSchema {
    type: 'code-editor';
    language: EditorLanguage;
    mode?: EditorMode;
  ```
- **严重程度**: P2
- **现状**: `code-editor` live schema 和组件文档列出了 `language/mode/value/placeholder/height/...` 以及 `onChange/onFocus/onBlur`，renderer field rules 也把这些字段纳入编译；但 `codeEditorRendererDefinition` 没有 `propContracts` / `eventContracts`，也没有文档声明的 `sourcePackage` metadata。
- **风险**: `ResolvedAuthoringContract.editableProps` / `events` 依赖 `RendererDefinition.propContracts` / `eventContracts`，因此 authoring tooling、autocomplete、diagnostics 和 inspector 无法从正式 renderer definition 发现 code-editor 的公开字段与事件，只能依赖旁路 docs 或 TS 类型，形成 live schema 与 authoring API 表面的漂移。
- **建议**: 为 `code-editor` 补齐最小 `propContracts` 和 `eventContracts`，至少覆盖文档中的公开 schema 字段、有限枚举字段和三个事件；同步补 `displayName/category/sourcePackage` 等 discovery metadata，避免组件文档与 renderer definition 分裂。
- **误报排除**: 这不是机械要求每个 renderer 都一次性拥有完整 authoring metadata；`code-editor` 已作为独立包公开导出 renderer definition，组件文档也把其 schema 作为当前落地能力描述，缺失 metadata 会直接影响统一 authoring contract。
- **参考文档**: `docs/references/renderer-interfaces.md:150-161`, `docs/references/renderer-interfaces.md:192-198`
- **复核状态**: 未复核

### [维度03-16] Report Designer manifest 对 metadata/field-drop host action 使用空对象 shape，provider 校验通过后仍以强转命令进入 core 判别联合

- **文件**: `packages/report-designer-renderers/src/report-designer-manifest.ts:201-228`, `packages/report-designer-renderers/src/host-action-provider.ts:144-148`, `packages/report-designer-core/src/commands.ts:22-38`
- **行号范围**: `report-designer-manifest.ts:201-228`, `host-action-provider.ts:144-148`, `commands.ts:22-38`
- **证据片段**:
  ```ts
  dropFieldToTarget: {
    args: {
      kind: 'object',
      fields: {
        field: { kind: 'object', fields: {} },
        target: { kind: 'object', fields: {} },
      },
    },
  ```
  ```ts
  updateMeta: {
    args: {
      kind: 'object',
      fields: {
        target: { kind: 'object', fields: {} },
        patch: metadataBagShape,
      },
    },
  ```
  ```ts
  const result = await dispatch({
    type: `report-designer:${method}`,
    ...validation.args,
  } as ReportDesignerCommand);
  ```
  ```ts
  export interface DropFieldToTargetCommand extends ReportDesignerCommandBase {
    type: 'report-designer:dropFieldToTarget';
    field: FieldDragPayload;
    target: Extract<ReportSelectionTarget, { kind: 'cell' | 'range' }>;
  }
  ```
- **严重程度**: P1
- **现状**: Report Designer provider 已有 `validateMethodPayload()`，但 manifest 对 `dropFieldToTarget.field/target`、`updateMeta.target`、`replaceMeta.target` 只声明 `{ kind: 'object', fields: {} }`，等价于任意对象通过；provider 随后用 `as ReportDesignerCommand` 将 payload 转入 core，而 core command 类型要求 `FieldDragPayload` 和 `ReportSelectionTarget` 判别联合的具体字段。
- **风险**: manifest 表面上提供了结构化 args contract，实际却无法阻止 `{ target: {} }`、`{ field: {} }` 等无效 payload 进入 core dispatch；后续 metadata 路径会按 `target.kind/cell/range` 等字段执行，错误 schema 可能退化为运行时异常或无效 mutation，而不是 host action 层稳定的 contract error。
- **建议**: 将 report-designer manifest 的 host args shape 与 `FieldDragPayload`、`ReportSelectionTarget` 判别联合对齐：为 `field` 声明 `type/sourceId/fieldId/data`，为 `target` 声明 `cell/range/...` union，且对 `dropFieldToTarget` 限定为 cell/range；provider 校验失败应返回结构化 `ActionResult` error。
- **误报排除**: 这不是重复报告“没有 provider 校验”；Report Designer 已有 validator，但 manifest shape 过宽使 validator 对关键 payload 失去约束力。问题也不同于已记录的 result shape 缺失，本条关注输入 args contract 与 core command 判别联合不一致。
- **参考文档**: `docs/architecture/capability-projection-manifest.md:776-790`, `docs/references/renderer-interfaces.md:177-183`
- **复核状态**: 未复核

## 深挖第 8 轮追加

### [维度03-17] Data Source 文档声明 `component:refresh` 当前应支持，但 renderer 未注册组件句柄且 definition 无 capability metadata

- **文件**: `docs/components/data-source/design.md:42-45`, `packages/flux-renderers-data/src/data-renderer-definitions.ts:145-150`, `packages/flux-renderers-data/src/data-source-renderer.tsx:21-32`
- **行号范围**: `design.md:42-45`, `data-renderer-definitions.ts:145-150`, `data-source-renderer.tsx:21-32`
- **证据片段**:

  ```md
  ## 8. 事件、动作与组件句柄能力

  - 当前应优先支持 `component:refresh` 这类重新执行能力。
  - `component:cancel` 可以作为后续增强，但不应在当前文档中伪装成已落地句柄。
  ```

  ```ts
  {
    type: 'data-source',
    displayName: 'Data Source',
    category: 'logic',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    component: DataSourceRenderer,
  },
  ```

  ```ts
  const registration = runtime.registerDataSource({
    id: props.id,
    scope,
    compiledSource,
  });
  ...
  return null;
  ```

- **严重程度**: P2
- **现状**: `data-source` 组件文档把 `component:refresh` 写成当前应优先支持的句柄能力，并明确区分 `component:cancel` 只是后续增强；但 `DataSourceRenderer` 只注册 runtime data source，不向 `ComponentHandleRegistry` 注册 handle，`RendererDefinition` 也没有 `componentCapabilityContracts`。
- **风险**: schema 作者或 authoring tooling 按组件文档使用 `component:refresh` targeting `data-source` 实例时，运行时无法解析该组件能力；同时正式 renderer definition 也不会暴露该能力，形成“文档承诺 / metadata 空缺 / runtime 不支持”的三方契约漂移。当前真正可用的是 built-in `refreshSource` + `targetId`，与文档声明的 component-targeted 入口不是同一 API。
- **建议**: 二选一收敛：若 `data-source` 当前确实应支持实例 refresh，则在 `DataSourceRenderer` 注册 `ComponentHandle`，调用 `runtime.refreshDataSource({ id/name, scope })`，并在 definition 中补 `componentCapabilityContracts: [{ handle: 'refresh', ... }]`；若当前正式入口只允许 `refreshSource`，则将组件文档改为“当前使用 built-in `refreshSource`，`component:refresh` 为 future”。
- **误报排除**: 这不是要求所有 data-source runtime API 都变成 component handle；问题仅限 active component doc 明确把 `component:refresh` 放在当前能力段，而 live renderer 没有任何 component handle 注册路径。也不重复 [维度03-12]/[维度03-13]/[维度03-14]，那些是“runtime handle 已发布但 metadata 缺失”，本条是“文档承诺了 runtime handle 但实现和 metadata 均未发布”。
- **参考文档**: `docs/references/renderer-interfaces.md:163-168`, `docs/architecture/action-scope-and-imports.md:612-650`, `docs/references/action-payload-matrix.md:62`
- **复核状态**: 未复核

## 深挖第 9 轮追加

### [维度03-18] form-advanced 已公开并注册迁出组件，但组件文档与 RendererDefinition 仍发布旧 package 契约

- **文件**: `packages/flux-renderers-form-advanced/src/index.tsx:17-39`, `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx:193-217`, `docs/components/condition-builder/design.md:15-20`, `docs/components/package-splitting-strategy.md:521-530`
- **行号范围**: `index.tsx:17-39`, `condition-builder.tsx:193-217`, `condition-builder/design.md:15-20`, `package-splitting-strategy.md:521-530`
- **证据片段**:
  ```ts
  export {
    ConditionBuilderRenderer,
    conditionBuilderRendererDefinition,
  } from './condition-builder/condition-builder.js';
  export { KeyValueRenderer, keyValueRendererDefinition } from './key-value.js';
  export { TagListRenderer, tagListRendererDefinition } from './tag-list.js';
  ...
  export const formAdvancedRendererDefinitions: RendererDefinition[] = [
  ```
  ```ts
  export const conditionBuilderRendererDefinition: RendererDefinition = {
    type: 'condition-builder',
    component: ConditionBuilderRenderer,
    fields: formFieldRules,
    validation: {
  ```
  ```md
  - `type: 'condition-builder'`
  - `sourcePackage: '@nop-chaos/flux-renderers-form'`
  - 当前 fields: `label` 为 `value-or-region`
  ```
  ```md
  ### 3.5 `flux-renderers-form-advanced`（新包，从 form 拆出）

  ...
  | `condition-builder` | runtime | 从 form 迁出 |
  | `array-editor` | runtime | 从 form 迁出 |
  | `tag-list` | runtime | 从 form 迁出 |
  | `key-value` | runtime | 从 form 迁出 |
  ```
- **严重程度**: P2
- **现状**: `condition-builder`、`array-editor`、`tag-list`、`key-value` 等已由 `@nop-chaos/flux-renderers-form-advanced` root entry 公开并进入 `formAdvancedRendererDefinitions` 注册主路径；但组件 owner 文档仍把 `sourcePackage` 写成 `@nop-chaos/flux-renderers-form`，且对应 `RendererDefinition` 没有 `sourcePackage` metadata 来给 authoring contract / inspector 提供 live 包归属。
- **风险**: schema authoring、组件发现、包拆分维护和文档导航会把高级字段归到旧包；后续按文档从 `flux-renderers-form` 查找或导入组件会失败，也会掩盖这些组件对 `flux-renderers-form-advanced` 的真实发布边界。
- **建议**: 将迁出组件的组件文档 `sourcePackage` 同步为 `@nop-chaos/flux-renderers-form-advanced`，并在对应 `RendererDefinition` 中补齐 `sourcePackage`（以及必要的 discovery metadata），使 root entry、definition metadata 与 owner docs 三者一致。
- **误报排除**: 这不是单纯文档措辞问题；迁出组件已在 live root entry 和 renderer registry 主路径公开，`docs/components/package-splitting-strategy.md` 也明确记录“从 form 迁出”。问题不重复已报告的 Code Editor metadata 缺口；本条关注 form-advanced 已迁出组件的公开包归属 contract drift。
- **参考文档**: `docs/references/renderer-interfaces.md:148-199`, `docs/components/package-splitting-strategy.md:521-530`
- **复核状态**: 未复核

## 深挖第 10 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度03-01]: 降级为 P2。`packages/flow-designer-renderers/src/designer-action-provider.ts:55-66` 确有强转和默认值绕过 manifest args，但当前 owner 文档更明确要求的是编译期 host action 校验（`docs/architecture/capability-projection-manifest.md:776-790`）；运行时 provider 必须做同等结构化校验的 P1 证据不足。
- [维度03-02]: 保留 (P2)。`FLOW_DESIGNER_MANIFEST_V1` 发布了 `navigate-back`，但基础 provider 方法表不含该方法，只有 wrapper 条件性补入（`packages/flow-designer-renderers/src/designer-manifest.ts:277-279`, `packages/flow-designer-renderers/src/designer-page-helpers.tsx:122-135`），属于公开契约集合不一致。
- [维度03-03]: 驳回。`./unstable` 是 `package.json` exports 与 owner 文档明确承认的 renderer-facing convenience surface（`packages/flux-react/package.json:11-20`, `docs/architecture/flux-runtime-module-boundaries.md:438-463`）；具体 callsite 是否不该绕过 hooks 应在 renderer-contract/模块边界维度单独审，不构成当前 API 表面积违约。
- [维度03-04]: 保留 (P2)。`packages/flux-renderers-form/src/index.tsx:4-14` 通过 root entry 全量公开 `field-utils`/factory，且 `flux-renderers-form-advanced` 已主路径消费这些 helper，形成未文档化的跨包公共契约锁定风险。
- [维度03-05]: 保留 (P1)。`word-editor` manifest 声明了结构化 `chartShape/codeShape`，但 provider 仅做 `as DocChart/DocCode` + 业务 validator（`packages/word-editor-renderers/src/word-editor-action-provider.ts:98-116`）；`validateDocChart()` 也未覆盖全部 shape/type（`packages/word-editor-core/src/chart-model.ts:35-58`），契约漂移成立。
- [维度03-06]: 保留 (P2)。provider 成功返回 `{ chartId }` / `{ codeId }`，但 manifest 未声明 result（`packages/word-editor-renderers/src/word-editor-manifest.ts:143-149`, `packages/word-editor-renderers/src/word-editor-action-provider.ts:104-116`）；而 owner 文档已明确 result shape 属于 contract 元数据（`docs/architecture/capability-projection-manifest.md:595-606`）。
- [维度03-07]: 保留 (P1)。Spreadsheet manifest 对大量 host actions 只写 description、不写 args（`packages/spreadsheet-renderers/src/spreadsheet-manifest.ts:269-408`），provider 在 `!contract?.args` 分支接受任意 object（`packages/spreadsheet-renderers/src/host-action-provider.ts:73-95`），而 core command 明确要求 `sheetId/row/...` 等结构（`packages/spreadsheet-core/src/commands-base.ts:173-239`）。
- [维度03-08]: 保留 (P2)。`preview/exportTemplate/save` 实际通过 `ActionResult.data` 返回数据（`packages/report-designer-core/src/core-dispatch.ts:194-214`, `260-328`），但 manifest 未声明 result（`packages/report-designer-renderers/src/report-designer-manifest.ts:244-285`），与 result-contract baseline 不符。
- [维度03-09]: 保留 (P1)。Flow manifest 将 `addNode/addEdge/duplicateNode` 的 result 声明为 `{ nodeId/edgeId }`（`packages/flow-designer-renderers/src/designer-manifest.ts:62-100,166-174`），但 adapter/provider 实际返回完整 node/edge 对象（`packages/flow-designer-renderers/src/designer-command-adapter-graph.ts:65-80`, `packages/flow-designer-renderers/src/designer-context.ts:119-124`）。
- [维度03-10]: 保留 (P2)。active API 文档声称 `designer:copySelection` / `designer:pasteClipboard` 已对外暴露（`docs/architecture/flow-designer/api.md:50-52`），但 manifest 与 provider 均未发布这两个方法，只有内部 adapter command 存在（`packages/flow-designer-renderers/src/designer-action-provider.ts:15-53`, `packages/flow-designer-renderers/src/designer-command-adapter.ts:173-178`）。
- [维度03-11]: 保留 (P2)。Spreadsheet clipboard/find/replace 相关 handler 会返回 `data`（如 clipboard/find result/count，见 `packages/spreadsheet-core/src/command-handlers/clipboard-handlers.ts:15-24`, `search-handlers.ts:15-24`），但 manifest 对这些方法未声明 result（`packages/spreadsheet-renderers/src/spreadsheet-manifest.ts:269-280,398-408`）。
- [维度03-12]: 保留 (P2)。Tabs 运行时已注册 `setValue/getValue` handle（`packages/flux-renderers-basic/src/tabs.tsx:115-145`），组件文档也写为当前 live capability（`docs/components/tabs/design.md:336-343`），但 `RendererDefinition` 缺 `componentCapabilityContracts`（`packages/flux-renderers-basic/src/basic-renderer-definitions.ts:333-379`）。
- [维度03-13]: 保留 (P2)。Table 已公开 `refresh/getSelection/setSelection` handle（`packages/flux-renderers-data/src/table-renderer/use-table-handle.ts:21-84`）且文档声明为当前句柄基线（`docs/components/table/design.md:60-65`），但 definition 未声明 `componentCapabilityContracts`（`packages/flux-renderers-data/src/data-renderer-definitions.ts:16-143`）。
- [维度03-14]: 保留 (P2)。架构文档把 Chart 当前 handle baseline 写成 `resize/setOption/getDataURL`（`docs/architecture/renderer-runtime.md:1053-1063`），运行时只实现 `resize`（`packages/flux-renderers-data/src/chart-renderer.tsx:144-167`），definition 也无 capability metadata（`packages/flux-renderers-data/src/data-renderer-definitions.ts:151-170`）。
- [维度03-15]: 保留 (P2)。`code-editor` 文档与 live field rules 已发布 props/events 面（`docs/components/code-editor/design.md:21-71`, `packages/flux-code-editor/src/code-editor-renderer.tsx:31-52`），但 `RendererDefinition` 仅有 `fields/validation/wrap`，缺 `propContracts/eventContracts`（`packages/flux-code-editor/src/code-editor-renderer.tsx:203-222`），会使 authoring contract 发现面失真。
- [维度03-16]: 保留 (P1)。Report Designer 虽有 `validateMethodPayload()`，但 manifest 对 `dropFieldToTarget.field/target`、`updateMeta.target` 等只声明空对象（`packages/report-designer-renderers/src/report-designer-manifest.ts:201-228`），provider 校验后仍以 `as ReportDesignerCommand` 进入要求判别联合的 core command（`packages/report-designer-renderers/src/host-action-provider.ts:144-148`, `packages/report-designer-core/src/commands.ts:22-38`）。
- [维度03-17]: 驳回。`docs/components/data-source/design.md:42-45` 的表述是“当前应优先支持”，更像方向性设计要求，不足以单独证明 `component:refresh` 已是 live public capability；在缺少 manifest/definition/runtime 任一已发布证据时，不宜按当前 API 违约入账。
- [维度03-18]: 保留 (P2)。`form-advanced` 已从 root entry 公开并注册迁出组件（`packages/flux-renderers-form-advanced/src/index.tsx:17-49`），包拆分文档也明确“从 form 迁出”（`docs/components/package-splitting-strategy.md:521-530`），但组件 owner 文档仍写旧 `sourcePackage`，且 definition 缺少对应 metadata（如 `condition-builder`，`packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx:193-217`, `docs/components/condition-builder/design.md:15-20`）。

## 子项复核结论

- [维度03-01]: 降级保留 (P2)。应按 host action runtime/provider 契约收口，不再按 P1 推动。
- [维度03-02]: 成立 (P2)。Flow manifest 与基础 provider 方法集合不一致，保留。
- [维度03-04]: 成立 (P2)。`flux-renderers-form` root entry 未文档化公共 helper surface 保留。
- [维度03-05]: 成立 (P1)。Word Editor manifest/provider args contract 漂移保留为高优先级。
- [维度03-06]: 成立 (P2)。Word Editor provider result 未进 manifest metadata，保留。
- [维度03-07]: 成立 (P1)。Spreadsheet host API args contract 漂移保留为高优先级。
- [维度03-08]: 成立 (P2)。Report Designer result metadata 缺口保留。
- [维度03-09]: 成立 (P1)。Flow manifest result 与实际 provider 输出不一致，保留为高优先级。
- [维度03-10]: 成立 (P2)。active API 文档暴露未发布方法，保留。
- [维度03-11]: 成立 (P2)。Spreadsheet clipboard/find/replace result metadata 缺口保留。
- [维度03-12]: 成立 (P2)。Tabs live handle 缺 capability metadata，保留。
- [维度03-13]: 成立 (P2)。Table live handle 缺 capability metadata，保留。
- [维度03-14]: 成立 (P2)。Chart docs/runtime/definition handle baseline 不一致，保留。
- [维度03-15]: 成立 (P2)。Code Editor definition 缺 prop/event contract metadata，保留。
- [维度03-16]: 成立 (P1)。Report Designer manifest 空对象 target 仍会放行非法 payload，保留为高优先级。
- [维度03-18]: 成立 (P2)。form-advanced 迁出组件 sourcePackage / definition metadata 漂移保留。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                         | 一句话摘要                                                                     |
| ----- | -------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 03-01 | P2       | `packages/flow-designer-renderers/src/designer-action-provider.ts:55-66`     | Flow host action provider args runtime收窄不足，降级保留                       |
| 03-02 | P2       | `packages/flow-designer-renderers/src/designer-manifest.ts:277-279`          | Flow manifest 发布了 `navigate-back`，基础 provider 方法表未对齐               |
| 03-04 | P2       | `packages/flux-renderers-form/src/index.tsx:4-14`                            | `flux-renderers-form` root entry 全量公开 field-utils/factory 未文档化 surface |
| 03-05 | P1       | `packages/word-editor-renderers/src/word-editor-action-provider.ts:98-116`   | Word Editor manifest/provider chart/code args contract 漂移                    |
| 03-06 | P2       | `packages/word-editor-renderers/src/word-editor-manifest.ts:143-149`         | Word Editor provider 成功 result 未写入 manifest metadata                      |
| 03-07 | P1       | `packages/spreadsheet-renderers/src/spreadsheet-manifest.ts:269-408`         | Spreadsheet host actions 大量缺 args contract，provider 仍可放行任意 object    |
| 03-08 | P2       | `packages/report-designer-renderers/src/report-designer-manifest.ts:244-285` | Report Designer preview/export/save result metadata 缺失                       |
| 03-09 | P1       | `packages/flow-designer-renderers/src/designer-manifest.ts:62-100`           | Flow manifest result 声明与 provider 实际返回 node/edge 对象不一致             |
| 03-10 | P2       | `docs/architecture/flow-designer/api.md:50-52`                               | active API 文档暴露 `copySelection/pasteClipboard`，manifest/provider 未发布   |
| 03-11 | P2       | `packages/spreadsheet-renderers/src/spreadsheet-manifest.ts:269-280,398-408` | Spreadsheet clipboard/find/replace handler 有 result，但 manifest 未声明       |
| 03-12 | P2       | `packages/flux-renderers-basic/src/basic-renderer-definitions.ts:333-379`    | Tabs live capability 已存在但 definition 缺 `componentCapabilityContracts`     |
| 03-13 | P2       | `packages/flux-renderers-data/src/data-renderer-definitions.ts:16-143`       | Table live capability 已存在但 definition 缺 `componentCapabilityContracts`    |
| 03-14 | P2       | `docs/architecture/renderer-runtime.md:1053-1063`                            | Chart handle baseline 在 docs/runtime/definition 三处不一致                    |
| 03-15 | P2       | `packages/flux-code-editor/src/code-editor-renderer.tsx:203-222`             | Code Editor definition 缺 prop/event contract metadata                         |
| 03-16 | P1       | `packages/report-designer-renderers/src/report-designer-manifest.ts:201-228` | Report Designer target payload contract 仍会放行非法联合对象                   |
| 03-18 | P2       | `packages/flux-renderers-form-advanced/src/index.tsx:17-49`                  | form-advanced 迁出组件 sourcePackage / definition metadata 未同步              |
