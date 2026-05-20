# 维度 18: 跨包模式一致性

## 第 1 轮（初审）

### [维度18-01] Word Editor 工具栏仍用硬编码英文 UI 文本，和 Spreadsheet/Report/基础渲染器的 i18n 主路径不一致

- **涉及包**: `@nop-chaos/word-editor-renderers` vs `@nop-chaos/spreadsheet-renderers` / `@nop-chaos/flux-i18n`
- **文件**: `packages/word-editor-renderers/src/toolbar/shared.tsx:40-48`, `packages/word-editor-renderers/src/toolbar/font-controls.tsx:83-134`, `packages/spreadsheet-renderers/src/spreadsheet-toolbar/toolbar-button.tsx:16-36`, `packages/flux-i18n/src/locales/en-US.ts:391-417`
- **行号范围**: 主要证据集中在 `shared.tsx:40-48`, `font-controls.tsx:83-134`, `toolbar-button.tsx:16-36`。
- **证据片段**:
  ```tsx
  // packages/word-editor-renderers/src/toolbar/shared.tsx:40-48
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
  ```
  ```tsx
  // packages/word-editor-renderers/src/toolbar/font-controls.tsx:83-134
  <ToolbarButton icon={Bold} ... title="Bold" />
  <ToolbarButton icon={Italic} ... title="Italic" />
  <ToolbarButton icon={Underline} ... title="Underline" />
  ...
  title="Text Color"
  aria-label="Text Color"
  title="Highlight Color"
  aria-label="Highlight Color"
  ```
  ```tsx
  // packages/spreadsheet-renderers/src/spreadsheet-toolbar/toolbar-button.tsx:16-36
  <Button
    ...
    aria-label={t(props.label)}
    title={t(props.label)}
  >
  ...
  <TooltipContent>{t(props.label)}</TooltipContent>
  ```
- **严重程度**: P2
- **不一致类别**: i18n 文本硬编码 / 跨包 UI 契约不一致
- **包 A 模式**: `word-editor-renderers` 的通用 `ToolbarButton` 接收最终展示字符串，多个调用点传入 `"Undo"`、`"Bold"`、`"Text Color"`、`"Insert Table (3×3)"`、`"Copy field reference"` 等硬编码英文，`title` 与 `aria-label` 直接暴露这些字符串。
- **包 B 模式**: `spreadsheet-renderers` 的 toolbar 按钮接收 i18n key，统一在组件内通过 `t(props.label)` 生成 `title`、`aria-label` 和 tooltip；`report-designer-renderers` 与 `flux-renderers-data` 也普遍直接从 `@nop-chaos/flux-i18n` 读取用户可见文本。
- **统一建议**: 将 `word-editor-renderers` 的 toolbar 公共按钮收敛为 key-first 模式，至少让 `title`/`aria-label` 使用 `t('flux.wordEditor.*')` 或共享 `flux.toolbar.*` key；已有 `flux.wordEditor` locale 下存在 `columns`、`addColumn`、`static` 等词条，应补齐 toolbar 操作词条后替换硬编码调用点。
- **现状**: `pnpm check:i18n-keys` 已通过，但该 hard gate 只检查字面量 `t('flux.*')` key 是否存在，不能发现未调用 `t()` 的硬编码 UI 文本；因此当前主路径会在非英文语言下继续显示英文 toolbar 与字段面板操作文本。
- **风险**: Word Editor 作为领域 host renderer 对外暴露完整编辑器 UI，硬编码英文会造成同一页面中 locale 驱动区域与固定英文区域混杂；后续若继续复制 `ToolbarButton title="..."` 模式，会把 i18n 迁移成本扩散到多个 toolbar/panel 文件。
- **为什么值得现在做**: 这不是“为了统一而统一”：`flux-i18n` 已经为 word editor 建立 namespace，且相邻 spreadsheet toolbar 已有稳定 key-first 模式；当前差异已经影响用户可见文本与无障碍名称，是外部 UI 契约不一致。
- **误报排除**: 未将 schema 作者自定义 label、测试 fixture 文本、技术标识如 `SQL`/`API` 视为问题；本条只覆盖 renderer 自带 UI 控件的固定标题、aria-label、placeholder 等用户可见 chrome。
- **历史模式对应**: 命中 calibration pattern 10 的“跨包一致性”高误报区，但本例越过门槛：差异已经造成真实 locale 输出不一致，并且 `check:i18n-keys` 无法覆盖未调用 `t()` 的硬编码字符串。
- **参考文档**: `docs/references/audit-tooling.md:39`（i18n key hard gate 范围）；`docs/skills/deep-audit-prompts.md:1649-1652`（维度 18 i18n 检查目标）；`docs/architecture/flux-design-principles.md:27`（DSL 变换含 i18n 字符串替换）。
- **工具基线**: 已运行 `pnpm check:i18n-keys`，结果为 “All used i18n keys are defined”，同时提示该工具不覆盖未使用 `t()` 的硬编码文本。
- **复核状态**: 未复核

