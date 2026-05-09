# 12 Field Slot

- 深挖轮次: 1
- 深挖发现数: 4

## 第 1 轮初审

### [维度12-01] `designer-field` 声明 `label` 为 value-or-region 但运行时只读取字符串 prop

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\index.tsx:93-100`, `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-field.tsx:17-24`
- **行号范围**: `index.tsx:93-100`, `designer-field.tsx:17-24`
- **证据片段**:
  ```tsx
  {
    type: 'designer-field',
    component: DesignerFieldRenderer,
    fields: [
      { key: 'label', kind: 'value-or-region', regionKey: 'label' },
      { key: 'name', kind: 'prop' },
      { key: 'fieldType', kind: 'prop' },
      { key: 'options', kind: 'prop' },
    ],
  }
  ```
  ```tsx
  export function DesignerFieldRenderer(props: RendererComponentProps<DesignerFieldSchema>) {
    const schemaProps = props.props as Record<string, SchemaValue>;
    const label = schemaProps.label as string | undefined;
    const name = schemaProps.name as string;
    const fieldType = schemaProps.fieldType as string | undefined;
    const options = schemaProps.options as Array<{ label: string; value: string }> | undefined;
    const disabled = props.meta.disabled === true;
  ```
- **严重程度**: P2
- **违规类别**: value-or-region / slot
- **现状**: renderer definition 已把 `label` 声明为 `value-or-region`，但组件只从 `props.props.label` 读取字符串，没有通过 `resolveRendererSlotContent(props, 'label')` 或 `props.regions.label?.render()` 消费 region。
- **风险**: schema 作者写 `label: { type: 'text', ... }` 时，编译器会把 label 抽到 `regions.label`，而 `DesignerFieldRenderer` 不读取该 region，导致 label 静默丢失。
- **建议**: 在 `DesignerFieldRenderer` 中使用 `resolveRendererSlotContent(props, 'label')`，并按 ReactNode 渲染；如不支持 label region，应把 metadata 和 owner docs 降回 plain prop。
- **为什么值得现在做**: 这是 live renderer definition 与 live renderer component 的直接契约不闭合，修复范围很小，且能避免 Flow Designer inspector 字段 slot 能力被误用后无提示失效。
- **误报排除**: 这不是“复杂 host 包仍在演进”的泛化问题；当前 live definition 已显式声明 `value-or-region`，owner doc `docs/components/designer-field/design.md` 也写明 `label: value-or-region`。也不是今天 230 已闭合的 tabs title/toolbar/body scoped slot、detail-view/detail-field name metadata 或 FieldFrame hint/description 问题。
- **历史模式对应**: renderer metadata 与组件消费路径漂移；类似历史上的 field metadata 已声明但组件仍按 plain prop 读取。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`, `docs/components/designer-field/design.md`
- **复核状态**: 未复核

### [维度12-02] `code-editor` fullscreen header 把 value-or-region label 强制转成字符串

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-code-editor\src\code-editor-renderer.tsx:36-38,73-75,190-193`
- **行号范围**: `36-38`, `73-75`, `190-193`
- **证据片段**:
  ```tsx
  export const codeEditorFieldRules: SchemaFieldRule[] = [
    { key: 'label', kind: 'value-or-region', regionKey: 'label' },
    { key: 'value', kind: 'prop' },
  ```
  ```tsx
  const name = String(props.props.name ?? '');
  const labelContent = resolveRendererSlotContent(props, 'label');
  const [isFullscreen, setIsFullscreen] = useState(false);
  ```
  ```tsx
  {isFullscreen && allowFullscreen ? (
    <div data-slot="code-editor-header">
      <span data-slot="code-editor-header-title">{String(labelContent ?? '')}</span>
      <ToolbarButton
  ```
- **严重程度**: P2
- **违规类别**: value-or-region / render-props / slot
- **现状**: `label` 已按 `value-or-region` 建模，且组件正确调用了 `resolveRendererSlotContent`，但 fullscreen header 最终用 `String(labelContent ?? '')` 渲染，破坏 ReactNode slot 输出。
- **风险**: 当 label 是 schema region 或 React element 时，fullscreen header 会显示 `[object Object]` 或丢失结构化内容，导致 slot 能力只在 FieldFrame/普通路径有效，在 fullscreen 路径失效。
- **建议**: 将 fullscreen header 的 `{String(labelContent ?? '')}` 改为 `{hasRendererSlotContent(labelContent) ? labelContent : null}` 或直接渲染 `labelContent`，并按需要提供纯文本 fallback。
- **为什么值得现在做**: 修复点局部且明确；code-editor 已在 owner doc 中声明 `label: value-or-region`，当前强制字符串化会让高级 label authoring 在可见 UI 路径出现错误文本。
- **误报排除**: 这不是要求所有标题都必须支持复杂 slot；该 renderer 已显式声明并解析了 `value-or-region`，问题只在最后一步错误转换。也不是今天 230 已闭合的 FieldFrame hint/description 或 tabs scoped slot residual。
- **历史模式对应**: normalized slot content 被组件局部重新降级为 string 的 renderer adapter 漂移。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`, `docs/components/code-editor/design.md`
- **复核状态**: 未复核

### [维度12-03] `form` 的 validator 拒绝 metadata 已声明为 region 的单对象 `body/actions`

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\renderers\form-definition.ts:34-48,221-223`
- **行号范围**: `34-48`, `221-223`
- **证据片段**:

  ```ts
  if (schema.body !== undefined && !Array.isArray(schema.body)) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'body'),
      message: 'form.body must be an array of schema nodes.',
    });
  }

  if (schema.actions !== undefined && !Array.isArray(schema.actions)) {
  ```

  ```ts
  fields: [
    { key: 'body', kind: 'region', regionKey: 'body' },
    { key: 'actions', kind: 'region', regionKey: 'actions' },
  ```

- **严重程度**: P2
- **违规类别**: field-rule / slot
- **现状**: `form.body` / `form.actions` 的 field metadata 声明为 `region`，compiler 的 region 模型接受 `SchemaInput`（单 schema 或 schema array），但 form schema validator 额外限制为数组。
- **风险**: 同一 region authoring 形式在 compiler 与 validator 中不一致；`body: { type: 'text' }` 这类合法 region 输入可被编译路径接受，却会在诊断/导入校验路径被报错，误导 schema 作者和工具链。
- **建议**: 让 validator 使用与 `region` metadata 一致的 `isSchemaInput` 判定；如果 form 特意只支持数组，应把 metadata/owner doc 明确标成 renderer-local 限制并避免泛化为普通 region。
- **为什么值得现在做**: 这是 validator 与 compiler 对同一 field metadata 的 live 分歧，会影响 schema 导入、严格校验和编辑器提示，修复可集中在 form validator。
- **误报排除**: 不是“文档建议 body 通常写数组”的风格问题；当前 field rule 是 `region`，`field-metadata-slot-modeling.md` 明确 region 输入是 schema 或 schema array。也不是今天 230 已闭合的 tabs deep region extraction residual。
- **历史模式对应**: compiler normalization 与 renderer-local schema validator 对 slot/region 形态判断不一致。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`, `docs/components/form/design.md`
- **复核状态**: 未复核

### [维度12-04] basic renderer 的 `title` public schema typing 仍窄于 live value-or-region metadata

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src\schemas.ts:9-16,24-28,38-42`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src\basic-renderer-definitions.ts:32-36,300-303,317-320`
- **行号范围**: `schemas.ts:9-16,24-28,38-42`, `basic-renderer-definitions.ts:32-36,300-303,317-320`
- **证据片段**:
  ```ts
  export interface PageSchema extends BaseSchema {
    type: 'page';
    title?: string;
    data?: SchemaValue;
    statusPath?: string;
    body?: BaseSchema[];
  ```
  ```tsx
  fields: [
    { key: 'title', kind: 'value-or-region', regionKey: 'title' },
    { key: 'body', kind: 'region', regionKey: 'body' },
    { key: 'header', kind: 'region', regionKey: 'header' },
    { key: 'footer', kind: 'region', regionKey: 'footer' },
  ],
  ```
- **严重程度**: P2
- **违规类别**: value-or-region / field-rule
- **现状**: `page`、`dialog`、`drawer` 的 renderer metadata 把 `title` 声明为 `value-or-region`，但 public schema interfaces 仍把 `title?: string` 作为唯一类型。
- **风险**: TypeScript schema 作者和工具层会认为 schema-object title 非法，而 runtime/compiler 实际支持该 authoring 形式；这会造成公开类型、编辑器提示、测试 fixture 与 runtime 能力不一致。
- **建议**: 将这些 `title` 类型扩展为 `string | SchemaInput` 或项目统一的 `value-or-region` 类型别名；同步检查 `TabsItemSchema.title` 等同类嵌套 title typing。
- **为什么值得现在做**: `title` 是 owner doc 中最典型的 `value-or-region` 示例，公开 typing 与 live metadata 不一致会持续误导后续 renderer/schema 作者。
- **误报排除**: 不是单纯追求类型完美；这里已有 live metadata 和 compiler normalization 支持 region title，公开类型却阻止合法 schema。也不是今天 230 已闭合的 tabs scoped slot 实现问题；本条关注 public schema typing residual。
- **历史模式对应**: public schema typings 滞后于 field metadata / compiler 的 value-or-region 基线。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度12-05] `spreadsheet-page` public schema typing 仍把 value-or-region `title` 限死为字符串

- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\renderers.tsx:45-54`, `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\types.ts:4-20`
- **行号范围**: `renderers.tsx:45-54`, `types.ts:4-20`
- **证据片段**:
  ```tsx
  fields: [
    { key: 'title', kind: 'value-or-region', regionKey: 'title' },
    { key: 'statusPath', kind: 'prop' },
    { key: 'document', kind: 'prop' },
    { key: 'config', kind: 'prop' },
    { key: 'readOnly', kind: 'prop' },
    { key: 'toolbar', kind: 'region', regionKey: 'toolbar' },
  ```
  ```ts
  export interface SpreadsheetPageSchemaInput {
    type: 'spreadsheet-page';
    id?: string;
    name?: string;
    label?: string;
    title?: string;
    className?: string;
  ```
- **严重程度**: P2
- **违规类别**: value-or-region / public typing
- **现状**: renderer metadata 已声明 `spreadsheet-page.title` 支持 `value-or-region`，组件也通过 `resolveRendererSlotContent(props, 'title')` 消费，但公开 schema input typing 仍只允许 `title?: string`。
- **风险**: TypeScript schema 作者无法合法写入 title schema fragment，工具层也会把 runtime/compiler 已支持的 title region 标为非法，造成 host renderer 公开类型与 live metadata 漂移。
- **建议**: 将 `SpreadsheetPageSchemaInput.title` 扩展为项目统一的 value-or-region 类型（如 `string | SchemaInput`），并与同类 host page typing 一并校准。
- **为什么值得现在做**: 这是 `[维度12-04]` basic title typing 漏洞在另一个 live host renderer 上的同型残留，修复范围小且能避免继续复制错误公开契约。
- **误报排除**: 不是要求新增功能；当前 renderer definition 和组件消费路径已经支持 region title，问题仅在 public typing 滞后。也不是旧的 tabs scoped slot 或 basic page/dialog/drawer typing 条目重复，本条定位到 spreadsheet host 包。
- **历史模式对应**: public schema typings 滞后于 field metadata / compiler 的 value-or-region 基线。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`
- **复核状态**: 未复核

### [维度12-06] `report-designer-page` public schema typing 仍把 value-or-region `title` 限死为字符串

- **文件**: `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\renderers.tsx:86-98`, `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\types.ts:21-40`
- **行号范围**: `renderers.tsx:86-98`, `types.ts:21-40`
- **证据片段**:
  ```tsx
  fields: [
    { key: 'title', kind: 'value-or-region', regionKey: 'title' },
    { key: 'statusPath', kind: 'prop' },
    { key: 'document', kind: 'prop' },
    { key: 'designer', kind: 'prop' },
    { key: 'profile', kind: 'prop' },
    { key: 'adapters', kind: 'prop' },
  ```
  ```ts
  export interface ReportDesignerPageSchemaInput {
    type: 'report-designer-page';
    id?: string;
    name?: string;
    label?: string;
    title?: string;
    className?: string;
  ```
- **严重程度**: P2
- **违规类别**: value-or-region / public typing
- **现状**: `report-designer-page.title` 已在 renderer metadata 中建模为 `value-or-region`，`page-renderer.tsx` 也解析 title slot，但 `ReportDesignerPageSchemaInput.title` 仍只接受字符串。
- **风险**: report designer 页面标题的 schema-region authoring 在 runtime 可工作、在类型层却被拒绝，影响 builder-facing host renderer 的 schema authoring 和编辑器提示一致性。
- **建议**: 将 `ReportDesignerPageSchemaInput.title` 扩展为 `string | SchemaInput` 或统一 value-or-region 类型别名。
- **为什么值得现在做**: 与已有 basic title typing 问题同根，但发生在 report designer host 公开入口；越晚修复越容易让下游 schema/工具固化错误类型。
- **误报排除**: 不是草稿文档约束，也不是要求所有字段支持 region；当前 live metadata 已明确声明 `title` 为 `value-or-region`，组件已消费 slot。
- **历史模式对应**: public schema typings 滞后于 field metadata / compiler 的 value-or-region 基线。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/report-designer/design.md`
- **复核状态**: 未复核

### [维度12-07] `word-editor-page` public schema typing 仍把 value-or-region `title` 限死为字符串

- **文件**: `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\renderers.tsx:63-75`, `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\types.ts:4-23`
- **行号范围**: `renderers.tsx:63-75`, `types.ts:4-23`
- **证据片段**:
  ```tsx
  fields: [
    { key: 'title', kind: 'value-or-region', regionKey: 'title' },
    { key: 'statusPath', kind: 'prop' },
    { key: 'onBack', kind: 'event' },
    { key: 'onSave', kind: 'event' },
    { key: 'initialDocument', kind: 'prop' },
  ```
  ```ts
  export interface WordEditorPageSchemaInput {
    type: 'word-editor-page';
    id?: string;
    name?: string;
    label?: string;
    title?: string;
    className?: string;
  ```
- **严重程度**: P2
- **违规类别**: value-or-region / public typing
- **现状**: `word-editor-page.title` metadata 和组件状态 hook 已通过 `resolveRendererSlotContent(props, 'title')` 支持 title region，但 public schema input 类型仍为 `title?: string`。
- **风险**: Word Editor host 的结构化标题 slot 在运行时支持、在 TypeScript authoring 层不支持，导致合法低代码 schema 被类型系统和工具误拦。
- **建议**: 将 `WordEditorPageSchemaInput.title` 改为 `string | SchemaInput` 或统一 value-or-region 类型。
- **为什么值得现在做**: 这是 host renderer 公开 schema 类型与 live renderer field metadata 的直接漂移，且与已有 title typing 残留同型，适合统一收敛。
- **误报排除**: 不是重复报告 `[维度12-04]` 的 basic renderer；本条覆盖 word editor host 包，且 live code 已显式支持 title slot。
- **历史模式对应**: public schema typings 滞后于 field metadata / compiler 的 value-or-region 基线。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`
- **复核状态**: 未复核
