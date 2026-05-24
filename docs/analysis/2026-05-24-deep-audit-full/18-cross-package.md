# 维度 18：跨包模式一致性

## 第 1 轮（初审）

本轮按要求先读取了共享前缀文档、维度 18 正文与 owner 文档，并对以下范围做了跨包模式对比：`flux-renderers-*` 注册模式，domain core/renderers 分层，hook 使用模式，错误处理模式，store 创建 / dispose，i18n / 用户可见硬编码文本。

### [维度18-01] Host action payload shape validator 被多包复制且对象额外字段语义分裂

- **涉及包**: `@nop-chaos/spreadsheet-renderers` vs `@nop-chaos/flow-designer-renderers` / `@nop-chaos/report-designer-renderers` / `@nop-chaos/word-editor-renderers`
- **文件**: `packages/spreadsheet-renderers/src/host-action-provider.ts:63-85`; `packages/report-designer-renderers/src/host-action-provider.ts:81-97`; `packages/word-editor-renderers/src/word-editor-action-provider.ts:50-66`; `packages/flow-designer-renderers/src/designer-action-provider.ts:36-52`
- **证据片段**:
  ```ts
  // spreadsheet-renderers: object shape rejects unknown keys
  case 'object': {
    if (!isCommandRecord(value)) {
      return false;
    }
    const allowedKeys = new Set(Object.keys(shape.fields));
    for (const key of Object.keys(value)) {
      if (!allowedKeys.has(key)) {
        return false;
      }
    }
  ```
  ```ts
  // report-designer-renderers: same helper shape but no unknown-key rejection
  case 'object': {
    if (!isCommandRecord(value)) {
      return false;
    }
    const optional = new Set(shape.optional ?? []);
    for (const [key, fieldShape] of Object.entries(shape.fields)) {
      if (!(key in value)) {
  ```
- **严重程度**: P2
- **不一致类别**: 错误处理 / host capability payload validation / 跨包重复维护
- **包 A 模式**: `spreadsheet-renderers` 的 `matchesShape()` 对 object payload 执行封闭对象校验，manifest 未声明的额外字段会被拒绝。
- **包 B 模式**: `flow-designer-renderers`、`report-designer-renderers`、`word-editor-renderers` 各自复制了类似 `matchesShape()`，但 object payload 只校验必填/可选字段，不拒绝额外字段。
- **现状**: 四个 domain host action provider 都在本包内维护一份 `FluxValueShape` runtime validator，但对象语义已经分叉；相同 manifest shape 在不同 domain 中代表不同 enforcement 规则。
- **风险**: host capability contract 对作者和测试而言不再统一；新增 shape kind、optional 规则、union/object 规则时需要四处同步，当前已出现语义漂移；后续如果修复维度 03 的具体 manifest/provider 问题，仍会被这类复制 validator 重新引入不一致。
- **建议**: 将 `matchesShape()` / `validateMethodPayload()` 收敛到共享包或 `flux-core` 的 host capability validation helper；明确 object shape 是封闭还是开放；四个 domain provider 只保留 namespace/method mapping，不再复制 shape validator。
- **统一建议**: 统一为一个共享 host capability payload validator，并为 object extra-key 行为添加集中测试。
- **为什么值得现在做**: 这是同一概念跨包复制后的真实语义分裂，已影响 host contract enforcement。
- **误报排除**: 这不是维度 03 的某个具体 manifest/provider mismatch 重报；这里的问题是跨包复制的 validator 本身已经产生 divergent semantics。Calibration pattern 10 已考虑：该不一致已经造成真实契约混乱和重复维护风险，不是单纯“包 B 写法不同”。
- **历史模式对应**: duplicated cross-domain provider validator drift。
- **参考文档**: `docs/architecture/flux-design-principles.md`; `docs/references/integrating-third-party-components.md`; `docs/architecture/capability-contract-model.md`
- **复核状态**: 未复核

### [维度18-02] Word editor host action provider 对非 save 命令缺少统一 ActionResult 错误归一化

- **涉及包**: `@nop-chaos/word-editor-renderers` vs `@nop-chaos/spreadsheet-renderers` / `@nop-chaos/report-designer-renderers`
- **文件**: `packages/word-editor-renderers/src/word-editor-action-provider.ts:193-235`; `packages/spreadsheet-renderers/src/host-action-provider.ts:147-160`; `packages/report-designer-renderers/src/host-action-provider.ts:161-175`
- **证据片段**:
  ```ts
  // word-editor-renderers: non-save bridge calls are not wrapped
  case 'insertField': {
    if (typeof payload?.datasetName !== 'string' || typeof payload?.fieldName !== 'string') {
      return fail('insertField requires datasetName and fieldName.');
    }
    input.bridge.insertFieldExpression(payload.datasetName, payload.fieldName);
    return ok();
  }
  ```
  ```ts
  // spreadsheet-renderers: provider boundary catches and returns ActionResult
  try {
    const result = await dispatch({
      type: `spreadsheet:${method}`,
      ...validation.args,
    } as SpreadsheetCommand);
    return toSpreadsheetActionResult(result);
  } catch (error) {
  ```
