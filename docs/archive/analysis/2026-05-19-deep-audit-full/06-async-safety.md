# 维度 06: 异步模式与取消安全

## 第 1 轮（初审）

### [维度06-01] Report Designer 字段插入 fire-and-forget，失败无反馈且可能留下双 owner 不一致

- **文件**: `apps/playground/src/pages/report-designer-demo.tsx:387-394,488-495`
- **证据片段**:
  ```tsx
  const handleFieldInsert = useCallback(
    async (sourceId: string, fieldId: string, label: string) => {
      if (!selectedCell) {
        return;
      }
      await insertFieldAtCell({ sourceId, fieldId, label }, selectedCell);
    },
  ```
  ```tsx
  onFieldInsert={(sourceId, fieldId, label) => {
    void handleFieldInsert(sourceId, fieldId, label);
  }}
  ```
- **严重程度**: P2
- **问题类别**: 异常吞掉 / owner 漂移
- **现状**: 字段插入调用点丢弃 Promise；`insertFieldAtCell` 先写 spreadsheet，再写 report metadata，失败或 rollback 失败没有本地 catch。
- **风险**: 用户点击插入后可能无错误反馈，且 spreadsheet cell 与 report designer model 可能短暂或永久不一致。
- **建议**: 在入口统一 `.catch(report/notify)`，并给插入流程加 pending/disabled guard；rollback 失败应有可见诊断。
- **为什么值得现在做**: 这是跨 spreadsheet/report 两个 owner 的写入路径，失败不可见会显著增加调试成本。
- **误报排除**: 不是普通装饰性 `void`，底层流程有真实两阶段写入与 rollback。
- **参考文档**: `docs/references/audit-tooling.md`, `docs/architecture/performance-design-requirements.md`
- **复核状态**: 维度复核通过

### [维度06-02] Spreadsheet 编辑保存 fire-and-forget 对自定义 bridge reject 缺少兜底

- **文件**: `packages/spreadsheet-renderers/src/default-page-body.tsx:121-124,203-205`; `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-editing.ts:46-64`
- **证据片段**:
  ```tsx
  onMouseDown={(event) => {
    if (editingCellRef.current && (event.target as HTMLElement).tagName !== 'INPUT') {
      void handleEditSave();
    }
  }}
  ```
  ```tsx
  onEditSave={() => void handleEditSave()}
  ```
- **严重程度**: P3
- **问题类别**: 异常吞掉 / 状态卡死边界
- **现状**: 默认 core dispatch 会把 handler error 转成 `{ ok:false }`，但 `SpreadsheetBridge.dispatch` 是 Promise 边界；自定义 bridge 直接 reject 时调用点没有 catch。
- **风险**: 非默认 bridge 或宿主中断时，保存状态可能停留在 saving 或出现 unhandled rejection。
- **建议**: 在 `handleEditSave` 内部 catch bridge reject 并归一化为 failed edit save state，避免每个调用点单独兜底。
- **为什么值得现在做**: 编辑保存是核心交互闭环，统一 owner hook 内部 failure sink 可避免 UI 入口分散处理。
- **误报排除**: 复核确认默认 bridge 已处理普通 command failure，因此从 P2 降为 P3，只保留 reject 边界风险。
- **参考文档**: `docs/references/audit-tooling.md`
- **复核状态**: 已降级

## 深挖第 2 轮追加

维度 06：未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度06-01]: 保留 (P2)。两 owner 写入路径 Promise 被丢弃，失败无反馈。
- [维度06-02]: 降级为 P3。默认 dispatch 已结构化失败，剩余风险为自定义 bridge reject。

## 子项复核结论

- 未逐条复核 P2/P3 低风险项；按维度复核结论归档。

## 最终保留项

| 编号  | 严重程度 | 文件                                                               | 一句话摘要                                                |
| ----- | -------- | ------------------------------------------------------------------ | --------------------------------------------------------- |
| 06-01 | P2       | `apps/playground/src/pages/report-designer-demo.tsx:488-495`       | report field insert fire-and-forget 隐藏两 owner 写入失败 |
| 06-02 | P3       | `packages/spreadsheet-renderers/src/default-page-body.tsx:121-124` | spreadsheet edit save 对 custom bridge reject 缺少兜底    |