### [维度18-02] Flow Designer palette 标题硬编码中文，和同包其余文本及其他领域 renderer 的 i18n 模式不一致

- **涉及包**: `@nop-chaos/flow-designer-renderers` vs `@nop-chaos/report-designer-renderers` / `@nop-chaos/spreadsheet-renderers` / `@nop-chaos/flux-i18n`
- **文件**: `packages/flow-designer-renderers/src/designer-palette.tsx:86-100`, `packages/flux-i18n/src/locales/en-US.ts:265-317`, `packages/report-designer-renderers/src/report-designer-inspector.tsx:33-36`
- **行号范围**: 主要证据集中在 `designer-palette.tsx:86-100`, `en-US.ts:265-317`, `report-designer-inspector.tsx:33-36`。
- **证据片段**:
  ```tsx
  // packages/flow-designer-renderers/src/designer-palette.tsx:86-100
  <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
    <div className="min-w-0 flex-1">
      <div className="text-sm font-semibold text-foreground">节点库</div>
      <div className="text-sm text-muted-foreground">{t('flux.flowDesigner.addNodeHint')}</div>
    </div>
  ```
  ```ts
  // packages/flux-i18n/src/locales/en-US.ts:265-281
  flowDesigner: {
    title: 'Flow Designer',
    autoLayout: 'Auto Layout',
    ...
    addNodeHint: 'Drag or click to add',
    collapsePalette: 'Collapse palette',
    expandPalette: 'Expand palette',
  ```
  ```tsx
  // packages/report-designer-renderers/src/report-designer-inspector.tsx:33-36
  const emptyLabel = String(props.props.emptyLabel ?? t('flux.reportDesigner.noPanels'));
  const noSelectionLabel = String(
    props.props.noSelectionLabel ?? t('flux.reportDesigner.noSelection'),
  );
  ```
- **严重程度**: P2
- **不一致类别**: i18n 文本硬编码 / 领域 renderer UI 契约不一致
- **包 A 模式**: `flow-designer-renderers` 同一个 palette header 中一行使用硬编码中文 `"节点库"`，紧邻的提示、折叠按钮 aria-label 则使用 `t('flux.flowDesigner.*')`。
- **包 B 模式**: `report-designer-renderers`、`spreadsheet-renderers` 以及 Flow Designer 自己的大多数同类 UI 文本通过 `@nop-chaos/flux-i18n` 管理；`flux.flowDesigner` namespace 已经存在 palette 相关 key，但缺少 palette title key。
- **统一建议**: 在 `flux.flowDesigner` locale 中增加类似 `paletteTitle` / `nodeLibrary` key，并将 `designer-palette.tsx` 的 `"节点库"` 替换为 `t('flux.flowDesigner.paletteTitle')`；测试中若需要匹配标题，应通过当前语言初始化后断言。
- **现状**: Flow Designer palette 在英文 locale 下会显示中文标题和英文提示并存；该问题不会被 `check:i18n-keys` 发现，因为硬编码中文没有进入 key 检查。
- **风险**: 这是 builder-facing domain host renderer 的主界面文案，直接影响宿主/用户看到的语言一致性；同时它给后续 Flow Designer 子组件留下“局部硬编码也可接受”的复制模式。
- **为什么值得现在做**: 单个字符串本身很小，但它位于公共 palette header，且同文件已经接入 i18n；修复成本低，能避免领域 renderer 主 UI 在多语言环境下混杂输出。
- **误报排除**: 未报告测试用中文 fixture、用户 schema label、节点数据 label 或示例文本；本条仅针对 renderer 内置 chrome 的固定标题。也不是要求所有内部实现完全一致，而是修复已经用户可见的 mixed-locale 输出。
- **历史模式对应**: 命中 calibration pattern 10，但本例不是抽象一致性建议；它已经导致外部 UI 语言契约混乱，且与同文件现有 `t('flux.flowDesigner.*')` 模式直接冲突。
- **参考文档**: `docs/references/audit-tooling.md:39`（i18n key 检查只覆盖已使用 key）；`docs/skills/deep-audit-prompts.md:1649-1652`（维度 18 文本硬编码检查）；`docs/architecture/flux-design-principles.md:27`（i18n 字符串替换属于 DSL/结构变换关注点）。
- **工具基线**: 已运行 `pnpm check:i18n-keys`，该 hard gate 通过；本发现来自 hard gate 覆盖外的硬编码用户可见文本复核。
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度18-03] Spreadsheet toolbar 输入占位符仍硬编码英文，和同组件按钮文本及其他领域 renderer 的 i18n 模式不一致

