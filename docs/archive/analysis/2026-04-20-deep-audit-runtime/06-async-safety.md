# 维度06：异步模式与取消安全

## 审核日期: 2026-04-20

## 发现清单（经初审+维度复核+子项复核）

### [P2] F-06-01: useSourceValue 创建 AbortController 但未将信号转发给运行时

- **文件**: `packages/flux-react/src/use-source-value.ts:37-62`
- **严重程度**: P2（子项复核确认）
- **异步操作**: `runtime.executeSource({ source, scope })` — 可能触发 ajax → 网络 fetch
- **竞态场景**: 组件卸载或 source prop 变化 → cleanup abort → 但 executeSource 不接受 signal → 网络 XHR 继续到完成 → 客户端侧 signal.aborted 检查阻止脏状态写入 → 资源浪费
- **用户可见故障**: 无数据损坏，但浪费带宽和服务器资源
- **根因**: `RendererRuntime.executeSource` 签名（`renderer-core.ts:172-176`）不接受 AbortSignal
- **建议**: 扩展 executeSource 签名接受 `signal?: AbortSignal`，通过 createSourceExecutor → executeAction 链传递

### [P2] F-06-02: node-source-prop-controller 与 F-06-01 共享根因

- **文件**: `packages/flux-react/src/node-source-prop-controller.ts:84-131`
- **严重程度**: P2（子项复核确认）
- **现状**: 与 F-06-01 完全一致的代码模式。建议合并为 F-06-01 子条目。
- **建议**: 修复 F-06-01（给 executeSource 增加 signal）同时修复此条。

### [P2] F-06-04: 报表设计器预览/导入/导出没有取消机制

- **文件**: `packages/report-designer-core/src/core-dispatch.ts:183-263`
- **严重程度**: P2（子项复核确认）
- **异步操作**: preview（后端渲染）、importTemplate（文件解析）、exportTemplate（序列化）
- **竞态场景**: 用户触发预览 → 耗时 10+ 秒 → 用户点"停止" → preview.running=false 但 XHR 仍在运行 → 结果到达后覆盖 store
- **用户可见故障**: 预览/导入结果在用户预期已取消后到达
- **现状**: report-designer-core 全包零 AbortController 使用（grep 确认）
- **建议**: 过渡结构，当适配器 API 稳定后添加 AbortSignal 支持

### [P3] F-06-03: refreshDerivedState 没有过时响应防护

- **文件**: `packages/report-designer-core/src/core.ts:142-201`
- **严重程度**: P3
- **异步操作**: loadFieldSources + resolveInspectorPanelsForTarget
- **竞态场景**: 快速连续点击不同字段 → 两次 refreshDerivedState 交错执行 → A 结果短暂覆盖 B
- **用户可见故障**: 检查器面板短暂闪烁错误内容
- **建议**: 添加 generation counter: `const gen = ++generation; ... if (gen !== generation) return;`

### [P2→P3] F-06-05: ELK 布局没有取消支持

- **文件**: `packages/flow-designer-core/src/elk-layout.ts:12-64`
- **严重程度**: P3（维度复核降级）
- **现状**: `layoutWithElk` 是纯函数，不修改外部状态，不操作 store。竞态风险完全取决于调用方。ELK 库本身不支持中止。
- **建议**: 在调用方添加 generation check，非纯函数层问题。

## 核心基础设施正面评估

以下异步基础设施已正确实现 AbortController + 取消机制：

| 模块                    | 操作            | 取消机制                                                      |
| ----------------------- | --------------- | ------------------------------------------------------------- |
| request-runtime         | API 请求        | AbortController + 去重（cancel-previous/ignore-new/parallel） |
| form-runtime-submit     | 表单提交        | isSubmitting 守卫 + signal 中止 + destroy 检查                |
| form-runtime-validation | 字段验证        | per-path AbortController + runId + modelGeneration            |
| data-source-runtime     | 数据源轮询      | AbortController + stale check + pendingRefresh                |
| action-runtime          | action dispatch | signal 贯穿 timeout + retry + debounce                        |
| imports                 | 模块导入        | per-entry AbortController + 缓存去重                          |

## 同类问题扫描备注

### report-designer-core 详细异步操作清单

对 report-designer-core 全包的异步扫描发现 **12 个函数中有 6 个涉及真正异步 I/O**：

| 函数                              | 文件                    | 异步类型                                  | 取消机制             | 风险 |
| --------------------------------- | ----------------------- | ----------------------------------------- | -------------------- | ---- |
| `preview`                         | `core-dispatch.ts:183`  | 网络 I/O（后端渲染）                      | 无                   | 高   |
| `importTemplate`                  | `core-dispatch.ts:~220` | 文件 I/O（解析）                          | 无                   | 高   |
| `exportTemplate`                  | `core-dispatch.ts:~260` | 网络 I/O（序列化+上传）                   | 无                   | 高   |
| `refreshDerivedState`             | `core.ts:142`           | loadFieldSources + resolveInspectorPanels | 无（P3 stale guard） | 中   |
| `loadFieldSources`                | core.ts                 | 网络 I/O                                  | 无                   | 中   |
| `resolveInspectorPanelsForTarget` | core.ts                 | 可能异步                                  | 无                   | 低   |
| 其他 6 个函数                     | —                       | 纯同步                                    | N/A                  | 无   |

- **spreadsheet-core**: 纯同步计算，无异步风险。
- **flow-designer-core**: ELK 布局为本地同步计算（P3 已记录）。
- **word-editor-core**: 仅 getWordCount 一个异步函数，极低风险。

## 统计

| 严重程度 | 数量 |
| -------- | ---- |
| P2       | 3    |
| P3       | 2    |
