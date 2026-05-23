# 维度 18：跨包集成一致性

## 第 1 轮（初审）

### [维度18-01] flow-designer manifest 宣布的 host projection 字段并未由 runtime host scope 发布

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-manifest.ts:61-70,125-135`; `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-context.ts:135-165`
- **证据片段**:
  ```ts
  runtime: {
    schema: {
      kind: 'object',
      fields: {
        dirty: { kind: 'boolean' },
        canUndo: { kind: 'boolean' },
        canRedo: { kind: 'boolean' },
        gridEnabled: { kind: 'boolean' },
        paletteCollapsed: { kind: 'boolean' },
        inspectorCollapsed: { kind: 'boolean' },
      },
    },
  }
  ```
- **严重程度**: P1
- **现状**: flow-designer manifest 对外声明 `doc.nodes`、`doc.edges`、`runtime.paletteCollapsed`、`runtime.inspectorCollapsed` 等 host projection 字段可用；但 `buildDesignerScopeData()` 实际只发布 `doc.nodeCount` / `doc.edgeCount` 和 `runtime.canUndo/canRedo/dirty/gridEnabled/zoom/viewport`，这些 manifest 字段根本没进 live host scope。
- **风险**: compile-time host contract、schema authoring 和 runtime published scope 之间发生直接 split-brain：静态工具会放行这些字段，但运行时读取结果只能是 `undefined`。
- **建议**: 要么让 `buildDesignerScopeData()` 补齐 manifest 已承诺的字段，要么收窄 manifest 到真实发布面；两边必须共享同一真源，而不是各自维护。
- **为什么值得现在做**: 这是 package 内 manifest 与 runtime host publisher 的直接分叉，会影响所有 designer host expression、tooling 和 capability diagnostics。
- **误报排除**: 不是拿内部额外 runtime 字段说事。这里的问题恰恰是 manifest 明确声明了某些字段，但 live host scope 没有发布它们。
- **复核状态**: 未复核

### [维度18-02] spreadsheet manifest 只声明了小子集能力，但 runtime namespace provider 实际暴露了大批额外方法

- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-manifest.ts:115-271`; `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\host-action-provider.ts:4-67`
- **证据片段**:
  ```ts
  export const SPREADSHEET_HOST_METHODS = [
    'setActiveSheet',
    'setSelection',
    'setCellValue',
    ...'copyCells',
    'pasteCells',
    'renameSheet',
    'sortRange',
    'find',
    'replaceAll',
  ] as const;
  ```
- **严重程度**: P1
- **现状**: manifest 当前只声明到 `undo/redo` 与 transaction 一小组方法；但 live `host-action-provider` 暴露了 clipboard、sheet management、sort/filter、find/replace、formatting 等大量 spreadsheet host methods。
- **风险**: compile-time capability manifest、schema validation 和 runtime namespace provider 已经不是同一份契约。静态层会拒绝 runtime 实际支持的方法，或完全无法为这些方法提供正确诊断/提示。
- **建议**: 让 spreadsheet host methods 只维护一份真源，manifest 与 provider 从同一份 method contract 派生；至少先把 manifest 补齐到 runtime 已公开支持的方法集合。
- **为什么值得现在做**: 这是 host family 对外能力面的核心发布契约，继续分叉会让 renderer/tooling/authoring 全链路都建立在错清单上。
- **误报排除**: 不是要求 manifest 覆盖私有内部命令。这里列出的都是 `ActionNamespaceProvider.listMethods()` 公开暴露给宿主 action 系统的方法。
- **复核状态**: 未复核

### [维度18-03] word-editor host scope 把 `document` 投影成最近一次保存的快照

- **文件**: `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\hooks\use-word-editor-state.ts:86-100,173-181`
- **证据片段**:

  ```ts
  const [savedDocument, setSavedDocument] = useState<SavedDocumentData | null>(() => {
    return recoveredState.document ??
      (initialDocument
        ? createSavedDocumentData({ data: initialDocument, paperSettings: null })
        : null);
  });

  const hostScopeData = useMemo(
    () => ({
      document: savedDocument?.data ?? emptyDocument,
  ```

- **严重程度**: P1
- **现状**: word-editor host scope 发布的 `document` 来自 `savedDocument?.data`，而 `savedDocument` 只在初始恢复或显式保存时更新；正常编辑过程中的当前文档并没有进入这个 host projection。
- **风险**: 任何运行在 word-editor host boundary 内、相信 `document` 是当前编辑态投影的 schema/host logic，都会稳定读到落后的已保存快照而不是 live editor document。
- **建议**: 明确分离 `document` 与 `savedDocument` 语义：host projection 的 `document` 应该来自当前编辑态；如果还需要已保存快照，另行暴露 `savedDocument` 或 `lastSavedDocument`。
- **为什么值得现在做**: 这是 host scope 对外的核心数据面，一旦投影语义错位，所有跨包使用该 host projection 的逻辑都会在“看似有 document，实际是旧 document”的状态上运行。
- **误报排除**: 不是在要求 host scope 暴露更多内部细节。当前问题是字段名与实际投影对象不一致，且 live 代码已证明其来源仅为保存态快照。
- **复核状态**: 未复核

## 初审结论

- 保留 3 项跨包 host/manfest/projection contract drift。

## 维度复核结论

- 结论: 部分保留。
- 理由: `18-01` 与 `18-02` 都能被 live code 直接证实：静态 manifest 或 host contract 对外声明的能力面，与实际 runtime host scope 或 namespace provider 已经分叉，属于真实的跨包集成契约漂移。`flow-designer-renderers` 的 manifest 宣布了 `doc.nodes`、`doc.edges`、`runtime.paletteCollapsed`、`runtime.inspectorCollapsed`，但 `buildDesignerScopeData()` 并未发布这些字段。`spreadsheet-renderers` 的 manifest 只声明了较小的方法集，而 `host-action-provider.ts` 的 `listMethods()` 却公开暴露了大量额外宿主方法。`18-03` 不保留，因为 live code 已与当前组件设计文档一致：这里更像既有语义取舍，而不是本维度所说的 manifest/runtime split-brain。

## 子项复核结论

- `18-01`: 保留。manifest 声明字段未进入 live host scope，且底层 snapshot 实际具备对应数据。
- `18-02`: 保留。manifest 方法面显著小于 runtime 已公开 namespace 方法面，静态/运行时契约分叉。
- `18-03`: 不保留。当前 `document` 绑定到 `savedDocument?.data` 已与现有 word-editor design doc 一致，不属于本维度的 manifest/runtime 漂移。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                                                                          | 一句话摘要                                                                                    |
| ----- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 18-01 | P1       | `packages/flow-designer-renderers/src/designer-manifest.ts:61-70,125-135`; `packages/flow-designer-renderers/src/designer-context.ts:135-165` | flow-designer manifest 宣布的 host projection 字段并未由 runtime host scope 发布              |
| 18-02 | P1       | `packages/spreadsheet-renderers/src/spreadsheet-manifest.ts:115-271`; `packages/spreadsheet-renderers/src/host-action-provider.ts:4-67`       | spreadsheet manifest 只声明了小子集能力，但 runtime namespace provider 实际暴露了大批额外方法 |