- **严重程度**: P2
- **不一致类别**: 错误处理模式 / host action provider contract
- **包 A 模式**: `spreadsheet-renderers` / `report-designer-renderers` 在 provider boundary 包裹 dispatch，将 thrown/rejected failure 归一化为 `{ ok: false, error, cause }`。
- **包 B 模式**: `word-editor-renderers` 的 `save` 路径局部 try/catch，但 `insertField` / `insertChart` / `insertCode` / `undo` / `redo` 直接调用 bridge；bridge 或第三方 editor command 抛错时会从 `invoke()` reject/throw，而不是稳定返回 `ActionResult`。
- **现状**: 同样是 domain host action provider，错误边界语义不一致；word editor 的部分命令绕过了其它 domain 已采用的 provider-boundary normalization。
- **风险**: schema action 调用 `word-editor:insertChart` 等命令时，失败可能表现为 rejected promise，而不是可分支处理的 `ActionResult`；UI/host 诊断与 notify 行为不稳定；调用方必须知道哪些 word editor 命令可能 throw。
- **建议**: 在 `createWordEditorActionProvider().invoke()` 外层统一包裹 try/catch；复用 shared `toActionError()` / `failWithError()`，确保所有 method 都返回 `ActionResult`；为 `insertField` / `insertChart` / `undo` 等 bridge throw 添加回归测试。
- **统一建议**: domain host action provider 统一采用“validate payload -> execute domain command/bridge -> catch boundary error -> return ActionResult”的模板。
- **为什么值得现在做**: 公开 namespace capability provider 是跨包统一契约，错误返回形态不一致会直接影响 action branching。
- **误报排除**: 不是要求所有 UI handler 都采用相同内部实现；问题发生在公开 namespace capability provider 边界。该不一致已经影响 action contract 的错误返回形态，不是单纯代码风格差异。
- **历史模式对应**: host action provider error boundary template drift。
- **参考文档**: `docs/architecture/flux-design-principles.md`; `docs/architecture/action-scope-and-imports.md`
- **复核状态**: 未复核

### [维度18-03] Report field panel 仍有用户可见英文硬编码，偏离其它 domain renderer 的 i18n 模式

- **涉及包**: `@nop-chaos/report-designer-renderers` vs `@nop-chaos/flow-designer-renderers` / `@nop-chaos/word-editor-renderers` / `@nop-chaos/spreadsheet-renderers`
- **文件**: `packages/report-designer-renderers/src/field-panel-renderer.tsx:138-147`; `packages/word-editor-renderers/src/word-editor-page.tsx:112-121`; `packages/flow-designer-renderers/src/designer-page-body.tsx:439-450`
- **证据片段**:
  ```tsx
  {hasRendererSlotContent(titleContent) ? (
    <header data-slot="report-designer-section-header">
      <h3>{titleContent}</h3>
      <span>{designer?.fieldCount ?? getFieldCount(fieldSources)} fields</span>
    </header>
  ) : designer?.documentName ? (
    <header data-slot="report-designer-section-header">
      <h3>{designer.documentName}</h3>
      <span>{designer?.fieldCount ?? getFieldCount(fieldSources)} fields</span>
  ```
  ```tsx
  <h1 className="text-lg font-semibold text-[var(--nop-text-strong)]">
    {hasRendererSlotContent(titleContent) ? asReactNode(titleContent) : t('flux.wordEditor.title')}
  </h1>
  ```
- **严重程度**: P3
- **不一致类别**: i18n / 文本硬编码
- **包 A 模式**: `report-designer-renderers` 在 field panel header 中硬编码英文复数后缀 `"fields"`。
- **包 B 模式**: `word-editor-renderers`、`flow-designer-renderers`、`spreadsheet-renderers` 的 workbench-visible label、按钮、状态文案基本走 `t('flux.*')`。
- **现状**: Report designer field panel 已经使用 i18n 处理 empty label、button label 等文案，但字段数量后缀仍是硬编码英文。
- **风险**: 中文或其它 locale 下报告设计器 field panel 会混入英文 UI；i18n key 检查只能发现“用了但缺失的 key”，无法发现这种未接入 i18n 的硬编码文本。
- **建议**: 增加类似 `flux.reportDesigner.fieldCount` 的 i18n key，使用 `{ count }` 参数；替换两处 hardcoded `"fields"`；可考虑补一个轻量测试覆盖默认 locale 下 field count 文案来自 i18n key。
- **统一建议**: domain workbench / panel 中所有用户可见默认文案统一走 `flux.*` i18n key；schema-authored label 可保留为作者输入。
- **为什么值得现在做**: 这是真实用户可见文案，修复范围小且可避免 `check:i18n-keys` 无法覆盖的硬编码残留。
- **误报排除**: 不是测试字符串或 schema 示例；这是 runtime renderer 中真实展示给用户的 panel header。不是 owner 差异导致的合理 domain 文案差异，而是同一个包内其它文案已使用 i18n 时留下的局部硬编码。
- **历史模式对应**: workbench/panel user-visible hardcoded text drift。
- **参考文档**: `docs/architecture/flux-design-principles.md`; `docs/references/integrating-third-party-components.md`
- **复核状态**: 未复核

## 跨包不一致清单