- **涉及包**: `@nop-chaos/spreadsheet-renderers` vs `@nop-chaos/flux-i18n` / `@nop-chaos/report-designer-renderers`
- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-toolbar/find-replace-panel.tsx:16-38`, `packages/spreadsheet-renderers/src/spreadsheet-toolbar/cell-editor.tsx:16-36`, `packages/flux-i18n/src/locales/en-US.ts:152-209`
- **行号范围**: 主要证据集中在 `find-replace-panel.tsx:16-38`、`cell-editor.tsx:16-36`、`en-US.ts:152-209`。
- **证据片段**:
  ```tsx
  // packages/spreadsheet-renderers/src/spreadsheet-toolbar/find-replace-panel.tsx:16-38
  <Label htmlFor={findInputId}>{t('flux.spreadsheet.find')}</Label>
  <Input
    id={findInputId}
    data-slot="spreadsheet-find-input"
    size="sm"
    value={props.findQuery}
    onChange={(e) => props.onFindQueryChange(e.target.value)}
    placeholder="Search text..."
  />
  ```
  ```tsx
  // packages/spreadsheet-renderers/src/spreadsheet-toolbar/cell-editor.tsx:16-36
  <Input
    id={cellValueInputId}
    data-slot="spreadsheet-cell-value-input"
    size="sm"
    value={props.cellValue}
    onChange={(e) => props.onCellValueChange(e.target.value)}
    placeholder="Enter cell value"
  />
  ```
- **严重程度**: P2
- **不一致类别**: i18n 文本硬编码 / 同组件内 mixed-locale UI 契约不一致
- **包 A 模式**: `spreadsheet-renderers` 的 find/replace 和 cell/comment editor 已导入 `t()`，按钮与 label 使用 `flux.spreadsheet.*` key，但输入 placeholder 仍直接写 `"Search text..."`、`"Replace with..."`、`"Enter cell value"`、`"Add comment..."`。
- **包 B 模式**: 同一 locale namespace 已集中维护 spreadsheet toolbar 文案（`find`、`findNext`、`replace`、`replaceBtn`、`replaceAll`、`comment`、`add` 等），`report-designer-renderers` 的同类 renderer chrome 文本也通过 `t('flux.reportDesigner.*')` 管理。
- **统一建议**: 在 `flux.spreadsheet` 下补齐 `findPlaceholder`、`replacePlaceholder`、`cellValuePlaceholder`、`commentPlaceholder` 等 key，并将这些 placeholder 全部改为 `t()`；如果 placeholder 仅作为示例而非 label，也仍应作为用户可见 chrome 进入 locale。
- **现状**: 当前 `pnpm check:i18n-keys` 只能验证已调用 `t('flux.*')` 的 key 是否存在，无法发现这些未进入 `t()` 的硬编码英文；因此 spreadsheet toolbar 在非英文 locale 下会出现 label/button 已翻译、placeholder 仍为英文的混合状态。
- **风险**: Spreadsheet 是 report/spreadsheet family 的共享编辑宿主，toolbar 子模块容易被 report designer 复用或复制；placeholder 硬编码会把 mixed-locale 模式扩散到共享 canvas 工具链，并削弱已有 `flux.spreadsheet` namespace 的维护收益。
- **误报排除**: 未把单元格数据、用户输入值、测试 fixture 或技术缩写视为问题；本条只覆盖 renderer 自带输入框的固定用户可见 placeholder，且同一文件已经使用 `t()`，说明这些字符串本应进入同一 i18n 管理路径。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1649-1652`；`docs/references/audit-tooling.md:39`；`docs/architecture/flux-design-principles.md:24-27`。
- **复核状态**: 未复核

