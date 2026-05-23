# 维度 18：跨包模式一致性

## 范围与状态

- 审核范围：跨包 host manifest、runtime provider、scope export contract 与 core command surface 是否保持一致。
- 资料来源：仅使用同目录 `stage-1-full-findings-16-20.md`、`raw-findings-07-20.md`、`final-review-results-16-20.md`、`summary.md`。
- 最终状态：保留 4 项，驳回 0 项。
- 严重程度分布：P2 4 项。

## 深挖轮次与收敛说明

- 第 1 轮初审重建发现 18-01。
- 第 2-5 轮追加 raw findings 发现 18-02、18-03、18-04。
- `summary.md` 记录第 5 轮仍有新增，因此本次按“达到执行上限后进入最终复核”处理，不声称自然收敛。

## 最终复核摘要

最终复核保留全部 4 项，集中在跨包契约漂移：Flow Designer 声明 `$designer` scope export 但 live scope 不发布；Spreadsheet manifest 与 action provider discovery 低估 core command surface；Report Designer action provider 同样隐藏可发现 methods。

## 最终保留项

### [18-01] `designer-page` 声明 `$designer` scope export，但 live host scope 不发布 `$designer`

- 文件：`packages/flow-designer-renderers/src/index.tsx:93-112`; `packages/flow-designer-renderers/src/designer-context.ts:113-158`; `packages/flow-designer-renderers/src/designer-provider-and-manifest.test.tsx:230-248`
- 证据片段：renderer metadata 声明 `scopeExportContracts: { $designer: { kind: 'object', fields: ... } }`；live `buildDesignerScopeData()` 片段返回 `doc`、`selection`、`activeNode`、`activeEdge`、`activeBranch`、`runtime`，没有 `$designer`。
- 严重程度：P2
- 当前行为：renderer metadata 声明 `$designer` export contract，测试也断言 metadata 存在；live `buildDesignerScopeData()` 不发布 `$designer` 对象。
- 风险：builder/static tools 宣传 `$designer`，但 runtime expressions 读不到。
- 建议：发布符合 contract 的 `$designer`，或修改 `scopeExportContracts` 匹配实际 projection。
- 误报排除：不涉及 `designer:*` action namespace；这是 schema-visible read-scope projection。
- 最终复核 verdict：保留。
- 修订标题/理由：无标题修订；final review 维持 Flow Designer declares `$designer` scope export，但 live host scope 不发布。

### [18-02] Spreadsheet host manifest 漏列大量 core-supported commands

- 文件：`packages/spreadsheet-renderers/src/spreadsheet-manifest.ts:115-136`, `249-271`; `packages/spreadsheet-core/src/commands.ts:146-211`
- 证据片段：manifest capabilities 片段列出 `setActiveSheet`、`beginTransaction`、`undo`、`redo` 等；core command union 片段还包含 `CopyCellsCommand`、`CutCellsCommand`、`PasteCellsCommand`、`InsertRowCommand`、comments、find/replace 等。
- 严重程度：P2
- 当前行为：spreadsheet renderer provider 能接受 `spreadsheet:${method}`，core command union 支持 copy/cut/paste、insert/delete row/column、sheet 操作、format/comment/find 等；manifest 只声明较小子集。
- 风险：builder tooling、静态分析和跨包 host contract 低估实际 API，合法命令被工具视为 unsupported。
- 建议：从 command surface 生成或共享 `spreadsheetCapabilities.methods`；或显式声明 extended/untyped command passthrough，并加 manifest-vs-command contract test。
- 误报排除：不重复 flow designer `$designer` projection；本条是 spreadsheet manifest/core/provider 三方漂移。
- 最终复核 verdict：保留。
- 修订标题/理由：无标题修订；final review 维持 Spreadsheet manifest 只列 core-supported commands 子集，tooling underreports valid actions。

### [18-03] Spreadsheet action provider 的 `listMethods()` 永远返回空数组

- 文件：`packages/spreadsheet-renderers/src/host-action-provider.ts:30-45`
- 证据片段：`createSpreadsheetActionProvider()` 返回 host provider，`listMethods() { return []; }`，但 `invoke(method, payload)` 会将 method 转为 `type: `spreadsheet:${method}`` 分发。
- 严重程度：P2
- 当前行为：provider 可以按任意 method 转发命令，但 introspection surface 返回空。
- 风险：runtime/debugger/builder 如果依赖 namespace discovery，会认为 spreadsheet 没有可用动作。
- 建议：返回和 manifest/core command 共享的 method list。
- 误报排除：其他 host providers 有返回 concrete method list 的模式；空列表不是无害实现细节。
- 最终复核 verdict：保留。
- 修订标题/理由：无标题修订；final review 维持 Spreadsheet action provider forwards arbitrary methods，但 `listMethods()` 返回空。

### [18-04] Report-designer action provider 同样隐藏所有 methods

- 文件：`packages/report-designer-renderers/src/host-action-provider.ts:34-49`; `packages/report-designer-core/src/commands.ts:3-15`, `49-79`
- 证据片段：`createReportDesignerActionProvider()` 中 `listMethods() { return []; }`；core command union 包含 `DropFieldToTargetCommand`、`SaveCommand`、`ImportTemplateCommand`、`ExportTemplateCommand` 等。
- 严重程度：P2
- 当前行为：report designer 有有限 command union 和 manifest，但 runtime namespace provider `listMethods()` 返回空。
- 风险：调试器、builder 和静态 contract 无法发现 report-designer commands，而字符串调用仍可执行，形成跨包 contract 不一致。
- 建议：提供共享 `REPORT_DESIGNER_METHODS`，provider 与 manifest/test 共用。
- 误报排除：独立于 spreadsheet namespace，影响 report-designer host package。
- 最终复核 verdict：保留。
- 修订标题/理由：无标题修订；final review 维持 Report Designer action provider hides all supported methods from discovery。

## 驳回项

无。
