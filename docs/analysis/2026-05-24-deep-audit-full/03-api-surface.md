# 维度 03：API 表面积与契约一致性

## 第 1 轮（初审）

本轮为初审线索，不是复核结论。已按要求读取共享前缀文档、维度 03 正文、`renderer-interfaces.md` 与 `terminology.md`。已排除：维度 01 manifest devDependencies 问题、`pnpm check:flux-bundle-pack` / `pnpm check:workspace-manifest-deps` 已通过范围、维度 09 已报的 `variant-field` raw schema read。

### [维度03-01] `flux-react/unstable` 已被生产 renderer 主路径依赖，unstable 子路径实际变成公共运行时契约

- **文件**: `packages/flux-react/package.json:16-20`; `packages/flux-react/src/unstable.ts:1-28`; `packages/flux-renderers-form/src/renderers/form.tsx:1-17`; `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx:11-20`; `packages/flux-renderers-data/src/crud-renderer.tsx:4-12`
- **证据片段**:
  ```json
  "./unstable": {
    "types": "./dist/unstable.d.ts",
    "default": "./dist/unstable.js"
  },
  "./default-spacing.css": "./dist/default-spacing.css"
  ```
  ```ts
  export { mergeActionContext, createHelpers, EMPTY_SCOPE_DATA } from './helpers.js';
  export { RenderNodes } from './render-nodes.js';
  export { rendererHooks } from './hooks.js';
  export type { FormLayoutContextValue } from './contexts.js';
  export {
    ActionScopeContext,
    ClassAliasesContext,
    ComponentRegistryContext,
  ```
