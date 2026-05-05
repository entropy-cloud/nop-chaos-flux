# 维度 19：错误传播保真度

## 第1轮初审

### [维度19] `submitForm` 目标解析 bare catch 把真实解析失败统一伪装成 “Form not found”

- **文件**: `packages/flux-runtime/src/action-adapter.ts:148-170`
- **严重程度**: P1
- **类别**: 错误吞没

### [维度19] 公式编译执行失败时新建 Error 但不保留原始 cause

- **文件**: `packages/flux-formula/src/compile/formula-compiler.ts:131-143`
- **严重程度**: P2
- **类别**: 错误替换

### [维度19] Report Designer 首次字段源刷新失败被空 `.catch(() => undefined)` 静默吞掉

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx:96-98`
- **严重程度**: P2
- **类别**: 错误吞没

### [维度19] 验证运行真实异常被记录成 `cancelled`

- **文件**: `packages/flux-runtime/src/form-runtime-validation.ts:368-373`
- **严重程度**: P1
- **类别**: 计数遗漏 / 误归类

## 深挖第2轮追加

### [维度19] Flow Designer host action 重新包装字符串错误，丢失原始异常类型与 cause

- **文件**: `packages/flow-designer-renderers/src/designer-context.ts:100-105`
- **严重程度**: P2
- **类别**: 错误替换

### [维度19] Form renderer 的 `initAction` 初始化失败被空 catch 吞掉，且激活键已前移为“已初始化”

- **文件**: `packages/flux-renderers-form/src/renderers/form.tsx:262-273`
- **严重程度**: P1
- **类别**: 错误吞没 / 状态前移

## 深挖第4轮追加

### [维度19] Report Designer host provider 把预览中止仅映射为普通 `error`，丢失 `cancelled` 语义

- **文件**: `packages/report-designer-core/src/core-dispatch.ts:226-229`, `packages/report-designer-renderers/src/host-action-provider.ts:25-30`
- **严重程度**: P1
- **类别**: 错误替换 / 结构化失败语义丢失

### [维度19] Code editor 变量源解析把原始错误降格成新 `Error(message)`

- **文件**: `packages/flux-code-editor/src/source-resolvers.ts:89-110`
- **严重程度**: P2
- **类别**: 错误替换

## 深挖第5轮追加

### [维度19] Spreadsheet host provider 与 core dispatcher 组合后仍把宿主失败压平成普通 Error

- **文件**: `packages/spreadsheet-core/src/core-dispatch.ts:27-30`, `packages/spreadsheet-renderers/src/host-action-provider.ts:10-27`
- **严重程度**: P2
- **类别**: 错误替换

## 深挖统计

- 第1轮发现数：4
- 第2轮新增：2
- 第3轮新增：0
- 第4轮新增：2
- 第5轮新增：1

## 维度复核结论

- 初审与深挖共 9 项，独立复核后保留 5 项、降级 1 项、驳回 3 项。
- 最终保留项集中在真实吞错、错误误归类和丢失 `cancelled` / `cause` 语义的链路。

## 子项复核结论

- `[维度19] submitForm 目标解析 bare catch 把真实解析失败统一伪装成 “Form not found”`: 驳回。当前注册表实现里 `resolve({ componentId })` 不会落入已知抛错歧义分支。
- `[维度19] 公式编译执行失败时新建 Error 但不保留原始 cause`: 保留。重新抛出新 `Error` 且未挂 `cause`，会丢失原始异常链路与栈信息。
- `[维度19] Report Designer 首次字段源刷新失败被空 .catch(() => undefined) 静默吞掉`: 保留。调用方既收不到失败也没有任何可观测信号。
- `[维度19] 验证运行真实异常被记录成 cancelled`: 保留。非取消类验证异常被结算为 `outcome: 'cancelled'` 且 `cancelled: true`，属于明确误归类。
- `[维度19] Flow Designer host action 重新包装字符串错误，丢失原始异常类型与 cause`: 驳回。上游结果类型本身只有 `error?: string`，原始异常类型早已不在该层。
- `[维度19] Form renderer 的 initAction 初始化失败被空 catch 吞掉，且激活键已前移为“已初始化”`: 保留。失败被吞掉后同一激活键下不再重试。
- `[维度19] Report Designer host provider 把预览中止仅映射为普通 error，丢失 cancelled 语义`: 保留。`ActionResult` 明确支持 `cancelled`，但预览中止在 core/provider 组合后只剩普通失败。
- `[维度19] Code editor 变量源解析把原始错误降格成新 Error(message)`: 降级。主要只影响 UI 展示层错误文本，丢栈属实但影响面较小。
- `[维度19] Spreadsheet host provider 与 core dispatcher 组合后仍把宿主失败压平成普通 Error`: 驳回。对真正的 `Error` 实例会原样透传，表述过重。