| 编号        | 严重程度 | 涉及包                                       | 不一致类别              | 摘要                                                                         |
| ----------- | -------- | -------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| [维度18-01] | P2       | spreadsheet / flow / report / word renderers | host payload validation | 多包复制 `matchesShape()`，object extra-key 行为分裂                         |
| [维度18-02] | P2       | word vs spreadsheet/report renderers         | 错误处理                | word editor 非 save host action 缺少 provider-boundary `ActionResult` 归一化 |
| [维度18-03] | P3       | report vs flow/word/spreadsheet renderers    | i18n                    | report field panel header 硬编码英文 `"fields"`                              |

## 统一方向建议

- 收敛 host capability validation：提取共享 `FluxValueShape` runtime validator，明确 object 封闭/开放语义。
- 统一 domain host action provider 模板：所有 namespace provider 采用 `validate -> execute -> normalize ActionResult -> preserve cause`。
- 补 i18n 硬编码兜底清单：现有 `check:i18n-keys` 不覆盖“未使用 t() 的硬编码文本”，可先用人工清单或轻量 suspect 扫描处理 domain workbench/panel 文案。

## 总结评估

本轮未发现 `flux-renderers-*` 主注册模式的大面积不一致：主包基本都使用 `RendererDefinition[] + registerXxxRenderers()`，差异多为 lazy loading、test eager loading、domain-specific host renderer，当前可解释。

domain core/renderers 分层总体可接受：`*-core` 基本保持非 React core，renderer 包承担 React bridge、host scope 和 UI shell。`report-designer-renderers -> spreadsheet-renderers` 属于明确共享复用候选，本轮不作为问题报告。

高价值问题主要集中在“跨 domain provider 模板复制但语义漂移”与“局部 i18n 硬编码残留”。这些问题符合 calibration pattern 10 的保留门槛：已经带来契约语义分裂、重复维护或真实用户可见不一致。

## 第 2 轮深挖方向

- 继续围绕 host action provider 复制代码深挖：`matchesShape()` 是否还在 tests 或其它 host package 中有第五份实现。
- 检查 `FluxValueShape` 是否已有 owner 文档定义 object extra-key 语义；若有，复核 `[维度18-01]` 严重度。
- 对 `report-designer-renderers` / `word-editor-renderers` 的 panel、toolbar、dialog 文案做 focused i18n sweep，避免把 schema-authored label 误报为硬编码。

## 深挖第 2 轮追加

### [维度18-04] Flow Designer host action provider 后半段命令绕过 command adapter 模板，公开命令会把无效事务/选择变更稳定返回成功

- **涉及包**: `@nop-chaos/flow-designer-renderers` vs `@nop-chaos/spreadsheet-renderers` / `@nop-chaos/report-designer-renderers`
- **文件+行号**: `packages/flow-designer-renderers/src/designer-action-provider.ts:437-479`; `packages/flow-designer-renderers/src/designer-command-types.ts:13-80`; `packages/flow-designer-core/src/core.ts:490-506`
- **证据片段**:
  ```ts
  case 'commitTransaction': {
    core.commitTransaction(typeof args.transactionId === 'string' ? args.transactionId : undefined);
    return { ok: true };
  }
  case 'rollbackTransaction': {
    core.rollbackTransaction(typeof args.transactionId === 'string' ? args.transactionId : undefined);
    return { ok: true };
  }
  ```
  ```ts
  function commitTransaction(transactionId?: string): void {
    const result = commitTransactionState(transactionStack, transactionId);
    if (!result?.committedId) {
      return;
    }
  ```
  ```ts
  | { type: 'toggleInspector' }
  | { type: 'undo' }
  | { type: 'updateEdgeData'; edgeId: string; data: Record<string, unknown> }
  | { type: 'updateNodeData'; nodeId: string; data: Record<string, unknown> }
  | { type: 'updateBranchData'; nodeId: string; branchId: string; data: Record<string, unknown> }
  ```
- **严重程度**: P2
- **不一致类别**: host action provider template drift / 错误处理 / 公开命令契约
- **现状**: `designer:*` namespace 内存在两套 provider 模板：前半段命令走 `DesignerCommandAdapter + toActionResult()`，后半段 `beginTransaction` / `commitTransaction` / `rollbackTransaction` / `toggleNodeSelection` / `setSelection` / `moveNodes` / `updateMultipleNodes` 等公开 manifest methods 直接调用 core，并固定返回 `{ ok: true }`。
- **风险**: schema action 调用 `designer:commitTransaction` 传入不存在的 `transactionId` 时，core 实际 no-op，但 action 层仍收到成功结果，`then/onError` 分支无法判断事务失败；新增 designer host method 时开发者需要猜测应进 adapter 还是直接写 provider，维护成本继续分叉。
- **建议**: 将这些公开 provider methods 纳入 `DesignerCommand` / `DesignerCommandAdapter`，或为直接 core method 定义统一 `DesignerCommandResult` 返回；至少让事务不存在、目标不存在、批量更新无变更等情况返回结构化 `{ ok:false, reason }` 或明确 idempotent success 契约。
- **误报排除**: 这不是要求所有内部 core 方法都走同一实现；问题发生在公开 `designer:*` host action provider 边界，且已有无效事务被包装成成功的真实 action contract 风险。未重复第 1 轮的 host payload validator 复制、word provider error 归一化、report fields 硬编码问题。
- **参考文档**: `docs/architecture/flux-design-principles.md`; `docs/references/integrating-third-party-components.md`; `docs/references/deep-audit-calibration-patterns.md`; `docs/architecture/action-scope-and-imports.md`
- **复核状态**: 未复核

