# 维度06：异步模式与取消安全

## 维度复核结论

| 编号 | 初审 | 复核    | 说明                                            |
| ---- | ---- | ------- | ----------------------------------------------- |
| F01  | P2   | 保留 P2 | void runRequest().finally() 确缺 .catch()       |
| F02  | P2   | 保留 P2 | void Promise.resolve().then(invoke) 缺 .catch() |
| F04  | P2   | 降级 P3 | 有意 graceful degradation 设计                  |
| F06  | P2   | 保留 P2 | detail-view 完全无取消保护                      |
| F07  | P2   | 降级 P3 | detail-field 有 3 处 mountedRef 兜底            |
| F08  | P2   | 保留 P2 | 异步 adapter.in 无 sequence guard               |
| F11  | P2   | 降级 P3 | retry 模式，重试失败时 error 正确传播           |

## 最终有效发现

### P2 级

- **F01**: api-data-source-controller 轮询 void runRequest().finally() 缺 .catch()
- **F02**: reaction-runtime void Promise.resolve().then(invoke) 缺 .catch()
- **F06**: detail-view handleConfirm 无 AbortController
- **F08**: variant-field 快速切换无 sequence guard

### P3 级（初审保留+复核降级）

- **F04**: value-adapter actionAdapter in/out 错误返回 fallback (降级)
- **F07**: detail-field handleConfirm 无 AbortController 但有 mountedRef (降级)
- **F11**: import-stack loadModule catch 丢原始错误 (降级)
- **F03**: source-registry refresh 失败仅 console.warn
- **F05**: form-runtime-values void revalidateDependents 无 .catch()
- **F09**: use-fill-handle async 无取消保护
- **F10**: variable-panel clipboard 失败静默
- **F12**: use-designer-auto-layout 失败仅 console.warn