- **严重程度**: P1
- **现状**: `@nop-chaos/flux-react` 正式 exports map 发布 `./unstable`，且多个生产 renderer 包主路径直接依赖其中的 Context、`RenderNodes`、runtime helper re-export。
- **风险**: `unstable` 不再只是实验面，而是 renderer 包之间的 live public contract；后续任何重构都必须兼容这些内部 Context / helpers，削弱 root API 收敛，也绕过 `RendererComponentProps + hooks` 作为跨包边界的标准入口。
- **建议**: 将生产主路径所需能力提升为明确稳定 API（如 provider/bridge 组件或专用 hook），把仅测试/调试/内部迁移用符号留在 `unstable`；生产 renderer 不应依赖名为 `unstable` 的发布子路径。
- **为什么值得现在做**: 该子路径已被 package exports 公开且被生产 renderer 消费，继续放任会让“不稳定”命名与事实契约长期背离。
- **误报排除**: 这不是“未来会收口”的过渡态讨论；在 v1/no-transition 基线下，`package.json` 已发布该 subpath，且 form / advanced / data / flow renderers 的 live 主路径已经导入它。
- **历史模式对应**: Public API 表面积未收敛、内部实现面经发布 subpath 变成事实公共契约。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`; `docs/references/renderer-interfaces.md`; `docs/references/terminology.md`
- **复核状态**: 未复核

### [维度03-02] Flow Designer `moveNodes` host contract 未真实约束 delta payload，provider 通过 cast 把任意对象送入 core

- **文件**: `packages/flow-designer-renderers/src/designer-manifest.ts:358-368`; `packages/flow-designer-renderers/src/designer-action-provider.ts:470-472`; `packages/flow-designer-core/src/core/node-operations.ts:52-70`
- **证据片段**:
  ```ts
  moveNodes: {
    args: {
      kind: 'object',
      fields: {
        deltas: {
          kind: 'object',
          fields: {},
          description: 'Map of nodeId to {dx, dy} deltas',
        },
  ```
  ```ts
  case 'moveNodes': {
    core.moveNodes(args.deltas as Record<string, { dx: number; dy: number }>);
    return { ok: true };
  }
  ```
- **严重程度**: P1
- **现状**: manifest 文档说明 `deltas` 是 `nodeId -> {dx, dy}`，但 `FluxValueShape` 只声明为空 object；provider 的 `matchesShape` 对 object 不校验未知键和值结构，随后用 `as Record<string, { dx; dy }>` 强转给 core。
- **风险**: 编译期和运行时都可能接受 `{ deltas: { n1: { dx: "bad" } } }` 或任意嵌套对象，core 执行加法时产生错误坐标或非数值位置；host 发布的 typed payload 与 provider enforce 不一致。
- **建议**: 为 map-like payload 增加可表达 dictionary/value shape 的契约模型，或在 provider 对 `deltas` 做专门结构校验（每个 value 必须有有限 number `dx` / `dy`），并删除无保护的 `as Record<string, ...>`。
- **为什么值得现在做**: 这是 host capability 的发布契约，错误 payload 会直接进入图编辑核心命令并污染节点位置。
- **误报排除**: 这不是低代码动态边界里的合理 `unknown`；这里 manifest 已对外发布具体 `{dx, dy}` 语义，provider 也把它作为强类型命令使用。
- **历史模式对应**: Manifest/provider/core 端到端契约执行不一致，`as XxxCommand` 掩盖 runtime payload 校验缺口。
- **参考文档**: `docs/architecture/capability-contract-model.md`; `docs/architecture/capability-projection-manifest.md`; `docs/references/renderer-interfaces.md`
- **复核状态**: 未复核

### [维度03-03] Report Designer `preview.mode` manifest 比 core command 更宽，provider 通过 `as ReportDesignerCommand` 绕过 union 约束

- **文件**: `packages/report-designer-renderers/src/report-designer-manifest.ts:368-376`; `packages/report-designer-renderers/src/host-action-provider.ts:122-165`; `packages/report-designer-core/src/commands.ts:49-52`
- **证据片段**:
  ```ts
  preview: {
    args: {
      kind: 'object',
      fields: {
        mode: { kind: 'string' },
        args: { kind: 'object', fields: {} },
      },
      optional: ['mode', 'args'],
  ```
  ```ts
  const result = await dispatch({
    type: `report-designer:${method}`,
    ...validation.args,
  } as ReportDesignerCommand);
  ```
- **严重程度**: P1
- **现状**: manifest/provider 接受任意 string `mode`，但 core command 类型只允许 `'inline' | 'dialog' | 'replace-page' | 'download'`；provider 最后用 `as ReportDesignerCommand` 将宽 payload 强行转换成窄命令。
- **风险**: host action validation 会放行 core 不支持的 preview mode，adapter 或 UI 后续只能在运行时遇到未知值；公开 API 契约、编译期 validation 与 runtime dispatch 的有效载荷集合不一致。
- **建议**: 将 manifest `mode` 改为 literal union，或在 provider 端显式校验 mode 枚举；避免用 `as ReportDesignerCommand` 掩盖 manifest 与 core command union 的差异。
- **为什么值得现在做**: 这是 host-facing API 的有限枚举契约，修复范围小且能提升 compile/runtime 一致性。
- **误报排除**: 这不是“接口签名允许外部扩展”的正常宽类型；core 已定义有限 union，provider 的强转正是端到端契约执行一致性检查要求关注的绕过点。
- **历史模式对应**: Manifest 比 core command 更宽，provider cast 绕过契约真实性。
- **参考文档**: `docs/architecture/capability-contract-model.md`; `docs/architecture/report-designer/design.md`; `docs/references/renderer-interfaces.md`
- **复核状态**: 未复核

## 包 API 表面积摘要

| 包                                        | root index 公开面摘要                                                                                                                                                             | exports map 对齐初审                                                          |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `@nop-chaos/flux-core`                    | 核心类型、schema diagnostics、validation model、registry、class aliases、path/object/array/schema utils、i18n sink、workbench type、runtime inspection                            | root `.` 对齐；公开 utils 面较大但多为跨包基础设施                            |
| `@nop-chaos/flux-formula`                 | formula/expression compiler、parser/evaluator、registry、date helper、AST binding、dependency collector                                                                           | root `.` 对齐                                                                 |
| `@nop-chaos/flux-compiler`                | schema/action/source/reaction compiler、diagnostics context、host action validation、FluxValueShape validation、validation lowering                                               | root `.` 对齐                                                                 |
| `@nop-chaos/flux-action-core`             | action result/control/evaluation helpers、operation control、dispatcher、debounce re-export                                                                                       | root `.` 对齐                                                                 |
| `@nop-chaos/flux-runtime`                 | runtime factory、module cache、action scope、component handle registry、form handle、scope dependency、status/projected scope/request runtime helpers                             | root `.` 对齐；实现模块未直接发布                                             |
| `@nop-chaos/flux-react`                   | SchemaRenderer、registry/env defaults、renderer components/lazy helpers、DialogHost、FieldFrame、standard hooks、form selectors, workbench hooks, container/source/status helpers | root `.` 对齐；`./unstable` 发现见 `[维度03-01]`                              |
| `@nop-chaos/flux`                         | bundled renderer registry/env/schema renderer、bundle-facing types、root CSS                                                                                                      | root `.` + `./style.css` 对齐；`check:flux-bundle-pack` 已给定通过            |
| `@nop-chaos/flux-renderers-basic`         | basic schemas、renderer components、definition list、register function                                                                                                            | root `.` 对齐                                                                 |
| `@nop-chaos/flux-renderers-form`          | form CSS side effect、form definitions/register、FormRenderer、input factory/validation helpers、Field UI parts、field-utils、schemas                                             | root `.` + `./definitions` + CSS 对齐                                         |
| `@nop-chaos/flux-renderers-form-advanced` | advanced renderer components/definitions/register、condition-builder types、composite schemas/item id、tree options                                                               | root `.` 对齐                                                                 |
| `@nop-chaos/flux-renderers-data`          | data/crud schemas、Table/DataSource/Chart/Tree/Crud renderers、definitions/register                                                                                               | root `.` 对齐                                                                 |
| `@nop-chaos/flux-code-editor`             | code editor schema/config types, resolver hooks, CodeMirror hook, renderer definition/register                                                                                    | root `.` + CSS 对齐                                                           |
| `@nop-chaos/flow-designer-core`           | designer core, config normalization, ELK/tree layout/projection, tree domain adapters, types                                                                                      | root `.` 对齐                                                                 |
| `@nop-chaos/flow-designer-renderers`      | schemas, action provider, manifest/host contract, renderer registry helpers                                                                                                       | root `.` + `./unstable` + CSS；`moveNodes` contract issue 见 `[维度03-02]`    |
| `@nop-chaos/spreadsheet-core`             | spreadsheet document/runtime/config types, helpers, command union/result, core factory                                                                                            | root `.` 对齐                                                                 |
| `@nop-chaos/spreadsheet-renderers`        | bridge/snapshot, action provider, schema helper, renderers/register, cell style, UI parts, interactions hook, manifest                                                            | root `.` + CSS 对齐；host provider较 spreadsheet 严格，会拒绝未知 object keys |
| `@nop-chaos/report-designer-core`         | report document/selection/types/helpers, command union/result, adapters/profile, core factory                                                                                     | root `.` 对齐                                                                 |
| `@nop-chaos/report-designer-renderers`    | bridge/event emitter, schema/renderers/register, manifest/host contract, field panel, host data hooks, action provider, report spreadsheet canvas                                 | root `.` + CSS 对齐；`preview.mode` issue见 `[维度03-03]`                     |
| `@nop-chaos/word-editor-core`             | canvas-editor enums/types, bridge, editor/dataset stores, document IO, dataset/template/chart/code models                                                                         | root `.` 对齐                                                                 |
| `@nop-chaos/word-editor-renderers`        | WordEditorPage, renderers/register/schema helper, manifest/host contract, action provider                                                                                         | root `.` + CSS 对齐                                                           |
| `@nop-chaos/nop-debugger`                 | debugger panel, controller/report/automation/window flag, types                                                                                                                   | root `.` 对齐                                                                 |
| `@nop-chaos/ui`                           | shadcn/base UI components, toolbar, Toaster/toast, `cn`, mobile hook, icon utils, i18n getter                                                                                     | root `.` + `./chart` + `./lib/utils` + CSS 对齐                               |
| `@nop-chaos/flux-i18n`                    | init/get/reset/change language, `t`, resources/constants/types, hook, locale objects                                                                                              | root `.` + locale subpaths 对齐                                               |
| `@nop-chaos/tailwind-preset`              | `nopTailwindPreset`                                                                                                                                                               | root `.` 对齐                                                                 |
| `@nop-chaos/theme-tokens`                 | root empty JS export; styles via subpath                                                                                                                                          | root `.` + `./styles.css` 对齐                                                |

## 问题清单

- `[维度03-01]` `@nop-chaos/flux-react/unstable` 被生产主路径依赖，unstable surface 实际成为 public contract。
- `[维度03-02]` Flow Designer `moveNodes` manifest/provider/core 对 `deltas` payload 的端到端约束不一致。
- `[维度03-03]` Report Designer `preview.mode` manifest/provider 比 core command union 更宽，并由 `as ReportDesignerCommand` 绕过。

## 检查范围与排除理由

- 已读取全部 `packages/*/src/index.ts` / `index.tsx`。
- 已抽查全部 `packages/*/package.json` 的 exports map，重点核对 root `.`、CSS subpath、`unstable`、`definitions` 等非 root 导出。
- 已搜索跨包内部路径导入：未发现 `@nop-chaos/<pkg>/src/...` 或未声明内部子路径导入；发现的非 root 导入主要为已声明 CSS、`./definitions`、`./unstable`、`@nop-chaos/ui/chart`、`@nop-chaos/ui/lib/utils`。
- 已检查 `RendererComponentProps`、`ScopeRef`、`FormStoreApi`、`PageStoreApi` 的 core 定义与 runtime/react 使用路径，未在本轮发现除 `unstable` 生产依赖外的新增高价值 API 契约偏移。
- 未重复报告 `variant-field` raw schema read；本轮未发现它由公开 API 契约缺口直接导致。

## 第 2 轮深挖方向

- 深挖所有 host manifest `FluxValueShape` 的 object 语义：哪些是“开放 bag”，哪些实际需要 closed object / dictionary / literal union。
- 对比 compiler `validateFluxValueShape` 与各 provider 本地 `matchesShape` 的差异，尤其是未知键、有限 number、literal union、dictionary map。
- 继续检查 `as XxxCommand` 是否只出现在 provider boundary，还是扩散到 adapter/core 内部主路径。
- 复核 `flux-react/unstable` 中哪些符号必须稳定化，哪些可退回测试/内部专用入口。

## 深挖第 2 轮追加

### [维度03-04] Spreadsheet 多个已发布 host methods 缺失 `args` 契约，provider 放行任意对象后强转为 core command

- **文件+行号**: `packages/spreadsheet-renderers/src/spreadsheet-manifest.ts:440-563`; `packages/spreadsheet-renderers/src/host-action-provider.ts:92-118,147-151`; `packages/spreadsheet-core/src/commands-base.ts:103-131,226-261`; `packages/spreadsheet-core/src/commands-style.ts:16-31,46-63,88-93`
- **证据片段**:
  ```ts
  moveSheet: {
    description: 'Move a worksheet.',
  },
  copySheet: {
    description: 'Copy a worksheet.',
  },
  setSheetTabColor: {
    description: 'Set a worksheet tab color.',
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
  }
  ```
  ```ts
  const result = await dispatch({
    type: `spreadsheet:${method}`,
    ...validation.args,
  } as SpreadsheetCommand);
  ```
- **严重程度**: P1
- **现状**: `moveSheet`、`copySheet`、`setSheetTabColor`、`hideSheet`、`protectSheet`、多个 cell style methods、`fillSeries`、`sortRange` 等 manifest 仅发布 description，没有发布 `args` shape；provider 对这类方法把 `undefined` 转为空对象，或接受任意 object payload，随后强转为 `SpreadsheetCommand`。
- **风险**: host-facing API 对关键 required fields 和 literal union 完全无编译期/运行时契约约束。例如 `moveSheet` core command 需要 `sheetId` / `targetIndex`，style commands 需要 `target` 与枚举值；但 manifest/provider 都不会拒绝缺字段或错误枚举，错误会延迟到 core handler 中表现为 throw、静默无效或非法状态写入。
- **建议**: 为所有已发布 spreadsheet host methods 补齐 `args` shape；对 `fontWeight`、`fontStyle`、`textDecoration`、`border`、`textAlign`、`verticalAlign`、`fillSeries.direction`、`sortRange.direction` 使用 literal union；无参数方法应显式声明空 object 或由 provider 拒绝任意 payload。
- **误报排除**: 这不是动态扩展 payload；core command 类型已经声明了必填字段和有限枚举，provider 的 `as SpreadsheetCommand` 正在掩盖 manifest 缺失。
- **参考文档**: `docs/architecture/capability-contract-model.md`; `docs/architecture/capability-projection-manifest.md`
- **复核状态**: 未复核

### [维度03-05] Spreadsheet `selection.kind` 与 `findOptions.searchScope` manifest 过宽，允许非法 literal union 进入 core 状态/执行分支

- **文件+行号**: `packages/spreadsheet-renderers/src/spreadsheet-manifest.ts:64-74,124-135,185-192,585-624`; `packages/spreadsheet-core/src/types.ts:167-176`; `packages/spreadsheet-core/src/commands-style.ts:113-119`; `packages/spreadsheet-core/src/command-handlers/selection-handlers.ts:23-25`; `packages/spreadsheet-core/src/command-handlers/search-handlers.ts:15-38`
- **证据片段**:
  ```ts
  const selectionShape: FluxValueShape = {
    kind: 'object',
    fields: {
      kind: { kind: 'string' },
      sheetId: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
  ```
  ```ts
  export type SpreadsheetSelectionKind = 'none' | 'cell' | 'range' | 'row' | 'column' | 'sheet';
  ```
  ```ts
  export const handleSetSelection: CommandHandler<SetSelectionCommand> = (store, command) => {
    store.setState({ selection: command.selection, editing: undefined });
    return { ok: true, changed: true };
  };
  ```
  ```ts
  searchScope: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
  ```
  ```ts
  searchScope?: 'sheet' | 'workbook';
  command.options.searchScope === 'sheet' ? state.activeSheetId : undefined
  ```
- **严重程度**: P1
- **现状**: manifest 把 `selection.kind` 和 `findOptions.searchScope` 发布为任意 string，但 core 类型分别是有限 union；provider 只按 manifest 校验后强转，`setSelection` 会把非法 `kind` 直接写入 store，search handler 会把任何非 `'sheet'` 字符串当 workbook 搜索处理。
- **风险**: schema action 可以通过 host validation 写入 `{ kind: "bogus" }` selection，破坏状态机假设；`searchScope: "current"` 等非法值不会被拒绝，而会被静默解释为 workbook scope，导致行为与发布契约不一致。
- **建议**: 将这些字段改为 literal union shape；或者在 provider dispatch 前显式校验枚举并返回 host contract error。
- **误报排除**: 不是 object 开放字段问题；字段本身已存在且语义有限，只是 manifest 用 `string` 放宽了 core union。
- **参考文档**: `docs/architecture/capability-contract-model.md`; `docs/architecture/capability-projection-manifest.md`
- **复核状态**: 未复核

### [维度03-06] Flow Designer `moveBranch.direction` manifest 接受任意 string，provider 将非法值静默改写为 `right`

- **文件+行号**: `packages/flow-designer-renderers/src/designer-manifest.ts:196-205`; `packages/flow-designer-renderers/src/designer-action-provider.ts:306-312`; `packages/flow-designer-renderers/src/designer-command-types.ts:39-40`
- **证据片段**:
  ```ts
  moveBranch: {
    args: {
      kind: 'object',
      fields: {
        nodeId: { kind: 'string' },
        branchId: { kind: 'string' },
        direction: { kind: 'string', description: 'left or right' },
      },
    },
  }
  ```
  ```ts
  direction: args.direction === 'left' ? 'left' : 'right',
  ```
  ```ts
  | { type: 'moveBranch'; nodeId: string; branchId: string; direction: 'left' | 'right' }
  ```
- **严重程度**: P1
- **现状**: manifest 仅用 description 说明 `left or right`，`matchesShape` 接受任意 string；provider 不拒绝非法值，而是把所有非 `'left'` 值静默转换为 `'right'`。
- **风险**: `direction: "up"`、`"previous"` 等非法 host payload 会被执行为向右移动分支，产生与调用方意图相反的图结构变更；公开契约、provider enforcement 与 adapter command union 不一致。
- **建议**: 将 `direction` 改为 literal union shape：`'left' | 'right'`；provider 应拒绝非法值，不应用 fallback 改写语义。
- **误报排除**: 不是 `moveNodes` 重报；这是独立的 `moveBranch.direction` literal union 契约缺口。
- **参考文档**: `docs/architecture/capability-contract-model.md`; `docs/architecture/flow-designer/design.md`
- **复核状态**: 未复核

### [维度03-07] Word Editor chart/code 类型 manifest 退化为 string，编译期契约不能表达 core 的有限枚举

- **文件+行号**: `packages/word-editor-renderers/src/word-editor-manifest.ts:10-34,143-150`; `packages/word-editor-renderers/src/word-editor-action-provider.ts:200-226`; `packages/word-editor-core/src/chart-model.ts:1-20,35-44`; `packages/word-editor-core/src/code-model.ts:1-17,29-38`
- **证据片段**:
  ```ts
  const chartShape: FluxValueShape = {
    kind: 'object',
    fields: {
      id: { kind: 'string' },
      chartName: { kind: 'string' },
      chartType: { kind: 'string' },
  ```
  ```ts
  const codeShape: FluxValueShape = {
    kind: 'object',
    fields: {
      id: { kind: 'string' },
      codeName: { kind: 'string' },
      codeType: { kind: 'string' },
  ```
  ```ts
  export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area';
  const VALID_CHART_TYPES: ChartType[] = ['bar', 'line', 'pie', 'scatter', 'area'];
  ```
  ```ts
  export type CodeType = 'barcode' | 'qrcode';
  const VALID_CODE_TYPES: CodeType[] = ['barcode', 'qrcode'];
  ```
- **严重程度**: P2
- **现状**: Word manifest 发布 `insertChart` / `insertCode` 时把 `chartType`、`codeType` 声明为任意 string；provider 的 shape validation 会放行非法枚举，之后才依赖 `validateDocChart` / `validateDocCode` 做 domain validation。
- **风险**: host manifest 与 compiler validation 无法提前发现非法 chart/code 类型；调用方看到的是宽松 contract，运行时才收到泛化错误（如 “complete payload”），而不是 contract-level enum violation。
- **建议**: 用 literal union shape 表达 `ChartType` 与 `CodeType`；provider 仍可保留 domain validation，但不应承担 manifest 本该表达的枚举约束。
- **误报排除**: provider 最终会拒绝非法值，因此不是未校验漏洞；问题是发布契约比 core/domain model 更宽，导致 compile/runtime contract 不一致。
- **参考文档**: `docs/architecture/capability-contract-model.md`; `docs/architecture/capability-projection-manifest.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度03-08] Flow Designer manifest 未发布树结构插入命令，但 provider/adapter 已把它们作为 live command surface 执行

- **文件+行号**: `packages/flow-designer-renderers/src/designer-command-types.ts:68-80`; `packages/flow-designer-renderers/src/designer-command-adapter.ts:37-48,283-405`; `packages/flow-designer-renderers/src/designer-action-provider.ts:119-160`; `packages/flow-designer-renderers/src/designer-manifest.ts:69-389`
- **证据片段**:
  ```ts
  | { type: 'insertChainNode'; sourceId: string; nodeType: string; data?: Record<string, unknown> }
  | {
      type: 'insertChainNodeAtMerge';
      targetId: string;
      nodeType: string;
      data?: Record<string, unknown>;
    }
  | {
      type: 'insertBranchPair';
  ```
  ```ts
  case 'insertChainNode':
  case 'insertChainNodeAtMerge':
  case 'insertBranchPair':
    return true;
  ```
  ```ts
  listMethods() {
    return [
      'addNode',
      'addBranch',
      ...
      'updateMultipleNodes',
    ];
  }
  ```
- **严重程度**: P1
- **现状**: `DesignerCommand` 与 `createDesignerCommandAdapter` 已实现 `insertChainNode` / `insertChainNodeAtMerge` / `insertBranchPair` 三个树/链插入命令，且 `dingflow-command-dispatch` 等主路径会构造这些命令；但 host manifest 与 `createDesignerActionProvider().listMethods()` 均未发布这三个方法，也没有 `args` 契约。
- **风险**: Flow Designer 的 schema-callable host capability manifest 不能完整代表 live domain command surface：工具/编译期会认为这些能力不存在，而运行时代码又把它们作为正式命令处理，导致 manifest、provider、adapter/core 三层契约分裂。后续若 schema 或 authoring 工具需要调用这些树结构插入能力，只能绕过 manifest 或重复发明私有入口。
- **建议**: 明确决策这些命令是否属于 schema-callable host API。若属于，补齐 manifest methods、provider `listMethods()` 与 invoke 分支的结构化 args/result 契约；若不属于，则将其从跨层 public `DesignerCommand` surface 中隔离为 renderer/adapter 内部命令，避免被误认为 host capability。
- **误报排除**: 这不是已覆盖的 `moveNodes` / `moveBranch` payload 问题；该条关注的是“已实现且主路径使用的 domain command 未进入 manifest/provider 发布面”，属于 capability surface 缺失而非单个字段 shape 过宽。
- **参考文档**: `docs/architecture/capability-projection-manifest.md`; `docs/architecture/capability-contract-model.md`; `docs/architecture/flow-designer/design.md`
- **复核状态**: 未复核

### [维度03-09] Report Designer 无参 host methods 在 provider 中接受任意对象 payload，manifest 的“无 args”契约未被运行时执行

- **文件+行号**: `packages/report-designer-renderers/src/report-designer-manifest.ts:365-391`; `packages/report-designer-renderers/src/host-action-provider.ts:104-132,161-165`; `packages/report-designer-core/src/core-dispatch.ts:162-176,276-328`
- **证据片段**:
  ```ts
  closeInspector: {
    description: 'Close the inspector.',
  },
  ...
  stopPreview: {
    description: 'Stop report preview.',
  },
  undo: {
    description: 'Undo last report-designer change.',
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
  const result = await dispatch({
    type: `report-designer:${method}`,
    ...validation.args,
  } as ReportDesignerCommand);
  ```
- **严重程度**: P2
- **现状**: `closeInspector`、`stopPreview`、`undo`、`redo`、`save` 等 manifest 未声明 `args`，按 capability contract 表示无参数方法；但 provider 对所有无 args 方法接受任意 object payload，并把这些额外字段 spread 到 core command 后强转为 `ReportDesignerCommand`。
- **风险**: 编译期/工具层会把这些方法视为无参数，而运行时实际允许 `{ target: ... }`、`{ mode: ... }` 等任意对象进入 command envelope。虽然当前 core switch 多数会忽略额外字段，但公开契约真实性被削弱，未来新增同名字段或基于 command object 做审计/序列化/回放时会引入不可预期的兼容面。
- **建议**: 对无参数 host methods 显式区分“no payload allowed”和“open object payload”。无参数方法应在 provider 中拒绝非 `undefined` payload，或在 manifest 中声明 `args: { kind: 'object', fields: {} }` 并约定 closed/open 语义；避免用 `{ ...validation.args } as ReportDesignerCommand` 放大额外字段。
- **误报排除**: 这不是 `preview.mode` 重报；该条覆盖的是所有无 args methods 的 provider 通用放行路径，且风险来自 manifest 无参契约与 runtime 接受任意 object 的不一致。
- **参考文档**: `docs/architecture/capability-projection-manifest.md`; `docs/architecture/capability-contract-model.md`
- **复核状态**: 未复核

### [维度03-10] Spreadsheet projection manifest 声明 `activeCell`/`activeRange` 为 `null | object`，实际 host scope 发布 `undefined`

- **文件+行号**: `packages/spreadsheet-renderers/src/spreadsheet-manifest.ts:154-167`; `packages/spreadsheet-renderers/src/bridge.ts:36-63`; `packages/spreadsheet-renderers/src/page-renderer.tsx:134-147`
- **证据片段**:

  ```ts
  activeCell: {
    schema: {
      kind: 'union',
      anyOf: [{ kind: 'null' }, cellRefShape],
    },
    description: 'Current active cell when the selection kind is cell.',
  },
  ```

  ```ts
  let activeCell: SpreadsheetCellRef | undefined;
  let activeRange: SpreadsheetRange | undefined;

  if (runtime.selection.kind === 'cell' && runtime.selection.anchor) {
    activeCell = runtime.selection.anchor;
  }
  ```

  ```ts
  const spreadsheetScopeData = useMemo(
    () => ({
      spreadsheet,
      workbook: spreadsheet.workbook,
      activeSheet: spreadsheet.activeSheet,
      selection: spreadsheet.selection,
      activeCell: spreadsheet.activeCell,
      activeRange: spreadsheet.activeRange,
  ```

- **严重程度**: P2
- **现状**: manifest 对外发布 `activeCell` 与 `activeRange` 的 absent 状态为 `null`，但 `deriveHostSnapshot` 默认使用 `undefined`，`SpreadsheetPageRenderer` 又直接把 `undefined` 写入 host scope。
- **风险**: 编译期/工具层会引导 schema 作者按 `null` 判断，但运行时表达式读到的是 `undefined`；低代码表达式、条件判断、调试器投影与 manifest contract 不一致，容易出现 `${activeCell === null}` 永远不成立一类的契约偏差。
- **建议**: 统一 projection absent 语义。若 manifest 保持 `null | object`，则 `deriveHostSnapshot` 和 scope data 应显式发布 `null`；若运行时选择 `undefined`，则 manifest shape 需要能表达 optional/undefined 或改为 optional projection field，并同步文档。
- **误报排除**: 这不是 readonly projection live reference 问题；不涉及 clone/copy。问题仅在 manifest 声明的 value domain 与实际 host scope value domain 不一致。
- **参考文档**: `docs/architecture/capability-projection-manifest.md`; `docs/components/spreadsheet-page/design.md`
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度03-11] 通用 host-contract 编译校验未执行“无 args 方法不得传参”的 manifest 契约

- **文件+行号**: `packages/flux-core/src/schema-diagnostics/manifest.ts:104-110`; `packages/flux-compiler/src/schema-compiler/host-action-validation.ts:112-128`
- **证据片段**:
  ```ts
  export interface HostCapabilityMethod {
    args?: FluxValueShape;
    result?: FluxValueShape;
    description?: string;
    idempotent?: boolean;
    deprecated?: boolean;
  }
  ```
  ```ts
  if (method.args) {
    const argsPath = appendJsonPointer(path, 'args');
    const validationResult = validateFluxValueShape(
      args,
      method.args,
      argsPath,
  ```
- **严重程度**: P2
- **现状**: `HostCapabilityMethod.args` 缺省表示该方法未声明 payload shape，但 `validateHostAction` 只有在 `method.args` 存在时才校验；当 schema 对无参 host method 传入任意 `args` 对象时，通用 compiler host-contract validation 不会报错。
- **风险**: manifest 对工具/编译期表达的“无参数方法”契约无法被核心校验执行；即使各 host provider 后续分别修复运行时拒绝，schema 编译期仍会接受与 manifest 不一致的调用。
- **建议**: 在 `validateHostAction` 中补充分支：当 `!method.args && args !== undefined` 时发出 `invalid-host-capability-args`；若确需开放 payload，应在 manifest 中显式声明 `args: { kind: 'object', fields: {} }` 或 `unknown`。
- **误报排除**: 这不是 spreadsheet/report 已报的 provider 无参 payload 放行重报；本条关注通用 compiler/core contract validation 缺口，独立于具体 host provider。
- **参考文档**: `docs/architecture/capability-projection-manifest.md`; `docs/architecture/capability-contract-model.md`
- **复核状态**: 未复核

### [维度03-12] `componentCapabilityContracts` 已发布 args/result 契约，但 `component:<method>` 编译与运行时均不消费 shape

- **文件+行号**: `packages/flux-core/src/types/renderer-core.ts:283-303`; `packages/flux-compiler/src/schema-compiler/action-selector-validation.ts:139-146`; `packages/flux-runtime/src/action-adapter.ts:347-367`
- **证据片段**:
  ```ts
  export interface RendererCapabilityContract extends CapabilityMethodContract {
    handle: string;
    displayName: string;
  }
  ...
  componentCapabilityContracts?: readonly RendererCapabilityContract[];
  ```
  ```ts
  if (resolution.class === 'component-targeted') {
    diagnostics.emit({
      code: 'unvalidated-component-target',
      path: actionPath,
      message: `Component-targeted selector "${resolution.action}" uses the correct selector family, but compile-time target typing is unavailable without explicit target-binding metadata.`,
  ```
  ```ts
  if (handle.capabilities.hasMethod && !handle.capabilities.hasMethod(invocation.method)) {
    const methods = handle.capabilities.listMethods?.();
    if (methods && !methods.includes(invocation.method)) {
  ...
  const result = await handle.capabilities.invoke(invocation.method, payloadWithSignal, ctx);
  ```
- **严重程度**: P2
- **现状**: `RendererDefinition.componentCapabilityContracts` 复用了 `CapabilityMethodContract`，可声明 `args/result` shape；但 compiler 对所有 `component:*` 只发“target typing unavailable”诊断，不按目标 renderer 的 contract 校验 method/args；runtime adapter 也只检查 `hasMethod/listMethods`，随后直接把 payload 交给 handle。
- **风险**: renderer definition 公开的 component capability 契约会退化为文档面，无法约束 schema authoring 或运行时 payload；实际 handle 实现可以与声明的 args/result 长期漂移，工具看到的 API surface 与执行边界不一致。
- **建议**: 明确 component capability contract 的执行层级：短期可在 authoring/debugger 中标注“metadata-only”；中期为 component target 解析补 target-binding metadata，使 compiler 能按 `componentCapabilityContracts` 校验 method 与 args；runtime 可提供共享 shape validator 或 handle registration 时的 contract 关联。
- **误报排除**: 不是要求把 component capability 合并进 host manifest；文档明确二者 runtime lookup 分离。本条仅指出已发布的 renderer-local method contract 没有对应 compiler/runtime consumer。
- **参考文档**: `docs/architecture/capability-contract-model.md`; `docs/references/renderer-interfaces.md`
- **复核状态**: 未复核

## 深挖第 5 轮追加

### [维度03-13] `FluxValueShape.object` 未声明开闭语义，compiler 与各 provider 对未知字段执行不一致

- **文件+行号**: `packages/flux-core/src/schema-diagnostics/manifest.ts:46-50`; `packages/flux-compiler/src/schema-compiler/flux-value-shape-validation.ts:199-233`; `packages/spreadsheet-renderers/src/host-action-provider.ts:63-72`; `packages/report-designer-renderers/src/host-action-provider.ts:81-97`
- **证据片段**:
  ```ts
  export interface FluxObjectShape extends FluxValueShapeBase {
    kind: 'object';
    fields: Readonly<Record<string, FluxValueShape>>;
    optional?: readonly string[];
  }
  ```
  ```ts
  for (const [fieldName, fieldShape] of Object.entries(shape.fields)) {
    const fieldValue = record[fieldName];
    ...
    if (!validateFluxValueShape(fieldValue, fieldShape, fieldPath, diagnostics, issue)) {
      valid = false;
    }
  }
  return valid;
  ```
  ```ts
  const allowedKeys = new Set(Object.keys(shape.fields));
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      return false;
    }
  }
  ```
  ```ts
  for (const [key, fieldShape] of Object.entries(shape.fields)) {
    ...
    if (!matchesShape(value[key], fieldShape)) {
      return false;
    }
  }
  return true;
  ```
- **严重程度**: P1
- **现状**: `FluxObjectShape` 只声明 `fields/optional`，没有 `additionalProperties` / `open` / `closed` 等开闭对象语义。compiler 的 `validateFluxValueShape` 只校验已声明字段，默认允许未知字段；spreadsheet provider 对同一 shape 默认拒绝未知字段；report/flow/word provider 默认允许未知字段。
- **风险**: 同一份 manifest object args 在编译期、不同 provider 运行期会得到不同结果：schema 编译可通过但某些 provider 运行时拒绝，或某些 host 放行额外字段进入 command envelope。该问题会持续放大 manifest/provider/core 契约漂移，且无法从 `FluxValueShape` 类型本身判断调用方应如何处理未知键。
- **建议**: 在 `FluxObjectShape` 增加明确开闭语义，例如 `additionalProperties?: false | FluxValueShape` 或 `unknownKeys?: 'allow' | 'reject'`；将 compiler 与所有 provider 改为复用同一 validator；对现有 `{ fields: {} }` 明确区分“空 closed object”和“开放 object bag”。
- **误报排除**: 这不是已报的某个具体 spreadsheet/flow/report/word method payload 问题，也不是无 args 方法传参问题；本条关注 `FluxValueShape.object` 作为核心契约语言本身缺少开闭语义，导致 compiler 与 provider 对所有 object shape 的默认行为不一致。
- **参考文档**: `docs/architecture/capability-contract-model.md`; `docs/architecture/capability-projection-manifest.md`
- **复核状态**: 未复核

## 深挖第 6 轮追加

### [维度03-14] Report Designer host projection manifest 把可缺省字段声明为必有/可 null，实际 scope 发布 `undefined`

- **文件+行号**: `packages/report-designer-renderers/src/report-designer-manifest.ts:226-253,279-297`; `packages/report-designer-renderers/src/host-data.ts:185-226`; `packages/report-designer-core/src/types.ts:102-107`
- **证据片段**:
  ```ts
  selectionTarget: {
    schema: selectionTargetShape,
    description: 'Canonical current selection target.',
  },
  activeCell: {
    schema: { kind: 'union', anyOf: [{ kind: 'null' }, { kind: 'object', fields: {} }] },
  ```
  ```ts
  selectionTarget: snapshot.selectionTarget,
  selectionKind: snapshot.selectionTarget?.kind,
  ...
  activeCell:
    snapshot.selectionTarget?.kind === 'cell' ? snapshot.selectionTarget.cell : undefined,
  activeRange:
    snapshot.selectionTarget?.kind === 'range' ? snapshot.selectionTarget.range : undefined,
  ```
  ```ts
  export interface ReportDesignerRuntimeSnapshot {
    ...
    selectionTarget?: ReportSelectionTarget;
    activeMeta?: MetadataBag;
  ```
- **严重程度**: P1
- **现状**: Report Designer manifest 对 `selectionTarget` 声明为必有 `selectionTargetShape`，对 `designer.selectionKind`、`runtime.previewMode`、`activeCell`、`activeRange` 等声明为 `null | ...` 或 optional 字段；但 live `buildReportDesignerScopeData()` 直接把 core snapshot 的 optional/条件字段投影出来，缺省时实际值是 `undefined`，不是 manifest 声明的必有对象或 `null`。
- **风险**: compiler/tooling 会按 manifest 引导 schema 作者写 `${selectionTarget.kind}` 或 `activeCell === null` 一类判断，但运行时可能得到 `undefined`，导致表达式判断、调试器投影、host scope 文档和实际值域不一致。该问题发生在 report-designer canonical projection 的核心字段上，影响 toolbar/fieldPanel/inspector/body 等 host region 的 authoring contract。
- **建议**: 统一 absent 语义。若 manifest 选择 `null` 表达无当前目标/无 active cell，则 `buildReportDesignerScopeData()` 应显式归一化为 `null`；若运行时继续发布 `undefined`，则 manifest/shape 语言需要表达 optional/undefined，并把 `selectionTarget` 等字段标为 optional projection field。同步检查 `designer.selectionTarget`、`designer.selectionKind`、`runtime.previewMode`、`meta`、`inspectorPanels`、`activeCell`、`activeRange` 等同类字段。
- **误报排除**: 这不是已报的 Spreadsheet `activeCell`/`activeRange` 条目；本条对象是 Report Designer 自身 canonical host projection，且包含 `selectionTarget` 这类 manifest 声明为必有但 core 类型为 optional 的字段，也不是 FluxValueShape object 开闭语义问题。
- **参考文档**: `docs/architecture/capability-projection-manifest.md`; `docs/components/report-designer-page/design.md`
- **复核状态**: 未复核

## 深挖第 7 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- `[维度03-01]`: 保留（P1）。live code 仍在 `packages/flux-react/package.json` 发布 `./unstable`，且 form/data/flow 等生产 renderer 主路径直接导入 Context、`RenderNodes`、runtime helper，unstable 已成为跨包运行时契约。
- `[维度03-02]`: 保留（P1）。Flow manifest 的 `moveNodes.args.deltas` 仍是空 object shape，provider 仅强转为 `Record<string,{dx,dy}>`，core 在 `moveNodesInDocument` 中直接执行坐标加法。
- `[维度03-03]`: 保留（P1）。Report manifest 仍声明 `preview.mode` 为任意 string，provider 通过 `as ReportDesignerCommand` dispatch，而 core command 类型仅允许有限 preview mode union。
- `[维度03-04]`: 保留（P1）。Spreadsheet manifest 中 `moveSheet`、sheet/style/fill/sort 等多项 method 仍只有 description 无 `args`，provider 对无 args contract 接受任意 object 后强转为 `SpreadsheetCommand`。
- `[维度03-05]`: 保留（P1）。Spreadsheet manifest 仍将 `selection.kind`、`findOptions.searchScope` 声明为宽 string，core selection 类型和 searchScope 类型是有限 union，handler 会写入非法 selection 或把非 `sheet` 静默当 workbook。
- `[维度03-06]`: 保留（P1）。Flow `moveBranch.direction` manifest 仍是 string，provider 仍用 `args.direction === 'left' ? 'left' : 'right'` 将非法值静默改写为 right。
- `[维度03-07]`: 保留（P2）。Word manifest 仍把 `chartType`/`codeType` 暴露为 string，虽 provider 后续会调用 `validateDocChart`/`validateDocCode` 拒绝非法值，但 manifest/编译期契约仍比 core domain enum 更宽。
- `[维度03-08]`: 驳回（无）。live package root 未导出 `DesignerCommand`/adapter，`createDesignerActionProvider().listMethods()` 和 invoke 均未发布或执行 `insertChainNode*`/`insertBranchPair`，这些命令当前是 renderer 内部 dingflow/adapter surface，不足以证明 host manifest 缺失。
- `[维度03-09]`: 保留（P2）。Report manifest 的 `closeInspector`、`stopPreview`、`undo`、`redo`、`save` 等仍无 args，provider 对这类 method 接受任意 object 并 spread 到 core command envelope。
- `[维度03-10]`: 保留（P2）。Spreadsheet projection manifest 仍声明 `activeCell`/`activeRange` 为 `null | object`，但 `deriveHostSnapshot` 和 page scope 仍发布 `undefined`。
- `[维度03-11]`: 保留（P2）。通用 `validateHostAction` 仍只在 `method.args` 存在时调用 `validateFluxValueShape`，对无 args method 传入 args 不产生 host-contract diagnostic。
- `[维度03-12]`: 保留（P2）。`RendererDefinition.componentCapabilityContracts` 仍可声明 args/result，但 compiler 对 `component:*` 只发 unvalidated target 诊断，runtime adapter 也只检查 method 存在后直接 invoke payload。
- `[维度03-13]`: 保留（P1）。`FluxObjectShape` 仍只有 `fields/optional` 无开闭语义，compiler 允许未知字段，spreadsheet provider 拒绝未知字段，report/flow/word provider 允许未知字段。
- `[维度03-14]`: 保留（P1）。Report projection manifest 仍把 `selectionTarget` 等声明为必有或 `null | object`，但 `buildReportDesignerScopeData()` 直接发布 snapshot optional 值和条件 `undefined`。

## 子项复核建议

`[维度03-01]`、`[维度03-02]`、`[维度03-03]`、`[维度03-04]`、`[维度03-05]`、`[维度03-06]`、`[维度03-11]`、`[维度03-12]`、`[维度03-13]`、`[维度03-14]`、`[维度03-08]`（争议项，仅复核是否确需把内部 dingflow adapter command 纳入 host API）。

## 子项复核结论

- `[维度03-01]`: 子项复核通过（P1）。`flux-react` 仍发布 `./unstable`，且多个生产 renderer 主路径继续导入该 surface。
- `[维度03-02]`: 子项复核通过（P1）。Flow `moveNodes.deltas` 仍是空 object shape，provider 仍强转为 `{dx,dy}` map 后进入 core。
- `[维度03-03]`: 子项复核通过（P1）。Report `preview.mode` manifest 仍是任意 string，provider 仍通过 `as ReportDesignerCommand` 绕过 core union。
- `[维度03-04]`: 子项复核通过（P1）。Spreadsheet 多个公开 methods 仍无 `args` shape，provider 仍接受 object payload 后强转为 `SpreadsheetCommand`。
- `[维度03-05]`: 子项复核通过（P1）。Spreadsheet `selection.kind` 与 `findOptions.searchScope` 仍发布为宽 string，与 core union 不一致。
- `[维度03-06]`: 子项复核通过（P1）。Flow `moveBranch.direction` 仍发布为 string，provider 仍将非 `left` 值静默改写为 `right`。
- `[维度03-07]`: 子项复核通过（P2）。Word chart/code manifest 仍将 `chartType`/`codeType` 发布为 string，虽 provider 后续会 domain 校验但 API contract 仍过宽。
- `[维度03-08]`: 驳回（无）。live host manifest/provider 未发布或执行 `insertChainNode*`/`insertBranchPair`，当前证据不足以证明 host API 缺失。
- `[维度03-09]`: 子项复核通过（P2）。Report 无 args methods 仍接受任意 object payload 并 spread 到 core command envelope。
- `[维度03-10]`: 子项复核通过（P2）。Spreadsheet manifest 声明 absent 为 `null`，但 `deriveHostSnapshot` 仍发布 `activeCell/activeRange: undefined`。
- `[维度03-11]`: 子项复核通过（P2）。通用 `validateHostAction` 仍只在 `method.args` 存在时校验，未拒绝无参 method 的传参。
- `[维度03-12]`: 子项复核通过（P2）。`componentCapabilityContracts` 仍可声明 args/result，但 compiler/runtime 仍未消费 shape。
- `[维度03-13]`: 子项复核通过（P1）。`FluxObjectShape` 仍无开闭语义，compiler 与各 provider 对未知字段行为仍不一致。
- `[维度03-14]`: 子项复核通过（P1）。Report projection manifest 仍声明部分字段必有或 `null | object`，但 `buildReportDesignerScopeData()` 仍发布 optional/条件 `undefined`。

## 最终保留项

| 编号      | 严重程度 | 文件路径                                                                                                                               | 摘要                                                                                             |
| --------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| 维度03-01 | P1       | `packages/flux-react/package.json`; `packages/flux-react/src/unstable.ts`                                                              | `flux-react` 仍发布 `./unstable`，且多个生产 renderer 主路径继续导入该 surface。                 |
| 维度03-02 | P1       | `packages/flow-designer-renderers/src/designer-manifest.ts`; `packages/flow-designer-renderers/src/designer-action-provider.ts`        | Flow `moveNodes.deltas` 仍是空 object shape，provider 强转后进入 core。                          |
| 维度03-03 | P1       | `packages/report-designer-renderers/src/report-designer-manifest.ts`; `packages/report-designer-renderers/src/host-action-provider.ts` | Report `preview.mode` manifest 仍是任意 string，provider强转绕过 core union。                    |
| 维度03-04 | P1       | `packages/spreadsheet-renderers/src/spreadsheet-manifest.ts`; `packages/spreadsheet-renderers/src/host-action-provider.ts`             | Spreadsheet 多个公开 methods 仍无 `args` shape，provider 接受 object payload 后强转。            |
| 维度03-05 | P1       | `packages/spreadsheet-renderers/src/spreadsheet-manifest.ts`                                                                           | Spreadsheet `selection.kind` 与 `findOptions.searchScope` 仍发布为宽 string。                    |
| 维度03-06 | P1       | `packages/flow-designer-renderers/src/designer-manifest.ts`; `packages/flow-designer-renderers/src/designer-action-provider.ts`        | Flow `moveBranch.direction` 仍发布为 string，provider 将非 `left` 值静默改写为 `right`。         |
| 维度03-07 | P2       | `packages/word-editor-renderers/src/word-editor-manifest.ts`                                                                           | Word chart/code manifest 仍将 `chartType`/`codeType` 发布为 string。                             |
| 维度03-09 | P2       | `packages/report-designer-renderers/src/report-designer-manifest.ts`; `packages/report-designer-renderers/src/host-action-provider.ts` | Report 无 args methods 仍接受任意 object payload 并 spread 到 core command envelope。            |
| 维度03-10 | P2       | `packages/spreadsheet-renderers/src/spreadsheet-manifest.ts`; `packages/spreadsheet-renderers/src/bridge.ts`                           | Spreadsheet manifest 声明 absent 为 `null`，但运行时仍发布 `activeCell/activeRange: undefined`。 |
| 维度03-11 | P2       | `packages/flux-compiler/src/schema-compiler/host-action-validation.ts`                                                                 | 通用 `validateHostAction` 未拒绝无参 method 的传参。                                             |
| 维度03-12 | P2       | `packages/flux-core/src/types/renderer-core.ts`; `packages/flux-runtime/src/action-adapter.ts`                                         | `componentCapabilityContracts` 可声明 args/result，但 compiler/runtime 仍未消费 shape。          |
| 维度03-13 | P1       | `packages/flux-core/src/schema-diagnostics/manifest.ts`; `packages/flux-compiler/src/schema-compiler/flux-value-shape-validation.ts`   | `FluxObjectShape` 仍无开闭语义，compiler 与各 provider 对未知字段行为不一致。                    |
| 维度03-14 | P1       | `packages/report-designer-renderers/src/report-designer-manifest.ts`; `packages/report-designer-renderers/src/host-data.ts`            | Report projection manifest 声明部分字段必有或 `null                                              | object`，但运行时发布 optional/条件 `undefined`。 |