### [维度18-05] Word Editor 数据集弹窗仍有硬编码英文占位符和列删除可访问文案

- **涉及包**: `@nop-chaos/word-editor-renderers` vs `@nop-chaos/flow-designer-renderers` / `@nop-chaos/report-designer-renderers`
- **文件+行号**: `packages/word-editor-renderers/src/dialogs/dataset-dialog.tsx:224-245`
- **证据片段**:
  ```tsx
  <Label className="text-[10px]" htmlFor={`${dialogIdPrefix}-${columnKey}-description`}>
    {t('flux.wordEditor.description')}
  </Label>
  <Input
    id={`${dialogIdPrefix}-${columnKey}-description`}
    value={column.description || ''}
    onChange={(e) =>
      handleColumnChange(index, 'description', e.target.value)
    }
    placeholder="Column description"
  ```
  ```tsx
  <Button
    type="button"
    variant="ghost"
    size="icon-xs"
    onClick={() => handleRemoveColumn(index)}
    title="Remove column"
    aria-label={`Remove column ${index + 1}`}
  ```
- **严重程度**: P3
- **不一致类别**: i18n / workbench hardcoded text
- **现状**: `word-editor-renderers` 的主 workbench 和同一弹窗大部分固定文案已使用 `t('flux.wordEditor.*')` / `t('flux.common.*')`，但数据集弹窗里的列描述 placeholder、删除列 title、删除列 aria-label 仍是硬编码英文。
- **风险**: 中文或其它 locale 下，Word Editor 数据集编辑流程会出现英文占位符和读屏名称；`check:i18n-keys` 只能发现已使用 key 缺失，不能覆盖这种未调用 `t()` 的残留；新增 dataset dialog 文案时也容易继续沿用硬编码。
- **建议**: 增加 `flux.wordEditor.columnDescriptionPlaceholder`、`flux.wordEditor.removeColumn` / `flux.wordEditor.removeColumnWithIndex` 等 key，并替换 placeholder/title/aria-label。
- **误报排除**: `SQL` / `API` 这类枚举值未报告；这里只报告用户可见固定 UI chrome 文案，不是用户输入数据、schema-authored label 或技术枚举。未重复第 1 轮的 report field panel `"fields"` 硬编码问题。
- **参考文档**: `docs/architecture/flux-design-principles.md`; `docs/references/integrating-third-party-components.md`; `docs/references/deep-audit-calibration-patterns.md`; `docs/architecture/word-editor/design.md`
- **复核状态**: 未复核

### [维度18-06] Flow Designer Inspector 分支操作 aria-label 硬编码英文，偏离同面板 i18n 模式

- **涉及包**: `@nop-chaos/flow-designer-renderers` vs `@nop-chaos/word-editor-renderers` / `@nop-chaos/report-designer-renderers`
- **文件+行号**: `packages/flow-designer-renderers/src/designer-inspector.tsx:143-188`
- **证据片段**:
  ```tsx
  <span className="text-sm font-medium text-foreground">
    {t('flux.flowDesigner.inspector.branchLabel', { index: index + 1 })}
  </span>
  <span className="text-xs text-muted-foreground font-mono">{branch.id}</span>
  ```
  ```tsx
  <Button
    type="button"
    variant="ghost"
    size="icon-sm"
    aria-label={`Move branch ${index + 1} left`}
    disabled={!canMoveLeft}
  ```
  ```tsx
  <Button
    type="button"
    variant="ghost"
    size="icon-sm"
    aria-label={`Delete branch ${index + 1}`}
    className="hover:bg-destructive/15 hover:text-destructive"
  ```
