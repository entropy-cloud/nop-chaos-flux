# 维度 13: 类型安全与动态边界

## 第 1 轮（初审）

### [维度13-01] Flow Designer host action provider 未复用已声明 manifest 参数形状，断言/默认值会让非法 payload 进入核心命令

- **文件**: `packages/flow-designer-renderers/src/designer-action-provider.ts:55-66`, `packages/flow-designer-renderers/src/designer-action-provider.ts:291-299`, `packages/flow-designer-renderers/src/designer-action-provider.ts:353-366`
- **行号范围**: `designer-action-provider.ts:55-66,291-299,353-366`
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
  ```
- **严重程度**: P1
- **分类**: 危险
- **现状**: Flow Designer 已在 `designer-manifest.ts` 为 `addNode`、`moveNode`、`setViewport`、`moveNodes`、`updateMultipleNodes` 等 host capability 声明了参数 shape，但 provider 主路径没有按 manifest 做结构化校验，而是通过 `String(...)`、对象断言、数组断言和默认值直接组装 `DesignerCommand`。
- **真实风险**: schema/host 调用传入 `{ position: { x: "bad", y: 1 } }`、`{ viewport: { x: "bad" } }` 或 `moveNodes.deltas` 中非数值对象时，TypeScript 断言不会在运行时拦截；后续 core 会执行数值运算或写入 viewport，可能产生 `NaN`、错误坐标、脏历史记录或不可诊断的命令失败。
- **建议**: 像 `spreadsheet-renderers/src/host-action-provider.ts` 与 `report-designer-renderers/src/host-action-provider.ts` 一样，基于 `FLOW_DESIGNER_MANIFEST_V1.capabilities.methods[method].args` 增加统一 `validateMethodPayload` / `matchesShape`；只有通过 shape 校验后再构造 `DesignerCommand`，对 `moveNodes.deltas` 这类 map-of-object 形状补足 manifest 表达或专门 validator。
- **为什么值得现在做**: 这是 host capability 公开写边界，不是内部 UI 小范围断言；Flow/Spreadsheet/Report 都属于同一复杂控件 host 家族，后两者已收敛到 runtime payload validation，Flow 继续靠断言会让 manifest 的类型契约在最常用设计器命令面失效。
- **误报排除**: 这不是低代码 schema/action 的合理动态边界；当前代码已经有更精确的内部类型 `DesignerCommand`，并且 manifest 已公开声明参数 shape。问题不在于使用 `Record<string, unknown>`，而在于把公开 payload 直接断言成精确命令字段却没有 runtime narrowing。
- **历史模式对应**: 对应 `docs/architecture/capability-projection-manifest.md` 中“manifest 声明 host capability 参数/结果，runtime bridge 执行”的分层要求；也对应深审提示中“manifest -> provider/adapter 链不能仅靠 `as XxxCommand` 或任意对象转发”的契约真实性模式。命中校准模式 10 时已排除：这不是跨包风格一致性建议，而是同一公开 host contract 的 runtime enforcement 缺口。
- **参考文档**: `docs/architecture/capability-projection-manifest.md`, `docs/architecture/complex-control-host-protocol.md`, `docs/architecture/flow-designer/design.md`, `docs/skills/react19-best-practices-review.md`, `docs/references/deep-audit-calibration-patterns.md`, `docs/references/reopened-design-decisions-and-audit-adjudications.md`
- **复核状态**: 未复核

## any 使用统计摘要

- **统计口径**: 搜索 `packages/` 下 `.ts/.tsx`，排除 `dist/coverage/node_modules`；统计 explicit `any` / `as any` / `any[]` / `Array<any>` / 多重断言候选。测试 mock、schema 动态输入、host/function 注入、公式系统、异构 registry 擦除按合理动态边界归类。
- **源码候选概览**: `flux-formula` 合理 22 / 可疑 0 / 危险 0（公式动态输入输出）。
- **源码候选概览**: `flux-react` 合理 11 / 可疑 0 / 危险 0（scope selector 泛型、render helper/action dispatch 动态边界；NodeRenderer hot path 未发现 live `as any`）。
- **源码候选概览**: `flux-core` 合理 8 / 可疑 0 / 危险 0（RendererEnv functions/filters host 注入、工具型断言）。
- **源码候选概览**: `flux-compiler` 合理 9 / 可疑 0 / 危险 0（schema 编译动态值收敛）。
- **源码候选概览**: `flux-renderers-data` 合理 6 / 可疑 0 / 危险 0（CRUD/Table schema 桥接中未发现会越过运行时边界的 any；快编 controller 使用 `Record<string, unknown>` 为行数据动态边界）。
- **源码候选概览**: `spreadsheet-renderers` 合理 1 / 可疑 0 / 危险 0（公开 schema helper 的交叉类型断言；host provider 已有 payload validation）。
- **源码候选概览**: `report-designer-renderers` 合理 1 / 可疑 0 / 危险 0（公开 schema helper 的交叉类型断言；host provider 已有 payload validation）。
- **源码候选概览**: `flow-designer-renderers` 合理 2 / 可疑 0 / 危险 1（危险项为 host action provider 对 manifest-declared payload 的未校验断言/默认值路径）。
- **源码候选概览**: 其他源码包少量候选（`flux-action-core`, `flux-runtime`, `flux-renderers-basic`, `flux-renderers-form-advanced`, `ui`, `word-editor-renderers`）均为合理动态边界或 DOM/React 类型适配，未形成发现。
- **测试候选概览**: 测试与 test-support 中大量 `as any` 主要用于 mock runtime/env/schema、构造负例、访问 debug API，未作为本轮生产风险发现统计。

## 深挖第 2 轮追加

### [维度13-02] Word Editor host action provider 未按 manifest 形状收窄 insertChart/insertCode payload，错误类型可抛出或写入非法元数据

- **文件**: `packages/word-editor-renderers/src/word-editor-action-provider.ts:91-116`, `packages/word-editor-renderers/src/word-editor-manifest.ts:143-149`, `packages/word-editor-core/src/chart-model.ts:35-56`
- **行号范围**: `word-editor-action-provider.ts:91-116`, `word-editor-manifest.ts:143-149`, `chart-model.ts:35-56`
- **证据片段**:
  ```ts
  case 'insertChart': {
    const chart = payload as DocChart | undefined;
    const validation = validateDocChart(chart ?? {});
    if (!chart?.id || !validation.valid) {
      return fail('insertChart requires a complete chart payload.');
    }
    input.bridge.insertChart(chart);
    input.setCharts([...input.getCharts(), chart]);
    return ok({ chartId: chart.id });
  }
  ```
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
- **严重程度**: P1
- **分类**: 危险
- **现状**: Word Editor 已在 `WORD_EDITOR_MANIFEST_V1` 为 `insertChart` / `insertCode` 发布了 `FluxValueShape` 参数契约，组件文档也声明“仅在 payload 满足 manifest/core validator 契约时插入”，但 provider 主路径直接把 `payload` 断言成 `DocChart` / `DocCode` 后调用 core validator，没有先按 manifest 检查字段类型。
- **真实风险**: `validateDocChart` / `validateDocCode` 只假设输入已是 `Partial<DocChart>` / `Partial<DocCode>`；例如 `{ id: 1, chartName: {}, chartType: 'bar', showChartName: 'yes', datasetId: 1, categoryField: 'x', valueField: [123] }` 会在 `.trim()` 处抛出，或让非字符串数组通过 `Array.isArray` 后写入 `charts` 元数据。host action 调用方得到的不是结构化 `ActionResult` 失败，而可能是未捕获异常或污染后的文档占位符数据。
- **建议**: 将 spreadsheet/report provider 中的 `matchesShape` / `validateMethodPayload` 收敛为共享 helper 或在 Word Editor provider 内复用同等逻辑；先用 `WORD_EDITOR_MANIFEST_V1.capabilities.methods[method].args` 验证 payload，再调用 `validateDocChart` / `validateDocCode` 做领域语义校验。对 validator 也可补充 `unknown -> DocChart/DocCode` 的 defensive narrowing，避免 host 边界异常外泄。
- **误报排除**: 这不是低代码动态 schema 的合理弱类型边界；`insertChart` / `insertCode` 是已发布的 namespaced host capability 写边界，manifest 和当前组件文档都声明了参数契约。问题也不是“出现 `as DocChart`”本身，而是公开 payload 未经 runtime narrowing 就进入假定强类型的 core validator 和持久化路径。
- **参考文档**: `docs/components/word-editor-page/design.md`, `docs/architecture/word-editor/design.md`, `docs/architecture/capability-projection-manifest.md`, `docs/architecture/complex-control-host-protocol.md`, `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度13-03] 普通 component capability 的 args 契约未在运行时收窄，`component:setValue/setValues` 可用非法 payload 写坏表单值

