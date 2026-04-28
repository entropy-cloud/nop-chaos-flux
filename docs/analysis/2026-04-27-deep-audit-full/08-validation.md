# 维度 08：验证系统一致性

## 审核范围

检查验证所有权、时机、状态管理、异步验证、编译时 vs 运行时结构、错误显示、跨 scope 验证。

## 发现清单

### [维度08] 子 scope 验证合约激活检查（降级为 P3）

- **文件**: `packages/flux-runtime/src/validation/`
- **严重程度**: P3
- **现状**: 已知的 Phase 2→3 收敛间隙。编译时验证结构与运行时验证合约之间存在部分未对齐。
- **验证生命周期阶段**: 注册/触发
- **风险**: 低。当前实现覆盖了主要场景，边界情况在逐步收口中。
- **建议**: 作为 Phase 3 一部分继续收敛。
- **参考文档**: `docs/architecture/form-validation.md`
- **复核状态**: 维度复核通过，从 P2 降级为 P3

### 已驳回项

1. **getError 是正确的低级 API** — `getError` 作为低级查询函数是正确设计，`showErrorOn` 策略在 UI 层正确应用。
2. **异步验证的 generation-aware suppression** — 已正确实现。
3. **submit/commit bypasses debounce** — 已正确实现。
4. **隐藏字段验证策略** — 已正确实现，与文档一致。
5. **跨 scope 验证独立性** — dialog 内表单验证独立于外部表单，正确实现。

## 已确认的正确实现

- 验证所有权：由最近的 validation-capable scope runtime 拥有 ✓
- showErrorOn 策略（blur/change/submit）正确实现 ✓
- fieldStates 使用 single flat map ✓
- touched/dirty/visited 由 FormRuntime 统一管理 ✓
- 异步验证有 generation-aware stale run suppression ✓
- submit bypasses debounce ✓
- 编译时验证结构优先确定 ✓
- 错误信息从 FormRuntime 读取 ✓
- per-path 错误订阅 ✓

## 总结评估

验证系统整体实现质量高。1 个 P3 观察项（Phase 2→3 收敛间隙）。其余初审发现经复核后驳回或确认正确实现。
