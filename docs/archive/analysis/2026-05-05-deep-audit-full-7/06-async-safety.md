# 维度 06：异步模式与取消安全

## 第1轮初审

### [维度06] Report Designer 首次字段源刷新把 provider 异常静默吞掉

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx:96-98`, `packages/report-designer-core/src/core.ts:329-335`
- **严重程度**: P1
- **问题类别**: 异常吞掉
- **现状**: `core.refreshFieldSources()` 的非 abort 失败被 `.catch(() => undefined)` 直接吞掉。
- **风险**: 字段面板静默空白/陈旧，无结构化诊断出口。
- **建议**: 保留 abort 静默忽略，但对真实失败记录 monitor/错误状态。

### [维度06] Report Designer 的 FieldSourceProvider 只有 stale guard，没有 in-flight abort

- **文件**: `packages/report-designer-core/src/adapters.ts:19-24`, `packages/report-designer-core/src/runtime/field-sources.ts:51-60`
- **严重程度**: P2
- **问题类别**: 取消安全
- **现状**: `provider.load()` 契约不收 `signal`，旧请求只能在结果到达后被忽略。
- **风险**: 快速切换/销毁时后台请求继续跑，消耗资源并放大延迟。
- **建议**: 给 `FieldSourceProvider.load()` 和 adapter context 增加 `signal`。

### [维度06] VariantField 仍用 `mountedRef/requestId` 做生命周期保护，未向 dispatch 传 `AbortSignal`

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:136-165`
- **严重程度**: P2
- **问题类别**: 取消安全 / 竞态
- **现状**: 仅阻止过期 setState，不终止 dispatch 链上的异步任务。
- **风险**: 快速输入/切换 variant 时产生无效并发与后台副作用。
- **建议**: 为 detect/switch action 引入 `AbortController`，保留 requestId 仅作 stale guard。

## 深挖第3轮追加

### [维度06] detail draft 适配链只做 sequencer 失效，不向 dispatch 传 `AbortSignal`

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-draft-controller.ts:17-79`
- **严重程度**: P2
- **问题类别**: 取消安全 / 竞态
- **现状**: open/confirm 只靠 token 失效，不真正 abort 旧 action。
- **建议**: 为 open/confirm 各自维护 `AbortController` 并下传 `signal`。

### [维度06] WordEditor 保存路径既没有取消通道，也把 async save 作为无 catch 的 fire-and-forget 触发

- **文件**: `packages/word-editor-renderers/src/word-editor-page.tsx:219-243,386-390`, `packages/word-editor-renderers/src/hooks/use-word-editor-shortcuts.ts:68-71`
- **严重程度**: P2
- **问题类别**: fire-and-forget / 取消安全 / promise 异常未接住
- **现状**: `handleSave()` 被 `void` 触发，失败无结构化处理。
- **建议**: 增加 `.catch()` 与用户可见错误处理，并为保存链引入 `signal`。

## 深挖第4轮追加

### [维度06] 多个高级表单渲染器把 `validateField/validateSubtree` 当 fire-and-forget 调用

- **文件**: `packages/flux-renderers-form-advanced/src/key-value.tsx`, `packages/flux-renderers-form-advanced/src/array-editor.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`
- **严重程度**: P2
- **问题类别**: promise 链异常吞掉
- **现状**: validator reject 时调用点没有 `.catch()`，会形成未处理 rejection。
- **建议**: 统一补 `.catch()` 并复用共享 helper。

### [维度06] Table quick edit 保存入口把异步保存 `void` 掉且无错误处理

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx:151-162`, `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts:84-102`
- **严重程度**: P2
- **问题类别**: fire-and-forget / promise 异常吞掉
- **现状**: blur 保存和按钮保存都复用裸 promise。
- **建议**: 为 `runSave()` 增加 `.catch()` 和结构化错误状态。

### [维度06] Spreadsheet 编辑提交在鼠标按下时直接触发 async save，未等待也未接错

- **文件**: `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:173-176`, `packages/spreadsheet-renderers/src/use-spreadsheet-interactions.ts:276-280`, `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-editing.ts:31-44`
- **严重程度**: P2
- **问题类别**: fire-and-forget / 竞态
- **现状**: UI 先退出编辑态，再后台提交 `bridge.dispatch(setCellValue)`。
- **建议**: 至少补 `.catch()`，更好的是显式 pending/error 与失败回滚。

## 深挖第5轮追加