- **文件**: `packages/flux-renderers-form/src/renderers/form-definition.ts:188-196`, `packages/flux-runtime/src/action-adapter.ts:363-370`, `packages/flux-runtime/src/form-component-handle.ts:46-52`
- **行号范围**: `form-definition.ts:188-196`, `action-adapter.ts:363-370`, `form-component-handle.ts:46-52`
- **证据片段**:

  ```ts
  {
    handle: 'setValue',
    displayName: 'Set Value',
    description: 'Set one field value on the current form.',
    args: {
      kind: 'object',
      fields: {
        name: { kind: 'string' },
        value: { kind: 'unknown' },
      },
  ```

  ```ts
  const payloadWithSignal =
    ctx.signal && invocation.payload && typeof invocation.payload === 'object'
      ? { ...invocation.payload, signal: ctx.signal }
      : ctx.signal
        ? { signal: ctx.signal }
        : invocation.payload;

  const result = await handle.capabilities.invoke(invocation.method, payloadWithSignal, ctx);
  ```

  ```ts
  case 'reset':
    form.reset(input.values as object | undefined);
    return { ok: true };
  case 'setValue':
    form.setValue(String(input.name ?? ''), input.value);
    return { ok: true, data: input.value };
  case 'setValues':
    form.setValues((input.values as Record<string, unknown> | undefined) ?? {});
  ```

