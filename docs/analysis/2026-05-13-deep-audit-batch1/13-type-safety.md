# 维度 13：类型安全与动态边界

## 第 1 轮（初审）

### [维度13-01] persisted word-editor document 恢复路径仍把未校验嵌套结构断言为可信 `SavedDocumentData`

- **文件**: `packages/word-editor-core/src/document-io.ts`
- **证据片段**:
  ```ts
  return {
    data,
    paperSettings: parsed.paperSettings as PaperSettings,
    savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date(0).toISOString(),
  };
  ```
- **严重程度**: P2
- **分类**: 危险
- **现状**: `loadDocument()` 对 `localStorage` 恢复出来的 document 只做了顶层 parse 和部分 `data` 正规化，但 `paperSettings` 仍直接 `as PaperSettings` 断言；`normalizeWordDocument()` 对 `header/main/footer/charts/codes` 也主要以 `Array.isArray(...)` 为门槛后直接断言为目标数组类型。
- **真实风险**: 语法合法但 shape 错误的存档会被当成可信 `SavedDocumentData` 注入恢复流程，随后直接驱动 editor bridge 和 store，可能造成恢复后异常布局、运行时故障和脏数据反复污染。
- **建议**: 为 persisted document 恢复补齐运行时校验/收敛层：显式验证 `paperSettings` 和各嵌套数组项；无效字段回退默认值，无效条目丢弃。
- **为什么值得现在做**: 该路径已经是用户可触达的恢复入口，且属于当前 live 主路径上的不一致边界，修复成本局部、收益直接。
- **误报排除**: 这不是低代码系统中外层动态边界的合理 `any`；这里的数据来源是 persisted JSON，进入点和消费链都明确，现有 `try/catch` 不能验证 shape 正确性。
- **历史模式对应**: persisted/runtime boundary 上的 dangerous type-boundary escape。
- **参考文档**: `docs/references/deep-audit-calibration-patterns.md`, `docs/references/refactoring-guidelines.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/plans/211-runtime-state-reactivity-and-safety-closure-plan.md`
- **复核状态**: 未复核

## any 使用统计

- `packages/` 下 `as any` 约 687 处
- `.ts` 文件中 `as unknown as` 约 113 处
- 直接 `JSON.parse(...) as ...` 约 11 处
- 本轮仅保留 1 条真正跨越动态边界并存在运行时风险的条目

## 深挖第 2 轮追加

### [维度13-02] `report-designer-page` / `spreadsheet-page` 根宿主仍把外部 schema 对象直接断言为 core 文档/配置合同

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx`; `packages/spreadsheet-renderers/src/page-renderer.tsx`; `packages/report-designer-renderers/src/renderers.tsx`; `packages/spreadsheet-renderers/src/renderers.tsx`; `packages/report-designer-core/src/core.ts`; `packages/spreadsheet-core/src/core.ts`
- **证据片段**:
  ```ts
  const resolvedDocument = props.props.document as ReportTemplateDocument;
  const resolvedDesigner = props.props.designer as ReportDesignerConfig;
  createSpreadsheetCore({ document: resolvedDocument.spreadsheet })
  createReportDesignerCore({ document: resolvedDocument, config: resolvedDesigner, ... })
  ```
- **严重程度**: P2
- **分类**: 危险
- **现状**: 公开 domain-host renderer 的核心输入都只是空字段 object 级别 prop contract，运行时却直接 cast 成 `ReportTemplateDocument` / `SpreadsheetDocument` / `ReportDesignerConfig` 后喂给 core。
- **真实风险**: 来自外部 schema/loader/host API 的 shape 错误对象会在挂载主路径上被当成可信 contract，直接导致 host 根挂载时报错或把损坏文档/配置带入 runtime snapshot。
- **建议**: 在 page root 增加显式 runtime narrowing/normalization；失败时返回受控降级并上报 host issue，而不是把外部对象直接 cast 给 core。
- **为什么值得现在做**: 这些是 live 公共宿主入口，不是内部 helper。
- **误报排除**: 这不是普通 renderer 内部的便利 cast；输入在组件文档中就是 host/loader 提供的外部 schema prop。
- **历史模式对应**: external schema boundary 上的 parse-as-contract
- **参考文档**: `docs/references/deep-audit-calibration-patterns.md`, `docs/components/report-designer-page/design.md`, `docs/components/spreadsheet-page/design.md`, `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度13-03] `word-editor-page` 的 schema seed 路径仍把未校验初始文档/数据集提升为可信宿主状态

- **文件**: `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts`; `packages/word-editor-core/src/document-io.ts`; `packages/word-editor-renderers/src/editor-canvas.tsx`; `packages/word-editor-renderers/src/renderers.tsx`
- **证据片段**:
  ```ts
  const initialDocument = props.props.initialDocument as WordDocument | undefined;
  const initialDatasets = props.props.datasets as Dataset[] | undefined;
  const [charts, setCharts] = useState<DocChart[]>(
    () => (props.props.initialCharts as DocChart[] | undefined) ?? [],
  );
  ```
- **严重程度**: P2
- **分类**: 危险
- **现状**: `word-editor-page` 对 schema 提供的 `initialDocument` / `datasets` / `initialCharts` / `initialCodes` 直接做类型断言；其中 `createSavedDocumentData()` 还把 `input.data.main` 原样提升进 `SavedDocumentData`。
- **真实风险**: 外部 schema/host 若注入 shape 错误的 seed，系统会把它提升为可信编辑器状态，可能导致 canvas 初始化异常、host scope 发布脏 shape、后续 autosave 再把坏数据持久化。
- **建议**: 为 schema seed 增加与 persisted 恢复同级别的 runtime normalization；至少校验 `initialDocument`、datasets、chart/code 条目，并让 `createSavedDocumentData()` 对 `main` 也做安全回退。
- **为什么值得现在做**: 这是 live renderer 的公开初始数据入口，当前主路径上 external seed 与 persisted recover 的安全强度不一致。
- **误报排除**: 这不是单纯 TS 类型不够严；这里的对象会进入 editor store、host projection 和 autosave 持久化链。
- **历史模式对应**: external seed boundary / risky cast promotion into persisted/runtime contract
- **参考文档**: `docs/references/deep-audit-calibration-patterns.md`, `docs/components/word-editor-page/design.md`, `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度13-01]: 保留 (P2)。persisted word-editor document 恢复路径仍缺少运行时 shape 校验。
- [维度13-02]: 保留 (P2)。report/spreadsheet host root 仍把外部 schema 对象直接 cast 成 core 合同。
- [维度13-03]: 保留 (P2)。word-editor schema seed 仍把未校验初始文档/数据集提升为可信宿主状态。

## 子项复核结论

本维度无需要继续逐条复核的条目。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                | 一句话摘要                                               |
| ----- | -------- | ------------------------------------------------------------------- | -------------------------------------------------------- |
| 13-01 | P2       | `packages/word-editor-core/src/document-io.ts`                      | persisted 恢复仍把未校验文档 shape 提升为可信合同        |
| 13-02 | P2       | `packages/report-designer-renderers/src/page-renderer.tsx`          | 报表/表格宿主入口仍把外部 schema 直接 cast 成 core 合同  |
| 13-03 | P2       | `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts` | word-editor schema seed 仍把未校验初始数据提升为可信状态 |