## 深挖第 5 轮追加

未发现新的高价值问题。深挖结束。

### [维度18-04] Flow Designer 画布快捷动作 aria-label 硬编码英文，和同包 locale namespace 及菜单文本模式不一致

- **涉及包**: `@nop-chaos/flow-designer-renderers` vs `@nop-chaos/flux-i18n`
- **文件**: `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx:247-274`, `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-edge.tsx:158-174`, `packages/flux-i18n/src/locales/en-US.ts:265-317`
- **行号范围**: 主要证据集中在 `designer-xyflow-node.tsx:247-274`、`designer-xyflow-edge.tsx:158-174`、`en-US.ts:265-317`。
- **证据片段**:
  ```tsx
  // packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx:247-274
  <Button
    type="button"
    variant="ghost"
    size="icon-sm"
    aria-label="Edit node"
    className="border-0 hover:bg-accent"
    onClick={actionScope.onEdit}
  >
  ```
  ```tsx
  // packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-edge.tsx:158-174
  <Button
    type="button"
    variant="ghost"
    size="icon-sm"
    className="w-7 h-7 rounded-lg inline-flex items-center justify-center border-0 hover:bg-black/8 dark:hover:bg-white/10"
    aria-label="Select edge"
    onClick={handleLabelClick}
  >
  ```