- **严重程度**: P1
- **分类**: 危险
- **现状**: `RendererCapabilityContract` 已为 form 的 `component:setValue` / `component:setValues` 发布结构化 args shape，但 `invokeComponentAction` 只检查方法是否存在，然后把动态 `args` 直接转发给 handle；form handle 再通过 `String(...)` 和 `as Record<string, unknown>` 把非法 payload 送入表单写路径。
- **真实风险**: schema 可写出 `component:setValue` 且缺少 `name`、`name` 为非字符串，或 `component:setValues` 的 `values` 为字符串/数组等非法对象。当前路径不会返回结构化校验失败：`setValue` 可能把缺失 name 的 plain object 当作整表替换值写入，`setValues` 可能对非对象执行后续批量写入逻辑，造成跨组件 targeted form 的值污染和难定位的数据损坏。
- **建议**: 不要把普通 renderer capability 强行升级为 host manifest；但应在 component capability 边界复用同一 `FluxValueShape` runtime narrowing。可将 `RendererCapabilityContract.args` 挂到 `ComponentHandle` 或在注册时注入 per-method validator，`invokeComponentAction` 在调用 `capabilities.invoke` 前校验 payload；同时让 form handle 自身对 `setValue.name`、`setValues.values` 做 defensive narrowing，非法 payload 返回 `ActionResult { ok:false }`。
- **误报排除**: 这不是“低代码动态 args 本来弱类型”的正常边界；当前代码已经公开声明了 `componentCapabilityContracts.args`，且目标是表单 owner 的写接口，不是只读调试或 schema passthrough。也不是第 1/2 轮已覆盖的 host manifest provider 问题：这里走的是 `component:<method>` / `ComponentHandleRegistry` 普通 component capability 路径，现有 Flow/Word host action provider 修复建议不会覆盖该 runtime 分支。
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/references/renderer-interfaces.md`, `docs/architecture/capability-contract-model.md`, `docs/architecture/action-scope-and-imports.md`, `docs/references/action-payload-matrix.md`, `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核
