# 15 安全与性能红线

## 复核统计

- 初审条目: 3
- 维度复核: 完成
- 子项复核: 3 条
- 保留: 2
- 降级: 1
- 驳回: 0

## 保留

### [维度15] spreadsheet command hook 会把 `{ ok:false }` 也记录成成功日志

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-sheet-commands.ts:15-132`, `packages/spreadsheet-core/src/commands.ts:213-218`, `packages/spreadsheet-core/src/core-dispatch.ts:18-30`
- **证据片段**:
  ```ts
  15: await bridge.dispatch({ type: 'spreadsheet:undo' });
  16: addLog('Undo');
  ```
  ```ts
  213: export interface SpreadsheetCommandResult {
  214:   ok: boolean;
  216:   error?: unknown;
  ```
- **严重程度**: P2
- **类别**: 性能 / 观察性
- **规则编号**: P6
- **现状**: UI 层在多个命令路径上直接把 dispatch 视为 success，未检查 `result.ok`。
- **风险**: failure 会被记录成 success-like log，降低诊断质量。
- **建议**: 统一根据 `ok/error` 决定日志和反馈。
- **为什么值得现在做**: 覆盖 undo/redo/remove sheet 等多条主命令路径。
- **误报排除**: item review确认 core contract 当前真实会返回 `{ ok:false }`。
- **历史模式对应**: observability path 把 failure 伪装成 success
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: `子项复核通过`

### [维度15] find/replace 路径把 failure/no-op 语义压扁成 benign UI 文案

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-find-replace.ts:18-64`, `packages/spreadsheet-core/src/command-handlers/search-handlers.ts:15-64`
- **证据片段**:
  ```ts
  18: const result = await bridge.dispatch({ type: 'spreadsheet:find', ... });
  25: } else {
  26:   setFindResults('Not found');
  ```
  ```ts
  37: await bridge.dispatch({ type: 'spreadsheet:replace', ... });
  48: addLog('Replaced');
  ```
- **严重程度**: P2
- **类别**: 性能 / 观察性
- **规则编号**: P6
- **现状**: find 对所有 `ok:false` 都显示 “Not found”；replace 直接记成功；replaceAll 的 false 分支近乎静默。
- **风险**: UI 无法区分 miss、failure、no-op 和真实成功。
- **建议**: 在 UI 层保留 command result 语义，分别展示 miss / failure / success。
- **为什么值得现在做**: 这是直接影响用户反馈质量的常用操作。
- **误报排除**: item review确认底层 handler 也存在 success/no-change 语义过宽的问题。
- **历史模式对应**: failure semantics collapsed into benign feedback
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: `子项复核通过`

## 已降级

### [维度15] merge lookup 是真实热路径问题，但当前更适合按 P2 记录

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-sheet-commands.ts:135-156`, `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:221-229`, `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:427-458`
- **证据片段**:
  ```ts
  135: const merges = snapshot.activeSheet?.merges ?? [];
  136: for (const merge of merges) {
  ```
  ```tsx
  221: function renderCell(r: number, c: number) {
  227:   const mergeInfo = getMergeInfo(r, c);
  ```
- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P2
- **现状**: 每个可见 cell render 都会线性扫描 `merges`。
- **风险**: 视口或 merge 数量增大时会放大渲染成本。
- **建议**: 预建 merge index，或至少缓存可见区域结果。
- **为什么值得现在做**: 是真实 interactive path，但当前尚无证据证明为 P1 级用户故障。
- **误报排除**: item review确认问题成立，只是下调定级。
- **历史模式对应**: loop-in-loop linear lookup on hot path
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: `已降级`

## 零发现

- 当前 live source 未发现 `eval(` / `new Function(`。
- 未确认 fail-closed 权限边界违约。
- 未发现 JSON.stringify 作为交互热路径 dirty detector 的可报告用法。
