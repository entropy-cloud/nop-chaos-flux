# 06 异步模式与取消安全

## 复核统计

- 初审条目: 2
- 维度复核: 完成
- 子项复核: 2 条
- 保留: 1
- 降级: 0
- 驳回: 1

## 保留

### [维度06] report designer preview 缺少方法入口并发保护和真实取消

- **文件**: `packages/report-designer-core/src/core-dispatch.ts:169-209`, `packages/report-designer-core/src/core-dispatch.ts:251-255`, `packages/report-designer-core/src/adapters.ts:40-48`
- **证据片段**:
  ```ts
  169: case 'report-designer:preview': {
  170:   store.setState((current) => ({
  172:     preview: { ...current.preview, running: true, mode: command.mode },
  ```
  ```ts
  188:   const result = await runPreviewCommand({
  199:   store.setState((current) => ({
  201:     preview: { running: false, mode: command.mode, lastResult: result },
  ```
  ```ts
  251: case 'report-designer:stopPreview': {
  254:   preview: { ...current.preview, running: false },
  ```
- **严重程度**: P1
- **问题类别**: 竞态 / 取消安全
- **异步操作**: report designer preview 执行链
- **竞态场景或吞掉路径**: A/B 两次 preview 可并发进入；旧请求晚到仍能覆盖 `lastResult`，任何一次完成都能过早把 `running` 清成 `false`。
- **用户可见故障**: loading 提前消失、旧 preview 结果覆盖新结果、Stop 仅改本地 flag 但不能中止请求。
- **建议**: 在入口增加 guard，并为 preview 引入 request id 或 abort/cancel channel。
- **为什么值得现在做**: 与 submit 并发守卫是同类高频缺陷。
- **误报排除**: item review确认 `PreviewAdapter` 契约当前没有 `AbortSignal` 或 stale-result suppression。
- **历史模式对应**: method-entry concurrency guard 缺失
- **参考文档**: `docs/architecture/performance-design-requirements.md`, `docs/bugs/07-submit-concurrent-guard-fix.md`
- **复核状态**: `子项复核通过`

## 已驳回

### [维度06] report designer field-source refresh 会让旧结果覆盖新状态

- **文件**: `packages/report-designer-core/src/core.ts:121-138`, `packages/report-designer-core/src/core.ts:257-280`
- **证据片段**:
  ```ts
  121: function createOperationSignal(kind: 'refresh-derived-state' | 'refresh-field-sources') {
  124:   refreshDerivedStateController?.abort();
  ```
  ```ts
  129:   if (signal.aborted || disposed) {
  130:     return [];
  131:   }
  ```
- **严重程度**: P3
- **问题类别**: 竞态
- **异步操作**: field-source / derived-state refresh
- **竞态场景或吞掉路径**: 原 lead 声称旧请求能覆盖新状态；item review确认 core 已用 abort + stale guard 阻止旧结果回写。
- **用户可见故障**: 未证实旧结果覆盖新选择/新文档。
- **建议**: 不作为当前 defect 汇总；若继续跟进，可单独记录 provider 层未透传 `AbortSignal` 的轻度优化项。
- **为什么值得现在做**: 防止把已加 stale guard 的路径误报成 live race。
- **误报排除**: live test 和代码都显示结果所有权已被 guard 住。
- **历史模式对应**: 初始线索经复核被驳回
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: `已驳回`

## 零发现

- `flux-runtime` submit 并发保护已在方法入口实现。
- `api-data-source-controller` 的 abort / stale suppression / poll cleanup 当前基线正常。
- 抽查的 React-side async effect 多数已使用 `AbortController` + cleanup。
