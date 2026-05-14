# 维度 03：API 表面积与契约一致性

## 第 1 轮（初审）

### [维度03-01] `DesignerPageSchemaInput.config` 在公开类型里可选，但 live renderer/definition 把它当必需合同

- **文件**: `packages/flow-designer-renderers/src/schemas.ts:4-13`, `packages/flow-designer-renderers/src/index.tsx:176-182`, `packages/flow-designer-renderers/src/designer-page.tsx:27-31`
- **证据片段**:
  ```ts
  export interface DesignerPageSchemaInput {
    type: 'designer-page';
    config?: DesignerConfig;
  }
  ```
  ```ts
  config: {
    displayName: 'Config',
    required: true,
  }
  ```
  ```tsx
  if (!config) {
    return <div>{t('flux.flowDesigner.configRequired')}</div>;
  }
  ```
- **严重程度**: P2
- **现状**: TS schema 输入把 `config` 标成可选，但 renderer definition 和运行时 fallback 都按“缺失即错误”处理。
- **风险**: 调用方会被错误地鼓励省略 `config`；编译期与运行期契约不一致。
- **建议**: 统一其一：要么把 `config` 改为必填，要么给出真实可工作的默认 config，并同步 prop contract。
- **误报排除**: 不是单纯文档措辞；type、definition、runtime 三方明确失配。
- **复核状态**: 未复核

### [维度03-02] `report-inspector-shell` 的 type/docs/registration/runtime 仍有字段漂移

- **文件**: `docs/components/report-inspector-shell/design.md:15-27`, `packages/report-designer-renderers/src/types.ts:51-57`, `packages/report-designer-renderers/src/renderers.tsx:131-137`, `packages/report-designer-renderers/src/inspector-shell-renderer.tsx:51-63`
- **证据片段**:
  ```md
  - 当前 fields: `title` 为 `value-or-region`，`emptyLabel`、`noSelectionLabel`、`saveLabel`、`errorLabel` 为普通值字段
  - 当前导出字段包括 `emptyLabel`、`noSelectionLabel`、`saveLabel`、`errorLabel`。
  ```
  ```ts
  export interface ReportInspectorShellSchema extends BaseSchema {
    type: 'report-inspector-shell';
    title?: string | SchemaInput;
    emptyLabel?: string;
    noSelectionLabel?: string;
    errorLabel?: string;
  }
  ```
  ```ts
  fields: [
    { key: 'title', kind: 'value-or-region', regionKey: 'title' },
    { key: 'noSelectionLabel', kind: 'prop' },
    { key: 'errorLabel', kind: 'prop' },
  ],
  ```
- **严重程度**: P3
- **现状**: 文档仍宣称 `saveLabel`，type 又暴露 `emptyLabel`，但 registration/runtime 实际只接 `title`、`noSelectionLabel`、`errorLabel`。
- **风险**: 作者按组件文档或 TS 类型写入字段后，可能遭遇静默无效或 registration 不生效。
- **建议**: 选定单一公开面并统一更新 docs/type/registration/runtime；若 `emptyLabel`/`saveLabel` 不支持，应从文档和类型中移除。
- **误报排除**: 不是单点文档笔误；四个面向外部的契约层彼此不一致。
- **复核状态**: 未复核

### [维度03-03] `report-designer-page` 公开类型把 `toolbar/fieldPanel/inspector` 错窄化为专用 schema，live surface 实际接受更宽的 region 输入

- **文件**: `packages/report-designer-renderers/src/types.ts:31-40`, `packages/report-designer-renderers/src/renderers.tsx:201-213`, `packages/report-designer-renderers/src/page-renderer.tsx:428-455`
- **证据片段**:
  ```ts
  toolbar?: ReportToolbarSchema;
  fieldPanel?: ReportFieldPanelSchema;
  inspector?: ReportInspectorSchema;
  dialogs?: BaseSchema | BaseSchema[];
  body?: BaseSchema | BaseSchema[];
  ```
  ```ts
  { key: 'toolbar', kind: 'region', regionKey: 'toolbar' },
  { key: 'fieldPanel', kind: 'region', regionKey: 'fieldPanel' },
  { key: 'inspector', kind: 'region', regionKey: 'inspector' },
  ```
  ```ts
  const toolbarSchema = props.props.toolbar as RenderNodeInput | undefined;
  const fieldPanelSchema = props.props.fieldPanel as RenderNodeInput | undefined;
  const inspectorSchema = props.props.inspector as RenderNodeInput | undefined;
  ```
- **严重程度**: P2
- **现状**: public type surface 要求专用 schema，但 renderer definition 把三者注册成 region，运行时也按更宽的 `RenderNodeInput` 渲染。
- **风险**: TS surface 会错误阻止合法 override，用法被迫绕过类型或误导成只能传专用 renderer。
- **建议**: 将三者公开类型统一放宽到 region 输入面，并补充 `report-inspector-shell` 等实际支持的 override 示例。
- **误报排除**: 不是“未来也许会支持”；live runtime 已在消费更宽的输入面。
- **复核状态**: 未复核

### [维度03-04] `report-designer-page` 的 `document/designer` 在公开合同里标为必需，但 runtime 会静默兜底默认值