- **严重程度**: P3
- **不一致类别**: i18n / accessibility-visible workbench text
- **现状**: Flow Designer Inspector 同一分支区块已使用 `t('flux.flowDesigner.inspector.branchLabel')`、`t('flux.flowDesigner.inspector.branchName')` 等 locale key，但相邻的分支左移、右移、删除按钮可访问名称仍硬编码英文模板。
- **风险**: 非英文 locale 下辅助技术读到英文操作名；视觉标签走 i18n、读屏/自动化可见 action name 不走 i18n，会形成同一 workbench 面板内的文本来源分裂；后续 inspector action 增删时需要人工记忆哪些 aria 文案未接入 locale，维护成本偏高。
- **建议**: 增加 `flux.flowDesigner.inspector.moveBranchLeft`、`flux.flowDesigner.inspector.moveBranchRight`、`flux.flowDesigner.inspector.deleteBranch` 等带 `{ index }` 参数的 key，并替换三处硬编码 aria-label。
- **误报排除**: 未报告 branch id、节点类型 id 或 schema-authored label；这些 aria-label 是 renderer 固定工作台 chrome 文案，属于真实用户/辅助技术可见文本。未重复第 1 轮的 report field panel `"fields"` 硬编码问题。
- **参考文档**: `docs/architecture/flux-design-principles.md`; `docs/references/integrating-third-party-components.md`; `docs/references/deep-audit-calibration-patterns.md`; `docs/architecture/flow-designer/design.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度18-07] `designer-page` 独有 `$designer` scopeExportContracts，偏离其它 domain-host renderer 的 hostContract-only 模式

- **涉及包**: `@nop-chaos/flow-designer-renderers` vs `@nop-chaos/spreadsheet-renderers` / `@nop-chaos/report-designer-renderers` / `@nop-chaos/word-editor-renderers`
- **文件+行号**: `packages/flow-designer-renderers/src/renderer-definitions.ts:241-260`; `packages/flow-designer-renderers/src/designer-context.ts:141-149`; `packages/word-editor-renderers/src/renderers.tsx:117-132`
- **证据片段**:
  ```ts
  scopeExportContracts: {
    $designer: {
      kind: 'object',
      fields: {
        kind: { kind: 'literal', value: 'designer' },
        dirty: { kind: 'boolean' },
        busy: { kind: 'boolean' },
  ```
  ```ts
  return {
    kind: 'designer',
    dirty: snapshot.isDirty,
    canUndo: snapshot.canUndo,
    canRedo: snapshot.canRedo,
    selectionKind,
    selectionCount: nodeIds.length + edgeIds.length,
    ...projection,
  };
  ```
  ```ts
  fields: [
    { key: 'title', kind: 'value-or-region', regionKey: 'title' },
    { key: 'config', kind: 'prop' },
    { key: 'statusPath', kind: 'prop' },
    { key: 'onBack', kind: 'event' },
    { key: 'onSave', kind: 'event' },
  ],
  actionScopePolicy: 'new',
  hostContract: wordEditorHostContract,
  ```
- **严重程度**: P2
- **不一致类别**: domain-host metadata / scope export vs host projection boundary
- **现状**: 四个 domain-host renderer 都声明 `rendererClass: 'domain-host-renderer'`、`actionScopePolicy: 'new'` 与 `hostContract`，但只有 `designer-page` 额外声明 `$designer` 的 `scopeExportContracts`。同时 live host scope 数据并没有发布 `$designer` 顶层 key，而是发布 `kind/dirty/...` 加 host projection 字段。
- **风险**: authoring/tooling 读取 `scopeExportContracts` 时会认为 `designer-page` 提供 `$designer` 这类 Flux-native scope export，而其它 domain host 只提供 host projection；后续 schema 作者或检查器可能生成 `${$designer.dirty}` 这类不可用读法，混淆“Flux-native scope export”和“domain host projection”两个边界。
- **建议**: 删除 `designer-page` 的 `$designer` `scopeExportContracts`，统一 domain-host renderer 只通过 `hostContract.projection` 发布 host projection；如果确实需要 `$designer`，则四个 domain host 应有明确统一规则，并让 live scope 数据实际包含该 key。
- **误报排除**: 这不是单纯“metadata 写法不同”。`scopeExportContracts` 是工具可消费的公开作者面，而 live `buildDesignerScopeData()` 没有 `$designer`；其它 domain-host renderer 没有同类声明，说明该差异会造成真实 authoring contract 漂移。未重复当前文件已有 host payload validator、ActionResult、i18n 或 flow provider 命令模板问题。
- **参考文档**: `docs/architecture/renderer-runtime.md`; `docs/architecture/capability-projection-manifest.md`; `docs/components/designer-page/design.md`
- **复核状态**: 未复核

### [维度18-08] Table 交互事件 payload 归一化不完整，偏离 Form/CRUD/Tabs 的 evaluationBindings 模式

- **涉及包**: `@nop-chaos/flux-renderers-data` vs `@nop-chaos/flux-renderers-form` / `@nop-chaos/flux-renderers-basic`
- **文件+行号**: `packages/flux-renderers-data/src/table-renderer/use-table-selection.ts:80-85`; `packages/flux-renderers-data/src/table-renderer/use-table-sort.ts:103-108`; `packages/flux-renderers-data/src/table-renderer/use-table-pagination.ts:23-30`; `packages/flux-renderers-basic/src/tabs.tsx:223-232`
- **证据片段**:
  ```ts
  onSelectionChange?.(null, {
    scope: helpers.createScope(
      { selectedRowKeys: Array.from(nextKeys) },
      { scopeKey: 'selection', pathSuffix: 'selection' },
    ),
  });
  ```
  ```ts
  onSortChange?.(null, {
    scope: helpers.createScope(
      { column: columnName, direction: newDirection },
      { scopeKey: 'sort', pathSuffix: 'sort' },
    ),
  });
  ```
  ```ts
  return {
    event: args.uiEvent,
    scope: args.helpers.createScope(payload, {
      scopeKey: 'pagination',
      pathSuffix: 'pagination',
    }),
    evaluationBindings: payload,
  };
  ```
  ```ts
  void props.events.onChange?.(payload, {
    scope: props.helpers.createScope(payload, {
      scopeKey: 'tabs',
      pathSuffix: 'tabs',
    }),
    event: payload,
  });
  ```
- **严重程度**: P2
- **不一致类别**: event bridging / action evaluation context
- **现状**: `table` 的 `onPageChange` 已统一发布 semantic payload + `evaluationBindings`，`tabs` 也把 payload 放入事件上下文；但同一 table renderer 的 `onSelectionChange`、`onSortChange`、`onFilterChange` 只传临时 scope，不传 `event` / `evaluationBindings` / `type`。
- **风险**: schema action 作者在不同 renderer 事件中可用的表达式上下文不一致；分页事件可稳定读取 `${page}` / `${pagination.pageSize}`，但选择、排序、过滤事件依赖 scope 注入而缺少统一 `evaluationBindings`，后续 action 分支、日志、测试和文档示例容易漂移。
- **建议**: 为 table selection/sort/filter 抽统一 `createTableEventContext()`，像 `onPageChange` 一样同时提供 semantic `event`、`scope` 和 `evaluationBindings`；payload 建议包含稳定 `type: 'table:selection-change' | 'table:sort-change' | 'table:filter-change'`。
- **误报排除**: 不是要求所有内部 handler 写法一致；问题发生在 renderer event contract 的公开 action 上下文。当前同一 table renderer 已对 `onPageChange` 采用统一 payload 模式，说明 selection/sort/filter 是真实 residual，而不是合理 domain 差异。未重复已有 host provider 或 i18n 条目。
- **参考文档**: `docs/references/integrating-third-party-components.md`; `docs/components/table/design.md`; `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度18-09] 基础 form input renderer 定义缺少 `sourcePackage` discovery metadata，偏离 basic/data/form-advanced/code-editor 的定义模式

- **涉及包**: `@nop-chaos/flux-renderers-form` vs `@nop-chaos/flux-renderers-basic` / `@nop-chaos/flux-renderers-data` / `@nop-chaos/flux-renderers-form-advanced` / `@nop-chaos/flux-code-editor`
- **文件+行号**: `packages/flux-renderers-form/src/renderers/input.tsx:94-128,138-183`; `packages/flux-renderers-data/src/data-renderer-definitions.ts:100-106`; `packages/flux-renderers-form-advanced/src/tree-controls.tsx:470-492`
- **证据片段**:
  ```ts
  export const inputRendererDefinitions: RendererDefinition[] = [
    {
      type: 'input-text',
      component: createInputRenderer('text'),
      fields: formFieldRules,
      validation: createFieldValidation(),
      schemaValidator: validateInputFieldSchema,
      wrap: true,
    },
  ```
  ```ts
  {
    type: 'input-number',
    fields: formFieldRules,
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
    component: InputNumberRenderer,
  },
  ```
  ```ts
  {
    type: 'table',
    displayName: 'Table',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    component: TableRenderer,
  ```
  ```ts
  {
    type: 'input-tree',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    fields: [
  ```
- **严重程度**: P2
- **不一致类别**: RendererDefinition discovery metadata / authoring tooling contract / 跨包定义模式漂移
- **现状**: `flux-renderers-form` 的 `form`、`fieldset` 已声明 `sourcePackage`，basic/data/form-advanced/code-editor 的公开 renderer definitions 也基本声明包归属；但 10 个基础 input definitions（`input-text`、`input-email`、`input-password`、`select`、`textarea`、`checkbox`、`switch`、`radio-group`、`checkbox-group`、`input-number`）只声明 runtime 字段，没有 `sourcePackage`。对应组件文档仍把它们标为 `@nop-chaos/flux-renderers-form`，但 live definition metadata 不提供该 discovery 信息。
- **风险**: 依赖 `RendererDefinition.sourcePackage` 的组件目录、插入面板、debug/inspector 或文档校验会对最基础的一组表单控件拿不到包归属；同属 form 字段族的 advanced tree controls 已有 `sourcePackage`，会造成基础/高级 form 控件在 authoring 面板或 telemetry 中归属不一致。后续若继续按其它包补齐 discovery metadata，基础 input 仍会成为残留盲区。
- **建议**: 为 `inputRendererDefinitions` 中 10 个基础 input renderer 补齐 `sourcePackage: '@nop-chaos/flux-renderers-form'`；可同步补最小 `displayName/category/defaultSchema`，但至少先收敛 `sourcePackage`，并新增 definition contract 测试覆盖 form 基础 input 与 docs 归属一致。
- **误报排除**: 这不是重复 host validators/provider/template/i18n/scopeExport/table events；也不是单纯要求所有可选 metadata 必填。问题发生在同一 renderer definition discovery contract 上：其它包及同包部分 renderer 已声明，docs 也声明了基础 input 的 `sourcePackage`，但 live definitions 缺失，确实会影响工具消费。
- **参考文档**: `docs/references/renderer-interfaces.md`; `docs/references/integrating-third-party-components.md`; `docs/components/input-text/design.md`
- **复核状态**: 未复核

## 深挖第 5 轮追加

### [维度18-10] Code editor 有字段验证声明但不注册运行时字段参与，偏离 form/form-advanced 字段控件模式

- **涉及包**: `@nop-chaos/flux-code-editor` vs `@nop-chaos/flux-renderers-form` / `@nop-chaos/flux-renderers-form-advanced`
- **文件+行号**: `packages/flux-code-editor/src/code-editor-renderer.tsx:313-328`; `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts:11-51`; `packages/flux-renderers-form-advanced/src/tag-list.tsx:52-65`
- **证据片段**:

  ```ts
  // flux-code-editor: 声明字段 validation
  fields: codeEditorFieldRules,
  validation: {
    kind: 'field',
    valueKind: 'scalar',
    getFieldPath(schema: CodeEditorSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
  ```

  ```ts
  // flux-code-editor: 只写值/触发验证，没有 registerField 参与登记
  const currentForm = useCurrentForm();
  const currentValidationScope = useCurrentValidationScope();
  ...
  if (currentForm && hasName) {
    currentForm.setValue(name, newValue);
    void currentForm.validateField(name, 'change');
  } else if (hasName) {
    currentValidationScope?.touchField?.(name);
  ```

  ```ts
  // form-advanced tag-list: 非基础字段控件显式向 form 或 validation scope 注册参与
  React.useEffect(() => {
    const owner = currentForm ?? currentValidationScope;

    if (!owner || !name) {
      return;
    }

    return owner.registerField({
  ```

- **严重程度**: P2
- **不一致类别**: 字段验证参与 / runtime field registration / 跨包字段控件契约漂移
- **现状**: `code-editor` 复用了 `formFieldChromeRules`、`wrap: true`，并声明了 `validation.kind: 'field'` 与 required 规则；运行时也通过 `useCurrentForm()` / `useCurrentValidationScope()` 写值并触发验证。但它没有像 `tag-list`、`key-value`、`condition-builder` 等跨包高级字段控件那样调用 `registerField()` 发布字段参与、取值和动态状态。
- **风险**: 编译期认为 `code-editor` 是可验证字段，但运行时参与登记缺失会让隐藏/挂载参与、字段状态清理、非 form validation owner 与提交前 active participation 判定出现盲区；尤其在 page/surface 等非 form validation scope 中，`code-editor` 被文档列为支持路径，但实际只触发 `validateAt()`，没有注册参与实例，容易出现 required 字段不稳定参与或状态清理不一致。
- **建议**: 在 `useCodeEditorBinding()` 或 `CodeEditorRenderer` 中按 `tag-list` 模式向 `currentForm ?? currentValidationScope` 注册字段；`getValue()` 从 owner scope/current scope 读取 `name`，并至少覆盖 required 参与语义。补充回归测试：code-editor 在 form 与非 form validation scope 中 required 规则、隐藏/卸载参与清理均可稳定工作。
- **误报排除**: 这不是 host validators/provider/template/i18n/scopeExport/table events/sourcePackage 的重复项；也不是要求所有组件写法相同。问题发生在公开字段验证契约上：`code-editor` 已声明 field validation 并被架构文档列入非 form owner 支持字段，但 live renderer 缺少其它字段控件已有的 runtime participation 注册。
- **参考文档**: `docs/architecture/form-validation.md`; `docs/architecture/renderer-runtime.md`; `docs/references/renderer-interfaces.md`
- **复核状态**: 未复核

## 深挖第 6 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- `[维度18-01]`: 保留（P2）。live 仍有四份本地 `matchesShape()`；`spreadsheet-renderers` object 校验拒绝未知 key，而 flow/report/word 只校验声明字段，且 compiler validator 也允许未知字段，跨包契约语义确实分裂。
- `[维度18-02]`: 保留（P2）。live `word-editor-action-provider.ts` 仅 save 路径局部 catch，`insertField/insertChart/insertCode/undo/redo` 仍直接调用 bridge/store；相对 spreadsheet/report provider boundary 的统一 try/catch `ActionResult` 归一化仍不一致。
- `[维度18-03]`: 保留（P3）。live `report-designer-renderers/src/field-panel-renderer.tsx:141,146` 仍硬编码 `"fields"`，而相邻/其它 domain workbench 文案走 `t('flux.*')`。
- `[维度18-04]`: 保留（P2）。live `designer-action-provider.ts:437-479` 后半段公开 methods 仍绕过 adapter 并固定 `{ ok: true }`；`flow-designer-core/src/core.ts:490-506` 对无效事务 no-op，action 层无法区分失败/无效输入。
- `[维度18-05]`: 保留（P3）。live `word-editor-renderers/src/dialogs/dataset-dialog.tsx:233-244` 仍有 `"Column description"`、`"Remove column"`、`Remove column ${index + 1}` 硬编码用户/无障碍文案。
- `[维度18-06]`: 保留（P3）。live `flow-designer-renderers/src/designer-inspector.tsx:154,171,188` 仍硬编码分支移动/删除 aria-label，同一区块视觉标签已使用 i18n key。
- `[维度18-07]`: 保留（P2）。live `designer-page` 仍独有 `$designer` `scopeExportContracts`，但 `buildDesignerScopeData()` 返回顶层 `kind/dirty/...` 和 projection、没有 `$designer` key；其它 domain-host renderer 仍仅使用 `hostContract`。
- `[维度18-08]`: 保留（P2）。live table pagination 已提供 semantic payload + `evaluationBindings`，但 selection/sort/filter 仍 `onXChange?.(null, { scope })`，缺少 `event/evaluationBindings/type`，与 docs 中 onPageChange 支持语义不一致。
- `[维度18-09]`: 保留（P2）。live `flux-renderers-form/src/renderers/input.tsx` 10 个基础 input definitions 仍无 `sourcePackage`；同包 `form/fieldset`、data table、form-advanced tree controls 仍声明包归属，且 `docs/components/input-text/design.md` 标注归属为 form 包。
- `[维度18-10]`: 保留（P2）。live code-editor definition 仍声明 `validation.kind: 'field'`，运行时 binding 只 set/touch/validate，`packages/flux-code-editor/src` 未发现 `registerField`；form-advanced `tag-list` 等仍显式注册字段参与。

## 子项复核建议

无。

## 子项复核结论

- `[维度18-01]`: 子项复核通过（P2）。四个 host provider 仍复制 `matchesShape()`，且 spreadsheet 拒绝未知 key 而 flow/report/word 允许未知 key。
- `[维度18-02]`: 子项复核通过（P2）。Word provider 非 save 命令仍缺少统一外层 try/catch，bridge throw 仍可能越过稳定 `ActionResult` 边界。
- `[维度18-03]`: 子项复核通过（P3）。Report field panel 仍硬编码 `"fields"`，与同类 workbench i18n 模式不一致。
- `[维度18-04]`: 子项复核通过（P2）。Flow provider 后半段公开 methods 仍绕过 adapter 并固定返回 `{ ok: true }`，无效事务仍无法反馈失败。
- `[维度18-05]`: 子项复核通过（P3）。Word dataset dialog 仍硬编码英文 placeholder、title 与 aria-label。
- `[维度18-06]`: 子项复核通过（P3）。Flow Inspector 分支操作 aria-label 仍硬编码英文，而相邻视觉文本已走 i18n。
- `[维度18-07]`: 子项复核通过（P2）。`designer-page` 仍独有 `$designer` `scopeExportContracts`，但 live scope data 未发布 `$designer` key。
- `[维度18-08]`: 子项复核通过（P2）。Table pagination 已提供 `evaluationBindings`，但 selection/sort/filter 事件仍只传临时 scope。
- `[维度18-09]`: 子项复核通过（P2）。基础 form input definitions 仍缺少 `sourcePackage`，而同包/其它包 renderer definitions 已普遍提供该 discovery metadata。
- `[维度18-10]`: 子项复核通过（P2）。Code editor 仍声明 field validation，但运行时未调用 `registerField` 参与 validation owner 登记。

## 最终保留项

| 编号      | 严重程度 | 文件路径                                                                                                                                                                                                                                                                | 摘要                                                                                                             |
| --------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 维度18-01 | P2       | `packages/spreadsheet-renderers/src/host-action-provider.ts`; `packages/report-designer-renderers/src/host-action-provider.ts`; `packages/word-editor-renderers/src/word-editor-action-provider.ts`; `packages/flow-designer-renderers/src/designer-action-provider.ts` | Host action payload shape validator 被多包复制且对象额外字段语义分裂。                                           |
| 维度18-02 | P2       | `packages/word-editor-renderers/src/word-editor-action-provider.ts`                                                                                                                                                                                                     | Word editor host action provider 对非 save 命令缺少统一 ActionResult 错误归一化。                                |
| 维度18-03 | P3       | `packages/report-designer-renderers/src/field-panel-renderer.tsx`                                                                                                                                                                                                       | Report field panel 仍有用户可见英文硬编码，偏离其它 domain renderer 的 i18n 模式。                               |
| 维度18-04 | P2       | `packages/flow-designer-renderers/src/designer-action-provider.ts`; `packages/flow-designer-core/src/core.ts`                                                                                                                                                           | Flow Designer host action provider 后半段命令绕过 command adapter 模板。                                         |
| 维度18-05 | P3       | `packages/word-editor-renderers/src/dialogs/dataset-dialog.tsx`                                                                                                                                                                                                         | Word Editor 数据集弹窗仍有硬编码英文占位符和列删除可访问文案。                                                   |
| 维度18-06 | P3       | `packages/flow-designer-renderers/src/designer-inspector.tsx`                                                                                                                                                                                                           | Flow Designer Inspector 分支操作 aria-label 硬编码英文。                                                         |
| 维度18-07 | P2       | `packages/flow-designer-renderers/src/renderer-definitions.ts`; `packages/flow-designer-renderers/src/designer-context.ts`                                                                                                                                              | `designer-page` 独有 `$designer` scopeExportContracts，偏离其它 domain-host renderer 的 hostContract-only 模式。 |
| 维度18-08 | P2       | `packages/flux-renderers-data/src/table-renderer/*`                                                                                                                                                                                                                     | Table 交互事件 payload 归一化不完整，偏离 Form/CRUD/Tabs 的 evaluationBindings 模式。                            |
| 维度18-09 | P2       | `packages/flux-renderers-form/src/renderers/input.tsx`                                                                                                                                                                                                                  | 基础 form input renderer 定义缺少 `sourcePackage` discovery metadata。                                           |
| 维度18-10 | P2       | `packages/flux-code-editor/src/code-editor-renderer.tsx`; `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts`                                                                                                                               | Code editor 有字段验证声明但不注册运行时字段参与。                                                               |
