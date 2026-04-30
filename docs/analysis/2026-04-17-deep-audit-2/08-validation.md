# [维度08] 验证系统一致性 — 初审报告

## 发现清单

### [维度08] revalidateDependents 对未触碰依赖字段直接清除错误 (P1)

- **文件**: `packages/flux-runtime/src/form-runtime-owner.ts:97-105`
- 未触碰的依赖字段被 clearErrors 而非 validateField，导致 owner.valid 可能为 true 而验证真值为 false
- **建议**: 用 validateField 替换 clearErrors

### P2 级发现（5 项）

- revalidateDependents 仅扩展一层依赖，未实现传递闭包
- 外部错误清除未覆盖父路径
- validatePath 在 refreshing 状态下不阻止执行
- applyChangesAndRevalidate 不验证变更路径本身
- detail-field 确认后不等待 validateField 完成

### P3 级发现（3 项）

- showErrorOn 默认值与文档不一致（文档说 blur，代码是 ['touched', 'submit']）
- ValidationError sourceKind 缺少 'row'/'scope-root' 生成逻辑
- fieldStates 清理缺失——非参与路径无自动清理

## 正面确认

- fieldStates 单一扁平 map ✓
- 异步验证 generation-aware stale run suppression ✓
- submit 入口仲裁和 lower-priority 取代 ✓
- 注册 generation-aware ✓
- 跨 scope 验证独立性 ✓
- compiledModel 刷新状态管理 ✓
- 渲染层错误读取正确分离验证真值与显示可见性 ✓