- **文件**: `packages/report-designer-renderers/src/types.ts:31-33`, `packages/report-designer-renderers/src/renderers.tsx:174-187`, `packages/report-designer-renderers/src/page-renderer.tsx:152-163,278-285`
- **证据片段**:
  ```ts
  document: ReportTemplateDocument;
  designer: ReportDesignerConfig;
  ```
  ```ts
  document: { required: true },
  designer: { required: true },
  ```
  ```ts
  function resolveReportTemplateDocument(value: unknown): ReportTemplateDocument {
    if (isReportTemplateDocument(value)) return value;
    return createReportTemplateDocument(
      createEmptyDocument('report-designer-page-invalid-document'),
    );
  }
  function resolveReportDesignerConfig(value: unknown): ReportDesignerConfig {
    return isRecord(value) ? (value as ReportDesignerConfig) : {};
  }
  ```
- **严重程度**: P2
- **现状**: 对外表面宣称这两个输入是 canonical required props，但 runtime 对无效值直接回退到空 document/空 config。
- **风险**: 错误配置被静默吞掉，宿主可能在“看起来能渲染”的状态下继续运行，掩盖 schema 缺陷。
- **建议**: 二选一统一：要么保留 required 并在 runtime 报错/告警；要么正式把 fallback 记为 documented compatibility contract。
- **误报排除**: 不是防御式编程本身有问题；问题在于防御性 fallback 与公开 required contract 相互矛盾。
- **复核状态**: 未复核

### [维度03-05] `@nop-chaos/report-designer-renderers` 包入口遗漏导出 `createReportDesignerActionProvider`

- **文件**: `packages/report-designer-renderers/src/host-action-provider.ts:49-74`, `packages/report-designer-renderers/src/index.ts:1-51`
- **证据片段**:
  ```ts
  export function createReportDesignerActionProvider(
    dispatch: (command: ReportDesignerCommand) => Promise<ReportDesignerCommandResult>,
  ): ActionNamespaceProvider {
  ```
  ```ts
  export {
    createHostData,
    buildReportDesignerScopeData,
    useReportDesignerHostScope,
  } from './host-data.js';
  ```
- **严重程度**: P2
- **现状**: 包内存在正式 host action provider 创建器，但根入口未重导出；同包测试只能走私有模块路径。
- **风险**: 外部消费者无法通过稳定包入口获取该公共能力，只能依赖私有子路径。
- **建议**: 在 `src/index.ts` 补导出 `createReportDesignerActionProvider`，与 spreadsheet 家族保持对齐。
- **误报排除**: 不是要求“多导出内部工具”；这是领域 host 的公开接入原语，且同类包已有对称导出。
- **复核状态**: 未复核

### [维度03-06] `spreadsheet-page` 的默认 `body/canvas` 合同与组件文档漂移，live 默认只渲染诊断 fallback

- **文件**: `docs/components/spreadsheet-page/design.md:5-7,25-28,43-45`, `packages/spreadsheet-renderers/src/types.ts:14-20`, `packages/spreadsheet-renderers/src/page-renderer.tsx:77-88,146-157,201-205`
- **证据片段**:
  ```md
  - `spreadsheet-page` 是可独立复用的工作表编辑宿主 renderer。
  - `body` 用于 spreadsheet canvas 或其他主工作区扩展。
  ```
  ```tsx
  function renderFallbackBody(snapshot: SpreadsheetRuntimeSnapshot) {
    return (
      <div data-slot="spreadsheet-page-fallback">
        <p>{t('flux.spreadsheet.canvasNotConfigured')}</p>
  ```
  ```tsx
  <main data-slot="spreadsheet-page-body">
    {hasRendererSlotContent(asReactNode(bodyContent))
      ? asReactNode(bodyContent)
      : renderFallbackBody(snapshot)}
  </main>
  ```
- **严重程度**: P2
- **现状**: type surface 允许 `body` 缺省，但文档把组件定位为可独立复用的编辑宿主；live 无自定义 `body` 时只给诊断块，不给默认 canvas。
- **风险**: 作者按文档理解挂载 `spreadsheet-page`，实际得到的是不可编辑壳层，形成明显 API/文档预期偏差。
- **建议**: 要么提供真实默认 canvas/tooling，要么明确把 `body` 改成必需并更新组件文档。
- **误报排除**: 不是审美问题；这是 standalone host 的默认可用性 contract 漂移。
- **复核状态**: 未复核

## 维度复核结论

- [维度03-01]: 保留为 P2。
- [维度03-02]: 保留为 P3。
- [维度03-03]: 保留为 P2。
- [维度03-04]: 保留为 P2。
- [维度03-05]: 保留为 P2。
- [维度03-06]: 保留为 P2。

## 子项复核结论

- 无需额外子项复核。

## 最终保留项

| 编号  | 严重程度 | 文件                                                               | 一句话摘要                                                                    |
| ----- | -------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| 03-01 | P2       | `packages/flow-designer-renderers/src/schemas.ts:4-13`             | DesignerPageSchemaInput 把 `config` 暴露为可选，但 live contract 实际要求必填 |
| 03-02 | P3       | `docs/components/report-inspector-shell/design.md:15-27`           | report-inspector-shell 的 docs/type/registration/runtime 仍有字段漂移         |
| 03-03 | P2       | `packages/report-designer-renderers/src/types.ts:31-40`            | report-designer-page 公开类型把 toolbar/fieldPanel/inspector 错窄化           |
| 03-04 | P2       | `packages/report-designer-renderers/src/page-renderer.tsx:152-163` | report-designer-page 把必填 `document/designer` 静默降格为 runtime fallback   |
| 03-05 | P2       | `packages/report-designer-renderers/src/index.ts:1-51`             | report-designer-renderers 包入口遗漏导出 createReportDesignerActionProvider   |
| 03-06 | P2       | `packages/spreadsheet-renderers/src/page-renderer.tsx:77-88`       | spreadsheet-page 默认 body/canvas 合同与组件文档漂移                          |
