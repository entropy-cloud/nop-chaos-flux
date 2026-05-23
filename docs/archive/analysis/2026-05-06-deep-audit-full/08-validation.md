# 维度 08：验证系统一致性

## 第 1 轮（初审）

### P2 发现（2 个）

### [维度08] applyChangesAndRevalidate 对 reason:'change' 跳过全量验证

- **文件**: `packages/flux-runtime/src/form-runtime-owner.ts:233-246`
- **严重程度**: P2
- **验证生命周期阶段**: 执行
- **现状**: reason='change' 时仅执行依赖闭包验证 + 返回当前错误快照，不执行全量 validateForm。
- **建议**: 在函数文档中明确 reason='change' 的行为语义。

### [维度08] validatePath 对运行时注册路径的隐藏检查缺少 hiddenFieldPolicy 判断

- **文件**: `packages/flux-runtime/src/form-runtime-validation.ts:443-449`
- **严重程度**: P2
- **验证生命周期阶段**: 执行
- **现状**: 运行时注册路径仅判断 isPathHidden 直接返回空结果，不检查 validateWhenHidden。
- **建议**: 增加 defaultHiddenFieldPolicy.validateWhenHidden 判断或明确运行时注册不参与 hidden field policy。

### P3 观察项（3 个）

1. validateForm 编译路径与运行时注册路径分阶段执行 (P3)
2. revalidateDependents 顺序执行依赖路径验证 (P3)
3. submit 流中 recurse-submit 在 summary-gate 检查前已启动 (P3)

### 已确认通过的契约（10 项）

- 所有验证触发通过 FormRuntime/ValidationScopeRuntime
- fieldStates 使用 single flat map + true|undefined
- showErrorOn 策略正确实现
- 隐藏字段验证参与策略正确
- 异步验证有 generation-aware stale suppression
- submit/commit bypasses debounce
- 错误信息从 FormRuntime store 读取，per-path 可订阅
- 跨 scope 验证独立（detail 对话框）
- 编译时验证结构正确停止于 create-owner 边界
- 外部错误注入正确实现 owner-local 语义