- **严重程度**: P2
- **不一致类别**: i18n 文本硬编码 / accessibility chrome 契约不一致
- **包 A 模式**: Flow Designer canvas 内置 quick action button 使用硬编码英文 aria-label：`"Edit node"`、`"Duplicate node"`、`"Delete node"`、`"Select edge"`、`"Delete edge"`，屏幕阅读器和测试按可访问名称读取时不会跟随 locale。
- **包 B 模式**: 同包其他用户可见文本已大量使用 `t('flux.flowDesigner.*')`，locale 中已存在 `addNode`、`deleteSelected`、`inspector.deleteNode`、`flowJson`、`collapsePalette` 等 key；既有第 1 轮发现只覆盖 palette 标题，本条是 canvas 快捷动作的独立残留。
- **统一建议**: 为 canvas quick actions 增加 `flux.flowDesigner.editNode`、`duplicateNode`、`deleteNode`、`selectEdge`、`deleteEdge` 等 key，并在 node/edge quick action button 中统一通过 `t()` 生成 aria-label；若测试依赖英文 name，应改为 locale 初始化后的预期文本。
- **现状**: Flow Designer 主界面部分 chrome 已接入 i18n，但画布节点/连线快捷动作仍绕过 locale；这些 label 不会被 `check:i18n-keys` 捕获，因为它们没有调用 `t()`。
- **风险**: 这是 builder-facing canvas 的核心交互名称，直接影响无障碍用户、自动化测试和多语言宿主的一致体验；后续新增 node/edge quick action 时容易继续复制硬编码 aria-label 模式。
- **误报排除**: 未报告节点业务 label、edge condition、测试数据或 schema 作者可配置文本；本条仅针对 renderer 内置按钮的固定 accessibility name。它也不是重复第 1 轮的 palette 标题问题，文件、交互 surface 和用户影响路径均不同。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1649-1652`；`docs/references/audit-tooling.md:39`；`docs/components/designer-page/design.md:66-70`。
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度18-05] Flow Designer `designer-page.title` 声明为公开字段但渲染主路径完全不消费，和其他 domain host renderer 的标题槽模式不一致

- **涉及包**: `@nop-chaos/flow-designer-renderers` vs `@nop-chaos/spreadsheet-renderers` / `@nop-chaos/report-designer-renderers` / `@nop-chaos/word-editor-renderers`
- **文件**: `packages/flow-designer-renderers/src/schemas.ts:4-20`, `packages/flow-designer-renderers/src/renderer-definitions.ts:213-220`, `packages/flow-designer-renderers/src/designer-page-body.tsx:338-353`, `packages/spreadsheet-renderers/src/renderers.tsx:50-58`, `packages/spreadsheet-renderers/src/page-renderer.tsx:92-96,191-196`
- **行号范围**: 主要证据集中在 `schemas.ts:4-20`、`renderer-definitions.ts:213-220`、`designer-page-body.tsx:338-353`、`spreadsheet-renderers/src/renderers.tsx:50-58`、`spreadsheet-renderers/src/page-renderer.tsx:92-96,191-196`。
- **证据片段**:
  ```ts
  // packages/flow-designer-renderers/src/schemas.ts:4-20
  export interface DesignerPageSchemaInput {
    type: 'designer-page';
    id?: string;
    name?: string;
    label?: string;
    title?: string | SchemaInput;
    className?: string;
    visible?: boolean | string;
  ```
  ```ts
  // packages/flow-designer-renderers/src/renderer-definitions.ts:213-220
  fields: [
    { key: 'statusPath', kind: 'prop' },
    { key: 'document', kind: 'prop' },
    { key: 'treeDocument', kind: 'prop' },
    { key: 'config', kind: 'prop', compile: compileDesignerConfig },
    { key: 'toolbar', kind: 'region', regionKey: 'toolbar' },
    { key: 'inspector', kind: 'region', regionKey: 'inspector' },
    { key: 'dialogs', kind: 'region', regionKey: 'dialogs' },
  ```
  ```tsx
  // packages/spreadsheet-renderers/src/page-renderer.tsx:92-96,191-196
  export function SpreadsheetPageRenderer(props: RendererComponentProps<SpreadsheetPageSchema>) {
    const titleContent = resolveRendererSlotContent(props, 'title');
    const resolvedDocument = props.props.document as SpreadsheetDocument;
    const resolvedConfig = props.props.config as SpreadsheetConfig | undefined;
  ...
  {hasRendererSlotContent(titleContent)
    ? asReactNode(titleContent)
    : t('flux.spreadsheet.designer')}
  ```
- **严重程度**: P2
- **不一致类别**: renderer 字段/slot 契约不一致
- **包 A 模式**: `flow-designer-renderers` 的 schema 与组件文档把 `designer-page.title` 暴露为字段，但 renderer definition 没有声明 `title`，`DesignerPageBody` 也没有 `resolveRendererSlotContent(props, 'title')` 或 `props.props.title` 消费路径，schema 作者配置标题会被静默忽略。
- **包 B 模式**: `spreadsheet-page`、`report-designer-page`、`word-editor-page` 都将 `title` 声明为 `value-or-region` field，并在页面 header 中解析和渲染 title slot/prop。
- **统一建议**: 将 `designer-page` 收敛到同一 domain host renderer 标题模式：在 `flowDesignerRendererDefinitions` 中补上 `{ key: 'title', kind: 'value-or-region', regionKey: 'title' }`，并在默认 toolbar/header surface 中消费 `resolveRendererSlotContent(props, 'title')`；如果 Flow Designer 不支持标题自定义，则从 schema/docs 中移除 `title`，避免公开字段失效。
- **现状**: 当前 `designer-page` 对外暴露了与其他 host renderer 相同的 `title` schema surface，但编译/渲染主路径未接线，导致同一类 builder-facing host renderer 中只有 Flow Designer 的标题字段无效。
- **风险**: schema 作者和工具会基于 schema/docs 认为 `title` 可配置，但运行时不会显示；跨 domain workbench 模板复用时，`spreadsheet-page` / `report-designer-page` / `word-editor-page` 可工作的标题配置迁移到 `designer-page` 后静默失效，形成真实契约漂移和排障成本。
- **误报排除**: 不是要求所有 host renderer 拥有完全相同布局；问题在于 Flow Designer 已经在 schema 与 owner doc 中声明了 `title`，但实现既未声明 definition field 也未读取该字段。若没有公开 `title` surface，本条不会成立。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1626-1630`；`docs/components/designer-page/design.md:24-32`；`docs/components/spreadsheet-page/design.md:21-35`；`docs/components/report-designer-page/design.md:21-36`；`docs/components/word-editor-page/design.md:22-86`。
- **复核状态**: 未复核

### [维度18-06] Spreadsheet canvas/sheet-tab 核心交互 aria-label 仍硬编码英文，和同包 toolbar 与其他领域 renderer 的 i18n 模式不一致

- **涉及包**: `@nop-chaos/spreadsheet-renderers` vs `@nop-chaos/flux-i18n` / `@nop-chaos/report-designer-renderers` / `@nop-chaos/flow-designer-renderers`
- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:246-257`, `packages/spreadsheet-renderers/src/spreadsheet-grid/table-shell.tsx:284-291`, `packages/spreadsheet-renderers/src/sheet-tab-bar.tsx:145-162`, `packages/spreadsheet-renderers/src/spreadsheet-toolbar/toolbar-button.tsx:16-36`
- **行号范围**: 主要证据集中在 `spreadsheet-grid.tsx:246-257`、`table-shell.tsx:284-291`、`sheet-tab-bar.tsx:145-162`、`toolbar-button.tsx:16-36`。
- **证据片段**:
  ```tsx
  // packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:246-257
  return (
    <ContextMenu>
      <ContextMenuTrigger
        ref={scrollRef}
        className="ss-grid-shell"
        data-slot="spreadsheet-grid"
        data-fill-dragging={fillHandleState.isFilling || undefined}
        style={{ overflow: 'auto', position: 'relative' }}
        tabIndex={0}
        role="grid"
        aria-label="Spreadsheet grid"
  ```
  ```tsx
  // packages/spreadsheet-renderers/src/spreadsheet-grid/table-shell.tsx:284-291
  <Button
    type="button"
    variant="ghost"
    size="sm"
    className="ss-header-button"
    data-slot="spreadsheet-header-button"
    aria-label="Select entire sheet"
    onClick={onSelectAll}
  ```
  ```tsx
  // packages/spreadsheet-renderers/src/sheet-tab-bar.tsx:145-162
  aria-label={`Remove sheet ${sheet.name}`}
  title={`Remove sheet ${sheet.name}`}
  ...
  <Button
    variant="ghost"
    size="icon-xs"
    className="ss-sheet-add"
    onClick={onAddSheet}
    aria-label="Add sheet"
  ```
  ```tsx
  // packages/spreadsheet-renderers/src/spreadsheet-toolbar/toolbar-button.tsx:16-36
  aria-label={t(props.label)}
  title={t(props.label)}
  ...
  <TooltipContent>{t(props.label)}</TooltipContent>
  ```
- **严重程度**: P2
- **不一致类别**: i18n 文本硬编码 / accessibility chrome 契约不一致
- **包 A 模式**: `spreadsheet-renderers` 的 grid root、全选按钮、sheet 删除/新增按钮直接写英文 `aria-label` / `title`，这些名称是键盘与屏幕阅读器访问 spreadsheet canvas 的核心可访问名称。
- **包 B 模式**: 同包 toolbar button 已采用 key-first 模式，通过 `t(props.label)` 同步生成 `aria-label`、`title` 和 tooltip；`flux.spreadsheet` / `flux.sheet` locale namespace 也已经维护 toolbar、sheet 删除弹窗等固定文案。
- **统一建议**: 为 spreadsheet canvas/sheet tab 补齐 locale key，例如 `flux.spreadsheet.gridLabel`、`selectEntireSheet`、`flux.sheet.add`、`flux.sheet.removeWithName`，并将这些 `aria-label` / `title` 改为 `t()`；动态 sheet name 应作为插值参数，而不是模板字符串硬编码英文。
- **现状**: 第 2 轮已覆盖 spreadsheet toolbar placeholder 的硬编码英文，但 canvas 与 sheet-tab 的核心 accessibility names 仍绕过 i18n；`pnpm check:i18n-keys` 无法发现未调用 `t()` 的硬编码文本。
- **风险**: Spreadsheet canvas 是 report/spreadsheet family 的共享核心编辑面，非英文 locale 下视觉按钮/菜单可能已翻译，但屏幕阅读器、自动化按可访问名称定位、以及 hover title 仍输出英文；后续 report designer 复用 spreadsheet canvas 时会继承同一 mixed-locale accessibility contract。
- **误报排除**: 未报告单元格内容、sheet 用户自定义名称本身、测试 fixture 或技术缩写；本条只覆盖 renderer 内置交互控件的固定可访问名称。它也不是重复 [维度18-03] 的 placeholder 问题，涉及的文件、交互 surface 和用户影响路径均不同。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1649-1652`；`docs/references/audit-tooling.md:39`；`docs/components/spreadsheet-page/design.md:53-64`；`docs/architecture/flux-design-principles.md:24-27`。
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度18-07] Code Editor 工具栏/变量面板部分操作名仍硬编码英文，和同包 SQL 工具栏及 `flux.codeEditor` locale 模式不一致

- **涉及包**: `@nop-chaos/flux-code-editor` vs `@nop-chaos/flux-i18n`
- **文件**: `packages/flux-code-editor/src/code-editor-renderer.tsx:168-190`, `packages/flux-code-editor/src/code-editor-renderer/sql-editor-toolbar.tsx:77-83`, `packages/flux-code-editor/src/code-editor-renderer/snippet-panel.tsx:24-28`, `packages/flux-code-editor/src/variable-panel.tsx:87-99`, `packages/flux-i18n/src/locales/en-US.ts:418-436`
- **行号范围**: 主要证据集中在 `code-editor-renderer.tsx:168-190`、`sql-editor-toolbar.tsx:77-83`、`snippet-panel.tsx:24-28`、`variable-panel.tsx:87-99`。
- **证据片段**:
  ```tsx
  // packages/flux-code-editor/src/code-editor-renderer.tsx:168-190
  <ToolbarButton
    data-slot="code-editor-header-close"
    onClick={() => setIsFullscreen(false)}
    aria-label="Exit fullscreen"
  >
  ...
  <ToolbarButton
    data-slot="code-editor-toolbar-fullscreen"
    onClick={toggleFullscreen}
    aria-label="Enter fullscreen"
    title="Fullscreen"
  >
  ```
  ```tsx
  // packages/flux-code-editor/src/code-editor-renderer/sql-editor-toolbar.tsx:77-83
  <ToolbarButton
    data-slot="code-editor-toolbar-fullscreen"
    onClick={onEnterFullscreen}
    aria-label="Enter fullscreen"
    title="Fullscreen"
  >
  ```
  ```tsx
  // packages/flux-code-editor/src/variable-panel.tsx:87-99
  <ToolbarButton
    data-slot="code-editor-var-item-copy"
    onClick={() => onCopy(variable)}
    title="Copy to clipboard"
    aria-label="Copy to clipboard"
  >
  ...
  title="Insert at cursor"
  aria-label="Insert at cursor"
  ```
- **严重程度**: P2
- **不一致类别**: i18n 文本硬编码 / accessibility chrome 契约不一致
- **包 A 模式**: `flux-code-editor` 已经在 SQL toolbar、变量面板标题、执行结果面板中使用 `t('flux.codeEditor.*')`，但 fullscreen、snippet toggle、变量 copy/insert 这些同一编辑器 chrome 操作仍直接写英文 `aria-label` / `title`。
- **包 B 模式**: `flux-i18n` 已有 `flux.codeEditor` namespace，覆盖 `formatSQL`、`showVariables`、`executeSQL`、`variables`、`expandVariablePanel`、`collapseVariablePanel`、`resultRows` 等相邻操作文案；同包 `SQLEditorToolbar` 的 format/run/vars 按钮也已通过 `t()` 输出。
- **统一建议**: 在 `flux.codeEditor` 下补齐 `enterFullscreen`、`exitFullscreen`、`fullscreen`、`insertSnippet`、`copyToClipboard`、`insertAtCursor` 等 key，并将 `code-editor-renderer.tsx`、`sql-editor-toolbar.tsx`、`snippet-panel.tsx`、`variable-panel.tsx` 的固定 `title` / `aria-label` 全部改为 `t('flux.codeEditor.*')`。
- **现状**: 非英文 locale 下 Code Editor 的主要 SQL 按钮会翻译，但 fullscreen、snippet、变量项快捷操作仍以英文暴露给屏幕阅读器、hover title 和按可访问名称定位的自动化测试；`pnpm check:i18n-keys` 无法发现这些未调用 `t()` 的硬编码字符串。
- **风险**: Code Editor 是表达式/SQL 编辑的共享基础组件，可能被表单、设计器、调试器等多个包复用；硬编码 accessibility names 会把 mixed-locale chrome 扩散到所有宿主，并让同一个 toolbar 内出现部分按钮可翻译、部分按钮固定英文的契约漂移。
- **误报排除**: 未将用户传入的 snippet `name` / `description`、SQL 关键字、变量值或 schema placeholder 视为问题；本条只覆盖组件内置按钮的固定操作名称，且这些操作与同文件/同包已 i18n 的 toolbar action 属于同一 chrome surface。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1649-1652`；`docs/references/audit-tooling.md:39`；`docs/architecture/flux-design-principles.md:24-27`。
- **复核状态**: 未复核

### [维度18-08] Nop Debugger 面板控制与搜索输入硬编码英文，和已建立的 `flux.debugger` locale namespace 不一致

- **涉及包**: `@nop-chaos/nop-debugger` vs `@nop-chaos/flux-i18n`
- **文件**: `packages/nop-debugger/src/panel.tsx:293-417`, `packages/nop-debugger/src/panel/node-tab.tsx:80-88,261-268,391-395`, `packages/nop-debugger/src/panel/timeline-tab.tsx:203-209`, `packages/flux-i18n/src/locales/en-US.ts:210-264`
- **行号范围**: 主要证据集中在 `panel.tsx:293-417`、`node-tab.tsx:80-88,261-268,391-395`、`timeline-tab.tsx:203-209`。
- **证据片段**:
  ```tsx
  // packages/nop-debugger/src/panel.tsx:293-417
  <Button
    ...
    title="Open Debugger"
  >
  ...
  data-tooltip={chrome.paused ? 'Resume' : 'Pause'}
  aria-label={chrome.paused ? 'Resume' : 'Pause'}
  ...
  data-tooltip="Clear"
  aria-label="Clear"
  ...
  data-tooltip={inspectMode ? 'Cancel pick' : 'Pick element'}
  aria-label={inspectMode ? 'Cancel pick' : 'Pick element'}
  ...
  <div className="ndbg-tabs" role="tablist" aria-label="Debugger tabs">
  ```
  ```tsx
  // packages/nop-debugger/src/panel/node-tab.tsx:80-88,261-268,391-395
  <span className="ndbg-metric-label">{t('flux.debugger.componentInspector')}</span>
  <Button
    ...
    aria-label="Clear selected element"
  >
  ...
  placeholder="Enter nodeId to inspect..."
  ...
  placeholder="Evaluate formula expression on component data..."
  ```
  ```tsx
  // packages/nop-debugger/src/panel/timeline-tab.tsx:203-209
  <Input
    type="search"
    className="ndbg-search"
    placeholder="Search events, /regex/, or path:body.0"
  ```
- **严重程度**: P2
- **不一致类别**: i18n 文本硬编码 / devtool UI chrome 契约不一致
- **包 A 模式**: `nop-debugger` 面板主体大量标题、区块 label、empty state 已使用 `t('flux.debugger.*')`，但面板启动按钮、header icon action、tablist aria-label、节点输入 placeholder、表达式求值 placeholder、timeline 搜索 placeholder 仍直接写英文。
- **包 B 模式**: `flux-i18n` 已维护完整 `flux.debugger` namespace，包含 `title`、`console`、`scan`、`inspectHint`、`componentInspector`、`selectedElement`、`enterNodeId`、`expressionEvaluator`、`events`、`errorsOnly`、`noEventsMatch` 等调试器主界面文案；同一文件周边已通过 `t()` 输出这些文本。
- **统一建议**: 将 debugger chrome 收敛到 locale key：补齐 `openDebugger`、`resume`、`pause`、`clearSelectedElement`、`cancelPick`、`pickElement`、`minimize`、`tabsLabel`、`nodeIdPlaceholder`、`evalPlaceholder`、`eventSearchPlaceholder` 等 key，并替换硬编码 `title`、`data-tooltip`、`aria-label`、`placeholder`。
- **现状**: 默认语言为 `zh-CN`，因此当前 Debugger 会出现标题/区块中文、按钮 tooltip/aria-label/search placeholder 英文的混合界面；这些字符串没有进入 `t()` 调用，无法被 `check:i18n-keys` 覆盖。
- **风险**: Debugger 是跨包运行时诊断入口，常用于定位 renderer/runtime 问题；混合语言会影响可访问名称、自动化定位以及非英文团队的调试体验。更重要的是同一包已建立 locale namespace，继续保留硬编码会让新增 debugger chrome 复制错误模式。
- **误报排除**: 未报告事件 kind、nodeId、路径表达式示例中的技术 token、用户数据或运行时 detail；本条只覆盖 debugger 自带固定 UI chrome 文案。技术示例如 `/regex/`、`path:body.0` 可作为翻译字符串的一部分保留，不要求翻译技术语法本身。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1649-1652`；`docs/references/audit-tooling.md:39`；`docs/architecture/flux-design-principles.md:24-27`。
- **复核状态**: 未复核