### [维度06] Spreadsheet selection 同步与单元格提交多处 `bridge.dispatch` fire-and-forget，失败会静默丢失且 UI 已先更新

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-selection.ts:78-81,167-184,277-310`
- **严重程度**: P2
- **问题类别**: fire-and-forget / 竞态 / promise 异常吞掉
- **现状**: selection 与 cell submit 多条路径共享裸 `bridge.dispatch` 模式。
- **建议**: 对所有 fire-and-forget dispatch 至少补 `.catch()`，并为先更新 UI 的路径提供失败回滚。

### [维度06] Node 生命周期 `onMount/onUnmount` action 直接 `void dispatch`

- **文件**: `packages/flux-react/src/node-renderer-effects.ts:79-95`
- **严重程度**: P2
- **问题类别**: fire-and-forget / 取消安全 / 异常吞掉
- **现状**: 生命周期 action 失败无监控，卸载阶段也没有取消语义。
- **建议**: 记录 rejected dispatch，并在支持时向 dispatch 传 `AbortSignal`。

### [维度06] `setValue()` 依赖重校验仍有一条未接错的 fire-and-forget 路径

- **文件**: `packages/flux-runtime/src/form-runtime.ts:436-445`, `packages/flux-runtime/src/form-runtime-values.ts:20-35`, `packages/flux-runtime/src/form-runtime-array.ts:194-195`
- **严重程度**: P2
- **问题类别**: promise 链异常吞掉
- **现状**: `setValues()` 已用 helper 消费 dependent revalidation 失败，但 `setValue()` 和数组路径仍裸调。
- **建议**: 复用 `attachDependentRevalidationFailureHandler` 到全部入口。

## 深挖统计

- 第1轮发现数：3
- 第2轮新增：0（未单独保存）
- 第3轮新增：2
- 第4轮新增：3
- 第5轮新增：3

## 维度复核结论

- 初审与深挖共 11 项，独立复核后保留 8 项、降级 3 项。
- 高优先级保留项集中在真实未处理 promise、静默失败和已有 `signal` 契约却未下传的异步链路。

## 子项复核结论

- `[维度06] Report Designer 首次字段源刷新把 provider 异常静默吞掉`: 保留。`page-renderer.tsx` 把 `refreshFieldSources()` 的非 abort 异常统一吞掉，真实失败会变成无提示空白态。
- `[维度06] Report Designer 的 FieldSourceProvider 只有 stale guard，没有 in-flight abort`: 降级。问题属实，但当前更多是资源浪费与响应迟滞风险，尚未看到直接写坏状态。
- `[维度06] VariantField 仍用 mountedRef/requestId 做生命周期保护，未向 dispatch 传 AbortSignal`: 保留。现有方案只防过期提交，不会中止已启动的异步 action，而 `dispatch` 上下文本身已支持 `signal`。
- `[维度06] detail draft 适配链只做 sequencer 失效，不向 dispatch 传 AbortSignal`: 降级。stale guard 已基本挡住错误写回，主要剩余问题是后台异步继续跑。
- `[维度06] WordEditor 保存路径既没有取消通道，也把 async save 作为无 catch 的 fire-and-forget 触发`: 保留。`handleSave()` 被按钮和快捷键直接悬空调用，reject 会形成未处理 promise。
- `[维度06] 多个高级表单渲染器把 validateField/validateSubtree 当 fire-and-forget 调用`: 保留。验证 API 返回 promise，而运行时验证路径确实可能 reject，因此存在未处理 rejection。
- `[维度06] Table quick edit 保存入口把异步保存 void 掉且无错误处理`: 保留。`runSave()` 内部 await `helpers.dispatch()`，调用点在 blur/点击时直接 `void` 掉。
- `[维度06] Spreadsheet 编辑提交在鼠标按下时直接触发 async save，未等待也未接错`: 保留。UI 先退出编辑态，再后台提交 `bridge.dispatch(setCellValue)`，失败时既无 catch 也无回滚。
- `[维度06] Spreadsheet selection 同步与单元格提交多处 bridge.dispatch fire-and-forget，失败会静默丢失且 UI 已先更新`: 保留。多条选择/提交路径直接丢弃 dispatch promise，至少存在静默失败与未处理 rejection 风险。
- `[维度06] Node 生命周期 onMount/onUnmount action 直接 void dispatch`: 降级。未接住 rejection 的问题成立，但优先级低于会影响用户保存/提交结果的链路。
- `[维度06] setValue() 依赖重校验仍有一条未接错的 fire-and-forget 路径`: 保留。`setValues()` 已补失败处理，而 `setValue()` / 数组路径仍直接 `void revalidateDependents()`，属于真实遗漏。
