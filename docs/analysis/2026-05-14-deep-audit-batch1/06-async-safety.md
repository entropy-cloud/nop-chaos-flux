# 维度 06：异步模式与取消安全

## 第 1 轮（初审）

### [维度06-01] variant-field 仅丢弃过期结果，未提供真实取消

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:199-250,303-329`
- **证据片段**:
  ```ts
  const result = await props.helpers.dispatch(...);
  if (!mountedRef.current || requestId !== requestIdRef.current) {
    return;
  }
  ```
- **严重程度**: P2
- **问题类别**: 取消安全
- **异步操作**: detectVariantAction / variant switch action chain
- **竞态场景或吞掉路径**: 只通过 `mountedRef + requestId` 丢弃结果，但没有 `AbortSignal` 真正中止旧异步工作
- **用户可见故障**: 旧请求可在切换/卸载后继续跑，仍可能触发后台副作用或旧错误
- **建议**: 为 detect/switch 流引入 `AbortController` 并把 `signal` 传入 dispatch
- **误报排除**: 不是重复报告 stale setState；问题在于在途异步工作本身未被取消
- **复核状态**: 未复核

### [维度06-02] detail-view 确认提交入口用空 catch 吞掉异常

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:364-441,489-490`
- **证据片段**:
  ```tsx
  onConfirm={() => {
    handleConfirm().catch(() => undefined);
  }}
  ```
- **严重程度**: P2
- **问题类别**: 异常吞掉
- **异步操作**: validateAll / transformOut / commit apply
- **竞态场景或吞掉路径**: 任意环节 reject 都被最外层 `.catch(() => undefined)` 吞没
- **用户可见故障**: 按钮短暂 confirming 后恢复，但用户不知道失败原因
- **建议**: 至少把真实异常映射到 notify/draftError/report path
- **误报排除**: 并非取消噪声；这是主确认链的真实失败被静默吃掉
- **复核状态**: 未复核

### [维度06-03] Word Editor save 在检查 abort 前已执行本地持久化副作用

- **文件**: `packages/word-editor-renderers/src/word-editor-action-provider.ts:44-73`
- **证据片段**:
  ```ts
  saved = saveDocument(...);
  saveDatasets(...);
  if (input.saveEvent) {
    const result = await input.saveEvent(undefined, ctx);
  }
  if (ctx.signal?.aborted) {
    return { ok: false, error: new Error('Word document save was aborted.') };
  }
  ```
