# 维度 19：错误传播保真度

## 第 1 轮（初审）

### P1 发现（3 个）

1. compile-node 编译失败静默回退为原始字符串（丢失编译错误信息）
2. action-adapter submitForm bare catch 将所有 resolve 异常替换为 "Form not found"（F4）
3. value-adapter 错误静默吞没，返回原始值无标记（F7）

### P2 发现（5 个）

1. formula-compiler 模板求值段错误替换为 [error]（F2）
2. flow-designer 生命周期钩子错误降级为 String(err)（F5）
3. request-runtime 错误替换丢失原始响应上下文（F6）
4. table-quick-edit-controller catch 后仅回调无 UI 错误状态（F11）
5. action-execution onSettled 错误可能被忽略（F19）

### P3 发现（7 个）

1. toActionError 丢失原始 cause
2. static-eval bare catch 合理降级
3. debugger controller 降级为 message 字符串
4. source-resolvers 丢失 cause
5. host-action-validation 有意静默诊断
6. dispatch error 未标准化
7. createImportError 手动赋值 cause 而非标准 API

### 正面发现

- runtime-factory import 错误包装正确保留 cause 和 stack
- form-runtime-validation catch 正确保留原始错误并 re-throw
- save-modify-restore 模式全部正确使用 finally
