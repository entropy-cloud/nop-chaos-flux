# 维度 04：状态所有权与单一事实来源

## 第 1 轮（初审）

### [维度04-01] object-field 异步 transformOut 本地工作值可回写覆盖父级新真值

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\composite-field\object-field.tsx:168-227,264-318`
- **证据片段**:

  ```ts
  const [resolvedValue, setResolvedValue] = React.useState(rawValue);
  const projectedValue = usesWorkingValue ? resolvedValue : rawValue;

  if (usesWorkingValue) {
    setResolvedValue(nextWorkingValue);
  }

  if (schemaProps.transformOutAction) {
    const committedValue = valueAdapter.out(nextWorkingValue, {
      originalValue: rawValue,
  ```

- **严重程度**: P2
- **现状**: 渲染器在 `transformInAction` / `transformOutAction` 打开时，把父 owner 的 `rawValue` 镜像为本地 `resolvedValue` 工作值，并以该本地值驱动 child scope。
- **风险**: `transformOut` pending 期间如果父级 `form.reset()`、外部 refresh、或其他上游写入先改变了 `rawValue`，旧的 pending `transformOut` 结果仍会在完成后执行 `parentForm.setValue(...)` / `parentScope.update(...)`，把父级新真值覆盖回旧编辑结果。
- **建议**: 把 pending `transformOut` 的失效条件绑定到父级真值代次，而不只绑定本地 sequence；父级 `rawValue` 变化时应取消/作废旧 commit，或把该场景升级为显式 child draft owner，而不是 renderer-local working cache。
- **为什么值得现在做**: 这是静默覆盖型问题；一旦发生，用户看到的是“外部重置/刷新成功后又回跳”，且提交出去的是旧对象。
- **误报排除**: 这不是纯 UI 本地态。`resolvedValue` 不是只控制展开/hover，而是直接承载可提交对象值，并最终回写父 owner 的同一路径事实。
- **历史模式对应**: 对应 `docs/references/reopened-design-decisions-and-audit-adjudications.md` 中“Review-Confirmed Dual-State Tradeoffs”家族；本条保留的不是“有 local cache”这个历史结论，而是一个独立 live residual：父级真值变化不会使旧 `transformOut` 失效。
- **参考文档**: `docs/architecture/form-validation.md`; `docs/architecture/scope-ownership-and-isolation.md`; `docs/references/reopened-design-decisions-and-audit-adjudications.md`
- **复核状态**: 未复核
- **双状态详情**: 父 owner 的 `rawValue` / `form.values[name]` 与 renderer-local `resolvedValue` 都在表达同一个 object-field 当前值。
- **同步失败症状**: 父级 reset/refresh 后字段短暂显示新值，随后被旧异步 transformOut 结果回写；用户会看到值回跳、外部更新被吞、最终提交旧数据。

### [维度04-02] table quick edit 在行记录变化时强制用父记录重置本地 draft 并关闭弹层

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\table-renderer\table-quick-edit-controller.ts:146-157,249-273`
- **证据片段**:
  ```ts
  draftRecordRef.current = { ...record };
  savedRecordRef.current = { ...record };
  draftScopeStore.publish({
    paths: field ? [`record.${field}`, 'record'] : ['record'],
    kind: 'update',
  });
  setDraftValue(nextValue);
  setSavedValue(nextValue);
  setBodyDirty(false);
  setDialogOpen(false);
  setSaveError(undefined);
  ```
- **严重程度**: P2
- **现状**: quick-edit 同时维护父级 `rowScope.record` 与本地 `draftValue` / `savedValue` / `draftRecordRef`；只要 `recordChanged`，`useEffect` 就直接用父记录重置本地 draft，并把 dialog 关掉。
- **风险**: 编辑中若表格数据被外部刷新、排序后的行对象重建、或上层保存回流替换，未保存草稿会被无提示丢弃。
- **建议**: dirty draft 打开期间不要无条件跟随 `record` 重置；要么显式把 quick-edit 提升为真正的 child draft owner，要么在外部 record 变化时阻断覆盖并提示冲突/放弃/重载。
- **为什么值得现在做**: 这是直接用户可见的编辑丢失；比一般“有双状态”更坏，因为 effect 还会主动 `setDialogOpen(false)`，让丢失看起来像正常关闭。
- **误报排除**: 这不是合法的 shell UI state。这里被重置的是实际可编辑业务值和业务记录副本，不是 hover、tab、popover 之类短暂视图状态。
- **历史模式对应**: 对应 `docs/references/reopened-design-decisions-and-audit-adjudications.md` 中 table quick edit 的既有 dual-state adjudication；本条不是重复报告“存在 local draft cache”，而是保留其 distinct live residual：父记录 churn 会强制覆盖 dirty draft。
- **参考文档**: `docs/architecture/form-validation.md`; `docs/architecture/scope-ownership-and-isolation.md`; `docs/references/reopened-design-decisions-and-audit-adjudications.md`
- **复核状态**: 未复核
- **双状态详情**: 父级 `rowScope.record` 与本地 `draftRecordRef` / `draftValue` / `savedValue` 同时表示当前行编辑值。
- **同步失败症状**: 编辑弹层打开且已修改时，只要父记录更新，输入内容会被回滚、dirty 清空、弹层关闭，用户未保存修改直接消失。

## 深挖第 2 轮追加

### [维度04-03] `word-editor-page` 的 seed 文档变更会重挂 canvas，但 `savedDocument`/host projection 仍停留在旧快照

- **文件**: `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts:67-91,173-180`; `packages/word-editor-renderers/src/editor-canvas.tsx:75-85,157-165`; `packages/word-editor-renderers/src/word-editor-page.tsx:197-207`
- **证据片段**:

  ```ts
  const [savedDocument] = useState<SavedDocumentData | null>(() =>
    recoveredState.document ??
    (initialDocument ? createSavedDocumentData({ data: initialDocument, paperSettings: null }) : null),
  );

  const hostScopeData = useMemo(() => ({
    document: savedDocument?.data ?? emptyDocument,
  }), [emptyDocument, savedDocument?.data]);

  }, [bridge, editorStore, initialDocument, recoveredDocument]);
  ```

- **严重程度**: P1
- **现状**: live code 里 `savedDocument` 只在 `useState` 初始化时吸收一次 `initialDocument`/recovered 文档；但 `EditorCanvas` 的挂载 effect 直接依赖 `initialDocument`/`recoveredDocument`，而 `word-editor-page` 每次 render 都把最新 `initialDocument` 继续传给 canvas。结果是 host 若在挂载后替换 seed 文档，canvas 会按新 seed 重挂并显示新内容，但 `hostScope.document` 仍继续发布旧 `savedDocument.data` 或空骨架，直到后续 autosave 或 explicit save 才纠正。
- **风险**: `toolbar`、`leftPanel`、`rightPanel` 等通过 host scope 读取 `document` 的区域，会与用户当前看到的编辑器正文脱节；同一 `word-editor-page` 同时存在 canvas 当前文档 和 host projection 旧文档 两条公开真相。
- **建议**: 二选一收敛：要么把 `initialDocument` 明确收敛为一次性 seed，并阻止后续 prop 变化触发 canvas replace；要么把它定义成显式 replace 输入，并在同一事务里同步重置 `savedDocument`/host projection，使 canvas 与对外 `document` 始终指向同一基线。
- **为什么值得现在做**: 这是 domain-host-renderer 的公开 host projection 面，不是局部 UI 小抖动；任何依赖 `document` 的 schema region 都可能在 seed 切换时立刻读到错误文档。
- **误报排除**: 这不是文档已承认的 500ms autosave 滞后，也不是 recovered persisted-first 语义；问题发生在后续 `initialDocument` 变更路径，且源码里确实存在 canvas 依赖 prop 重挂、`savedDocument` 不随之同步 的结构性分叉。
- **历史模式对应**: seed-on-open 与后续 props replace 语义混用；stale mirror state 或双基线 owner 漂移。
- **参考文档**: `docs/components/word-editor-page/design.md:100-121`; `docs/architecture/word-editor/design.md:151-170`; `docs/architecture/renderer-runtime.md:290-349`
- **复核状态**: 未复核
- **双状态详情**: 可见编辑器内容由 `EditorCanvas` 的 `initialDocument`/`recoveredDocument` 装载基线决定；对外 host projection `document` 则由 renderer 本地 `savedDocument.data` 决定，两者没有在 seed 变更时统一更新。
- **同步失败症状**: host 替换 seed 后，canvas 已显示新文档，但 slot region、window probe、以及任何读取 host scope `document` 的逻辑仍看到旧文档；若旧 `savedDocument` 为空，则外部甚至会看到空骨架而不是当前画布内容。

## 深挖第 3 轮追加

### [维度04-04] `word-editor` 图表或条码新建弹窗在跨打开会话时泄漏上一轮本地 draft

- **文件**: `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\dialogs\chart-dialog.tsx:50-59`; `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\dialogs\code-dialog.tsx:31-39`; `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\toolbar\insert-controls.tsx:163-179`
- **证据片段**:
  ```ts
  // chart-dialog.tsx
  const [chartName, setChartName] = useState(() => initialData?.chartName ?? '');
  const [chartType, setChartType] = useState<ChartType>(() => initialData?.chartType ?? 'bar');
  const [datasetId, setDatasetId] = useState(() => initialData?.datasetId ?? '');
  // code-dialog.tsx
  const [codeName, setCodeName] = useState(() => initialData?.codeName ?? '');
  const [codeType, setCodeType] = useState<'barcode' | 'qrcode'>(() => initialData?.codeType ?? 'barcode');
  const [valueField, setValueField] = useState(() => initialData?.valueField ?? '');
  // insert-controls.tsx
  <ChartDialog open={showChartDialog} onClose={() => setShowChartDialog(false)} ... />
  <CodeDialog open={showCodeDialog} onClose={() => setShowCodeDialog(false)} ... />
  ```
- **严重程度**: P2
- **现状**: live code 里 `ChartDialog` 和 `CodeDialog` 都把表单值保存在 renderer-local `useState`，且只在首次挂载时用 `initialData` 初始化一次；`insert-controls` 关闭时只是把 `open` 设回 `false`，并不会重置这些本地状态，也没有用 `key` 触发 remount。结果是新建图表或新建条码对话框关闭后再次打开，仍会带着上一次未保存的名称、类型、dataset 或 field 等草稿值。
- **风险**: 用户会把重新打开一个新建弹窗误认为拿到全新空白会话，实际却在旧 draft 上继续操作，容易插入错误的 `datasetId`、字段名或类型；预览与输入框也会先显示旧配置，造成当前上下文与可见 UI 基线不一致。
- **建议**: 对 create 模式在 close 后显式 reset 本地状态，或在 `open` 从 `false -> true` 且 `initialData == null` 时按默认值重建；更稳妥的做法是给 create 或 edit session 使用独立 `key` 强制 remount。若产品确实要保留草稿，需把恢复上次草稿变成显式语义，并提供可见脏状态或清空入口。
- **为什么值得现在做**: 修复面很小，只涉及两个 dialog 的本地状态生命周期，却能直接消除错误插入和新建却不是新会话的混淆；而且同文件里的 hyperlink dialog 已经在关闭时重置输入，当前 chart/code 行为本身就与同页基线不一致。
- **误报排除**: 这不是 React `useState` 常规同一打开会话内保留输入的误报。问题点在于组件实例被 `insert-controls` 持续挂载，close/reopen 只是切换 `open` prop；代码中也没有任何 `useEffect` 根据 `open` 或 `initialData` 做重置，因此旧草稿会跨会话残留。
- **历史模式对应**: 属于典型的 dialog-local dual-state 或 session-boundary 泄漏模式；`docs/bugs/04-dialog-scope-stale-render-fix.md:23-25` 已把 reopening a dialog gets a fresh scope instead of leaking old dialog-local values 记录为既有基线，本处虽然不是 Flux surface scope，而是 renderer-local draft，但 residual failure shape 一致。
- **参考文档**: `docs/architecture/word-editor/design.md:33-45`; `docs/architecture/surface-owner.md:161-174`; `docs/references/ui-interaction-review-checklist.md:66-77`; `docs/references/ui-interaction-review-checklist.md:126-137`; `docs/bugs/04-dialog-scope-stale-render-fix.md:23-25`
- **复核状态**: 未复核
- **双状态详情**: UI 语义上关闭后再次打开的新建会话默认值应是当前 truth，但实现里真正存活的是组件级 `useState` draft；于是同一 create dialog 同时存在视觉上新会话与内存里旧草稿两套状态面。
- **同步失败症状**: 关闭插入图表或插入条码后再次打开，输入框与预览仍保留上一轮未保存内容；用户若直接点保存，会插入上一轮的名称、字段或类型配置，而不是空白新建结果。

## 深挖第 4 轮追加

### [维度04-05] tree mode `designer-page` 冻结初始 `config`，导致 shell 或 UI 与 `DesignerCore` 双配置分叉

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-tree-mode.tsx:27-34,40-51`; `C:\can\nop\nop-chaos-flux\packages\flow-designer-core\src\core.ts:56-57,163-165`; `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-command-adapter.ts:62-68`; `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-context.ts:182-185`; `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\use-designer-auto-layout.ts:33-45,82-85`; `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-page-body.tsx:57-65,106-108,233-252,289-290,337`
- **证据片段**:

  ```ts
  const [core] = useState(() =>
    createDesignerCore(
      initialTreeDocument ? computeTreeModeDocument(initialTreeDocument, config) : emptyDoc,
      config,
    ),
  );

  useEffect(() => {
    if (inputTreeDocument === lastSyncedInputRef.current) {
      return;
    }
  ```

- **严重程度**: P2
- **现状**: tree mode 里 `DesignerCore` 只在首次挂载时用当时的 `config` 创建并归一化一次；之后 `core.getConfig()` 永远返回这份冻结的初始配置。与此同时，`DesignerPageBody` 仍直接读取最新 prop `config` 来决定 theme、palette 或 inspector 是否存在、context `config` 字段等 UI shell 行为。更糟的是，`designer-tree-mode.tsx` 的同步 effect 先用 `inputTreeDocument === lastSyncedInputRef.current` 早退，所以只改 `config`、不改 `treeDocument` 引用时，连 `core.replaceDocument(...)` 都不会触发。
- **风险**: 同一页面实例内出现两份同时生效的配置 owner：shell 或 UI 看到新 `config`，而命令执行、tree-to-graph 投影、auto-layout、`useNormalizedConfig()` 消费者继续使用旧 `core.getConfig()`。这会造成 palette 或 inspector 或 theme 已切到新配置，但加点、重排、边类型、treeConfig 规则、shortcut feature gating 仍按旧配置运行，形成 split-brain。
- **建议**: 收敛成单一配置 owner。二选一：1) `config` 变化时显式重建 `DesignerCore`；2) 给 core 增加受支持的 `replaceConfig` 或 `updateConfig` 路径，并让 tree reprojection、command adapter、auto-layout、context 统一读同一份 live normalized config。无论选哪条，都应补回归测试覆盖同实例热切换 tree-mode config。
- **为什么值得现在做**: 这不是样式级小漂移，而是 designer 结构规则 owner 分叉。Flow Designer 文档明确把 core 定义为 graph mutation 唯一真源；当前实现却让 config 语义在 core 与 shell 两边各自演化，后续只会把更多 tree-mode 能力接到冻结旧配置上。
- **误报排除**: 这不是已被驳回的 treeDocument 有 replace bridge 旧问题。当前基线允许 tree 文档在稳定 core 上通过 `replaceDocument(...)` 保持 selection 或 history continuity；这里的新缺陷是 `config` 没有等价的收敛路径，导致同一实例里文档可替换、配置不可替换，从而出现 live shell config 与 frozen core config 并存。
- **历史模式对应**: 对应稳定核心冻结初始配置、外层 UI 继续读新配置的 split-brain 家族，是 props 或 live shell 与 stable owner 分叉模式在 designer core 上的具体残留。
- **参考文档**: `docs/architecture/flow-designer/collaboration.md:72,116`; `docs/architecture/flow-designer/api.md:87-88,117-120`; `docs/architecture/flow-designer/config-schema.md:47`; `docs/references/reopened-design-decisions-and-audit-adjudications.md:74-77`; `docs/references/deep-audit-calibration-patterns.md:104`
- **复核状态**: 未复核
- **双状态详情**: 当前实例同时存在两份活跃配置事实源：`props.config` 被 `DesignerPageBody` 与 context shell 直接消费；`core` 内部的 `normalizedConfig` 在 `createDesignerCore(...)` 时固定下来，并被 command adapter、auto-layout、`useNormalizedConfig()`、后续 tree projection 持续读取。
- **同步失败症状**: host 热切换 tree-mode `config` 后，页面壳子先显示新配置，但画布命令与重排仍按旧配置执行；若随后再编辑 tree，`applyTreeDocument()` 仍用 `core.getConfig()` 投影，表现为 UI 已换新配置，但节点可创建项、边样式或布局规则像卡在旧版本。

## 维度复核结论

- [维度04-01]: 保留 (P2)。live `object-field` 仍只用本地 sequence 压旧本地提交；父级 `rawValue` 外部变化不会使 pending `transformOut` 失效，完成后仍可回写覆盖父 truth。
- [维度04-02]: 降级。live 代码与测试已修复仅记录引用或同值 churn 就重置 draft 的旧说法；当前残留更窄，只在父记录真实内容变化时重置，本项不宜再按原表述保留。
- [维度04-03]: 保留 (P1)。`EditorCanvas` 仍随 `initialDocument` 变化重挂，但 `savedDocument` 与 host `document` 仍是一次 seed 加 autosave 面，seed 替换时可长期停留旧快照，超出文档已声明的 500ms autosave 滞后。
- [维度04-04]: 保留 (P2)。`ChartDialog` 与 `CodeDialog` 仍在 close 或 reopen 间保留组件级 draft，create 会话没有 reset 或 remount，确有跨会话泄漏。
- [维度04-05]: 保留 (P2)。tree mode 仍只按初始 `config` 创建 `DesignerCore`；shell 读新 `config`，而 `core.getConfig()` 侧消费者继续读旧配置，split-brain 仍在。

## 子项复核结论

- [维度04-02]: 降级。原只要 `recordChanged` 就重置 的表述不再成立，但仍保留一个更窄残留：编辑中的 quick-edit 在父行记录发生真实内容变更时仍会被强制回滚并关闭弹层。
  retained residual: dirty 的 table quick-edit 在编辑期间若父级 `record` 真实变更，未保存草稿仍会被父记录覆盖、dirty 被清空且 dialog 被关闭。
- [维度04-05]: 成立。即使不把同实例 `config` 热替换视为受支持特性，live code 仍会在 prop `config` 变化时形成 shell 读新配置、core 继续持有旧归一化配置的 split-brain。
  retained residual: `DesignerPageBody`、context、canvas、palette 直接消费新 `props.config`，而 `core.getConfig()`、快捷键、auto-layout、tree 重投影仍读初始配置。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                             | 一句话摘要                                                        |
| ----- | -------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| 04-01 | P2       | `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:168-227,264-318`     | `object-field` 旧的异步 `transformOut` 结果仍可覆盖较新的父 truth |
| 04-02 | P3       | `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts:146-157,249-273` | 父行真实变更时 quick-edit 会覆盖 dirty draft 并关闭弹层           |
| 04-03 | P1       | `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts:67-91,173-180`                | seed 文档替换后 host projection 仍可能长期停留旧快照              |
| 04-04 | P2       | `packages/word-editor-renderers/src/dialogs/chart-dialog.tsx:50-59`                              | 图表或条码新建弹窗跨打开会话泄漏上一轮 draft                      |
| 04-05 | P2       | `packages/flow-designer-renderers/src/designer-tree-mode.tsx:27-34,40-51`                        | tree mode 同实例内出现 shell 新配置与 core 旧配置 split-brain     |