- **严重程度**: P2
- **问题类别**: 取消安全
- **异步操作**: word-editor:save
- **竞态场景或吞掉路径**: abort 检查晚于本地文档/数据集持久化
- **用户可见故障**: 用户收到 aborted/failure 语义，但本地恢复数据可能已被覆盖
- **建议**: 在本地副作用前后都检查 abort，并明确中止语义
- **误报排除**: 问题发生在 provider 入口本身，不是 UI 层禁用缺失
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度06-04] detail-field confirm 失败只 console.warn，不给用户可见反馈

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:305-309`
- **证据片段**:
  ```ts
  handleConfirm().catch((error) => {
    logDetailFieldAsyncError('confirm', error);
  });
  ```
- **严重程度**: P2
- **问题类别**: 隐藏失败
- **异步操作**: detail-field confirm chain
- **竞态场景或吞掉路径**: reject 被转换成 console-only 日志
- **用户可见故障**: 用户只看到按钮恢复，不知道失败原因
- **建议**: 引入 notify 或 draft error surface
- **误报排除**: 不同于 detail-view 的空 catch，这里是 console-only failure path
- **复核状态**: 未复核

### [维度06-05] object-field async `transformOut` 失败仅日志告警

- **文件**: `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:273-315`
- **证据片段**:
  ```ts
  } catch (error) {
    console.warn('[object-field] transformOut failed', error);
  }
  ```
- **严重程度**: P2
- **问题类别**: 隐藏失败
- **异步操作**: object-field transformOut
- **竞态场景或吞掉路径**: transformOut reject 后只有日志，没有用户反馈
- **用户可见故障**: 变更未真正提交，但用户拿不到明确失败提示
- **建议**: 把失败接入用户可见的反馈通道
- **误报排除**: 父值未半提交，但 failure-only-logs 缺口是真实存在的
- **复核状态**: 未复核

### [维度06-06] Flow Designer create-dialog async 失败被压平成裸 `{ ok:false }`

- **文件**: `packages/flow-designer-renderers/src/designer-page-helpers.tsx:202-209`, `packages/flow-designer-renderers/src/designer-page-body.tsx:433-436`
- **证据片段**:
  ```ts
  return { ok: false };
  ```
- **严重程度**: P2
- **问题类别**: 隐藏失败
- **异步操作**: create-dialog submitAction
- **竞态场景或吞掉路径**: submit failure 被压平，reject 也仅 console.warn
- **用户可见故障**: 节点创建失败后用户拿不到错误原因
- **建议**: 复用 designer command failure 通知路径
- **误报排除**: 这不是允许的 cancel-noise；当前链路丢掉了可行动错误信息
- **复核状态**: 未复核

### [维度06-07] Report Designer insert/drop 只处理 reject，不检查 resolved `{ ok:false }`

- **文件**: `packages/report-designer-renderers/src/field-panel-renderer.tsx`, `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx`
- **证据片段**:
  ```ts
  await designerBridge.dispatchDesigner(command);
  ```
- **严重程度**: P2
- **问题类别**: 隐藏失败
- **异步操作**: report field insert/drop commands
- **竞态场景或吞掉路径**: provider/core 返回 `{ ok:false }` 时调用点不检查，业务失败被静默吞掉
- **用户可见故障**: drop 可能部分提交（先写 cell，再丢 designer 侧失败）且无反馈
- **建议**: 对 `ActionResult`/command result 显式检查 `ok` 并通知失败
- **误报排除**: 问题不是 promise reject 处理，而是 resolved failure semantics 被忽略
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度06-08] 通用表单字段 async `adapter.out` 失败仍只 `console.warn`

- **文件**: `packages/flux-renderers-form/src/field-utils/field-handlers.tsx:86-118`
- **证据片段**:
  ```ts
  } catch (error) {
    console.warn('[field] async setValue failed', error);
  }
  ```
- **严重程度**: P2
- **问题类别**: 隐藏失败
- **异步操作**: useFormFieldController onChange async adapter path
- **竞态场景或吞掉路径**: adapter.out / setValue/validate 失败后只落日志
- **用户可见故障**: 用户已输入但值未真正写入或校验未执行，且没有明确提示
- **建议**: 在公共 field controller 路径上接入统一用户反馈
- **误报排除**: 这是通用控件主路径，不是局部高级字段特例
- **复核状态**: 未复核

### [维度06-09] SQL 编辑器执行链只有 latest-request-wins，没有真实 abort

- **文件**: `packages/flux-code-editor/src/code-editor-renderer/use-sql-editor-state.ts:171-212`
- **证据片段**:
  ```ts
  const requestId = ++requestIdRef.current;
  const result = await helpers.dispatch(...);
  if (requestId !== requestIdRef.current) {
    return;
  }
  ```
- **严重程度**: P2
- **问题类别**: 取消安全
- **异步操作**: SQL execute command
- **竞态场景或吞掉路径**: 只丢弃旧结果，不中止旧请求
- **用户可见故障**: 重复执行/卸载后旧 SQL 仍继续跑，可能带来无意义负载和旧错误
- **建议**: 为执行链增加 AbortSignal 并传入 dispatch
- **误报排除**: 这不是 variant-field 重复项；这里是另一条独立编辑器执行主路径
- **复核状态**: 未复核

### [维度06-10] Report Designer 默认工具栏 fire-and-forget dispatch，业务失败会静默丢失

- **文件**: `packages/report-designer-renderers/src/report-designer-toolbar.tsx:23`
- **证据片段**:
  ```ts
  void props.helpers.dispatch(command);
  ```
- **严重程度**: P2
- **问题类别**: 隐藏失败
- **异步操作**: toolbar command dispatch
- **竞态场景或吞掉路径**: 不 await、不 catch、不检查 `ActionResult.ok`
- **用户可见故障**: preview/undo/redo/save 等命令失败时无反馈
- **建议**: await dispatch，并统一处理 rejected 与 resolved-failure
- **误报排除**: 问题在默认 toolbar 主路径，不是个别 caller 的局部疏漏
- **复核状态**: 未复核

## 维度复核结论

- [维度06-01]: 降级为 P3。variant latest-request-wins 是当前支持基线，真实问题更偏资源浪费。
- [维度06-02]: 保留为 P2。detail-view confirm 的空 catch 会静默吞掉主确认链异常。
- [维度06-03]: 驳回。独立条目复核确认 abort 后不再清 dirty/发布 saved，旧缺陷已不成立。
- [维度06-04]: 降级为 P3。detail-field 不是完全吞掉，而是 console-only，问题更准确是缺少用户反馈。
- [维度06-05]: 降级为 P3。仅“only logs”成立，rollback 指控不成立。
- [维度06-06]: 保留为 P2。create-dialog 失败被压平且不 notify。
- [维度06-07]: 保留为 P2。resolved `{ ok:false }` 失败仍被 insert/drop 链路忽略。
- [维度06-08]: 保留为 P2。通用字段 async adapter 失败仍只日志可见。
- [维度06-09]: 保留为 P2。SQL execute 主路径只有 stale-drop，没有真实 abort。
- [维度06-10]: 保留为 P2。默认 toolbar fire-and-forget dispatch 会静默丢失失败。

## 子项复核结论

- [维度06-01]: 降级 (P3)。文档已接受 latest-request-wins sequencing。
- [维度06-02]: 成立 (P2)。空 catch 仍直接吞掉 confirm 失败。
- [维度06-03]: 驳回。abort 缺陷已被测试和新实现修复。
- [维度06-04]: 降级 (P3)。缺的是用户反馈，不是完全隐藏。
- [维度06-05]: 降级 (P3)。仅剩反馈缺口。
- [维度06-06]: 成立 (P2)。create-dialog 失败 flatten 仍与统一 failure notify 不一致。
- [维度06-07]: 成立 (P2)。resolved failure ignored 仍成立。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                 | 一句话摘要                                           |
| ----- | -------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| 06-01 | P3       | `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:199-250`  | variant-field 仅丢弃旧结果，未真实 abort 旧异步      |
| 06-02 | P2       | `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:489-490`      | detail-view confirm 的空 catch 吞掉主确认链异常      |
| 06-04 | P3       | `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:305-309`     | detail-field confirm 失败仅 console 可见             |
| 06-05 | P3       | `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:273-315` | object-field transformOut 失败仅日志可见             |
| 06-06 | P2       | `packages/flow-designer-renderers/src/designer-page-helpers.tsx:202-209`             | create-dialog 失败被压平成裸 `{ ok:false }`          |
| 06-07 | P2       | `packages/report-designer-renderers/src/field-panel-renderer.tsx`                    | insert/drop 忽略 resolved `{ ok:false }` 失败        |
| 06-08 | P2       | `packages/flux-renderers-form/src/field-utils/field-handlers.tsx:86-118`             | 通用字段 async adapter 失败仍只日志可见              |
| 06-09 | P2       | `packages/flux-code-editor/src/code-editor-renderer/use-sql-editor-state.ts:171-212` | SQL execute 主路径没有真实 abort                     |
| 06-10 | P2       | `packages/report-designer-renderers/src/report-designer-toolbar.tsx:23`              | 默认 toolbar fire-and-forget dispatch 会静默丢失失败 |
