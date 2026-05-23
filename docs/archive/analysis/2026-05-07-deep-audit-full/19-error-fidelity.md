# 19 Error Fidelity

- 深挖轮次: 1
- 深挖发现数: 3
- 维度复核: 2 保留 / 1 降级 / 0 驳回
- 子项复核: 无

## 第 1 轮初审

- `submitForm` 把 resolve 异常替换成 `Form not found`
- `word-editor-core/document-io.ts` 的 `saveDocument()` bare catch 返回 `false`
- `loadDocument()` / `loadDatasets()` 将读取/解析失败静默降级为空态

## 维度复核结论

保留:

- `saveDocument()` bare catch 返回 `false`
- `loadDocument()` / `loadDatasets()` 静默降级为空态

降级:

- `submitForm` 的错误替换只在自定义 registry 抛错等边缘路径才构成问题

## 最终保留项

### [维度19] Word Editor 的保存/读取路径仍把真实异常压扁成布尔值或空态

- **文件**: `packages/word-editor-core/src/document-io.ts`
- **严重程度**: P2
- **现状**: `saveDocument()` 的任何异常都变成 `false`，`loadDocument()` / `loadDatasets()` 的任何异常都变成 `null` / `[]`
- **风险**: “读取失败/缓存损坏”会被伪装成“没有内容”，严重损失诊断上下文
- **建议**: 区分“无数据”与“读取失败”，至少保留 `cause` 或结构化错误结果
- **复核状态**: 维度复核通过
